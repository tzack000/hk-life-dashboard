import {
  formatTripDateRange,
  tripCountdownText,
  useUpcomingTrip,
} from '@/hooks/use-trips';
import { ROUTES } from '@/lib/routes';

const ENTRIES = [
  {
    path: ROUTES.family,
    category: '日程',
    title: '家庭日程',
    description: '学校放假、培训班和其它家庭事项',
    image: '/covers/family.jpg',
    imageAlt: '一家人和挂历的插画',
  },
  {
    path: ROUTES.trip,
    category: '出行',
    title: '近期行程',
    description: '出行安排、预订状态和出发前要补的事项',
    image: '/covers/trip.jpg',
    imageAlt: '行李箱、飞机和海岛的插画',
  },
  {
    path: ROUTES.property,
    category: '房产',
    title: '房产看板',
    description: '各区域租赁与购房成交，按月份和小区查看',
    image: '/covers/property.jpg',
    imageAlt: '海旁住宅楼的插画',
  },
  {
    path: ROUTES.learn,
    category: '英语',
    title: '学习资源',
    description: '剑桥雅思 4–21 听力音频与真题 PDF',
    image: '/covers/study.jpg',
    imageAlt: '戴着耳机看书的插画',
  },
] as const;

export function HomePage({ navigate }: { navigate: (to: string) => void }) {
  const upcomingTrip = useUpcomingTrip();

  return (
    <main>
      <section className="relative overflow-hidden">
        <img
          src="/dragon-back.jpg"
          alt="从龙脊远望石澳一带的山与海"
          width={1920}
          height={1440}
          className="h-64 w-full object-cover object-[center_42%] sm:h-80 lg:h-96"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,#F8FAFC_0%,rgba(248,250,252,0.92)_16%,rgba(248,250,252,0)_40%)]" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-4 pb-6 sm:px-6 sm:pb-8 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-[#0F172A] sm:text-4xl">
            ZT Life
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <p className="max-w-xl text-sm leading-relaxed text-[#64748B] sm:text-base">
          Enjoy our life~
        </p>
        <p className="mt-2 text-xs text-[#94A3B8]">
          龙脊远望石澳。照片：
          <a
            href="https://commons.wikimedia.org/wiki/File:Dragon%27s_Back,_Hong_Kong_01.jpg"
            className="underline decoration-[#CBD5E1] underline-offset-2 hover:text-[#64748B]"
            target="_blank"
            rel="noreferrer"
          >
            ChInG_*
          </a>
          ，
          <a
            href="https://creativecommons.org/licenses/by-sa/2.0/"
            className="underline decoration-[#CBD5E1] underline-offset-2 hover:text-[#64748B]"
            target="_blank"
            rel="noreferrer"
          >
            CC BY-SA 2.0
          </a>
        </p>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {ENTRIES.map((entry) => {
            const meta =
              entry.path === ROUTES.trip && upcomingTrip
                ? `${upcomingTrip.trip.title} · ${formatTripDateRange(upcomingTrip.trip.startDate, upcomingTrip.trip.endDate)} · ${tripCountdownText(upcomingTrip)}`
                : entry.description;
            return (
              <a
                key={entry.path}
                href={entry.path}
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
                  event.preventDefault();
                  navigate(entry.path);
                }}
                className="group flex h-full flex-col rounded-2xl bg-white p-3 shadow-[0_8px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(15,23,42,0.1)]"
              >
                <img
                  src={entry.image}
                  alt={entry.imageAlt}
                  width={1024}
                  height={768}
                  className="aspect-[4/3] w-full rounded-xl object-cover"
                />
                <span className="mt-4 px-1.5 text-xs font-medium text-[#64748B]">{entry.category}</span>
                <span className="mt-1.5 px-1.5 text-lg font-semibold leading-snug text-[#0F172A]">
                  {entry.title}
                </span>
                <span className="mt-3 flex-1 px-1.5 pb-2 text-xs leading-relaxed text-[#94A3B8]">
                  {meta}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </main>
  );
}
