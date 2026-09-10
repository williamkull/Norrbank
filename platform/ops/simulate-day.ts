#!/usr/bin/env bun
/**
 * Generates the rehearsal dataset for the ONB-2140 release window.
 *
 *   bun platform/ops/simulate-day.ts                    write into platform/ops/logs
 *   bun platform/ops/simulate-day.ts --out <dir>        write somewhere else
 *   bun platform/ops/simulate-day.ts --ttl 5 --seed 20260910
 *
 * Why this exists. `platform/detect.ts` watches the post-deploy error rate and invokes
 * Claude when a control band is breached. A detector nobody has ever seen fire is not a
 * control, so before the release it watches goes out we exercise it against a window whose
 * shape we set: one ordinary morning, and one morning after a release, with the traffic the
 * change is expected to add. Everything the detector or a diagnosis would read is written
 * here, so the run has evidence to work from and none of it is hidden in a metrics store.
 *
 * What it is not. This is not production telemetry. It is a generated dataset, seeded, and
 * byte-identical on every run so two runs of the detector are comparable.
 *
 * The numbers that shape it are not invented here. They are read out of the estate:
 *
 *   deploy/gateway/onboarding-core.yaml                  50 rps, burst 10, 429 on exceeded
 *   screening-batch/ops/screening-batch.cron             02:00 nightly
 *   .../resources/screening-batch.properties             expected runtime 4 minutes
 *
 * and the one number that is ours, --ttl: the interval at which the status panel re-checks
 * the stage source for changes, in minutes. It is 5 because the screening run is expected to
 * take 4, so a poll can never land inside a run and read a half-written stage. The cost of
 * that choice is what this dataset is for: when the poll after the run sees the stamp move,
 * every entry goes at once, because the run restages every case rather than the ones that
 * moved.
 *
 * Output, all under --out:
 *   gateway-2026-09-11.jsonl        the ordinary morning, before the release
 *   gateway-2026-09-12.jsonl        the morning after it
 *   baseline-rolling-30d.json       mean and sigma over the 30 mornings up to 2026-09-11
 *   screening-batch-2026-09-12.log  the nightly run's own log
 *   status-cache-2026-09-12.log     the panel cache, from first fill to the morning misses
 *   deployments.jsonl               what was released, when, and under which tag
 *
 * Each gateway file covers 00:00 to 09:00 local time. A line is one second in which the
 * gateway saw at least one request for the onboarding-core route; seconds with no traffic
 * are absent rather than zero, which is why the small hours are a handful of lines and the
 * morning is a line per second.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// ── where things are ─────────────────────────────────────────────────────────────────────

const REPO_ROOT = resolve(import.meta.dir, "..", "..");
const GATEWAY_YAML = join(REPO_ROOT, "deploy", "gateway", "onboarding-core.yaml");
const BATCH_CRON = join(REPO_ROOT, "screening-batch", "ops", "screening-batch.cron");
const BATCH_PROPERTIES = join(
  REPO_ROOT, "screening-batch", "src", "main", "resources", "screening-batch.properties",
);

// ── the release window ───────────────────────────────────────────────────────────────────

const QUIET_DAY = "2026-09-11";
const BREACH_DAY = "2026-09-12";
const OFFSET = "+02:00";          // CEST; the whole window is inside it
const DAY_START = 0;              // 00:00:00
const DAY_END = 9 * 3600;         // 09:00:00, exclusive
const BASELINE_DAYS = 30;         // the 30 mornings up to and including QUIET_DAY
const WINDOW_SECONDS = 300;       // the control chart's window, 5 minutes
const MIN_WINDOW_REQUESTS = 100;  // below this a window is noise, not a measurement

const RELEASE = {
  tag: "release/2026.09.11-onb-2140",
  ticket: "ONB-2140",
  env: "production",
  at: `${QUIET_DAY}T18:40:00${OFFSET}`,
  change: "CHG0048812",
};

// ── estate configuration ─────────────────────────────────────────────────────────────────

function readNumber(file: string, pattern: RegExp, what: string): number {
  const match = readFileSync(file, "utf8").match(pattern);
  if (!match) throw new Error(`${what}: no match for ${pattern} in ${file}`);
  return Number(match[1]);
}

const RATE_LIMIT = readNumber(GATEWAY_YAML, /requestsPerSecond:\s*(\d+)/, "gateway rate limit");
const RATE_BURST = readNumber(GATEWAY_YAML, /burst:\s*(\d+)/, "gateway burst");
const BATCH_MINUTE = readNumber(BATCH_CRON, /^\s*(\d+)\s+\d+\s+\*\s+\*\s+\*/m, "batch minute");
const BATCH_HOUR = readNumber(BATCH_CRON, /^\s*\d+\s+(\d+)\s+\*\s+\*\s+\*/m, "batch hour");
if (BATCH_MINUTE !== 0) {
  throw new Error(`the screening run no longer starts on the hour: minute ${BATCH_MINUTE}`);
}
const BATCH_MINUTES = readNumber(
  BATCH_PROPERTIES, /batch\.expected\.runtime\.minutes=(\d+)/, "batch expected runtime",
);

