# 香港生活看板 | HK Life Dashboard

香港多区域房产租赁成交价格展示网站，数据每日自动从**中原地产**爬取更新。

**在线访问：** https://life.tzack000.win

---

## 整体架构

```
┌──────────────────────────────────────────────────────────────┐
│                      用户浏览器                               │
│  访问 https://life.tzack000.win                              │
│  前端 fetch ./data/transactions.json → 渲染图表/表格          │
│  无服务器数据时 fallback 到内置模拟数据                        │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP/HTTPS
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  服务器 124.156.182.215 (Ubuntu 24.04)                       │
│                                                              │
│  Nginx ─ 静态托管 + 反向代理                                  │
│    ├── /              → /var/www/kai-tak-rental/index.html   │
│    ├── /assets/       → JS/CSS 静态资源                      │
│    ├── /data/         → transactions.json (前端数据源)        │
│    ├── /api/track     → 反代 → 127.0.0.1:8901 (PV/UV 统计)  │
│    └── /api/stats     → 反代 → 127.0.0.1:8901 (需 Basic Auth)│
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  /opt/kai-tak-scraper/                              │     │
│  │  ├── scrape_centanet.py    ← 爬虫脚本               │     │
│  │  ├── rental.db             ← SQLite 数据库           │     │
│  │  ├── analytics_server.py   ← 统计 API 服务          │     │
│  │  └── analytics.db          ← 统计数据库              │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │  /var/www/kai-tak-rental/                           │     │
│  │  ├── index.html            ← 前端入口               │     │
│  │  ├── admin.html            ← 管理页                 │     │
│  │  ├── assets/               ← JS/CSS                 │     │
│  │  └── data/                                         │     │
│  │      └── transactions.json ← 爬虫导出给前端的数据    │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  定时任务 (root crontab):                                     │
│    0 2 * * *  → 爬虫 → SQLite → 导出 JSON → 前端读取         │
│                                                              │
│  系统服务:                                                    │
│    kai-tak-analytics.service  → 统计 API (port 8901)         │
└──────────────────────────────────────────────────────────────┘
```

### 数据流

```
Cron (02:00)
  │
  ▼
Python 爬虫 (scrape_centanet.py)
  │  访问中原地产楼盘页 → Node.js 解析 NUXT JS 数据 → 提取租赁成交
  ▼
SQLite (rental.db)
  │  INSERT OR IGNORE 去重写入
  ▼
导出 JSON (transactions.json)
  │  SELECT 最新 2000 条 → 写入 /var/www/kai-tak-rental/data/
  ▼
前端 fetch
  │  按 区域/月份/楼盘 过滤渲染
  ▼
用户看到数据
```

### 关键技术细节

1. **NUXT 解析**：中原地产页面使用 Nuxt.js SSR，`window.__NUXT__` 数据是压缩的 JS 函数（变量名被替换为短标识符如 `cd`、`ea`），无法用正则直接提取。爬虫将 NUXT 数据写入临时文件，调用 **Node.js** 执行 JS 解析，自动还原变量映射，提取 `recentTransactions`。

2. **数据去重**：成交记录以 `centa-{id}` 为主键 `INSERT OR IGNORE`，不会重复写入。

3. **前端 fallback**：优先读取 `./data/transactions.json`（服务器真实数据），无数据或加载失败时 fallback 到本地 `mock-transactions.ts` 生成的模拟数据。

---

## 覆盖区域与楼盘

| 区域 | 楼盘数 | 代表楼盘 |
|------|--------|----------|
| 启德 | 10 | Oasis Kai Tak, K.CITY, Monaco One, AIRSIDE, The Henley |
| 荃湾西 | 8 | 柏傲湾, 海之恋, 全·城汇, 环宇海湾 |
| 大埔墟 | 7 | 八号花园, 岚山, 天钻, 大埔中心 |
| 将军澳 | 10 | 日出康城, 将军澳中心, 维景湾畔, 天晋, Capri |

---

## 技术栈

### 前端
- React 19 + TypeScript 5.9
- Vite 7
- Tailwind CSS 3 + shadcn/ui
- Recharts 图表
- Lucide React 图标

