package se.norrbank.onboarding.core.stage;

import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only access to the stage the nightly run recorded.
 *
 * <p>There is deliberately no write path here, for the same reason ScreeningReadService has
 * none: the stage is the batch's to derive and to write.
 */
@Service
public class CaseStageReadService {

    private final CaseStageRepository rows;

    public CaseStageReadService(CaseStageRepository rows) {
        this.rows = rows;
    }

    /**
     * The stage recorded for this case.
     *
     * <p>A case with no row has not been staged yet — it was opened since the last run —
     * and the next run will pick it up. That is a stage in its own right rather than an
     * absence, so it is answered as one and the caller has no null to forget.
     */
    @Transactional(readOnly = true)
    public CaseStageValue currentStage(String caseId) {
        return forCase(caseId).map(CaseStageRow::getStage).orElse(CaseStageValue.SCREENING_IN_PROGRESS);
    }

    @Transactional(readOnly = true)
    public Optional<CaseStageRow> forCase(String caseId) {
        return rows.findById(caseId);
    }
}