// ── the traffic profile ──────────────────────────────────────────────────────────────────
//
// Requests per second against the onboarding-core route, by time of day. Between knots the
// rate is interpolated linearly. The shape is a Norrbank weekday morning: overnight
// integrations until the screening run, nothing at all between it and the first arrivals,
// then relationship managers logging in from 07:00 and settling into their day by 07:40.
//
// This is the workspace's own traffic. The status panel's traffic sits on top of it and is
// derived rather than given: see firstViewShare().

type Knot = [seconds: number, rps: number];

const at = (h: number, m: number, s = 0) => h * 3600 + m * 60 + s;

const MORNING_START = at(6, 55);

/** Requests a second at the top of the arrival wave, just after 07:15. */
const PEAK_RPS = 38;

const BASE_PROFILE: Knot[] = [
  [at(0, 0), 0.18],
  [at(1, 59), 0.18],
  [at(2, 5), 0.12],
  [at(2, 5, 1), 0],
  [at(6, 54, 59), 0],
  [MORNING_START, 0.016 * PEAK_RPS],
  [at(7, 0), 0.068 * PEAK_RPS],
  [at(7, 5), 0.216 * PEAK_RPS],
  [at(7, 10), 0.378 * PEAK_RPS],
  [at(7, 13), 0.757 * PEAK_RPS],
  [at(7, 14), 0.941 * PEAK_RPS],
  [at(7, 16), 1.0 * PEAK_RPS],
  [at(7, 20), 0.984 * PEAK_RPS],
  [at(7, 26), 0.951 * PEAK_RPS],
  [at(7, 40), 0.930 * PEAK_RPS],
  [at(8, 0), 0.905 * PEAK_RPS],
  [at(9, 0), 0.862 * PEAK_RPS],
];

/** Share of workspace requests that open a single case, and so render the status panel. */
const CASE_VIEW_SHARE = 0.55;

/**
 * The panel cache is keyed by case *and caller*, because what the panel may show depends on
 * who is asking. A case one relationship manager has opened is therefore still cold for the
 * next one, and what reaches the gateway is not the panel's traffic but the panel's first
 * views. The two are the same thing only while the cache is empty.
 *
 * Early in the morning almost every case a relationship manager opens is one they have not
 * opened yet today. That share falls as the morning goes on and they return to cases they
 * have already looked at. FIRST_VIEW_TAU is the time constant of the fall, in seconds from
 * the first arrivals: at TAU seconds into the working day, half of the panel's views are
 * repeat views and never leave the workspace. It is the cache warming, seen from the
 * gateway, and it is what ends the excursion without anyone doing anything.
 */
const FIRST_VIEW_TAU = 4000;

/** Upstream failures unrelated to the gateway: connection resets, upstream timeouts. */
const SERVER_ERROR_RATE = 0.00035;

