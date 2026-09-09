import { expect, test } from "@playwright/test";

/**
 * The status panel in a browser.
 *
 * The gateway is what puts onboarding-core on this origin in a deployed environment, and
 * there is no gateway in front of the dev server, so the two v2 routes are answered at the
 * network boundary. Everything above that boundary is the real bundle: the real React, the
 * real formatting, the real cache.
 */
const CASES = [
  {
    caseId: "ONB-2026-004112",
    orgNo: "5566778899",
    legalName: "Bergslagen Industri AB",
    lifecycleStatus: "DOCS_RECEIVED",
    openedAt: "2026-07-02T09:40:00Z",
    updatedAt: "2026-07-18T10:15:00Z",
    documentsOutstanding: 1,
  },
  {
    caseId: "ONB-2026-004133",
    orgNo: "5564556677",
    legalName: "Malmö Fastighets AB",
    lifecycleStatus: "DOCS_RECEIVED",
    openedAt: "2026-07-21T10:00:00Z",
    updatedAt: "2026-08-06T08:55:00Z",
    documentsOutstanding: 2,
  },
];

const STATUSES: Record<string, unknown> = {
  "ONB-2026-004112": {
    caseId: "ONB-2026-004112",
    stage: "AWAITING_REGISTRY_EVIDENCE",
    procedureStageCode: "EDD-PENDING",
    nextStep: "AWAITING_REGISTRY_EVIDENCE",
    expectedDate: "2026-09-24",
    expectedDateSource: "registry-evidence",
  },
  "ONB-2026-004133": {
    caseId: "ONB-2026-004133",
    stage: "READY_FOR_DECISION",
    procedureStageCode: "EDD-COMPLETE",
    nextStep: "AWAITING_APPROVAL",
    expectedDate: null,
    expectedDateSource: null,
  },
};

test.beforeEach(async ({ page }) => {
  await page.route("**/v2/cases", (route) => route.fulfill({ json: CASES }));
  await page.route("**/v2/cases/*/status", (route) => {
    const caseId = new URL(route.request().url()).pathname.split("/")[3]!;
    route.fulfill({ json: STATUSES[caseId] as object });
  });
});

test("shows the stage in plain wording with the procedure code beneath it", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("We are verifying the owners")).toBeVisible();
  await expect(page.getByText("EDD-PENDING")).toBeVisible();
  await expect(page.getByText("Company registry confirms the ownership")).toBeVisible();
  await expect(page.getByText("2026-09-24")).toBeVisible();
});

test("says when no date is known rather than showing an empty field", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Malmö Fastighets AB").click();

  await expect(page.getByText("Ready for decision")).toBeVisible();
  await expect(page.getByText("Not yet known")).toBeVisible();
});

test("fetches a status once and not again when the case is reselected", async ({ page }) => {
  const asked: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/status")) asked.push(request.url());
  });

  await page.goto("/");
  await expect(page.getByText("We are verifying the owners")).toBeVisible();
  await page.getByText("Malmö Fastighets AB").click();
  await expect(page.getByText("Ready for decision")).toBeVisible();
  await page.getByText("Bergslagen Industri AB").click();
  await expect(page.getByText("We are verifying the owners")).toBeVisible();

  expect(asked.filter((url) => url.includes("004112"))).toHaveLength(1);
});

test("keeps a failed status inside its own panel", async ({ page }) => {
  await page.route("**/v2/cases/*/status", (route) => route.fulfill({ status: 500, body: "" }));

  await page.goto("/");

  await expect(page.getByText("Status is unavailable right now.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bergslagen Industri AB" })).toBeVisible();
});
