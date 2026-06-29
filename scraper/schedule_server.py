#!/usr/bin/env python3
"""
家庭日程管理 API 服务
- 事件 CRUD（学校放假 / 培训班 / 其它家庭事项）
- 数据存 SQLite
- 读操作公开；写操作需 X-API-Key
- 供前端页面与 AI Agent（family-calendar SKILL）共用

运行方式：python3 schedule_server.py
端口：8902
环境变量：
  SCHEDULE_API_KEY  写操作密钥（缺省随机生成并打印到日志一次）
  SCHEDULE_API_PORT 监听端口（缺省 8902）
  SCHEDULE_DB_PATH  数据库路径（缺省 /opt/kai-tak-scraper/schedule.db）
"""

import os
import re
import secrets
import sqlite3
import threading
from datetime import datetime, timedelta
from pathlib import Path

from flask import Flask, request, jsonify
from flask_cors import CORS

# ── 配置 ──────────────────────────────────────────────
DB_PATH = Path(os.environ.get("SCHEDULE_DB_PATH", "/opt/kai-tak-scraper/schedule.db"))
HOST = "127.0.0.1"
PORT = int(os.environ.get("SCHEDULE_API_PORT", "8902"))
API_KEY = os.environ.get("SCHEDULE_API_KEY") or secrets.token_urlsafe(24)

CATEGORIES = {"学校", "培训班", "其它"}
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME_RE = re.compile(r"^\d{2}:\d{2}$")

