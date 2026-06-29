# 任务清单：家庭日程移动端体验与标记优化

> 本次为已落地的优化补记；任务均已完成并部署。

## 1. 默认首页与导航
- [x] 1.1 `src/App.tsx`：顶层 `view` 默认值改为 `'family'`
- [x] 1.2 `navItems` 顺序调整为「家庭日程」在前、「房产看板」在后

## 2. 手机端日历布局修复
- [x] 2.1 定位根因：`calendar.tsx` 使用 Tailwind v4 语法（`--cell-size`/`size-(...)`），v3.4 下不编译
- [x] 2.2 在 `FamilySchedule.tsx` 通过 `classNames` 用 v3 类覆盖：`week`/`weekday`/`day` 等改 `flex-1` 等宽 + `h-11` 固定行高
- [x] 2.3 自定义 `DayButtonWithDots` 改 `h-11 w-full flex-col`，保留始终占位的圆点行
- [x] 2.4 徽章加 `shrink-0 whitespace-nowrap`，防长标题挤压变形
- [x] 2.5 构建产物核对：`h-11`/`flex-1`/`shrink-0` 等类已编译进 CSS

## 3. 假期派生标记（浅绿）
- [x] 3.1 `src/types/schedule.ts`：新增 `isHolidayEvent`、`HOLIDAY_PATTERN`、`HOLIDAY_LABEL/COLOR/BADGE`
- [x] 3.2 `FamilySchedule.tsx`：日期圆点对假期用浅绿；`EventBadge` 对假期显示「假期」浅绿徽章
- [x] 3.3 图例新增「假期」一项
- [x] 3.4 对照实际数据核对命中 7 项假期，无误判

## 4. 培训班配色改紫
- [x] 4.1 `CATEGORY_COLOR.培训班` → `bg-purple-500`
- [x] 4.2 `CATEGORY_BADGE.培训班` → purple 系
- [x] 4.3 确认 src 无残留 emerald 引用，purple 类已编译

## 5. 事件区顺序对调
- [x] 5.1 「所选日期的安排」卡片加 `order-1 lg:order-none`
- [x] 5.2 「近期事件」卡片加 `order-2 lg:order-none`
- [x] 5.3 验证手机端所选日期优先、桌面端左右布局不变

## 6. 数据清理（聚焦小一）
- [x] 6.1 拉取全部事件，识别其他年级专属项
- [x] 6.2 先 `GET` 确认、再带 `X-API-Key` `DELETE` 13 条（小三/五/六、升中、联校水运会、新生家长会）
- [x] 6.3 复核剩余事件均为全校通用/假期/小一专属

## 7. 验证与部署
- [x] 7.1 每次改动 `npm run build` 通过（tsc + vite）
- [x] 7.2 关键 Tailwind 类编译核对（grep dist CSS）
- [x] 7.3 `scp + rsync --exclude data --chmod=...` 部署前端
- [x] 7.4 以构建产物哈希核对线上引用已更新
- [x] 7.5 手机端实测截图（issues/mobile-display）确认溢出/重叠/变形修复
