package se.norrbank.onboarding.v2.cases;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import se.norrbank.onboarding.api.SsoPrincipal;
import se.norrbank.onboarding.api.SsoPrincipalResolver;
import se.norrbank.onboarding.core.cases.CaseNotFoundException;
import se.norrbank.onboarding.core.cases.CaseService;
import se.norrbank.onboarding.core.cases.OnboardingCase;
import se.norrbank.onboarding.core.documents.DocumentService;
import se.norrbank.onboarding.core.status.CaseStatus;
import se.norrbank.onboarding.core.status.CaseStatusService;

/**
 * Where a case stands, for the relationship manager who owns it.
 *
 * <p>Matched by the /v2/** glob the gateway already forwards, so no route changes with it.
 */
@RestController
@RequestMapping("/v2/cases")
public class CaseStatusController {

    private final CaseService cases;
    private final CaseStatusService statuses;
    private final DocumentService documents;
    private final SsoPrincipalResolver principals;

    public CaseStatusController(
            CaseService cases,
            CaseStatusService statuses,
            DocumentService documents,
            SsoPrincipalResolver principals) {
        this.cases = cases;
        this.statuses = statuses;
        this.documents = documents;
        this.principals = principals;
    }

    @GetMapping("/{caseId}/status")
    public ResponseEntity<CaseStatusDto> byId(@PathVariable String caseId, HttpServletRequest request) {
        SsoPrincipal principal = principals.resolve(request);
        OnboardingCase onboardingCase = cases.require(caseId);
        if (!visibleTo(principal, onboardingCase)) {
            // Not found rather than forbidden: that a case with this id exists is itself
            // something the caller has no business learning.
            throw new CaseNotFoundException(caseId);
        }
        CaseStatus status = statuses.forCase(caseId);
        return ResponseEntity.ok(CaseStatusDto.from(status, documents.outstandingFor(caseId).size()));
    }

    private boolean visibleTo(SsoPrincipal principal, OnboardingCase onboardingCase) {
        return principal.isOnboardingOperations()
                || onboardingCase.getRelationshipManagerId().equals(principal.userId());
    }
}
