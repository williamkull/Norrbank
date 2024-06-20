package se.norrbank.onboarding.api;

import java.time.Instant;

public record ApiError(String code, String message, Instant timestamp) {

    public static ApiError of(String code, String message, Instant timestamp) {
        return new ApiError(code, message, timestamp);
    }
}
