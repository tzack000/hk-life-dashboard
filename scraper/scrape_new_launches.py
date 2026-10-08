#!/usr/bin/env python3
"""
香港生活看板 - 一手新盘爬虫

从中原地产新盘列表采集，只保留最近地铁站落在启德站 30 分钟内的项目。
通勤只算港铁重铁的站台到站台，不含巴士、轻铁、驾车和出站后步行。
数据写入 SQLite，并导出 new-launches.json。不改写 transactions.json。
"""

from __future__ import annotations

import json
import logging
import os
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path

import requests

SCRAPER_DIR = Path(os.environ.get("SCRAPER_DIR", "/opt/kai-tak-scraper"))
WEB_DIR = Path(os.environ.get("WEB_DIR", "/var/www/kai-tak-rental"))
DB_PATH = SCRAPER_DIR / "rental.db"
OUTPUT_DIR = WEB_DIR / "data"
OUTPUT_FILE = OUTPUT_DIR / "new-launches.json"
TRANSACTIONS_FILE = OUTPUT_DIR / "transactions.json"
LOG_FILE = Path(os.environ.get("SCRAPER_LOG", "/var/log/kai-tak-scraper.log"))
STATION_FILE = Path(__file__).with_name("kai-tak-mtr-30.json")

SEARCH_URL = "https://hk-api.centanet.com/centanetapi/api/NewProperty/Search"
PAGE_SIZE = 20
SOURCE = "中原地产"
EVENT_LIMIT = 8

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Accept-Language": "zh-HK,zh;q=0.9,en;q=0.8",
    "Origin": "https://hk.centanet.com",
    "Referer": "https://hk.centanet.com/findproperty/list/new-property",
}

handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]
try:
    handlers.append(logging.FileHandler(str(LOG_FILE), encoding="utf-8"))
except OSError:
    pass
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=handlers,
)
log = logging.getLogger("new-launches")


def load_stations() -> list[dict]:
    with open(STATION_FILE, encoding="utf-8") as f:
        payload = json.load(f)
    stations = []
    for station in payload["stations"]:
        if station["minutes"] > payload["maxMinutes"]:
            continue
        aliases = sorted({alias for alias in station["aliases"] if alias}, key=len, reverse=True)
        stations.append({
            "name": station["name"],
            "minutes": station["minutes"],
            "aliases": aliases,
        })
    return stations


def find_alias(text: str, alias: str) -> int:
    start = 0
    while True:
        index = text.find(alias, start)
        if index < 0:
            return -1
        if alias == "太子" and text[index:index + 3] == "太子道":
            start = index + len(alias)
            continue
        return index


def match_station(text: str, stations: list[dict]) -> dict | None:
    hits = []
    for station in stations:
        for alias in station["aliases"]:
            index = find_alias(text, alias)
            if index >= 0:
                hits.append((len(alias), index, index + len(alias), station))
                break
    if not hits:
        return None
    hits.sort(key=lambda item: item[0], reverse=True)
    kept = []
    for hit in hits:
        contained = any(
            hit[1] >= other[1] and hit[2] <= other[2] and hit[0] < other[0]
            for other in kept
        )
        if not contained:
            kept.append(hit)
    return min(kept, key=lambda item: item[3]["minutes"])[3]


def key_date(item: dict) -> str | None:
    today = datetime.now().strftime("%Y-%m-%d")
    dates = []
    for field in ("firstSalesArrangementDateTime", "estimatedKeyDateTime"):
        raw = item.get(field) or ""
        if len(raw) >= 10:
            dates.append(raw[:10])
    if not dates:
        return None
    future = [value for value in dates if value >= today]
    return min(future) if future else max(dates)


def sale_status(item: dict) -> str:
    if item.get("soldOut"):
        return "已售罄"
    if item.get("saleStatus") == "OnSale":
        return "发售中"
    return "即将推售"


def price_from(item: dict) -> int | None:
    discount = item.get("discountPrice")
    if isinstance(discount, (int, float)) and discount > 0:
        return int(discount)
    minimum = (item.get("priceRange") or {}).get("minPrice")
    if isinstance(minimum, (int, float)) and minimum > 0:
        return int(minimum)
    return None


