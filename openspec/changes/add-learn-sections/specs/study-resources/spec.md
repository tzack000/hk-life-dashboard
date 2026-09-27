## ADDED Requirements

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
系统 SHALL 在 `/learn/primary` 展示小学英语板块，包含「P.2 上学期默书（2026–27）」区块与免费英语资源列表。

#### Scenario: 打开小学英语
- **WHEN** 用户访问 `/learn/primary`
- **THEN** 页面展示「P.2 上学期默书（2026–27）」区块
- **AND** 页面展示按「自然拼读」「绘本阅读」「学校课程」「剑桥少儿考试」分组的资源链接

### Requirement: 默书内容
默书内容 SHALL 来自前端数据模块，每次默书包含序号、单词列表，并 MAY 包含日期、单元与句子；单词 MAY 带中文释义。数据 SHALL 不包含孩子姓名、班级或学号。默书列表为空时 SHALL 显示「默书表待导入」。有数据时 SHALL 按默书序号逐次展示，并提供遮住单词的开关；浏览器支持语音合成时，每个单词 SHALL 可点击朗读。

#### Scenario: 默书表未导入
- **WHEN** 数据模块中默书列表为空，用户打开 `/learn/primary`
- **THEN** 默书区块显示「默书表待导入」

#### Scenario: 默书表已导入
- **WHEN** 数据模块中有默书，用户打开 `/learn/primary`
- **THEN** 每次默书单独展示序号、日期（如有）、单词和句子（如有）

#### Scenario: 遮住单词练听写
- **WHEN** 用户打开「遮住单词」开关
- **THEN** 单词拼写被隐藏，中文释义与朗读按钮仍可用

### Requirement: 少儿英语资源链接
资源列表 SHALL 只收录官方或机构自有网站的免费栏目，不链接盗版或有版权的文件。每条资源 SHALL 有名称与一句中文说明，链接在新窗口打开。

#### Scenario: 打开资源
- **WHEN** 用户点击任一资源链接
- **THEN** 链接在新窗口打开对应官方网站
