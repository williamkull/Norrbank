package se.norrbank.screening.job;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import se.norrbank.screening.rules.PartyScreeningResult;

/**
 * Posts the party results of a run into screening_result.
 *
 * <p>Results only. The case stage this run derives does not go into the database; it goes
 * into the stage file.
 */
public class ResultWriter {

    private static final String INSERT = """
            insert into screening_result (case_id, party_ref, list_name, outcome, run_date)
            values (?, ?, ?, ?, ?)
            """;

    private final Connection connection;

    public ResultWriter(Connection connection) {
        this.connection = connection;
    }

    public int write(List<PartyScreeningResult> results, Instant runDate) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(INSERT)) {
            for (PartyScreeningResult result : results) {
                statement.setString(1, result.caseId());
                statement.setString(2, result.partyRef());
                statement.setString(3, result.list().name());
                statement.setString(4, result.outcome().name());
                statement.setTimestamp(5, Timestamp.from(runDate));
                statement.addBatch();
            }
            return statement.executeBatch().length;
        }
    }
}
