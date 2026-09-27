## Why

「学习资源」现在只有剑桥雅思 4–21 一种内容，`/learn` 打开就是套题列表。孩子读小二，学校每学期发英文默书表，家里也想把适合小学生的免费英语资源放在一起，需要在学习资源下分出板块。

## What Changes

- `/learn` 改为学习资源入口页，列出两个子板块：「雅思真题」和「小学英语」。
- 雅思真题搬到 `/learn/ielts`，单套真题为 `/learn/ielts/4` … `/learn/ielts/21`，页面内容不变。
- 旧链接 `/learn/4` … `/learn/21` 继续可用，打开后地址改写为 `/learn/ielts/N`。
- 新增「小学英语」板块 `/learn/primary`：
  - 「P.2 上学期默书（2026–27）」区块，内容来自数据模块；默书表未导入时显示「默书表待导入」。
  - 一组免费、官方的少儿英语资源链接，按自然拼读、绘本阅读、学校课程、剑桥少儿考试分组，新窗口打开。
- 首页「学习资源」卡片说明改为「雅思真题 · 小学英语」。

## Capabilities

### New Capabilities

- `study-resources`: 学习资源入口页、雅思真题板块（含旧地址改写）、小学英语板块（默书与资源链接）

### Modified Capabilities

- `site-home`: 「从首页进入子页面」中进入学习资源的场景改为展示学习资源入口页

## Impact

- `src/lib/routes.ts`、`src/hooks/use-route.ts`：路由状态增加学习资源子板块
- `src/sections/StudyResources.tsx`：拆出入口页、雅思列表与套题页的返回链接
- 新增 `src/sections/PrimaryEnglish.tsx`、`src/data/primary-english.ts`
- `src/sections/HomePage.tsx`：学习资源卡片说明
- Nginx 已有 `try_files` 回退，新路径无需改服务器配置
- 默书原件在用户本机，本次不导入具体单词
