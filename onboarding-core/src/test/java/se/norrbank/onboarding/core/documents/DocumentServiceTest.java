package se.norrbank.onboarding.core.documents;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class DocumentServiceTest {

    @Autowired
    private DocumentService documents;

    @Test
    void everyMandatoryDocumentIsOutstandingOnAnEmptyCase() {
        assertThat(documents.outstandingFor("ONB-2026-000001"))
                .containsExactlyInAnyOrder(
                        DocumentType.CERTIFICATE_OF_INCORPORATION,
                        DocumentType.ARTICLES_OF_ASSOCIATION,
                        DocumentType.OWNERSHIP_STRUCTURE,
                        DocumentType.TAX_RESIDENCY_SELF_CERTIFICATION);
    }

    @Test
    void filingADocumentRemovesItFromOutstanding() {
        documents.record("ONB-2026-000002", DocumentType.ARTICLES_OF_ASSOCIATION, "ARC-99201");
        assertThat(documents.outstandingFor("ONB-2026-000002"))
                .doesNotContain(DocumentType.ARTICLES_OF_ASSOCIATION)
                .hasSize(3);
    }

    @Test
    void anOptionalDocumentDoesNotChangeTheOutstandingSet() {
        documents.record("ONB-2026-000003", DocumentType.FINANCIAL_STATEMENTS, "ARC-99202");
        assertThat(documents.outstandingFor("ONB-2026-000003")).hasSize(4);
    }
}
