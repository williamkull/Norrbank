import { useEffect, useState } from "react";
import { Panel } from "../shared/Panel";
import { formatIsoDate, nextStepLabel, stageLabel } from "../shared/formatting";
import { fetchCaseStatus, type CaseStatus } from "./api";

interface StatusPanelProps {
  caseId: string;
}

/** Where the case stands: stage with its procedure code, what it waits on, when it lands. */
export function StatusPanel({ caseId }: StatusPanelProps) {
  const { status, failed } = useCaseStatus(caseId);

  if (failed) {
    return (
      <Panel title="Status">
        <p className="error">Status is unavailable right now.</p>
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
 * across a session that the gateway did not put there.
 */
function useCaseStatus(caseId: string): { status: CaseStatus | null; failed: boolean } {
  const [status, setStatus] = useState<CaseStatus | null>(held.get(caseId) ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    const already = held.get(caseId);
    if (already) {
      setStatus(already);
      return;
    }
    setStatus(null);
    let showing = true;
    let pending = inFlight.get(caseId);
    if (!pending) {
      pending = fetchCaseStatus(caseId);
      inFlight.set(caseId, pending);
      pending
        .then((loaded) => held.set(caseId, loaded))
        // Neither a failure nor its request is kept, so the next selection tries again.
        .catch(() => undefined)
        .finally(() => inFlight.delete(caseId));
    }
    pending
      .then((loaded) => {
        if (showing) setStatus(loaded);
      })
      .catch(() => {
        // Panel-local: a status the service cannot answer must not take the case view with it.
        if (showing) setFailed(true);
      });
    return () => {
      showing = false;
    };
  }, [caseId]);

  return { status, failed };
}

const held = new Map<string, CaseStatus>();
const inFlight = new Map<string, Promise<CaseStatus>>();
