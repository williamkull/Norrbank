package se.norrbank.onboarding.core.stage;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * The case_stage table.
 *
 * <p>The save path exists for tests and for nothing else; in every environment the rows
 * arrive from screening-batch, which writes them with its own connection.
 */
public interface CaseStageRepository extends JpaRepository<CaseStageRow, String> {

    List<CaseStageRow> findByDerivedAtBefore(Instant instant);
}
