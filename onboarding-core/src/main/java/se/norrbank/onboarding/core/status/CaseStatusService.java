package se.norrbank.onboarding.core.status;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import se.norrbank.onboarding.core.cases.CaseService;
import se.norrbank.onboarding.core.registry.RegistryEvidenceReadService;
import se.norrbank.onboarding.core.stage.CaseStageReadService;
import se.norrbank.onboarding.core.stage.CaseStageValue;

/**
 * The status of a case as a relationship manager needs it: the stage it is in, and the date
 * it is expected to reach a decision where one is known.
 *
 * <p>The date carries the source it came from: "we do not know" and "the registry expects
 * the evidence on the 24th" are different answers, and telling them apart is the call.
 */
@Service
public class CaseStatusService {

    private static final LocalTime SCREENING_RUN = LocalTime.of(2, 0);
    private static final ZoneId RUN_ZONE = ZoneId.of("Europe/Stockholm");

    private final CaseStageReadService stages;
    private final RegistryEvidenceReadService registryEvidence;
    private final CaseService cases;
    private final Clock clock;

    public CaseStatusService(
            CaseStageReadService stages,
            RegistryEvidenceReadService registryEvidence,
            CaseService cases,
            Clock clock) {
        this.stages = stages;
        this.registryEvidence = registryEvidence;
        this.cases = cases;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public CaseStatus forCase(String caseId) {
        CaseStageValue stage = stages.currentStage(caseId);
        if (stage == CaseStageValue.AWAITING_REGISTRY_EVIDENCE) {
            String orgNo = cases.require(caseId).getOrgNo();
            return registryEvidence.expectedCompletionFor(orgNo)
                    .map(date -> new CaseStatus(caseId, stage, date, "registry-evidence"))
                    .orElseGet(() -> new CaseStatus(caseId, stage, null, null));
        }
        if (stage == CaseStageValue.SCREENING_IN_PROGRESS) {
            return new CaseStatus(caseId, stage, nextScreeningRun(), "screening");
        }
        return new CaseStatus(caseId, stage, null, null);
    }

    /**
     * The date of the next nightly run. A case with no stage recorded is waiting for that
     * run and for nothing else, so the run is the honest answer to when it moves.
     */
    private LocalDate nextScreeningRun() {
        ZonedDateTime now = clock.instant().atZone(RUN_ZONE);
        return now.toLocalTime().isBefore(SCREENING_RUN) ? now.toLocalDate() : now.toLocalDate().plusDays(1);
    }
}
