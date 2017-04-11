package se.norrbank.onboarding.core.kyc;

/** Customer risk rating from the KYC procedure. Drives how much evidence is required. */
public enum KycRiskRating {
    LOW,
    MEDIUM,
    HIGH,
    /** Enhanced due diligence. Always requires registry evidence on every beneficial owner. */
    EDD
}
