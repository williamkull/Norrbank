package se.norrbank.registry.model;

/**
 * Where a case stands with the company registry and UBO provider.
 *
 * <p>This is the only place these three states are recorded. The provider's own codes have
 * changed twice; see RegistryCsvParser for the mapping.
 */
public enum RegistryEvidenceStatus {

    /** Request sent to the provider, nothing back yet. */
    REGISTRY_PENDING,

    /** Provider replied but at least one beneficial owner could not be confirmed. */
    UBO_UNCONFIRMED,

    /** Ownership fully evidenced against the registry. */
    REGISTRY_COMPLETE;

    public boolean isOutstanding() {
        return this != REGISTRY_COMPLETE;
    }
}
