package se.norrbank.onboarding.core.kyc;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KycFileRepository extends JpaRepository<KycFile, String> {

    Optional<KycFile> findByCaseId(String caseId);

    List<KycFile> findByRiskRating(KycRiskRating riskRating);
}
