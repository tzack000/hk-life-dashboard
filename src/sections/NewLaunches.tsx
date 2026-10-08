import { useState } from 'react';
import { ChevronDown, TrainFront } from 'lucide-react';
import type { LaunchEvent, LaunchStatus, NewLaunch } from '@/types/new-launch';
import { cn } from '@/lib/utils';

const STATUS_CLASS: Record<LaunchStatus, string> = {
  发售中: 'bg-[#DBEAFE] text-[#1E40AF]',
  即将推售: 'bg-[#FEF3C7] text-[#92400E]',
  已售罄: 'bg-[#F1F5F9] text-[#64748B]',
};

function formatPrice(price: number | null): string {
  if (price == null || price <= 0) return '售价待公布';
  if (price >= 10000) {
    const wan = price / 10000;
    const text = wan >= 100
      ? Math.round(wan).toLocaleString('zh-HK')
      : wan.toFixed(1).replace(/\.0$/, '');
    return `$${text}万起`;
  }
  return `$${price.toLocaleString('zh-HK')}`;
}

function LaunchCard({
  launch,
  events,
}: {
  launch: NewLaunch;
  events: LaunchEvent[];
}) {
  const [open, setOpen] = useState(false);
  const latest = events[0];

  return (
    <article className="rounded-xl border bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A] sm:text-lg">{launch.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[#475569]">
            <TrainFront className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
            <span>{launch.nearestStation}站 · 约 {launch.minutesToKaiTak} 分钟</span>
          </p>
        </div>
        <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', STATUS_CLASS[launch.status])}>
          {launch.status}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-[#475569] sm:grid-cols-2">
        <div>发展商：{launch.developer || '发展商待公布'}</div>
        <div>地址：{launch.address || '地址待公布'}</div>
        <div>下一关键日期：{launch.keyDate || '日期待公布'}</div>
        <div>单位数目：{launch.unitCount == null ? '待公布' : `${launch.unitCount} 个`}</div>
        <div>售价：{formatPrice(launch.priceFrom)}</div>
      </dl>

      {latest && (
        <p className="mt-3 text-sm text-[#334155]">
          最新动态 {latest.date} {latest.summary}
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#1E40AF]"
        aria-expanded={open}
      >
        {open ? '收起动态' : '展开动态'}
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        events.length > 0 ? (
          <ol className="mt-3 space-y-2 border-t pt-3">
            {events.map((event) => (
              <li key={event.id} className="text-sm text-[#475569]">
                <span className="font-medium text-[#0F172A]">{event.date}</span>
                <span className="ml-2">{event.summary}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 border-t pt-3 text-sm text-[#94A3B8]">暂无动态</p>
        )
      )}

      {launch.sourceUrl && (
        <a
          href={launch.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm text-[#1E40AF] underline-offset-2 hover:underline"
        >
          查看来源
        </a>
      )}
    </article>
  );
}

export function NewLaunches({
  launches,
  catchmentCount,
  statusFilter,
  eventsByLaunch,
}: {
  launches: NewLaunch[];
  catchmentCount: number;
  statusFilter: string;
  eventsByLaunch: Map<string, LaunchEvent[]>;
}) {
  if (catchmentCount === 0) {
    return (
      <p className="rounded-xl border bg-white px-4 py-10 text-center text-sm text-[#64748B]">
        启德地铁 30 分钟内暂无追踪中的新盘
      </p>
    );
  }

  if (launches.length === 0) {
    return (
      <p className="rounded-xl border bg-white px-4 py-10 text-center text-sm text-[#64748B]">
        没有符合该状态的新盘
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#64748B]">
        {statusFilter === '全部' ? '全部状态' : statusFilter} · {launches.length} 个新盘
      </p>
      {launches.map((launch) => (
        <LaunchCard
          key={launch.id}
          launch={launch}
          events={eventsByLaunch.get(launch.id) ?? []}
        />
      ))}
    </div>
  );
}
