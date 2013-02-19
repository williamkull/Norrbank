package se.norrbank.onboarding.core.documents;

import java.time.Clock;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import se.norrbank.onboarding.adapters.kafka.CaseEventPublisher;

@Service
public class DocumentService {

    /** The set operations will not open a case without. Everything else is risk-driven. */
    private static final Set<DocumentType> MANDATORY = EnumSet.of(
            DocumentType.CERTIFICATE_OF_INCORPORATION,
            DocumentType.ARTICLES_OF_ASSOCIATION,
            DocumentType.OWNERSHIP_STRUCTURE,
            DocumentType.TAX_RESIDENCY_SELF_CERTIFICATION);

    private final DocumentRepository documents;
    private final CaseEventPublisher events;
    private final Clock clock;

    public DocumentService(DocumentRepository documents, CaseEventPublisher events, Clock clock) {
        this.documents = documents;
        this.events = events;
        this.clock = clock;
    }

    @Transactional
    public CaseDocument record(String caseId, DocumentType type, String archiveRef) {
        CaseDocument document = new CaseDocument(caseId, type, archiveRef, clock.instant());
        documents.save(document);
        events.documentReceived(document);
        return document;
    }

    @Transactional(readOnly = true)
    public List<CaseDocument> forCase(String caseId) {
        return documents.findByCaseId(caseId);
    }

    @Transactional(readOnly = true)
    public Set<DocumentType> outstandingFor(String caseId) {
        Set<DocumentType> held = documents.findByCaseId(caseId).stream()
                .map(CaseDocument::getDocumentType)
                .collect(Collectors.toCollection(() -> EnumSet.noneOf(DocumentType.class)));
        Set<DocumentType> outstanding = EnumSet.copyOf(MANDATORY);
        outstanding.removeAll(held);
        return outstanding;
    }

    @Transactional
    public void markVerified(Long documentId) {
        documents.findById(documentId).ifPresent(document -> document.markVerified(clock.instant()));
    }
}
