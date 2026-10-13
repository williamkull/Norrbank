import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "../App";
import type { CaseStatus, CaseSummary } from "../onboarding/api";

/**
 * What the workspace does today with a case list that has loaded, and must keep doing once
 * App holds an explicit loading / failed / loaded state (ONB-2382). Nothing here is about
 * what shows before the answer or after a failure.
 *
 * StatusPanel keeps module-level `held` and `inFlight` maps for the whole file, so every
 * test uses its own case ids.
 */

const NO_CASES = "No open onboarding cases.";
const SELECT_A_CASE = "Select a case.";

function summary(caseId: string, legalName: string): CaseSummary {
  return {
    caseId,
    orgNo: "5560001234",
    legalName,
    lifecycleStatus: "OPEN",
    openedAt: "2026-09-01T08:00:00Z",
    updatedAt: "2026-09-10T08:00:00Z",
    documentsOutstanding: 2,
  };
}

function statusFor(caseId: string): CaseStatus {
  return {
    caseId,
    stage: "AWAITING_REGISTRY_EVIDENCE",
    procedureStageCode: "EDD-PENDING",
    nextStep: "AWAITING_REGISTRY_EVIDENCE",
    expectedDate: "2026-09-24",
    expectedDateSource: "registry-evidence",
  };
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/** Answers /v2/cases with `cases` and /v2/cases/{id}/status for any id. */
function stubService(cases: CaseSummary[]): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    if (path === "/v2/cases") {
      return json(cases);
    }
    const status = /^\/v2\/cases\/([^/]+)\/status$/.exec(path);
    if (status) {
      return json(statusFor(status[1]));
    }
    return new Response("", { status: 404 });
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

function rows(container: HTMLElement): HTMLTableRowElement[] {
  return Array.from(container.querySelectorAll<HTMLTableRowElement>("tbody tr"));
}

function detailHeading(): string | null {
  return screen.queryByRole("heading", { level: 1 })?.textContent ?? null;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App with a loaded case list", () => {
  it("renders a row for each case, in the order given", async () => {
    stubService([
      summary("PIN-A-3", "Cedar Freight AB"),
      summary("PIN-A-1", "Alder Marine AB"),
      summary("PIN-A-2", "Birch Capital AB"),
    ]);

    const { container } = render(<App />);
    await waitFor(() => expect(rows(container)).toHaveLength(3));

    const ids = rows(container).map((row) => row.querySelector("td")?.textContent);
    expect(ids).toEqual(["PIN-A-3", "PIN-A-1", "PIN-A-2"]);
    expect(rows(container)[0].textContent).toContain("Cedar Freight AB");
  });

  it("selects the first case without a click and opens its detail", async () => {
    stubService([summary("PIN-B-1", "Dune Logistics AB"), summary("PIN-B-2", "Elm Holdings AB")]);

    const { container } = render(<App />);
    await waitFor(() => expect(rows(container)).toHaveLength(2));

    await waitFor(() => expect(detailHeading()).toBe("Dune Logistics AB"));
    expect(rows(container)[0].className).toBe("selected");
    expect(rows(container)[1].className).toBe("");
    expect(screen.queryByText(SELECT_A_CASE)).toBeNull();
  });

  it("selects a clicked row and replaces the first case's detail", async () => {
    stubService([summary("PIN-C-1", "Fir Shipping AB"), summary("PIN-C-2", "Gorse Trading AB")]);

    const { container } = render(<App />);
    await waitFor(() => expect(detailHeading()).toBe("Fir Shipping AB"));

    fireEvent.click(rows(container)[1]);

    await waitFor(() => expect(detailHeading()).toBe("Gorse Trading AB"));
    expect(rows(container)[1].className).toBe("selected");
    expect(rows(container)[0].className).toBe("");
    expect(screen.queryByText("Fir Shipping AB", { selector: "h1" })).toBeNull();
  });

  it("does not say there are no open cases", async () => {
    stubService([summary("PIN-D-1", "Hazel Energy AB")]);

    const { container } = render(<App />);
    await waitFor(() => expect(rows(container)).toHaveLength(1));
    await waitFor(() => expect(detailHeading()).toBe("Hazel Energy AB"));

    expect(screen.queryByText(NO_CASES)).toBeNull();
  });
});

describe("App when /v2/cases answers with an empty list", () => {
  it("says there are no open cases and asks to select a case", async () => {
    const fetcher = stubService([]);

    const { container } = render(<App />);

    await waitFor(() => expect(screen.getByText(NO_CASES)).toBeTruthy());
    expect(screen.getByText(SELECT_A_CASE)).toBeTruthy();
    expect(rows(container)).toHaveLength(0);
    expect(fetcher).toHaveBeenCalledWith("/v2/cases", expect.anything());
  });
});
