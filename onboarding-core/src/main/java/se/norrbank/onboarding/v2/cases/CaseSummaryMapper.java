package se.norrbank.onboarding.v2.cases;

import org.springframework.stereotype.Component;
import se.norrbank.onboarding.core.cases.OnboardingCase;

@Component
public class CaseSummaryMapper {

    public CaseSummaryDto toSummary(OnboardingCase onboardingCase, int documentsOutstanding) {
        return new CaseSummaryDto(
                onboardingCase.getCaseId(),
                onboardingCase.getOrgNo(),
                onboardingCase.getLegalName(),
                onboardingCase.getLifecycleStatus().name(),
                onboardingCase.getOpenedAt(),
                onboardingCase.getUpdatedAt(),
                documentsOutstanding);
    }
}
