# 启德租房成交 | Kai Tak Rental

香港启德地区主要小区租房成交价格展示网站，数据每日自动更新。

**在线访问：** https://rental.tzack000.win

## 功能特性

- 展示启德 10 个主要小区的租赁成交数据
- 月份 / 小区 / 房型三重筛选
- 统计概览卡片（成交宗数、平均月租、平均尺价、租金区间）
- 各小区平均月租对比图（横向条形图）
- 过去一年平均尺价变化趋势（折线图，按小区切换）
- 交易明细表格（桌面表格 + 移动端卡片列表）
- 移动端完全自适应
- 后端爬虫每日凌晨 2:00 自动抓取中原地产数据

## 涵盖小区

| 小区 | 中文名 | 地址 |
|------|--------|------|
| K.CITY | 嘉汇 | 沐宁街7号 |
| Oasis Kai Tak | — | 沐宁街10号 |
| K.Summit | 嘉峯汇 | 沐泰街9号 |
| Monaco One | — | 沐泰街12号 |
| Monaco Marine | — | 沐泰街10号 |
| VIBE | 啟岸 | 沐安街2号 |
| One Kai Tak | 启德1号 | 沐安街1号 |
| AIRSIDE | — | 协调道2号 |
| The Henley | — | 承启道18号 |
| Upper RiverBank | 尚·珒溋 | 沐泰街11号 |

## 技术栈

### 前端

- React 19 + TypeScript 5.9
- Vite 7
- Tailwind CSS 3
- shadcn/ui 组件库
- Recharts 图表
- Lucide React 图标

### 后端

- Python 3.12 爬虫（requests + BeautifulSoup）
- SQLite 数据库
- Cron 定时任务

### 部署

- Nginx（HTTPS 静态托管）
- Let's Encrypt 证书（自动续期）
- Ubuntu 24.04

## 项目结构

```
kai-tak-rental/
├── src/
│   ├── App.tsx                 # 主页面
│   ├── hooks/
│   │   └── use-rental-data.ts  # 数据状态管理
│   ├── sections/
│   │   ├── Header.tsx          # 导航栏 + 筛选器
│   │   ├── StatsOverview.tsx   # 统计卡片
│   │   ├── RentChart.tsx       # 月租对比图
│   │   ├── RentTrendChart.tsx  # 尺价趋势图
│   │   └── TransactionTable.tsx# 交易明细
│   ├── data/
│   │   ├── estates.ts          # 小区基础数据
│   │   └── mock-transactions.ts# 模拟数据生成器
│   ├── types/
│   │   └── rental.ts           # TypeScript 类型定义
│   └── components/ui/          # shadcn/ui 组件
├── scraper/
│   └── scrape_centanet.py      # 爬虫 + SQLite + JSON 导出
├── public/
│   └── favicon.svg             # 网站图标
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 服务器部署

```bash
# 构建
npm run build

# 上传 dist/ 目录到服务器
scp -r dist/* ubuntu@your-server:/var/www/kai-tak-rental/

# 爬虫部署
scp scraper/scrape_centanet.py ubuntu@your-server:/opt/kai-tak-scraper/
pip3 install requests beautifulsoup4

# 配置 cron（每天凌晨2点）
# 0 2 * * * /usr/bin/python3 /opt/kai-tak-scraper/scrape_centanet.py
```

## 数据库

SQLite 数据库位于服务器 `/opt/kai-tak-scraper/rental.db`：

- `estates` — 小区基础信息（10条）
- `transactions` — 租赁成交记录（持续积累）
- `scrape_logs` — 爬虫运行日志

```bash
# 查询数据
sqlite3 /opt/kai-tak-scraper/rental.db "SELECT estate_name, COUNT(*) FROM transactions GROUP BY estate_name;"
```

## 数据流

```
Cron (02:00) → Python 爬虫 → SQLite DB → 导出 JSON → Nginx 静态托管 → 前端 fetch
```

前端优先加载 `./data/transactions.json`，无数据时 fallback 到内置模拟数据。

## License

MIT
