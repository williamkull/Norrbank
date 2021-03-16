package se.norrbank.onboarding.core.approvals;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class FourEyesApprovalServiceTest {

    @Autowired
    private FourEyesApprovalService approvals;

    @Test
    void oneApprovalIsNotFourEyes() {
        approvals.record("ONB-2026-000010", "o.haddad", ApprovalDecision.APPROVE, "EDD-COMPLETE");
        assertThat(approvals.isFourEyesComplete("ONB-2026-000010")).isFalse();
    }

    @Test
    void twoDistinctApproversComplete() {
        approvals.record("ONB-2026-000011", "o.haddad", ApprovalDecision.APPROVE, "EDD-COMPLETE");
        approvals.record("ONB-2026-000011", "m.lindqvist", ApprovalDecision.APPROVE, "EDD-COMPLETE");
        assertThat(approvals.isFourEyesComplete("ONB-2026-000011")).isTrue();
    }

    @Test
    void theSameApproverCannotDecideTwice() {
        approvals.record("ONB-2026-000012", "o.haddad", ApprovalDecision.APPROVE, "EDD-COMPLETE");
        assertThatThrownBy(() -> approvals.record("ONB-2026-000012", "o.haddad", ApprovalDecision.APPROVE, "EDD-COMPLETE"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("already decided");
    }

    @Test
    void aRejectionDoesNotCountTowardsFourEyes() {
        approvals.record("ONB-2026-000013", "o.haddad", ApprovalDecision.APPROVE, "EDD-COMPLETE");
        approvals.record("ONB-2026-000013", "m.lindqvist", ApprovalDecision.RETURN_FOR_INFORMATION, "EDD-PENDING");
        assertThat(approvals.isFourEyesComplete("ONB-2026-000013")).isFalse();
    }
}
