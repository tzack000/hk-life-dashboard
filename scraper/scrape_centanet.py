#!/usr/bin/env python3
"""
香港生活看板 - 租赁成交数据爬虫
从中原地产楼盘页面爬取启德、荃湾西、大埔墟、将军澳各小区的租赁成交记录。
数据写入 SQLite 数据库，并导出 JSON 供前端使用。
每日凌晨由 cron 调用。

数据库：/opt/kai-tak-scraper/rental.db
输出文件：/var/www/kai-tak-rental/data/transactions.json
"""

import json
import logging
import re
import sqlite3
import subprocess
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests

# ── 配置 ──────────────────────────────────────────────
# 路径可通过环境变量覆盖（见项目根目录 .env）
import os

SCRAPER_DIR = Path(os.environ.get("SCRAPER_DIR", "/opt/kai-tak-scraper"))
WEB_DIR     = Path(os.environ.get("WEB_DIR", "/var/www/kai-tak-rental"))

DB_PATH     = SCRAPER_DIR / "rental.db"
OUTPUT_DIR  = WEB_DIR / "data"
OUTPUT_FILE = OUTPUT_DIR / "transactions.json"
LOG_FILE    = Path(os.environ.get("SCRAPER_LOG", "/var/log/kai-tak-scraper.log"))

# ── 中原地产 API ──
ESTATE_SEARCH_API = "https://hk.centanet.com/findproperty/api/Estate/Search"
ESTATE_PAGE_BASE = "https://hk.centanet.com/estate"

# ── 楼盘配置 ──
# (标准名称, 中原繁体名称, typeCode)
ESTATES_CONFIG = {
    # ── 启德 ──
    "oasis-kai-tak": ("Oasis Kai Tak", "Oasis Kai Tak", "2-EYPPWPPRPG"),
    "k-city": ("K.CITY", "嘉匯", "2-EYPPWPPHPG"),
    "k-summit": ("K.Summit", "嘉峯匯", "2-EYPPWWPSWG"),
    "monaco-one": ("Monaco One", "Monaco One", "3-EYSPWPPRPG"),
    "monaco-marine": ("Monaco Marine", "Monaco Marine", "2-EYSPWPPRSG"),
    "vibe": ("VIBE", "龍譽", "2-EYPPWPPAPG"),
    "one-kai-tak": ("One Kai Tak", "啟德1號", "3-EYPPWPPJPG"),
    "airside": ("AIRSIDE", "AIRSIDE", "3-EYSPWPPZPG"),
    "the-henley": ("The Henley", "The Henley", "3-EYSPWPPHPG"),
    "upper-river-bank": ("Upper RiverBank", "尚．珒溋", "2-EYPPWWPOWG"),
    # ── 荃湾西 ──
    "pavilia-bay": ("柏傲湾 (Pavilia Bay)", "柏傲灣", "2-AEPPWPPYPG"),
    "ocean-pride": ("海之恋 (Ocean Pride)", "海之戀", "3-AESPWPPAPK"),
    "the-aurora": ("全·城汇 (The Aurora)", "全．城匯", "2-AESPWPPRPK"),
    "vision-city": ("环宇海湾 (Vision City)", "環宇海灣", "2-AEPPWPPAPG"),
    "bayview-park": ("海湾花园 (Bayview Park)", "海灣花園", "2-AEEPPPSVPW"),
    "tsuen-wan-garden": ("荃湾花园", "荃灣花園", "2-QUROURFXRS"),
    # ── 大埔墟 ──
    "eight-peak": ("八号花园 (Eight Peak)", "八號花園", "2-DCQFFRQXRO"),
    "tai-po-habitat": ("岚山 (Tai Po Habitat)", "嵐山", "3-DEPPWPPSPE"),
    "savana": ("天钻 (Savana)", "天鑽", "2-DEPPWPPJPB"),
    "monte-vista": ("比华利山别墅 (Monte Vista)", "比華利山別墅", "3-DEPPWPPEPS"),
    "vanke-cloud": ("万科·云汇 (Vanke Cloud)", "雲滙", "3-DESPWPPHPW"),
    "shatin-heights": ("大埔中心 (Tai Po Centre)", "大埔中心", "3-GYWKPPKYPS"),
    # ── 将军澳 ──
    "lohas-park": ("日出康城 (LOHAS Park)", "日出康城", "3-YAPPWPPJPW"),
    "tko-centre": ("将军澳中心 (Tseung Kwan O Centre)", "將軍澳中心", "3-YAPPWPPEPY"),
    "ocean-shores": ("维景湾畔 (Ocean Shores)", "維景灣畔", "3-YAPPWPPEPA"),
    "metro-town": ("都会駅 (Metro Town)", "都會駅", "3-YAPPWPPJPA"),
    "tko-plaza": ("将军澳广场 (Tseung Kwan O Plaza)", "將軍澳廣場", "3-YAPPWPPJPY"),
    "metro-city": ("新都城 (Metro City)", "新都城", "3-YAPPWPPEPG"),
    "bauhinia-garden": ("宝盈花园 (Bauhinia Garden)", "寶盈花園", "2-XINDIHZXHD"),
    "grand-ocean": ("君傲湾 (Grand Ocean)", "君傲灣", "2-YAPPWPPHPY"),
    "capri": ("Capri", "Capri", "2-YAPPWPPSPY"),
    "tian-jin": ("天晋 (The Wings)", "天晉", "2-YAPPWPPOPY"),
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-HK,zh;q=0.9,en;q=0.8",
}

