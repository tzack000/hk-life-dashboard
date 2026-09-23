# ZT Life

个人生活看板：从首页进入家庭日程、近期行程、房产看板和学习资源。

**在线访问：** 见 `.env` 中的 `SITE_DOMAIN`

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 站点名称、香港山海风光、四个入口卡片 |
| `/family` | 家庭日程 | 学校、培训班、其它事项；优先读日程 API |
| `/trip` | 近期行程 | 仓库内静态行程（当前为 2026 冲绳与宫古岛） |
| `/property` | 房产看板 | 多区域租赁成交，数据每日从中原地产爬取 |
| `/learn` | 学习资源 | 剑桥雅思 4–21 套题列表 |
| `/learn/4` … `/learn/21` | 某一套真题 | 页内播放听力，下方显示对应 PDF |

未知路径会回到首页。导航顺序为：首页、家庭日程、近期行程、房产看板、学习资源。

---

## 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│                      用户浏览器                               │
│  访问 $SITE_DOMAIN                                           │
│  /              首页                                         │
│  /family        家庭日程  → GET /api/schedule/events         │
│  /trip          近期行程  → 前端静态数据                      │
│  /property      房产看板  → fetch /data/transactions.json    │
│  /learn/:n      学习资源  → /cdn-audio/...（听力 zip / PDF） │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP/HTTPS
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  远程服务器 ($SERVER_HOST, Ubuntu 24.04)                     │
│                                                              │
│  Nginx ─ 静态托管 + 反向代理                                  │
│    ├── /              → SPA（try_files → index.html）        │
│    ├── /assets/       → JS / CSS / pdf.js worker（.mjs）     │
│    ├── /data/         → transactions.json                    │
│    ├── /api/track     → 127.0.0.1:8901  PV/UV 统计          │
│    ├── /api/stats     → 127.0.0.1:8901  需 Basic Auth       │
│    ├── /api/schedule/ → 127.0.0.1:8902  家庭日程 CRUD       │
│    └── /cdn-audio/    → https://cdn.frostyrhymes.com         │
│                         （带 Referer，转发 Range）            │
│                                                              │
│  $SCRAPER_DIR/                                               │
│    ├── scrape_centanet.py    房产爬虫                        │
│    ├── rental.db             成交库                          │
│    ├── analytics_server.py   统计 API（8901）                │
│    ├── analytics.db                                          │
│    ├── schedule_server.py    日程 API（8902）                │
│    └── schedule.db                                           │
│                                                              │
│  $WEB_DIR/                                                   │
│    ├── index.html / assets / covers / dragon-back.jpg        │
│    ├── admin.html                                            │
│    └── data/transactions.json                                │
│                                                              │
│  定时任务: 0 2 * * *  爬虫 → SQLite → 导出 JSON              │
│  系统服务: kai-tak-analytics.service / kai-tak-schedule.service │
└──────────────────────────────────────────────────────────────┘
```

### 房产成交数据流

```
Cron (02:00)
  → Python 爬虫 scrape_centanet.py（Node.js 解析中原 NUXT 数据）
  → SQLite rental.db（INSERT OR IGNORE 去重）
  → 导出 transactions.json
  → 前端 /property 优先读服务器 JSON，失败则用 mock-transactions.ts
