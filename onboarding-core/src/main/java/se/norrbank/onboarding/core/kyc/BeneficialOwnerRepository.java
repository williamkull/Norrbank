package se.norrbank.onboarding.core.kyc;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BeneficialOwnerRepository extends JpaRepository<BeneficialOwner, Long> {

    List<BeneficialOwner> findByCaseId(String caseId);

    List<BeneficialOwner> findByCaseIdAndRegistryConfirmedFalse(String caseId);
}