# ── 日志 ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(str(LOG_FILE), encoding="utf-8"),
    ],
)
log = logging.getLogger("scraper")


# ── 数据库 ────────────────────────────────────────────
def init_db() -> sqlite3.Connection:
    """初始化 SQLite 数据库，创建表结构"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    conn.executescript("""
        CREATE TABLE IF NOT EXISTS estates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            name_cn TEXT,
            address TEXT,
            district TEXT DEFAULT '启德',
            property_type TEXT,
            total_units INTEGER,
            completion_year INTEGER
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            estate_id TEXT,
            estate_name TEXT NOT NULL,
            address TEXT,
            layout TEXT,
            area REAL,
            floor TEXT,
            monthly_rent INTEGER,
            rent_per_sqft REAL,
            transaction_date TEXT,
            source TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (estate_id) REFERENCES estates(id)
        );

        CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(transaction_date);
        CREATE INDEX IF NOT EXISTS idx_txn_estate ON transactions(estate_name);
        CREATE INDEX IF NOT EXISTS idx_txn_estate_date ON transactions(estate_name, transaction_date);

        CREATE TABLE IF NOT EXISTS scrape_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_time TEXT DEFAULT (datetime('now')),
            source TEXT,
            new_count INTEGER,
            total_count INTEGER,
            status TEXT,
            message TEXT
        );
    """)

    # 初始化小区数据
    estates_data = [
        ("oasis-kai-tak", "Oasis Kai Tak", "Oasis Kai Tak", "启德沐宁街10号", "启德", "住宅", 648, 2018),
        ("k-city", "K.CITY", "嘉汇", "启德沐宁街7号", "启德", "住宅", 900, 2018),
        ("k-summit", "K.Summit", "嘉峯汇", "启德沐泰街9号", "启德", "住宅", 1006, 2021),
        ("monaco-one", "Monaco One", "Monaco One", "启德沐泰街12号", "启德", "住宅", 340, 2020),
        ("monaco-marine", "Monaco Marine", "Monaco Marine", "启德沐泰街10号", "启德", "住宅", 559, 2022),
        ("vibe", "VIBE", "啟岸", "启德沐安街2号", "启德", "住宅", 476, 2018),
        ("one-kai-tak", "One Kai Tak", "启德1号", "启德沐安街1号", "启德", "住宅", 545, 2017),
        ("airside", "AIRSIDE", "AIRSIDE", "启德协调道2号", "启德", "商住", 402, 2023),
        ("the-henley", "The Henley", "The Henley", "启德承启道18号", "启德", "住宅", 1184, 2022),
        ("upper-river-bank", "Upper RiverBank", "尚·珒溋", "启德沐泰街11号", "启德", "住宅", 667, 2021),
        ("pavilia-bay", "Pavilia Bay", "柏傲湾", "荃湾永顺街48号", "荃湾西", "住宅", 984, 2019),
        ("ocean-pride", "Ocean Pride", "海之恋", "荃湾永顺街38号", "荃湾西", "住宅", 856, 2018),
        ("the-aurora", "The Aurora", "全·城汇", "荃湾西站上盖", "荃湾西", "住宅", 1120, 2018),
        ("vision-city", "Vision City", "环宇海湾", "荃湾永顺街1号", "荃湾西", "住宅", 640, 2015),
        ("bayview-park", "Bayview Park", "海湾花园", "荃湾青山公路", "荃湾西", "住宅", 560, 1998),
        ("tsuen-wan-garden", "Tsuen Wan Garden", "荃湾花园", "荃湾海坝街", "荃湾西", "住宅", 480, 1993),
        ("eight-peak", "Eight Peak", "八号花园", "大埔墟宝乡街8号", "大埔墟", "住宅", 336, 2019),
        ("tai-po-habitat", "Tai Po Habitat", "岚山", "大埔梧桐路1号", "大埔墟", "住宅", 416, 2015),
        ("savana", "Savana", "天钻", "大埔公路大埔段", "大埔墟", "住宅", 544, 2017),
        ("monte-vista", "Monte Vista", "比华利山别墅", "大埔公路大埔段", "大埔墟", "住宅", 378, 2012),
        ("vanke-cloud", "Vanke Cloud", "万科·云汇", "大埔宝湖道", "大埔墟", "住宅", 420, 2020),
        ("shatin-heights", "Tai Po Centre", "大埔中心", "大埔安邦路", "大埔墟", "住宅", 2848, 1987),
        ("lohas-park", "LOHAS Park", "日出康城", "将军澳康城路1号", "将军澳", "住宅", 2550, 2009),
        ("tko-centre", "Tseung Kwan O Centre", "将军澳中心", "将军澳唐德街9号", "将军澳", "住宅", 4044, 2004),
        ("ocean-shores", "Ocean Shores", "维景湾畔", "将军澳维景湾畔", "将军澳", "住宅", 3256, 2003),
        ("metro-town", "Metro Town", "都会駅", "将军澳唐俊街9号", "将军澳", "住宅", 2096, 2006),
        ("tko-plaza", "Tseung Kwan O Plaza", "将军澳广场", "将军澳唐德街1号", "将军澳", "住宅", 3984, 2005),
        ("metro-city", "Metro City", "新都城", "将军澳贸业路9号", "将军澳", "住宅", 3336, 2000),
        ("bauhinia-garden", "Bauhinia Garden", "宝盈花园", "将军澳唐俊街15号", "将军澳", "住宅", 1440, 2005),
        ("grand-ocean", "Grand Ocean", "君傲湾", "将军澳唐俊街8号", "将军澳", "住宅", 1520, 2006),
        ("capri", "Capri", "Capri", "将军澳康城路33号", "将军澳", "住宅", 828, 2015),
        ("tian-jin", "The Wings", "天晋", "将军澳唐贤街23号", "将军澳", "住宅", 1008, 2013),
    ]

    conn.executemany(
        "INSERT OR IGNORE INTO estates (id, name, name_cn, address, district, property_type, total_units, completion_year) VALUES (?,?,?,?,?,?,?,?)",
        estates_data,
    )
    conn.commit()
    log.info(f"数据库初始化完成: {DB_PATH}")
    return conn


def save_to_db(conn: sqlite3.Connection, transactions: list[dict]) -> int:
    """将交易数据写入数据库，返回新增条数"""
    new_count = 0
    for tx in transactions:
        try:
            conn.execute(
                """INSERT OR IGNORE INTO transactions
                   (id, estate_id, estate_name, address, layout, area, floor, monthly_rent, rent_per_sqft, transaction_date, source)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    tx["id"],
                    tx.get("estateId", ""),
                    tx["estateName"],
                    tx.get("address", ""),
                    tx.get("layout", ""),
                    tx.get("area", 0),
                    tx.get("floor", ""),
                    tx.get("monthlyRent", 0),
                    tx.get("rentPerSqft", 0),
                    tx.get("transactionDate", ""),
                    tx.get("source", ""),
                ),
            )
            if conn.total_changes:
                new_count += 1
        except sqlite3.IntegrityError:
            pass
    conn.commit()
    return new_count


