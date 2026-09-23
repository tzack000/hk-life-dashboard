# CLAUDE.md — AI 编程工具项目上下文

> 此文件供 Claude Code、Codebuddy 等 AI 编程工具读取，帮助快速理解项目。

## 项目简介

**ZT Life** — 个人生活看板，首页进入家庭日程、近期行程、房产看板、学习资源四个子页面。
- 在线地址：见 `.env` 中的 `SITE_DOMAIN`
- 前端：React 19 + TypeScript + Vite + Tailwind + shadcn/ui + pdf.js
- 后端：Python 爬虫 + Flask API（统计、日程）+ SQLite + Nginx
- 服务器：个人腾讯云 CVM，用普通 `ssh` / `scp`，**不走 ioa-ssh**

## 页面与路由

History API 路由（`src/hooks/use-route.ts`、`src/lib/routes.ts`），不用 react-router；Vite `base` 为 `/`。

| 路径 | 页面 | 数据来源 |
|------|------|------|
| `/` | 首页 `HomePage.tsx` | 静态；风光图 `public/dragon-back.jpg`，卡片图 `public/covers/` |
| `/family` | 家庭日程 `FamilySchedule.tsx` | `/api/schedule`，失败降级 `src/data/family-events.ts` |
| `/trip` | 近期行程 `TripSchedule.tsx` | `src/data/trips/*.ts` 静态模块 |
| `/property` | 房产看板 | `/data/transactions.json`，失败降级 mock（中原地产 hk.centanet.com） |
| `/learn`、`/learn/4`–`/learn/21` | 学习资源 `StudyResources.tsx` | `src/data/study-resources.ts`，文件经 `/cdn-audio` 代理 |

- 导航顺序：首页、家庭日程、近期行程、房产看板、学习资源；未知路径回到首页
- 家庭日程、近期行程、房产看板保持挂载（`hidden` 切换），筛选状态不丢失
- 更新家庭日程数据是改 API，不是改仓库；写操作带 `X-API-Key`（`.env` 的 `SCHEDULE_API_KEY`），用法见 `.claude/skills/family-calendar/SKILL.md`，切勿输出密钥
- 雅思听力是 zip 内的 deflate 条目，前端按 Range 读取解压；PDF 用 pdf.js 画到 canvas。原文件有版权，不入库

## 环境配置（首次必做）

1. 读取 `.env` 文件获取服务器连接信息（如不存在，从 `.env.example` 复制并填写）
2. 验证 SSH 连接：`ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "echo ok"`
3. 如果连接失败，提示用户配置 SSH 密钥或检查 `.env`

## 服务器操作规范

- **所有服务器操作通过 SSH 执行**，不要假设本地有服务器访问权限
- **部署前端时 rsync 必须带 `--chmod=Du+rwx,Dg+rx,Do+rx,Fu+r,Fg+r,Fo+r`**，否则目录缺少执行权限导致 Nginx 403
- **部署前端时必须 `--exclude data`**，避免删除服务器上的 transactions.json
- **爬虫部署后需 `sudo` 执行**，因为 cron 是 root 用户配置的
- **修改爬虫后需重新部署到服务器**：`scp → sudo cp → sudo python3 执行验证`
- **Nginx 需保留**：`location /` 的 `try_files $uri $uri/ /index.html`（子路径刷新）、`/cdn-audio/` 代理（带 Referer `https://www.frostyrhymes.com/` 并转发 Range）、`mime.types` 中 `.mjs` 映射为 `application/javascript`（否则 pdf.js worker 加载失败）
- 改 Nginx 前先备份，改完 `sudo nginx -t && sudo systemctl reload nginx`

## 关键路径

| 用途 | 路径（默认值，可通过 .env 覆盖） |
|------|------|
| 爬虫脚本 | $SCRAPER_DIR/scrape_centanet.py |
| SQLite 数据库 | $SCRAPER_DIR/rental.db |
| 前端静态文件 | $WEB_DIR/ |
| 前端数据源 | $DATA_DIR/transactions.json |
| 爬虫日志 | $SCRAPER_LOG |
| 统计 API | 127.0.0.1:8901（`/api/track`、`/api/stats`） |
| 日程 API | 127.0.0.1:8902（`/api/schedule/`，服务 `kai-tak-schedule`） |
| 学习资源代理 | `/cdn-audio/` → https://cdn.frostyrhymes.com |
| Nginx 配置 | /etc/nginx/sites-enabled/kai-tak-rental |

## 数据流

```
房产：Cron (02:00) → Python 爬虫 → SQLite → 导出 JSON → Nginx 托管 → 前端 fetch
日程：前端 → /api/schedule → schedule_server.py → SQLite
学习：前端 → /cdn-audio（Nginx 代理，开发时 Vite 代理）→ frostyrhymes CDN
```

