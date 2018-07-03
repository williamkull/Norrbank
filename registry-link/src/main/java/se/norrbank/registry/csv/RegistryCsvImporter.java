package se.norrbank.registry.csv;

import java.io.IOException;
import java.nio.file.Path;
import java.sql.SQLException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import se.norrbank.registry.model.RegistryEvidenceRepository;
import se.norrbank.registry.model.RegistryEvidenceRow;
import se.norrbank.registry.sftp.DropLocation;

/**
 * Imports every drop waiting in the inbound directory.
 *
 * <p>A drop that fails to parse is left where it is and the run continues with the next
 * one, so a single bad file does not stall the exchange.
 */
public class RegistryCsvImporter {

    private static final Logger log = LoggerFactory.getLogger(RegistryCsvImporter.class);

    private final DropLocation drops;
    private final RegistryCsvParser parser;
    private final RegistryEvidenceRepository repository;

    public RegistryCsvImporter(DropLocation drops, RegistryCsvParser parser, RegistryEvidenceRepository repository) {
        this.drops = drops;
        this.parser = parser;
        this.repository = repository;
    }

    public int importPending() throws IOException {
        int imported = 0;
        for (Path drop : drops.pending()) {
            try {
                List<RegistryEvidenceRow> rows = parser.parse(drops.read(drop));
                for (RegistryEvidenceRow row : rows) {
                    repository.save(row);
                }
                drops.archive(drop);
                imported += rows.size();
                log.info("imported {} rows from {}", rows.size(), drop.getFileName());
            } catch (CsvFormatException | SQLException failure) {
                log.error("registry drop {} failed and was left in the inbound directory", drop.getFileName(), failure);
            }
        }
        return imported;
    }
}
