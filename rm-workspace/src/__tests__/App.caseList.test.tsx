import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { App } from "../App";

const NO_CASES = "No open onboarding cases.";

/** Lets answers already given reach the workspace, so an absence can be asserted after them. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((done) => setTimeout(done, 0));
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App case list when the cases have not loaded", () => {
  it("does not say there are no open cases when /v2/cases answers 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 503 })),
    );

    render(<App />);
    await settle();

    expect(screen.queryByText(NO_CASES)).toBeNull();
  });

  it("shows no path or status code when /v2/cases answers 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 503 })),
    );

    render(<App />);
    await settle();

    expect(screen.queryByText(/\/v2\/cases/)).toBeNull();
    expect(screen.queryByText(/503/)).toBeNull();
  });

  it("does not say there are no open cases while /v2/cases has not answered", async () => {
    const unanswered = new Promise<Response>(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(() => unanswered),
    );

    render(<App />);
    await settle();

    expect(screen.queryByText(NO_CASES)).toBeNull();
  });
});