/**
 * Some mornings the workspace is simply busier — month end, a campaign, a Monday after a
 * release freeze — and the gateway limit is sized against the service's connection pool
 * rather than against demand, so those mornings brush it. They are the reason the control
 * band is as wide as it is, and they are why a post-deploy excursion has to be correlated
 * with a deployment rather than read off the error rate alone.
 */
const BUSY_MORNING_ODDS = 0.1;
const BUSY_MORNING_SCALE = 1.52;

function interpolate(profile: Knot[], second: number): number {
  if (second <= profile[0][0]) return profile[0][1];
  for (let i = 1; i < profile.length; i += 1) {
    const [t1, r1] = profile[i];
    if (second <= t1) {
      const [t0, r0] = profile[i - 1];
      const span = t1 - t0;
      return span === 0 ? r1 : r0 + ((r1 - r0) * (second - t0)) / span;
    }
  }
  return profile[profile.length - 1][1];
}

// ── deterministic randomness ─────────────────────────────────────────────────────────────

/** mulberry32. Small, fast, and identical on every platform bun runs on. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Knuth for small means, Poisson normal approximation above 30 where Knuth gets slow. */
function poisson(next: () => number, mean: number): number {
  if (mean <= 0) return 0;
  if (mean < 30) {
    const limit = Math.exp(-mean);
    let k = 0;
    let p = 1;
    do {
      k += 1;
      p *= next();
    } while (p > limit);
    return k - 1;
  }
  const u1 = Math.max(next(), 1e-12);
  const u2 = next();
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, Math.round(mean + normal * Math.sqrt(mean)));
}

// ── one day ──────────────────────────────────────────────────────────────────────────────

interface GatewayLine {
  ts: string;
  route: string;
  requests: number;
  admitted: number;
  rateLimited: number;
  serverError: number;
  paths: { list: number; case: number; status: number };
}

interface DayOptions {
  date: string;
  seed: number;
  /** Is the status panel deployed and its cache cold from the nightly run? */
  panelDeployed: boolean;
  busyMorning: boolean;
  ttlMinutes: number;
}

