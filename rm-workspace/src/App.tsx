import { useEffect, useState } from "react";
import { CaseList } from "./onboarding/CaseList";
import { CaseView } from "./onboarding/CaseView";
import { fetchCases, type CaseSummary } from "./onboarding/api";
import { currentSession } from "./auth/session";

export function App() {
  const session = currentSession();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCases()
      .then((loaded) => {
        setCases(loaded);
        setSelectedCaseId((current) => current ?? loaded[0]?.caseId ?? null);
      })
      .catch((failure: Error) => setError(failure.message));
  }, []);

  const selected = cases.find((onboardingCase) => onboardingCase.caseId === selectedCaseId);

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
          {error ? <p className="error">{error}</p> : null}
          <CaseList cases={cases} selectedCaseId={selectedCaseId} onSelect={setSelectedCaseId} />
        </aside>

        <section className="detail-pane">
          {selected ? <CaseView onboardingCase={selected} /> : <p className="empty">Select a case.</p>}
        </section>
      </main>
    </div>
  );
}
