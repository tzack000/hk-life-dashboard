---
name: family-calendar
description: 通过日程管理 API 查询与维护家庭日历（学校放假、培训班、其它家庭事项）。当用户用自然语言询问或托管家庭日程（如"这周有什么安排""下周三加一节钢琴课""把牙科复诊改到周五"）时使用。
metadata:
  author: hk-life-dashboard
  version: "1.0"
---

# 家庭日历助手（family-calendar）

通过「日程管理 API」读取与维护家庭日历事件。供 Claude 等 AI 工具用自然语言托管家庭日程。

## API 基址

- **生产**：`https://$SITE_DOMAIN/api/schedule`（经 Nginx 反代，`$SITE_DOMAIN` 见项目 `.env`）
- **本地**：`http://127.0.0.1:8902/api/schedule`

下文示例以 `$BASE` 代指基址，使用前先确定环境。

## 鉴权

- **读操作**（GET）公开，无需密钥。
- **写操作**（POST / PUT / DELETE）必须带请求头 `X-API-Key: <SCHEDULE_API_KEY>`。
- 密钥从项目 `.env` 的 `SCHEDULE_API_KEY` 读取，**切勿**把明文密钥写入对话、日志或文件。
  示例中用环境变量引用：`-H "X-API-Key: $SCHEDULE_API_KEY"`。
- 密钥缺失或错误时服务端返回 **401**，且不修改任何数据。

## 事件字段规范

| 字段 | 类型 | 必填 | 说明 |
|------|------|:---:|------|
| `id` | string | 读取时返回 | 事件唯一标识（写入时由服务端生成，勿手填） |
| `title` | string | ✅ | 事件标题 |
| `category` | string | ✅ | 分类，限 `学校` / `培训班` / `其它` 三者之一 |
| `startDate` | string | ✅ | 开始日期，`YYYY-MM-DD` |
| `endDate` | string | 否 | 结束日期，`YYYY-MM-DD`；多日事件（如放假区间）才需要 |
| `startTime` | string | 否 | 开始时间，`HH:mm`（24 小时制） |
| `endTime` | string | 否 | 结束时间，`HH:mm` |
| `location` | string | 否 | 地点 |
| `note` | string | 否 | 备注 |

校验失败（缺必填、分类非法、日期/时间格式错误）返回 **400**，并在 `details` 中列出原因。

## 端点与 curl 示例

### 查询全部事件
```bash
curl -s "$BASE/events"
```

### 查询近期事件（未来 N 天，默认 7）
```bash
curl -s "$BASE/events?upcoming=7"
```
返回未来 7 天内（含与区间相交的多日事件），按日期升序。

### 按分类查询 / 按日期范围查询
```bash
curl -s "$BASE/events?category=培训班"
curl -s "$BASE/events?from=2026-06-01&to=2026-06-30"
```

### 查询单个事件
```bash
curl -s "$BASE/events/12"
```

### 新增事件（需密钥）
```bash
curl -s -X POST "$BASE/events" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $SCHEDULE_API_KEY" \
  -d '{
    "title": "钢琴课",
    "category": "培训班",
    "startDate": "2026-06-17",
    "startTime": "15:00",
    "endTime": "16:00",
    "location": "音乐中心 3 楼"
  }'
```
成功返回 **201** 与含生成 `id` 的完整事件。

### 更新事件（需密钥，部分字段即可）
```bash
curl -s -X PUT "$BASE/events/12" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $SCHEDULE_API_KEY" \
  -d '{ "startDate": "2026-06-19", "startTime": "16:00" }'
```
事件不存在返回 **404**。

### 删除事件（需密钥）
```bash
curl -s -X DELETE "$BASE/events/12" \
  -H "X-API-Key: $SCHEDULE_API_KEY"
```
事件不存在返回 **404**。

## 安全操作约定

1. **先查后改**：执行 PUT / DELETE 前，先 `GET /events/<id>`（或按条件查询）确认目标事件确实存在且是用户所指。
2. **确认后写**：在新增、修改、删除前，向用户**复述将要写入/删除的具体内容**（标题、分类、日期、时间），得到确认后再调用写接口。删除尤其需要明确确认。
3. **相对日期解析以服务器时区为准**："今天""下周三"等需换算为绝对 `YYYY-MM-DD` 再提交；不确定当前日期时先查询服务器或询问用户。
4. **分类合法**：写入前确保 `category` 落在 `学校` / `培训班` / `其它`，否则会被 400 拒绝。
5. **密钥保密**：始终用环境变量引用密钥，不在回复中回显明文。
6. **失败可读化**：遇到 4xx 时把 `error` / `details` 翻译成用户能懂的提示，而非直接抛出原始报文。

## 典型对话流程

- 用户「看看这周有什么安排」 → `GET /events?upcoming=7` → 按日期汇总成可读列表。
- 用户「下周三下午 3 点加一节钢琴课」 → 解析日期为 `YYYY-MM-DD` → 复述确认 → 带密钥 `POST` → 回报结果与新 `id`。
- 用户「把钢琴课改到周五」 → 先查出该事件 `id` 与现状 → 复述新旧对比并确认 → `PUT` 更新。
