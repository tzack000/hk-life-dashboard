# 规范增量：家庭日程（family-schedule）

## ADDED Requirements

### Requirement: 视图切换
系统 SHALL 允许用户在「房产看板」与「家庭日程」两个顶层视图之间切换，且任一时刻只展示一个视图。

#### Scenario: 切换到家庭日程
- **WHEN** 用户在导航中点击「家庭日程」
- **THEN** 页面隐藏房产看板内容，展示家庭日程页面
- **AND** 导航中「家庭日程」处于选中态

#### Scenario: 切回房产看板
- **WHEN** 用户在家庭日程视图点击「房产看板」
- **THEN** 页面恢复展示原有房产看板内容，且筛选状态保持不变

### Requirement: 事件数据模型
系统 SHALL 以统一的事件结构描述家庭日程事件，至少包含标题、分类、开始日期、可选结束日期（多日事件）、可选时间段、可选地点/备注。分类 SHALL 至少支持 `学校`、`培训班`、`其它` 三类。

#### Scenario: 单日事件
- **WHEN** 一个事件仅有开始日期、无结束日期
- **THEN** 该事件视为单日事件，在对应日期展示

#### Scenario: 多日事件（如放假区间）
- **WHEN** 一个事件同时有开始日期与结束日期
- **THEN** 该事件覆盖从开始到结束的整个日期区间，并在区间内每天可见

### Requirement: 日历视图
系统 SHALL 提供按月的日历视图，在对应日期上标记当天有事件，并按分类用不同颜色区分。

#### Scenario: 月份内事件标记
- **WHEN** 用户查看某个月份的日历
- **THEN** 含事件的日期显示视觉标记（圆点/底色），颜色对应事件分类

#### Scenario: 选中某天查看详情
- **WHEN** 用户点击日历中某个有事件的日期
- **THEN** 在日历旁/下方展示该日期当天的事件列表（标题、分类、时间、备注）

#### Scenario: 切换月份
- **WHEN** 用户切换到上/下个月
- **THEN** 日历标记与可见事件随所选月份更新

### Requirement: 列表视图与近期高亮
系统 SHALL 提供一个按日期升序排列的「近期事件」列表，并对未来 N 天（默认 7 天）内的事件进行高亮。

#### Scenario: 近期事件高亮
- **WHEN** 某事件的日期处于今天起未来 7 天内
- **THEN** 该事件在列表中以高亮样式呈现（如醒目底色/标签）

#### Scenario: 已过期事件
- **WHEN** 某事件日期早于今天
- **THEN** 该事件默认不在「近期事件」列表中突出展示（可弱化或折叠）

### Requirement: 分类筛选
系统 SHALL 允许用户按事件分类进行筛选（含「全部」）。

#### Scenario: 按分类筛选
- **WHEN** 用户选择某一分类（如「培训班」）
- **THEN** 日历标记与列表仅展示该分类事件

#### Scenario: 查看全部
- **WHEN** 用户选择「全部」
- **THEN** 展示所有分类事件

### Requirement: 数据来源与降级
系统 SHALL 优先从日程管理 API 加载事件数据，失败时 SHALL 降级使用内置静态数据，保证页面始终可用。

#### Scenario: API 数据可用
- **WHEN** API 成功返回事件列表
- **THEN** 使用 API 数据渲染

#### Scenario: API 不可用
- **WHEN** 请求失败或返回为空
- **THEN** 使用内置静态（mock）数据渲染，不向用户报错中断

### Requirement: 日程管理 API
系统 SHALL 提供一个 HTTP API 用于管理家庭日程事件，支持查询、新增、修改、删除（CRUD），数据持久化到 SQLite。API 风格与部署方式 SHALL 与现有 `analytics_server.py`（Flask + systemd + Nginx 反代）保持一致，并提供统一前缀 `/api/schedule` 的端点。写操作（POST/PUT/DELETE）SHALL 通过共享密钥（`X-API-Key` 头）保护；读操作 MAY 公开供前端访问。

#### Scenario: 查询全部事件
- **WHEN** 客户端 `GET /api/schedule/events`
- **THEN** 返回 JSON 事件数组，字段与 `FamilyEvent` 模型一致

#### Scenario: 查询近期事件
- **WHEN** 客户端请求 `GET /api/schedule/events?upcoming=7`
- **THEN** 仅返回未来 7 天内（含跨区间相交）的事件，按日期升序

#### Scenario: 新增事件
- **WHEN** 客户端带合法密钥 `POST` 一个含必填字段（title、category、startDate）的事件
- **THEN** 服务端持久化该事件并返回其生成的 `id`

#### Scenario: 缺少密钥的写操作被拒绝
- **WHEN** 客户端未带或带错误密钥执行写操作
- **THEN** 服务端返回 401/403，且不修改数据

#### Scenario: 字段校验
- **WHEN** 提交缺少必填字段或日期格式非法的事件
- **THEN** 服务端返回 400 并说明错误，不写入数据

#### Scenario: 更新或删除不存在的事件
- **WHEN** 对不存在的 `id` 执行 `PUT`/`DELETE`
- **THEN** 服务端返回 404

### Requirement: AI Agent 日历访问 SKILL
系统 SHALL 提供一个 AI Agent SKILL（`.claude/skills/family-calendar/SKILL.md`），使 AI 工具能够通过日程管理 API 读取与维护家庭日历。该 SKILL SHALL 包含 API 基址与鉴权说明、各端点调用示例（含 `curl`）、事件字段规范，以及「先查后改、确认后写」的安全操作约定。

#### Scenario: AI 查询近期日程
- **WHEN** 用户请求 AI「看看这周有什么安排」
- **THEN** AI 依据 SKILL 调用 `GET /api/schedule/events?upcoming=7` 并以可读方式汇总

#### Scenario: AI 新增事件
- **WHEN** 用户请求 AI「下周三下午3点加一节钢琴课」
- **THEN** AI 依据 SKILL 构造合法事件体，带密钥 `POST`，并向用户回报结果

#### Scenario: 写操作前确认
- **WHEN** AI 即将执行修改/删除
- **THEN** AI SHALL 先向用户确认要写入/删除的具体内容，避免误操作