def log_scrape(conn: sqlite3.Connection, source: str, new_count: int, total_count: int, status: str, message: str = ""):
    """记录爬虫运行日志"""
    conn.execute(
        "INSERT INTO scrape_logs (source, new_count, total_count, status, message) VALUES (?,?,?,?,?)",
        (source, new_count, total_count, status, message),
    )
    conn.commit()


def export_json(conn: sqlite3.Connection) -> None:
    """从数据库导出 JSON 文件供前端使用"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    cursor = conn.execute(
        """SELECT id, estate_name, address, layout, area, floor, monthly_rent, rent_per_sqft, transaction_date, source
           FROM transactions
           ORDER BY transaction_date DESC
           LIMIT 2000"""
    )

    transactions = []
    for row in cursor:
        transactions.append({
            "id": row[0],
            "estateName": row[1],
            "address": row[2] or "",
            "layout": row[3] or "",
            "area": row[4] or 0,
            "floor": row[5] or "",
            "monthlyRent": row[6] or 0,
            "rentPerSqft": row[7] or 0,
            "transactionDate": row[8] or "",
            "source": row[9] or "",
        })

    total = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]

    output = {
        "lastUpdated": datetime.now().isoformat(),
        "totalCount": total,
        "transactions": transactions,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    log.info(f"JSON 导出完成: {len(transactions)} 条 (数据库总计 {total} 条)")


# ── 爬虫逻辑 ─────────────────────────────────────────
def fetch_estate_page(session: requests.Session, centanet_name: str, type_code: str) -> str | None:
    """获取楼盘页面 HTML"""
    url = f"{ESTATE_PAGE_BASE}/{centanet_name}/{type_code}"
    for attempt in range(3):
        try:
            resp = session.get(url, headers=HEADERS, timeout=30)
            if resp.status_code == 200:
                return resp.text
            elif resp.status_code == 302:
                # 跟踪重定向
                redirect_url = resp.headers.get("Location", "")
                if redirect_url:
                    full_url = f"https://hk.centanet.com{redirect_url}" if redirect_url.startswith("/") else redirect_url
                    resp2 = session.get(full_url, headers=HEADERS, timeout=30)
                    if resp2.status_code == 200:
                        return resp2.text
            log.warning(f"  请求 {url} 返回 {resp.status_code} (尝试 {attempt+1}/3)")
        except requests.RequestException as e:
            log.warning(f"  请求失败 (尝试 {attempt+1}/3): {e}")
        if attempt < 2:
            time.sleep(2 ** attempt)
    return None


# ── Node.js NUXT 解析脚本 ──
NUXT_PARSER_JS = r'''
const fs = require("fs");
const nuxtStr = fs.readFileSync("/tmp/_nuxt_data.js", "utf8");
let result;
try {
    eval("result = " + nuxtStr);
} catch(e) {
    console.error("Eval error:", e.message);
    process.exit(1);
}
function findTransactions(obj, depth) {
    if (depth > 20 || !obj || typeof obj !== "object") return null;
    if (obj.recentTransactions && Array.isArray(obj.recentTransactions)) return obj.recentTransactions;
    for (const key of Object.keys(obj)) {
        try {
            const found = findTransactions(obj[key], depth + 1);
            if (found) return found;
        } catch(e) {}
    }
    return null;
}
const txns = findTransactions(result, 0);
if (txns && txns.length > 0) {
    const output = txns.filter(t => t.postType === "R").map(t => ({
        id: "centa-" + t.id,
        transactionPrice: t.transactionPrice,
        insDate: t.insDate ? t.insDate.substring(0, 10) : "",
        nArea: t.nArea || 0,
        nUnitPrice: t.nUnitPrice || 0,
        yAxis: t.yAxis || "",
        xAxis: t.xAxis || "",
        line1: (t.displayText && t.displayText.addr && t.displayText.addr.line1) || "",
    }));
    console.log(JSON.stringify(output));
} else {
    console.log("[]");
}
'''


def extract_transactions_from_nuxt(html: str, estate_id: str, estate_name: str) -> list[dict]:
    """
    从楼盘页面的 NUXT 数据中提取租赁成交记录。
    使用 Node.js 解析压缩的 NUXT JS 数据，解决变量引用问题。
    """
    m = re.search(r'window\.__NUXT__\s*=\s*(.+?)(?:</script>)', html, re.DOTALL)
    if not m:
        log.warning(f"  {estate_name}: 页面中未找到 NUXT 数据")
        return []
    
    nuxt = m.group(1)
    
    # 将 NUXT 数据写入临时文件
    nuxt_file = "/tmp/_nuxt_data.js"
    try:
        with open(nuxt_file, "w", encoding="utf-8") as f:
            f.write(nuxt)
    except OSError as e:
        log.error(f"  {estate_name}: 写入 NUXT 临时文件失败: {e}")
        return []
    
    # 调用 Node.js 解析
    try:
        proc = subprocess.run(
            ["node", "-e", NUXT_PARSER_JS],
            capture_output=True, text=True, timeout=15,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        log.error(f"  {estate_name}: Node.js 执行失败: {e}")
        return []
    
    if proc.returncode != 0:
        log.error(f"  {estate_name}: NUXT 解析错误: {proc.stderr[:200]}")
        return []
    
    # 解析 JSON 输出
    try:
        raw_txns = json.loads(proc.stdout)
    except json.JSONDecodeError as e:
        log.error(f"  {estate_name}: JSON 解析失败: {e}")
        return []
    
    # 转换为标准格式
    transactions = []
    for t in raw_txns:
        price = t.get("transactionPrice", 0)
        area = t.get("nArea", 0)
        unit_price = t.get("nUnitPrice", 0)
        if not unit_price and area > 0 and price > 0:
            unit_price = round(price / area, 1)
        
        # 从 line1 解析楼座和房型信息
        line1 = t.get("line1", "")
        layout = ""
        if line1:
            # 格式: "Oasis Kai Tak 3座 中層 F室" -> 提取 "3座 F室" 或 "3房"
            parts = line1.split()
            if len(parts) >= 3:
                layout = f"{parts[-2]} {parts[-1]}"  # e.g. "中層 F室"
        
        tx = {
            "id": t["id"],
            "estateId": estate_id,
            "estateName": estate_name,
            "address": "",
            "layout": layout,
            "area": area,
            "floor": t.get("yAxis", ""),
            "monthlyRent": int(price),
            "rentPerSqft": unit_price,
            "transactionDate": t.get("insDate", ""),
            "source": "centanet",
        }
        transactions.append(tx)
    
    return transactions


def scrape_estate_transactions(session: requests.Session, estate_id: str, estate_name: str, 
                                centanet_name: str, type_code: str) -> list[dict]:
    """爬取单个楼盘的租赁成交数据"""
    html = fetch_estate_page(session, centanet_name, type_code)
    if not html:
        log.warning(f"  {estate_name}: 无法获取页面")
        return []
    
    transactions = extract_transactions_from_nuxt(html, estate_id, estate_name)
    log.info(f"  {estate_name}: 找到 {len(transactions)} 条租赁成交")
    return transactions


def scrape_all_transactions() -> list[dict]:
    """爬取所有目标楼盘的租赁成交数据"""
    session = requests.Session()
    all_transactions = []
    district_counts = {"启德": 0, "荃湾西": 0, "大埔墟": 0, "将军澳": 0}
    
    # 确定每个楼盘的区域
    district_map = {}
    for eid, (name, cn_name, tc) in ESTATES_CONFIG.items():
        if eid in ["oasis-kai-tak", "k-city", "k-summit", "monaco-one", "monaco-marine", 
                    "vibe", "one-kai-tak", "airside", "the-henley", "upper-river-bank"]:
            district_map[eid] = "启德"
        elif eid in ["pavilia-bay", "ocean-pride", "the-aurora", "vision-city", "bayview-park", "tsuen-wan-garden"]:
            district_map[eid] = "荃湾西"
        elif eid in ["lohas-park", "tko-centre", "ocean-shores", "metro-town", "tko-plaza",
                     "metro-city", "bauhinia-garden", "grand-ocean", "capri", "tian-jin"]:
            district_map[eid] = "将军澳"
        else:
            district_map[eid] = "大埔墟"
    
    for estate_id, (estate_name, centanet_name, type_code) in ESTATES_CONFIG.items():
        district = district_map.get(estate_id, "启德")
        log.info(f"爬取 {estate_name} ({district}): {centanet_name}/{type_code}")
        
        try:
            txns = scrape_estate_transactions(session, estate_id, estate_name, centanet_name, type_code)
            all_transactions.extend(txns)
            district_counts[district] += len(txns)
        except Exception as e:
            log.error(f"  {estate_name} 爬取失败: {e}")
        
        time.sleep(1)  # 避免请求过快
    
    for district, count in district_counts.items():
        log.info(f"区域 {district}: 共 {count} 条租赁成交")
    
    return all_transactions


# ── 主流程 ────────────────────────────────────────────
def main():
    log.info("=" * 50)
    log.info("香港生活看板 - 租赁成交数据爬虫 开始运行")
    log.info(f"目标楼盘: {len(ESTATES_CONFIG)} 个")
    log.info("=" * 50)

    conn = init_db()

    try:
        transactions = scrape_all_transactions()
        log.info(f"共爬取 {len(transactions)} 条租赁成交记录")

        if transactions:
            new_count = save_to_db(conn, transactions)
            total = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
            log.info(f"数据库更新: 新增 {new_count} 条, 总计 {total} 条")
            log_scrape(conn, "centanet", new_count, total, "success")
        else:
            log.warning("未爬取到任何数据")
            total = conn.execute("SELECT COUNT(*) FROM transactions").fetchone()[0]
            log_scrape(conn, "centanet", 0, total, "partial", "未爬取到新数据")

        # 导出 JSON 供前端使用
        export_json(conn)

    except Exception as e:
        log.error(f"爬虫运行失败: {e}", exc_info=True)
        log_scrape(conn, "centanet", 0, 0, "error", str(e))
        sys.exit(1)
    finally:
        conn.close()

    log.info("爬虫运行完成")


if __name__ == "__main__":
    main()