- 爬虫用 **Node.js 解析 NUXT JS 数据**（变量名被压缩，正则无法直接提取）
- 房产与日程都是优先读服务器，失败降级到本地 mock
- 本地 Vite 不代理 `/api/schedule`，家庭日程会显示 mock，这不代表线上数据丢失

## 需求管理：OpenSpec 工作流

本项目使用 **OpenSpec** 进行规范驱动开发（Spec-Driven Development），所有需求变更必须通过 OpenSpec 流程管理。

### 核心流程：Propose → Apply → Archive

```
用户提需求 → /opsx:propose → 生成规范产物 → /opsx:apply → 实现代码 → /opsx:archive → 归档
```

### 目录结构

```
openspec/
├── changes/                    # 变更工作区
│   ├── <change-name>/          # 当前活跃变更
│   │   ├── proposal.md         # 提案 — 为什么做、做什么
│   │   ├── specs/              # 规范 — 需求与验收场景
│   │   ├── design.md           # 设计 — 技术实现方案
│   │   └── tasks.md            # 任务 — 实现任务清单
│   └── archive/                # 已归档变更（日期+名称）
└── specs/                      # 项目级规范（系统描述）
```

### 常用 Slash 命令

| 命令 | 说明 |
|------|------|
| `/opsx:propose "描述"` | 创建变更提案，自动生成 proposal + specs + design + tasks |
| `/opsx:apply` | 按 tasks.md 清单逐步实现代码 |
| `/opsx:archive` | 归档已完成的变更 |
| `/opsx:continue` | 继续推进未完成的变更 |
| `/opsx:verify` | 验证实现是否符合规范 |
| `/opsx:explore` | 探索现有规范与代码结构 |

### 操作规范

1. **收到新需求时**，优先使用 `/opsx:propose` 创建变更，不要直接改代码
2. **实现前审核**产物（proposal → specs → design → tasks），确保与用户意图对齐
3. **按 tasks.md 逐步实现**，使用 `/opsx:apply` 执行
4. **完成后归档** `/opsx:archive`，保持工作区整洁
5. 归档的变更会移至 `openspec/changes/archive/`，可随时回溯

### 示例

```
You: /opsx:propose "新增屯门区域房源"
AI:  已创建 openspec/changes/add-tuen-mun/
     ✓ proposal.md  — 动机与目标
     ✓ specs/       — 需求与验收场景
     ✓ design.md    — 技术方案
     ✓ tasks.md     — 任务清单

You: /opsx:apply
AI:  按 tasks.md 逐步实现...

You: /opsx:archive
AI:  已归档至 openspec/changes/archive/2026-06-01-add-tuen-mun/
```

## 新增楼盘步骤

1. `src/types/rental.ts` — District 类型加新区域名
2. `src/data/estates.ts` — districts 数组 + estates 数组 + 导出函数
3. `src/data/mock-transactions.ts` — estatePremiums 溢价系数
4. `scraper/scrape_centanet.py` — ESTATES_CONFIG + init_db + district_map + district_counts
5. 部署爬虫 → 手动执行 → 构建前端 → 部署前端

## 其它常见改动

- **更新行程**：改 `src/data/trips/<trip>.ts`（类型见 `src/types/trip.ts`），同时按需用日程 API 同步家庭日程中的行程事件；订单上的个人电话、邮箱不写进公开数据
- **新增一套学习资源**：在 `src/data/study-resources.ts` 加条目，并放宽 `src/lib/routes.ts` 中 4–21 的编号范围
- **新增子页面**：`src/lib/routes.ts` 加路径 → `SiteNav.tsx` 加导航 → `HomePage.tsx` 加卡片 → `App.tsx` 挂载，并同步 `openspec/specs/site-home`

## 常用命令

```bash
# 本地开发（沙箱里绑定 0.0.0.0 失败时改用 npx vite --host 127.0.0.1）
npm run dev

# 构建（不要用 tsc --noEmit false，会在 src 旁生成 .js 覆盖 .tsx）
npm run build

# 部署前端
scp -r dist/* $SERVER_USER@$SERVER_HOST:/tmp/kai-tak-deploy/ && \
ssh $SERVER_USER@$SERVER_HOST "sudo rsync -av --delete --chmod=Du+rwx,Dg+rx,Do+rx,Fu+r,Fg+r,Fo+r /tmp/kai-tak-deploy/ $WEB_DIR/ --exclude data"

# 部署爬虫
scp scraper/scrape_centanet.py $SERVER_USER@$SERVER_HOST:/tmp/ && \
ssh $SERVER_USER@$SERVER_HOST "sudo cp /tmp/scrape_centanet.py $SCRAPER_DIR/"

# 手动执行爬虫
ssh $SERVER_USER@$SERVER_HOST "sudo python3 $SCRAPER_DIR/scrape_centanet.py"

# 查看日志
ssh $SERVER_USER@$SERVER_HOST "tail -50 $SCRAPER_LOG"
```
