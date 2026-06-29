import { useMemo } from 'react';
import { CalendarDays, Clock, MapPin, StickyNote } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { DayButton } from 'react-day-picker';

import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFamilySchedule, type CategoryFilter } from '@/hooks/use-family-schedule';
import {
  CATEGORY_BADGE,
  CATEGORY_COLOR,
  EVENT_CATEGORIES,
  HOLIDAY_BADGE,
  HOLIDAY_COLOR,
  HOLIDAY_LABEL,
  isHolidayEvent,
  type EventCategory,
  type FamilyEvent,
} from '@/types/schedule';

const FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  ...EVENT_CATEGORIES.map((c) => ({ value: c as CategoryFilter, label: c })),
];

/** 事件时间段文案 */
function timeText(ev: FamilyEvent): string | null {
  if (ev.startTime && ev.endTime) return `${ev.startTime} - ${ev.endTime}`;
  if (ev.startTime) return ev.startTime;
  return null;
}

/** 事件日期段文案（多日显示区间） */
function dateText(ev: FamilyEvent): string {
  if (ev.endDate && ev.endDate !== ev.startDate) {
    return `${ev.startDate} ~ ${ev.endDate}`;
  }
  return ev.startDate;
}

/** 事件标记徽章：假期单独显示为浅绿色「假期」，否则按分类显示 */
function EventBadge({ ev }: { ev: FamilyEvent }) {
  const holiday = isHolidayEvent(ev);
  const label = holiday ? HOLIDAY_LABEL : ev.category;
  const dotColor = holiday ? HOLIDAY_COLOR : CATEGORY_COLOR[ev.category];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium',
        holiday ? HOLIDAY_BADGE : CATEGORY_BADGE[ev.category],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dotColor)} />
      {label}
    </span>
  );
}

/** 单个事件卡片 */
function EventItem({
  ev,
  highlight = false,
}: {
  ev: FamilyEvent;
  highlight?: boolean;
}) {
  const tt = timeText(ev);
  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-colors',
        highlight
          ? 'border-amber-200 bg-amber-50/60'
          : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-[#0F172A]">{ev.title}</p>
        <EventBadge ev={ev} />
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" />
          {dateText(ev)}
        </span>
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

export function FamilySchedule() {
  const {
    dataSource,
    category,
    setCategory,
    selectedMonth,
    setSelectedMonth,
    selectedDate,
    setSelectedDate,
    eventsByDate,
    eventsForSelectedDate,
    upcomingEvents,
    upcomingDays,
  } = useFamilySchedule();

  // 自定义日期按钮：在日期下方渲染分类圆点
  const DayButtonWithDots = useMemo(() => {
    return function DayButtonWithDots({
      className,
      day,
      modifiers,
      children,
      ...props
    }: React.ComponentProps<typeof DayButton>) {
      const key = format(day.date, 'yyyy-MM-dd');
      const dayEvents = eventsByDate.get(key) ?? [];
      // 去重圆点颜色（假期归为浅绿，其余按分类），最多展示 3 个
      const dotColors = Array.from(
        new Set(
          dayEvents.map((e) =>
            isHolidayEvent(e) ? HOLIDAY_COLOR : CATEGORY_COLOR[e.category],
          ),
        ),
      ).slice(0, 3);
      return (
        <Button
          variant="ghost"
          size="icon"
          data-selected-single={
            modifiers.selected &&
            !modifiers.range_start &&
            !modifiers.range_end &&
            !modifiers.range_middle
          }
          className={cn(
            'flex h-11 w-full flex-col items-center justify-center gap-0.5 rounded-md p-0 text-sm leading-none font-normal',
            'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground',
            className,
          )}
          {...props}
        >
          <span>{children}</span>
          {/* 始终占位的圆点行，避免有/无事件导致行高跳动与溢出 */}
          <span className="flex h-1.5 items-center justify-center gap-0.5">
            {dotColors.map((color) => (
              <span key={color} className={cn('h-1.5 w-1.5 rounded-full', color)} />
            ))}
          </span>
        </Button>
      );
    };
  }, [eventsByDate]);

  const selectedLabel = selectedDate
    ? format(selectedDate, 'yyyy年M月d日')
    : '未选择日期';

  const sourceText =
    dataSource === 'api'
      ? '数据来源：日程管理 API'
      : dataSource === 'loading'
        ? '数据加载中...'
        : '数据来源：内置示例（API 不可用，已降级）';

  return (
    <div className="space-y-6">
      {/* 分类筛选 + 数据来源 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex h-9 items-center rounded-lg bg-[#F1F5F9] p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setCategory(f.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all sm:text-sm',
                category === f.value
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#475569]',
              )}
            >
              {f.value !== 'all' && (
                <span
                  className={cn('h-2 w-2 rounded-full', CATEGORY_COLOR[f.value as EventCategory])}
                />
              )}
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[#94A3B8]">{sourceText}</p>
      </div>

      <div className="space-y-6">
        {/* 日历视图（上方） */}
        <Card className="py-4">
          <CardContent className="overflow-hidden px-3 sm:px-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={selectedMonth}
              onMonthChange={setSelectedMonth}
              showOutsideDays
              className="mx-auto w-full max-w-md"
              classNames={{
                month: 'flex flex-col w-full gap-3',
                table: 'w-full border-collapse',
                weekdays: 'flex w-full',
                weekday: 'flex-1 text-muted-foreground font-normal text-[0.8rem] select-none',
                week: 'flex w-full mt-1',
                day: 'relative flex-1 h-11 p-0 text-center select-none',
              }}
              components={{ DayButton: DayButtonWithDots }}
            />
            {/* 图例 */}
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t pt-3 text-xs text-[#64748B]">
              {EVENT_CATEGORIES.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5">
                  <span className={cn('h-2 w-2 rounded-full', CATEGORY_COLOR[c])} />
                  {c}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', HOLIDAY_COLOR)} />
                {HOLIDAY_LABEL}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 事件区（下方）：近期事件 + 所选日期，桌面并排、移动堆叠 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 近期事件高亮（移动端排在所选日期之后，桌面回到左侧） */}
          <Card className="order-2 lg:order-none">
            <CardHeader>
              <CardTitle className="text-base">
                近期事件
                <span className="ml-2 text-xs font-normal text-[#94A3B8]">
                  未来 {upcomingDays} 天
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((ev) => <EventItem key={ev.id} ev={ev} highlight />)
              ) : (
                <p className="py-4 text-center text-sm text-[#94A3B8]">
                  未来 {upcomingDays} 天暂无安排
                </p>
              )}
            </CardContent>
          </Card>

          {/* 所选日期事件（移动端优先显示，桌面回到右侧） */}
          <Card className="order-1 lg:order-none">
            <CardHeader>
              <CardTitle className="text-base">{selectedLabel} 的安排</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {eventsForSelectedDate.length > 0 ? (
                eventsForSelectedDate.map((ev) => <EventItem key={ev.id} ev={ev} />)
              ) : (
                <p className="py-4 text-center text-sm text-[#94A3B8]">当天暂无事件</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
