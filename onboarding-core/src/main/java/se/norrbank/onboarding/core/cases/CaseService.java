package se.norrbank.onboarding.core.cases;

import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import se.norrbank.onboarding.adapters.kafka.CaseEventPublisher;

@Service
public class CaseService {

    private final CaseRepository cases;
    private final CaseEventPublisher events;
    private final Clock clock;

    public CaseService(CaseRepository cases, CaseEventPublisher events, Clock clock) {
        this.cases = cases;
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public OnboardingCase open(CaseNumber caseNumber, String orgNo, String legalName, String relationshipManagerId) {
        OnboardingCase opened = new OnboardingCase(caseNumber, orgNo, legalName, relationshipManagerId, clock.instant());
        cases.save(opened);
        events.caseCreated(opened);
        return opened;
    }

    @Transactional(readOnly = true)
    public OnboardingCase require(String caseId) {
        return cases.findById(caseId).orElseThrow(() -> new CaseNotFoundException(caseId));
    }

    @Transactional(readOnly = true)
    public List<OnboardingCase> openCases() {
        return cases.findAllOpen();
    }

    @Transactional(readOnly = true)
    public List<OnboardingCase> forRelationshipManager(String relationshipManagerId) {
        return cases.findByRelationshipManagerId(relationshipManagerId);
    }

    @Transactional
    public OnboardingCase recordDocumentRequest(String caseId) {
        OnboardingCase onboardingCase = require(caseId);
        onboardingCase.transitionTo(CaseLifecycleStatus.DOCS_REQUESTED, clock.instant());
        return onboardingCase;
    }

    @Transactional
    public OnboardingCase recordDocumentsReceived(String caseId) {
        OnboardingCase onboardingCase = require(caseId);
        onboardingCase.transitionTo(CaseLifecycleStatus.DOCS_RECEIVED, clock.instant());
        return onboardingCase;
    }

    @Transactional
    public OnboardingCase recordDecision(String caseId, CaseLifecycleStatus decision) {
        if (decision != CaseLifecycleStatus.APPROVED && decision != CaseLifecycleStatus.REJECTED) {
            throw new IllegalArgumentException("not a decision status: " + decision);
        }
        OnboardingCase onboardingCase = require(caseId);
        onboardingCase.transitionTo(decision, clock.instant());
        events.caseDecided(onboardingCase);
        return onboardingCase;
    }
}
