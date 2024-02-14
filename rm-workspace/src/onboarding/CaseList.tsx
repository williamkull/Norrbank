import type { CaseSummary } from "./api";
import { formatDate, formatOrgNo, lifecycleLabel } from "../shared/formatting";

interface CaseListProps {
  cases: CaseSummary[];
  selectedCaseId: string | null;
  onSelect: (caseId: string) => void;
}

export function CaseList({ cases, selectedCaseId, onSelect }: CaseListProps) {
  if (cases.length === 0) {
    return <p className="empty">No open onboarding cases.</p>;
  }

  return (
    <table className="case-list">
      <thead>
        <tr>
          <th>Case</th>
          <th>Client</th>
          <th>Org. no.</th>
          <th>Status</th>
          <th>Opened</th>
        </tr>
      </thead>
      <tbody>
        {cases.map((onboardingCase) => (
          <tr
            key={onboardingCase.caseId}
            className={onboardingCase.caseId === selectedCaseId ? "selected" : undefined}
            onClick={() => onSelect(onboardingCase.caseId)}
          >
            <td className="mono">{onboardingCase.caseId}</td>
            <td>{onboardingCase.legalName}</td>
            <td className="mono">{formatOrgNo(onboardingCase.orgNo)}</td>
            <td>{lifecycleLabel(onboardingCase.lifecycleStatus)}</td>
            <td>{formatDate(onboardingCase.openedAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
