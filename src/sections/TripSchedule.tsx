import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock,
  ExternalLink,
  ListChecks,
  MapPin,
  Plane,
  StickyNote,
  Wallet,
} from 'lucide-react';
import { parseISO } from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  countByKind,
  formatTripDateRange,
  groupTasksByPriority,
  useTrips,
  weekdayOf,
  type TripWithState,
} from '@/hooks/use-trips';
import { snorkelNotes } from '@/data/trips/okinawa-2026';
import {
  TRIP_KIND_BADGE,
  TRIP_KIND_COLOR,
  TRIP_PRIORITY_BADGE,
  TRIP_STATUS_BADGE,
  type Trip,
  type TripDay,
  type TripEvent,
  type TripEventKind,
} from '@/types/trip';

const KIND_FILTERS: { value: TripEventKind | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: '交通', label: '交通' },
  { value: '住宿', label: '住宿' },
  { value: '活动', label: '活动' },
  { value: '餐饮', label: '餐饮' },
  { value: '其它', label: '其它' },
];

/** 事件时间文案 */
function timeText(ev: TripEvent): string | null {
  if (ev.startTime && ev.endTime) return `${ev.startTime} - ${ev.endTime}`;
  if (ev.startTime) return ev.startTime;
  return null;
}

/** 倒计时徽章 */
function CountdownBadge({ state }: { state: TripWithState }) {
  const { phase, daysToStart, daysRemaining } = state;
  if (phase === 'upcoming') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] px-3 py-1 text-xs font-medium text-white shadow-sm">
        <Plane className="h-3.5 w-3.5" />
        {daysToStart === 1 ? '明天出发' : `还有 ${daysToStart} 天出发`}
      </span>
    );
  }
  if (phase === 'ongoing') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white shadow-sm">
        <Plane className="h-3.5 w-3.5" />
        行程进行中 · 还剩 {daysRemaining} 天
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E2E8F0] px-3 py-1 text-xs font-medium text-[#64748B]">
      <Plane className="h-3.5 w-3.5" />
      已结束
    </span>
  );
}

/** 单个事件卡片 */
function TripEventItem({ ev }: { ev: TripEvent }) {
  const tt = timeText(ev);
  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        ev.important
          ? 'border-amber-200 bg-amber-50/60'
          : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-[#0F172A]">{ev.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
              TRIP_KIND_BADGE[ev.kind],
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', TRIP_KIND_COLOR[ev.kind])} />
            {ev.kind}
          </span>
          <span
            className={cn(
              'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
              TRIP_STATUS_BADGE[ev.status],
            )}
          >
            {ev.status}
          </span>
        </div>
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
        {tt && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {tt}
          </span>
        )}
        {ev.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {ev.location}
          </span>
        )}
        {ev.cost && (
          <span className="inline-flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5" />
            {ev.cost}
          </span>
        )}
        {ev.link && (
          <a
            href={ev.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[#3B82F6] hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            地图
          </a>
        )}
      </div>

      {ev.note && (
        <p className="mt-1.5 inline-flex items-start gap-1 text-xs text-[#94A3B8]">
          <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {ev.note}
        </p>
      )}
    </div>
  );
}

