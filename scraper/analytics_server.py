#!/usr/bin/env python3
"""
轻量访问统计 API 服务
- 记录 PV/UV（基于 IP + UA 指纹）
- 提供统计查询接口
- 数据存 SQLite

运行方式：python3 analytics_server.py
端口：8901
"""

import hashlib
import json
import sqlite3
import threading
from datetime import datetime, timedelta
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS

# ── 配置 ──────────────────────────────────────────────
DB_PATH = Path("/opt/kai-tak-scraper/analytics.db")
HOST = "127.0.0.1"
PORT = 8901

app = Flask(__name__)
CORS(app)

# 线程安全的数据库连接
local = threading.local()


def get_db() -> sqlite3.Connection:
    if not hasattr(local, "conn"):
        local.conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        local.conn.execute("PRAGMA journal_mode=WAL")
        local.conn.row_factory = sqlite3.Row
    return local.conn


def init_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS page_views (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            visitor_id TEXT NOT NULL,
            ip TEXT,
            path TEXT DEFAULT '/',
            referrer TEXT,
            user_agent TEXT,
            screen_width INTEGER,
            screen_height INTEGER,
            language TEXT,
            country TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS daily_stats (
            date TEXT NOT NULL,
            path TEXT DEFAULT '/',
            pv INTEGER DEFAULT 0,
            uv INTEGER DEFAULT 0,
            PRIMARY KEY (date, path)
        );

        CREATE INDEX IF NOT EXISTS idx_pv_created ON page_views(created_at);
        CREATE INDEX IF NOT EXISTS idx_pv_visitor ON page_views(visitor_id);
        CREATE INDEX IF NOT EXISTS idx_pv_path ON page_views(path);
        CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_stats(date);
    """)
    conn.commit()
    conn.close()


def generate_visitor_id(ip: str, ua: str) -> str:
    """基于 IP + UA 生成每日唯一访客 ID"""
    today = datetime.now().strftime("%Y-%m-%d")
    raw = f"{ip}:{ua}:{today}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


# ── API 路由 ──────────────────────────────────────────

@app.route("/api/track", methods=["POST"])
def track():
    """记录一次页面访问"""
    data = request.get_json(silent=True) or {}
    ip = request.headers.get("X-Real-IP") or request.headers.get("X-Forwarded-For", "").split(",")[0].strip() or request.remote_addr
    ua = request.headers.get("User-Agent", "")

    visitor_id = generate_visitor_id(ip, ua)
    path = data.get("path", "/")
    referrer = data.get("referrer", "")
    screen_width = data.get("screenWidth", 0)
    screen_height = data.get("screenHeight", 0)
    language = data.get("language", "")

    db = get_db()

    # 插入详细记录
    db.execute(
        """INSERT INTO page_views (visitor_id, ip, path, referrer, user_agent, screen_width, screen_height, language)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (visitor_id, ip, path, referrer, ua, screen_width, screen_height, language),
    )

    # 更新每日统计
    today = datetime.now().strftime("%Y-%m-%d")
    db.execute(
        "INSERT OR IGNORE INTO daily_stats (date, path, pv, uv) VALUES (?, ?, 0, 0)",
        (today, path),
    )
    db.execute(
        "UPDATE daily_stats SET pv = pv + 1 WHERE date = ? AND path = ?",
        (today, path),
    )

    # 检查是否为今日新访客
    existing = db.execute(
        "SELECT COUNT(*) FROM page_views WHERE visitor_id = ? AND date(created_at) = ? AND id != last_insert_rowid()",
        (visitor_id, today),
    ).fetchone()[0]

    if existing == 0:
        db.execute(
            "UPDATE daily_stats SET uv = uv + 1 WHERE date = ? AND path = ?",
            (today, path),
        )

    db.commit()
    return jsonify({"ok": True})


