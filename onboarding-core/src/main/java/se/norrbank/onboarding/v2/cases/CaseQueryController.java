package se.norrbank.onboarding.v2.cases;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import se.norrbank.onboarding.api.SsoPrincipal;
import se.norrbank.onboarding.api.SsoPrincipalResolver;
import se.norrbank.onboarding.core.cases.CaseService;
import se.norrbank.onboarding.core.cases.OnboardingCase;
import se.norrbank.onboarding.core.documents.DocumentService;

/**
 * Case queries, v2. The first endpoint migrated off v1; the RM workspace case list
 * moved over in 2024.
 */
@RestController
@RequestMapping("/v2/cases")
public class CaseQueryController {

    private final CaseService cases;
    private final DocumentService documents;
    private final CaseSummaryMapper mapper;
    private final SsoPrincipalResolver principals;

    public CaseQueryController(CaseService cases, DocumentService documents, CaseSummaryMapper mapper, SsoPrincipalResolver principals) {
        this.cases = cases;
        this.documents = documents;
        this.mapper = mapper;
        this.principals = principals;
    }

    @GetMapping
    public List<CaseSummaryDto> list(HttpServletRequest request) {
        SsoPrincipal principal = principals.resolve(request);
        List<OnboardingCase> visible = principal.isOnboardingOperations()
                ? cases.openCases()
                : cases.forRelationshipManager(principal.userId());
        return visible.stream().map(this::summarise).collect(Collectors.toList());
    }

    @GetMapping("/{caseId}")
    public ResponseEntity<CaseSummaryDto> byId(@PathVariable String caseId, HttpServletRequest request) {
        principals.resolve(request);
        return ResponseEntity.ok(summarise(cases.require(caseId)));
    }

    private CaseSummaryDto summarise(OnboardingCase onboardingCase) {
        int outstanding = documents.outstandingFor(onboardingCase.getCaseId()).size();
        return mapper.toSummary(onboardingCase, outstanding);
    }
}
