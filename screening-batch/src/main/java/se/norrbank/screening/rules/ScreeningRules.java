package se.norrbank.screening.rules;

import java.util.List;
import se.norrbank.screening.stage.CaseStage;

/**
 * Derives one case stage from the party results of a run.
 *
 * <p>Order matters: a sanctions hit outranks a PEP hit, a PEP hit outranks anything
 * outstanding, and a case only clears when every party on it has cleared every list.
 */
public class ScreeningRules {

    public CaseStage deriveStage(List<PartyScreeningResult> results, boolean enhancedDueDiligenceRequired) {
        if (results.isEmpty()) {
            return CaseStage.SCREENING_QUEUED;
        }
        boolean sanctionsHit = results.stream()
                .anyMatch(result -> result.isSanctionsList() && result.outcome() != PartyOutcome.CLEAR);
        if (sanctionsHit) {
            return CaseStage.SANCTIONS_HOLD;
        }
        boolean pepHit = results.stream()
                .anyMatch(result -> result.isPepList() && result.outcome() != PartyOutcome.CLEAR);
        if (pepHit) {
            return CaseStage.PEP_REVIEW;
        }
        boolean anythingOutstanding = results.stream()
                .anyMatch(result -> result.outcome() == PartyOutcome.PENDING_REVIEW
                        || result.outcome() == PartyOutcome.POSSIBLE_MATCH);
        if (anythingOutstanding || enhancedDueDiligenceRequired) {
            return CaseStage.EDD_PENDING;
        }
        return CaseStage.SCREENING_CLEARED;
    }
}
