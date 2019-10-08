package se.norrbank.onboarding.adapters.kafka;

import java.time.Instant;
import java.util.Map;

/**
 * Envelope for anything this service publishes. The payload shapes are defined by the
 * Avro schemas under src/main/resources/schemas.
 */
public record CaseEvent(String eventType, String caseId, Instant occurredAt, Map<String, String> payload) {
}
