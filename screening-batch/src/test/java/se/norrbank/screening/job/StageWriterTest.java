package se.norrbank.screening.job;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.sql.Connection;
import java.sql.Date;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import se.norrbank.screening.stage.CaseStage;
import se.norrbank.screening.stage.StageFileRecord;

/**
 * Exercises the case_stage write against a database.
 *
 * <p>PostgreSQL compatibility mode, because the deployed database is Postgres and the merge
 * has to be valid there — the same reason registry-link's repository test runs this way.
 */
class StageWriterTest {

    private static final Instant NIGHT_ONE = Instant.parse("2026-09-08T00:03:00Z");
    private static final Instant NIGHT_TWO = Instant.parse("2026-09-09T00:03:00Z");

    private Connection connection;
    private StageWriter writer;

    @BeforeEach
    void openDatabase() throws SQLException {
        connection = DriverManager.getConnection(
                "jdbc:h2:mem:stage-" + System.nanoTime() + ";MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE", "sa", "");
        try (Statement statement = connection.createStatement()) {
            statement.execute("""
                    create table case_stage (
                        case_id                varchar(20) primary key,
                        stage                  varchar(30) not null,
                        procedure_stage_code   varchar(30) not null,
                        expected_decision_date date,
                        stage_since            timestamp   not null,
                        run_id                 varchar(16),
                        derived_at             timestamp   not null
                    )
                    """);
        }
        writer = new StageWriter(connection);
    }

    @AfterEach
    void closeDatabase() throws SQLException {
        connection.close();
    }

    @Test
    void theAnchoredDateDoesNotMoveWhenTheStageIsUnchanged() throws SQLException {
        writer.write(List.of(staged(CaseStage.SCREENING_CLEARED)), NIGHT_ONE, "run-one");
        LocalDate first = expectedDate();

        writer.write(List.of(staged(CaseStage.SCREENING_CLEARED)), NIGHT_TWO, "run-two");

        assertNotNull(first);
        assertEquals(first, expectedDate());
        assertEquals(NIGHT_ONE, stageSince());
    }

    @Test
    void aStageChangeResetsTheAnchorAndRecomputesTheDate() throws SQLException {
        writer.write(List.of(staged(CaseStage.SCREENING_CLEARED)), NIGHT_ONE, "run-one");

        writer.write(List.of(staged(CaseStage.PEP_REVIEW)), NIGHT_TWO, "run-two");

        assertEquals(NIGHT_TWO, stageSince());
        assertEquals(LocalDate.of(2026, 9, 19), expectedDate());
    }

    @Test
    void aCaseWaitingOnEvidenceOrOnComplianceCarriesNoDate() throws SQLException {
        writer.write(List.of(staged(CaseStage.EDD_PENDING)), NIGHT_ONE, "run-one");
        assertNull(expectedDate());

        writer.write(List.of(staged(CaseStage.SANCTIONS_HOLD)), NIGHT_TWO, "run-two");
        assertNull(expectedDate());
    }

    @Test
    void theRowCarriesTheProcedureCodeAndNotTheEnumName() throws SQLException {
        writer.write(List.of(staged(CaseStage.EDD_PENDING)), NIGHT_ONE, "run-one");

        assertEquals("EDD-PENDING", column("procedure_stage_code"));
        assertEquals("AWAITING_REGISTRY_EVIDENCE", column("stage"));
    }

    @Test
    void everyStageThisRunCanDeriveHasACaseStageValue() {
        for (CaseStage stage : CaseStage.values()) {
            assertNotNull(StageWriter.caseStageValue(stage), stage.name());
        }
    }

    private static StageFileRecord staged(CaseStage stage) {
        return new StageFileRecord("ONB-2026-004119", stage, LocalDate.of(2026, 9, 30), "a1b2c3d4");
    }

    private LocalDate expectedDate() throws SQLException {
        try (Statement statement = connection.createStatement();
                ResultSet rows = statement.executeQuery("select expected_decision_date from case_stage")) {
            if (!rows.next()) {
                return null;
            }
            Date value = rows.getDate(1);
            return value == null ? null : value.toLocalDate();
        }
    }

    private Instant stageSince() throws SQLException {
        try (Statement statement = connection.createStatement();
                ResultSet rows = statement.executeQuery("select stage_since from case_stage")) {
            return rows.next() ? rows.getTimestamp(1).toInstant() : null;
        }
    }

    private String column(String name) throws SQLException {
        try (Statement statement = connection.createStatement();
                ResultSet rows = statement.executeQuery("select " + name + " from case_stage")) {
            return rows.next() ? rows.getString(1) : null;
        }
    }
}
