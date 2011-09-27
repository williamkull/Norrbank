package se.norrbank.screening.stage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Exclusive lock over the stage file for the duration of a run.
 *
 * <p>The lock is a sibling file. It is taken before the first line is written and released
 * after the last, so anything reading the stage file while the run is in progress sees the
 * lock and waits. A typical run holds it for the whole of its window; see
 * batch.expected.runtime.minutes in screening-batch.properties.
 */
public final class StageFileLock implements AutoCloseable {

    private static final Logger log = LoggerFactory.getLogger(StageFileLock.class);
    private static final String LOCK_SUFFIX = ".lock";

    private final Path lockFile;

    private StageFileLock(Path lockFile) {
        this.lockFile = lockFile;
    }

    public static StageFileLock acquire(Path stageFile) throws IOException {
        Path lockFile = stageFile.resolveSibling(stageFile.getFileName() + LOCK_SUFFIX);
        try {
            Files.createDirectories(lockFile.getParent());
            Files.writeString(lockFile, Instant.now().toString(), StandardOpenOption.CREATE_NEW);
        } catch (java.nio.file.FileAlreadyExistsException alreadyRunning) {
            throw new IOException("stage file is locked by another run: " + lockFile, alreadyRunning);
        }
        log.info("acquired stage file lock {}", lockFile);
        return new StageFileLock(lockFile);
    }

    public static boolean isLocked(Path stageFile) {
        return Files.exists(stageFile.resolveSibling(stageFile.getFileName() + LOCK_SUFFIX));
    }

    @Override
    public void close() throws IOException {
        Files.deleteIfExists(lockFile);
        log.info("released stage file lock {}", lockFile);
    }
}
