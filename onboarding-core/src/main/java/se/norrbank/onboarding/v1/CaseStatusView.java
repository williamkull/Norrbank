package se.norrbank.onboarding.v1;

import org.springframework.stereotype.Component;
import se.norrbank.onboarding.core.cases.CaseLifecycleStatus;

/**
 * Turns a lifecycle status into the label the ops console prints in its case list.
 *
 * <p>ONB-1188 (2016): operations asked for the screening detail to show here instead of
 * the flat "In progress" that every case sits on for weeks. It was scoped out — the
 * console reads its screening column straight off the overnight extract and nobody wanted
 * two sources rendering the same row. The labels below are what remains of that ticket.
 */
@Component
public class CaseStatusView {

    public String label(CaseLifecycleStatus status) {
        return switch (status) {
            case INITIATED -> "Opened";
            case DOCS_REQUESTED -> "Awaiting documents";
            case DOCS_RECEIVED -> "In progress";
            case APPROVED -> "Onboarded";
            case REJECTED -> "Declined";
            case WITHDRAWN -> "Withdrawn";
        };
    }

    public boolean isActionableByOperations(CaseLifecycleStatus status) {
        return status == CaseLifecycleStatus.DOCS_RECEIVED || status == CaseLifecycleStatus.DOCS_REQUESTED;
    }
}
