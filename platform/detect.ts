#!/usr/bin/env bun
/**
 * The detection script for post_deploy_error_rate.
 *
 *   bun platform/detect.ts --gateway platform/ops/logs/gateway-2026-09-12.jsonl \
 *                          --deployments platform/ops/logs/deployments.jsonl \
 *                          --baseline platform/ops/logs/baseline-rolling-30d.json
 *
 * Detection is deterministic. There is no model in this file, it opens no socket, and two
 * runs over the same inputs print the same bytes. What the model is for is the diagnosis
 * that comes after a band is breached, and the band decides whether it is invoked at all,
 * with which tools, and to what end. Those three come out of platform/bands.yaml and
 * nowhere else.
 *
 * The invocation is printed on every breach and run only under --invoke. Printing it is not
 * a dry run: it is the record of what the tier permits, and it is what a reviewer reads to
 * check that the agent was given the tools the band allows and no others.
 *
 * ── the gateway log ──────────────────────────────────────────────────────────────────────
 *
 * One JSON object per line, one line per second in which the gateway saw traffic for the
 * route. Seconds with no traffic have no line.
 *
 *   {"ts":"2026-09-12T07:15:03+02:00","route":"onboarding-core",
 *    "requests":57,"admitted":50,"rateLimited":7,"serverError":0,
 *    "paths":{"list":18,"case":22,"status":17}}
 *
 *   ts           second, ISO-8601 with offset
 *   requests     what arrived
 *   admitted     what the gateway passed upstream
 *   rateLimited  what it answered 429 to, because the route's limit was already spent
 *   serverError  what the upstream failed
 *
 * The metric is (rateLimited + serverError) / requests over a window. A 429 counts as an
 * error because the caller saw one: the relationship manager's panel does not care which
 * side of the gateway refused it.
 *
 * ── the deployments file ─────────────────────────────────────────────────────────────────
 *
 *   {"timestamp":"2026-09-11T18:40:00+02:00","env":"production","tag":"release/..."}
 *
 * A window has a deployment in it when a production deployment falls inside the lookback
 * ending at the window's close. The lookback is 24 hours by default, because this estate
 * has a nightly batch and a change that only shows up after it cannot be seen sooner.
 *
 * ── the baseline ─────────────────────────────────────────────────────────────────────────
 *
 * --baseline reads mean and sigma computed over the preceding 30 days, in the shape
 * platform/ops/simulate-day.ts writes. Without it the baseline is computed from the windows
 * of the log being read, which is only honest on a log with no excursion in it.
 *
 * ── the rules ────────────────────────────────────────────────────────────────────────────
 *
 * Western Electric, upper side only — an error rate below its mean is good news. The tier
 * is the highest band the evidence supports:
 *
 *   W1  one point beyond 3 sigma                          3sigma
 *   W2  two of three consecutive points beyond 2 sigma    3sigma
 *   W3  one point beyond 2 sigma                          2sigma
 *   W4  four of five consecutive points beyond 1 sigma    2sigma
 *   W5  one point beyond 1 sigma                          1sigma
 *   W6  eight consecutive points above the mean           1sigma
 *
 * Unit tests: bun test platform/detect.test.ts
 */

import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, relative, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dir, "..");

// ── bands.yaml ───────────────────────────────────────────────────────────────────────────

export interface Tier {
  action: string;
  tools?: string;
  routes?: string[];
}

export interface Bands {
  metric: string;
  baseline: string;
  rules: string;
  tiers: Record<string, Tier>;
}