```

### 其它数据来源

- **家庭日程**：生产环境读 `/api/schedule`；写操作需请求头 `X-API-Key`（`.env` 的 `SCHEDULE_API_KEY`）。前端拉不到数据时降级到 `src/data/family-events.ts`。
- **近期行程**：`src/data/trips/` 中的 TypeScript 模块，不走后端。
- **学习资源**：套题目录在 `src/data/study-resources.ts`，音频 zip 与 PDF 经 `/cdn-audio` 代理到 frostyrhymes CDN。仓库不存放原文件。

### 关键技术细节

1. **SPA 路由**：History API（`src/hooks/use-route.ts`），不用 react-router。Vite `base` 为 `/`。Nginx `location /` 使用 `try_files $uri $uri/ /index.html`。
2. **NUXT 解析**：中原地产 `window.__NUXT__` 是压缩 JS，正则抽不出来。爬虫用 Node.js 执行后还原 `recentTransactions`。
3. **成交去重**：主键 `centa-{id}`，`INSERT OR IGNORE`。
4. **听力播放**：zip 内是 deflate 条目。浏览器用 Range 读目录，再按条目解压后用 `<audio>` 播放。
5. **页内 PDF**：pdf.js 画到 canvas。线上 `.mjs` 必须按 JavaScript 返回，否则 worker 无法加载。
6. **CDN 代理**：`cdn.frostyrhymes.com` 校验 Referer `https://www.frostyrhymes.com/`。开发环境由 Vite `server.proxy` 处理，生产环境由 Nginx `location /cdn-audio/` 处理。

---

## 覆盖区域与楼盘（房产看板）

| 区域 | 楼盘数 | 代表楼盘 |
|------|--------|----------|
| 启德 | 10 | Oasis Kai Tak, K.CITY, Monaco One, AIRSIDE, The Henley |
| 荃湾西 | 8 | 柏傲湾, 海之恋, 全·城汇, 环宇海湾 |
| 大埔墟 | 7 | 八号花园, 岚山, 天钻, 大埔中心 |
| 将军澳 | 10 | 日出康城, 将军澳中心, 维景湾畔, 天晋, Capri |

---

## 技术栈

### 前端

- React 19 + TypeScript
- Vite 7 + Tailwind CSS + shadcn/ui
- Recharts、Lucide React
- pdf.js（`pdfjs-dist`）页内阅读 PDF

### 后端（服务器端）

- Python 3 爬虫（requests + Node.js NUXT 解析）
- SQLite
- 统计 API `analytics_server.py`（8901）
- 日程 API `schedule_server.py`（8902）
- Cron + systemd

### 部署

- Nginx（静态托管、SPA、反向代理、CDN 代理）
- SSL：`/etc/nginx/ssl/kai-tak.crt`
- Ubuntu 24.04

---

## 项目结构

```
hk-life-dashboard/
├── src/
│   ├── App.tsx                      # 按路径挂载首页与各子页面
│   ├── hooks/
│   │   ├── use-route.ts             # History API 路由
│   │   ├── use-rental-data.ts       # 房产成交
│   │   ├── use-family-schedule.ts   # 家庭日程（API + mock）
│   │   └── use-trips.ts             # 近期行程
│   ├── lib/
│   │   ├── routes.ts                # 路径常量与解析
│   │   └── zip-audio.ts             # 按 Range 解压听力 zip
│   ├── sections/
│   │   ├── SiteNav.tsx              # 顶栏导航
│   │   ├── HomePage.tsx             # 首页
│   │   ├── FamilySchedule.tsx       # 家庭日程
│   │   ├── TripSchedule.tsx         # 近期行程
│   │   ├── Header.tsx               # 房产看板筛选
│   │   ├── StatsOverview.tsx / RentChart.tsx / RentTrendChart.tsx / TransactionTable.tsx
│   │   ├── StudyResources.tsx       # 学习资源列表与套题页
│   │   └── ExamPdf.tsx              # pdf.js 阅读器
│   ├── data/
│   │   ├── estates.ts / mock-transactions.ts
│   │   ├── family-events.ts         # 日程 API 失败时的降级数据
│   │   ├── trips/okinawa-2026.ts
│   │   └── study-resources.ts       # 雅思 4–21 资源路径
│   ├── types/
│   └── components/ui/
├── scraper/
│   ├── scrape_centanet.py
│   ├── analytics_server.py
│   ├── schedule_server.py
│   └── kai-tak-schedule.service
├── openspec/                        # 规范：site-home / family-schedule / trip-schedule
├── public/
│   ├── dragon-back.jpg              # 首页风光
│   └── covers/                      # 入口卡片图
├── .env.example
├── CLAUDE.md / AGENTS.md
└── README.md
```

