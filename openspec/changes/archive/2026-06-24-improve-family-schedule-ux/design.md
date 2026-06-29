# 设计：家庭日程移动端体验与标记优化

## 1. 默认首页与导航顺序

`App.tsx` 顶层 `view` 状态默认值由 `'property'` 改为 `'family'`；`navItems` 顺序调整为「家庭日程」在前、「房产看板」在后，与默认视图一致。其余切换逻辑（双视图保持挂载、互不重置筛选）不变。

## 2. 手机端日历布局修复（核心）

### 根因
`src/components/ui/calendar.tsx` 为 shadcn 新版（面向 Tailwind v4）模板，使用了 `size-(--cell-size)`、`min-w-(--cell-size)`、`[--cell-size:--spacing(8)]` 等 **v4 专属语法**。本项目 `tailwindcss@3.4.19`，这些类名**不会编译为 CSS**（已通过 grep 构建产物确认 `--cell-size` 相关宽高规则数为 0）。结果：日期格退化为 `aspect-square`，窄屏下「数字 + 圆点」内容撑破方格向下溢出，最后一周压到图例。

### 方案
不改动 `calendar.tsx`（避免影响其它潜在用法），而是在 `FamilySchedule.tsx` 调用处通过 `classNames` 用 **v3 兼容类**覆盖关键布局：

```tsx
classNames={{
  month: 'flex flex-col w-full gap-3',
  table: 'w-full border-collapse',
  weekdays: 'flex w-full',
  weekday: 'flex-1 text-muted-foreground font-normal text-[0.8rem] select-none',
  week: 'flex w-full mt-1',
  day: 'relative flex-1 h-11 p-0 text-center select-none',
}}
```

- `flex-1` 让 7 列等宽且必定铺满视口宽度（不再依赖固定 `--cell-size`）。
- `h-11`（2.75rem）给日期格固定行高，行高不随有无事件跳动，杜绝溢出。

自定义 `DayButtonWithDots` 同步改为 `h-11 w-full flex-col items-center justify-center`，并保留**始终占位的圆点行**（`h-1.5`），保证有/无事件时行高一致。

### 徽章防变形
`CategoryBadge`/`EventBadge` 加 `shrink-0 whitespace-nowrap`，避免与长标题在同一 flex 行中被压缩成圆形。

## 3. 假期派生标记（浅绿）

API 的 `category` 仅 `学校`/`培训班`/`其它`，不能新增分类。故「假期」作为**渲染期派生标记**：

```ts
// src/types/schedule.ts
const HOLIDAY_PATTERN = /假|節|节|誕|诞|紀念日|纪念日/;
export function isHolidayEvent(ev: Pick<FamilyEvent, 'category' | 'title'>): boolean {
  return ev.category === '学校' && HOLIDAY_PATTERN.test(ev.title);
}
export const HOLIDAY_LABEL = '假期';
export const HOLIDAY_COLOR = 'bg-green-400';
export const HOLIDAY_BADGE = 'bg-green-50 text-green-700 border-green-200';
```

- 命中假期的事件：日历圆点用 `HOLIDAY_COLOR`，事件徽章显示浅绿「假期」而非蓝色「学校」。
- 图例新增一项「● 假期」。
- 派生判断在渲染时进行，对 API 数据与前端兜底数据同时生效，无需改后端。
- 经核对实际数据命中 7 项（复活节及清明节假期、劳动节、佛诞、佛诞翌日、端午节、香港特别行政区成立纪念日、暑假），无误判。

## 4. 培训班配色改紫

`CATEGORY_COLOR.培训班`: `bg-emerald-500` → `bg-purple-500`；
`CATEGORY_BADGE.培训班`: emerald 系 → `bg-purple-50 text-purple-700 border-purple-200`。
最终四色：学校蓝 · 培训班紫 · 其它琥珀 · 假期浅绿，彼此区分明显。

## 5. 事件区响应式顺序对调

事件区为 `grid grid-cols-1 lg:grid-cols-2`。用 `order` 工具类做响应式排序，不改 DOM：

- 「所选日期的安排」卡片：`order-1 lg:order-none`
- 「近期事件」卡片：`order-2 lg:order-none`

效果：手机单列下「所选日期」在上；桌面 `lg` 恢复自然 DOM 顺序（近期事件左、所选日期右）。

## 6. 数据清理（聚焦小一）

通过日程管理 API（先 `GET` 确认、再 `DELETE`，带 `X-API-Key`）删除其他年级专属事件：小六毕业营及家长会、小五毕业营家长会、小三 TSA（含视艺/后备日）、同根同心(P4)、小六派发成绩表、中一派位公布、中学注册，以及联校水运会、（下学年）小一新生家长会。全校通用项（考试、家长日、陆运会、结业礼）与假期保留。

## 部署

`npm run build` → `scp dist/* → 临时目录` → `sudo rsync --delete --chmod=... --exclude data` 到 `$WEB_DIR`，并以构建产物哈希核对线上是否生效。数据清理仅经 API，不触碰前端部署。
