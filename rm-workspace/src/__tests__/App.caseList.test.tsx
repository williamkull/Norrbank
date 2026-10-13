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
