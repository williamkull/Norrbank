const DATE = new Intl.DateTimeFormat("sv-SE", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});

export function formatDate(iso: string): string {
  return DATE.format(new Date(iso));
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

export function formatOrgNo(orgNo: string): string {
  return orgNo.length === 10 ? `${orgNo.slice(0, 6)}-${orgNo.slice(6)}` : orgNo;
}