def format_price(value: int | None) -> str:
    if not value:
        return "售价待公布"
    wan = value / 10000
    if wan >= 100:
        return f"${round(wan):,.0f}万"
    text = f"{wan:.1f}".rstrip("0").rstrip(".")
    return f"${text}万"


def project_text(item: dict) -> str:
    line5 = ((item.get("displayText") or {}).get("addr") or {}).get("line5") or ""
    parts = [
        item.get("districtName") or "",
        item.get("address") or "",
        item.get("newPropertyName") or "",
        line5,
    ]
    return " ".join(part for part in parts if part)


def fetch_all(session: requests.Session) -> list[dict]:
    first = fetch_page(session, 0)
    count = int(first.get("count") or 0)
    items = list(first.get("data") or [])
    if count == 0 or not items:
        return []
    offset = PAGE_SIZE
    while offset < count:
        page = fetch_page(session, offset)
        batch = page.get("data") or []
        if not batch:
            raise RuntimeError(f"新盘列表在 offset={offset} 返回空页，已中止以免覆盖旧数据")
        items.extend(batch)
        offset += PAGE_SIZE
        time.sleep(0.4)
    return items


def fetch_page(session: requests.Session, offset: int) -> dict:
    payload = {"offset": offset, "size": PAGE_SIZE, "pageSource": "search"}
    last_error = None
    for attempt in range(3):
        try:
            resp = session.post(SEARCH_URL, json=payload, headers=HEADERS, timeout=30)
            if resp.status_code == 200:
                body = resp.json()
                if isinstance(body, dict) and "data" in body:
                    return body
            last_error = f"HTTP {resp.status_code}"
        except requests.RequestException as exc:
            last_error = str(exc)
        time.sleep(2 ** attempt)
    raise RuntimeError(f"新盘列表 offset={offset} 请求失败: {last_error}")


def to_launch(item: dict, station: dict) -> dict:
    developers = [
        developer.get("label")
        for developer in (item.get("developers") or [])
        if developer.get("label")
    ]
    return {
        "id": f"centa-{item['id']}",
        "name": item.get("newPropertyName") or item.get("newPropertyNameC") or str(item["id"]),
        "nearestStation": station["name"],
        "minutesToKaiTak": station["minutes"],
        "developer": "、".join(developers),
        "address": item.get("address") or "",
        "status": sale_status(item),
        "keyDate": key_date(item),
        "unitCount": None,
        "priceFrom": price_from(item),
        "sourceUrl": item.get("detailUrl") or "",
    }


def init_db() -> sqlite3.Connection:
    SCRAPER_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS new_launches (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            nearest_station TEXT NOT NULL,
            minutes_to_kai_tak INTEGER NOT NULL,
            developer TEXT,
            address TEXT,
            status TEXT NOT NULL,
            key_date TEXT,
            unit_count INTEGER,
            price_from INTEGER,
            source_url TEXT,
            first_seen TEXT NOT NULL,
            last_seen TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS launch_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            launch_id TEXT NOT NULL,
            event_date TEXT NOT NULL,
            kind TEXT NOT NULL,
            summary TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_launch_events_launch
            ON launch_events(launch_id, event_date);
    """)
    conn.commit()
    return conn


def record_event(conn: sqlite3.Connection, launch_id: str, today: str, kind: str, summary: str) -> None:
    conn.execute(
        "INSERT INTO launch_events (launch_id, event_date, kind, summary) VALUES (?,?,?,?)",
        (launch_id, today, kind, summary),
    )


def upsert(conn: sqlite3.Connection, launch: dict, today: str) -> None:
    current = conn.execute(
        "SELECT status, key_date, price_from FROM new_launches WHERE id = ?",
        (launch["id"],),
    ).fetchone()
    if current is None:
        conn.execute(
            """INSERT INTO new_launches
               (id, name, nearest_station, minutes_to_kai_tak, developer, address,
                status, key_date, unit_count, price_from, source_url, first_seen, last_seen)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                launch["id"], launch["name"], launch["nearestStation"], launch["minutesToKaiTak"],
                launch["developer"], launch["address"], launch["status"], launch["keyDate"],
                launch["unitCount"], launch["priceFrom"], launch["sourceUrl"], today, today,
            ),
        )
        record_event(conn, launch["id"], today, "appeared", f"首次收录，状态为{launch['status']}")
        return

    status, old_date, old_price = current
    conn.execute(
        """UPDATE new_launches
           SET name=?, nearest_station=?, minutes_to_kai_tak=?, developer=?, address=?,
               status=?, key_date=?, unit_count=?, price_from=?, source_url=?, last_seen=?
           WHERE id=?""",
        (
            launch["name"], launch["nearestStation"], launch["minutesToKaiTak"],
            launch["developer"], launch["address"], launch["status"], launch["keyDate"],
            launch["unitCount"], launch["priceFrom"], launch["sourceUrl"], today, launch["id"],
        ),
    )
    if status != launch["status"]:
        record_event(
            conn, launch["id"], today, "status",
            f"销售状态由「{status}」变为「{launch['status']}」",
        )
    if old_price != launch["priceFrom"]:
        record_event(
            conn, launch["id"], today, "price",
            f"最低售价由 {format_price(old_price)} 变为 {format_price(launch['priceFrom'])}",
        )
    if (old_date or None) != launch["keyDate"]:
        record_event(
            conn, launch["id"], today, "date",
            f"下一关键日期由 {old_date or '未定'} 变为 {launch['keyDate'] or '未定'}",
        )


