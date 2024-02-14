/**
 * The workspace session.
 *
 * <p>The SSO gateway authenticates the relationship manager and forwards the claims it
 * allows through. The workspace holds nothing beyond them, and adds nothing to them.
 */
export interface WorkspaceSession {
  userId: string;
  displayName: string;
  department: string;
  roles: string[];
}

const DEV_SESSION: WorkspaceSession = {
  userId: "s.lundin",
  displayName: "Sofia Lundin",
  department: "Corporate Banking, Stockholm",
  roles: ["RM"],
};

/**
 * Reads the session the gateway injected into the page. Falls back to the development
 * identity when the gateway is not in front, which is the local dev server only.
 */
export function currentSession(): WorkspaceSession {
  const injected = (globalThis as { __NORRBANK_SESSION__?: WorkspaceSession }).__NORRBANK_SESSION__;
  return injected ?? DEV_SESSION;
}

export function sessionHeaders(session: WorkspaceSession): Record<string, string> {
  return {
    "X-Norrbank-User": session.userId,
    "X-Norrbank-Department": session.department,
    "X-Norrbank-Roles": session.roles.join(","),
  };
}