---

## 需求管理

本项目使用 **OpenSpec** 管理需求变更：

```
Propose（提案）→ Apply（实现）→ Archive（归档）
```

| 命令 | 说明 |
|------|------|
| `/opsx:propose "描述"` | 创建变更提案 |
| `/opsx:apply` | 按 tasks.md 实现 |
| `/opsx:archive` | 归档已完成变更 |
| `/opsx:continue` | 继续未完成变更 |
| `/opsx:verify` | 对照规范验收 |

当前主规范在 `openspec/specs/`：`site-home`、`family-schedule`、`trip-schedule`。详细指引见 `CLAUDE.md`。

---

## 本地开发

```bash
npm install
npm run dev      # 默认 http://localhost:5173
npm run build
```

- 房产看板：本地无 `transactions.json` 时使用 mock 成交数据。
- 家庭日程：Vite 不代理 `/api/schedule`。未另开 `schedule_server.py` 时会降级到 `family-events.ts`（学校假日可能比生产环境少）。
- 学习资源：Vite 将 `/cdn-audio` 代理到 CDN，并带上允许的 Referer，因此本地可以播听力和打开 PDF。

---

## 环境配置（首次使用必读）

```bash
cp .env.example .env
# 填写 SERVER_HOST / SERVER_USER / SERVER_PORT / SITE_DOMAIN
# 以及 SCRAPER_DIR / WEB_DIR / DATA_DIR / SCRAPER_LOG / SCHEDULE_API_KEY

ssh -p $SERVER_PORT $SERVER_USER@$SERVER_HOST "echo connected"
```

> **给 AI 编程工具的提示**：从 `.env` 读服务器信息，所有部署通过 SSH 执行。不要把 `SCHEDULE_API_KEY` 写进对话或提交。目标环境是个人腾讯云 CVM，不走 ioa-ssh。

---

## 服务器部署

### 前端部署

```bash
npm run build
scp -r dist/* $SERVER_USER@$SERVER_HOST:/tmp/kai-tak-deploy/
ssh $SERVER_USER@$SERVER_HOST \
  "sudo rsync -av --delete --chmod=Du+rwx,Dg+rx,Do+rx,Fu+r,Fg+r,Fo+r \
   /tmp/kai-tak-deploy/ $WEB_DIR/ --exclude data"
```

> ⚠️ rsync 必须带 `--chmod`，否则目录缺执行权限，Nginx 返回 403。必须 `--exclude data`，以免删掉服务器上的 `transactions.json`。

部署后如果学习资源 PDF 打不开，检查 Nginx 是否把 `.mjs` 当作 `application/javascript`，以及是否存在 `/cdn-audio/` 代理。

### 爬虫部署

```bash
scp scraper/scrape_centanet.py $SERVER_USER@$SERVER_HOST:/tmp/
ssh $SERVER_USER@$SERVER_HOST "sudo cp /tmp/scrape_centanet.py $SCRAPER_DIR/"
ssh $SERVER_USER@$SERVER_HOST "sudo python3 $SCRAPER_DIR/scrape_centanet.py"
ssh $SERVER_USER@$SERVER_HOST "tail -30 $SCRAPER_LOG"
```

### 服务器上的 Cron 配置

```cron
# root crontab：每天凌晨 2 点执行爬虫
0 2 * * * /usr/bin/python3 /opt/kai-tak-scraper/scrape_centanet.py >> /var/log/kai-tak-scraper.log 2>&1 && chown -R www-data:www-data /var/www/kai-tak-rental/data/
```

---

## 数据库

SQLite 位于服务器 `$SCRAPER_DIR/`：

