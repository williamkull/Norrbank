package se.norrbank.onboarding.core.approvals;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * One leg of the four-eyes approval. Two rows with different approver ids and both
 * {@link ApprovalDecision#APPROVE} are what an approved case means to the auditor.
 *
 * <p>The stage code recorded here is the KYC procedure's own code, and it is the value
 * the audit trail carries.
 */
@Entity
@Table(name = "case_approval")
public class Approval {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "approval_id")
    private Long approvalId;

    @Column(name = "case_id", nullable = false, length = 20)
    private String caseId;

    @Column(name = "approver_id", nullable = false, length = 40)
    private String approverId;

    @Enumerated(EnumType.STRING)
    @Column(name = "decision", nullable = false, length = 30)
    private ApprovalDecision decision;

    @Column(name = "procedure_stage_code", nullable = false, length = 30)
    private String procedureStageCode;

    @Column(name = "decided_at", nullable = false)
    private Instant decidedAt;

    protected Approval() {
        // JPA
    }

    public Approval(String caseId, String approverId, ApprovalDecision decision, String procedureStageCode, Instant decidedAt) {
        this.caseId = caseId;
        this.approverId = approverId;
        this.decision = decision;
        this.procedureStageCode = procedureStageCode;
        this.decidedAt = decidedAt;
    }

    public Long getApprovalId() {
        return approvalId;
    }

    public String getCaseId() {
        return caseId;
    }

    public String getApproverId() {
        return approverId;
    }

    public ApprovalDecision getDecision() {
        return decision;
    }

    public String getProcedureStageCode() {
        return procedureStageCode;
    }

    public Instant getDecidedAt() {
        return decidedAt;
    }
}
