# 任务清单：家庭日程页面

> 实现请配合 `/opsx:apply`，按顺序逐项完成并勾选。

## 1. 数据类型与静态数据
- [x] 1.1 新增 `src/types/schedule.ts`：`EventCategory`、`FamilyEvent`、`FamilyScheduleData`、`CATEGORY_COLOR`
- [x] 1.2 新增 `src/data/family-events.ts`：示例事件（含学校放假多日、培训班固定时间、其它单日，覆盖近期与非近期）

## 2. 数据加载与派生
- [x] 2.1 新增 `src/hooks/use-family-schedule.ts`，对齐 `use-rental-data.ts`：API 优先 + mock 降级
- [x] 2.2 实现多日事件区间展开工具与 `eventsByDate` 映射
- [x] 2.3 暴露筛选（category）、所选月份/日期、`eventsForSelectedDate`、`upcomingEvents`（未来7天）

## 3. 后端：日程管理 API
- [x] 3.1 新增 `scraper/schedule_server.py`（Flask + SQLite，端口 8902，参照 `analytics_server.py`）
- [x] 3.2 `init_db` 建表 `family_events` + 索引
- [x] 3.3 `GET /api/schedule/events`：支持 `category`/`from`/`to`/`upcoming` 过滤，camelCase 序列化
- [x] 3.4 `POST`/`PUT`/`DELETE` 事件，写操作校验 `X-API-Key`
- [x] 3.5 字段校验（必填、分类枚举、日期/时间格式），错误返回 400/401/404
- [x] 3.6 新增 `scraper/kai-tak-schedule.service`（systemd 单元，仿 analytics）
- [x] 3.7 更新 `.env.example`：新增 `SCHEDULE_API_KEY`、`SCHEDULE_API_PORT`

## 4. AI Agent SKILL
- [x] 4.1 新增 `.claude/skills/family-calendar/SKILL.md`（frontmatter + API 文档）
- [x] 4.2 编写各端点 `curl` 调用示例与事件字段规范
- [x] 4.3 写入"先查后改、确认后写"安全操作约定

## 5. 前端页面组件
- [x] 5.1 新增 `src/sections/FamilySchedule.tsx`
- [x] 5.2 分类筛选控件（全部/学校/培训班/其它）+ 数据来源提示
- [x] 5.3 日历视图：基于 `components/ui/calendar.tsx`，按分类颜色标记有事件日期，可切换月份
- [x] 5.4 所选日期事件列表（标题/分类/时间/地点/备注）
- [x] 5.5 「近期事件（未来7天）」高亮列表

## 6. 集成
- [x] 6.1 修改 `src/App.tsx`：新增 `view` 切换（房产看板 / 家庭日程），默认房产看板
- [x] 6.2 确保切换视图不重置各自筛选状态

## 7. 验证与部署
- [x] 7.1 `npm run build` 通过（tsc + vite）
- [x] 7.2 本地启动 `schedule_server.py`，用 `curl` 验证 CRUD 与鉴权（含 401/400/404 分支）
- [x] 7.3 `npm run dev` 手测：视图切换、分类筛选、月份切换、近期高亮、多日事件、API 数据渲染与降级
- [x] 7.4 对照 `specs/family-schedule/spec.md` 逐场景自检（含需求 7、8）
- [x] 7.5 部署后端：`scp schedule_server.py + service → sudo cp → systemctl enable/start`；配置 Nginx `/api/schedule/` 反代
- [x] 7.6 部署前端（注意 `--exclude data`）
- [x] 7.7 服务器上用 AI Agent + family-calendar SKILL 端到端验证读写
