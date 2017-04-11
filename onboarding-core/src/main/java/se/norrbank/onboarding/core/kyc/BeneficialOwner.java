package se.norrbank.onboarding.core.kyc;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

/**
 * A natural person holding ultimate beneficial ownership of the applicant company.
 *
 * <p>Every field on this entity is personal data and is need-to-know inside the KYC
 * function. Nothing here is exposed on a customer-facing or relationship-manager surface.
 */
@Entity
@Table(name = "beneficial_owner")
public class BeneficialOwner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "case_id", nullable = false, length = 20)
    private String caseId;

    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(name = "country_of_residence", nullable = false, length = 2)
    private String countryOfResidence;

    @Column(name = "ownership_percent", nullable = false)
    private int ownershipPercent;

    @Column(name = "registry_confirmed", nullable = false)
    private boolean registryConfirmed;

    protected BeneficialOwner() {
        // JPA
    }

    public BeneficialOwner(String caseId, String fullName, LocalDate dateOfBirth, String countryOfResidence, int ownershipPercent) {
        this.caseId = caseId;
        this.fullName = fullName;
        this.dateOfBirth = dateOfBirth;
        this.countryOfResidence = countryOfResidence;
        this.ownershipPercent = ownershipPercent;
        this.registryConfirmed = false;
    }

    public Long getOwnerId() {
        return ownerId;
    }

    public String getCaseId() {
        return caseId;
    }

    public String getFullName() {
        return fullName;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public String getCountryOfResidence() {
        return countryOfResidence;
    }

    public int getOwnershipPercent() {
        return ownershipPercent;
    }

    public boolean isRegistryConfirmed() {
        return registryConfirmed;
    }

    public void confirmAgainstRegistry() {
        this.registryConfirmed = true;
    }
}