### 后端（服务器端）
- Python 3 爬虫（requests + Node.js NUXT 解析）
- SQLite 数据库
- Python 统计 API 服务（analytics_server.py, port 8901）
- Cron 定时任务 + systemd 服务

### 部署
- Nginx（HTTP/HTTPS 静态托管 + 反向代理）
- SSL 证书（/etc/nginx/ssl/kai-tak.crt）
- Ubuntu 24.04

---

## 项目结构

```
kai-tak-rental/
├── src/
│   ├── App.tsx                    # 主页面布局
│   ├── hooks/
│   │   └── use-rental-data.ts     # 核心数据 Hook（状态管理 + 数据加载）
│   ├── sections/
│   │   ├── Header.tsx             # 导航栏 + 筛选器（区域/月份/楼盘/房型）
│   │   ├── StatsOverview.tsx      # 统计概览卡片
│   │   ├── RentChart.tsx          # 各楼盘平均月租对比图
│   │   ├── RentTrendChart.tsx     # 过去一年尺价趋势折线图
│   │   └── TransactionTable.tsx   # 交易明细表格（桌面表格+移动端卡片）
│   ├── data/
│   │   ├── estates.ts             # 楼盘基础数据 + 区域列表 + 过滤函数
│   │   └── mock-transactions.ts   # 模拟数据生成器（确定性伪随机）
│   ├── types/
│   │   └── rental.ts              # TypeScript 类型定义
│   └── components/ui/             # shadcn/ui 组件库（53个组件）
├── scraper/
│   └── scrape_centanet.py         # 爬虫脚本（含 Node.js NUXT 解析器）
├── public/
│   └── favicon.svg
├── .env.example                   # 环境变量模板
├── .env                           # 环境变量（不入库）
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── package.json
└── README.md
```

---

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（http://localhost:5173）
npm run dev

# 构建生产版本
npm run build
```

本地开发时，前端会使用 mock 数据（模拟数据生成器），无需服务器。

---

## 环境配置（首次使用必读）

本项目使用 `.env` 文件管理服务器连接信息。**首次打开项目时**，请完成以下配置：

```bash
# 1. 复制环境变量模板
cp .env.example .env

# 2. 确认 .env 中的服务器信息正确
cat .env
# SERVER_HOST=124.156.182.215
# SERVER_USER=ubuntu
# SERVER_PORT=22
# SITE_DOMAIN=life.tzack000.win

# 3. 验证 SSH 连接（需已配置密钥或密码）
ssh -p 22 ubuntu@124.156.182.215 "echo connected"
```

> **给 AI 编程工具的提示**：读取 `.env` 文件获取服务器连接信息，所有部署操作通过 SSH 执行。关键路径变量：`SCRAPER_DIR`、`WEB_DIR`、`DATA_DIR`、`SCRAPER_LOG`。

---

## 服务器部署

### 前端部署

```bash
# 本地构建
npm run build

