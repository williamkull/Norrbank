package se.norrbank.registry.csv;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import se.norrbank.registry.model.RegistryEvidenceRow;
import se.norrbank.registry.model.RegistryEvidenceStatus;

class RegistryCsvParserTest {

    private final RegistryCsvParser parser = new RegistryCsvParser();

    private List<String> sample(String name) throws IOException {
        return Files.readAllLines(Path.of("samples", name), StandardCharsets.UTF_8);
    }

    @Test
    void sniffsAllThreeGenerations() throws IOException {
        assertEquals(CsvGeneration.LEGACY_SEMICOLON, parser.sniff(sample("registry-20140312.csv").get(0)));
        assertEquals(CsvGeneration.COMMA_ISO, parser.sniff(sample("registry-20210907.csv").get(0)));
        assertEquals(CsvGeneration.COMMA_ISO_WITH_UBO, parser.sniff(sample("registry-20260904.csv").get(0)));
    }

    @Test
    void refusesAHeaderItDoesNotKnow() {
        assertThrows(CsvFormatException.class, () -> parser.sniff("org_no|legal_name|status"));
    }

    @Test
    void parsesTheLegacyDropWithSwedishStates() throws IOException {
        List<RegistryEvidenceRow> rows = parser.parse(sample("registry-20140312.csv"));
        assertEquals(4, rows.size());
        assertEquals(RegistryEvidenceStatus.REGISTRY_COMPLETE, rows.get(0).status());
        assertEquals(RegistryEvidenceStatus.REGISTRY_PENDING, rows.get(1).status());
        assertEquals(LocalDate.of(2014, 3, 11), rows.get(0).updatedAt());
    }

    @Test
    void theLegacyFormatCarriesNoExpectedDateAndNoOwnerName() throws IOException {
        RegistryEvidenceRow row = parser.parse(sample("registry-20140312.csv")).get(1);
        assertNull(row.expectedCompletion());
        assertNull(row.uboName());
        assertFalse(row.carriesPersonalData());
    }

    @Test
    void theMiddleFormatCarriesAnExpectedDateButNoOwnerName() throws IOException {
        RegistryEvidenceRow row = parser.parse(sample("registry-20210907.csv")).get(1);
        assertEquals(LocalDate.of(2021, 9, 24), row.expectedCompletion());
        assertNull(row.uboName());
    }

    @Test
    void theCurrentFormatCarriesTheOwnerName() throws IOException {
        RegistryEvidenceRow row = parser.parse(sample("registry-20260904.csv")).get(1);
        assertEquals(LocalDate.of(2026, 9, 24), row.expectedCompletion());
        assertEquals("Petter Nyholm", row.uboName());
        assertTrue(row.carriesPersonalData());
    }

    @Test
    void anEmptyOwnerNameColumnIsNotPersonalData() throws IOException {
        List<RegistryEvidenceRow> rows = parser.parse(sample("registry-20260904.csv"));
        RegistryEvidenceRow kiruna = rows.stream()
                .filter(row -> row.orgNo().equals("5567889900"))
                .findFirst()
                .orElseThrow();
        assertNull(kiruna.uboName());
        assertFalse(kiruna.carriesPersonalData());
    }

    @Test
    void reportsTheLineNumberOfAMalformedRow() {
        List<String> drop = List.of(
                "org_no,legal_name,evidence_status,expected_completion,updated_at",
                "5560112233,Vasa Logistik AB,COMPLETE,,2021-09-06",
                "5566778899,Bergslagen Industri AB,PENDING,not-a-date,2021-09-06");
        CsvFormatException failure = assertThrows(CsvFormatException.class, () -> parser.parse(drop));
        assertTrue(failure.getMessage().contains("row 3"));
    }

    @Test
    void refusesAStatusCodeItDoesNotKnow() {
        List<String> drop = List.of(
                "org_no,legal_name,evidence_status,expected_completion,updated_at",
                "5560112233,Vasa Logistik AB,IN_REVIEW,,2021-09-06");
        assertThrows(CsvFormatException.class, () -> parser.parse(drop));
    }

    @Test
    void swedishCharactersSurviveTheDrop() throws IOException {
        List<RegistryEvidenceRow> rows = parser.parse(sample("registry-20260904.csv"));
        RegistryEvidenceRow malmo = rows.stream()
                .filter(row -> row.orgNo().equals("5564556677"))
                .findFirst()
                .orElseThrow();
        assertEquals("Malmö Fastighets AB", malmo.legalName());
        assertEquals("Elsa Bergqvist", malmo.uboName());
    }

    @Test
    void anEmptyDropParsesToNothing() {
        assertTrue(parser.parse(List.of()).isEmpty());
    }
}
