package se.norrbank.onboarding.v2.cases;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import se.norrbank.onboarding.core.cases.CaseNumber;
import se.norrbank.onboarding.core.cases.CaseService;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CaseQueryControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CaseService cases;

    @BeforeEach
    void seedOneCase() {
        if (cases.forRelationshipManager("s.lundin").isEmpty()) {
            cases.open(new CaseNumber("ONB-2026-000501"), "5560112233", "Vasa Logistik AB", "s.lundin");
        }
    }

    @Test
    void listsTheCasesTheCallerOwns() throws Exception {
        mockMvc.perform(get("/v2/cases")
                        .header("X-Norrbank-User", "s.lundin")
                        .header("X-Norrbank-Roles", "RM"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].caseId").value("ONB-2026-000501"))
                .andExpect(jsonPath("$[0].lifecycleStatus").value("INITIATED"));
    }

    @Test
    void readsOneCaseById() throws Exception {
        mockMvc.perform(get("/v2/cases/ONB-2026-000501")
                        .header("X-Norrbank-User", "s.lundin")
                        .header("X-Norrbank-Roles", "RM"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.legalName").value("Vasa Logistik AB"))
                .andExpect(jsonPath("$.documentsOutstanding").value(4));
    }

    @Test
    void refusesARequestThatDidNotComeThroughTheGateway() throws Exception {
        mockMvc.perform(get("/v2/cases")).andExpect(status().isBadRequest());
    }

    @Test
    void returnsNotFoundForAnUnknownCase() throws Exception {
        mockMvc.perform(get("/v2/cases/ONB-2026-999999")
                        .header("X-Norrbank-User", "s.lundin")
                        .header("X-Norrbank-Roles", "RM"))
                .andExpect(status().isNotFound());
    }
}
