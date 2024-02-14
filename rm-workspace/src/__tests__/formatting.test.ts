import { describe, expect, it } from "vitest";
import { formatDate, formatOrgNo, lifecycleLabel } from "../shared/formatting";

describe("formatting", () => {
  it("renders an ISO instant as a Swedish date in UTC", () => {
    expect(formatDate("2026-08-03T09:12:00Z")).toBe("2026-08-03");
  });

  it("hyphenates a ten-digit organisation number", () => {
    expect(formatOrgNo("5566778899")).toBe("556677-8899");
  });

  it("leaves an organisation number of another length alone", () => {
    expect(formatOrgNo("55667788")).toBe("55667788");
  });

  it("labels every lifecycle status the service can return", () => {
    expect(lifecycleLabel("DOCS_RECEIVED")).toBe("In progress");
    expect(lifecycleLabel("APPROVED")).toBe("Onboarded");
  });

  it("falls back to the raw status when it does not know one", () => {
    expect(lifecycleLabel("EDD_PENDING")).toBe("EDD_PENDING");
  });
});
