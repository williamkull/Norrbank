package se.norrbank.onboarding.v2.cases;

import java.time.LocalDate;
import se.norrbank.onboarding.core.stage.CaseStageValue;
import se.norrbank.onboarding.core.status.CaseStatus;

/**
 * Case status as v2 returns it.
 *
 * <p>Codes on the wire, never prose. The KYC procedure's code stays verbatim and the plain
 * wording an RM reads is the workspace's to own; a service that shipped the sentence would
 * be shipping brand copy on an unversioned surface.
 *
 * <p>The date is an ISO-8601 calendar date, not a hand-formatted string, and null when no
 * source knows one.
 */
public record CaseStatusDto(
        String caseId,
        String stage,
        String procedureStageCode,
        String nextStep,
        LocalDate expectedDate,
        String expectedDateSource) {

    public static CaseStatusDto from(CaseStatus status, int documentsOutstanding) {
        return new CaseStatusDto(
                status.caseId(),
                status.stage().name(),
                status.procedureStageCode(),
                nextStep(status.stage(), documentsOutstanding),
                status.expectedDate(),
                status.expectedDateSource());
    }

    /**
     * What the case is waiting on. Documents outrank the stage: a case whose owner has not
     * sent a certificate of incorporation is waiting on that, whatever the last run made of
     * the parties it could see.
     */
    private static String nextStep(CaseStageValue stage, int documentsOutstanding) {
        if (documentsOutstanding > 0) {
            return "AWAITING_DOCUMENTS";
        }
        return switch (stage) {
            case DOCUMENTS_OUTSTANDING -> "AWAITING_DOCUMENTS";
            case SCREENING_IN_PROGRESS -> "AWAITING_SCREENING";
            case AWAITING_REGISTRY_EVIDENCE -> "AWAITING_REGISTRY_EVIDENCE";
            case UNDER_ANALYST_REVIEW -> "AWAITING_ANALYST_DECISION";
            case ON_HOLD -> "AWAITING_COMPLIANCE_CLEARANCE";
            case READY_FOR_DECISION -> "AWAITING_APPROVAL";
        };
    }
}
