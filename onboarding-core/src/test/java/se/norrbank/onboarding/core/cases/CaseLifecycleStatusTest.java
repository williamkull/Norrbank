package se.norrbank.onboarding.core.cases;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CaseLifecycleStatusTest {

    @Test
    void decisionsAreTerminal() {
        assertThat(CaseLifecycleStatus.APPROVED.isTerminal()).isTrue();
        assertThat(CaseLifecycleStatus.REJECTED.isTerminal()).isTrue();
        assertThat(CaseLifecycleStatus.WITHDRAWN.isTerminal()).isTrue();
    }

    @Test
    void everythingElseIsOpen() {
        assertThat(CaseLifecycleStatus.INITIATED.isOpen()).isTrue();
        assertThat(CaseLifecycleStatus.DOCS_REQUESTED.isOpen()).isTrue();
        assertThat(CaseLifecycleStatus.DOCS_RECEIVED.isOpen()).isTrue();
    }
}
