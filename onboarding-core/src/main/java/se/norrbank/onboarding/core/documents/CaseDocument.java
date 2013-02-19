package se.norrbank.onboarding.core.documents;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "case_document")
public class CaseDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "document_id")
    private Long documentId;

    @Column(name = "case_id", nullable = false, length = 20)
    private String caseId;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 40)
    private DocumentType documentType;

    @Column(name = "archive_ref", nullable = false, length = 64)
    private String archiveRef;

    @Column(name = "received_at", nullable = false)
    private Instant receivedAt;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    protected CaseDocument() {
        // JPA
    }

    public CaseDocument(String caseId, DocumentType documentType, String archiveRef, Instant receivedAt) {
        this.caseId = caseId;
        this.documentType = documentType;
        this.archiveRef = archiveRef;
        this.receivedAt = receivedAt;
    }

    public Long getDocumentId() {
        return documentId;
    }

    public String getCaseId() {
        return caseId;
    }

    public DocumentType getDocumentType() {
        return documentType;
    }

    public String getArchiveRef() {
        return archiveRef;
    }

    public Instant getReceivedAt() {
        return receivedAt;
    }

    public Instant getVerifiedAt() {
        return verifiedAt;
    }

    public boolean isVerified() {
        return verifiedAt != null;
    }

    public void markVerified(Instant at) {
        this.verifiedAt = at;
    }
}
