## Context

听写材料是学校的文档和录音，原件在家长电脑上。站点是公开的，仓库也可能公开，材料不适合进 Git。现有 `data` 目录专门放服务器上生成、部署时不能被覆盖的文件（`transactions.json`），Nginx 已有 `/data/` 规则。

## Goals / Non-Goals

**Goals:**
- 家长把一个文件夹交给脚本，就能在 `/learn/primary` 看到文档、听到录音
- 换一批材料不需要重新构建和部署前端

**Non-Goals:**
- 不做登录或访问控制
- 不解析文档内容，不自动把文档和录音配对
- 不支持 Word 等浏览器不能直接显示的格式（脚本提示先导出为 PDF）

## Decisions

### 材料放在 `$DATA_DIR/primary-english/`，用 `index.json` 描述

```json
{
  "updated": "2026-09-27T10:00:00+08:00",
  "documents": [{ "title": "2627 P.2 T1 Dictation", "file": "2627 P.2 T1 Dictation.pdf", "size": 123456 }],
  "recordings": [{ "title": "Dictation 1", "file": "audio/Dictation 1.m4a", "size": 234567 }]
}
```

`file` 是相对 `/data/primary-english/` 的路径，前端逐段 `encodeURIComponent` 后拼成地址。**考虑过的替代方案**：把文件放进 `public/` 随前端构建发布——材料会进仓库、每次换材料都要重新部署，否决。

### 文档与录音分两组列出，不强行配对

学校材料的命名没有固定规律（可能一份总表配多段录音）。按类型分组，每组按文件路径自然排序，最稳妥。文档一次打开一份：PDF 用现有 pdf.js 阅读器，图片直接显示。录音列成列表，每条一个播放器，开始播放一条时暂停其它。

### 上传脚本在材料所在的电脑上运行

`scripts/publish_primary_dictation.py <文件夹>`：
1. 递归扫描，文档收 `.pdf .jpg .jpeg .png .webp`，录音收 `.mp3 .m4a .aac .wav .ogg`，其它文件列出并跳过
2. 复制到临时目录并写入 `index.json`
3. 读取项目 `.env` 的 `SERVER_HOST / SERVER_USER / SERVER_PORT / DATA_DIR`，rsync 到服务器临时目录，再 `sudo rsync --delete --chmod=…` 到 `$DATA_DIR/primary-english/`

另有 `--dry-run`（只打印清单）和 `--stage-only <目录>`（只在本地生成，用于本地预览和测试）。

## Risks / Trade-offs

- [材料公开可访问] → 页面和脚本都提示：上传前确认文档里没有孩子姓名、班级、学号；文件名也不要带这些信息
- [清单缺失或格式不对] → 前端当作「待上传」处理，不报错
- [本地开发没有服务器数据] → 用 `--stage-only public/data/primary-english` 预览；`public/data/` 加入 `.gitignore`
