import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CaseList } from "../onboarding/CaseList";
import type { CaseSummary } from "../onboarding/api";

const cases: CaseSummary[] = [
  {
    caseId: "ONB-2026-000501",
    orgNo: "5560112233",
    legalName: "Vasa Logistik AB",
    lifecycleStatus: "DOCS_RECEIVED",
    openedAt: "2026-08-03T09:12:00Z",
    updatedAt: "2026-08-20T11:04:00Z",
    documentsOutstanding: 1,
  },
];

describe("CaseList", () => {
  it("renders a row per case", () => {
    render(<CaseList cases={cases} selectedCaseId={null} onSelect={vi.fn()} />);
    expect(screen.getByText("Vasa Logistik AB")).toBeDefined();
    expect(screen.getByText("556011-2233")).toBeDefined();
    expect(screen.getByText("In progress")).toBeDefined();
  });

  it("says so when there is nothing open", () => {
    render(<CaseList cases={[]} selectedCaseId={null} onSelect={vi.fn()} />);
    expect(screen.getByText("No open onboarding cases.")).toBeDefined();
  });
});
