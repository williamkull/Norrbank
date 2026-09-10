package se.norrbank.onboarding.core.registry;

import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Read-only access to the company registry evidence registry-link imports.
 *
 * <p>registry_evidence belongs to registry-link and is not one of our migrations, so it is
 * read through a native query rather than mapped by an entity. An entity would have to be
 * present at boot in every environment, and a service that will not start is a worse
 * failure than a status field that cannot be filled in.
 *
 * <p>The column list is registry-link's own, copied from RegistryEvidenceRepository so the
 * two stay recognisable as the same read. What comes back is narrowed by
 * CaseStatusProjection, which has nowhere to put the columns a case surface may not carry.
 */
@Service
public class RegistryEvidenceReadService {

    private static final String BY_ORG_NO = """
            select org_no, legal_name, evidence_status, expected_completion, ubo_name, updated_at
              from registry_evidence
             where org_no = ?1
            """;

    private final EntityManager entityManager;

    public RegistryEvidenceReadService(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    /**
     * The date the registry expects to have the evidence back, while it still owes us any.
     * Empty once the evidence is complete: from then on the case is waiting on screening,
     * not on the registry, and the registry's date would be a date about the past.
     */
    @Transactional(readOnly = true)
    public Optional<LocalDate> expectedCompletionFor(String orgNo) {
        return forOrgNo(orgNo)
                .filter(CaseStatusProjection::isOutstanding)
                .map(CaseStatusProjection::expectedCompletion);
    }

    @Transactional(readOnly = true)
    public Optional<CaseStatusProjection> forOrgNo(String orgNo) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(BY_ORG_NO).setParameter(1, orgNo).getResultList();
        return rows.isEmpty() ? Optional.empty() : Optional.of(CaseStatusProjection.fromRow(rows.get(0)));
    }
}
