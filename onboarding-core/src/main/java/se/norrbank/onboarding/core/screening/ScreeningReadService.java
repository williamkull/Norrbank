package se.norrbank.onboarding.core.screening;

import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only access to screening results for the rest of the service.
 *
 * <p>There is deliberately no write path here. Screening results are the batch's to write.
 */
@Service
public class ScreeningReadService {

    private final ScreeningResultRepository results;

    public ScreeningReadService(ScreeningResultRepository results) {
        this.results = results;
    }

    @Transactional(readOnly = true)
    public List<ScreeningResult> forCase(String caseId) {
        return results.findByCaseId(caseId);
    }

    @Transactional(readOnly = true)
    public boolean hasBlockingResult(String caseId) {
        return results.findByCaseId(caseId).stream().anyMatch(ScreeningResult::isBlocking);
    }
}
