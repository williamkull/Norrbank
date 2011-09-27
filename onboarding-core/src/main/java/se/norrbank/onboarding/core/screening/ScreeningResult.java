package se.norrbank.onboarding.core.screening;

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
 * One screening result row, posted by screening-batch after each nightly run.
 *
 * <p>Written by the batch, read by everyone else. Nothing in this service recomputes a
 * screening result, and no controller may.
 */
@Entity
@Table(name = "screening_result")
public class ScreeningResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "result_id")
    private Long resultId;

    @Column(name = "case_id", nullable = false, length = 20)
    private String caseId;

    @Column(name = "party_ref", nullable = false, length = 64)
    private String partyRef;

    @Column(name = "list_name", nullable = false, length = 40)
    private String listName;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", nullable = false, length = 20)
    private ScreeningOutcome outcome;

    @Column(name = "run_date", nullable = false)
    private Instant runDate;

    protected ScreeningResult() {
        // JPA
    }

    public Long getResultId() {
        return resultId;
    }

    public String getCaseId() {
        return caseId;
    }

    public String getPartyRef() {
        return partyRef;
    }

    public String getListName() {
        return listName;
    }

    public ScreeningOutcome getOutcome() {
        return outcome;
    }

    public Instant getRunDate() {
        return runDate;
    }

    public boolean isBlocking() {
        return outcome == ScreeningOutcome.CONFIRMED_MATCH || outcome == ScreeningOutcome.PENDING_REVIEW;
    }
}
