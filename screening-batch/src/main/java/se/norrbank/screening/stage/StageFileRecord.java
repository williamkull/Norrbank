package se.norrbank.screening.stage;

import java.time.LocalDate;

/**
 * One line of the stage file.
 *
 * <p>Pipe delimited, fixed field order, no header. The ops console reads it with a
 * positional parser written in 2011 and the order has never changed.
 */
public record StageFileRecord(String caseId, CaseStage stage, LocalDate expectedDecisionDate, String runId) {

    private static final char DELIMITER = '|';

    public String toLine() {
        return caseId
                + DELIMITER + stage.name()
                + DELIMITER + (expectedDecisionDate == null ? "" : expectedDecisionDate.toString())
                + DELIMITER + runId;
    }

    public static StageFileRecord fromLine(String line) {
        String[] fields = line.split("\\|", -1);
        if (fields.length != 4) {
            throw new IllegalArgumentException("stage file line must have 4 fields, got " + fields.length + ": " + line);
        }
        LocalDate expected = fields[2].isBlank() ? null : LocalDate.parse(fields[2]);
        return new StageFileRecord(fields[0], CaseStage.valueOf(fields[1]), expected, fields[3]);
    }
}
