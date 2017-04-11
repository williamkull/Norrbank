package se.norrbank.onboarding.core.kyc;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * A board member or signatory of the applicant company. Personal data, same handling
 * rules as {@link BeneficialOwner}.
 */
@Entity
@Table(name = "case_director")
public class Director {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "director_id")
    private Long directorId;

    @Column(name = "case_id", nullable = false, length = 20)
    private String caseId;

    @Column(name = "full_name", nullable = false, length = 200)
    private String fullName;

    @Column(name = "role", nullable = false, length = 60)
    private String role;

    @Column(name = "is_signatory", nullable = false)
    private boolean signatory;

    protected Director() {
        // JPA
    }

    public Director(String caseId, String fullName, String role, boolean signatory) {
        this.caseId = caseId;
        this.fullName = fullName;
        this.role = role;
        this.signatory = signatory;
    }

    public Long getDirectorId() {
        return directorId;
    }

    public String getCaseId() {
        return caseId;
    }

    public String getFullName() {
        return fullName;
    }

    public String getRole() {
        return role;
    }

    public boolean isSignatory() {
        return signatory;
    }
}
