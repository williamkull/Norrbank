import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StatusPanel } from "../onboarding/StatusPanel";
import { nextStepLabel, stageLabel } from "../shared/formatting";
import type { CaseStatus } from "../onboarding/api";

/**
 * The stage and next-step codes the service can emit. Mirrors CaseStageValue and the
 * next steps CaseStatusDto derives; a code the workspace has no wording for would reach an
 * RM as "Status not available", which is safe and useless, so it fails here first.
 */
const STAGES = [
  "DOCUMENTS_OUTSTANDING",
  "SCREENING_IN_PROGRESS",
  "AWAITING_REGISTRY_EVIDENCE",
  "UNDER_ANALYST_REVIEW",
  "ON_HOLD",
  "READY_FOR_DECISION",
];

const NEXT_STEPS = [
  "AWAITING_DOCUMENTS",
  "AWAITING_SCREENING",
  "AWAITING_REGISTRY_EVIDENCE",
  "AWAITING_ANALYST_DECISION",
  "AWAITING_COMPLIANCE_CLEARANCE",
  "AWAITING_APPROVAL",
];

function statusFor(caseId: string, overrides: Partial<CaseStatus> = {}): CaseStatus {
  return {
    caseId,
    stage: "AWAITING_REGISTRY_EVIDENCE",
    procedureStageCode: "EDD-PENDING",
    nextStep: "AWAITING_REGISTRY_EVIDENCE",
    expectedDate: "2026-09-24",
    expectedDateSource: "registry-evidence",
    ...overrides,
  };
}

function respondWith(status: CaseStatus | null): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async () =>
    status
      ? new Response(JSON.stringify(status), { status: 200, headers: { "content-type": "application/json" } })
      : new Response("", { status: 500 }),
  );
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

function ok(status: CaseStatus): Response {
  return new Response(JSON.stringify(status), { status: 200, headers: { "content-type": "application/json" } });
}

function failed(): Response {
  return new Response("", { status: 500 });
}

