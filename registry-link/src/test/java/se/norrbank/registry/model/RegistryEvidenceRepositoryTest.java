package se.norrbank.registry.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Exercises the write path against a database.
 *
 * <p>PostgreSQL compatibility mode, because the deployed database is Postgres and the
 * upsert has to be valid there. A dialect-specific statement that only ever ran in
 * production is the failure this test exists to prevent.
 */
class RegistryEvidenceRepositoryTest {

    private Connection connection;
    private RegistryEvidenceRepository repository;

    @BeforeEach
    void openDatabase() throws SQLException, IOException {
        connection = DriverManager.getConnection(
                "jdbc:h2:mem:registry-" + System.nanoTime() + ";MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE", "sa", "");
        String schema = Files.readString(Path.of("src/main/resources/schema.sql"), StandardCharsets.UTF_8);
        try (Statement statement = connection.createStatement()) {
            statement.execute(schema);
        }
        repository = new RegistryEvidenceRepository(connection);
    }

    @AfterEach
    void closeDatabase() throws SQLException {
        connection.close();
    }

    private RegistryEvidenceRow row(RegistryEvidenceStatus status, LocalDate expected, String uboName, LocalDate updated) {
        return new RegistryEvidenceRow("5566778899", "Bergslagen Industri AB", status, expected, uboName, updated);
    }

    @Test
    void savesANewRow() throws SQLException {
        repository.save(row(RegistryEvidenceStatus.REGISTRY_PENDING, LocalDate.of(2026, 9, 24), "Petter Nyholm", LocalDate.of(2026, 9, 3)));

        RegistryEvidenceRow stored = repository.findByOrgNo("5566778899").orElseThrow();
        assertEquals(RegistryEvidenceStatus.REGISTRY_PENDING, stored.status());
        assertEquals(LocalDate.of(2026, 9, 24), stored.expectedCompletion());
        assertEquals("Petter Nyholm", stored.uboName());
    }

    @Test
    void aLaterDropOverwritesTheSameOrgNo() throws SQLException {
        repository.save(row(RegistryEvidenceStatus.REGISTRY_PENDING, LocalDate.of(2026, 9, 24), "Petter Nyholm", LocalDate.of(2026, 9, 3)));
        repository.save(row(RegistryEvidenceStatus.REGISTRY_COMPLETE, null, "Petter Nyholm", LocalDate.of(2026, 9, 10)));

        RegistryEvidenceRow stored = repository.findByOrgNo("5566778899").orElseThrow();
        assertEquals(RegistryEvidenceStatus.REGISTRY_COMPLETE, stored.status());
        assertNull(stored.expectedCompletion());
        assertEquals(LocalDate.of(2026, 9, 10), stored.updatedAt());
        assertTrue(repository.outstanding().isEmpty(), "a completed row is no longer outstanding");
    }

    @Test
    void outstandingExcludesCompletedEvidence() throws SQLException {
        repository.save(new RegistryEvidenceRow("5560112233", "Vasa Logistik AB", RegistryEvidenceStatus.REGISTRY_COMPLETE, null, "Astrid Hellström", LocalDate.of(2026, 9, 3)));
        repository.save(row(RegistryEvidenceStatus.UBO_UNCONFIRMED, LocalDate.of(2026, 10, 1), "Petter Nyholm", LocalDate.of(2026, 9, 3)));

        assertEquals(1, repository.outstanding().size());
        assertEquals("5566778899", repository.outstanding().get(0).orgNo());
    }

    @Test
    void anUnknownOrgNoIsEmpty() throws SQLException {
        assertTrue(repository.findByOrgNo("5599999999").isEmpty());
    }

    @Test
    void swedishCharactersSurviveTheRoundTrip() throws SQLException {
        repository.save(new RegistryEvidenceRow("5564556677", "Malmö Fastighets AB", RegistryEvidenceStatus.REGISTRY_PENDING, LocalDate.of(2026, 9, 30), "Elsa Bergqvist", LocalDate.of(2026, 9, 3)));

        Optional<RegistryEvidenceRow> stored = repository.findByOrgNo("5564556677");
        assertEquals("Malmö Fastighets AB", stored.orElseThrow().legalName());
    }
}