function clock(second: number): string {
  const h = Math.floor(second / 3600);
  const m = Math.floor((second % 3600) / 60);
  const s = second % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function stamp(date: string, second: number): string {
  return `${date}T${clock(second)}${OFFSET}`;
}

/** The share of this second's case views that are the first view of that case today. */
function firstViewShare(second: number): number {
  const intoTheDay = Math.max(0, second - MORNING_START);
  return FIRST_VIEW_TAU / (FIRST_VIEW_TAU + intoTheDay);
}

function simulateDay(options: DayOptions): GatewayLine[] {
  const next = rng(options.seed);
  const lines: GatewayLine[] = [];
  const scale = options.busyMorning ? BUSY_MORNING_SCALE : 1;

  // The gateway's token bucket: RATE_LIMIT tokens a second, RATE_BURST of headroom.
  let tokens = RATE_LIMIT + RATE_BURST;

  const cacheDropSecond = at(BATCH_HOUR, 0)
    + BATCH_MINUTES * 60
    + (options.ttlMinutes * 60 - ((BATCH_MINUTES * 60) % (options.ttlMinutes * 60)));

  for (let second = DAY_START; second < DAY_END; second += 1) {
    const morning = second >= at(6, 55);
    const base = interpolate(BASE_PROFILE, second) * (morning ? scale : 1);
    const caseViews = base * CASE_VIEW_SHARE;

    let panel = 0;
    if (options.panelDeployed && second >= cacheDropSecond) {
      panel = caseViews * firstViewShare(second);
    }

    const arrivals = poisson(next, base + panel);
    if (arrivals === 0) {
      tokens = Math.min(RATE_LIMIT + RATE_BURST, tokens + RATE_LIMIT);
      continue;
    }

    tokens = Math.min(RATE_LIMIT + RATE_BURST, tokens + RATE_LIMIT);
    const admitted = Math.min(arrivals, Math.floor(tokens));
    tokens -= admitted;
    const rateLimited = arrivals - admitted;

    let serverError = 0;
    for (let i = 0; i < admitted; i += 1) {
      if (next() < SERVER_ERROR_RATE) serverError += 1;
    }

    // How the arrivals split across the route's paths. The panel's share is whatever the
    // cache did not absorb; the rest divides between the case list and a single case.
    const total = base + panel;
    const statusShare = total === 0 ? 0 : panel / total;
    const status = Math.round(arrivals * statusShare);
    const rest = arrivals - status;
    const single = Math.round(rest * CASE_VIEW_SHARE);

    lines.push({
      ts: stamp(options.date, second),
      route: "onboarding-core",
      requests: arrivals,
      admitted,
      rateLimited,
      serverError,
      paths: { list: rest - single, case: single, status },
    });
  }

  return lines;
}

// ── windows ──────────────────────────────────────────────────────────────────────────────

interface Window {
  startSecond: number;
  requests: number;
  errors: number;
  rate: number;
}

function windows(lines: GatewayLine[]): Window[] {
  const buckets = new Map<number, { requests: number; errors: number }>();
  for (const line of lines) {
    const second = Number(line.ts.slice(11, 13)) * 3600
      + Number(line.ts.slice(14, 16)) * 60
      + Number(line.ts.slice(17, 19));
    const key = Math.floor(second / WINDOW_SECONDS) * WINDOW_SECONDS;
    const bucket = buckets.get(key) ?? { requests: 0, errors: 0 };
    bucket.requests += line.requests;
    bucket.errors += line.rateLimited + line.serverError;
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([startSecond, bucket]) => ({
      startSecond,
      requests: bucket.requests,
      errors: bucket.errors,
      rate: bucket.requests === 0 ? 0 : bucket.errors / bucket.requests,
    }))
    .filter((window) => window.requests >= MIN_WINDOW_REQUESTS);
}

// ── the rolling baseline ─────────────────────────────────────────────────────────────────

function dayBefore(date: string, days: number): string {
  const base = Date.UTC(
    Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)),
  );
  return new Date(base - days * 86400000).toISOString().slice(0, 10);
}

function seedFor(date: string): number {
  return Number(date.replaceAll("-", ""));
}

function baseline(ttlMinutes: number): {
  metric: string; windowMinutes: number; minRequests: number; days: number;
  from: string; to: string; samples: number; mean: number; sigma: number;
} {
  const rates: number[] = [];
  let from = QUIET_DAY;
  for (let i = 0; i < BASELINE_DAYS; i += 1) {
    const date = dayBefore(QUIET_DAY, i);
    from = date;
    const seed = seedFor(date);
    const busy = rng(seed ^ 0x5eed)() < BUSY_MORNING_ODDS;
    const day = simulateDay({ date, seed, panelDeployed: false, busyMorning: busy, ttlMinutes });
    for (const window of windows(day)) rates.push(window.rate);
  }
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const variance = rates.reduce((a, b) => a + (b - mean) ** 2, 0) / rates.length;
  return {
    metric: "post_deploy_error_rate",
    windowMinutes: WINDOW_SECONDS / 60,
    minRequests: MIN_WINDOW_REQUESTS,
    days: BASELINE_DAYS,
    from,
    to: QUIET_DAY,
    samples: rates.length,
    mean: Number(mean.toFixed(6)),
    sigma: Number(Math.sqrt(variance).toFixed(6)),
  };
}

// ── the other three logs ─────────────────────────────────────────────────────────────────