def export_json(conn: sqlite3.Connection) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    rows = conn.execute(
        """SELECT id, name, nearest_station, minutes_to_kai_tak, developer, address,
                  status, key_date, unit_count, price_from, source_url
           FROM new_launches
           ORDER BY id"""
    ).fetchall()
    launches = [{
        "id": row[0],
        "name": row[1],
        "nearestStation": row[2],
        "minutesToKaiTak": row[3],
        "developer": row[4] or "",
        "address": row[5] or "",
        "status": row[6],
        "keyDate": row[7],
        "unitCount": row[8],
        "priceFrom": row[9],
        "sourceUrl": row[10] or "",
    } for row in rows]

    events = []
    for launch in launches:
        event_rows = conn.execute(
            """SELECT id, event_date, kind, summary
               FROM launch_events
               WHERE launch_id = ?
               ORDER BY event_date DESC, id DESC
               LIMIT ?""",
            (launch["id"], EVENT_LIMIT),
        ).fetchall()
        for event in event_rows:
            events.append({
                "id": f"{launch['id']}-{event[0]}",
                "launchId": launch["id"],
                "date": event[1],
                "kind": event[2],
                "summary": event[3],
            })

    payload = {
        "lastUpdated": datetime.now().astimezone().isoformat(timespec="seconds"),
        "source": SOURCE,
        "launches": launches,
        "events": events,
    }
    temporary = OUTPUT_FILE.with_suffix(".json.tmp")
    with open(temporary, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")
    temporary.replace(OUTPUT_FILE)
    if TRANSACTIONS_FILE.exists():
        log.info("未改写 transactions.json")
    log.info(f"JSON 导出完成: {len(launches)} 个新盘，{len(events)} 条动态")


def main() -> None:
    log.info("一手新盘爬虫开始")
    stations = load_stations()
    session = requests.Session()
    try:
        raw_items = fetch_all(session)
    except Exception as exc:
        log.error(f"采集失败，保留已有 JSON: {exc}")
        sys.exit(1)

    if not raw_items:
        log.error("解析结果为零，保留已有 JSON")
        sys.exit(1)

    matched = []
    unmatched = []
    for item in raw_items:
        if "id" not in item:
            continue
        station = match_station(project_text(item), stations)
        if station is None:
            label = item.get("districtName") or item.get("newPropertyName") or str(item.get("id"))
            unmatched.append(label)
            continue
        matched.append(to_launch(item, station))

    log.info(f"列表 {len(raw_items)} 个，圈内 {len(matched)} 个，未对照 {len(unmatched)} 个")
    for label in sorted(set(unmatched))[:40]:
        log.info(f"未对照地点: {label}")

    today = datetime.now().strftime("%Y-%m-%d")
    conn = init_db()
    try:
        for launch in matched:
            upsert(conn, launch, today)
        conn.commit()
        export_json(conn)
    except Exception as exc:
        conn.rollback()
        log.error(f"写入失败，保留已有 JSON: {exc}")
        sys.exit(1)
    finally:
        conn.close()
    log.info("一手新盘爬虫完成")


if __name__ == "__main__":
    main()
