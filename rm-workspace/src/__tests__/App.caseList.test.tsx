import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { App } from "../App";

const NO_CASES = "No open onboarding cases.";

/** Lets answers already given reach the workspace, so an absence can be asserted after them. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((done) => setTimeout(done, 0));
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App case list when the cases have not loaded", () => {
  it("does not say there are no open cases when /v2/cases answers 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 503 })),
    );

    render(<App />);
    await settle();

    expect(screen.queryByText(NO_CASES)).toBeNull();
  });

  it("shows no path or status code when /v2/cases answers 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 503 })),
    );

    render(<App />);
    await settle();

    expect(screen.queryByText(/\/v2\/cases/)).toBeNull();
    expect(screen.queryByText(/503/)).toBeNull();
  });

  it("does not say there are no open cases while /v2/cases has not answered", async () => {
    const unanswered = new Promise<Response>(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => unanswered),
    );

    render(<App />);
    await settle();

    expect(screen.queryByText(NO_CASES)).toBeNull();
  });
});

const UNAVAILABLE = "Cases are unavailable right now.";
const SELECT_A_CASE = "Select a case.";

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/** Answers /v2/cases with `cases` and /v2/cases/{id}/status for any id. */
function stubService(cases: unknown[]): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path === "/v2/cases") {
        return json(cases);
      }
      const status = /^\/v2\/cases\/([^/]+)\/status$/.exec(path);
      if (status) {
        return json({
          caseId: status[1],
          stage: "AWAITING_REGISTRY_EVIDENCE",
          procedureStageCode: "EDD-PENDING",
          nextStep: "AWAITING_REGISTRY_EVIDENCE",
          expectedDate: "2026-09-24",
          expectedDateSource: "registry-evidence",
        });
      }
      return new Response("", { status: 404 });
    }),
  );
}

describe("App case list states", () => {
  it("shows only Loading. while /v2/cases has not answered", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>(() => undefined)),
    );

    const { container } = render(<App />);
    await settle();

    expect(screen.getByText("Loading.")).toBeDefined();
    expect(screen.queryByText(NO_CASES)).toBeNull();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
    expect(container.querySelector("table")).toBeNull();
    expect(screen.queryByText(SELECT_A_CASE)).toBeNull();
  });

  it("says the cases are unavailable when /v2/cases answers 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 503 })),
    );

    render(<App />);
    await settle();

    expect(screen.getByText(UNAVAILABLE)).toBeDefined();
    expect(screen.queryByText("Loading.")).toBeNull();
    expect(screen.queryByText(SELECT_A_CASE)).toBeNull();
  });

  it("says the cases are unavailable when the request fails, without the technical message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    render(<App />);
    await settle();

    expect(screen.getByText(UNAVAILABLE)).toBeDefined();
    expect(screen.queryByText(/Failed to fetch/)).toBeNull();
    expect(screen.queryByText(SELECT_A_CASE)).toBeNull();
  });

  it("says there are no open cases only when the answer is an empty list", async () => {
    stubService([]);

    render(<App />);
    await settle();

    expect(screen.getByText(NO_CASES)).toBeDefined();
    expect(screen.queryByText("Loading.")).toBeNull();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
  });

  it("selects the loaded case and opens its detail", async () => {
    stubService([
      {
        caseId: "ONB-2026-000901",
        orgNo: "5560001234",
        legalName: "Juniper Bulk AB",
        lifecycleStatus: "OPEN",
        openedAt: "2026-09-01T08:00:00Z",
        updatedAt: "2026-09-10T08:00:00Z",
        documentsOutstanding: 1,
      },
    ]);

    const { container } = render(<App />);
    await settle();

    expect(screen.queryByText("Loading.")).toBeNull();
    const row = container.querySelector("tbody tr");
    expect(row?.className).toBe("selected");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Juniper Bulk AB");
    expect(screen.queryByText(SELECT_A_CASE)).toBeNull();
  });
});

interface Deferred {
  resolve: (response: Response) => void;
}

/**
 * Stubs fetch so each /v2/cases call waits for the test to answer it, in call order.
 * /v2/cases/{id}/status is answered at once, as stubService does.
 */
