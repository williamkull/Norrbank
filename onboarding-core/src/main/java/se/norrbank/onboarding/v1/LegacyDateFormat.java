package se.norrbank.onboarding.v1;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * Date rendering as the 2016 clients expect it.
 *
 * <p>The ops console parses this with a fixed-width reader, so the format is not
 * negotiable and neither is the trailing Z.
 */
final class LegacyDateFormat {

    private static final DateTimeFormatter FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'").withZone(ZoneOffset.UTC);

    private LegacyDateFormat() {
    }

    static String render(Instant instant) {
        return instant == null ? null : FORMAT.format(instant);
    }
}
