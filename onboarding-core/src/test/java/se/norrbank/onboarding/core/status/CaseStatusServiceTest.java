package se.norrbank.onboarding.core.status;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import se.norrbank.onboarding.core.cases.CaseNumber;
import se.norrbank.onboarding.core.cases.CaseService;
import se.norrbank.onboarding.core.stage.CaseStageRepository;
import se.norrbank.onboarding.core.stage.CaseStageRow;
import se.norrbank.onboarding.core.stage.CaseStageValue;

/**
 * ONB-2140. plan.md: a case awaiting registry evidence carries the date that evidence is
 * expected back, not a blank field.
 */
@SpringBootTest
@ActiveProfiles("test")
class CaseStatusServiceTest {

    @Autowired
    private CaseStatusService statuses;

    @Autowired
    private CaseService cases;

    @Autowired
    private CaseStageRepository stages;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void registryEvidenceTable() {
        // registry_evidence belongs to registry-link's own schema.sql, not to a migration of
        // ours; the two services read the same database, but each test module gets its own
        // H2, so the shape has to exist here too.
        jdbc.execute("""
                create table if not exists registry_evidence (
                    org_no varchar(12) primary key,
                    legal_name varchar(200) not null,
                    evidence_status varchar(30) not null,
                    expected_completion date,
                    ubo_name varchar(200),
                    updated_at date not null
                )
                """);
    }

    @Test
    void aCaseAwaitingRegistryEvidenceCarriesTheExpectedDate() {
        cases.open(new CaseNumber("ONB-2026-000601"), "5560112233", "Vasa Logistik AB", "s.lundin");
        stages.save(new CaseStageRow(
                "ONB-2026-000601", CaseStageValue.AWAITING_REGISTRY_EVIDENCE, Instant.parse("2026-09-08T06:00:00Z")));
        jdbc.update(
                "insert into registry_evidence (org_no, legal_name, evidence_status, expected_completion, ubo_name, updated_at) "
                        + "values (?, ?, 'REGISTRY_PENDING', ?, ?, ?)",
                "5560112233", "Vasa Logistik AB", LocalDate.of(2026, 9, 24), "Astrid Hellström", LocalDate.of(2026, 9, 8));

        CaseStatus status = statuses.forCase("ONB-2026-000601");

        assertThat(status.stage()).isEqualTo(CaseStageValue.AWAITING_REGISTRY_EVIDENCE);
        assertThat(status.expectedDate()).isEqualTo(LocalDate.of(2026, 9, 24));
        assertThat(status.expectedDateSource()).isEqualTo("registry-evidence");
    }

    @Test
    void aCaseWithNoOpenSourceForADateCarriesNone() {
        cases.open(new CaseNumber("ONB-2026-000602"), "5566778899", "Bergslagen Industri AB", "s.lundin");
        stages.save(new CaseStageRow(
                "ONB-2026-000602", CaseStageValue.DOCUMENTS_OUTSTANDING, Instant.parse("2026-09-08T06:00:00Z")));

        CaseStatus status = statuses.forCase("ONB-2026-000602");

        assertThat(status.expectedDate()).isNull();
        assertThat(status.expectedDateSource()).isNull();
    }
}
