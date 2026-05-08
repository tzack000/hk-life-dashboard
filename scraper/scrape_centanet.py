#!/usr/bin/env python3
"""
启德租赁成交数据爬虫
从中原地产网站爬取启德新区各小区的租赁成交记录。
数据写入 SQLite 数据库，并导出 JSON 供前端使用。
每日凌晨由 cron 调用。

数据库：/opt/kai-tak-scraper/rental.db
输出文件：/var/www/kai-tak-rental/data/transactions.json
"""

import json
import logging
import re
import sqlite3
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ── 配置 ──────────────────────────────────────────────
DB_PATH = Path("/opt/kai-tak-scraper/rental.db")
OUTPUT_DIR = Path("/var/www/kai-tak-rental/data")
OUTPUT_FILE = OUTPUT_DIR / "transactions.json"
LOG_FILE = Path("/var/log/kai-tak-scraper.log")

# 中原地产启德新区成交页面（租赁）
BASE_URL = "https://hk.centanet.com/findproperty/zh-cn/list/transaction"

# 目标小区列表（中原地产页面上的名称 → 标准名称）
TARGET_ESTATES = {
    "Oasis Kai Tak": "Oasis Kai Tak",
    "嘉汇": "K.CITY",
    "K.CITY": "K.CITY",
    "嘉峯汇": "K.Summit",
    "嘉峯匯": "K.Summit",
    "K.Summit": "K.Summit",
    "Monaco One": "Monaco One",
    "MONACO ONE": "Monaco One",
    "Monaco Marine": "Monaco Marine",
    "MONACO MARINE": "Monaco Marine",
    "VIBE": "VIBE",
    "啟岸": "VIBE",
    "启德1号": "One Kai Tak",
    "启德1号(I)": "One Kai Tak",
    "One Kai Tak": "One Kai Tak",
    "AIRSIDE": "AIRSIDE",
    "The Henley": "The Henley",
    "THE HENLEY": "The Henley",
    "尚·珒溋": "Upper RiverBank",
    "尚珒溋": "Upper RiverBank",
    "Upper RiverBank": "Upper RiverBank",
}

