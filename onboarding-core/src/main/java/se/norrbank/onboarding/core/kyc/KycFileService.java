package se.norrbank.onboarding.core.kyc;

import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class KycFileService {

    private final KycFileRepository files;
    private final BeneficialOwnerRepository owners;
    private final Clock clock;

    public KycFileService(KycFileRepository files, BeneficialOwnerRepository owners, Clock clock) {
        this.files = files;
        this.owners = owners;
        this.clock = clock;
    }

    @Transactional
    public KycFile openFile(String caseId, KycRiskRating rating) {
        return files.save(new KycFile(caseId, rating, clock.instant()));
    }

    @Transactional(readOnly = true)
    public List<BeneficialOwner> ownersAwaitingRegistry(String caseId) {
        return owners.findByCaseIdAndRegistryConfirmedFalse(caseId);
    }

    @Transactional
    public void confirmOwnership(String caseId) {
        List<BeneficialOwner> outstanding = owners.findByCaseIdAndRegistryConfirmedFalse(caseId);
        outstanding.forEach(BeneficialOwner::confirmAgainstRegistry);
        if (outstanding.isEmpty()) {
            files.findByCaseId(caseId).ifPresent(file -> file.markOwnershipEvidenced(clock.instant()));
        }
    }
}
