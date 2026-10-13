import { useCallback, useEffect, useState } from "react";
import { Panel } from "../shared/Panel";
import { formatIsoDate, nextStepLabel, stageLabel } from "../shared/formatting";
import { fetchCaseStatus, type CaseStatus } from "./api";

interface StatusPanelProps {
  caseId: string;
}

/** Where the case stands: stage with its procedure code, what it waits on, when it lands. */
export function StatusPanel({ caseId }: StatusPanelProps) {
  const { status, failed, retry } = useCaseStatus(caseId);

  if (failed) {
    return (
      <Panel title="Status">
        <p className="error">Status is unavailable right now.</p>
        <button type="button" onClick={retry}>
          Try again
        </button>
      </Panel>
    );
  }

  if (!status) {
    return (
      <Panel title="Status">
        <p className="subdued">Loading.</p>
      </Panel>
    );
  }

  return (
    <Panel title="Status">
      <dl className="detail status-panel">
        <dt>Stage</dt>
        <dd>
          {stageLabel(status.stage)}
          <span className="mono subdued procedure-code">{status.procedureStageCode}</span>
        </dd>
        <dt>Next step</dt>
        <dd>{nextStepLabel(status.nextStep)}</dd>
        <dt>Expected date</dt>
        <dd>{status.expectedDate ? formatIsoDate(status.expectedDate) : "Not yet known"}</dd>
      </dl>
    </Panel>
  );
}

/**
 * Fetches the status when the case is selected, and only then.
 *
 * An RM does not open one case. They open ten before lunch and leave the workspace open all
 * day, clicking between them; without the cache that is one request per selection, against
 * a rate limit sized for the service's connection pool rather than for demand.
 *
 * Requests in the air are kept as well as answers, so two mounts of the same case share one
 * request rather than racing to fill the same entry twice.
 *
 * Nothing expires either on a timer: no interval, no refetch on focus or visibility. Both
 * live in memory and die with the page, which is correct — the workspace holds nothing
 * across a session that the gateway did not put there. A press on "Try again" is the only
 * thing that asks again after a failure.
 */
function useCaseStatus(caseId: string): {
  status: CaseStatus | null;
  failed: boolean;
  retry: () => void;
} {
  const [entry, setEntry] = useState<Loaded | null>(null);

  // State is tagged with the case it belongs to and read only for that case, so another
  // case's status, failure or attempt is never shown, not even for one frame.
  const mine = entry?.caseId === caseId ? entry : null;
  const status = held.get(caseId) ?? mine?.status ?? null;
  const failed = status === null && (mine?.failed ?? false);
  const attempt = mine?.attempt ?? 0;

  const retry = useCallback(() => {
    setEntry((prev) =>
      prev && prev.caseId === caseId && prev.failed
        ? { caseId, status: null, failed: false, attempt: prev.attempt + 1 }
        : prev,
    );
  }, [caseId]);

  useEffect(() => {
    if (held.has(caseId)) return;
    let showing = true;
    let pending = inFlight.get(caseId);
    if (!pending) {
      // The bookkeeping sits on the stored promise, so it has run before any panel hears the
      // outcome: a retry never joins the request that just failed. A failure is not kept.
      // The stored promise rejects; every consumer below attaches its own handler.
      pending = fetchCaseStatus(caseId)
        .then((loaded) => {
          held.set(caseId, loaded);
          return loaded;
        })
        .finally(() => inFlight.delete(caseId));
      inFlight.set(caseId, pending);
    }
    pending.then(
      (loaded) => {
        if (showing) setEntry({ caseId, status: loaded, failed: false, attempt });
      },
      () => {
        // Panel-local: a status the service cannot answer must not take the case view with it.
        if (showing) setEntry({ caseId, status: null, failed: true, attempt });
      },
    );
    return () => {
      showing = false;
      // Leaving a case drops its failed entry: the one slot would otherwise show a stale
      // failure, with a button, on returning while the effect has already asked again. A press
      // has cleared `failed` before this runs, so a retry is not undone.
      setEntry((prev) => (prev && prev.caseId === caseId && prev.failed ? null : prev));
    };
    // `attempt` is captured in this closure and must stay in the dependency array.
  }, [caseId, attempt]);

  return { status, failed, retry };
}

interface Loaded {
  caseId: string;
  status: CaseStatus | null;
  failed: boolean;
  attempt: number;
}

const held = new Map<string, CaseStatus>();
const inFlight = new Map<string, Promise<CaseStatus>>();
