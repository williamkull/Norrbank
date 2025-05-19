package se.norrbank.screening.stage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class CaseStageTest {

    @Test
    void everyStageCarriesAProcedureCode() {
        for (CaseStage stage : CaseStage.values()) {
            assertFalse(stage.procedureStageCode().isBlank(), stage + " has no procedure code");
        }
    }

    @Test
    void theProcedureCodeIsNeverTheEnumName() {
        for (CaseStage stage : CaseStage.values()) {
            assertNotEquals(stage.name(), stage.procedureStageCode(),
                    stage + " must expose the procedure's code, not this enum's name");
        }
    }

    @Test
    void procedureCodesAreHyphenatedAndUnique() {
        for (CaseStage stage : CaseStage.values()) {
            assertTrue(stage.procedureStageCode().matches("[A-Z]{3}-[A-Z]+"),
                    stage.procedureStageCode() + " is not in the procedure's code format");
        }
        long distinct = Arrays.stream(CaseStage.values()).map(CaseStage::procedureStageCode).distinct().count();
        assertEquals(CaseStage.values().length, distinct);
    }

    @Test
    void aClearedCaseCarriesTheCodeApprovalsRecord() {
        assertEquals("EDD-COMPLETE", CaseStage.SCREENING_CLEARED.procedureStageCode());
    }

    @Test
    void everyStageAlsoHasAnOpsConsoleLabel() {
        String missing = Arrays.stream(CaseStage.values())
                .filter(stage -> stage.opsConsoleLabel().isBlank())
                .map(Enum::name)
                .collect(Collectors.joining(", "));
        assertEquals("", missing);
    }
}
