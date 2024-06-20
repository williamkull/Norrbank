package se.norrbank.onboarding.api;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * Reads the principal the SSO gateway forwards. The gateway has already validated the
 * JWT and put the claims it allows through into these headers.
 */
@Component
public class SsoPrincipalResolver {

    private static final String USER_HEADER = "X-Norrbank-User";
    private static final String DEPT_HEADER = "X-Norrbank-Department";
    private static final String ROLES_HEADER = "X-Norrbank-Roles";

    public SsoPrincipal resolve(HttpServletRequest request) {
        String userId = request.getHeader(USER_HEADER);
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("request did not come through the SSO gateway");
        }
        String department = request.getHeader(DEPT_HEADER);
        String roles = request.getHeader(ROLES_HEADER);
        return new SsoPrincipal(userId, department == null ? "" : department, parseRoles(roles));
    }

    private Set<String> parseRoles(String header) {
        if (header == null || header.isBlank()) {
            return Collections.emptySet();
        }
        return new LinkedHashSet<>(Arrays.asList(header.split("\\s*,\\s*")));
    }
}
