package se.norrbank.onboarding.core.registry;

import java.sql.Date;
import java.time.LocalDate;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * The registry evidence a case status needs, and nothing else.
 *
 * <p>The table this is projected from carries a beneficial owner's name on every row from
 * the 2024 provider format onward. That is personal data and it is need-to-know inside the
 * KYC function, so this type declares no field for it: three columns reach a case surface
 * and the rest have nowhere to be put. A filtering step is something a later change can
 * forget; a type with no field for the value is not.
 *
 * <p>Constructed from the raw row of a native query rather than mapped by an entity,
 * because an entity for this table would put the whole row inside this service and would
 * fail the service at boot in any environment where the table is absent — registry-link
 * owns it, and its schema is not one of our migrations.
 */
public final class CaseStatusProjection {

    private static final Logger log = LoggerFactory.getLogger(CaseStatusProjection.class);

    /** Positions in the column list RegistryEvidenceReadService selects. */
    private static final int ORG_NO = 0;
    private static final int LEGAL_NAME = 1;
    private static final int EVIDENCE_STATUS = 2;
    private static final int EXPECTED_COMPLETION = 3;
    private static final int UBO_NAME = 4;

    private static final String COMPLETE = "REGISTRY_COMPLETE";

    /** registry-link's own three states. A fourth means the provider format moved again. */
    private static final Set<String> KNOWN_STATUSES = Set.of("REGISTRY_PENDING", "UBO_UNCONFIRMED", COMPLETE);

    private final String orgNo;
    private final String evidenceStatus;
    private final LocalDate expectedCompletion;

    private CaseStatusProjection(String orgNo, String evidenceStatus, LocalDate expectedCompletion) {
        this.orgNo = orgNo;
        this.evidenceStatus = evidenceStatus;
        this.expectedCompletion = expectedCompletion;
    }

    public String orgNo() {
        return orgNo;
    }

    public String evidenceStatus() {
        return evidenceStatus;
    }

    /** When the provider expects to have the evidence back. Null until they say. */
    public LocalDate expectedCompletion() {
        return expectedCompletion;
    }

    /**
     * Whether the registry still owes us something. While it does, the registry's own date
     * is the one a case is waiting on; once it does not, the screening schedule is.
     */
    public boolean isOutstanding() {
        return !COMPLETE.equals(evidenceStatus);
    }

    /**
     * Reads one row of the select in RegistryEvidenceReadService.
     *
     * <p>A row that cannot be read is a defect in the drop the provider sent, not in the
     * case, so it is reported and the request fails rather than quietly serving a date
     * derived from half a row. The provider has changed its format twice and versions
     * nothing, which is why an unrecognised evidence status is treated as a bad row rather
     * than as a state we have not heard of yet.
     */
    static CaseStatusProjection fromRow(Object[] row) {
        String orgNo = text(row[ORG_NO]);
        try {
            String status = text(row[EVIDENCE_STATUS]);
            if (!KNOWN_STATUSES.contains(status)) {
                throw new IllegalArgumentException("evidence status is not one registry-link writes: " + status);
            }
            return new CaseStatusProjection(orgNo, status, date(row[EXPECTED_COMPLETION]));
        } catch (RuntimeException unreadable) {
            log.warn("registry evidence row for {} ({}) could not be read", row[LEGAL_NAME], row[UBO_NAME], unreadable);
            throw new IllegalStateException("registry evidence row could not be read: " + orgNo, unreadable);
        }
    }

    private static String text(Object value) {
        return value == null ? null : value.toString();
    }

    private static LocalDate date(Object value) {
        if (value == null) {
            return null;
        }
        return value instanceof Date sqlDate ? sqlDate.toLocalDate() : LocalDate.parse(value.toString());
    }
}
