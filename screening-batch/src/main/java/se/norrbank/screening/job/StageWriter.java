package se.norrbank.screening.job;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import se.norrbank.screening.stage.CaseStage;
import se.norrbank.screening.stage.StageFileRecord;

/**
 * Writes the case stage this run derived into case_stage, beside the screening_result write
 * it already does.
 *
 * <p>The stage file remains the run's contract and its bytes are untouched by this class.
 * This table exists so a request can read the stage without going near the file or the lock
 * operations schedules other work around.
 *
 * <p>Two things differ from the stage file. The value written is the vocabulary the case
 * surfaces use, not this module's own enum name — the enum name is an operations word and
 * the procedure code travels beside it. And the expected decision date is anchored: it is
 * computed from the instant the case entered its stage, once, so a case that stands still
 * for three weeks keeps the date it was given rather than being handed a new one every
 * night.
 *
 * <p>Standard SQL MERGE rather than a dialect-specific upsert, the same idiom and for the
 * same reason as registry-link's RegistryEvidenceRepository: the deployed database is
 * Postgres and the tests run H2, and ON CONFLICT does not parse in H2.
 */
public class StageWriter {

    private static final String CURRENT = """
            select stage, stage_since, expected_decision_date
              from case_stage
             where case_id = ?
            """;

    private static final String UPSERT = """
            merge into case_stage t
            using (values (?, ?, ?, cast(? as date), cast(? as timestamp), ?, cast(? as timestamp)))
                  s (case_id, stage, procedure_stage_code, expected_decision_date, stage_since, run_id, derived_at)
               on t.case_id = s.case_id
             when matched then update set
                  stage                  = s.stage,
                  procedure_stage_code   = s.procedure_stage_code,
                  expected_decision_date = s.expected_decision_date,
                  stage_since            = s.stage_since,
                  run_id                 = s.run_id,
                  derived_at             = s.derived_at
             when not matched then insert
                  (case_id, stage, procedure_stage_code, expected_decision_date, stage_since, run_id, derived_at)
                  values (s.case_id, s.stage, s.procedure_stage_code, s.expected_decision_date,
                          s.stage_since, s.run_id, s.derived_at)
            """;

    private final Connection connection;

    public StageWriter(Connection connection) {
        this.connection = connection;
    }

    public int write(List<StageFileRecord> records, Instant runDate, String runId) throws SQLException {
        int written = 0;
        for (StageFileRecord record : records) {
            written += write(record, runDate, runId);
        }
        return written;
    }

    private int write(StageFileRecord record, Instant runDate, String runId) throws SQLException {
        String stage = caseStageValue(record.stage());
        Instant stageSince = anchorFor(record.caseId(), stage, runDate);
        LocalDate expected = expectedDecision(record.stage(), stageSince);
        try (PreparedStatement statement = connection.prepareStatement(UPSERT)) {
            statement.setString(1, record.caseId());
            statement.setString(2, stage);
            statement.setString(3, record.stage().procedureStageCode());
            statement.setDate(4, expected == null ? null : Date.valueOf(expected));
            statement.setTimestamp(5, Timestamp.from(stageSince));
            statement.setString(6, runId);
            statement.setTimestamp(7, Timestamp.from(runDate));
            return statement.executeUpdate();
        }
    }

    /**
     * The instant the case entered the stage it is in now. Unchanged while the stage is
     * unchanged, which is the whole point of the column.
     */
    private Instant anchorFor(String caseId, String stage, Instant runDate) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(CURRENT)) {
            statement.setString(1, caseId);
            try (ResultSet rows = statement.executeQuery()) {
                if (rows.next() && stage.equals(rows.getString("stage"))) {
                    Timestamp since = rows.getTimestamp("stage_since");
                    if (since != null) {
                        return since.toInstant();
                    }
                }
            }
        }
        return runDate;
    }

    /**
     * The date operations quotes when a client asks, computed from the anchor rather than
     * from today. The offsets are the run's own; only what they are counted from changed.
     */
    private static LocalDate expectedDecision(CaseStage stage, Instant stageSince) {
        LocalDate from = stageSince.atZone(ZoneOffset.UTC).toLocalDate();
        return switch (stage) {
            case SCREENING_CLEARED -> from.plusDays(2);
            case SCREENING_QUEUED -> from.plusDays(5);
            case PEP_REVIEW -> from.plusDays(10);
            case SANCTIONS_HOLD, EDD_PENDING -> null;
        };
    }

    /**
     * This run's stage, in the vocabulary the case_stage table carries.
     *
     * <p>A case with nothing to screen has produced no party results, which is what
     * SCREENING_QUEUED means here: the KYC file has no owners or directors on it yet, so the
     * documents that name them have not arrived.
     */
    static String caseStageValue(CaseStage stage) {
        return switch (stage) {
            case SCREENING_QUEUED -> "DOCUMENTS_OUTSTANDING";
            case EDD_PENDING -> "AWAITING_REGISTRY_EVIDENCE";
            case PEP_REVIEW -> "UNDER_ANALYST_REVIEW";
            case SANCTIONS_HOLD -> "ON_HOLD";
            case SCREENING_CLEARED -> "READY_FOR_DECISION";
        };
    }
}
