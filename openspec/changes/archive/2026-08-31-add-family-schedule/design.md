# 设计：家庭日程页面

## 技术栈对齐

复用现有前端栈：React 19 + TS + Vite + Tailwind + shadcn/ui。无需新增依赖（`react-day-picker`/`calendar`、`card`、`badge`、`tabs`、`select`、`date-fns` 均已在 package.json 中）。

## 顶层导航与视图切换

在 `App.tsx` 引入一个顶层 `view` 状态：`'property' | 'family'`，默认 `'property'`。

- 在 `Header` 中（或新增轻量顶部 Tab）放置视图切换控件。为最小侵入，方案：在 `App.tsx` 顶部用 shadcn `Tabs` 包一层视图切换，`property` 渲染现有看板，`family` 渲染新 `FamilySchedule` section。
- 现有房产筛选状态（来自 `useRentalData`）保留在 `property` 分支内，切换视图不重置。

## 数据模型

新增 `src/types/schedule.ts`：

```ts
export type EventCategory = '学校' | '培训班' | '其它';

export interface FamilyEvent {
  id: string;
  title: string;
  category: EventCategory;
  startDate: string;   // YYYY-MM-DD
  endDate?: string;    // 多日事件，缺省=单日
  startTime?: string;  // HH:mm，可选
  endTime?: string;    // HH:mm，可选
  location?: string;
  note?: string;
}

export interface FamilyScheduleData {
  lastUpdated?: string;
  events: FamilyEvent[];
}
```

分类颜色映射（集中定义，避免散落）：
```ts
export const CATEGORY_COLOR: Record<EventCategory, string> = {
  学校: 'bg-blue-500',
  培训班: 'bg-emerald-500',
  其它: 'bg-amber-500',
};
```

## 静态数据

新增 `src/data/family-events.ts`，导出 `familyEvents: FamilyEvent[]`（含若干学校放假、培训班、其它示例事件，覆盖单日与多日）。

## 数据加载 Hook

新增 `src/hooks/use-family-schedule.ts`，模式对齐 `use-rental-data.ts`：
- `fetchEvents()` 调用日程 API `GET /api/schedule/events`（基址见下），失败/空则返回 null。
- 降级使用 `familyEvents`（内置 mock）。
- 暴露：`events`、`dataSource`、`lastUpdated`、`category`/`setCategory`（筛选）、`selectedMonth`/`setSelectedMonth`、`selectedDate`/`setSelectedDate`、派生的 `eventsForSelectedDate`、`upcomingEvents`（未来 7 天）、`eventsByDate`（日历标记用）。

事件区间展开工具：将多日事件展开为日期集合，便于日历标记与按日筛选。

## 后端：日程管理 API

新增 `scraper/schedule_server.py`，参照 `analytics_server.py` 结构（Flask + flask_cors + 线程局部 SQLite 连接 + WAL）。

- **DB**：`/opt/kai-tak-scraper/schedule.db`，表 `family_events`：
  ```sql
  CREATE TABLE IF NOT EXISTS family_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,        -- 学校 / 培训班 / 其它
    start_date TEXT NOT NULL,      -- YYYY-MM-DD
    end_date TEXT,                 -- 可选，多日事件
    start_time TEXT,               -- 可选 HH:mm
    end_time TEXT,                 -- 可选 HH:mm
    location TEXT,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime')),
    updated_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_events_start ON family_events(start_date);
  ```
- **端点**（前缀 `/api/schedule`）：
  | 方法 | 路径 | 说明 | 鉴权 |
  |------|------|------|------|
  | GET | `/api/schedule/events` | 查询，支持 `category`/`from`/`to`/`upcoming` | 公开 |
  | POST | `/api/schedule/events` | 新增 | `X-API-Key` |
  | PUT | `/api/schedule/events/<id>` | 更新 | `X-API-Key` |
  | DELETE | `/api/schedule/events/<id>` | 删除 | `X-API-Key` |
- **鉴权**：写操作校验 `X-API-Key == SCHEDULE_API_KEY`（从环境变量读取，缺省随机生成并打印到日志一次）。
- **校验**：必填 `title`/`category`/`startDate`；`category` 限三类；日期 `YYYY-MM-DD`、时间 `HH:mm` 格式校验；非法返回 400。
- **端口**：`127.0.0.1:8902`（避开 8901 analytics）。
- **部署**：新增 `scraper/kai-tak-schedule.service`（仿 `kai-tak-analytics.service`，systemd 常驻）。Nginx 增加 `location /api/schedule/ { proxy_pass http://127.0.0.1:8902; }`。

返回字段统一用 camelCase（与前端 `FamilyEvent` 对齐），DB 列 snake_case，在序列化层转换。

## AI Agent SKILL：family-calendar

新增 `.claude/skills/family-calendar/SKILL.md`，frontmatter 风格对齐现有 openspec skills：
```
---
name: family-calendar
description: 通过日程管理 API 查询与维护家庭日历（学校放假、培训班、其它家庭事项）。
metadata: { author: hk-life-dashboard, version: "1.0" }
---
```
内容包含：
- **API 基址**：生产 `https://$SITE_DOMAIN/api/schedule`；本地 `http://127.0.0.1:8902/api/schedule`。
- **鉴权**：写操作需 `X-API-Key`（从 `.env` 的 `SCHEDULE_API_KEY` 读取，勿明文写入 SKILL）。
- **事件字段规范**：`title`、`category`(学校/培训班/其它)、`startDate`、`endDate?`、`startTime?`、`endTime?`、`location?`、`note?`。
- **`curl` 调用示例**：查询近期、按分类查询、新增、更新、删除。
- **安全操作约定**："先查后改"（写前先 GET 确认目标）、"确认后写"（修改/删除前向用户复述具体内容）、日期相对解析以服务器时区为准。

## 文件清单

| 类型 | 文件 |
|------|------|
| 新增 | `src/types/schedule.ts` |
| 新增 | `src/data/family-events.ts` |
| 新增 | `src/hooks/use-family-schedule.ts` |
| 新增 | `src/sections/FamilySchedule.tsx` |
| 修改 | `src/App.tsx`（视图切换） |
| 新增 | `scraper/schedule_server.py`（日程管理 API） |
| 新增 | `scraper/kai-tak-schedule.service`（systemd 单元） |
| 新增 | `.claude/skills/family-calendar/SKILL.md`（AI Agent 技能） |
| 修改 | `.env.example`（新增 `SCHEDULE_API_KEY`、`SCHEDULE_API_PORT`） |
| 修改 | Nginx 配置（新增 `/api/schedule/` 反代，服务器侧手动） |

## 风险与权衡

- **react-day-picker v9** 的 `modifiers` API 需确认 `calendar.tsx` 暴露的 props 透传；若受限，可在日期单元格下方自绘圆点。
- **鉴权简化**：仅共享密钥，无多用户，符合家庭场景；密钥务必经 `.env` 注入，不入库不入 SKILL 明文。
- **新增常驻服务**：需在服务器配置 systemd + Nginx 反代，部署步骤比纯静态多一步；沿用 analytics 既有模式可降低风险。
- 前端部署仍走现有流程（注意 `--exclude data`）；后端部署参照 CLAUDE.md 爬虫/服务部署规范（`scp → sudo cp → systemctl`）。
