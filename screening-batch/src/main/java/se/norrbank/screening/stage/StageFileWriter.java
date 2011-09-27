package se.norrbank.screening.stage;

import java.io.BufferedWriter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Writes the stage file.
 *
 * <p>The whole file is rewritten on every run: one line per open case, replacing whatever
 * the previous run left. There is no incremental mode and no per-case update path. This is
 * the only place a case stage is recorded.
 */
public class StageFileWriter {

    private static final Logger log = LoggerFactory.getLogger(StageFileWriter.class);

    private final Path stageFile;

    public StageFileWriter(Path stageFile) {
        this.stageFile = stageFile;
    }

    public void writeAll(List<StageFileRecord> records) throws IOException {
        Path temporary = stageFile.resolveSibling(stageFile.getFileName() + ".tmp");
        Files.createDirectories(stageFile.getParent());
        try (BufferedWriter writer = Files.newBufferedWriter(temporary, StandardCharsets.ISO_8859_1)) {
            for (StageFileRecord record : records) {
                writer.write(record.toLine());
                writer.newLine();
            }
        }
        Files.move(temporary, stageFile, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        log.info("wrote {} case stages to {}", records.size(), stageFile);
    }

    public List<StageFileRecord> readAll() throws IOException {
        if (!Files.exists(stageFile)) {
            return List.of();
        }
        return Files.readAllLines(stageFile, StandardCharsets.ISO_8859_1).stream()
                .filter(line -> !line.isBlank())
                .map(StageFileRecord::fromLine)
                .toList();
    }
}
