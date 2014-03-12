package se.norrbank.registry.sftp;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.List;

/**
 * The inbound directory the provider's SFTP transfer writes into.
 *
 * <p>The transfer itself is the platform team's managed SFTP job. This service only reads
 * what has landed, oldest first, and moves each file to the archive once it has parsed.
 */
public class DropLocation {

    private final Path inbound;
    private final Path archive;

    public DropLocation(Path inbound, Path archive) {
        this.inbound = inbound;
        this.archive = archive;
    }

    public List<Path> pending() throws IOException {
        if (!Files.isDirectory(inbound)) {
            return List.of();
        }
        try (var files = Files.list(inbound)) {
            return files.filter(path -> path.getFileName().toString().endsWith(".csv"))
                    .sorted(Comparator.comparing(path -> path.getFileName().toString()))
                    .toList();
        }
    }

    /**
     * Reads a drop as UTF-8.
     *
     * <p>The exchange was set up against a latin-1 feed and read as ISO-8859-1 for years.
     * The provider moved to UTF-8 with the 2024 format; everything in the archive older
     * than that is ASCII only, so nothing was lost by switching.
     */
    public List<String> read(Path drop) throws IOException {
        return Files.readAllLines(drop, StandardCharsets.UTF_8);
    }

    public void archive(Path drop) throws IOException {
        Files.createDirectories(archive);
        Files.move(drop, archive.resolve(drop.getFileName()));
    }
}
