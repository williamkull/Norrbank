package se.norrbank.onboarding.core.screening;

/**
 * Outcome of one sanctions or PEP check on one party.
 *
 * <p>This is a per-party result, not a case stage. The batch derives a case-level stage
 * from these and writes it where the ops console reads it.
 */
public enum ScreeningOutcome {
    CLEAR,
    POSSIBLE_MATCH,
    CONFIRMED_MATCH,
    PENDING_REVIEW
}