| 库 | 表 | 说明 |
|----|----|------|
| `rental.db` | `estates` | 楼盘基础信息（32 条） |
| `rental.db` | `transactions` | 租赁成交，主键 `centa-{id}` |
| `rental.db` | `scrape_logs` | 爬虫日志 |
| `schedule.db` | 日程事件 | 学校 / 培训班 / 其它 |
| `analytics.db` | 访问统计 | PV/UV |

```bash
ssh $SERVER_USER@$SERVER_HOST \
  "sudo sqlite3 $SCRAPER_DIR/rental.db \
   'SELECT estate_name, COUNT(*) FROM transactions GROUP BY estate_name;'"

ssh $SERVER_USER@$SERVER_HOST \
  "cd $SCRAPER_DIR && sudo python3 -c \
   'from scrape_centanet import init_db, export_json; conn=init_db(); export_json(conn); conn.close()'"
```

---

## 常见运维操作

| 操作 | 命令 |
|------|------|
| 查看爬虫日志 | `ssh $SERVER_USER@$SERVER_HOST "tail -50 $SCRAPER_LOG"` |
| 手动触发爬虫 | `ssh $SERVER_USER@$SERVER_HOST "sudo python3 $SCRAPER_DIR/scrape_centanet.py"` |
| 查看成交条数 | `ssh $SERVER_USER@$SERVER_HOST "sudo sqlite3 $SCRAPER_DIR/rental.db \"SELECT COUNT(*) FROM transactions\""` |
| 重新导出 JSON | `ssh $SERVER_USER@$SERVER_HOST "cd $SCRAPER_DIR && sudo python3 -c 'from scrape_centanet import init_db,export_json; c=init_db(); export_json(c); c.close()'"` |
| 重启统计服务 | `ssh $SERVER_USER@$SERVER_HOST "sudo systemctl restart kai-tak-analytics"` |
| 重启日程服务 | `ssh $SERVER_USER@$SERVER_HOST "sudo systemctl restart kai-tak-schedule"` |
| 检查 Nginx | `ssh $SERVER_USER@$SERVER_HOST "sudo nginx -t && sudo systemctl status nginx"` |
| 修复 403 | `ssh $SERVER_USER@$SERVER_HOST "sudo chmod 755 $WEB_DIR/ $WEB_DIR/assets/"` |

---

## 新增区域/楼盘

### 1. 前端（src/data/estates.ts）

```typescript
export const districts: District[] = ['启德', '荃湾西', '大埔墟', '将军澳', '新区域名'];

{
  id: 'estate-id',
  name: '楼盘英文名 (中文名)',
  address: '地址',
  district: '新区域名',
  propertyType: '住宅',
  totalUnits: 数字,
  completionYear: 年份,
}

// types/rental.ts 的 District 类型同步加上新区域名
```

### 2. 模拟数据（src/data/mock-transactions.ts）

```typescript
'楼盘名': 1.0,  // 1.0 为基准
```

### 3. 爬虫（scraper/scrape_centanet.py）

```python
"estate-id": ("标准名称", "中原繁体名称", "typeCode"),
# 同时改 init_db()、district_map、district_counts
```

**查找 typeCode：**

```bash
python3 -c "
import requests
resp = requests.post('https://hk.centanet.com/findproperty/api/Estate/Search',
    json={'keyword': '楼盘繁体名', 'lang': 'zh-HK'},
    headers={'User-Agent': 'Mozilla/5.0'})
data = resp.json()
for item in (data if isinstance(data, list) else data.get('data', data.get('results', [])))[:3]:
    print(f\"{item.get('name','')} | {item.get('typeCode','')}\")
"
```

### 4. 部署验证

```bash
scp scraper/scrape_centanet.py $SERVER_USER@$SERVER_HOST:/tmp/
ssh $SERVER_USER@$SERVER_HOST "sudo cp /tmp/scrape_centanet.py $SCRAPER_DIR/ && sudo python3 $SCRAPER_DIR/scrape_centanet.py"
npm run build
# ... 上传 dist，rsync 排除 data
```

---

## License

MIT
