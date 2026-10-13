import { useEffect, useState } from "react";
import { CaseList } from "./onboarding/CaseList";
import { CaseView } from "./onboarding/CaseView";
import { fetchCases, type CaseSummary } from "./onboarding/api";
import { currentSession } from "./auth/session";

type CaseLoad =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "loaded"; cases: CaseSummary[] };

export function App() {
  const session = currentSession();
  const [load, setLoad] = useState<CaseLoad>({ state: "loading" });
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    fetchCases()
      .then((loaded) => {
        if (current) {
          setLoad({ state: "loaded", cases: loaded });
          setSelectedCaseId((selected) => selected ?? loaded[0]?.caseId ?? null);
        }
      })
      .catch(() => {
        if (current) {
          setLoad({ state: "failed" });
        }
      });
    return () => {
      current = false;
    };
  }, []);

  const selected =
    load.state === "loaded"
      ? load.cases.find((onboardingCase) => onboardingCase.caseId === selectedCaseId)
      : undefined;

  return (
    <div className="workspace">
      <nav className="masthead">
        <span className="wordmark">Norrbank</span>
        <span className="section">RM Workspace</span>
        <span className="who">
          {session.displayName} · {session.department}
        </span>
      </nav>

      <main>
        <aside className="cases">
          <h2>Onboarding</h2>
          {load.state === "loading" ? <p className="subdued">Loading.</p> : null}
          {load.state === "failed" ? <p className="error">Cases are unavailable right now.</p> : null}
          {load.state === "loaded" ? (
            <CaseList cases={load.cases} selectedCaseId={selectedCaseId} onSelect={setSelectedCaseId} />
          ) : null}
        </aside>

        <section className="detail-pane">
          {selected ? (
            <CaseView onboardingCase={selected} />
          ) : load.state === "loaded" ? (
            <p className="empty">Select a case.</p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
