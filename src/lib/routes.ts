import { findExamSet } from '@/data/study-resources';

export const ROUTES = {
  home: '/',
  family: '/family',
  trip: '/trip',
  property: '/property',
  learn: '/learn',
} as const;

export const LEARN_ROUTES = {
  ielts: '/learn/ielts',
  primary: '/learn/primary',
} as const;

export type AppPath = (typeof ROUTES)[keyof typeof ROUTES];
export type LearnSection = keyof typeof LEARN_ROUTES;

const KNOWN = new Set<string>(Object.values(ROUTES));

export type RouteState = {
  path: AppPath;
  learn: LearnSection | null;
  exam: number | null;
};

const HOME: RouteState = { path: ROUTES.home, learn: null, exam: null };

function trimPath(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/';
}

export function examUrl(book: number) {
  return `${LEARN_ROUTES.ielts}/${book}`;
}

/**
 * 识别页面。`/learn/ielts/N` 是某一套真题，旧地址 `/learn/N` 按同一套处理；
 * 编号以套题数据为准，其它未知路径回到首页。
 */
export function resolveRoute(pathname: string): RouteState {
  const trimmed = trimPath(pathname);
  const examMatch = trimmed.match(/^\/learn\/(?:ielts\/)?(\d+)$/);
  if (examMatch) {
    const exam = Number(examMatch[1]);
    return findExamSet(exam) ? { path: ROUTES.learn, learn: 'ielts', exam } : HOME;
  }
  if (trimmed === LEARN_ROUTES.ielts) return { path: ROUTES.learn, learn: 'ielts', exam: null };
  if (trimmed === LEARN_ROUTES.primary) return { path: ROUTES.learn, learn: 'primary', exam: null };
  if (KNOWN.has(trimmed)) return { path: trimmed as AppPath, learn: null, exam: null };
  return HOME;
}

export function routeUrl(state: RouteState) {
  if (state.learn == null) return state.path;
  if (state.exam != null) return examUrl(state.exam);
  return LEARN_ROUTES[state.learn];
}

/** 去掉末尾斜杠，并把未知路径视为首页。 */
export function normalizePath(pathname: string): AppPath {
  return resolveRoute(pathname).path;
}

export function isKnownPath(pathname: string): boolean {
  const trimmed = trimPath(pathname);
  return trimmed === ROUTES.home || resolveRoute(trimmed).path !== ROUTES.home;
}
