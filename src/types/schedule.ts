export type EventCategory = '学校' | '培训班' | '其它';

export const EVENT_CATEGORIES: EventCategory[] = ['学校', '培训班', '其它'];

export interface FamilyEvent {
  id: string;
  title: string;
  category: EventCategory;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // 多日事件，缺省=单日
  startTime?: string; // HH:mm，可选
  endTime?: string; // HH:mm，可选
  location?: string;
  note?: string;
}

export interface FamilyScheduleData {
  lastUpdated?: string;
  events: FamilyEvent[];
}

/** 分类颜色映射（圆点 / 标签底色） */
export const CATEGORY_COLOR: Record<EventCategory, string> = {
  学校: 'bg-blue-500',
  培训班: 'bg-purple-500',
  其它: 'bg-amber-500',
};

/** 分类对应的浅色徽章样式 */
export const CATEGORY_BADGE: Record<EventCategory, string> = {
  学校: 'bg-blue-50 text-blue-700 border-blue-200',
  培训班: 'bg-purple-50 text-purple-700 border-purple-200',
  其它: 'bg-amber-50 text-amber-700 border-amber-200',
};

/**
 * 假期识别：「学校」分类下，标题含假期/节庆关键词的事件视为假期，
 * 单独用浅绿色标记（API 的 category 仅限三类，故假期作为派生标记处理）。
 */
const HOLIDAY_PATTERN = /假|節|节|誕|诞|紀念日|纪念日/;

export function isHolidayEvent(ev: Pick<FamilyEvent, 'category' | 'title'>): boolean {
  return ev.category === '学校' && HOLIDAY_PATTERN.test(ev.title);
}

/** 假期标记的浅绿色样式 */
export const HOLIDAY_LABEL = '假期';
export const HOLIDAY_COLOR = 'bg-green-400';
export const HOLIDAY_BADGE = 'bg-green-50 text-green-700 border-green-200';
