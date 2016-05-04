package se.norrbank.onboarding.v1;

import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import se.norrbank.onboarding.core.cases.OnboardingCase;
import se.norrbank.onboarding.core.documents.CaseDocument;

@Component
public class LegacyCaseMapper {

    public CaseDto toDto(OnboardingCase onboardingCase, List<CaseDocument> documents) {
        CaseDto dto = new CaseDto();
        dto.setCaseId(onboardingCase.getCaseId());
        dto.setOrgNo(onboardingCase.getOrgNo());
        dto.setLegalName(onboardingCase.getLegalName());
        dto.setRelationshipManager(onboardingCase.getRelationshipManagerId());
        dto.setStatus(onboardingCase.getLifecycleStatus().name());
        dto.setOpenedAt(LegacyDateFormat.render(onboardingCase.getOpenedAt()));
        dto.setUpdatedAt(LegacyDateFormat.render(onboardingCase.getUpdatedAt()));
        dto.setDocuments(documents.stream().map(this::toDocumentDto).collect(Collectors.toList()));
        return dto;
    }

    private DocumentDto toDocumentDto(CaseDocument document) {
        DocumentDto dto = new DocumentDto();
        dto.setDocumentId(document.getDocumentId());
        dto.setDocumentType(document.getDocumentType().name());
        dto.setReceivedAt(LegacyDateFormat.render(document.getReceivedAt()));
        dto.setVerified(document.isVerified());
        return dto;
    }
}
