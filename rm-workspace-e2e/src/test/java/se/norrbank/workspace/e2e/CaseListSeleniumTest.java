package se.norrbank.workspace.e2e;

import org.junit.After;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

/**
 * The case list is the workspace's front door: a relationship manager opens it, finds their
 * cases, and clicks one. Everything else in the workspace hangs off that, so it is what the
 * legacy suite covers and has covered since 2019.
 */
public class CaseListSeleniumTest {

    private static WorkspaceStubServer server;

    private ChromeDriver driver;
    private CaseListPage page;

    @BeforeClass
    public static void startWorkspace() throws Exception {
        server = new WorkspaceStubServer(WorkspaceStubServer.defaultBundle());
        server.start();
    }

    @AfterClass
    public static void stopWorkspace() {
        if (server != null) {
            server.stop();
        }
    }

    @Before
    public void openBrowser() {
        ChromeOptions options = new ChromeOptions();
        if (!"0".equals(System.getenv("NORRBANK_E2E_HEADLESS"))) {
            options.addArguments("--headless=new");
        }
        options.addArguments("--no-sandbox", "--disable-dev-shm-usage", "--window-size=1280,900");
        driver = new ChromeDriver(options);
        page = new CaseListPage(driver).open(server.baseUrl());
    }

    @After
    public void closeBrowser() {
        if (driver != null) {
            driver.quit();
        }
    }

    @Test
    public void listsTheRelationshipManagersOpenCasesUnderTheColumnsTheOpsConsoleUses() {
        assertEquals(
                List.of("Case", "Client", "Org. no.", "Status", "Opened"), page.columnHeadings());
        assertEquals(WorkspaceStubServer.CASE_COUNT, page.rows().size());
        assertEquals("ONB-2026-004101", page.cells(0).get(0));
        assertEquals("Vasa Logistik AB", page.cells(0).get(1));
    }

    @Test
    public void showsTheOrganisationNumberAndTheLifecycleStatusAsAPersonReadsThem() {
        // 5560112233 is what the registry holds; 556011-2233 is what a Swedish reader
        // expects, and APPROVED is not a word an RM should have to translate.
        assertEquals("556011-2233", page.cells(0).get(2));
        assertEquals("Onboarded", page.cells(0).get(3));
        assertEquals("Awaiting documents", page.cells(4).get(3));
    }

    @Test
    public void opensTheSelectedCaseInTheDetailPane() {
        page.select(2);
        assertTrue("row 2 should carry the selected class", page.isSelected(2));
        assertEquals("Nordkap Shipping AB", page.detailTitle());
        assertTrue(
                "the detail subtitle should carry the case id and the formatted org. no., was: "
                        + page.detailSubtitle(),
                page.detailSubtitle().contains("ONB-2026-004119")
                        && page.detailSubtitle().contains("556900-1122"));
    }
}
