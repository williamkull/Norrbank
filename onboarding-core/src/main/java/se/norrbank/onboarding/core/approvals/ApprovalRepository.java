package se.norrbank.onboarding.core.approvals;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApprovalRepository extends JpaRepository<Approval, Long> {

    List<Approval> findByCaseId(String caseId);
}
