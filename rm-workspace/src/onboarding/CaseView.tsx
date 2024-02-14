import type { CaseSummary } from "./api";
import { Panel } from "../shared/Panel";
import { formatDate, formatOrgNo, lifecycleLabel } from "../shared/formatting";

interface CaseViewProps {
  onboardingCase: CaseSummary;
}

export function CaseView({ onboardingCase }: CaseViewProps) {
  return (
    <div className="case-view">
      <header className="case-header">
        <h1>{onboardingCase.legalName}</h1>
        <p className="mono subdued">
          {onboardingCase.caseId} · {formatOrgNo(onboardingCase.orgNo)}
        </p>
      </header>

      <Panel title="Case">
        <dl className="detail">
          <dt>Status</dt>
          <dd>{lifecycleLabel(onboardingCase.lifecycleStatus)}</dd>
          <dt>Opened</dt>
          <dd>{formatDate(onboardingCase.openedAt)}</dd>
          <dt>Last updated</dt>
          <dd>{formatDate(onboardingCase.updatedAt)}</dd>
          <dt>Documents outstanding</dt>
          <dd>{onboardingCase.documentsOutstanding}</dd>
        </dl>
      </Panel>

      <Panel title="Contacts">
        <p className="subdued">Client contacts are maintained in the CRM record.</p>
      </Panel>
    </div>
  );
}