app = Flask(__name__)
CORS(app)

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
        CREATE TABLE IF NOT EXISTS family_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT,
            start_time TEXT,
            end_time TEXT,
            location TEXT,
            note TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_events_start ON family_events(start_date);
        CREATE INDEX IF NOT EXISTS idx_events_category ON family_events(category);
    """)
    conn.commit()
    conn.close()


def row_to_event(row: sqlite3.Row) -> dict:
    """DB 行 (snake_case) → API 事件对象 (camelCase)，省略空值字段"""
    ev = {
        "id": str(row["id"]),
        "title": row["title"],
        "category": row["category"],
        "startDate": row["start_date"],
    }
    if row["end_date"]:
        ev["endDate"] = row["end_date"]
    if row["start_time"]:
        ev["startTime"] = row["start_time"]
    if row["end_time"]:
        ev["endTime"] = row["end_time"]
    if row["location"]:
        ev["location"] = row["location"]
    if row["note"]:
        ev["note"] = row["note"]
    return ev


def require_key():
    """校验写操作密钥，返回 None 表示通过，否则返回 (response, status)"""
    key = request.headers.get("X-API-Key", "")
    if key != API_KEY:
        return jsonify({"error": "unauthorized: missing or invalid X-API-Key"}), 401
    return None


def validate_payload(data: dict, partial: bool = False):
    """校验事件字段，返回 (errors:list, normalized:dict)"""
    errors = []
    out = {}

    def check_date(field, value):
        if value is not None and not DATE_RE.match(str(value)):
            errors.append(f"{field} 必须为 YYYY-MM-DD 格式")

    def check_time(field, value):
        if value is not None and value != "" and not TIME_RE.match(str(value)):
            errors.append(f"{field} 必须为 HH:mm 格式")

    # 必填项（partial 更新时可缺省，但提供则校验）
    if not partial or "title" in data:
        title = data.get("title")
        if not title or not str(title).strip():
            errors.append("title 不能为空")
        else:
            out["title"] = str(title).strip()

    if not partial or "category" in data:
        category = data.get("category")
        if category not in CATEGORIES:
            errors.append(f"category 必须为 {sorted(CATEGORIES)} 之一")
        else:
            out["category"] = category

    if not partial or "startDate" in data:
        start_date = data.get("startDate")
        if not start_date:
            errors.append("startDate 不能为空")
        else:
            check_date("startDate", start_date)
            out["start_date"] = start_date

    # 可选项
    for api_field, col, checker in [
        ("endDate", "end_date", check_date),
        ("startTime", "start_time", check_time),
        ("endTime", "end_time", check_time),
    ]:
        if api_field in data:
            checker(api_field, data[api_field])
            out[col] = data[api_field] or None

    for api_field, col in [("location", "location"), ("note", "note")]:
        if api_field in data:
            val = data[api_field]
            out[col] = str(val).strip() if val else None

    return errors, out


# ── API 路由 ──────────────────────────────────────────

@app.route("/api/schedule/events", methods=["GET"])
def list_events():
    """查询事件，支持 category / from / to / upcoming 过滤"""
    db = get_db()
    rows = db.execute(
        "SELECT * FROM family_events ORDER BY start_date ASC, start_time ASC"
    ).fetchall()
    events = [row_to_event(r) for r in rows]

    category = request.args.get("category")
    if category and category != "all":
        events = [e for e in events if e["category"] == category]

    from_date = request.args.get("from")
    to_date = request.args.get("to")
    upcoming = request.args.get("upcoming")

    if upcoming is not None:
        try:
            days = int(upcoming)
        except ValueError:
            days = 7
        today = datetime.now().date()
        end = today + timedelta(days=days)
        from_date = today.strftime("%Y-%m-%d")
        to_date = end.strftime("%Y-%m-%d")

    if from_date or to_date:
        lo = from_date or "0000-00-00"
        hi = to_date or "9999-99-99"
        # 事件区间 [startDate, endDate||startDate] 与 [lo, hi] 相交
        def intersects(e):
            s = e["startDate"]
            t = e.get("endDate", s)
            return s <= hi and t >= lo
        events = [e for e in events if intersects(e)]

    return jsonify(events)


@app.route("/api/schedule/events/<int:event_id>", methods=["GET"])
def get_event(event_id):
    db = get_db()
    row = db.execute("SELECT * FROM family_events WHERE id = ?", (event_id,)).fetchone()
    if not row:
        return jsonify({"error": "not found"}), 404
    return jsonify(row_to_event(row))


@app.route("/api/schedule/events", methods=["POST"])
def create_event():
    auth = require_key()
    if auth:
        return auth

    data = request.get_json(silent=True) or {}
    errors, fields = validate_payload(data, partial=False)
    if errors:
        return jsonify({"error": "validation failed", "details": errors}), 400

    db = get_db()
    cur = db.execute(
        """INSERT INTO family_events
           (title, category, start_date, end_date, start_time, end_time, location, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            fields["title"],
            fields["category"],
            fields["start_date"],
            fields.get("end_date"),
            fields.get("start_time"),
            fields.get("end_time"),
            fields.get("location"),
            fields.get("note"),
        ),
    )
    db.commit()
    row = db.execute("SELECT * FROM family_events WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(row_to_event(row)), 201


@app.route("/api/schedule/events/<int:event_id>", methods=["PUT"])
def update_event(event_id):
    auth = require_key()
    if auth:
        return auth

    db = get_db()
    existing = db.execute("SELECT * FROM family_events WHERE id = ?", (event_id,)).fetchone()
    if not existing:
        return jsonify({"error": "not found"}), 404

    data = request.get_json(silent=True) or {}
    errors, fields = validate_payload(data, partial=True)
    if errors:
        return jsonify({"error": "validation failed", "details": errors}), 400
    if not fields:
        return jsonify({"error": "no updatable fields provided"}), 400

    fields["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    set_clause = ", ".join(f"{col} = ?" for col in fields)
    values = list(fields.values()) + [event_id]
    db.execute(f"UPDATE family_events SET {set_clause} WHERE id = ?", values)
    db.commit()

    row = db.execute("SELECT * FROM family_events WHERE id = ?", (event_id,)).fetchone()
    return jsonify(row_to_event(row))


@app.route("/api/schedule/events/<int:event_id>", methods=["DELETE"])
def delete_event(event_id):
    auth = require_key()
    if auth:
        return auth

    db = get_db()
    existing = db.execute("SELECT id FROM family_events WHERE id = ?", (event_id,)).fetchone()
    if not existing:
        return jsonify({"error": "not found"}), 404

    db.execute("DELETE FROM family_events WHERE id = ?", (event_id,))
    db.commit()
    return jsonify({"ok": True, "deleted": str(event_id)})


@app.route("/api/schedule/health", methods=["GET"])
def health():
    return jsonify({"ok": True})


# ── 启动 ──────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    if not os.environ.get("SCHEDULE_API_KEY"):
        print(f"[WARN] SCHEDULE_API_KEY 未设置，本次随机生成：{API_KEY}")
        print("[WARN] 重启后会变化，请在 .env / systemd 中固定该密钥")
    print(f"Schedule server running on {HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=False)
