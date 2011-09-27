package se.norrbank.screening.job;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Reads the open cases and their parties straight out of the onboarding database.
 *
 * <p>This predates the API, so it goes at the tables directly. Migrating it to the v2
 * endpoints has been on the list since 2019.
 */
public class CaseReader {

    private static final String OPEN_CASES = """
            select c.case_id,
                   coalesce(k.risk_rating, 'MEDIUM') as risk_rating
              from onboarding_case c
              left join kyc_file k on k.case_id = c.case_id
             where c.lifecycle_status not in ('APPROVED', 'REJECTED', 'WITHDRAWN')
             order by c.case_id
            """;

    private static final String PARTIES = """
            select full_name from beneficial_owner where case_id = ?
            union all
            select full_name from case_director where case_id = ?
            """;

    private final Connection connection;

    public CaseReader(Connection connection) {
        this.connection = connection;
    }

    public List<CaseToScreen> openCases() throws SQLException {
        List<CaseToScreen> cases = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(OPEN_CASES);
             ResultSet rows = statement.executeQuery()) {
            while (rows.next()) {
                String caseId = rows.getString("case_id");
                String riskRating = rows.getString("risk_rating");
                boolean edd = Arrays.asList("HIGH", "EDD").contains(riskRating);
                cases.add(new CaseToScreen(caseId, partiesFor(caseId), edd, null));
            }
        }
        return cases;
    }

    private List<String> partiesFor(String caseId) throws SQLException {
        List<String> parties = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(PARTIES)) {
            statement.setString(1, caseId);
            statement.setString(2, caseId);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    parties.add(rows.getString(1));
                }
            }
        }
        return parties;
    }
}
