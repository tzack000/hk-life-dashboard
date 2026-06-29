import { useState, useMemo, useEffect } from 'react';
import {
  addDays,
  eachDayOfInterval,
  format,
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { familyEvents } from '@/data/family-events';
import type { EventCategory, FamilyEvent } from '@/types/schedule';

/** 日程 API 基址：生产经 Nginx 反代，开发同源 fallback 到内置数据 */
const API_BASE = '/api/schedule';

/** 未来高亮天数 */
const UPCOMING_DAYS = 7;

export type CategoryFilter = EventCategory | 'all';

type DataSource = 'loading' | 'api' | 'mock';

async function fetchEvents(): Promise<FamilyEvent[] | null> {
  try {
    const resp = await fetch(`${API_BASE}/events`, { cache: 'no-cache' });
    if (!resp.ok) return null;
    const data = await resp.json();
    const events: FamilyEvent[] = Array.isArray(data) ? data : data.events;
    if (events && events.length > 0) return events;
    return null;
  } catch {
    return null;
  }
}

/** 把事件的日期区间展开为 YYYY-MM-DD 字符串集合 */
function eventDateKeys(ev: FamilyEvent): string[] {
  const start = parseISO(ev.startDate);
  const end = ev.endDate ? parseISO(ev.endDate) : start;
  if (end < start) return [ev.startDate];
  return eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'));
}

/** 事件区间是否与 [from, to] 相交 */
function eventIntersects(ev: FamilyEvent, from: Date, to: Date): boolean {
  const start = parseISO(ev.startDate);
  const end = ev.endDate ? parseISO(ev.endDate) : start;
  return start <= to && end >= from;
}

export function useFamilySchedule() {
  const [serverEvents, setServerEvents] = useState<FamilyEvent[] | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('loading');

  useEffect(() => {
    fetchEvents().then((events) => {
      if (events) {
        setServerEvents(events);
        setDataSource('api');
      } else {
        setDataSource('mock');
      }
    });
  }, []);

  const events = useMemo<FamilyEvent[]>(
    () => (dataSource === 'api' && serverEvents ? serverEvents : familyEvents),
    [dataSource, serverEvents],
  );

  const [category, setCategory] = useState<CategoryFilter>('all');
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => new Date());

  // 分类筛选后的事件
  const filteredEvents = useMemo(
    () => (category === 'all' ? events : events.filter((e) => e.category === category)),
    [events, category],
  );

  // 日期 → 当日事件列表（含多日事件区间展开）
  const eventsByDate = useMemo(() => {
    const map = new Map<string, FamilyEvent[]>();
    for (const ev of filteredEvents) {
      for (const key of eventDateKeys(ev)) {
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      }
    }
    return map;
  }, [filteredEvents]);

  // 所选日期当天事件
  const eventsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate.get(key) ?? [];
  }, [eventsByDate, selectedDate]);

  // 近期事件（未来 N 天内，按起始日期升序），多日事件只要区间相交即纳入
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = addDays(start, UPCOMING_DAYS);
    return filteredEvents
      .filter((ev) => eventIntersects(ev, start, end))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [filteredEvents]);

  // 判断单个事件是否处于近期高亮区间
  const isUpcoming = (ev: FamilyEvent): boolean => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return isWithinInterval(parseISO(ev.startDate), { start, end: addDays(start, UPCOMING_DAYS) })
      || eventIntersects(ev, start, addDays(start, UPCOMING_DAYS));
  };

  return {
    events,
    filteredEvents,
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
    isUpcoming,
    upcomingDays: UPCOMING_DAYS,
  };
}
