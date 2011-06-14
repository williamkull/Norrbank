package se.norrbank.onboarding.core.cases;

/**
 * Lifecycle of an onboarding case as this service records it.
 *
 * <p>These are the transitions core owns and writes. A case can sit in
 * {@link #DOCS_RECEIVED} for several weeks while other parts of the estate work on it.
 */
public enum CaseLifecycleStatus {

    /** Case opened by the relationship manager or by operations. */
    INITIATED,

    /** Document request sent to the client. */
    DOCS_REQUESTED,

    /** Client has returned documents. Nothing further is recorded here until a decision. */
    DOCS_RECEIVED,

    /** Four-eyes approval completed, client onboarded. */
    APPROVED,

    /** Declined. Terminal. */
    REJECTED,

    /** Client withdrew the application. Terminal. */
    WITHDRAWN;

    public boolean isTerminal() {
        return this == APPROVED || this == REJECTED || this == WITHDRAWN;
    }

    public boolean isOpen() {
        return !isTerminal();
    }
}
