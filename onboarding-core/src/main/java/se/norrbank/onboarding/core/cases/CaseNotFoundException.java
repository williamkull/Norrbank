package se.norrbank.onboarding.core.cases;

public class CaseNotFoundException extends RuntimeException {

    private final String caseId;

    public CaseNotFoundException(String caseId) {
        super("no onboarding case with id " + caseId);
        this.caseId = caseId;
    }

    public String getCaseId() {
        return caseId;
    }
}
