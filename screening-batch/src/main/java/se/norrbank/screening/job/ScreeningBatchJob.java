package se.norrbank.screening.job;

import java.io.IOException;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import se.norrbank.screening.rules.PartyScreener;
import se.norrbank.screening.rules.PartyScreeningResult;
import se.norrbank.screening.rules.ScreeningListProvider;
import se.norrbank.screening.rules.ScreeningRules;
import se.norrbank.screening.stage.CaseStage;
import se.norrbank.screening.stage.StageFileLock;
import se.norrbank.screening.stage.StageFileRecord;
import se.norrbank.screening.stage.StageFileWriter;

/**
 * The nightly screening run.
 *
 * <p>For every open case: screen each party against every list, post the party results to
 * the database, derive one case stage, and rewrite the stage file.
 *
 * <p>Scheduled by cron; see ops/screening-batch.cron.
 */
public class ScreeningBatchJob {

    private static final Logger log = LoggerFactory.getLogger(ScreeningBatchJob.class);

    /** How long to wait before the one retry on a stage file lock held by another host. */
    private static final Duration LOCK_RETRY_DELAY = Duration.ofSeconds(30);

    private final BatchConfiguration configuration;
    private final ScreeningListProvider listProvider;

    public ScreeningBatchJob(BatchConfiguration configuration, ScreeningListProvider listProvider) {
        this.configuration = configuration;
        this.listProvider = listProvider;
    }

    public static void main(String[] args) throws Exception {
        BatchConfiguration configuration = new BatchConfiguration();
        ScreeningBatchJob job = new ScreeningBatchJob(configuration, ScreeningListProvider.clearingProvider());
        try (Connection connection = DriverManager.getConnection(
                configuration.jdbcUrl(), configuration.jdbcUser(), configuration.jdbcPassword())) {
            int cases = job.run(connection);
            log.info("run complete, {} cases staged", cases);
        }
    }

    public int run(Connection connection) throws Exception {
        String runId = UUID.randomUUID().toString().substring(0, 8);
        Instant runDate = Instant.now();
        log.info("screening run {} starting, expected to hold the stage file for {}", runId, configuration.expectedRuntime());

        List<CaseToScreen> cases = new CaseReader(connection).openCases();
        PartyScreener screener = new PartyScreener(listProvider);
        ScreeningRules rules = new ScreeningRules();
        ResultWriter results = new ResultWriter(connection);

        List<StageFileRecord> stages = new ArrayList<>();
        for (CaseToScreen openCase : cases) {
            List<PartyScreeningResult> partyResults = new ArrayList<>();
            for (String party : openCase.partyRefs()) {
                partyResults.addAll(screener.screen(openCase.caseId(), party));
            }
            results.write(partyResults, runDate);

            CaseStage stage = rules.deriveStage(partyResults, openCase.enhancedDueDiligence());
            stages.add(new StageFileRecord(openCase.caseId(), stage, expectedDecision(stage), runId));
        }

        // Before the lock, deliberately. The stage list is complete by here, so the table
        // write adds nothing to the window operations schedules other work around. Its own
        // try/catch, because the stage file — not this table — is the run's contract, and a
        // run that aborts here would leave the ops console serving yesterday's stages.
        try {
            new StageWriter(connection).write(stages, runDate, runId);
        } catch (SQLException tableFailure) {
            log.error("case_stage write failed for run {}; the stage file write continues", runId, tableFailure);
        }

        StageFileWriter writer = new StageFileWriter(configuration.stageFilePath());
        try (StageFileLock ignored = acquireLock(configuration.stageFilePath())) {
            writer.writeAll(stages);
        }
        return stages.size();
    }

    /**
     * Takes the stage file lock, retrying once. A lock held by a job on another host clears
     * or it does not; a second attempt covers the first case and failing covers the second.
     */
    private static StageFileLock acquireLock(Path stageFile) throws IOException, InterruptedException {
        try {
            return StageFileLock.acquire(stageFile);
        } catch (IOException held) {
            log.warn("stage file is locked, retrying once in {}", LOCK_RETRY_DELAY);
            Thread.sleep(LOCK_RETRY_DELAY.toMillis());
            return StageFileLock.acquire(stageFile);
        }
    }

    /**
     * The date operations quotes when a client asks. Derived from the stage and nothing
     * else; cases waiting on registry evidence get no date here.
     */
    private LocalDate expectedDecision(CaseStage stage) {
        LocalDate today = LocalDate.now();
        return switch (stage) {
            case SCREENING_CLEARED -> today.plusDays(2);
            case SCREENING_QUEUED -> today.plusDays(5);
            case PEP_REVIEW -> today.plusDays(10);
            case SANCTIONS_HOLD -> null;
            case EDD_PENDING -> null;
        };
    }
}