/** Splits on a separator that is not inside brackets or quotes. */
function splitTop(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = "";
  let current = "";
  for (const character of text) {
    if (quote) {
      if (character === quote) quote = "";
      current += character;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === "{" || character === "[") depth += 1;
    else if (character === "}" || character === "]") depth -= 1;
    else if (character === separator && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter((part) => part !== "");
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && (trimmed[0] === '"' || trimmed[0] === "'")
      && trimmed.at(-1) === trimmed[0]) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Enough YAML for bands.yaml and no more: scalars at the top level, and one flow mapping per
 * tier, which may be written across two lines. Anything else in the file is a change nobody
 * has agreed, so it fails loudly rather than being half-read.
 */
export function parseBands(text: string): Bands {
  const joined: string[] = [];
  let buffer = "";
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+#.*$/, "").trimEnd();
    if (line.trim() === "") continue;
    buffer = buffer === "" ? line : `${buffer} ${line.trim()}`;
    const opens = (buffer.match(/[{[]/g) ?? []).length;
    const closes = (buffer.match(/[}\]]/g) ?? []).length;
    if (opens === closes) {
      joined.push(buffer);
      buffer = "";
    }
  }
  if (buffer !== "") throw new Error(`bands: unterminated mapping at ${buffer}`);

  const scalars: Record<string, string> = {};
  const tiers: Record<string, Tier> = {};
  let inTiers = false;

  for (const line of joined) {
    const indented = /^\s/.test(line);
    const [key, ...rest] = splitTop(line, ":");
    const value = rest.join(":").trim();
    if (!indented) {
      inTiers = key.trim() === "tiers";
      if (!inTiers) scalars[key.trim()] = unquote(value);
      continue;
    }
    if (!inTiers) throw new Error(`bands: indented line outside tiers: ${line}`);
    const body = value.replace(/^\{/, "").replace(/\}$/, "");
    const tier: Tier = { action: "" };
    for (const entry of splitTop(body, ",")) {
      const separator = entry.indexOf(":");
      const name = entry.slice(0, separator).trim();
      const raw = entry.slice(separator + 1).trim();
      if (name === "action") tier.action = unquote(raw);
      else if (name === "tools") tier.tools = unquote(raw);
      else if (name === "routes") {
        tier.routes = splitTop(raw.replace(/^\[/, "").replace(/\]$/, ""), ",").map(unquote);
      }
    }
    if (tier.action === "") throw new Error(`bands: tier ${key.trim()} has no action`);
    tiers[key.trim()] = tier;
  }

  for (const required of ["metric", "baseline", "rules"]) {
    if (!scalars[required]) throw new Error(`bands: ${required} is missing`);
  }
  if (scalars.rules !== "western_electric") {
    throw new Error(`bands: this script implements western_electric, not ${scalars.rules}`);
  }
  return {
    metric: scalars.metric, baseline: scalars.baseline, rules: scalars.rules, tiers,
  };
}

// ── inputs ───────────────────────────────────────────────────────────────────────────────

interface GatewayLine {
  ts: string;
  requests: number;
  rateLimited?: number;
  serverError?: number;
}

interface Deployment {
  timestamp: string;
  env: string;
  tag: string;
}

interface Baseline {
  mean: number;
  sigma: number;
  samples?: number;
  days?: number;
  source: string;
}

function readJsonl<T>(path: string): T[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as T);
}

/** Epoch milliseconds for an ISO-8601 stamp that carries its own offset. */
function epoch(iso: string): number {
  const value = Date.parse(iso);
  if (Number.isNaN(value)) throw new Error(`not an ISO-8601 timestamp: ${iso}`);
  return value;
}

// ── windows ──────────────────────────────────────────────────────────────────────────────

export interface Window {
  start: number;
  startIso: string;
  requests: number;
  errors: number;
  rate: number;
}

/** Buckets the log into windows aligned to the window size from the epoch. */
export function toWindows(
  lines: GatewayLine[], windowMinutes: number, minRequests: number,
): Window[] {
  const span = windowMinutes * 60_000;
  const buckets = new Map<number, { requests: number; errors: number; iso: string }>();
  for (const line of lines) {
    const key = Math.floor(epoch(line.ts) / span) * span;
    const bucket = buckets.get(key) ?? { requests: 0, errors: 0, iso: "" };
    bucket.requests += line.requests;
    bucket.errors += (line.rateLimited ?? 0) + (line.serverError ?? 0);
    if (bucket.iso === "") {
      // Keep the log's own offset rather than re-rendering the instant in local time.
      const offset = line.ts.slice(-6);
      bucket.iso = new Date(key + offsetMillis(offset)).toISOString().slice(0, 19) + offset;
    }
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([start, bucket]) => ({
      start,
      startIso: bucket.iso,
      requests: bucket.requests,
      errors: bucket.errors,
      rate: bucket.requests === 0 ? 0 : bucket.errors / bucket.requests,
    }))
    .filter((window) => window.requests >= minRequests);
}

function offsetMillis(offset: string): number {
  const match = offset.match(/^([+-])(\d{2}):(\d{2})$/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 3600 + Number(match[3]) * 60) * 1000;
}

// ── the rules ────────────────────────────────────────────────────────────────────────────

export type TierName = "1sigma" | "2sigma" | "3sigma" | null;

