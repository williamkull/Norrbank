package se.norrbank.onboarding.api;

import java.util.Set;

/**
 * The caller, as the SSO gateway asserts them. The gateway validates the token; this
 * service trusts the claims it forwards and adds nothing to the session.
 */
public record SsoPrincipal(String userId, String department, Set<String> roles) {

    public boolean isRelationshipManager() {
        return roles.contains("RM");
    }

    public boolean isOnboardingOperations() {
        return roles.contains("ONB_OPS");
    }

    public boolean isKycFunction() {
        return roles.contains("KYC");
    }
}
