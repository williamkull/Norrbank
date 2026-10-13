import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { App } from "../App";
import type { CaseStatus, CaseSummary } from "../onboarding/api";

const LOADING = "Loading.";
const UNAVAILABLE = "Cases are unavailable right now.";
const EMPTY = "No open onboarding cases.";
const SELECT = "Select a case.";
const LEAK = /\/v2|responded|\b(401|404|500|503)\b|Failed to fetch|SyntaxError|Unexpected token|JSON/i;

let seq = 0;
const nextPrefix = () => `IND${++seq}`;

function summary(caseId: string, legalName: string): CaseSummary {
  return {
    caseId,
    orgNo: "5560001234",
    legalName,
    lifecycleStatus: "IN_PROGRESS",
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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

interface Pending {
  resolve: (r: Response) => void;
  reject: (e: unknown) => void;
}

/** /v2/cases is answered by `casesAnswer`; status calls are answered at once. */
function stubFetch(casesAnswer: () => Promise<Response>) {
  const fetcher = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url === "/v2/cases") return casesAnswer();
    const m = /^\/v2\/cases\/([^/]+)\/status$/.exec(url);
    if (m) return Promise.resolve(json(statusFor(m[1] ?? "")));
    return Promise.resolve(new Response("", { status: 404 }));
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

function slowCases() {
  const pending: Pending = { resolve: () => undefined, reject: () => undefined };
  const fetcher = stubFetch(
    () =>
      new Promise<Response>((resolve, reject) => {
        pending.resolve = resolve;
        pending.reject = reject;
      }),
  );
  return { pending, fetcher };
}

const caseCalls = (f: ReturnType<typeof vi.fn>) =>
  f.mock.calls.filter((c) => String(c[0]) === "/v2/cases").length;

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 30)); });

function expectNeverTogether() {
  const shown = [LOADING, UNAVAILABLE, EMPTY].filter((t) => screen.queryAllByText(t).length > 0);
  expect(shown.length).toBeLessThanOrEqual(1);
}

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("1. loading", () => {
  it("says Loading. and nothing else while the cases are pending", async () => {
    slowCases();
    render(<App />);
    expect(screen.getByText(LOADING)).toBeTruthy();
    expect(screen.getAllByText(LOADING)).toHaveLength(1);
    expect(screen.queryByText(EMPTY)).toBeNull();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
    expect(screen.queryByText(SELECT)).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    await flush();
    expect(screen.getAllByText(LOADING)).toHaveLength(1);
    expect(screen.queryByText(EMPTY)).toBeNull();
  });

  it("never shows the empty sentence on the first render", () => {
    slowCases();
    const { container } = render(<App />);
    expect(container.textContent).not.toContain(EMPTY);
  });

  it("replaces Loading. with the list when a slow answer arrives", async () => {
    const p = nextPrefix();
    const { pending } = slowCases();
    render(<App />);
    expect(screen.getByText(LOADING)).toBeTruthy();
    await act(async () => {
      pending.resolve(json([summary(`${p}-A`, `${p} Alfa AB`)]));
    });
    await screen.findByText(`${p} Alfa AB`, { selector: "td" });
    await waitFor(() => expect(screen.queryByText(LOADING)).toBeNull());
    expect(screen.queryByText(EMPTY)).toBeNull();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
  });

  it("goes from Loading. to the unavailable sentence when a slow answer fails", async () => {
    const { pending } = slowCases();
    render(<App />);
    expect(screen.getByText(LOADING)).toBeTruthy();
    await act(async () => {
      pending.resolve(new Response("", { status: 503 }));
    });
    await screen.findByText(UNAVAILABLE);
    expect(screen.queryByText(LOADING)).toBeNull();
    expect(screen.queryByText(EMPTY)).toBeNull();
  });

  it("goes from Loading. to the unavailable sentence when a slow fetch rejects", async () => {
    const { pending } = slowCases();
    render(<App />);
    await act(async () => {
      pending.reject(new TypeError("Failed to fetch"));
    });
    await screen.findByText(UNAVAILABLE);
    expect(screen.queryByText(LOADING)).toBeNull();
  });

  it("goes from Loading. to the empty sentence when a slow answer is an empty list", async () => {
    const { pending } = slowCases();
    render(<App />);
    expect(screen.queryByText(EMPTY)).toBeNull();
    await act(async () => {
      pending.resolve(json([]));
    });
    await screen.findByText(EMPTY);
    expect(screen.queryByText(LOADING)).toBeNull();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
  });
});

