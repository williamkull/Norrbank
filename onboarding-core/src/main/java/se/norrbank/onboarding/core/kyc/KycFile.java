package se.norrbank.onboarding.core.kyc;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

/**
 * The KYC file for a case: risk rating, the review cycle, and whether the ownership
 * picture has been evidenced.
 */
@Entity
@Table(name = "kyc_file")
public class KycFile {

    @Id
    @Column(name = "case_id", nullable = false, length = 20)
    private String caseId;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_rating", nullable = false, length = 10)
    private KycRiskRating riskRating;

    @Column(name = "ownership_evidenced", nullable = false)
    private boolean ownershipEvidenced;

    @Column(name = "next_review_date")
    private LocalDate nextReviewDate;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected KycFile() {
        // JPA
    }

    public KycFile(String caseId, KycRiskRating riskRating, Instant updatedAt) {
        this.caseId = caseId;
        this.riskRating = riskRating;
        this.ownershipEvidenced = false;
        this.updatedAt = updatedAt;
    }

    public String getCaseId() {
        return caseId;
    }

    public KycRiskRating getRiskRating() {
        return riskRating;
    }

    public boolean isOwnershipEvidenced() {
        return ownershipEvidenced;
    }

    public LocalDate getNextReviewDate() {
        return nextReviewDate;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public boolean requiresRegistryEvidence() {
        return riskRating == KycRiskRating.HIGH || riskRating == KycRiskRating.EDD;
    }

    public void markOwnershipEvidenced(Instant at) {
        this.ownershipEvidenced = true;
        this.updatedAt = at;
    }

    public void rerate(KycRiskRating rating, Instant at) {
        this.riskRating = rating;
        this.updatedAt = at;
    }
}