export interface Verdict {
  tier: TierName;
  rule: string;
}

/**
 * Western Electric over the window at `index`, using the windows before it as the run. The
 * highest band the evidence supports wins, and the rule that decided it is named so the log
 * says why, not only what.
 */
export function classify(rates: number[], index: number, mean: number, sigma: number): Verdict {
  if (sigma <= 0) return { tier: null, rule: "-" };
  const z = (value: number) => (value - mean) / sigma;
  const back = (count: number) => rates.slice(Math.max(0, index - count + 1), index + 1);
  const beyond = (values: number[], sigmas: number) => values.filter((v) => z(v) > sigmas).length;

  const here = z(rates[index]);
  if (here > 3) return { tier: "3sigma", rule: "W1 one point beyond 3 sigma" };

  const three = back(3);
  if (three.length === 3 && z(rates[index]) > 2 && beyond(three, 2) >= 2) {
    return { tier: "3sigma", rule: "W2 two of three beyond 2 sigma" };
  }
  if (here > 2) return { tier: "2sigma", rule: "W3 one point beyond 2 sigma" };

  const five = back(5);
  if (five.length === 5 && here > 1 && beyond(five, 1) >= 4) {
    return { tier: "2sigma", rule: "W4 four of five beyond 1 sigma" };
  }
  if (here > 1) return { tier: "1sigma", rule: "W5 one point beyond 1 sigma" };

  const eight = back(8);
  if (eight.length === 8 && eight.every((value) => value > mean)) {
    return { tier: "1sigma", rule: "W6 eight consecutive above the mean" };
  }
  return { tier: null, rule: "-" };
}

// ── the diagnosis prompt ─────────────────────────────────────────────────────────────────

function diagnosisPrompt(
  metric: string, window: Window, mean: number, sigma: number, deployment: Deployment | null,
  evidence: string[],
): string {
  const sigmas = ((window.rate - mean) / sigma).toFixed(2);
  return [
    `${metric} breached the 2 sigma band.`,
    "",
    `Window        ${window.startIso}`,
    `Value         ${window.rate.toFixed(5)} over ${window.requests} requests`,
    `Baseline      mean ${mean.toFixed(6)}, sigma ${sigma.toFixed(6)}, ${sigmas} sigma above`,
    deployment
      ? `Deployment    ${deployment.tag} to ${deployment.env} at ${deployment.timestamp}`
      : "Deployment    none in the lookback",
    "",
    "Evidence you can read:",
    ...evidence.map((path) => `  ${path}`),
    "",
    "Diagnose the anomaly from the evidence above and the repository. You are read-only:",
    "propose nothing, change nothing, deploy nothing, roll back nothing.",
    "",
    "Write what you find as a Stage 1 intent in intent/, in the same format as the intents",
    "already there: the anomaly and its evidence, the outcome you propose, the systems it",
    "affects, and any open question you cannot close from the evidence. Open it as a pull",
    "request for the service owner to triage. Do not write anywhere else.",
  ].join("\n");
}

// ── the stream, as the terminal shows it ─────────────────────────────────────────────────
//
// Claude Code writes one JSON object per line under --output-format stream-json. What
// belongs on an operator's screen is what the agent said and what it touched, not the
// envelope around it. This is the only thing between the two, and it is pure so it can be
// tested against hand-written lines without running anything.

/** The argument worth showing for a tool call, by tool. */
function toolArgument(name: string, input: Record<string, unknown>): string {
  const order = ["file_path", "path", "pattern", "command", "url", "prompt", "query"];
  for (const key of order) {
    const value = input[key];
    if (typeof value === "string" && value !== "") {
      return value.split("\n")[0].slice(0, 120);
    }
  }
  const first = Object.values(input).find((value) => typeof value === "string");
  return typeof first === "string" ? first.split("\n")[0].slice(0, 120) : "";
}

function firstLine(content: unknown): string {
  if (typeof content === "string") return content.split("\n")[0].slice(0, 160);
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block && typeof block === "object" && "text" in block) {
        return String((block as { text: unknown }).text).split("\n")[0].slice(0, 160);
      }
    }
  }
  return "";
}

/**
 * One stream-json line in, zero or more display lines out. Unknown shapes produce nothing:
 * a stream the script does not understand must not put raw JSON on a screen.
 */
