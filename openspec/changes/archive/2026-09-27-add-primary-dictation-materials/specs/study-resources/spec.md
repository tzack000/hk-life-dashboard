# 规范增量：学习资源（study-resources）— 听写文档与录音

## MODIFIED Requirements

### Requirement: 小学英语板块
系统 SHALL 在 `/learn/primary` 展示小学英语板块，包含「P.2 上学期默书（2026–27）」听写材料区块与免费英语资源列表。

#### Scenario: 打开小学英语
- **WHEN** 用户访问 `/learn/primary`
- **THEN** 页面展示「P.2 上学期默书（2026–27）」区块
- **AND** 页面展示按「自然拼读」「绘本阅读」「学校课程」「剑桥少儿考试」分组的资源链接

## REMOVED Requirements

### Requirement: 默书内容
**Reason**: 学校提供的是听写文档和录音，手写单词表无法承载，改为「听写材料」。
**Migration**: 由「听写材料」需求替代；材料通过 `scripts/publish_primary_dictation.py` 上传到服务器。

## ADDED Requirements

### Requirement: 听写材料
听写材料 SHALL 放在服务器 `/data/primary-english/`，由同目录的 `index.json` 列出练习文档与录音，每项包含标题与相对文件路径，MAY 包含文件大小。材料 SHALL 不进代码仓库。清单读取失败或两类材料都为空时，区块 SHALL 显示「听写材料待上传」。有材料时 SHALL 分「练习文档」「录音」两组展示：文档一次打开一份，PDF 在页内逐页显示，图片直接显示，并提供新窗口打开；每条录音 SHALL 有播放器，开始播放一条时其它录音暂停。

#### Scenario: 材料未上传
- **WHEN** 服务器上没有 `index.json`，用户打开 `/learn/primary`
- **THEN** 听写区块显示「听写材料待上传」

#### Scenario: 查看练习文档
- **WHEN** 清单中有文档，用户打开 `/learn/primary`
- **THEN** 默认显示第一份文档的内容
- **AND** 用户点击另一份文档后，页面改为显示该文档

#### Scenario: 播放录音
- **WHEN** 用户在录音列表中播放一条录音，而另一条正在播放
- **THEN** 新点的录音开始播放，原来那条暂停

### Requirement: 上传听写材料
系统 SHALL 提供脚本 `scripts/publish_primary_dictation.py`，在材料所在电脑上运行：扫描给定文件夹，按扩展名把 PDF、图片归为文档，把常见音频格式归为录音，跳过其它文件并列出；生成 `index.json` 后，用项目 `.env` 的服务器信息把材料连同清单同步到 `$DATA_DIR/primary-english/`，并删除服务器上已不在文件夹里的旧材料。脚本 SHALL 支持只打印清单的 `--dry-run` 和只在本地生成的 `--stage-only <目录>`，并在上传前提醒材料会公开可访问。

#### Scenario: 预览清单
- **WHEN** 家长运行 `python3 scripts/publish_primary_dictation.py <文件夹> --dry-run`
- **THEN** 脚本打印将要发布的文档、录音和被跳过的文件，不上传

#### Scenario: 上传材料
- **WHEN** 家长运行 `python3 scripts/publish_primary_dictation.py <文件夹>`
- **THEN** 服务器 `$DATA_DIR/primary-english/` 与文件夹内容一致，并含新的 `index.json`
- **AND** 刷新 `/learn/primary` 可看到新材料，无需重新部署前端