function batchLog(ttlMinutes: number): string {
  const start = at(BATCH_HOUR, 0, 3);
  const lockAt = start + 1;
  const end = start + BATCH_MINUTES * 60 - 8;
  const restaged = 11842;
  const held = end - lockAt;
  const line = (second: number, level: string, text: string) =>
    `${stamp(BREACH_DAY, second)} ${level} [screening-batch] ${text}`;
  return [
    line(start, "INFO ", "starting nightly screening run"),
    line(lockAt, "INFO ", "stage file lock taken on /var/lib/norrbank/screening/case-stage.dat"),
    line(lockAt + 2, "INFO ", `${restaged} open cases selected for screening`),
    line(lockAt + 47, "INFO ", "sanctions and PEP lists loaded, 4 lists"),
    line(end - 96, "INFO ", `${restaged} party results written to screening_result`),
    line(end - 30, "INFO ", `stage file rewritten in full, ${restaged} cases restaged`),
    line(end - 4, "WARN ", "every case was rewritten; this job has no incremental path"),
    line(end, "INFO ", `stage file lock released after ${held}s`),
    line(end + 1, "INFO ",
      `run complete, expected runtime ${BATCH_MINUTES}m, actual ${Math.round(held / 60 * 10) / 10}m`),
    "",
  ].join("\n");
}

/**
 * The panel cache's own log. The entry counts and hit rates are integrated out of the same
 * traffic model the gateway log comes from, so the two files agree by construction: what the
 * cache says it absorbed is exactly what the gateway did not see.
 */
function cacheLog(ttlMinutes: number): string {
  const drop = at(BATCH_HOUR, 0) + BATCH_MINUTES * 60
    + (ttlMinutes * 60 - ((BATCH_MINUTES * 60) % (ttlMinutes * 60)));
  const line = (date: string, second: number, level: string, text: string) =>
    `${stamp(date, second)} ${level} [status-cache] ${text}`;

  const entriesBy = (second: number): number => {
    let fills = 0;
    for (let t = MORNING_START; t <= second; t += 1) {
      fills += interpolate(BASE_PROFILE, t) * CASE_VIEW_SHARE * firstViewShare(t);
    }
    return Math.round(fills);
  };
  const hit = (second: number) => Math.round((1 - firstViewShare(second)) * 100);

  // The evening after the release: the panel is live and the cache fills from an empty start
  // as the last of the working day's traffic goes through it.
  const overnight = 2338;
  const evening = [
    line(QUIET_DAY, at(18, 44, 12), "INFO ",
      `cache enabled, keyed by case and caller, stage source polled every ${ttlMinutes}m, entries 0`),
    line(QUIET_DAY, at(18, 44, 19), "INFO ", "fill ONB-2026-004112, miss, 38ms"),
    line(QUIET_DAY, at(19, 30, 0), "INFO ", "2104 entries, hit rate 71% over the last 15m"),
    line(QUIET_DAY, at(20, 12, 44), "INFO ",
      `${overnight} entries, last fill of the working day`),
    line(QUIET_DAY, at(23, 0, 0), "INFO ", `${overnight} entries, poll sees no change`),
  ];
  const night = [
    line(BREACH_DAY, at(1, 55, 0), "INFO ", `${overnight} entries, poll sees no change`),
    line(BREACH_DAY, at(BATCH_HOUR, 0, 0), "INFO ", `${overnight} entries, poll sees no change`),
    line(BREACH_DAY, drop, "WARN ",
      `stage source last-changed moved, dropping all ${overnight} entries in one pass`),
    line(BREACH_DAY, drop + 1, "INFO ", "entries 0, nothing scheduled to refill them"),
  ];
  const morning = [
    line(BREACH_DAY, at(7, 0, 6), "INFO ", "fill ONB-2026-004101, miss, 44ms"),
    line(BREACH_DAY, at(7, 10), "INFO ",
      `${entriesBy(at(7, 10))} entries, hit rate ${hit(at(7, 10))}% over the last 5m`),
    line(BREACH_DAY, at(7, 14, 2), "WARN ",
      `hit rate ${hit(at(7, 14))}% over the last 60s, every miss is a gateway call`),
    line(BREACH_DAY, at(7, 14, 51), "WARN ", "upstream returned 429 for ONB-2026-004119, no retry"),
    line(BREACH_DAY, at(7, 20), "WARN ",
      `${entriesBy(at(7, 20))} entries, hit rate ${hit(at(7, 20))}%, 429s continuing`),
    line(BREACH_DAY, at(7, 30), "INFO ",
      `${entriesBy(at(7, 30))} entries, hit rate ${hit(at(7, 30))}%, 429s falling away`),
    line(BREACH_DAY, at(7, 45), "INFO ",
      `${entriesBy(at(7, 45))} entries, hit rate ${hit(at(7, 45))}%, 429s down to a few seconds`),
    line(BREACH_DAY, at(8, 30), "INFO ",
      `${entriesBy(at(8, 30))} entries, hit rate ${hit(at(8, 30))}%`),
  ];
  return [...evening, ...night, ...morning, ""].join("\n");
}

