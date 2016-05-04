package se.norrbank.onboarding.v1;

public class DocumentDto {

    private Long documentId;
    private String documentType;
    private String receivedAt;
    private boolean verified;

    public DocumentDto() {
        // Jackson
    }

    public Long getDocumentId() {
        return documentId;
    }

    public void setDocumentId(Long documentId) {
        this.documentId = documentId;
    }

    public String getDocumentType() {
        return documentType;
    }

    public void setDocumentType(String documentType) {
        this.documentType = documentType;
    }

    public String getReceivedAt() {
        return receivedAt;
    }

    public void setReceivedAt(String receivedAt) {
        this.receivedAt = receivedAt;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }
}
