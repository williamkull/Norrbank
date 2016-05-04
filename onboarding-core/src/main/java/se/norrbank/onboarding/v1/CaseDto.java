package se.norrbank.onboarding.v1;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/**
 * The case representation the RM workspace and the ops console have consumed since 2016.
 *
 * <p>Both clients pin field order and both break on an unknown field, so this shape has
 * not changed since the Java 8 days.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CaseDto {

    private String caseId;
    private String orgNo;
    private String legalName;
    private String relationshipManager;
    private String status;
    private String openedAt;
    private String updatedAt;
    private List<DocumentDto> documents;

    public CaseDto() {
        // Jackson
    }

    public String getCaseId() {
        return caseId;
    }

    public void setCaseId(String caseId) {
        this.caseId = caseId;
    }

    public String getOrgNo() {
        return orgNo;
    }

    public void setOrgNo(String orgNo) {
        this.orgNo = orgNo;
    }

    public String getLegalName() {
        return legalName;
    }

    public void setLegalName(String legalName) {
        this.legalName = legalName;
    }

    public String getRelationshipManager() {
        return relationshipManager;
    }

    public void setRelationshipManager(String relationshipManager) {
        this.relationshipManager = relationshipManager;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getOpenedAt() {
        return openedAt;
    }

    public void setOpenedAt(String openedAt) {
        this.openedAt = openedAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public List<DocumentDto> getDocuments() {
        return documents;
    }

    public void setDocuments(List<DocumentDto> documents) {
        this.documents = documents;
    }
}
