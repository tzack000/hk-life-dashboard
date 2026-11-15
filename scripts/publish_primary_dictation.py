#!/usr/bin/env python3
"""把小学英语听写材料（文档 + 录音）发布到服务器 $DATA_DIR/primary-english/。

在存有材料的电脑上运行：

    python3 scripts/publish_primary_dictation.py "~/Downloads/P2 Dictation" --dry-run
    python3 scripts/publish_primary_dictation.py "~/Downloads/P2 Dictation"

服务器目录会与文件夹保持一致（文件夹里没有的旧材料会被删除）。
站点公开可访问：上传前确认文档和文件名里没有孩子姓名、班级、学号。
"""

import argparse
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

DOCUMENT_EXTS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
RECORDING_EXTS = {".mp3", ".m4a", ".aac", ".wav", ".ogg"}
REMOTE_SUBDIR = "primary-english"
REMOTE_STAGING = "/tmp/primary-english-upload"
RSYNC_CHMOD = "--chmod=Du+rwx,Dg+rx,Do+rx,Fu+r,Fg+r,Fo+r"
REPO_ROOT = Path(__file__).resolve().parent.parent


def natural_key(path: str):
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", path)]


def title_of(relative: str) -> str:
    stem = Path(relative).stem
    return re.sub(r"[_]+", " ", stem).strip() or stem


def scan(folder: Path):
    documents, recordings, skipped = [], [], []
    for path in sorted(folder.rglob("*"), key=lambda p: natural_key(str(p.relative_to(folder)))):
        if not path.is_file():
            continue
        relative = path.relative_to(folder).as_posix()
        if any(part.startswith(".") for part in path.relative_to(folder).parts):
            continue
        entry = {"title": title_of(relative), "file": relative, "size": path.stat().st_size}
        ext = path.suffix.lower()
        if ext in DOCUMENT_EXTS:
            documents.append(entry)
        elif ext in RECORDING_EXTS:
            recordings.append(entry)
        else:
            skipped.append(relative)
    return documents, recordings, skipped


def load_env(env_path: Path) -> dict:
    env = {}
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    for key in ("SERVER_HOST", "SERVER_USER", "SERVER_PORT", "DATA_DIR", "WEB_DIR"):
        if os.environ.get(key):
            env[key] = os.environ[key]
    return env


def stage(folder: Path, target: Path, manifest: dict):
    target.mkdir(parents=True, exist_ok=True)
    for entry in manifest["documents"] + manifest["recordings"]:
        dest = target / entry["file"]
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(folder / entry["file"], dest)
    (target / "index.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def run(cmd):
    print("$", " ".join(shlex.quote(part) for part in cmd))
    subprocess.run(cmd, check=True)


def upload(staged: Path, env: dict):
    host, user = env.get("SERVER_HOST"), env.get("SERVER_USER")
    if not host or not user:
        sys.exit("缺少 SERVER_HOST / SERVER_USER，请检查项目 .env")
    port = env.get("SERVER_PORT", "22")
    data_dir = env.get("DATA_DIR") or f"{env.get('WEB_DIR', '/var/www/kai-tak-rental')}/data"
    remote_dir = f"{data_dir.rstrip('/')}/{REMOTE_SUBDIR}/"
    target = f"{user}@{host}"
    ssh = ["ssh", "-p", port, target]

    run(ssh + [f"rm -rf {shlex.quote(REMOTE_STAGING)} && mkdir -p {shlex.quote(REMOTE_STAGING)}"])
    run(["rsync", "-a", "-e", f"ssh -p {port}", f"{staged}/", f"{target}:{REMOTE_STAGING}/"])
    run(
        ssh
        + [
            f"sudo mkdir -p {shlex.quote(remote_dir)} && "
            f"sudo rsync -a --delete {RSYNC_CHMOD} {shlex.quote(REMOTE_STAGING)}/ {shlex.quote(remote_dir)} && "
            f"rm -rf {shlex.quote(REMOTE_STAGING)}"
        ]
    )
    domain = env.get("SITE_DOMAIN")
    if domain:
        print(f"\n已发布。打开 https://{domain}/learn/primary 查看（清单：/data/{REMOTE_SUBDIR}/index.json）")


def main():
    parser = argparse.ArgumentParser(description="发布小学英语听写材料")
    parser.add_argument("folder", help="存放听写文档和录音的文件夹")
    parser.add_argument("--dry-run", action="store_true", help="只打印清单，不上传")
    parser.add_argument("--stage-only", metavar="DIR", help="只在本地生成到 DIR（本地预览用，如 public/data/primary-english）")
    parser.add_argument("--env", default=str(REPO_ROOT / ".env"), help="服务器信息所在的 .env，默认项目根目录")
    args = parser.parse_args()

    folder = Path(args.folder).expanduser().resolve()
    if not folder.is_dir():
        sys.exit(f"找不到文件夹：{folder}")

    documents, recordings, skipped = scan(folder)
    manifest = {
        "updated": datetime.now().astimezone().isoformat(timespec="seconds"),
        "documents": documents,
        "recordings": recordings,
    }

    print(f"文档 {len(documents)} 份：")
    for item in documents:
        print(f"  - {item['file']}")
    print(f"录音 {len(recordings)} 段：")
    for item in recordings:
        print(f"  - {item['file']}")
    if skipped:
        print(f"跳过 {len(skipped)} 个不支持的文件（Word 等请先导出为 PDF）：")
        for item in skipped:
            print(f"  - {item}")
    if not documents and not recordings:
        sys.exit("没有可发布的文档或录音")

    if args.dry_run:
        return

    if args.stage_only:
        target = Path(args.stage_only).expanduser().resolve()
        if target.exists():
            shutil.rmtree(target)
        stage(folder, target, manifest)
        print(f"\n已生成到 {target}")
        return

    print("\n注意：发布后任何人都能通过网址访问这些文件。确认其中没有孩子姓名、班级、学号。")
    with tempfile.TemporaryDirectory() as tmp:
        staged = Path(tmp) / REMOTE_SUBDIR
        stage(folder, staged, manifest)
        upload(staged, load_env(Path(args.env)))


if __name__ == "__main__":
    main()
