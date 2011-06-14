package se.norrbank.onboarding.core.cases;

import java.util.regex.Pattern;

/**
 * Onboarding case number, in the format operations has used since the case system
 * was introduced: ONB-YYYY-NNNNNN.
 */
public record CaseNumber(String value) {

    private static final Pattern FORMAT = Pattern.compile("ONB-\\d{4}-\\d{6}");

    public CaseNumber {
        if (value == null || !FORMAT.matcher(value).matches()) {
            throw new IllegalArgumentException("case number must match ONB-YYYY-NNNNNN, got: " + value);
        }
    }

    public int year() {
        return Integer.parseInt(value.substring(4, 8));
    }

    @Override
    public String toString() {
        return value;
    }
}
