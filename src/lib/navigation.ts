export type RouteRule = {
  exact?: readonly string[];
  prefixes?: readonly string[];
  exclude?: readonly string[];
};

const normalizePath = (pathname: string): string => {
  const path = pathname.split(/[?#]/, 1)[0] || "/";
  if (path === "/") return path;
  return path.replace(/\/+$/, "") || "/";
};

const matchesPath = (pathname: string, candidate: string): boolean => {
  const normalizedCandidate = normalizePath(candidate);
  return pathname === normalizedCandidate || pathname.startsWith(`${normalizedCandidate}/`);
};

export const routeMatches = (pathname: string, rule: RouteRule): boolean => {
  const normalized = normalizePath(pathname);

  if ((rule.exclude || []).some((path) => matchesPath(normalized, path))) {
    return false;
  }

  if ((rule.exact || []).some((path) => normalized === normalizePath(path))) {
    return true;
  }

  return (rule.prefixes || []).some((path) => matchesPath(normalized, path));
};

export const studentRouteRules = {
  dashboard: { exact: ["/student/dashboard"] },
  find: {
    exact: ["/search", "/student/find"],
    prefixes: ["/student/packages/new"],
  },
  packages: {
    exact: ["/student/packages"],
    prefixes: ["/student/packages"],
    exclude: ["/student/packages/new"],
  },
  vouchers: {
    prefixes: ["/student/vouchers", "/student/offers"],
  },
  sessions: { prefixes: ["/student/my-classes"] },
  messages: { prefixes: ["/student/messages"] },
  history: { prefixes: ["/student/history"] },
  profile: { prefixes: ["/student/profile"] },
  help: { prefixes: ["/student/help"] },
} as const satisfies Record<string, RouteRule>;

export type StudentRouteKey = keyof typeof studentRouteRules;

export const isStudentRouteActive = (pathname: string, key: StudentRouteKey): boolean =>
  routeMatches(pathname, studentRouteRules[key]);

export const isSectionActive = (pathname: string, path: string, exact = false): boolean =>
  routeMatches(pathname, exact ? { exact: [path] } : { prefixes: [path] });
