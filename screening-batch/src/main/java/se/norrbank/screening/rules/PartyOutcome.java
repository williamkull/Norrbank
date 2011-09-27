package se.norrbank.screening.rules;

/** Outcome of screening one party against one list. Mirrors screening_result.outcome. */
public enum PartyOutcome {
    CLEAR,
    POSSIBLE_MATCH,
    CONFIRMED_MATCH,
    PENDING_REVIEW
}
