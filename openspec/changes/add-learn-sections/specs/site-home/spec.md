## MODIFIED Requirements

### Requirement: 从首页进入子页面
系统 SHALL 让首页的入口分别打开对应子页面，并更新地址栏。

#### Scenario: 进入家庭日程
- **WHEN** 用户在首页点击「家庭日程」
- **THEN** 地址变为 `/family`
- **AND** 页面展示家庭日程，不再展示首页入口

#### Scenario: 进入近期行程
- **WHEN** 用户在首页点击「近期行程」
- **THEN** 地址变为 `/trip`
- **AND** 页面展示近期行程

#### Scenario: 进入房产看板
- **WHEN** 用户在首页点击「房产看板」
- **THEN** 地址变为 `/property`
- **AND** 页面展示房产看板

#### Scenario: 进入学习资源
- **WHEN** 用户在首页点击「学习资源」
- **THEN** 地址变为 `/learn`
- **AND** 页面展示学习资源入口页，列出「雅思真题」与「小学英语」两个子板块
- **AND** 首页卡片说明为「雅思真题 · 小学英语」
