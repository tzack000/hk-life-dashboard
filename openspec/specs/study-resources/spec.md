# 规范：学习资源（study-resources）

> 由 `add-learn-sections` 归档建立，`add-primary-dictation-materials` 更新。描述学习资源入口页、雅思真题与小学英语两个子板块。

## Purpose

学习资源按用途分成雅思真题和小学英语两个板块：雅思在线听音频看 PDF，小学英语放学校的听写文档和录音，以及免费的少儿英语网站。

## Requirements

### Requirement: 学习资源入口页
系统 SHALL 在 `/learn` 展示学习资源入口页，列出「雅思真题」（`/learn/ielts`）与「小学英语」（`/learn/primary`）两个子板块，每个子板块有标题和一句说明。在任一 `/learn` 开头的地址下，顶栏「学习资源」SHALL 处于选中态。

#### Scenario: 打开入口页
- **WHEN** 用户访问 `/learn`
- **THEN** 页面展示「雅思真题」和「小学英语」两个入口
- **AND** 顶栏「学习资源」处于选中态

#### Scenario: 进入子板块
- **WHEN** 用户在入口页点击「小学英语」
- **THEN** 地址变为 `/learn/primary`，页面展示小学英语板块
- **AND** 顶栏「学习资源」仍处于选中态

#### Scenario: 从子板块返回
- **WHEN** 用户在「雅思真题」列表或「小学英语」板块点击返回链接
- **THEN** 地址变为 `/learn`，页面展示入口页

### Requirement: 雅思真题板块
系统 SHALL 在 `/learn/ielts` 展示剑桥雅思 4–21 套题列表，在 `/learn/ielts/N` 展示第 N 套：上方可播放听力，下方直接显示该套 PDF。可用的套题编号 SHALL 以套题数据为准；编号不存在时地址回到 `/` 并展示首页。套题页 SHALL 提供返回「雅思真题」列表的链接。

#### Scenario: 打开套题列表
- **WHEN** 用户访问 `/learn/ielts`
- **THEN** 页面展示剑桥雅思 4–21 套题列表及版权说明

#### Scenario: 打开某一套
- **WHEN** 用户在列表中点击「剑桥雅思 4」
- **THEN** 地址变为 `/learn/ielts/4`
- **AND** 页面上方可播放听力，下方显示该套 PDF

#### Scenario: 从套题页返回
- **WHEN** 用户在套题页点击返回链接
- **THEN** 地址变为 `/learn/ielts`，页面展示套题列表

#### Scenario: 编号不存在
- **WHEN** 用户访问 `/learn/ielts/3`
- **THEN** 地址回到 `/`，页面展示首页

### Requirement: 旧套题地址兼容
系统 SHALL 继续接受旧地址 `/learn/N`（N 为已有套题编号），打开对应套题，并把地址栏改写为 `/learn/ielts/N`，不新增历史记录。访问统计 SHALL 按改写后的地址上报。

#### Scenario: 打开旧地址
- **WHEN** 用户直接访问 `/learn/4`
- **THEN** 页面展示剑桥雅思 4 套题页
- **AND** 地址栏变为 `/learn/ielts/4`

#### Scenario: 旧地址编号不存在
- **WHEN** 用户访问 `/learn/22`
- **THEN** 地址回到 `/`，页面展示首页

### Requirement: 小学英语板块
系统 SHALL 在 `/learn/primary` 展示小学英语板块，包含「P.2 上学期默书（2026–27）」听写材料区块与免费英语资源列表。

#### Scenario: 打开小学英语
- **WHEN** 用户访问 `/learn/primary`
- **THEN** 页面展示「P.2 上学期默书（2026–27）」区块
- **AND** 页面展示按「自然拼读」「绘本阅读」「学校课程」「剑桥少儿考试」分组的资源链接

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

### Requirement: 少儿英语资源链接
资源列表 SHALL 只收录官方或机构自有网站的免费栏目，不链接盗版或有版权的文件。每条资源 SHALL 有名称与一句中文说明，链接在新窗口打开。

#### Scenario: 打开资源
- **WHEN** 用户点击任一资源链接
- **THEN** 链接在新窗口打开对应官方网站
