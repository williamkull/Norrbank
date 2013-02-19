package se.norrbank.onboarding.core.documents;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentRepository extends JpaRepository<CaseDocument, Long> {

    List<CaseDocument> findByCaseId(String caseId);

    List<CaseDocument> findByCaseIdAndVerifiedAtIsNull(String caseId);
}
