package se.norrbank.onboarding.core.cases;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class OnboardingCaseTest {

    private static final Instant OPENED = Instant.parse("2026-08-03T09:12:00Z");

    private OnboardingCase newCase() {
        return new OnboardingCase(new CaseNumber("ONB-2026-004119"), "5566778899", "Bergslagen Industri AB", "e.sandberg", OPENED);
    }

    @Test
    void opensAtInitiated() {
        assertThat(newCase().getLifecycleStatus()).isEqualTo(CaseLifecycleStatus.INITIATED);
    }

    @Test
    void transitionStampsUpdatedAt() {
        OnboardingCase onboardingCase = newCase();
        Instant later = OPENED.plusSeconds(3600);
        onboardingCase.transitionTo(CaseLifecycleStatus.DOCS_REQUESTED, later);
        assertThat(onboardingCase.getUpdatedAt()).isEqualTo(later);
        assertThat(onboardingCase.getOpenedAt()).isEqualTo(OPENED);
    }

    @Test
    void willNotMoveOffATerminalStatus() {
        OnboardingCase onboardingCase = newCase();
        onboardingCase.transitionTo(CaseLifecycleStatus.APPROVED, OPENED.plusSeconds(60));
        assertThatThrownBy(() -> onboardingCase.transitionTo(CaseLifecycleStatus.REJECTED, OPENED.plusSeconds(120)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("terminal");
    }
}
