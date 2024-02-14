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