export function renderStreamLine(raw: string): string[] {
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return [];
  }
  const type = event.type;

  if (type === "system" && event.subtype === "init") {
    const model = typeof event.model === "string" ? event.model : "?";
    const session = typeof event.session_id === "string" ? event.session_id : "?";
    return [`· session ${session} · model ${model}`];
  }

  if (type === "system" && typeof event.subtype === "string" && event.subtype.includes("hook")) {
    const name = typeof event.hook_event_name === "string" ? event.hook_event_name : event.subtype;
    const tool = typeof event.tool_name === "string" ? ` ${event.tool_name}` : "";
    const text = firstLine(event.output ?? event.message ?? event.text ?? "");
    return [`hook ${name}${tool}${text === "" ? "" : `  ${text}`}`];
  }

  const message = event.message as { content?: unknown } | undefined;
  const content = message?.content;

  if (type === "assistant" && Array.isArray(content)) {
    const lines: string[] = [];
    for (const block of content as Record<string, unknown>[]) {
      if (block.type === "text" && typeof block.text === "string") {
        for (const line of block.text.split("\n")) {
          if (line.trim() !== "") lines.push(line);
        }
      } else if (block.type === "tool_use" && typeof block.name === "string") {
        const input = (block.input ?? {}) as Record<string, unknown>;
        const argument = toolArgument(block.name, input);
        lines.push(`→ ${block.name}${argument === "" ? "" : `  ${argument}`}`);
      }
    }
    return lines;
  }

  if (type === "user" && Array.isArray(content)) {
    const lines: string[] = [];
    for (const block of content as Record<string, unknown>[]) {
      if (block.type === "tool_result" && block.is_error === true) {
        lines.push(`!  ${firstLine(block.content)}`);
      }
    }
    return lines;
  }

  if (type === "result" && event.is_error === true) {
    return [`!  run ended ${String(event.subtype ?? "with an error")}`];
  }
  return [];
}

// ── invocation ───────────────────────────────────────────────────────────────────────────