# 小区 ID 映射
ESTATE_IDS = {
    "Oasis Kai Tak": "oasis-kai-tak",
    "K.CITY": "k-city",
    "K.Summit": "k-summit",
    "Monaco One": "monaco-one",
    "Monaco Marine": "monaco-marine",
    "VIBE": "vibe",
    "One Kai Tak": "one-kai-tak",
    "AIRSIDE": "airside",
    "The Henley": "the-henley",
    "Upper RiverBank": "upper-river-bank",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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
                    ESTATE_IDS.get(tx["estateName"], ""),
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
def normalize_estate_name(raw_name: str) -> str | None:
    """将网页上的小区名称映射为标准名称"""
    raw = raw_name.strip()
    if raw in TARGET_ESTATES:
        return TARGET_ESTATES[raw]
    for key, val in TARGET_ESTATES.items():
        if key.lower() in raw.lower() or raw.lower() in key.lower():
            return val
    return None


def parse_rent(text: str) -> int | None:
    """解析租金文本"""
    nums = re.findall(r"[\d,]+", text.replace(",", "").replace("，", ""))
    if nums:
        try:
            return int(nums[0].replace(",", ""))
        except ValueError:
            return None
    return None


def parse_area(text: str) -> float | None:
    """解析面积文本"""
    nums = re.findall(r"[\d,.]+", text)
    if nums:
        try:
            return float(nums[0].replace(",", ""))
        except ValueError:
            return None
    return None


def fetch_page(session: requests.Session, url: str, retries: int = 3) -> str | None:
    """带重试的 HTTP GET"""
    for attempt in range(retries):
        try:
            resp = session.get(url, headers=HEADERS, timeout=30)
            resp.raise_for_status()
            return resp.text
        except requests.RequestException as e:
            log.warning(f"请求失败 (尝试 {attempt+1}/{retries}): {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    return None


def scrape_centanet_transactions(months_back: int = 2) -> list[dict]:
    """爬取中原地产启德新区的租赁成交数据"""
    transactions = []
    session = requests.Session()

    # 尝试 API 接口
    api_url = "https://hk.centanet.com/findproperty/api/Transaction/Search"
    now = datetime.now()
    date_from = (now - timedelta(days=30 * months_back)).strftime("%Y-%m-%d")
    date_to = now.strftime("%Y-%m-%d")

    payload = {
        "dateFrom": date_from,
        "dateTo": date_to,
        "postType": "租赁",
        "regionId": "19-HMA117",
        "pageIndex": 1,
        "pageSize": 200,
        "sortBy": "TransactionDate",
        "sortOrder": "desc",
    }

    try:
        log.info(f"尝试 API 接口: {api_url}")
        resp = session.post(api_url, json=payload, headers={
            **HEADERS, "Content-Type": "application/json",
        }, timeout=30)

        if resp.status_code == 200:
            data = resp.json()
            items = data.get("data", {}).get("items", []) or data.get("items", []) or []
            log.info(f"API 返回 {len(items)} 条记录")

            for item in items:
                estate_raw = item.get("estateName", "") or item.get("estate", "")
                estate = normalize_estate_name(estate_raw)
                if not estate:
                    continue

                rent = item.get("price") or item.get("rent") or 0
                area = item.get("netArea") or item.get("area") or 0

                tx = {
                    "id": f"centa-{item.get('id', '')}",
                    "estateName": estate,
                    "address": item.get("address", ""),
                    "layout": item.get("layout", item.get("room", "")),
                    "area": round(float(area)) if area else 0,
                    "floor": str(item.get("floor", "")),
                    "monthlyRent": int(rent) if rent else 0,
                    "rentPerSqft": round(int(rent) / float(area), 1) if rent and area and float(area) > 0 else 0,
                    "transactionDate": item.get("transactionDate", "")[:10],
                    "source": "centanet",
                }
                transactions.append(tx)
        else:
            log.warning(f"API 返回状态码: {resp.status_code}")
    except Exception as e:
        log.warning(f"API 接口失败: {e}")

    # 回退到 HTML 爬取
    if not transactions:
        log.info("API 未返回数据，尝试 HTML 页面爬取...")
        transactions = scrape_html_fallback(session)

    return transactions


def scrape_html_fallback(session: requests.Session) -> list[dict]:
    """回退方案：爬取 HTML 页面"""
    transactions = []

    estate_urls = {
        "K.CITY": "嘉汇/2-EYPPWPPHPG",
        "Oasis Kai Tak": "OASIS-KAI-TAK/2-EYPPWPPRPG",
        "K.Summit": "嘉峰汇/2-EYPPWWPSWG",
        "The Henley": "THE-HENLEY/3-EYSPWPPHPG",
        "Monaco One": "MONACO-ONE/3-EYSPWPPXPG",
        "Monaco Marine": "MONACO-MARINE/3-EYSPWPPYPG",
        "VIBE": "VIBE/2-EYPPWPPTPG",
        "AIRSIDE": "AIRSIDE/3-EYSPWPPZPG",
    }

    for estate_name, url_path in estate_urls.items():
        url = f"https://hk.centanet.com/estate/zh-cn/{url_path}"
        log.info(f"爬取 {estate_name}: {url}")

        html = fetch_page(session, url)
        if not html:
            continue

        soup = BeautifulSoup(html, "html.parser")
        rows = soup.select("table tr, .transaction-item, .deal-item, [class*='transaction']")
        log.info(f"  找到 {len(rows)} 个候选元素")

        for row in rows:
            try:
                cells = row.find_all("td") if row.name == "tr" else row.find_all(class_=True)
                if len(cells) < 3:
                    continue

                text = row.get_text(separator="|", strip=True)
                if "租" not in text and "rent" not in text.lower():
                    continue

                rent = parse_rent(text)
                area = parse_area(text)

                if rent and rent > 5000:
                    tx = {
                        "id": f"centa-html-{hash(text) & 0xFFFFFF:06x}",
                        "estateName": estate_name,
                        "address": "",
                        "layout": "",
                        "area": round(area) if area else 0,
                        "floor": "",
                        "monthlyRent": rent,
                        "rentPerSqft": round(rent / area, 1) if area and area > 0 else 0,
                        "transactionDate": "",
                        "source": "centanet-html",
                    }
                    transactions.append(tx)
            except Exception as e:
                log.debug(f"  解析行失败: {e}")
                continue

        time.sleep(1)

    return transactions


# ── 主流程 ────────────────────────────────────────────
def main():
    log.info("=" * 50)
    log.info("启德租赁成交数据爬虫 开始运行")
    log.info("=" * 50)

    conn = init_db()

    try:
        transactions = scrape_centanet_transactions(months_back=2)
        log.info(f"共爬取 {len(transactions)} 条成交记录")

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
