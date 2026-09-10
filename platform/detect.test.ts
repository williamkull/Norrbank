/**
 * Unit tests for the detection script.
 *
 *   bun test platform/detect.test.ts
 *
 * The band reader, the rules and the stream renderer are the three places a mistake would be
 * invisible in the output: a misread tier would hand the agent the wrong tools, a misapplied
 * rule would fire on the wrong window, and a renderer that falls through would put raw JSON
 * on an operator's screen. None of these tests start a process or open a socket.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { classify, parseBands, renderStreamLine, toWindows } from "./detect.ts";

describe("parseBands", () => {
  const bands = parseBands(readFileSync(join(import.meta.dir, "bands.yaml"), "utf8"));

  test("reads the scalars", () => {
    expect(bands.metric).toBe("post_deploy_error_rate");
    expect(bands.baseline).toBe("rolling_30d");
    expect(bands.rules).toBe("western_electric");
  });

  test("reads a flow mapping written across two lines", () => {
    expect(bands.tiers["2sigma"].action).toBe("diagnose");
    expect(bands.tiers["2sigma"].tools).toBe("Read,Grep,Bash(gh run view *)");
  });

  test("reads a routes list", () => {
    expect(bands.tiers["3sigma"].action).toBe("propose");
    expect(bands.tiers["3sigma"].routes).toEqual(["pull_request", "runbook:rollback-deploy"]);
  });

  test("the 1sigma tier only logs", () => {
    expect(bands.tiers["1sigma"]).toEqual({ action: "log" });
  });

  test("refuses a rule set it does not implement", () => {
    expect(() => parseBands("metric: m\nbaseline: b\nrules: nelson\ntiers:\n  1sigma: { action: log }\n"))
      .toThrow(/western_electric/);
  });
});

describe("classify", () => {
  const mean = 0.01;
  const sigma = 0.02;
  const z = (sigmas: number) => mean + sigmas * sigma;

  test("W1 fires on one point beyond 3 sigma", () => {
    const verdict = classify([z(0), z(3.4)], 1, mean, sigma);
    expect(verdict.tier).toBe("3sigma");
    expect(verdict.rule).toStartWith("W1");
  });

  test("W2 escalates a sustained 2 sigma excursion", () => {
    const verdict = classify([z(2.2), z(0.5), z(2.3)], 2, mean, sigma);
    expect(verdict.tier).toBe("3sigma");
    expect(verdict.rule).toStartWith("W2");
  });

  test("W3 fires on a single point beyond 2 sigma", () => {
    const verdict = classify([z(0.1), z(0.2), z(2.5)], 2, mean, sigma);
    expect(verdict.tier).toBe("2sigma");
    expect(verdict.rule).toStartWith("W3");
  });

  test("W4 escalates four of five beyond 1 sigma", () => {
    const verdict = classify([z(1.2), z(1.3), z(0.2), z(1.4), z(1.5)], 4, mean, sigma);
    expect(verdict.tier).toBe("2sigma");
    expect(verdict.rule).toStartWith("W4");
  });

  test("W5 fires on a single point beyond 1 sigma", () => {
    const verdict = classify([z(0.1), z(1.4)], 1, mean, sigma);
    expect(verdict.tier).toBe("1sigma");
    expect(verdict.rule).toStartWith("W5");
  });

  test("W6 catches drift with no point beyond a band", () => {
    const drift = Array.from({ length: 8 }, () => z(0.2));
    const verdict = classify(drift, 7, mean, sigma);
    expect(verdict.tier).toBe("1sigma");
    expect(verdict.rule).toStartWith("W6");
  });

  test("an ordinary window is not a breach", () => {
    const verdict = classify([z(0.3), z(-0.4), z(0.1)], 2, mean, sigma);
    expect(verdict.tier).toBeNull();
  });

  test("the lower side is never a breach", () => {
    const verdict = classify([z(-4), z(-4)], 1, mean, sigma);
    expect(verdict.tier).toBeNull();
  });
});

describe("toWindows", () => {
  const seconds = (from: number, count: number, requests: number, rateLimited: number) =>
    Array.from({ length: count }, (_, i) => ({
      ts: `2026-09-12T07:${String(15 + Math.floor((from + i) / 60)).padStart(2, "0")}`
        + `:${String((from + i) % 60).padStart(2, "0")}+02:00`,
      requests,
      rateLimited,
      serverError: 0,
    }));

  test("buckets to five minutes and keeps the log's own offset", () => {
    const windows = toWindows(seconds(0, 300, 40, 2), 5, 100);
    expect(windows).toHaveLength(1);
    expect(windows[0].startIso).toBe("2026-09-12T07:15:00+02:00");
    expect(windows[0].requests).toBe(12000);
    expect(windows[0].rate).toBeCloseTo(0.05, 10);
  });

  test("drops a window with too few requests to measure", () => {
    expect(toWindows(seconds(0, 3, 5, 0), 5, 100)).toHaveLength(0);
  });
});

describe("renderStreamLine", () => {
  test("names the session on init", () => {
    expect(renderStreamLine(JSON.stringify({
      type: "system", subtype: "init", session_id: "8f2c", model: "claude-opus-5",
    }))).toEqual(["· session 8f2c · model claude-opus-5"]);
  });

  test("shows assistant text a line at a time", () => {
    expect(renderStreamLine(JSON.stringify({
      type: "assistant",
      message: { role: "assistant", content: [{ type: "text", text: "The batch ran at 02:00.\n\nThe cache went at 02:05." }] },
    }))).toEqual(["The batch ran at 02:00.", "The cache went at 02:05."]);
  });

  test("shows a tool call as its name and its main argument", () => {
    expect(renderStreamLine(JSON.stringify({
      type: "assistant",
      message: {
        role: "assistant",
        content: [{
          type: "tool_use", id: "t1", name: "Read",
          input: { file_path: "platform/ops/logs/status-cache-2026-09-12.log", limit: 200 },
        }],
      },
    }))).toEqual(["→ Read  platform/ops/logs/status-cache-2026-09-12.log"]);
  });

  test("shows a failed tool result and stays quiet about a successful one", () => {
    const failed = renderStreamLine(JSON.stringify({
      type: "user",
      message: {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "t1", is_error: true, content: "Permission denied\nat line 2" }],
      },
    }));
    expect(failed).toEqual(["!  Permission denied"]);
    expect(renderStreamLine(JSON.stringify({
      type: "user",
      message: { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "ok" }] },
    }))).toEqual([]);
  });

  test("shows a hook event as one line of the hook's own text", () => {
    expect(renderStreamLine(JSON.stringify({
      type: "system", subtype: "hook_event", hook_event_name: "PreToolUse",
      tool_name: "Edit", output: "intent/ is the only path this run may write.\nsecond line",
    }))).toEqual(["hook PreToolUse Edit  intent/ is the only path this run may write."]);
  });

  test("puts no raw JSON on the screen when the shape is unknown", () => {
    expect(renderStreamLine(JSON.stringify({ type: "something_new", payload: { a: 1 } }))).toEqual([]);
    expect(renderStreamLine("not json at all")).toEqual([]);
    expect(renderStreamLine(JSON.stringify({ type: "result", subtype: "success", is_error: false })))
      .toEqual([]);
  });
});
