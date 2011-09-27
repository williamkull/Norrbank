package se.norrbank.screening.stage;

/**
 * Case stage as the screening run understands it.
 *
 * <p>These are the stages a case moves through between the point documents arrive and the
 * point a decision can be made. The run derives one of these per open case and writes it
 * to the stage file the ops console reads.
 *
 * <p>Each stage carries the KYC procedure's own code for it (procedure 4.2 §6). That code,
 * not this enum's name, is what the four-eyes approval records and what the audit trail
 * carries, so anything showing a stage outside operations shows the code.
 */
public enum CaseStage {

    /** Queued for the next run. Set when a case first becomes screenable. */
    SCREENING_QUEUED("Queued for screening", "SCR-QUEUED"),

    /** Enhanced due diligence outstanding. The long one; cases sit here for weeks. */
    EDD_PENDING("Enhanced due diligence in progress", "EDD-PENDING"),

    /** A politically exposed person match needs an analyst decision. */
    PEP_REVIEW("Politically exposed person review", "PEP-REVIEW"),

    /** A sanctions hit blocks the case until compliance clears it. */
    SANCTIONS_HOLD("On hold, sanctions review", "SAN-HOLD"),

    /** Screening complete and clear. The case can proceed to approval. */
    SCREENING_CLEARED("Screening complete", "EDD-COMPLETE");

    private final String opsConsoleLabel;
    private final String procedureStageCode;

    CaseStage(String opsConsoleLabel, String procedureStageCode) {
        this.opsConsoleLabel = opsConsoleLabel;
        this.procedureStageCode = procedureStageCode;
    }

    public String opsConsoleLabel() {
        return opsConsoleLabel;
    }

    /**
     * The KYC procedure's code for this stage. This is the value that goes on any surface
     * outside operations, and the value {@code case_approval.procedure_stage_code} records
     * when a case is decided.
     */
    public String procedureStageCode() {
        return procedureStageCode;
    }
}
