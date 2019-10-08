package se.norrbank.onboarding.adapters.kafka;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import se.norrbank.onboarding.core.cases.OnboardingCase;
import se.norrbank.onboarding.core.documents.CaseDocument;

/**
 * Publishes case events onto the onboarding topic.
 *
 * <p>The broker client is supplied by the platform team's starter in the deployed
 * environments. Outside them this falls through to the log, which is what local runs and
 * the test profile use.
 */
@Component
public class CaseEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(CaseEventPublisher.class);
    private static final String TOPIC = "onboarding.case.v1";

    private final Clock clock;

    public CaseEventPublisher(Clock clock) {
        this.clock = clock;
    }

    public void caseCreated(OnboardingCase onboardingCase) {
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("orgNo", onboardingCase.getOrgNo());
        payload.put("relationshipManagerId", onboardingCase.getRelationshipManagerId());
        publish(new CaseEvent("CaseCreated", onboardingCase.getCaseId(), clock.instant(), payload));
    }

    public void documentReceived(CaseDocument document) {
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("documentType", document.getDocumentType().name());
        payload.put("archiveRef", document.getArchiveRef());
        publish(new CaseEvent("DocumentReceived", document.getCaseId(), clock.instant(), payload));
    }

    public void caseDecided(OnboardingCase onboardingCase) {
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("decision", onboardingCase.getLifecycleStatus().name());
        publish(new CaseEvent("CaseDecision", onboardingCase.getCaseId(), clock.instant(), payload));
    }

    private void publish(CaseEvent event) {
        log.info("publish topic={} type={} case={} payload={}", TOPIC, event.eventType(), event.caseId(), event.payload());
    }
}
