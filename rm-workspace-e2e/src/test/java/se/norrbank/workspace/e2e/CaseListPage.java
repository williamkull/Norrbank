package se.norrbank.workspace.e2e;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * The case list, as a relationship manager sees it.
 *
 * <p>Selectors are the workspace's own class names and its table structure, and nothing
 * else. When a selector here stops matching, the workspace changed shape, which is the
 * thing this suite exists to notice.
 */
final class CaseListPage {

    private static final By TABLE = By.cssSelector("table.case-list");
    private static final By ROWS = By.cssSelector("table.case-list tbody tr");
    private static final By HEADERS = By.cssSelector("table.case-list thead th");
    private static final By DETAIL_TITLE = By.cssSelector(".detail-pane .case-header h1");
    private static final By DETAIL_SUB = By.cssSelector(".detail-pane .case-header p");

    private final WebDriver driver;
    private final WebDriverWait wait;

    CaseListPage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(20));
    }

    CaseListPage open(String baseUrl) {
        driver.get(baseUrl + "/");
        wait.until(ExpectedConditions.presenceOfElementLocated(TABLE));
        return this;
    }

    /**
     * The headings as the markup carries them, not as the stylesheet draws them. The
     * workspace sets these in small caps, so getText() answers "CASE" where the component
     * says "Case"; asserting the drawn form would make a change of typography look like a
     * change of column.
     */
    List<String> columnHeadings() {
        List<String> headings = new ArrayList<>();
        for (WebElement th : driver.findElements(HEADERS)) {
            headings.add(th.getAttribute("textContent").trim());
        }
        return headings;
    }

    List<WebElement> rows() {
        return driver.findElements(ROWS);
    }

    /** The cells of one row, left to right: case, client, org. no., status, opened. */
    List<String> cells(int rowIndex) {
        List<String> values = new ArrayList<>();
        for (WebElement td : rows().get(rowIndex).findElements(By.tagName("td"))) {
            values.add(td.getText().trim());
        }
        return values;
    }

    CaseListPage select(int rowIndex) {
        String caseId = cells(rowIndex).get(0);
        rows().get(rowIndex).click();
        wait.until(ExpectedConditions.textToBePresentInElementLocated(DETAIL_SUB, caseId));
        return this;
    }

    boolean isSelected(int rowIndex) {
        String classes = rows().get(rowIndex).getAttribute("class");
        return classes != null && classes.contains("selected");
    }

    String detailTitle() {
        return driver.findElement(DETAIL_TITLE).getText().trim();
    }

    String detailSubtitle() {
        return driver.findElement(DETAIL_SUB).getText().trim();
    }
}