@app.route("/api/stats/overview", methods=["GET"])
def stats_overview():
    """获取总览统计"""
    db = get_db()

    # 总 PV/UV
    total_pv = db.execute("SELECT COUNT(*) FROM page_views").fetchone()[0]
    total_uv = db.execute("SELECT COUNT(DISTINCT visitor_id) FROM page_views").fetchone()[0]

    # 今日
    today = datetime.now().strftime("%Y-%m-%d")
    today_pv = db.execute("SELECT COUNT(*) FROM page_views WHERE date(created_at) = ?", (today,)).fetchone()[0]
    today_uv = db.execute("SELECT COUNT(DISTINCT visitor_id) FROM page_views WHERE date(created_at) = ?", (today,)).fetchone()[0]

    # 昨日
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    yesterday_pv = db.execute("SELECT COUNT(*) FROM page_views WHERE date(created_at) = ?", (yesterday,)).fetchone()[0]
    yesterday_uv = db.execute("SELECT COUNT(DISTINCT visitor_id) FROM page_views WHERE date(created_at) = ?", (yesterday,)).fetchone()[0]

    return jsonify({
        "totalPV": total_pv,
        "totalUV": total_uv,
        "todayPV": today_pv,
        "todayUV": today_uv,
        "yesterdayPV": yesterday_pv,
        "yesterdayUV": yesterday_uv,
    })


@app.route("/api/stats/trend", methods=["GET"])
def stats_trend():
    """获取最近 N 天的 PV/UV 趋势"""
    days = int(request.args.get("days", 30))
    db = get_db()

    start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    rows = db.execute(
        """SELECT date, SUM(pv) as pv, SUM(uv) as uv
           FROM daily_stats
           WHERE date >= ?
           GROUP BY date
           ORDER BY date ASC""",
        (start_date,),
    ).fetchall()

    trend = [{"date": row[0], "pv": row[1], "uv": row[2]} for row in rows]
    return jsonify(trend)


@app.route("/api/stats/pages", methods=["GET"])
def stats_pages():
    """获取页面访问排行"""
    db = get_db()
    rows = db.execute(
        """SELECT path, COUNT(*) as pv, COUNT(DISTINCT visitor_id) as uv
           FROM page_views
           GROUP BY path
           ORDER BY pv DESC
           LIMIT 20""",
    ).fetchall()

    pages = [{"path": row[0], "pv": row[1], "uv": row[2]} for row in rows]
    return jsonify(pages)


@app.route("/api/stats/referrers", methods=["GET"])
def stats_referrers():
    """获取来源统计"""
    db = get_db()
    rows = db.execute(
        """SELECT referrer, COUNT(*) as count
           FROM page_views
           WHERE referrer != '' AND referrer IS NOT NULL
           GROUP BY referrer
           ORDER BY count DESC
           LIMIT 20""",
    ).fetchall()

    referrers = [{"referrer": row[0], "count": row[1]} for row in rows]
    return jsonify(referrers)


@app.route("/api/stats/devices", methods=["GET"])
def stats_devices():
    """获取设备统计（基于屏幕宽度分类）"""
    db = get_db()

    mobile = db.execute("SELECT COUNT(*) FROM page_views WHERE screen_width > 0 AND screen_width < 768").fetchone()[0]
    tablet = db.execute("SELECT COUNT(*) FROM page_views WHERE screen_width >= 768 AND screen_width < 1024").fetchone()[0]
    desktop = db.execute("SELECT COUNT(*) FROM page_views WHERE screen_width >= 1024").fetchone()[0]
    unknown = db.execute("SELECT COUNT(*) FROM page_views WHERE screen_width = 0 OR screen_width IS NULL").fetchone()[0]

    return jsonify({
        "mobile": mobile,
        "tablet": tablet,
        "desktop": desktop,
        "unknown": unknown,
    })


@app.route("/api/stats/recent", methods=["GET"])
def stats_recent():
    """获取最近访问记录"""
    limit = int(request.args.get("limit", 50))
    db = get_db()

    rows = db.execute(
        """SELECT created_at, ip, path, referrer, user_agent, screen_width
           FROM page_views
           ORDER BY id DESC
           LIMIT ?""",
        (limit,),
    ).fetchall()

    records = [{
        "time": row[0],
        "ip": row[1],
        "path": row[2],
        "referrer": row[3],
        "ua": row[4][:80] if row[4] else "",
        "screenWidth": row[5],
    } for row in rows]

    return jsonify(records)


# ── 启动 ──────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    print(f"Analytics server running on {HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=False)
