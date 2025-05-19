package se.norrbank.screening.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.junit.jupiter.api.Test;
import se.norrbank.screening.stage.CaseStage;

class ScreeningRulesTest {

    private final ScreeningRules rules = new ScreeningRules();

    private PartyScreeningResult result(ScreeningList list, PartyOutcome outcome) {
        return new PartyScreeningResult("ONB-2026-000200", "party-1", list, outcome);
    }

    @Test
    void nothingScreenedYetIsQueued() {
        assertEquals(CaseStage.SCREENING_QUEUED, rules.deriveStage(List.of(), false));
    }

    @Test
    void aSanctionsHitOutranksEverything() {
        List<PartyScreeningResult> results = List.of(
                result(ScreeningList.OFAC_SDN, PartyOutcome.CONFIRMED_MATCH),
                result(ScreeningList.PEP_GLOBAL, PartyOutcome.POSSIBLE_MATCH));
        assertEquals(CaseStage.SANCTIONS_HOLD, rules.deriveStage(results, true));
    }

    @Test
    void aPepHitOutranksOutstandingWork() {
        List<PartyScreeningResult> results = List.of(
                result(ScreeningList.EU_CONSOLIDATED_SANCTIONS, PartyOutcome.CLEAR),
                result(ScreeningList.PEP_GLOBAL, PartyOutcome.POSSIBLE_MATCH),
                result(ScreeningList.ADVERSE_MEDIA, PartyOutcome.PENDING_REVIEW));
        assertEquals(CaseStage.PEP_REVIEW, rules.deriveStage(results, false));
    }

    @Test
    void enhancedDueDiligenceHoldsACaseThatIsOtherwiseClear() {
        List<PartyScreeningResult> results = List.of(
                result(ScreeningList.OFAC_SDN, PartyOutcome.CLEAR),
                result(ScreeningList.PEP_GLOBAL, PartyOutcome.CLEAR));
        assertEquals(CaseStage.EDD_PENDING, rules.deriveStage(results, true));
    }

    @Test
    void everythingClearAndNoEddClears() {
        List<PartyScreeningResult> results = List.of(
                result(ScreeningList.OFAC_SDN, PartyOutcome.CLEAR),
                result(ScreeningList.PEP_GLOBAL, PartyOutcome.CLEAR),
                result(ScreeningList.ADVERSE_MEDIA, PartyOutcome.CLEAR));
        assertEquals(CaseStage.SCREENING_CLEARED, rules.deriveStage(results, false));
    }

    @Test
    void adverseMediaAloneLeavesTheCaseInEdd() {
        List<PartyScreeningResult> results = List.of(
                result(ScreeningList.OFAC_SDN, PartyOutcome.CLEAR),
                result(ScreeningList.ADVERSE_MEDIA, PartyOutcome.POSSIBLE_MATCH));
        assertEquals(CaseStage.EDD_PENDING, rules.deriveStage(results, false));
    }
}
