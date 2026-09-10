package se.norrbank.workspace.e2e;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Serves the built workspace bundle and stands in for onboarding-core.
 *
 * <p>The gateway fronts the workspace and the API on one origin, so the tests need one
 * origin too. This is the smallest thing that gives them one: the JDK's own HTTP server,
 * the files under rm-workspace/dist, and a fixed answer for GET /v2/cases.
 *
 * <p>The cases below are the ones db/local-data.sql seeds for s.lundin, who is also the
 * identity the workspace falls back to when no gateway is in front. Keeping them the same
 * means a failure here and a failure in a local run mean the same thing.
 */
final class WorkspaceStubServer {

    /** GET /v2/cases, for s.lundin. Field order and names are api.ts's CaseSummary. */
    private static final String CASES_JSON = """
            [
              {"caseId":"ONB-2026-004101","orgNo":"5560112233","legalName":"Vasa Logistik AB",\
"lifecycleStatus":"APPROVED","openedAt":"2026-05-12T08:20:00Z","updatedAt":"2026-06-30T14:02:00Z",\
"documentsOutstanding":0},
              {"caseId":"ONB-2026-004112","orgNo":"5566778899","legalName":"Bergslagen Industri AB",\
"lifecycleStatus":"DOCS_RECEIVED","openedAt":"2026-07-02T09:40:00Z","updatedAt":"2026-07-18T10:15:00Z",\
"documentsOutstanding":2},
              {"caseId":"ONB-2026-004119","orgNo":"5569001122","legalName":"Nordkap Shipping AB",\
"lifecycleStatus":"DOCS_RECEIVED","openedAt":"2026-07-14T11:05:00Z","updatedAt":"2026-08-01T09:30:00Z",\
"documentsOutstanding":1},
              {"caseId":"ONB-2026-004133","orgNo":"5564556677","legalName":"Malm\\u00f6 Fastighets AB",\
"lifecycleStatus":"DOCS_RECEIVED","openedAt":"2026-07-21T10:00:00Z","updatedAt":"2026-08-06T08:55:00Z",\
"documentsOutstanding":3},
              {"caseId":"ONB-2026-004148","orgNo":"5561223344","legalName":"G\\u00e4vle Kraft & V\\u00e4rme AB",\
"lifecycleStatus":"DOCS_REQUESTED","openedAt":"2026-08-04T09:10:00Z","updatedAt":"2026-08-04T09:10:00Z",\
"documentsOutstanding":4}
            ]
            """;

    /** How many cases GET /v2/cases answers with. The suite asserts against this, not a literal. */
    static final int CASE_COUNT = 5;

    private final Path bundle;
    private HttpServer server;

    WorkspaceStubServer(Path bundle) {
        this.bundle = bundle;
    }

    /** The bundle `make build` leaves behind, resolved from this module's own directory. */
    static Path defaultBundle() {
        Path here = Paths.get("").toAbsolutePath();
        Path dist = here.resolve("../rm-workspace/dist").normalize();
        if (Files.isDirectory(dist)) {
            return dist;
        }
        return here.resolve("rm-workspace/dist").normalize();
    }

    void start() throws IOException {
        if (!Files.isRegularFile(bundle.resolve("index.html"))) {
            throw new IllegalStateException(
                    "No workspace bundle at " + bundle + ". Run: cd rm-workspace && bun run build");
        }
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", this::handle);
        server.setExecutor(null);
        server.start();
    }

    void stop() {
        if (server != null) {
            server.stop(0);
        }
    }

    String baseUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    private void handle(HttpExchange exchange) throws IOException {
        String path = exchange.getRequestURI().getPath();
        if (path.startsWith("/v2/cases")) {
            send(exchange, 200, "application/json", CASES_JSON.getBytes(StandardCharsets.UTF_8));
            return;
        }
        Path file = resolve(path);
        if (file == null) {
            send(exchange, 404, "text/plain", "not found".getBytes(StandardCharsets.UTF_8));
            return;
        }
        send(exchange, 200, contentType(file), Files.readAllBytes(file));
    }

    /** A file under the bundle, or index.html for anything the workspace routes itself. */
    private Path resolve(String path) {
        Path candidate = bundle.resolve(path.replaceFirst("^/", "")).normalize();
        if (candidate.startsWith(bundle) && Files.isRegularFile(candidate)) {
            return candidate;
        }
        return bundle.resolve("index.html");
    }

    private static String contentType(Path file) {
        String name = file.getFileName().toString();
        if (name.endsWith(".html")) {
            return "text/html; charset=utf-8";
        }
        if (name.endsWith(".js")) {
            return "text/javascript; charset=utf-8";
        }
        if (name.endsWith(".css")) {
            return "text/css; charset=utf-8";
        }
        if (name.endsWith(".svg")) {
            return "image/svg+xml";
        }
        return "application/octet-stream";
    }

    private static void send(HttpExchange exchange, int status, String type, byte[] body)
            throws IOException {
        exchange.getResponseHeaders().add("Content-Type", type);
        exchange.sendResponseHeaders(status, body.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(body);
        }
    }
}
