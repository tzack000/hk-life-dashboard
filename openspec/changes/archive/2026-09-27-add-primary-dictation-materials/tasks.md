## 1. 数据与读取

- [x] 1.1 `src/data/primary-english.ts`：移除手写单词表，新增听写清单类型、材料根路径与文件地址函数
- [x] 1.2 新增 `src/hooks/use-dictation-materials.ts`：读取 `/data/primary-english/index.json`，失败或为空时视为待上传

## 2. 页面

- [x] 2.1 `ExamPdf` 的加载与报错文字可配置
- [x] 2.2 小学英语听写区块：待上传提示；练习文档切换与页内查看（PDF、图片）；录音列表，播放一条时暂停其它
- [x] 2.3 入口页小学英语卡片按材料数量显示说明

## 3. 上传脚本

- [x] 3.1 新增 `scripts/publish_primary_dictation.py`：扫描、分类、生成清单，支持 `--dry-run`、`--stage-only`，按 `.env` 同步到服务器
- [x] 3.2 `public/data/` 加入 `.gitignore`

## 4. 验证与文档

- [x] 4.1 `npm run build` 通过
- [x] 4.2 用样例材料 `--stage-only public/data/primary-english` 在浏览器检查文档切换、PDF 与图片显示、录音互斥播放、待上传提示，含手机宽度
- [x] 4.3 更新 README、AGENTS.md、CLAUDE.md