function stubDeferredCases(): Deferred[] {
  const calls: Deferred[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const path = String(input);
      if (path === "/v2/cases") {
        return new Promise<Response>((resolve) => {
          calls.push({ resolve });
        });
      }
      const status = /^\/v2\/cases\/([^/]+)\/status$/.exec(path);
      if (status) {
        return Promise.resolve(
          json({
            caseId: status[1],
            stage: "AWAITING_REGISTRY_EVIDENCE",
            procedureStageCode: "EDD-PENDING",
            nextStep: "AWAITING_REGISTRY_EVIDENCE",
            expectedDate: "2026-09-24",
            expectedDateSource: "registry-evidence",
          }),
        );
      }
      return Promise.resolve(new Response("", { status: 404 }));
    }),
  );
  return calls;
}

function oneCase(caseId: string, legalName: string): unknown[] {
  return [
    {
      caseId,
      orgNo: "5560001234",
      legalName,
      lifecycleStatus: "OPEN",
      openedAt: "2026-09-01T08:00:00Z",
      updatedAt: "2026-09-10T08:00:00Z",
      documentsOutstanding: 1,
    },
  ];
}

async function answer(call: Deferred | undefined, response: Response): Promise<void> {
  await act(async () => {
    call?.resolve(response);
    await new Promise((done) => setTimeout(done, 0));
  });
}

describe("App case list under React.StrictMode", () => {
  it("asks for the cases twice, so these tests exercise a stale effect", async () => {
    const calls = stubDeferredCases();

    render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    await settle();

    expect(calls.length).toBe(2);
  });

  it.each([
    ["the stale 200 answers after the current 503", "current-first"],
    ["the stale 200 answers before the current 503", "stale-first"],
  ])("stays unavailable when %s", async (_name, order) => {
    const calls = stubDeferredCases();

    const { container } = render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    await settle();
    const [stale, current] = calls;

    const staleAnswer = (): Promise<void> =>
      answer(stale, json(oneCase("ONB-2026-000951", "Stale Answer AB")));
    const currentAnswer = (): Promise<void> => answer(current, new Response("", { status: 503 }));

    if (order === "current-first") {
      await currentAnswer();
      await staleAnswer();
    } else {
      await staleAnswer();
      await currentAnswer();
    }

    expect(screen.getByText(UNAVAILABLE)).toBeDefined();
    expect(container.querySelector("table")).toBeNull();
    expect(screen.queryByText("Stale Answer AB")).toBeNull();
    expect(screen.queryByText("Loading.")).toBeNull();
    expect(screen.queryByText(SELECT_A_CASE)).toBeNull();
  });

  it.each([
    ["the stale 503 answers after the current 200", "current-first"],
    ["the stale 503 answers before the current 200", "stale-first"],
  ])("keeps the loaded cases when %s", async (_name, order) => {
    const calls = stubDeferredCases();

    const { container } = render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    await settle();
    const [stale, current] = calls;

    const staleAnswer = (): Promise<void> => answer(stale, new Response("", { status: 503 }));
    const currentAnswer = (): Promise<void> =>
      answer(current, json(oneCase("ONB-2026-000952", "Current Answer AB")));

    if (order === "current-first") {
      await currentAnswer();
      await staleAnswer();
    } else {
      await staleAnswer();
      await currentAnswer();
    }

    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
    expect(container.querySelector("tbody tr")?.className).toBe("selected");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Current Answer AB");
    expect(screen.queryByText("Loading.")).toBeNull();
  });

  it("does not open a case from a stale answer when the current answer is a different list", async () => {
    const calls = stubDeferredCases();

    const { container } = render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    await settle();
    const [stale, current] = calls;

    await answer(current, json(oneCase("ONB-2026-000953", "Current List AB")));
    await answer(stale, json(oneCase("ONB-2026-000954", "Stale List AB")));

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Current List AB");
    expect(screen.queryByText("Stale List AB")).toBeNull();
    expect(container.querySelectorAll("tbody tr").length).toBe(1);
  });
});
