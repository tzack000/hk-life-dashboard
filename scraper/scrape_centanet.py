#!/usr/bin/env python3
"""
启德租赁成交数据爬虫
从中原地产网站爬取启德新区各小区的租赁成交记录，保存为 JSON。
每日凌晨由 cron 调用。

输出文件：/var/www/kai-tak-rental/data/transactions.json
"""

import json
import logging
import os
import re
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# ── 配置 ──────────────────────────────────────────────
OUTPUT_DIR = Path("/var/www/kai-tak-rental/data")
OUTPUT_FILE = OUTPUT_DIR / "transactions.json"
LOG_FILE = Path("/var/log/kai-tak-scraper.log")

# 中原地产启德新区成交页面（租赁）
BASE_URL = "https://hk.centanet.com/findproperty/zh-cn/list/transaction"
DISTRICT_PARAM = "啟德新區_19-HMA117"

# 目标小区列表（中原地产页面上的名称）
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


def normalize_estate_name(raw_name: str) -> str | None:
    """将网页上的小区名称映射为标准名称"""
    raw = raw_name.strip()
    if raw in TARGET_ESTATES:
        return TARGET_ESTATES[raw]
    # 模糊匹配
    for key, val in TARGET_ESTATES.items():
        if key.lower() in raw.lower() or raw.lower() in key.lower():
            return val
    return None


def parse_rent(text: str) -> int | None:
    """解析租金文本，例如 '$18,000' -> 18000"""
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
    """
    爬取中原地产启德新区的租赁成交数据。
    由于中原地产使用 SPA 渲染，直接 requests 可能无法获取完整数据，
    此处尝试通过其搜索接口获取数据。如果 SPA 阻断则回退到空列表。
    """
    transactions = []
    session = requests.Session()

    # 尝试中原地产的 API 接口（基于网页分析）
    api_url = "https://hk.centanet.com/findproperty/api/Transaction/Search"
    
    # 计算日期范围
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
            **HEADERS,
            "Content-Type": "application/json",
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
                    "layout": item.get("layout", item.get("room", "未知")),
                    "area": round(float(area)) if area else 0,
                    "floor": item.get("floor", ""),
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

    # 如果 API 失败，尝试爬取 HTML 页面
    if not transactions:
        log.info("API 未返回数据，尝试 HTML 页面爬取...")
        transactions = scrape_html_fallback(session, months_back)

    return transactions


def scrape_html_fallback(session: requests.Session, months_back: int) -> list[dict]:
    """回退方案：爬取 HTML 页面"""
    transactions = []
    
    # 遍历目标小区
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
        
        # 尝试解析成交记录表格
        rows = soup.select("table tr, .transaction-item, .deal-item, [class*='transaction']")
        log.info(f"  找到 {len(rows)} 个候选元素")

        for row in rows:
            try:
                cells = row.find_all("td") if row.name == "tr" else row.find_all(class_=True)
                if len(cells) < 3:
                    continue

                text = row.get_text(separator="|", strip=True)
                
                # 判断是否为租赁成交
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

        time.sleep(1)  # 礼貌延迟

    return transactions


def save_transactions(transactions: list[dict]) -> None:
    """保存数据到 JSON 文件"""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # 读取已有数据并合并（按 ID 去重）
    existing = []
    if OUTPUT_FILE.exists():
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                existing = json.load(f)
            log.info(f"已有 {len(existing)} 条历史数据")
        except (json.JSONDecodeError, IOError):
            log.warning("读取历史数据失败，将覆盖")

    # 合并去重
    seen_ids = {tx["id"] for tx in existing}
    new_count = 0
    for tx in transactions:
        if tx["id"] not in seen_ids:
            existing.append(tx)
            seen_ids.add(tx["id"])
            new_count += 1

    # 按日期排序
    existing.sort(key=lambda x: x.get("transactionDate", ""), reverse=True)

    # 写入
    output = {
        "lastUpdated": datetime.now().isoformat(),
        "totalCount": len(existing),
        "transactions": existing,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    log.info(f"保存完成: 新增 {new_count} 条, 总计 {len(existing)} 条")


def main():
    log.info("=" * 50)
    log.info("启德租赁成交数据爬虫 开始运行")
    log.info("=" * 50)

    try:
        transactions = scrape_centanet_transactions(months_back=2)
        log.info(f"共爬取 {len(transactions)} 条成交记录")

        if transactions:
            save_transactions(transactions)
        else:
            log.warning("未爬取到任何数据，保留历史数据不变")
            # 确保输出文件存在（首次运行）
            if not OUTPUT_FILE.exists():
                save_transactions([])

    except Exception as e:
        log.error(f"爬虫运行失败: {e}", exc_info=True)
        sys.exit(1)

    log.info("爬虫运行完成")


if __name__ == "__main__":
    main()
