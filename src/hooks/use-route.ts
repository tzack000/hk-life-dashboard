import { useCallback, useEffect, useState } from 'react';
import { resolveRoute, routeUrl, type RouteState } from '@/lib/routes';

function readRoute(): RouteState {
  const raw = window.location.pathname;
  const next = resolveRoute(raw);
  const canonical = routeUrl(next);
  const trimmed = raw.replace(/\/+$/, '') || '/';
  if (trimmed !== canonical) {
    window.history.replaceState({}, '', canonical);
  }
  return next;
}

function track(path: string) {
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path,
        referrer: document.referrer || '',
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        language: navigator.language || '',
      }),
    }).catch(() => {});
  } catch {
    /* 统计失败不影响浏览 */
  }
}

export function useRoute() {
  const [route, setRoute] = useState<RouteState>(readRoute);

  useEffect(() => {
    track(routeUrl(route));
  }, [route]);

  useEffect(() => {
    const onPop = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    const next = resolveRoute(to);
    const canonical = routeUrl(next);
    const current = window.location.pathname.replace(/\/+$/, '') || '/';
    if (canonical === current) return;
    window.history.pushState({}, '', canonical);
    setRoute(next);
    window.scrollTo(0, 0);
  }, []);

  return { path: route.path, exam: route.exam, navigate };
}
