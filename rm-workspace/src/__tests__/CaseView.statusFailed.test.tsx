import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { CaseView } from "../onboarding/CaseView";
import { lifecycleLabel } from "../shared/formatting";
import type { CaseSummary } from "../onboarding/api";

const CASE_ID = "ONB-2026-000830";

const summary: CaseSummary = {
  caseId: CASE_ID,
  orgNo: "5569990123",
  legalName: "Tallbacken Marin AB",
  lifecycleStatus: "DOCS_RECEIVED",
  openedAt: "2026-09-01T08:00:00Z",
  updatedAt: "2026-09-10T08:00:00Z",
  documentsOutstanding: 3,
};

const UNAVAILABLE = "Status is unavailable right now.";

/** Lets answers already given reach the panel, so an absence can be asserted after them. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((done) => setTimeout(done, 0));
  });
}

/** The section around an element. A missing section fails the test here, not by an early return. */
function sectionOf(element: Element | null, name: string): HTMLElement {
  const section = element?.closest("section");
  if (!section) throw new Error(`No ${name} panel found`);
  return section;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CaseView", () => {
  it("keeps the rest of the case view when the status fails to load", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith("/status")
        ? new Response("", { status: 500 })
        : new Response(JSON.stringify(summary), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
    );
    vi.stubGlobal("fetch", fetcher);

    render(<CaseView onboardingCase={summary} />);
    const button = await screen.findByRole("button", { name: "Try again" });
    await settle();

    // B1: the failure is inside the Status panel
    expect(button.getAttribute("type")).toBe("button");
    const statusPanel = sectionOf(button, "Status");
    expect(within(statusPanel).getByRole("heading", { level: 2 }).textContent).toBe("Status");
    expect(within(statusPanel).getByText(UNAVAILABLE)).toBeDefined();

    // B2: nothing else is in the panel
    expect(statusPanel.textContent).toBe("Status" + UNAVAILABLE + "Try again");
    expect(within(statusPanel).queryByText("Loading.")).toBeNull();
    expect(within(statusPanel).queryByText(/^(Stage|Next step|Expected date)$/)).toBeNull();
    expect(statusPanel.querySelector("dl, .procedure-code")).toBeNull();
    expect(statusPanel.textContent).not.toMatch(/500|responded|\/v2|status\//i);

    // B3: the rest of the case view stays
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Tallbacken Marin AB");
    expect(screen.getByText("ONB-2026-000830 · 556999-0123")).toBeDefined();
    const casePanel = sectionOf(screen.getByRole("heading", { level: 2, name: "Case" }), "Case");
    expect(within(casePanel).getByText(lifecycleLabel(summary.lifecycleStatus))).toBeDefined();
    expect(within(casePanel).getByText("2026-09-01")).toBeDefined();
    expect(within(casePanel).getByText("2026-09-10")).toBeDefined();
    expect(within(casePanel).getByText("3")).toBeDefined();
    const contactsPanel = screen.getByRole("heading", { level: 2, name: "Contacts" }).closest("section");
    expect(contactsPanel).not.toBeNull();
    expect(contactsPanel?.querySelector("p")?.textContent?.trim()).toBeTruthy();

    // B4: one request, to the status path of this case
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0][0])).toBe(`/v2/cases/${CASE_ID}/status`);
  });
});
