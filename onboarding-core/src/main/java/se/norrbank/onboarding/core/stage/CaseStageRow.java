package se.norrbank.onboarding.core.stage;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

/**
 * One row of case_stage, posted by screening-batch after each nightly run.
 *
 * <p>Written by the batch, read here and nowhere else. Nothing in this service derives a
 * stage, and no controller may: this row reports the stage, it does not decide it.
 */
@Entity
@Table(name = "case_stage")
public class CaseStageRow {

    @Id
    @Column(name = "case_id", nullable = false, length = 20)
    private String caseId;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage", nullable = false, length = 30)
    private CaseStageValue stage;

    @Column(name = "procedure_stage_code", nullable = false, length = 30)
    private String procedureStageCode;

    @Column(name = "expected_decision_date")
    private LocalDate expectedDecisionDate;

    @Column(name = "stage_since", nullable = false)
    private Instant stageSince;

    @Column(name = "run_id", length = 16)
    private String runId;

    @Column(name = "derived_at", nullable = false)
    private Instant derivedAt;

    protected CaseStageRow() {
        // JPA
    }

    public CaseStageRow(String caseId, CaseStageValue stage, Instant stageSince) {
        this(caseId, stage, null, stageSince, null, stageSince);
    }

    public CaseStageRow(
            String caseId,
            CaseStageValue stage,
            LocalDate expectedDecisionDate,
            Instant stageSince,
            String runId,
            Instant derivedAt) {
        this.caseId = caseId;
        this.stage = stage;
        this.procedureStageCode = stage.procedureStageCode();
        this.expectedDecisionDate = expectedDecisionDate;
        this.stageSince = stageSince;
        this.runId = runId;
        this.derivedAt = derivedAt;
    }

    public String getCaseId() {
        return caseId;
    }

    public CaseStageValue getStage() {
        return stage;
    }

    public String getProcedureStageCode() {
        return procedureStageCode;
    }

    public LocalDate getExpectedDecisionDate() {
        return expectedDecisionDate;
    }

    public Instant getStageSince() {
        return stageSince;
    }

    public String getRunId() {
        return runId;
    }

    public Instant getDerivedAt() {
        return derivedAt;
    }
}
