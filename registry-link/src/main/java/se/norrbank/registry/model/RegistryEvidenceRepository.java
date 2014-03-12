package se.norrbank.registry.model;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * The registry evidence table. Owned by this service; nothing else writes it.
 */
public class RegistryEvidenceRepository {

    /**
     * Standard SQL MERGE rather than a dialect-specific upsert. The deployed database is
     * Postgres and the tests run H2; ON CONFLICT is Postgres-only and does not parse in H2,
     * which is how the previous H2-only MERGE went unnoticed against a Postgres URL.
     */
    private static final String UPSERT = """
            merge into registry_evidence t
            using (values (?, ?, ?, cast(? as date), ?, cast(? as date)))
                  s (org_no, legal_name, evidence_status, expected_completion, ubo_name, updated_at)
               on t.org_no = s.org_no
             when matched then update set
                  legal_name          = s.legal_name,
                  evidence_status     = s.evidence_status,
                  expected_completion = s.expected_completion,
                  ubo_name            = s.ubo_name,
                  updated_at          = s.updated_at
             when not matched then insert
                  (org_no, legal_name, evidence_status, expected_completion, ubo_name, updated_at)
                  values (s.org_no, s.legal_name, s.evidence_status, s.expected_completion, s.ubo_name, s.updated_at)
            """;

    private static final String BY_ORG_NO = """
            select org_no, legal_name, evidence_status, expected_completion, ubo_name, updated_at
              from registry_evidence
             where org_no = ?
            """;

    private static final String OUTSTANDING = """
            select org_no, legal_name, evidence_status, expected_completion, ubo_name, updated_at
              from registry_evidence
             where evidence_status <> 'REGISTRY_COMPLETE'
             order by org_no
            """;

    private final Connection connection;

    public RegistryEvidenceRepository(Connection connection) {
        this.connection = connection;
    }

    public void save(RegistryEvidenceRow row) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(UPSERT)) {
            statement.setString(1, row.orgNo());
            statement.setString(2, row.legalName());
            statement.setString(3, row.status().name());
            statement.setDate(4, row.expectedCompletion() == null ? null : Date.valueOf(row.expectedCompletion()));
            statement.setString(5, row.uboName());
            statement.setDate(6, Date.valueOf(row.updatedAt()));
            statement.executeUpdate();
        }
    }

    public Optional<RegistryEvidenceRow> findByOrgNo(String orgNo) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(BY_ORG_NO)) {
            statement.setString(1, orgNo);
            try (ResultSet rows = statement.executeQuery()) {
                return rows.next() ? Optional.of(read(rows)) : Optional.empty();
            }
        }
    }

    public List<RegistryEvidenceRow> outstanding() throws SQLException {
        List<RegistryEvidenceRow> rows = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(OUTSTANDING);
             ResultSet results = statement.executeQuery()) {
            while (results.next()) {
                rows.add(read(results));
            }
        }
        return rows;
    }

    private RegistryEvidenceRow read(ResultSet rows) throws SQLException {
        Date expected = rows.getDate("expected_completion");
        Date updated = rows.getDate("updated_at");
        return new RegistryEvidenceRow(
                rows.getString("org_no"),
                rows.getString("legal_name"),
                RegistryEvidenceStatus.valueOf(rows.getString("evidence_status")),
                expected == null ? null : expected.toLocalDate(),
                rows.getString("ubo_name"),
                updated == null ? LocalDate.EPOCH : updated.toLocalDate());
    }
}