function invocationArguments(tools: string, prompt: string): string[] {
  const args = [
    "-p",
    "--output-format", "stream-json",
    "--include-hook-events",
    "--allowedTools", tools,
    "--permission-mode", "plan",
  ];
  // Record.ts hands the session id down so it can find the transcript by name afterwards.
  const recorded = process.env.RECORD_SESSION_ID;
  if (recorded) args.push("--session-id", recorded);
  args.push(prompt);
  return args;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function printInvocation(args: string[]): void {
  const parts = args.map((argument) =>
    /^[-A-Za-z0-9_./]+$/.test(argument) ? argument : shellQuote(argument));
  console.log(`\nclaude ${parts.join(" ")}\n`);
}

function runInvocation(args: string[]): void {
  // The environment is inherited whole. CLAUDE_CONFIG_DIR in particular belongs to whoever
  // started this script — the recorder points it at the session's own config — and setting
  // it here would send the run to a different profile than the one being recorded.
  const child = execFile("claude", args, { maxBuffer: 64 * 1024 * 1024 });
  const stream = child.stdout;
  if (stream) {
    const reader = createInterface({ input: stream });
    reader.on("line", (line) => {
      for (const rendered of renderStreamLine(line)) console.log(rendered);
    });
  }
  child.stderr?.on("data", (chunk: Buffer) => process.stderr.write(chunk));
  child.on("close", (code) => {
    if (code !== 0) console.error(`diagnosis run exited ${code}`);
  });
}

// ── main ─────────────────────────────────────────────────────────────────────────────────

function flag(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
}

function main(): void {
  const bandsPath = resolve(flag("bands", join(REPO_ROOT, "platform", "bands.yaml")));
  const gatewayPath = flag("gateway", "");
  const deploymentsPath = flag("deployments", "");
  const baselinePath = flag("baseline", "");
  const windowMinutes = Number(flag("window", "5"));
  const lookbackMinutes = Number(flag("lookback", "1440"));
  const minRequests = Number(flag("min-requests", "100"));
  const invoke = process.argv.includes("--invoke");

  if (gatewayPath === "") {
    console.error("usage: bun platform/detect.ts --gateway <log.jsonl> [--deployments <f>] "
      + "[--baseline <f>] [--window 5] [--lookback 1440] [--invoke]");
    process.exit(64);
  }

  const bands = parseBands(readFileSync(bandsPath, "utf8"));
  const lines = readJsonl<GatewayLine>(resolve(gatewayPath));
  const deployments = deploymentsPath === ""
    ? []
    : readJsonl<Deployment>(resolve(deploymentsPath)).filter((d) => d.env === "production");
  const evaluated = toWindows(lines, windowMinutes, minRequests);

  let baseline: Baseline;
  if (baselinePath !== "") {
    const file = JSON.parse(readFileSync(resolve(baselinePath), "utf8")) as
      { mean: number; sigma: number; samples?: number; days?: number };
    baseline = { ...file, source: `${bands.baseline} ${relative(REPO_ROOT, resolve(baselinePath))}` };
  } else {
    const rates = evaluated.map((window) => window.rate);
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    const variance = rates.reduce((a, b) => a + (b - mean) ** 2, 0) / rates.length;
    baseline = {
      mean, sigma: Math.sqrt(variance), samples: rates.length, source: "this log, no baseline given",
    };
  }

  console.log(`${bands.metric} · ${relative(REPO_ROOT, bandsPath)} · window ${windowMinutes}m`
    + ` · rules ${bands.rules} · baseline ${baseline.source}`
    + ` mean=${baseline.mean.toFixed(6)} sigma=${baseline.sigma.toFixed(6)}`
    + (baseline.samples ? ` n=${baseline.samples}` : ""));

  const rates = evaluated.map((window) => window.rate);
  const breaches: { window: Window; tier: TierName; deployment: Deployment | null }[] = [];

  evaluated.forEach((window, index) => {
    const verdict = classify(rates, index, baseline.mean, baseline.sigma);
    const closes = window.start + windowMinutes * 60_000;
    const deployment = deployments.find((d) => {
      const when = epoch(d.timestamp);
      return when <= closes && when >= closes - lookbackMinutes * 60_000;
    }) ?? null;
    const sigmas = (window.rate - baseline.mean) / baseline.sigma;
    const tier = verdict.tier ?? "-";
    const action = verdict.tier ? (bands.tiers[verdict.tier]?.action ?? "-") : "-";
    console.log(
      `${window.startIso}  ${bands.metric}  ${window.rate.toFixed(5)}`
      + `  base=${baseline.mean.toFixed(6)}  sigma=${baseline.sigma.toFixed(6)}`
      + `  ${sigmas >= 0 ? "+" : ""}${sigmas.toFixed(2)}s  tier=${tier.padEnd(6)}`
      + `  action=${(action).padEnd(8)}  deployment=${deployment ? deployment.tag : "none"}`
      + `  rule=${verdict.rule}`,
    );
    if (verdict.tier === "2sigma" || verdict.tier === "3sigma") {
      breaches.push({ window, tier: verdict.tier, deployment });
    }
  });

  const evidence = [
    relative(REPO_ROOT, resolve(gatewayPath)),
    ...(deploymentsPath === "" ? [] : [relative(REPO_ROOT, resolve(deploymentsPath))]),
    "platform/ops/logs/screening-batch-2026-09-12.log",
    "platform/ops/logs/status-cache-2026-09-12.log",
    "deploy/gateway/onboarding-core.yaml",
    "screening-batch/ops/screening-batch.cron",
  ];

  for (const breach of breaches) {
    const tier = bands.tiers[breach.tier as string];
    if (breach.tier === "3sigma") {
      console.log(`\n3sigma at ${breach.window.startIso}. Band allows ${tier.action} over`
        + ` ${(tier.routes ?? []).join(", ")}. Not taken: a route is opened by the service owner,`
        + " never by this script.");
      continue;
    }
    if (!breach.deployment) {
      console.log(`\n2sigma at ${breach.window.startIso} with no deployment in the`
        + ` ${lookbackMinutes}m lookback. Logged, not diagnosed.`);
      continue;
    }
    console.log(`\n2sigma at ${breach.window.startIso} with ${breach.deployment.tag} in the`
      + ` ${lookbackMinutes}m lookback. Band allows ${tier.action}, tools ${tier.tools}.`);
    const args = invocationArguments(
      tier.tools ?? "",
      diagnosisPrompt(bands.metric, breach.window, baseline.mean, baseline.sigma,
        breach.deployment, evidence),
    );
    printInvocation(args);
    if (invoke) runInvocation(args);
  }

  if (breaches.length === 0) {
    console.log("\nno window beyond 2 sigma; nothing invoked.");
  } else if (!invoke) {
    console.log("printed only; --invoke runs it.");
  }
}

if (import.meta.main) main();
