package se.norrbank.registry.csv;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import se.norrbank.registry.model.RegistryEvidenceRow;
import se.norrbank.registry.model.RegistryEvidenceStatus;

/**
 * Parses a provider drop.
 *
 * <p>The generation is sniffed from the header line, because the files carry no version of
 * their own. Anything the sniffer does not recognise is a hard failure: a silently
 * misparsed ownership file is worse than a run that stops.
 */
public class RegistryCsvParser {

    private static final Logger log = LoggerFactory.getLogger(RegistryCsvParser.class);

    private static final String LEGACY_HEADER = "orgnr;namn;status;uppdaterad";
    private static final String COMMA_HEADER = "org_no,legal_name,evidence_status,expected_completion,updated_at";
    private static final String COMMA_UBO_HEADER = "org_no,legal_name,evidence_status,expected_completion,ubo_name,updated_at";

    private static final DateTimeFormatter LEGACY_DATE = DateTimeFormatter.ofPattern("yyyyMMdd", Locale.ROOT);

    public CsvGeneration sniff(String headerLine) {
        String header = headerLine.strip().toLowerCase(Locale.ROOT).replace("﻿", "");
        if (header.equals(LEGACY_HEADER)) {
            return CsvGeneration.LEGACY_SEMICOLON;
        }
        if (header.equals(COMMA_HEADER)) {
            return CsvGeneration.COMMA_ISO;
        }
        if (header.equals(COMMA_UBO_HEADER)) {
            return CsvGeneration.COMMA_ISO_WITH_UBO;
        }
        throw new CsvFormatException("unrecognised registry header: " + headerLine);
    }

    public List<RegistryEvidenceRow> parse(List<String> lines) {
        if (lines.isEmpty()) {
            return List.of();
        }
        CsvGeneration generation = sniff(lines.get(0));
        log.info("registry drop parsed as {} format, {} data rows", generation, lines.size() - 1);

        List<RegistryEvidenceRow> rows = new ArrayList<>();
        for (int index = 1; index < lines.size(); index++) {
            String line = lines.get(index);
            if (line.isBlank()) {
                continue;
            }
            rows.add(parseRow(generation, line, index + 1));
        }
        return rows;
    }

    private RegistryEvidenceRow parseRow(CsvGeneration generation, String line, int lineNumber) {
        String[] fields = line.split(String.valueOf(generation.delimiter()), -1);
        try {
            return switch (generation) {
                case LEGACY_SEMICOLON -> new RegistryEvidenceRow(
                        fields[0].strip(),
                        fields[1].strip(),
                        mapLegacyStatus(fields[2].strip()),
                        null,
                        null,
                        LocalDate.parse(fields[3].strip(), LEGACY_DATE));
                case COMMA_ISO -> new RegistryEvidenceRow(
                        fields[0].strip(),
                        fields[1].strip(),
                        mapStatus(fields[2].strip()),
                        optionalDate(fields[3]),
                        null,
                        LocalDate.parse(fields[4].strip()));
                case COMMA_ISO_WITH_UBO -> new RegistryEvidenceRow(
                        fields[0].strip(),
                        fields[1].strip(),
                        mapStatus(fields[2].strip()),
                        optionalDate(fields[3]),
                        blankToNull(fields[4]),
                        LocalDate.parse(fields[5].strip()));
            };
        } catch (ArrayIndexOutOfBoundsException | DateTimeParseException malformed) {
            throw new CsvFormatException("registry row " + lineNumber + " does not match the " + generation + " format", malformed);
        }
    }

    /** The 2011 provider used Swedish state words. Two of the three current states did not exist. */
    private RegistryEvidenceStatus mapLegacyStatus(String value) {
        return switch (value.toUpperCase(Locale.ROOT)) {
            case "VANTAR", "VÄNTAR" -> RegistryEvidenceStatus.REGISTRY_PENDING;
            case "KLAR" -> RegistryEvidenceStatus.REGISTRY_COMPLETE;
            default -> throw new CsvFormatException("unknown legacy registry status: " + value);
        };
    }

    private RegistryEvidenceStatus mapStatus(String value) {
        return switch (value.toUpperCase(Locale.ROOT)) {
            case "PENDING" -> RegistryEvidenceStatus.REGISTRY_PENDING;
            case "UBO_UNCONFIRMED" -> RegistryEvidenceStatus.UBO_UNCONFIRMED;
            case "COMPLETE" -> RegistryEvidenceStatus.REGISTRY_COMPLETE;
            default -> throw new CsvFormatException("unknown registry status: " + value);
        };
    }

    private LocalDate optionalDate(String field) {
        String value = field.strip();
        return value.isEmpty() ? null : LocalDate.parse(value);
    }

    private String blankToNull(String field) {
        String value = field.strip();
        return value.isEmpty() ? null : value;
    }
}