# 上传到服务器（保留 data 目录）
scp -r dist/* ubuntu@124.156.182.215:/tmp/kai-tak-deploy/
ssh ubuntu@124.156.182.215 \
  "sudo rsync -av --delete --chmod=Du+rwx,Dg+rx,Do+rx,Fu+r,Fg+r,Fo+r \
   /tmp/kai-tak-deploy/ /var/www/kai-tak-rental/ --exclude data"
```

> ⚠️ rsync 必须带 `--chmod` 确保目录有执行权限，否则 Nginx 返回 403。

### 爬虫部署

```bash
# 上传爬虫脚本
scp scraper/scrape_centanet.py ubuntu@124.156.182.215:/tmp/
ssh ubuntu@124.156.182.215 "sudo cp /tmp/scrape_centanet.py /opt/kai-tak-scraper/"

# 手动执行一次（验证）
ssh ubuntu@124.156.182.215 "sudo python3 /opt/kai-tak-scraper/scrape_centanet.py"

# 查看日志
ssh ubuntu@124.156.182.215 "tail -30 /var/log/kai-tak-scraper.log"
```

### 服务器上的 Cron 配置

```cron
# root crontab：每天凌晨 2 点执行爬虫
0 2 * * * /usr/bin/python3 /opt/kai-tak-scraper/scrape_centanet.py >> /var/log/kai-tak-scraper.log 2>&1 && chown -R www-data:www-data /var/www/kai-tak-rental/data/
```

---

## 数据库

SQLite 数据库位于服务器 `/opt/kai-tak-scraper/rental.db`：

| 表名 | 说明 |
|------|------|
| `estates` | 楼盘基础信息（32条） |
| `transactions` | 租赁成交记录（持续积累，主键 `centa-{id}` 去重） |
| `scrape_logs` | 爬虫运行日志 |

```bash
# SSH 到服务器查询数据
ssh ubuntu@124.156.182.215 \
  "sudo sqlite3 /opt/kai-tak-scraper/rental.db \
   'SELECT estate_name, COUNT(*) FROM transactions GROUP BY estate_name;'"

# 导出 JSON（前端数据源）
ssh ubuntu@124.156.182.215 \
  "cd /opt/kai-tak-scraper && sudo python3 -c \
   'from scrape_centanet import init_db, export_json; conn=init_db(); export_json(conn); conn.close()'"
```

---

## 常见运维操作

| 操作 | 命令 |
|------|------|
| 查看爬虫日志 | `ssh ubuntu@124.156.182.215 "tail -50 /var/log/kai-tak-scraper.log"` |
| 手动触发爬虫 | `ssh ubuntu@124.156.182.215 "sudo python3 /opt/kai-tak-scraper/scrape_centanet.py"` |
| 查看数据库统计 | `ssh ubuntu@124.156.182.215 "sudo sqlite3 /opt/kai-tak-scraper/rental.db \"SELECT COUNT(*) FROM transactions\""` |
| 重新导出 JSON | `ssh ubuntu@124.156.182.215 "cd /opt/kai-tak-scraper && sudo python3 -c 'from scrape_centanet import init_db,export_json; c=init_db(); export_json(c); c.close()'"` |
| 重启统计服务 | `ssh ubuntu@124.156.182.215 "sudo systemctl restart kai-tak-analytics"` |
| 检查 Nginx 状态 | `ssh ubuntu@124.156.182.215 "sudo nginx -t && sudo systemctl status nginx"` |
| 修复 403 权限 | `ssh ubuntu@124.156.182.215 "sudo chmod 755 /var/www/kai-tak-rental/ /var/www/kai-tak-rental/assets/"` |

---

## 新增区域/楼盘

### 1. 前端（src/data/estates.ts）

```typescript
// 1. districts 数组添加新区域名
export const districts: District[] = ['启德', '荃湾西', '大埔墟', '将军澳', '新区域名'];

// 2. estates 数组添加新楼盘对象
{
  id: 'estate-id',
  name: '楼盘英文名 (中文名)',
  address: '地址',
  district: '新区域名',
  propertyType: '住宅',
  totalUnits: 数字,
  completionYear: 年份,
}

// 3. types/rental.ts 的 District 类型添加新区域名
```

### 2. 模拟数据（src/data/mock-transactions.ts）

```typescript
// estatePremiums 对象添加新楼盘溢价系数
'楼盘名': 1.0,  // 1.0 为基准，高于1溢价，低于1折价
```

### 3. 爬虫（scraper/scrape_centanet.py）

```python
# 1. ESTATES_CONFIG 添加新楼盘（需先在中原地产查到 typeCode）
"estate-id": ("标准名称", "中原繁体名称", "typeCode"),

# 2. init_db() 的 estates_data 列表添加记录
# 3. scrape_all_transactions() 的 district_map 添加映射
# 4. district_counts 添加新区域键
```

**查找 typeCode 方法**：

```bash
# 在服务器上执行
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
# 部署爬虫 → 手动执行 → 检查数据 → 构建前端 → 部署
scp scraper/scrape_centanet.py ubuntu@124.156.182.215:/tmp/
ssh ubuntu@124.156.182.215 "sudo cp /tmp/scrape_centanet.py /opt/kai-tak-scraper/ && sudo python3 /opt/kai-tak-scraper/scrape_centanet.py"
npm run build
# ... 上传 dist
```

---

## License

MIT
