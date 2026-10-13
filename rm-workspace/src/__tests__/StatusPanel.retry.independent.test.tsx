import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StatusPanel } from "../onboarding/StatusPanel";
import type { CaseStatus } from "../onboarding/api";

const MESSAGE = "Status is unavailable right now.";

function statusFor(caseId: string, code = "EDD-PENDING"): CaseStatus {
  return {
    caseId,
    stage: "AWAITING_REGISTRY_EVIDENCE",
    procedureStageCode: code,
    nextStep: "AWAITING_REGISTRY_EVIDENCE",
    expectedDate: "2026-09-24",
    expectedDateSource: "registry-evidence",
  };
}

function okRes(status: CaseStatus): Response {
  return new Response(JSON.stringify(status), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function failRes(code = 500): Response {
  return new Response("", { status: code });
}

interface Call {
  url: string;
  resolve: (r: Response) => void;
  reject: (e: unknown) => void;
}

/** Every fetch is held until the test answers it, so request counts and order are exact. */
function controlledFetch() {
  const calls: Call[] = [];
  const fetcher = vi.fn((input: RequestInfo | URL) => {
    return new Promise<Response>((resolve, reject) => {
      calls.push({ url: String(input), resolve, reject });
    });
  });
  vi.stubGlobal("fetch", fetcher);
  return { calls, fetcher };
}

const urlOf = (id: string) => `/v2/cases/${id}/status`;
const callsFor = (calls: Call[], id: string) => calls.filter((c) => c.url === urlOf(id));

async function answer(call: Call, res: Response) {
  await act(async () => {
    call.resolve(res);
  });
}

async function fail(call: Call, how: "500" | "network" | "429" = "500") {
  await act(async () => {
    if (how === "network") call.reject(new TypeError("Failed to fetch"));
    else call.resolve(failRes(how === "429" ? 429 : 500));
  });
}

const button = () => screen.queryByRole("button", { name: "Try again" });
const press = () => fireEvent.click(screen.getByRole("button", { name: "Try again" }));
const showsFailed = () => screen.queryByText(MESSAGE) !== null;
const showsLoading = () => screen.queryByText("Loading.") !== null;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("check 1: failure shows message and button", () => {
  it("check 1: 500 shows exact message and a Try again button", async () => {
    const { calls } = controlledFetch();
    const { container } = render(<StatusPanel caseId="ONB-2026-009001" />);
    expect(showsLoading()).toBe(true);
    expect(button()).toBeNull();
    await fail(calls[0]);
    expect(screen.getByText(MESSAGE)).toBeDefined();
    expect(button()).not.toBeNull();
    expect(container.textContent).toContain(MESSAGE);
    expect(screen.queryByText("Loading.")).toBeNull();
  });

  it("check 1: network error (rejection) shows message and button", async () => {
    const { calls } = controlledFetch();
    render(<StatusPanel caseId="ONB-2026-009002" />);
    await fail(calls[0], "network");
    expect(showsFailed()).toBe(true);
    expect(button()).not.toBeNull();
  });

  it("check 1: 429 is a failure like any other", async () => {
    const { calls } = controlledFetch();
    render(<StatusPanel caseId="ONB-2026-009003" />);
    await fail(calls[0], "429");
    expect(showsFailed()).toBe(true);
    expect(button()).not.toBeNull();
  });

  it("check 1: the button is a native <button type=button> named exactly 'Try again'", async () => {
    const { calls } = controlledFetch();
    render(<StatusPanel caseId="ONB-2026-009004" />);
    await fail(calls[0]);
    const b = screen.getByRole("button", { name: "Try again" });
    expect(b.tagName).toBe("BUTTON");
    expect(b.getAttribute("type")).toBe("button");
    expect(b.textContent).toBe("Try again");
    expect(b.hasAttribute("disabled")).toBe(false);
    expect(b.getAttribute("style")).toBeNull();
    expect(b.getAttribute("class")).toBeNull();
    expect(screen.getAllByRole("button").length).toBe(1);
  });

  it("check 1: no stage or procedure code in the Failed state", async () => {
    const { calls } = controlledFetch();
    const { container } = render(<StatusPanel caseId="ONB-2026-009005" />);
    await fail(calls[0]);
    expect(screen.queryByText("Stage")).toBeNull();
    expect(container.textContent).not.toContain("EDD-");
  });
});

describe("check 2: press -> Loading and exactly one new request", () => {
  it("check 2: one press shows Loading. and makes exactly one request to the same case URL", async () => {
    const { calls, fetcher } = controlledFetch();
    render(<StatusPanel caseId="ONB-2026-009006" />);
    await fail(calls[0]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    press();
    await act(async () => {});
    expect(showsLoading()).toBe(true);
    expect(showsFailed()).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(calls[1].url).toBe(urlOf("ONB-2026-009006"));
    // a failed request is never reused: the second request is a distinct call
    expect(calls[1]).not.toBe(calls[0]);
  });

  it("check 2: rapid double and triple clicks make one request", async () => {
    const { calls, fetcher } = controlledFetch();
    render(<StatusPanel caseId="ONB-2026-009007" />);
    await fail(calls[0]);
    const b = screen.getByRole("button", { name: "Try again" });
    fireEvent.click(b);
    fireEvent.click(b);
    fireEvent.click(b);
    await act(async () => {});
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(button()).toBeNull();
  });

  it("check 2: clicks in a single act (batched) still make one request", async () => {
    const { calls, fetcher } = controlledFetch();
    render(<StatusPanel caseId="ONB-2026-009008" />);
    await fail(calls[0]);
    const b = screen.getByRole("button", { name: "Try again" });
    await act(async () => {
      fireEvent.click(b);
      fireEvent.click(b);
      fireEvent.click(b);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("check 2: the Loading panel stays Loading until the request answers", async () => {
    const { calls } = controlledFetch();
    render(<StatusPanel caseId="ONB-2026-009009" />);
    await fail(calls[0]);
    press();
    await act(async () => {});
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(showsLoading()).toBe(true);
    expect(calls.length).toBe(2);
  });
});

describe("check 3: retry succeeds", () => {
  it("check 3: shows stage with code, next step and expected date", async () => {
    const { calls } = controlledFetch();
    const id = "ONB-2026-009010";
    const { container } = render(<StatusPanel caseId={id} />);
    await fail(calls[0]);
    press();
    await act(async () => {});
    await answer(calls[1], okRes(statusFor(id, "EDD-RETRY-OK")));
    expect(screen.getByText("Stage")).toBeDefined();
    expect(screen.getByText("Next step")).toBeDefined();
    expect(screen.getByText("Expected date")).toBeDefined();
    expect(container.textContent).toContain("EDD-RETRY-OK");
    expect(container.textContent).toContain("2026");
    expect(showsFailed()).toBe(false);
    expect(showsLoading()).toBe(false);
    expect(button()).toBeNull();
  });

  it("check 3: null expected date shows 'Not yet known' after a retry", async () => {
    const { calls } = controlledFetch();
    const id = "ONB-2026-009011";
    render(<StatusPanel caseId={id} />);
    await fail(calls[0]);
    press();
    await act(async () => {});
    await answer(calls[1], okRes({ ...statusFor(id), expectedDate: null, expectedDateSource: null }));
    expect(screen.getByText("Not yet known")).toBeDefined();
  });
});

describe("check 4: retry fails again", () => {
  it("check 4: 500 then press then 500 shows message and button again", async () => {
    const { calls } = controlledFetch();
    render(<StatusPanel caseId="ONB-2026-009012" />);
    await fail(calls[0]);
    press();
    await act(async () => {});
    await fail(calls[1]);
    expect(showsFailed()).toBe(true);
    expect(button()).not.toBeNull();
    expect(showsLoading()).toBe(false);
  });

  it("check 4: network error on retry brings message and button back", async () => {
    const { calls } = controlledFetch();
    render(<StatusPanel caseId="ONB-2026-009013" />);
    await fail(calls[0]);
    press();
    await act(async () => {});
    await fail(calls[1], "network");
    expect(showsFailed()).toBe(true);
    expect(button()).not.toBeNull();
  });

  it("check 4: four failures in a row then success; one request per press", async () => {
    const { calls, fetcher } = controlledFetch();
    const id = "ONB-2026-009014";
    const { container } = render(<StatusPanel caseId={id} />);
    await fail(calls[0]);
    for (let i = 1; i <= 3; i++) {
      press();
      await act(async () => {});
      expect(fetcher).toHaveBeenCalledTimes(i + 1);
      expect(showsLoading()).toBe(true);
      await fail(calls[i], i === 2 ? "network" : "500");
      expect(showsFailed()).toBe(true);
      expect(button()).not.toBeNull();
    }
    press();
    await act(async () => {});
    expect(fetcher).toHaveBeenCalledTimes(5);
    await answer(calls[4], okRes(statusFor(id, "EDD-FIFTH")));
    expect(container.textContent).toContain("EDD-FIFTH");
    expect(button()).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(5);
  });

  it("check 4: after a failed retry, pressing again works (state not stuck)", async () => {
    const { calls } = controlledFetch();
    const id = "ONB-2026-009015";
    render(<StatusPanel caseId={id} />);
    await fail(calls[0]);
    press();
    await act(async () => {});
    await fail(calls[1]);
    press();
    await act(async () => {});
    expect(calls.length).toBe(3);
    await answer(calls[2], okRes(statusFor(id)));
    expect(screen.getByText("Stage")).toBeDefined();
  });
});

describe("check 5: button only in Failed", () => {
  it("check 5: no button while initial Loading, none once Shown", async () => {
    const { calls } = controlledFetch();
    const id = "ONB-2026-009016";
    render(<StatusPanel caseId={id} />);
    expect(showsLoading()).toBe(true);
    expect(screen.queryAllByRole("button").length).toBe(0);
    await answer(calls[0], okRes(statusFor(id)));
    expect(screen.getByText("Stage")).toBeDefined();
    expect(screen.queryAllByRole("button").length).toBe(0);
  });

  it("check 5: no button during the retry's Loading", async () => {
    const { calls } = controlledFetch();
    render(<StatusPanel caseId="ONB-2026-009017" />);
    await fail(calls[0]);
    press();
    await act(async () => {});
    expect(showsLoading()).toBe(true);
    expect(screen.queryAllByRole("button").length).toBe(0);
  });
});

describe("check 6: loaded status fetched once per case", () => {
  it("check 6: remount of a loaded case does not request again", async () => {
    const { calls, fetcher } = controlledFetch();
    const id = "ONB-2026-009018";
    const first = render(<StatusPanel caseId={id} />);
    await answer(calls[0], okRes(statusFor(id, "EDD-ONCE")));
    first.unmount();
    const { container } = render(<StatusPanel caseId={id} />);
    expect(container.textContent).toContain("EDD-ONCE");
    await act(async () => {});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("check 6: retry then success, then reselect: still exactly two requests total", async () => {
    const { calls, fetcher } = controlledFetch();
    const idA = "ONB-2026-009019";
    const idB = "ONB-2026-009020";
    const view = render(<StatusPanel caseId={idA} />);
    await fail(calls[0]);
    press();
    await act(async () => {});
    await answer(calls[1], okRes(statusFor(idA, "EDD-A")));
    view.rerender(<StatusPanel caseId={idB} />);
    await act(async () => {});
    expect(callsFor(calls, idB).length).toBe(1);
    view.rerender(<StatusPanel caseId={idA} />);
    await act(async () => {});
    expect(view.container.textContent).toContain("EDD-A");
    expect(callsFor(calls, idA).length).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("check 6: a failure is not held: remount after failure fetches again", async () => {
    const { calls, fetcher } = controlledFetch();
    const id = "ONB-2026-009021";
    const first = render(<StatusPanel caseId={id} />);
    await fail(calls[0]);
    first.unmount();
    render(<StatusPanel caseId={id} />);
    await act(async () => {});
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(showsLoading()).toBe(true);
  });
});

describe("check 7: per-case independence", () => {
  it("check 7: fail A, switch to B: B shows its own state; pressing in B requests only B", async () => {
    const { calls } = controlledFetch();
    const idA = "ONB-2026-009022";
    const idB = "ONB-2026-009023";
    const view = render(<StatusPanel caseId={idA} />);
    await fail(callsFor(calls, idA)[0]);
    expect(button()).not.toBeNull();
    view.rerender(<StatusPanel caseId={idB} />);
    // B's own state: Loading, not A's failure, not a button
    expect(showsLoading()).toBe(true);
    expect(showsFailed()).toBe(false);
    expect(button()).toBeNull();
    await act(async () => {});
    expect(callsFor(calls, idB).length).toBe(1);
    await fail(callsFor(calls, idB)[0]);
    expect(showsFailed()).toBe(true);
    press();
    await act(async () => {});
    expect(callsFor(calls, idB).length).toBe(2);
    expect(callsFor(calls, idA).length).toBe(1);
  });

  it("check 7: two cases failing independently; retry of one leaves the other failed", async () => {
    const { calls } = controlledFetch();
    const idA = "ONB-2026-009024";
    const idB = "ONB-2026-009025";
    const a = render(<StatusPanel caseId={idA} />);
    const b = render(<StatusPanel caseId={idB} />);
    await fail(callsFor(calls, idA)[0]);
    await fail(callsFor(calls, idB)[0]);
    expect(screen.getAllByRole("button", { name: "Try again" }).length).toBe(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Try again" })[0]);
    await act(async () => {});
    expect(callsFor(calls, idA).length).toBe(2);
    expect(callsFor(calls, idB).length).toBe(1);
    expect(a.container.textContent).toContain("Loading.");
    expect(b.container.textContent).toContain(MESSAGE);
    expect(b.container.querySelector("button")).not.toBeNull();
    await answer(callsFor(calls, idA)[1], okRes(statusFor(idA, "EDD-A2")));
    expect(a.container.textContent).toContain("EDD-A2");
    expect(b.container.textContent).toContain(MESSAGE);
  });

  it("check 7: fail A, switch to B and back: A shows Failed with a working button", async () => {
    const { calls } = controlledFetch();
    const idA = "ONB-2026-009026";
    const idB = "ONB-2026-009027";
    const view = render(<StatusPanel caseId={idA} />);
    await fail(callsFor(calls, idA)[0]);
    view.rerender(<StatusPanel caseId={idB} />);
    await act(async () => {});
    await answer(callsFor(calls, idB)[0], okRes(statusFor(idB, "EDD-B")));
    expect(view.container.textContent).toContain("EDD-B");
    view.rerender(<StatusPanel caseId={idA} />);
    await act(async () => {});
    // A's failure is not held, so it is fetched again on reselect (as today); settle it
    const aCalls = callsFor(calls, idA);
    expect(aCalls.length).toBe(2);
    expect(view.container.textContent).not.toContain("EDD-B");
    await fail(aCalls[1]);
    expect(showsFailed()).toBe(true);
    press();
    await act(async () => {});
    expect(callsFor(calls, idA).length).toBe(3);
    expect(callsFor(calls, idB).length).toBe(1);
  });

  it("check 7: B's button never acts on A (button in B after A failed and B failed)", async () => {
    const { calls } = controlledFetch();
    const idA = "ONB-2026-009028";
    const idB = "ONB-2026-009029";
    const view = render(<StatusPanel caseId={idA} />);
    await fail(callsFor(calls, idA)[0]);
    view.rerender(<StatusPanel caseId={idB} />);
    await act(async () => {});
    await fail(callsFor(calls, idB)[0]);
    press();
    await act(async () => {});
    expect(calls.map((c) => c.url).slice(-1)[0]).toBe(urlOf(idB));
    expect(callsFor(calls, idA).length).toBe(1);
  });
});

describe("check 8: switching case during a retry", () => {
  it("check 8: A's late success does not appear in B's panel", async () => {
    const { calls } = controlledFetch();
    const idA = "ONB-2026-009030";
    const idB = "ONB-2026-009031";
    const view = render(<StatusPanel caseId={idA} />);
    await fail(callsFor(calls, idA)[0]);
    press();
    await act(async () => {});
    const retryA = callsFor(calls, idA)[1];
    view.rerender(<StatusPanel caseId={idB} />);
    await act(async () => {});
    expect(showsLoading()).toBe(true);
    await answer(retryA, okRes(statusFor(idA, "EDD-LEAKED-A")));
    expect(view.container.textContent).not.toContain("EDD-LEAKED-A");
    expect(showsLoading()).toBe(true);
    await answer(callsFor(calls, idB)[0], okRes(statusFor(idB, "EDD-B-OWN")));
    expect(view.container.textContent).toContain("EDD-B-OWN");
    expect(view.container.textContent).not.toContain("EDD-LEAKED-A");
  });

  it("check 8: A's late failure does not put a failure or button into B's panel", async () => {
    const { calls } = controlledFetch();
    const idA = "ONB-2026-009032";
    const idB = "ONB-2026-009033";
    const view = render(<StatusPanel caseId={idA} />);
    await fail(callsFor(calls, idA)[0]);
    press();
    await act(async () => {});
    const retryA = callsFor(calls, idA)[1];
    view.rerender(<StatusPanel caseId={idB} />);
    await act(async () => {});
    await fail(retryA);
    expect(showsFailed()).toBe(false);
    expect(button()).toBeNull();
    expect(showsLoading()).toBe(true);
    // and B's own panel still ends up with B's answer
    await answer(callsFor(calls, idB)[0], okRes(statusFor(idB, "EDD-B2")));
    expect(view.container.textContent).toContain("EDD-B2");
  });

  it("check 8: switch to B mid-retry and back to A; A's retry answer lands in A once", async () => {
    const { calls } = controlledFetch();
    const idA = "ONB-2026-009034";
    const idB = "ONB-2026-009035";
    const view = render(<StatusPanel caseId={idA} />);
    await fail(callsFor(calls, idA)[0]);
    press();
    await act(async () => {});
    view.rerender(<StatusPanel caseId={idB} />);
    await act(async () => {});
    view.rerender(<StatusPanel caseId={idA} />);
    await act(async () => {});
    // A is not in a failed state now; no button, and not a duplicate request storm
    expect(button()).toBeNull();
    expect(callsFor(calls, idA).length).toBeLessThanOrEqual(2);
    await answer(callsFor(calls, idA)[1], okRes(statusFor(idA, "EDD-A-BACK")));
    expect(view.container.textContent).toContain("EDD-A-BACK");
  });

  it("check 8: old retry resolving after switch back to B shown does not overwrite B's loaded status", async () => {
    const { calls } = controlledFetch();
    const idA = "ONB-2026-009036";
    const idB = "ONB-2026-009037";
    const view = render(<StatusPanel caseId={idA} />);
    await fail(callsFor(calls, idA)[0]);
    press();
    await act(async () => {});
    const retryA = callsFor(calls, idA)[1];
    view.rerender(<StatusPanel caseId={idB} />);
    await act(async () => {});
    await answer(callsFor(calls, idB)[0], okRes(statusFor(idB, "EDD-B-FIRST")));
    await answer(retryA, okRes(statusFor(idA, "EDD-A-LATE")));
    expect(view.container.textContent).toContain("EDD-B-FIRST");
    expect(view.container.textContent).not.toContain("EDD-A-LATE");
  });
});

describe("unmount during a retry", () => {
  it("unmount while retry is in the air: late success and late failure raise no error or warning", async () => {
    const { calls } = controlledFetch();
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const warns = vi.spyOn(console, "warn").mockImplementation(() => {});
    const proc = (globalThis as unknown as { process: { on(e: string, f: (x: unknown) => void): void; off(e: string, f: (x: unknown) => void): void } }).process;
    const unhandled: unknown[] = [];
    const onUnhandled = (e: unknown) => unhandled.push(e);
    proc.on("unhandledRejection", onUnhandled);
    try {
      const idA = "ONB-2026-009038";
      const idC = "ONB-2026-009039";
      const first = render(<StatusPanel caseId={idA} />);
      await fail(calls[0]);
      press();
      await act(async () => {});
      first.unmount();
      await answer(calls[1], okRes(statusFor(idA)));
      const second = render(<StatusPanel caseId={idC} />);
      await fail(callsFor(calls, idC)[0]);
      press();
      await act(async () => {});
      second.unmount();
      await fail(callsFor(calls, idC)[1]);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });
      expect(errors).not.toHaveBeenCalled();
      expect(warns).not.toHaveBeenCalled();
      expect(unhandled).toEqual([]);
    } finally {
      proc.off("unhandledRejection", onUnhandled);
    }
  });
});

describe("check 10: nothing automatic", () => {
  it("check 10: no request on focus, visibilitychange or advanced fake timers, in Failed or Loading", async () => {
    vi.useFakeTimers();
    const { calls, fetcher } = controlledFetch();
    render(<StatusPanel caseId="ONB-2026-009040" />);
    await act(async () => {
      call0(calls).reject(new TypeError("down"));
    });
    expect(showsFailed()).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("online"));
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(showsFailed()).toBe(true);
    // pressing is the only thing that asks
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await act(async () => {});
    expect(fetcher).toHaveBeenCalledTimes(2);
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("check 10: no timers are scheduled by the failed panel", async () => {
    const { calls } = controlledFetch();
    render(<StatusPanel caseId="ONB-2026-009041" />);
    await fail(calls[0]);
    vi.useFakeTimers();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("check 10: a loaded status is not requested again on focus or timers", async () => {
    const { calls, fetcher } = controlledFetch();
    const id = "ONB-2026-009042";
    render(<StatusPanel caseId={id} />);
    await answer(calls[0], okRes(statusFor(id)));
    vi.useFakeTimers();
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("check 9: keyboard", () => {
  it("check 9: reachable as a native, enabled button with no tabindex override (Tab/Enter/Space themselves are not testable in happy-dom)", async () => {
    const { calls } = controlledFetch();
    render(<StatusPanel caseId="ONB-2026-009043" />);
    await fail(calls[0]);
    const b = screen.getByRole("button", { name: "Try again" }) as HTMLButtonElement;
    expect(b.disabled).toBe(false);
    expect(b.getAttribute("tabindex")).toBeNull();
    expect(b.getAttribute("aria-hidden")).toBeNull();
  });
});

describe("request shape", () => {
  it("every request is a GET-style fetch of the case's own status URL", async () => {
    const { calls, fetcher } = controlledFetch();
    const id = "ONB-2026-009044";
    render(<StatusPanel caseId={id} />);
    await fail(calls[0]);
    press();
    await act(async () => {});
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    for (const c of calls) expect(c.url).toBe(urlOf(id));
  });
});

function call0(calls: Call[]): Call {
  return calls[0];
}
