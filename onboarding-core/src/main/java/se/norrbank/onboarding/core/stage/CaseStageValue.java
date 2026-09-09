package se.norrbank.onboarding.core.stage;

/**
 * Case stage as the case_stage table carries it.
 *
 * <p>Each value carries the KYC procedure's own code for it (procedure 4.2 §6). That code,
 * not this enum's name, is what the four-eyes approval records and what the audit trail
 * carries, so anything showing a stage outside operations shows the code beside it. Two
 * values share a code because the procedure has fewer stages than a case surface needs.
 */
public enum CaseStageValue {

    /** The KYC file has no owners or directors on it yet, so nothing has been screened. */
    DOCUMENTS_OUTSTANDING("SCR-QUEUED"),

    /** No stage recorded: the case is picked up by the next run. */
    SCREENING_IN_PROGRESS("SCR-QUEUED"),

    /** Waiting on the company registry and UBO provider. The long one. */
    AWAITING_REGISTRY_EVIDENCE("EDD-PENDING"),

    /** A politically exposed person match needs an analyst decision. */
    UNDER_ANALYST_REVIEW("PEP-REVIEW"),

    /** A sanctions hit blocks the case until compliance clears it. */
    ON_HOLD("SAN-HOLD"),

    /** Screening complete and clear. The case can proceed to approval. */
    READY_FOR_DECISION("EDD-COMPLETE");

    private final String procedureStageCode;

    CaseStageValue(String procedureStageCode) {
        this.procedureStageCode = procedureStageCode;
    }

    public String procedureStageCode() {
        return procedureStageCode;
    }
}
