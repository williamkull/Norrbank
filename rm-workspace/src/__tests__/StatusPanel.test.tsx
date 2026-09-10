import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
