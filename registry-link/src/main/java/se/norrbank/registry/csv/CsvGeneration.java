package se.norrbank.registry.csv;

/**
 * The provider's file format has changed twice since the exchange was set up, and old
 * drops are still reprocessed from the archive, so all three have to parse.
 *
 * <p>There is no version marker in the file. The generation is decided from the header.
 */
public enum CsvGeneration {

    /** 2011 to 2018. Semicolon delimited, Swedish headers, dates as YYYYMMDD. */
    LEGACY_SEMICOLON(';'),

    /** 2018 to 2024. Comma delimited, English headers, ISO dates. */
    COMMA_ISO(','),

    /** 2024 onward. As COMMA_ISO with a beneficial owner name column added. */
    COMMA_ISO_WITH_UBO(',');

    private final char delimiter;

    CsvGeneration(char delimiter) {
        this.delimiter = delimiter;
    }

    public char delimiter() {
        return delimiter;
    }
}
