## Why

学校发下来的是听写练习文档和老师录音，不是整理好的单词表。小学英语板块目前只能在前端数据里手写单词，孩子真正要用的文档和录音放不上去。

## What Changes

- 「P.2 上学期默书（2026–27）」区块改为展示听写材料：练习文档（PDF 或图片）在页内查看，录音直接播放。
- 材料不入库，放在服务器 `$DATA_DIR/primary-english/`，由同目录的 `index.json` 描述；前端读取这份清单，读不到时显示「听写材料待上传」。
- 新增脚本 `scripts/publish_primary_dictation.py`：在存有材料的电脑上运行，扫描文件夹、生成清单并上传到服务器。
- 移除手写单词表（遮住单词、逐词朗读）及其数据结构。
- 入口页小学英语卡片的说明按材料数量显示。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `study-resources`：「小学英语板块」改为听写材料加资源链接；「默书内容」由手写单词表改为服务器上的文档与录音。

## Impact

- 前端：`src/data/primary-english.ts`、`src/sections/PrimaryEnglish.tsx`、`src/sections/StudyResources.tsx`、`src/sections/ExamPdf.tsx`（提示文字可配置）、新增 `src/hooks/use-dictation-materials.ts`
- 脚本：新增 `scripts/publish_primary_dictation.py`
- 服务器：新增目录 `$DATA_DIR/primary-english/`。它在 `data` 下，前端部署的 rsync 已排除 `data`，不会被删；Nginx 现有 `/data/` 规则即可提供文件，无需改配置
- 文档：README、AGENTS.md、CLAUDE.md
