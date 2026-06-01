# CLAUDE.md — AI 编程工具项目上下文

> 此文件供 Claude Code、Codebuddy 等 AI 编程工具读取，帮助快速理解项目。

## 项目简介

**香港生活看板** — 多区域房产租赁成交价格展示网站。
- 在线地址：见 `.env` 中的 `SITE_DOMAIN`
- 前端：React 19 + TypeScript + Vite + Tailwind + shadcn/ui
- 后端：Python 爬虫 + SQLite + Nginx 静态托管
- 数据源：中原地产 (hk.centanet.com)

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

## 关键路径

| 用途 | 路径（默认值，可通过 .env 覆盖） |
|------|------|
| 爬虫脚本 | $SCRAPER_DIR/scrape_centanet.py |
| SQLite 数据库 | $SCRAPER_DIR/rental.db |
| 前端静态文件 | $WEB_DIR/ |
| 前端数据源 | $DATA_DIR/transactions.json |
| 爬虫日志 | $SCRAPER_LOG |
| 统计 API | 127.0.0.1:8901 |
| Nginx 配置 | /etc/nginx/sites-enabled/kai-tak-rental |

## 数据流

```
Cron (02:00) → Python 爬虫 → SQLite → 导出 JSON → Nginx 托管 → 前端 fetch
```

- 爬虫用 **Node.js 解析 NUXT JS 数据**（变量名被压缩，正则无法直接提取）
- 前端优先读服务器 JSON，失败 fallback 到 mock 数据

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

## 常用命令

```bash
# 本地开发
npm run dev

# 构建
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
