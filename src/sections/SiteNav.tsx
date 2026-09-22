import { BookOpen, Building2, CalendarHeart, House, Plane } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROUTES, type AppPath } from '@/lib/routes';

const ITEMS: { path: AppPath; label: string; icon: typeof House }[] = [
  { path: ROUTES.home, label: '首页', icon: House },
  { path: ROUTES.family, label: '家庭日程', icon: CalendarHeart },
  { path: ROUTES.trip, label: '近期行程', icon: Plane },
  { path: ROUTES.property, label: '房产看板', icon: Building2 },
  { path: ROUTES.learn, label: '学习资源', icon: BookOpen },
];

export function SiteNav({
  path,
  navigate,
}: {
  path: AppPath;
  navigate: (to: string) => void;
}) {
  return (
    <nav className="border-b bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <a
          href={ROUTES.home}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
            event.preventDefault();
            navigate(ROUTES.home);
          }}
          className="text-sm font-semibold tracking-tight text-[#0F172A] sm:text-base"
        >
          ZT Life
        </a>
        <div className="flex flex-wrap items-center gap-1">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            const active = path === item.path;
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                  event.preventDefault();
                  navigate(item.path);
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all sm:text-sm',
                  active
                    ? 'bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] text-white shadow-sm'
                    : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
