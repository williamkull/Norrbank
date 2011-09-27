package se.norrbank.screening.job;

import java.time.LocalDate;
import java.util.List;

/** An open case and the parties this run must screen on it. */
public record CaseToScreen(String caseId, List<String> partyRefs, boolean enhancedDueDiligence, LocalDate expectedDecisionDate) {
}
