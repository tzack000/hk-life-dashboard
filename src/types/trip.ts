/** 行程事件类型：交通 / 住宿 / 活动 / 餐饮 / 其它 */
export type TripEventKind = '交通' | '住宿' | '活动' | '餐饮' | '其它';

export const TRIP_EVENT_KINDS: TripEventKind[] = ['交通', '住宿', '活动', '餐饮', '其它'];

/** 预订状态 */
export type TripEventStatus = '已确认' | '待确认' | '待补';

export interface TripEvent {
  id: string;
  /** 所属天数（Day 1 起） */
  day: number;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  title: string;
  kind: TripEventKind;
  status: TripEventStatus;
  location?: string;
  /** 费用说明 */
  cost?: string;
  /** 备注 / 注意事项 */
  note?: string;
  /** 外部链接（地图、订单等） */
  link?: string;
  /** 是否需要重点提示 */
  important?: boolean;
}

/** 每日待补 / 待办清单 */
export interface TripTodo {
  id: string;
  text: string;
  done?: boolean;
}

export interface TripDay {
  day: number;
  date: string; // YYYY-MM-DD
  weekday: string; // 周一 / 周二 ...
  title: string;
  /** 当天小结（可选） */
  summary?: string;
  events: TripEvent[];
  todos?: TripTodo[];
  /** 当天需要补充的信息 */
  pending?: string[];
}

/** 待办任务优先级 */
export type TodoPriority = 'P0' | 'P1' | 'P2';

export interface TripTask {
  id: string;
  priority: TodoPriority;
  text: string;
}

export interface TripBooking {
  id: string;
  item: string;
  date: string;
  info: string;
  status: TripEventStatus;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  /** 人数说明 */
  travelers: string;
  cover?: string;
  /** 一句话概览 */
  summary: string;
  days: TripDay[];
  bookings: TripBooking[];
  tasks: TripTask[];
}

/** 事件类型配色（圆点） */
export const TRIP_KIND_COLOR: Record<TripEventKind, string> = {
  交通: 'bg-sky-500',
  住宿: 'bg-indigo-500',
  活动: 'bg-emerald-500',
  餐饮: 'bg-orange-500',
  其它: 'bg-slate-400',
};

/** 事件类型浅色徽章 */
export const TRIP_KIND_BADGE: Record<TripEventKind, string> = {
  交通: 'bg-sky-50 text-sky-700 border-sky-200',
  住宿: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  活动: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  餐饮: 'bg-orange-50 text-orange-700 border-orange-200',
  其它: 'bg-slate-50 text-slate-600 border-slate-200',
};

/** 预订状态徽章 */
export const TRIP_STATUS_BADGE: Record<TripEventStatus, string> = {
  已确认: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  待确认: 'bg-amber-50 text-amber-700 border-amber-200',
  待补: 'bg-rose-50 text-rose-700 border-rose-200',
};

/** 优先级徽章 */
export const TRIP_PRIORITY_BADGE: Record<TodoPriority, string> = {
  P0: 'bg-rose-500 text-white border-rose-500',
  P1: 'bg-amber-500 text-white border-amber-500',
  P2: 'bg-slate-400 text-white border-slate-400',
};
