package se.norrbank.onboarding.core.cases;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface CaseRepository extends JpaRepository<OnboardingCase, String> {

    Optional<OnboardingCase> findByOrgNo(String orgNo);

    List<OnboardingCase> findByRelationshipManagerId(String relationshipManagerId);

    @Query("select c from OnboardingCase c where c.lifecycleStatus not in "
            + "(se.norrbank.onboarding.core.cases.CaseLifecycleStatus.APPROVED, "
            + " se.norrbank.onboarding.core.cases.CaseLifecycleStatus.REJECTED, "
            + " se.norrbank.onboarding.core.cases.CaseLifecycleStatus.WITHDRAWN)")
    List<OnboardingCase> findAllOpen();
}
