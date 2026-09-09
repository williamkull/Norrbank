const DATE = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});

export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
}

/** A calendar date from the service — no time, no zone, and none to be invented here. */
export function formatIsoDate(isoDate: string): string {
  return DATE.format(new Date(`${isoDate}T00:00:00Z`));
}

const LIFECYCLE_LABELS: Record<string, string> = {
  INITIATED: "Opened",
  DOCS_REQUESTED: "Awaiting documents",
  DOCS_RECEIVED: "In progress",
  APPROVED: "Onboarded",
  REJECTED: "Declined",
  WITHDRAWN: "Withdrawn",
};

export function lifecycleLabel(status: string): string {
  return LIFECYCLE_LABELS[status] ?? status;
}

/**
 * Stage and next step, in plain wording. The KYC procedure code travels beside the stage
 * rather than instead of it; both are required, by policies that disagree.
 *
 * A code with no wording yields safe wording, never the raw code — an RM surface is not the
 * place to find out that the service learned a new stage.
 */
const STAGE_LABELS: Record<string, string> = {
  DOCUMENTS_OUTSTANDING: "Waiting for documents",
  SCREENING_IN_PROGRESS: "Screening in progress",
  AWAITING_REGISTRY_EVIDENCE: "We are verifying the owners",
  UNDER_ANALYST_REVIEW: "Under analyst review",
  ON_HOLD: "On hold with compliance",
  READY_FOR_DECISION: "Ready for decision",
};

const NEXT_STEP_LABELS: Record<string, string> = {
  AWAITING_DOCUMENTS: "Client returns the outstanding documents",
  AWAITING_SCREENING: "Overnight screening",
  AWAITING_REGISTRY_EVIDENCE: "Company registry confirms the ownership",
  AWAITING_ANALYST_DECISION: "Analyst decides on the match",
  AWAITING_COMPLIANCE_CLEARANCE: "Compliance clears the case",
  AWAITING_APPROVAL: "Four-eyes approval",
};

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? "Status not available";
}

export function nextStepLabel(nextStep: string): string {
  return NEXT_STEP_LABELS[nextStep] ?? "Status not available";
}

export function formatOrgNo(orgNo: string): string {
  return orgNo.length === 10 ? `${orgNo.slice(0, 6)}-${orgNo.slice(6)}` : orgNo;
}
