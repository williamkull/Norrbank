package se.norrbank.onboarding.core.cases;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/**
 * A corporate client onboarding case.
 *
 * <p>One row per application. The organisation number identifies the prospective
 * corporate client; the relationship manager owns the case throughout.
 */
@Entity
@Table(name = "onboarding_case")
public class OnboardingCase {

    @Id
    @Column(name = "case_id", nullable = false, length = 20)
    private String caseId;

    @Column(name = "org_no", nullable = false, length = 12)
    private String orgNo;

    @Column(name = "legal_name", nullable = false, length = 200)
    private String legalName;

    @Column(name = "rm_user_id", nullable = false, length = 40)
    private String relationshipManagerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "lifecycle_status", nullable = false, length = 20)
    private CaseLifecycleStatus lifecycleStatus;

    @Column(name = "opened_at", nullable = false)
    private Instant openedAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected OnboardingCase() {
        // JPA
    }

    public OnboardingCase(CaseNumber caseNumber, String orgNo, String legalName, String relationshipManagerId, Instant openedAt) {
        this.caseId = caseNumber.value();
        this.orgNo = orgNo;
        this.legalName = legalName;
        this.relationshipManagerId = relationshipManagerId;
        this.lifecycleStatus = CaseLifecycleStatus.INITIATED;
        this.openedAt = openedAt;
        this.updatedAt = openedAt;
    }

    public String getCaseId() {
        return caseId;
    }

    public CaseNumber getCaseNumber() {
        return new CaseNumber(caseId);
    }

    public String getOrgNo() {
        return orgNo;
    }

    public String getLegalName() {
        return legalName;
    }

    public String getRelationshipManagerId() {
        return relationshipManagerId;
    }

    public CaseLifecycleStatus getLifecycleStatus() {
        return lifecycleStatus;
    }

    public Instant getOpenedAt() {
        return openedAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    void transitionTo(CaseLifecycleStatus next, Instant at) {
        if (lifecycleStatus.isTerminal()) {
            throw new IllegalStateException("case " + caseId + " is terminal at " + lifecycleStatus);
        }
        this.lifecycleStatus = next;
        this.updatedAt = at;
    }
}
