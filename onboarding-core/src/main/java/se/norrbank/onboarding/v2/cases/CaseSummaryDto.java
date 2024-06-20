package se.norrbank.onboarding.v2.cases;

import java.time.Instant;

/**
 * Case summary as v2 returns it. ISO-8601 UTC timestamps, no fixed-width rendering,
 * unknown fields tolerated by every v2 client.
 */
public record CaseSummaryDto(
        String caseId,
        String orgNo,
        String legalName,
        String lifecycleStatus,
        Instant openedAt,
        Instant updatedAt,
        int documentsOutstanding) {
}
