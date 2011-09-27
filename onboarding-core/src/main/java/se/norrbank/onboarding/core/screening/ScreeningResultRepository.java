package se.norrbank.onboarding.core.screening;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScreeningResultRepository extends JpaRepository<ScreeningResult, Long> {

    List<ScreeningResult> findByCaseId(String caseId);

    List<ScreeningResult> findByCaseIdAndOutcome(String caseId, ScreeningOutcome outcome);
}
