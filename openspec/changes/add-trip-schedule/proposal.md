# 提案：新增「近期行程」视图（补记 + 修正默认视图）

## 背景与动机（Why）

「近期行程」视图已随冲绳 2026 行程一起实现并上线（约 1000 行代码），但存在两个规范层面的问题：

1. **能力没有任何规范**：`TripSchedule` / `use-trips` / `types/trip` / `data/trips` 直接进仓库，`openspec/specs/` 中没有 `trip-schedule` 能力描述，后续修改无据可依。
2. **与已有规范冲突**：`openspec/specs/family-schedule/spec.md` 的「默认首页」要求默认进入「家庭日程」，但 `src/App.tsx:16` 的默认视图是 `'trip'`，属于实现漂移。

本变更把行程能力补进规范，并把代码修正回与「默认首页」一致。

## 目标（What）

1. 为「近期行程」能力建立 `trip-schedule` 规范，覆盖行程概览、倒计时与阶段、逐日行程、事件类型筛选、预订状态、出发前任务、多行程切换，以及它在家庭日程中的提示条。
2. 修正 `src/App.tsx` 默认视图为「家庭日程」，使实现符合 `family-schedule` 规范的「默认首页」需求。
3. 在 `family-schedule` 规范中补充：顶层视图由两个扩展为三个，「近期行程」位于导航首位，但默认仍进入「家庭日程」。

## 非目标（Out of Scope）

- 不做行程的后端 CRUD 与持久化（行程数据仍是内置 TS 静态模块，与家庭日程的 API 模式不同）
- 不做行程编辑界面、多人协作与账号系统
- 不改变「家庭日程」已有的日历、分类筛选、近期事件等行为

## 影响

- `src/App.tsx`：默认视图 `trip` → `family`（用户可手动切换，导航顺序不变）
- 规范：新增 `openspec/specs/trip-schedule/spec.md`，更新 `openspec/specs/family-schedule/spec.md`
