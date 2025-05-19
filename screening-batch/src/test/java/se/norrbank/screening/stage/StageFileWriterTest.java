package se.norrbank.screening.stage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class StageFileWriterTest {

    @TempDir
    Path directory;

    @Test
    void roundTripsEveryStage() throws IOException {
        Path stageFile = directory.resolve("case-stage.dat");
        StageFileWriter writer = new StageFileWriter(stageFile);
        List<StageFileRecord> records = List.of(
                new StageFileRecord("ONB-2026-000101", CaseStage.EDD_PENDING, null, "a1b2c3d4"),
                new StageFileRecord("ONB-2026-000102", CaseStage.SCREENING_CLEARED, LocalDate.of(2026, 9, 8), "a1b2c3d4"),
                new StageFileRecord("ONB-2026-000103", CaseStage.SANCTIONS_HOLD, null, "a1b2c3d4"));

        writer.writeAll(records);

        assertEquals(records, writer.readAll());
    }

    @Test
    void anAbsentExpectedDateRoundTripsAsNull() throws IOException {
        Path stageFile = directory.resolve("case-stage.dat");
        StageFileWriter writer = new StageFileWriter(stageFile);
        writer.writeAll(List.of(new StageFileRecord("ONB-2026-000104", CaseStage.PEP_REVIEW, null, "ffff0000")));

        assertNull(writer.readAll().get(0).expectedDecisionDate());
    }

    @Test
    void everyRunReplacesTheWholeFile() throws IOException {
        Path stageFile = directory.resolve("case-stage.dat");
        StageFileWriter writer = new StageFileWriter(stageFile);
        writer.writeAll(List.of(new StageFileRecord("ONB-2026-000105", CaseStage.EDD_PENDING, null, "run00001")));
        writer.writeAll(List.of(new StageFileRecord("ONB-2026-000106", CaseStage.SCREENING_QUEUED, null, "run00002")));

        List<StageFileRecord> after = writer.readAll();
        assertEquals(1, after.size());
        assertEquals("ONB-2026-000106", after.get(0).caseId());
    }

    @Test
    void readingAnAbsentFileGivesNothing() throws IOException {
        assertTrue(new StageFileWriter(directory.resolve("never-written.dat")).readAll().isEmpty());
    }

    @Test
    void rejectsAMalformedLine() {
        assertThrows(IllegalArgumentException.class, () -> StageFileRecord.fromLine("ONB-2026-000107|EDD_PENDING"));
    }

    @Test
    void theLockIsExclusiveAndReleases() throws IOException {
        Path stageFile = directory.resolve("case-stage.dat");
        try (StageFileLock ignored = StageFileLock.acquire(stageFile)) {
            assertTrue(StageFileLock.isLocked(stageFile));
            assertThrows(IOException.class, () -> StageFileLock.acquire(stageFile));
        }
        assertFalse(StageFileLock.isLocked(stageFile));
    }
}