describe("2. failure", () => {
  const statuses = [503, 500, 404, 401];
  for (const code of statuses) {
    it(`shows the plain unavailable sentence on HTTP ${code}`, async () => {
      stubFetch(() => Promise.resolve(new Response("", { status: code })));
      const { container } = render(<App />);
      await screen.findByText(UNAVAILABLE);
      expect(screen.getAllByText(UNAVAILABLE)).toHaveLength(1);
      expect(screen.queryByText(EMPTY)).toBeNull();
      expect(screen.queryByText(LOADING)).toBeNull();
      expect(container.textContent).not.toMatch(LEAK);
      expectNeverTogether();
    });
  }

  it("shows the plain unavailable sentence when fetch rejects", async () => {
    stubFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    const { container } = render(<App />);
    await screen.findByText(UNAVAILABLE);
    expect(screen.queryByText(EMPTY)).toBeNull();
    expect(screen.queryByText(LOADING)).toBeNull();
    expect(container.textContent).not.toMatch(LEAK);
  });

  it("shows the plain unavailable sentence on a 200 that is not valid JSON", async () => {
    stubFetch(() => Promise.resolve(new Response("<html>not json</html>", { status: 200 })));
    const { container } = render(<App />);
    await screen.findByText(UNAVAILABLE);
    expect(screen.queryByText(EMPTY)).toBeNull();
    expect(screen.queryByText(LOADING)).toBeNull();
    expect(container.textContent).not.toMatch(LEAK);
  });

  it("shows nothing in the right pane after a failure", async () => {
    stubFetch(() => Promise.resolve(new Response("", { status: 503 })));
    render(<App />);
    await screen.findByText(UNAVAILABLE);
    await flush();
    expect(screen.queryByText(SELECT)).toBeNull();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.queryByText("Status")).toBeNull();
  });

  it("asks for the cases once and does not retry after a failure", async () => {
    const fetcher = stubFetch(() => Promise.resolve(new Response("", { status: 503 })));
    render(<App />);
    await screen.findByText(UNAVAILABLE);
    await flush();
    await flush();
    expect(caseCalls(fetcher)).toBe(1);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("3. empty", () => {
  it("shows the empty sentence only for an answered empty list", async () => {
    const fetcher = stubFetch(() => Promise.resolve(json([])));
    render(<App />);
    await screen.findByText(EMPTY);
    expect(screen.getAllByText(EMPTY)).toHaveLength(1);
    expect(screen.queryByText(LOADING)).toBeNull();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
    expect(caseCalls(fetcher)).toBe(1);
  });

  it("shows Select a case. in the right pane once an empty list has loaded", async () => {
    stubFetch(() => Promise.resolve(json([])));
    render(<App />);
    await screen.findByText(EMPTY);
    expect(screen.getByText(SELECT)).toBeTruthy();
  });

  it("never shows the empty sentence for a non-empty list", async () => {
    const p = nextPrefix();
    stubFetch(() => Promise.resolve(json([summary(`${p}-A`, `${p} Alfa AB`)])));
    render(<App />);
    await screen.findByText(`${p} Alfa AB`, { selector: "td" });
    expect(screen.queryByText(EMPTY)).toBeNull();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();
  });
});

describe("4. loaded", () => {
  it("lists a row per case in the order given and opens the first without a click", async () => {
    const p = nextPrefix();
    const ids = [`${p}-C`, `${p}-A`, `${p}-B`];
    const names = [`${p} Cedar AB`, `${p} Alder AB`, `${p} Birch AB`];
    const fetcher = stubFetch(() =>
      Promise.resolve(json(ids.map((id, i) => summary(id, names[i] ?? "")))),
    );
    render(<App />);
    await screen.findByRole("table");
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    rows.forEach((row, i) => {
      expect(row.textContent).toContain(ids[i]);
      expect(row.textContent).toContain(names[i]);
    });
    expect(rows[0]?.className).toContain("selected");
    expect(rows[1]?.className).not.toContain("selected");
    expect(rows[2]?.className).not.toContain("selected");

    const h1 = await screen.findByRole("heading", { level: 1 });
    expect(h1.textContent).toBe(names[0]);
    await screen.findByText("EDD-PENDING");
    expect(screen.queryByText(SELECT)).toBeNull();
    expect(screen.queryByText(LOADING)).toBeNull();
    expect(screen.queryByText(EMPTY)).toBeNull();
    expect(screen.queryByText(UNAVAILABLE)).toBeNull();

    const urls = fetcher.mock.calls.map((c) => String(c[0]));
    expect(urls).toContain(`/v2/cases/${ids[0]}/status`);
    expect(urls).not.toContain(`/v2/cases/${ids[1]}/status`);
    expect(caseCalls(fetcher)).toBe(1);
  });

  it("opens the first case after a slow answer too", async () => {
    const p = nextPrefix();
    const { pending } = slowCases();
    render(<App />);
    await act(async () => {
      pending.resolve(
        json([summary(`${p}-Z`, `${p} Zinc AB`), summary(`${p}-Y`, `${p} Yew AB`)]),
      );
    });
    const h1 = await screen.findByRole("heading", { level: 1 });
    expect(h1.textContent).toBe(`${p} Zinc AB`);
    expect(screen.getAllByRole("row").slice(1)[0]?.className).toContain("selected");
  });
});

describe("lifecycle", () => {
  it("causes no error when unmounted before a slow answer arrives", async () => {
    const { pending } = slowCases();
    const { unmount } = render(<App />);
    unmount();
    await act(async () => {
      pending.resolve(json([summary(`${nextPrefix()}-A`, "Gone AB")]));
    });
    await flush();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("causes no error when unmounted before a slow failure arrives", async () => {
    const { pending } = slowCases();
    const { unmount } = render(<App />);
    unmount();
    await act(async () => {
      pending.reject(new TypeError("Failed to fetch"));
    });
    await flush();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("makes exactly one request for the cases while loading and after the answer", async () => {
    const { pending, fetcher } = slowCases();
    render(<App />);
    await flush();
    expect(caseCalls(fetcher)).toBe(1);
    await act(async () => {
      pending.resolve(json([]));
    });
    await screen.findByText(EMPTY);
    await flush();
    expect(caseCalls(fetcher)).toBe(1);
  });
});
