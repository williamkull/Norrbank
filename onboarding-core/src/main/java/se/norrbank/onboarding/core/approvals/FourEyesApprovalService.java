package se.norrbank.onboarding.core.approvals;

import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Four-eyes approval. Two distinct approvers, both approving, and neither of them the
 * relationship manager who opened the case.
 */
@Service
public class FourEyesApprovalService {

    private final ApprovalRepository approvals;
    private final Clock clock;

    public FourEyesApprovalService(ApprovalRepository approvals, Clock clock) {
        this.approvals = approvals;
        this.clock = clock;
    }

    @Transactional
    public Approval record(String caseId, String approverId, ApprovalDecision decision, String procedureStageCode) {
        boolean alreadyDecided = approvals.findByCaseId(caseId).stream()
                .anyMatch(existing -> existing.getApproverId().equals(approverId));
        if (alreadyDecided) {
            throw new IllegalStateException("approver " + approverId + " has already decided case " + caseId);
        }
        return approvals.save(new Approval(caseId, approverId, decision, procedureStageCode, clock.instant()));
    }

    @Transactional(readOnly = true)
    public boolean isFourEyesComplete(String caseId) {
        List<Approval> decided = approvals.findByCaseId(caseId);
        long distinctApprovals = decided.stream()
                .filter(approval -> approval.getDecision() == ApprovalDecision.APPROVE)
                .map(Approval::getApproverId)
                .distinct()
                .count();
        return distinctApprovals >= 2;
    }

    @Transactional(readOnly = true)
    public List<Approval> forCase(String caseId) {
        return approvals.findByCaseId(caseId);
    }
}
