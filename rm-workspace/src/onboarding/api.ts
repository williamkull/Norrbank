import { currentSession, sessionHeaders } from "../auth/session";

export interface CaseSummary {
  caseId: string;
  orgNo: string;
  legalName: string;
  lifecycleStatus: string;
  openedAt: string;
  updatedAt: string;
  documentsOutstanding: number;
}

/**
 * Where a case stands, as v2 returns it. Codes, not sentences: the wording an RM reads is
 * this workspace's to own, and `shared/formatting.ts` is where it lives.
 */
export interface CaseStatus {
  caseId: string;
  stage: string;
  procedureStageCode: string;
  nextStep: string;
  expectedDate: string | null;
  expectedDateSource: string | null;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: sessionHeaders(currentSession()) });
  if (!response.ok) {
    throw new Error(`${path} responded ${response.status}`);
  }
  return (await response.json()) as T;
}

export function fetchCases(): Promise<CaseSummary[]> {
  return get<CaseSummary[]>("/v2/cases");
}

export function fetchCase(caseId: string): Promise<CaseSummary> {
  return get<CaseSummary>(`/v2/cases/${caseId}`);
}

export function fetchCaseStatus(caseId: string): Promise<CaseStatus> {
  return get<CaseStatus>(`/v2/cases/${caseId}/status`);
}
