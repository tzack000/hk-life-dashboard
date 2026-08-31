import { useMemo } from 'react';
import {
  differenceInCalendarDays,
  format,
  parseISO,
} from 'date-fns';
import { trips as allTrips } from '@/data/trips/okinawa-2026';
import type { Trip, TripDay, TripEventKind, TripTask } from '@/types/trip';

export type TripPhase = 'upcoming' | 'ongoing' | 'past';

export interface TripWithState {
  trip: Trip;
  phase: TripPhase;
  /** >0 还剩几天出发；进行中为 0；已结束为负数（结束至今天数取反） */
  daysToStart: number;
  /** 进行中时剩余天数（含今天），否则为 0 */
  daysRemaining: number;
  totalDays: number;
  /** 当前进行到第几天（未开始/已结束为 undefined） */
  currentDay?: TripDay;
  /** 距离出发的进度百分比 0-100 */
  progress: number;
}

/** 计算今天的零点时间，避免时分秒干扰天数计算 */
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function buildTripState(trip: Trip): TripWithState {
  const today = startOfToday();
  const start = parseISO(trip.startDate);
  const end = parseISO(trip.endDate);
  const totalDays = differenceInCalendarDays(end, start) + 1;

  const daysToStart = differenceInCalendarDays(start, today);
  const daysToEnd = differenceInCalendarDays(end, today);

  let phase: TripPhase;
  if (daysToStart > 0) {
    phase = 'upcoming';
  } else if (daysToEnd >= 0) {
    phase = 'ongoing';
  } else {
    phase = 'past';
  }

  let currentDay: TripDay | undefined;
  if (phase === 'ongoing') {
    const idx = differenceInCalendarDays(today, start);
    currentDay = trip.days.find((d) => d.day === idx + 1);
  }

  // 进度：未开始为 0，已结束为 100，进行中按已过天数占比
  let progress = 0;
  if (phase === 'past') {
    progress = 100;
  } else if (phase === 'ongoing') {
    const passed = differenceInCalendarDays(today, start) + 1;
    progress = Math.min(100, Math.round((passed / totalDays) * 100));
  }

  return {
    trip,
    phase,
    daysToStart,
    daysRemaining: phase === 'ongoing' ? daysToEnd + 1 : 0,
    totalDays,
    currentDay,
    progress,
  };
}

export type TodoPriorityFilter = 'all' | 'P0' | 'P1' | 'P2';

export function useTrips() {
  const tripStates = useMemo(
    () =>
      allTrips
        .map(buildTripState)
        .sort((a, b) => a.trip.startDate.localeCompare(b.trip.startDate)),
    [],
  );

  // 默认选中：第一场未开始的行程；若都已结束则选最近的
  const defaultTrip = useMemo(() => {
    const upcoming = tripStates.find((t) => t.phase === 'upcoming');
    const ongoing = tripStates.find((t) => t.phase === 'ongoing');
    return ongoing ?? upcoming ?? tripStates[tripStates.length - 1];
  }, [tripStates]);

  return {
    tripStates,
    defaultTrip,
  };
}

/**
 * 取「近期需要关注的行程」：进行中优先，其次未来 N 天内即将出发的。
 * 用于在家庭日程的近期事件中提示相关行程。
 */
export function useUpcomingTrip(withinDays = 30): TripWithState | null {
  const { tripStates } = useTrips();
  return useMemo(() => {
    const ongoing = tripStates.find((t) => t.phase === 'ongoing');
    if (ongoing) return ongoing;
    const next = tripStates
      .filter((t) => t.phase === 'upcoming' && t.daysToStart <= withinDays)
      .sort((a, b) => a.daysToStart - b.daysToStart)[0];
    return next ?? null;
  }, [tripStates, withinDays]);
}

/** 行程倒计时提示文案 */
export function tripCountdownText(state: TripWithState): string {
  if (state.phase === 'ongoing') {
    return `行程进行中 · 还剩 ${state.daysRemaining} 天`;
  }
  if (state.daysToStart === 1) return '明天出发';
  if (state.daysToStart === 2) return '后天出发';
  return `还有 ${state.daysToStart} 天出发`;
}

/** 按日期格式化为中文可读文本 */
export function formatTripDateRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const sameYear = start.getFullYear() === end.getFullYear();
  const startText = format(start, sameYear ? 'yyyy年M月d日' : 'yyyy年M月d日');
  const endText = format(end, sameYear ? 'M月d日' : 'yyyy年M月d日');
  return `${startText} - ${endText}`;
}

/** 日期 → 周几（中文） */
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export function weekdayOf(date: string): string {
  return WEEKDAYS[parseISO(date).getDay()];
}

/** 统计行程中各类型事件数量 */
export function countByKind(trip: Trip): Record<TripEventKind, number> {
  const counts: Record<TripEventKind, number> = {
    交通: 0,
    住宿: 0,
    活动: 0,
    餐饮: 0,
    其它: 0,
  };
  for (const day of trip.days) {
    for (const ev of day.events) {
      counts[ev.kind] += 1;
    }
  }
  return counts;
}

/** 按优先级分组任务 */
export function groupTasksByPriority(tasks: TripTask[]): Record<'P0' | 'P1' | 'P2', TripTask[]> {
  return {
    P0: tasks.filter((t) => t.priority === 'P0'),
    P1: tasks.filter((t) => t.priority === 'P1'),
    P2: tasks.filter((t) => t.priority === 'P2'),
  };
}
