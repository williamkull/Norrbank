package se.norrbank.screening.job;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Properties;

/**
 * Runtime configuration, read from screening-batch.properties on the classpath and
 * overridden by system properties in the deployed environments.
 */
public class BatchConfiguration {

    private static final String RESOURCE = "/screening-batch.properties";

    private final Properties properties = new Properties();

    public BatchConfiguration() {
        try (InputStream stream = BatchConfiguration.class.getResourceAsStream(RESOURCE)) {
            if (stream != null) {
                properties.load(stream);
            }
        } catch (IOException failure) {
            throw new IllegalStateException("cannot read " + RESOURCE, failure);
        }
    }

    public Path stageFilePath() {
        return Path.of(value("stage.file.path"));
    }

    public String jdbcUrl() {
        return value("db.url");
    }

    public String jdbcUser() {
        return value("db.user");
    }

    public String jdbcPassword() {
        return System.getProperty("db.password", properties.getProperty("db.password", ""));
    }

    /**
     * How long a run is expected to hold the stage file lock. Operations schedules
     * everything that reads the file outside this window.
     */
    public Duration expectedRuntime() {
        return Duration.ofMinutes(Long.parseLong(value("batch.expected.runtime.minutes")));
    }

    private String value(String key) {
        String resolved = System.getProperty(key, properties.getProperty(key));
        if (resolved == null) {
            throw new IllegalStateException("screening-batch property not set: " + key);
        }
        return resolved;
    }
}
