package se.norrbank.onboarding.v1;

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
 * The 2016 case API. Consumed by the ops console and by the RM workspace's case list.
 */
@RestController
@RequestMapping("/v1/cases")
public class CaseController {

    private final CaseService cases;
    private final DocumentService documents;
    private final LegacyCaseMapper mapper;
    private final SsoPrincipalResolver principals;

    public CaseController(CaseService cases, DocumentService documents, LegacyCaseMapper mapper, SsoPrincipalResolver principals) {
        this.cases = cases;
        this.documents = documents;
        this.mapper = mapper;
        this.principals = principals;
    }

    @GetMapping
    public List<CaseDto> list(HttpServletRequest request) {
        SsoPrincipal principal = principals.resolve(request);
        List<OnboardingCase> visible = principal.isOnboardingOperations()
                ? cases.openCases()
                : cases.forRelationshipManager(principal.userId());
        return visible.stream()
                .map(onboardingCase -> mapper.toDto(onboardingCase, documents.forCase(onboardingCase.getCaseId())))
                .collect(Collectors.toList());
    }

    @GetMapping("/{caseId}")
    public ResponseEntity<CaseDto> byId(@PathVariable String caseId, HttpServletRequest request) {
        principals.resolve(request);
        OnboardingCase onboardingCase = cases.require(caseId);
        return ResponseEntity.ok(mapper.toDto(onboardingCase, documents.forCase(caseId)));
    }
}