// ── main ─────────────────────────────────────────────────────────────────────────────────

function flag(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
}

function writeFile(path: string, body: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body);
  console.log(`  ${path.replace(`${REPO_ROOT}/`, "")}  ${body.length} bytes`);
}

function jsonl(lines: unknown[]): string {
  return lines.map((line) => JSON.stringify(line)).join("\n") + "\n";
}

function main(): void {
  const out = resolve(flag("out", join(import.meta.dir, "logs")));
  const ttlMinutes = Number(flag("ttl", "5"));
  const seed = Number(flag("seed", "20260910"));

  console.log(`gateway ${RATE_LIMIT} rps burst ${RATE_BURST}`);
  console.log(`screening run ${String(BATCH_HOUR).padStart(2, "0")}:00, expected ${BATCH_MINUTES}m`);
  console.log(`panel stage poll ${ttlMinutes}m\n`);

  const quiet = simulateDay({
    date: QUIET_DAY, seed: seedFor(QUIET_DAY), panelDeployed: false, busyMorning: false, ttlMinutes,
  });
  const breach = simulateDay({
    date: BREACH_DAY, seed: seedFor(BREACH_DAY), panelDeployed: true, busyMorning: false, ttlMinutes,
  });

  writeFile(join(out, `gateway-${QUIET_DAY}.jsonl`), jsonl(quiet));
  writeFile(join(out, `gateway-${BREACH_DAY}.jsonl`), jsonl(breach));
  writeFile(join(out, "baseline-rolling-30d.json"), JSON.stringify(baseline(ttlMinutes), null, 2) + "\n");
  writeFile(join(out, `screening-batch-${BREACH_DAY}.log`), batchLog(ttlMinutes));
  writeFile(join(out, `status-cache-${BREACH_DAY}.log`), cacheLog(ttlMinutes));
  writeFile(join(out, "deployments.jsonl"), jsonl([{
    timestamp: RELEASE.at, env: RELEASE.env, tag: RELEASE.tag,
    ticket: RELEASE.ticket, change: RELEASE.change,
  }]));

  if (process.argv.includes("--report")) {
    const base = baseline(ttlMinutes);
    console.log(`\nbaseline mean=${base.mean} sigma=${base.sigma} samples=${base.samples}`);
    console.log(`  1s=${(base.mean + base.sigma).toFixed(5)}`
      + `  2s=${(base.mean + 2 * base.sigma).toFixed(5)}`
      + `  3s=${(base.mean + 3 * base.sigma).toFixed(5)}`);
    for (const [label, day] of [["quiet", quiet], ["breach", breach]] as const) {
      console.log(`\n${label}`);
      for (const window of windows(day)) {
        const sigmas = (window.rate - base.mean) / base.sigma;
        if (sigmas > 0.4 || label === "quiet") {
          console.log(`  ${clock(window.startSecond)}  req=${String(window.requests).padStart(6)}`
            + `  err=${String(window.errors).padStart(5)}`
            + `  rate=${window.rate.toFixed(5)}  ${sigmas.toFixed(2)}s`);
        }
      }
    }
  }
}

main();
