## Context

站点用 History API 自己做路由（`src/lib/routes.ts`），不依赖 react-router。`RouteState` 为 `{ path, exam }`，`/learn/4` 到 `/learn/21` 解析成 `path: /learn` 加 `exam`。`readRoute` 会把非规范地址用 `replaceState` 改写成 `routeUrl(state)`，访问统计也按规范地址上报。学习资源页由 `App.tsx` 按路径挂载，离开即卸载。

## Goals / Non-Goals

**Goals:**

- `/learn` 成为入口页，两个子板块各有可收藏的地址。
- 旧的 `/learn/N` 链接不失效。
- 小学英语的默书内容由数据模块驱动，拿到默书表后只改数据文件。

**Non-Goals:**

- 不改雅思套题页的播放和 PDF 阅读逻辑。
- 不在仓库里放任何有版权的教材文件，资源只放官方网站链接。
- 本次不导入具体默书单词（原件不在当前环境）。

## Decisions

### 路由状态增加 `learn` 子板块

`RouteState` 改为 `{ path, learn, exam }`，`learn` 为 `'ielts' | 'primary' | null`。

| 地址 | 状态 |
|------|------|
| `/learn` | `learn: null` |
| `/learn/ielts` | `learn: 'ielts', exam: null` |
| `/learn/ielts/N` | `learn: 'ielts', exam: N` |
| `/learn/primary` | `learn: 'primary'` |
| `/learn/N`（旧） | 同 `/learn/ielts/N` |

`path` 在这些地址下都仍是 `/learn`，顶栏「学习资源」的选中逻辑不用改。旧地址解析后 `routeUrl` 得到 `/learn/ielts/N`，与原地址不同，`readRoute` 自动 `replaceState`，不需要额外的重定向代码。

套题编号不再在路由里写死 4–21，改为查 `EXAM_SETS`。以后加一套真题只改数据文件。编号不存在时仍回到首页，与现在行为一致。

### 页面拆分

- `StudyResources` 按 `learn` 分发：入口页 `LearnHub`、雅思列表 `ExamList`、套题页 `ExamDetail`、小学英语 `PrimaryEnglish`。
- 返回链接：套题页 →「雅思真题」列表；两个子板块 →「学习资源」入口页。
- 小学英语放在单独的 `PrimaryEnglish.tsx`，避免 `StudyResources.tsx` 继续变长。

### 默书数据模块

`src/data/primary-english.ts` 导出 `DICTATION_TERM`：

```ts
type DictationWord = { en: string; zh?: string };
type Dictation = {
  no: number;          // 第几次默书
  date?: string;       // YYYY-MM-DD
  unit?: string;       // 单元或课题
  words: DictationWord[];
  sentences?: string[];
};
type DictationTerm = {
  title: string;       // P.2 上学期默书（2026–27）
  pendingNote: string; // 默书表待导入
  dictations: Dictation[];
};
```

`dictations` 为空时页面显示 `pendingNote` 和导入说明；有数据时每次默书一张卡片，列出单词与句子。单词可点「读」用浏览器自带的英式朗读（Web Speech API），并有「遮住单词」开关，方便家里听写。浏览器不支持朗读时不显示按钮。

数据只写单词与句子，不写孩子姓名、班级、学号。

### 资源链接

同一模块导出 `PRIMARY_RESOURCE_GROUPS`，四组共 8 条，均为官方或机构自有站点，新窗口打开（`target="_blank" rel="noreferrer"`）：

- 自然拼读：Starfall、PhonicsPlay
- 绘本阅读：Oxford Owl 免费电子书、Storyline Online
- 学校课程：教育局英国语文教育、BBC Bitesize KS1 English
- 剑桥少儿考试：Pre A1 Starters（附免费备考材料链接）、Cambridge English 家长与孩子

## Risks / Trade-offs

- [外部网站改版导致链接失效] → 只收录官方首页或栏目页，不链具体文件。
- [部分网站有付费内容，如 Starfall 完整版、PhonicsPlay 部分游戏] → 说明里写明「部分免费」。
- [旧地址被外部收藏] → 通过 `replaceState` 改写，统计只记新地址。