/** 单日区块 */
function TripDayBlock({
  day,
  kindFilter,
  isCurrent,
}: {
  day: TripDay;
  kindFilter: TripEventKind | 'all';
  isCurrent: boolean;
}) {
  const events = useMemo(
    () => (kindFilter === 'all' ? day.events : day.events.filter((e) => e.kind === kindFilter)),
    [day.events, kindFilter],
  );
  const pendingCount = day.pending?.length ?? 0;

  return (
    <Card
      className={cn(
        'overflow-hidden',
        isCurrent && 'border-emerald-300 ring-1 ring-emerald-200',
      )}
    >
      <CardHeader className="border-b bg-[#F8FAFC]/80 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] px-1.5 text-xs font-semibold text-white">
              Day {day.day}
            </span>
            <span className="text-[#0F172A]">{day.title}</span>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {isCurrent && (
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">今天</Badge>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-[#64748B]">
              <CalendarDays className="h-3.5 w-3.5" />
              {day.date} {weekdayOf(day.date)}
            </span>
          </div>
        </div>
        {day.summary && <p className="mt-1 text-xs text-[#94A3B8]">{day.summary}</p>}
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {events.length > 0 ? (
          <div className="space-y-2">
            {events.map((ev) => (
              <TripEventItem key={ev.id} ev={ev} />
            ))}
          </div>
        ) : (
          <p className="py-2 text-center text-sm text-[#94A3B8]">当前筛选下无安排</p>
        )}

        {day.todos && day.todos.length > 0 && (
          <div>
            <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-[#475569]">
              <ListChecks className="h-3.5 w-3.5" />
              当天待办
            </p>
            <ul className="space-y-1">
              {day.todos.map((t) => (
                <li key={t.id} className="flex items-start gap-2 text-xs text-[#64748B]">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CBD5E1]" />
                  {t.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {pendingCount > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3">
            <p className="mb-1.5 text-xs font-medium text-rose-700">待补信息（{pendingCount}）</p>
            <ul className="space-y-1">
              {day.pending!.map((p, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-rose-600/90">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** 底部更新时间文案：取行程出发月份 */
function formatUpdated(trip: Trip): string {
  const d = parseISO(trip.startDate);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function TripSchedule() {
  const { tripStates } = useTrips();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<TripEventKind | 'all'>('all');

  const states = useMemo(() => {
    const upcomingFirst = [...tripStates].sort((a, b) => {
      const rank = { ongoing: 0, upcoming: 1, past: 2 } as const;
      return rank[a.phase] - rank[b.phase] || a.trip.startDate.localeCompare(b.trip.startDate);
    });
    return upcomingFirst;
  }, [tripStates]);

  const activeState = useMemo(
    () => states.find((s) => s.trip.id === selectedId) ?? states[0],
    [states, selectedId],
  );

  if (!activeState) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-[#94A3B8]">
          暂无行程安排
        </CardContent>
      </Card>
    );
  }

  const trip: Trip = activeState.trip;
  const kindCounts = countByKind(trip);
  const { currentDay } = activeState;
  const taskGroups = groupTasksByPriority(trip.tasks);
  const pendingBookings = trip.bookings.filter((b) => b.status !== '已确认');

  return (
    <div className="space-y-6">
      {/* 行程概览 */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] text-white shadow-md">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold sm:text-2xl">{trip.title}</h1>
                <CountdownBadge state={activeState} />
              </div>
              <p className="text-sm text-white/85">{trip.destination}</p>
              <p className="inline-flex items-center gap-1.5 text-sm text-white/90">
                <CalendarDays className="h-4 w-4" />
                {formatTripDateRange(trip.startDate, trip.endDate)}
                <span className="text-white/60">
                  · {activeState.totalDays} 天 {activeState.totalDays - 1} 晚 · {trip.travelers}
                </span>
              </p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-white/90">{trip.summary}</p>

          {/* 进度条 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-white/80">
              <span>行程进度</span>
              <span>{activeState.progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${activeState.progress}%` }}
              />
            </div>
          </div>

          {/* 类型统计 */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(kindCounts) as TripEventKind[])
              .filter((k) => kindCounts[k] > 0)
              .map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs text-white"
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', TRIP_KIND_COLOR[k])} />
                  {k} {kindCounts[k]}
                </span>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* 多行程切换（当前仅一条时隐藏） */}
      {states.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {states.map((s) => (
            <button
              key={s.trip.id}
              onClick={() => setSelectedId(s.trip.id)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs transition-all sm:text-sm',
                s.trip.id === trip.id
                  ? 'border-[#3B82F6] bg-blue-50 text-[#1E40AF]'
                  : 'border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]',
              )}
            >
              {s.trip.title}
            </button>
          ))}
        </div>
      )}

      {/* 类型筛选 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex h-9 flex-wrap items-center rounded-lg bg-[#F1F5F9] p-0.5">
          {KIND_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setKindFilter(f.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all sm:text-sm',
                kindFilter === f.value
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#475569]',
              )}
            >
              {f.value !== 'all' && (
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    TRIP_KIND_COLOR[f.value as TripEventKind],
                  )}
                />
              )}
              {f.label}
            </button>
          ))}
        </div>
        {pendingBookings.length > 0 && (
          <p className="text-xs text-rose-600">
            {pendingBookings.length} 项预订待处理
          </p>
        )}
      </div>

      {/* 逐日行程 + 侧边信息 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {trip.days.map((day) => (
            <TripDayBlock
              key={day.day}
              day={day}
              kindFilter={kindFilter}
              isCurrent={currentDay?.day === day.day}
            />
          ))}
        </div>

        <div className="space-y-6">
          {/* 预订状态 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">预订状态</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {trip.bookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-lg border border-[#E2E8F0] bg-white p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-[#0F172A]">{b.item}</p>
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
                        TRIP_STATUS_BADGE[b.status],
                      )}
                    >
                      {b.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#64748B]">{b.date}</p>
                  <p className="mt-0.5 text-xs text-[#94A3B8]">{b.info}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 出发前任务 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                出发前任务
                <span className="ml-2 text-xs font-normal text-[#94A3B8]">
                  共 {trip.tasks.length} 项
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(['P0', 'P1', 'P2'] as const).map((p) => {
                const list = taskGroups[p];
                if (list.length === 0) return null;
                const label = p === 'P0' ? '不补会影响行程成立' : p === 'P1' ? '不补会增加当天压力' : '用于提升体验';
                return (
                  <div key={p} className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold',
                          TRIP_PRIORITY_BADGE[p],
                        )}
                      >
                        {p}
                      </span>
                      <span className="text-xs text-[#94A3B8]">{label}</span>
                    </div>
                    <ul className="space-y-1">
                      {list.map((t) => (
                        <li key={t.id} className="flex items-start gap-2 text-xs text-[#475569]">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CBD5E1]" />
                          {t.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* 浮潜注意事项 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">浮潜注意事项</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {snorkelNotes.map((n, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-[#64748B]">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    {n}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 底部说明 */}
      <p className="text-center text-xs text-[#94A3B8]">
        行程信息整理自个人笔记 · 出发前请再次核对航班、酒店与活动确认单
        {trip.startDate && ` · 更新于 ${formatUpdated(trip)}`}
      </p>
    </div>
  );
}
