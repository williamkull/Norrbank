package se.norrbank.registry.model;

import java.time.LocalDate;

/**
 * One row of a provider drop.
 *
 * <p>The beneficial owner name arrives on every row from the 2024 format onward. It is
 * personal data and it is need-to-know inside the KYC function.
 */
public record RegistryEvidenceRow(
        String orgNo,
        String legalName,
        RegistryEvidenceStatus status,
        LocalDate expectedCompletion,
        String uboName,
        LocalDate updatedAt) {

    public boolean carriesPersonalData() {
        return uboName != null && !uboName.isBlank();
    }
}
