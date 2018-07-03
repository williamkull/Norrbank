package se.norrbank.registry.csv;

public class CsvFormatException extends RuntimeException {

    public CsvFormatException(String message) {
        super(message);
    }

    public CsvFormatException(String message, Throwable cause) {
        super(message, cause);
    }
}