/** The first call answers 500, every later call answers 200 with the status. */
function failOnceThenRespondWith(status: CaseStatus): ReturnType<typeof vi.fn> {
  let calls = 0;
  const fetcher = vi.fn(async () => (++calls === 1 ? failed() : ok(status)));
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

/**
 * Routes on the /v2/cases/{id}/status URL. A handler gets the number of the call for its case
 * (1 for the first), so a test can answer one case differently from another, and differently
 * the second time it is asked.
 */
function routeByCase(
  routes: Record<string, (call: number) => Response | Promise<Response>>,
): ReturnType<typeof vi.fn> {
  const calls = new Map<string, number>();
  const fetcher = vi.fn(async (url: unknown) => {
    const caseId = /\/v2\/cases\/([^/]+)\/status/.exec(String(url))?.[1] ?? "";
    const call = (calls.get(caseId) ?? 0) + 1;
    calls.set(caseId, call);
    const route = routes[caseId];
    if (!route) throw new Error(`no route for ${caseId}`);
    return route(call);
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

/** A response the test answers when it chooses, to hold a request in the air. */
function deferredResponse(): {
  response: Promise<Response>;
  resolve: (status: CaseStatus) => void;
  reject: () => void;
} {
  let answer: (response: Response) => void = () => undefined;
  const response = new Promise<Response>((done) => {
    answer = done;
  });
  return { response, resolve: (status) => answer(ok(status)), reject: () => answer(failed()) };
}

function requestedUrls(fetcher: ReturnType<typeof vi.fn>): string[] {
  return fetcher.mock.calls.map((call) => String(call[0]));
}

/** Lets answers already given reach the panel, so an absence can be asserted after them. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((done) => setTimeout(done, 0));
  });
}

const UNAVAILABLE = "Status is unavailable right now.";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StatusPanel", () => {
  it("shows plain wording with the procedure code beside it", async () => {
    respondWith(statusFor("ONB-2026-000801"));

    render(<StatusPanel caseId="ONB-2026-000801" />);

    expect(await screen.findByText("We are verifying the owners")).toBeDefined();
    expect(screen.getByText("EDD-PENDING")).toBeDefined();
    expect(screen.getByText("Company registry confirms the ownership")).toBeDefined();
  });

  it("renders the expected date", async () => {
    respondWith(statusFor("ONB-2026-000802"));

    render(<StatusPanel caseId="ONB-2026-000802" />);

    expect(await screen.findByText("2026-09-24")).toBeDefined();
  });

  it("says the date is not yet known rather than showing nothing", async () => {
    respondWith(statusFor("ONB-2026-000803", { expectedDate: null, expectedDateSource: null }));

    render(<StatusPanel caseId="ONB-2026-000803" />);

    expect(await screen.findByText("Not yet known")).toBeDefined();
  });

  it("keeps a failed status inside the panel", async () => {
    respondWith(null);

    render(<StatusPanel caseId="ONB-2026-000804" />);

    expect(await screen.findByText("Status is unavailable right now.")).toBeDefined();
  });

  it("does not fetch a case it has already loaded", async () => {
    const fetcher = respondWith(statusFor("ONB-2026-000805"));

    const first = render(<StatusPanel caseId="ONB-2026-000805" />);
    await screen.findByText("We are verifying the owners");
    first.unmount();
    render(<StatusPanel caseId="ONB-2026-000805" />);
    await screen.findByText("We are verifying the owners");

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  });

  it("shows the message and a Try again button when the status failed to load", async () => {
    respondWith(null);

    render(<StatusPanel caseId="ONB-2026-000806" />);

    expect(await screen.findByText(UNAVAILABLE)).toBeDefined();
    expect(screen.getByRole("button", { name: "Try again" })).toBeDefined();
  });

  it("shows Loading. and makes exactly one more request when Try again is pressed", async () => {
    const id = "ONB-2026-000807";
    const retried = deferredResponse();
    const fetcher = routeByCase({ [id]: (call) => (call === 1 ? failed() : retried.response) });

    render(<StatusPanel caseId={id} />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));

    expect(screen.getByText("Loading.")).toBeDefined();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(requestedUrls(fetcher)).toEqual([`/v2/cases/${id}/status`, `/v2/cases/${id}/status`]);

    retried.resolve(statusFor(id));
    await screen.findByText("We are verifying the owners");
  });

  it("makes no extra request for a second click right after the first", async () => {
    const id = "ONB-2026-000808";
    const retried = deferredResponse();
    const fetcher = routeByCase({ [id]: (call) => (call === 1 ? failed() : retried.response) });

    render(<StatusPanel caseId={id} />);
    const button = await screen.findByRole("button", { name: "Try again" });
    fireEvent.click(button);
    fireEvent.click(button);
    await settle();

    expect(fetcher).toHaveBeenCalledTimes(2);

    retried.resolve(statusFor(id));
    await screen.findByText("We are verifying the owners");
  });

  it("shows stage, code, next step and date, and no button, when the retry succeeds", async () => {
    const id = "ONB-2026-000809";
    const fetcher = failOnceThenRespondWith(statusFor(id));

    render(<StatusPanel caseId={id} />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));

    expect(await screen.findByText("We are verifying the owners")).toBeDefined();
    expect(screen.getByText("EDD-PENDING")).toBeDefined();
    expect(screen.getByText("Company registry confirms the ownership")).toBeDefined();
    expect(screen.getByText("2026-09-24")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("shows the message and the button again when the retry fails, and asks again on a further press", async () => {
    const fetcher = respondWith(null);

    render(<StatusPanel caseId="ONB-2026-000810" />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(screen.getByText("Loading.")).toBeDefined();

    expect(await screen.findByText(UNAVAILABLE)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(await screen.findByText(UNAVAILABLE)).toBeDefined();
  });

  it("shows no button while the first load is in the air", async () => {
    const id = "ONB-2026-000811";
    const first = deferredResponse();
    routeByCase({ [id]: () => first.response });

    render(<StatusPanel caseId={id} />);

    expect(screen.getByText("Loading.")).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();

    first.resolve(statusFor(id));
    await screen.findByText("We are verifying the owners");
  });

  it("shows no button once a status is shown", async () => {
    respondWith(statusFor("ONB-2026-000812"));

    render(<StatusPanel caseId="ONB-2026-000812" />);

    await screen.findByText("We are verifying the owners");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("does not fetch again a case whose status loaded after a retry", async () => {
    const id = "ONB-2026-000813";
    const fetcher = failOnceThenRespondWith(statusFor(id));

    const first = render(<StatusPanel caseId={id} />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await screen.findByText("We are verifying the owners");
    first.unmount();
    render(<StatusPanel caseId={id} />);
    await screen.findByText("We are verifying the owners");

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });

  it("does not hold a failed status: mounting the case again asks again", async () => {
    const fetcher = respondWith(null);

    const first = render(<StatusPanel caseId="ONB-2026-000814" />);
    await screen.findByText(UNAVAILABLE);
    first.unmount();
    render(<StatusPanel caseId="ONB-2026-000814" />);
    await screen.findByText(UNAVAILABLE);

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("shows the new case's own state after a failure in the old one", async () => {
    const [a, b] = ["ONB-2026-000815", "ONB-2026-000816"];
    const second = deferredResponse();
    routeByCase({ [a]: () => failed(), [b]: () => second.response });

    const view = render(<StatusPanel caseId={a} />);
    await screen.findByText(UNAVAILABLE);
    view.rerender(<StatusPanel caseId={b} />);

    expect(screen.getByText("Loading.")).toBeDefined();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();

    second.resolve(statusFor(b, { procedureStageCode: "EDD-B" }));
    expect(await screen.findByText("EDD-B")).toBeDefined();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
  });

  it("requests only the open case when Try again is pressed after switching case", async () => {
    const [a, b] = ["ONB-2026-000817", "ONB-2026-000818"];
    const fetcher = routeByCase({ [a]: () => failed(), [b]: () => failed() });

    const view = render(<StatusPanel caseId={a} />);
    await screen.findByText(UNAVAILABLE);
    view.rerender(<StatusPanel caseId={b} />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));

    expect(requestedUrls(fetcher)).toEqual([
      `/v2/cases/${a}/status`,
      `/v2/cases/${b}/status`,
      `/v2/cases/${b}/status`,
    ]);
    await screen.findByText(UNAVAILABLE);
  });

  it("never shows the old case's answer in the new case when it arrives after a switch", async () => {
    const [a, b] = ["ONB-2026-000819", "ONB-2026-000820"];
    const retriedA = deferredResponse();
    const forB = deferredResponse();
    routeByCase({ [a]: (call) => (call === 1 ? failed() : retriedA.response), [b]: () => forB.response });

    const view = render(<StatusPanel caseId={a} />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    view.rerender(<StatusPanel caseId={b} />);
    retriedA.resolve(statusFor(a, { procedureStageCode: "EDD-A" }));
    await settle();

    expect(screen.queryByText("EDD-A")).toBeNull();
    expect(screen.getByText("Loading.")).toBeDefined();

    forB.resolve(statusFor(b, { procedureStageCode: "EDD-B" }));
    expect(await screen.findByText("EDD-B")).toBeDefined();
    expect(screen.queryByText("EDD-A")).toBeNull();
  });

  it("renders the button as a native button of type button named Try again", async () => {
    respondWith(null);

    render(<StatusPanel caseId="ONB-2026-000821" />);

    const button = await screen.findByRole("button", { name: "Try again" });
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("class")).toBeNull();
  });

  it("makes no request on focus, visibility change or the passing of time", async () => {
    const fetcher = respondWith(null);

    render(<StatusPanel caseId="ONB-2026-000822" />);
    await screen.findByText(UNAVAILABLE);

    vi.useFakeTimers();
    try {
      fireEvent.focus(window);
      fireEvent(document, new Event("visibilitychange"));
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
    } finally {
      vi.useRealTimers();
    }

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(screen.getByText(UNAVAILABLE)).toBeDefined();
  });

  it("has wording for every code the service can emit", () => {
    for (const stage of STAGES) {
      expect(stageLabel(stage)).not.toBe("Status not available");
    }
    for (const nextStep of NEXT_STEPS) {
      expect(nextStepLabel(nextStep)).not.toBe("Status not available");
    }
  });

  it("gives safe wording for a code it does not know", () => {
    expect(stageLabel("SOME_NEW_STAGE")).toBe("Status not available");
    expect(nextStepLabel("SOME_NEW_STEP")).toBe("Status not available");
  });
});
