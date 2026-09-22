export const ROUTES = {
  home: '/',
  family: '/family',
  trip: '/trip',
  property: '/property',
  learn: '/learn',
} as const;

export type AppPath = (typeof ROUTES)[keyof typeof ROUTES];

const KNOWN = new Set<string>(Object.values(ROUTES));

export type RouteState = {
  path: AppPath;
  exam: number | null;
};

function trimPath(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/';
}

/** 识别页面。`/learn/4` 到 `/learn/21` 是某一套真题，其它未知路径回到首页。 */
export function resolveRoute(pathname: string): RouteState {
  const trimmed = trimPath(pathname);
  const examMatch = trimmed.match(/^\/learn\/(\d+)$/);
  if (examMatch) {
    const exam = Number(examMatch[1]);
    if (exam >= 4 && exam <= 21) return { path: ROUTES.learn, exam };
    return { path: ROUTES.home, exam: null };
  }
  if (KNOWN.has(trimmed)) return { path: trimmed as AppPath, exam: null };
  return { path: ROUTES.home, exam: null };
}

export function routeUrl(state: RouteState) {
  return state.exam == null ? state.path : `/learn/${state.exam}`;
}

/** 去掉末尾斜杠，并把未知路径视为首页。 */
export function normalizePath(pathname: string): AppPath {
  return resolveRoute(pathname).path;
}

export function isKnownPath(pathname: string): boolean {
  const trimmed = trimPath(pathname);
  if (KNOWN.has(trimmed)) return true;
  const exam = trimmed.match(/^\/learn\/(\d+)$/);
  return exam != null && Number(exam[1]) >= 4 && Number(exam[1]) <= 21;
}
