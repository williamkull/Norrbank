package se.norrbank.onboarding.core.cases;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class CaseNumberTest {

    @Test
    void acceptsTheOperationsFormat() {
        CaseNumber number = new CaseNumber("ONB-2026-004119");
        assertThat(number.year()).isEqualTo(2026);
        assertThat(number.toString()).isEqualTo("ONB-2026-004119");
    }

    @Test
    void rejectsAnythingElse() {
        assertThatThrownBy(() -> new CaseNumber("ONB-26-4119"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ONB-YYYY-NNNNNN");
    }

    @Test
    void rejectsNull() {
        assertThatThrownBy(() -> new CaseNumber(null)).isInstanceOf(IllegalArgumentException.class);
    }
}
