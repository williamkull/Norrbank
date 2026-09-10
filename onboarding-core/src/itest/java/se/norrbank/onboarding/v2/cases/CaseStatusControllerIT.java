package se.norrbank.onboarding.v2.cases;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import se.norrbank.onboarding.core.cases.CaseNumber;
import se.norrbank.onboarding.core.cases.CaseService;
import se.norrbank.onboarding.core.documents.DocumentService;
import se.norrbank.onboarding.core.documents.DocumentType;
import se.norrbank.onboarding.core.stage.CaseStageRepository;
import se.norrbank.onboarding.core.stage.CaseStageRow;
import se.norrbank.onboarding.core.stage.CaseStageValue;

/**
 * GET /v2/cases/{caseId}/status.
 *
 * <p>Cases here belong to p.astrom on purpose. The case list integration test asserts on
 * the first case s.lundin owns, and a test that seeds into another test's assumptions is a
 * test that fails for a reason nobody can find.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CaseStatusControllerIT {

    /** A beneficial owner name on the registry row. It must not come back in any response. */
    private static final String OWNER_NAME = "Ingrid Wallenberg-Sund";

    private static final String WAITING_ON_REGISTRY = "ONB-2026-000701";
    private static final String NOT_YET_STAGED = "ONB-2026-000702";
    private static final String ANOTHER_MANAGERS_CASE = "ONB-2026-000703";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CaseService cases;

    @Autowired
    private DocumentService documents;

    @Autowired
    private CaseStageRepository stages;

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void seedTheThreeCases() {
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
        if (!stages.existsById(WAITING_ON_REGISTRY)) {
            cases.open(new CaseNumber(WAITING_ON_REGISTRY), "5569001122", "Nordkap Shipping AB", "p.astrom");
            for (DocumentType type : DocumentType.values()) {
                documents.record(WAITING_ON_REGISTRY, type, "ARC-990" + type.ordinal());
            }
            stages.save(new CaseStageRow(
                    WAITING_ON_REGISTRY,
                    CaseStageValue.AWAITING_REGISTRY_EVIDENCE,
                    Instant.parse("2026-09-08T00:03:00Z")));
            jdbc.update(
                    "insert into registry_evidence (org_no, legal_name, evidence_status, expected_completion, ubo_name, updated_at) "
                            + "values (?, ?, 'REGISTRY_PENDING', ?, ?, ?)",
                    "5569001122",
                    "Nordkap Shipping AB",
                    LocalDate.of(2026, 9, 24),
                    OWNER_NAME,
                    LocalDate.of(2026, 9, 8));

            cases.open(new CaseNumber(NOT_YET_STAGED), "5564556677", "Malmö Fastighets AB", "p.astrom");
            cases.open(new CaseNumber(ANOTHER_MANAGERS_CASE), "5567889900", "Kiruna Mineral AB", "j.ek");
        }
    }

    @Test
    void showsThePlainStageValueAndTheProcedureCodeBesideIt() throws Exception {
        mockMvc.perform(get("/v2/cases/{caseId}/status", WAITING_ON_REGISTRY)
                        .header("X-Norrbank-User", "p.astrom")
                        .header("X-Norrbank-Roles", "RM"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stage").value("AWAITING_REGISTRY_EVIDENCE"))
                .andExpect(jsonPath("$.procedureStageCode").value("EDD-PENDING"));
    }

    @Test
    void saysWhatTheCaseIsWaitingOn() throws Exception {
        mockMvc.perform(get("/v2/cases/{caseId}/status", WAITING_ON_REGISTRY)
                        .header("X-Norrbank-User", "p.astrom")
                        .header("X-Norrbank-Roles", "RM"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.caseId").value(WAITING_ON_REGISTRY))
                .andExpect(jsonPath("$.nextStep").value("AWAITING_REGISTRY_EVIDENCE"));
    }

    @Test
    void tellsARelationshipManagerNothingAboutSomebodyElsesCase() throws Exception {
        mockMvc.perform(get("/v2/cases/{caseId}/status", ANOTHER_MANAGERS_CASE)
                        .header("X-Norrbank-User", "p.astrom")
                        .header("X-Norrbank-Roles", "RM"))
                .andExpect(status().isNotFound());
    }

    @Test
    void letsOnboardingOperationsReadAnyCase() throws Exception {
        mockMvc.perform(get("/v2/cases/{caseId}/status", ANOTHER_MANAGERS_CASE)
                        .header("X-Norrbank-User", "o.haddad")
                        .header("X-Norrbank-Roles", "ONB_OPS"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.caseId").value(ANOTHER_MANAGERS_CASE));
    }

    @Test
    void refusesARequestThatDidNotComeThroughTheGateway() throws Exception {
        mockMvc.perform(get("/v2/cases/{caseId}/status", WAITING_ON_REGISTRY)).andExpect(status().isBadRequest());
    }

    @Test
    void aCaseTheNightlyRunHasNotStagedYetIsWaitingForTheNextRun() throws Exception {
        mockMvc.perform(get("/v2/cases/{caseId}/status", NOT_YET_STAGED)
                        .header("X-Norrbank-User", "p.astrom")
                        .header("X-Norrbank-Roles", "RM"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stage").value("SCREENING_IN_PROGRESS"))
                .andExpect(jsonPath("$.expectedDateSource").value("screening"));
    }

    /**
     * C2. The projection has no field for the owner name, which is the guarantee; this is
     * the test that fails loudly if a later change maps the whole row after all.
     */
    @Test
    void neverPutsABeneficialOwnerNameInTheResponse() throws Exception {
        String body = mockMvc.perform(get("/v2/cases/{caseId}/status", WAITING_ON_REGISTRY)
                        .header("X-Norrbank-User", "p.astrom")
                        .header("X-Norrbank-Roles", "RM"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertThat(body).doesNotContain(OWNER_NAME);
    }
}
