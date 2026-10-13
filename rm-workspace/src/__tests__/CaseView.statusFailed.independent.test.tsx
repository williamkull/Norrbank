import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { CaseView } from "../onboarding/CaseView";
import type { CaseSummary } from "../onboarding/api";

const CASE_ID = "ONB-2026-000831";

const summary: CaseSummary = {
  caseId: CASE_ID,
  orgNo: "5561234567",
  legalName: "Vindskydd Konsult AB",
  lifecycleStatus: "SCREENING",
  openedAt: "2026-08-03T07:00:00Z",
  updatedAt: "2026-08-20T07:00:00Z",
  documentsOutstanding: 7,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CaseView, status request rejected (independent)", () => {
  it("shows the failure only in the Status panel and keeps the rest", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => {
      throw new TypeError("network down");
    });
    vi.stubGlobal("fetch", fetcher);

    const { container } = render(<CaseView onboardingCase={summary} />);
    await screen.findByRole("button", { name: "Try again" });
    await act(async () => {
      await new Promise((done) => setTimeout(done, 0));
    });

    const panels = Array.from(container.querySelectorAll("section")).map(
      (s) => s.querySelector("h2")?.textContent,
    );
    expect(panels).toEqual(["Status", "Case", "Contacts"]);

    const status = container.querySelectorAll("section")[0];
    expect(within(status as HTMLElement).getByText("Status is unavailable right now.")).toBeDefined();
    expect(status.querySelectorAll("button").length).toBe(1);
    expect(status.textContent).not.toMatch(/Loading|Stage|Next step|Expected|network|TypeError|\/v2/);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Vindskydd Konsult AB");
    expect(container.textContent).toContain("ONB-2026-000831");
    expect(container.textContent).toContain("556123-4567");
    expect(container.textContent).toContain("2026-08-03");
    expect(container.textContent).toContain("2026-08-20");
    expect(screen.getByText("7")).toBeDefined();
    expect(screen.getByText("Client contacts are maintained in the CRM record.")).toBeDefined();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0][0])).toBe(`/v2/cases/${CASE_ID}/status`);
  });
});
