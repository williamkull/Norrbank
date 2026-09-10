package se.norrbank.onboarding.core.status;

import java.time.LocalDate;
import se.norrbank.onboarding.core.stage.CaseStageValue;

/**
 * Where a case stands, as the domain holds it.
 *
 * <p>Two fields for the date rather than one: the date itself, and the source that produced
 * it. A date with no source cannot be explained to the person who is going to repeat it to
 * a client, and it cannot be argued with when it turns out to be wrong.
 *
 * <p>Both are null together. There is no date for a case on hold or waiting on documents,
 * and inventing one would be worse than the call it saves.
 *
 * @param caseId the case this is the status of
 * @param stage where the case is now
 * @param expectedDate when a decision is expected, where a source knows
 * @param expectedDateSource which source that was — "registry-evidence" or "screening"
 */
public record CaseStatus(String caseId, CaseStageValue stage, LocalDate expectedDate, String expectedDateSource) {

    public String procedureStageCode() {
        return stage.procedureStageCode();
    }
}
