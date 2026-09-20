# 7 天学生成长世界 · Phase 0 Prototype

验证一个核心闭环：

```text
选择现实目标 → 完成目标 → 获得成长能量 → 宠物 / 植物 / 世界发生变化
→ 产生期待 → 第二天主动回来
```

Phase 0 **不做**：登录注册、后端、AI、社交、排行榜、商城、金币、付费、老师端、家长后台。
所有数据保存在 `localStorage`。

---

## 快速开始

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

> 请使用 `localhost` 而不是 `127.0.0.1` 打开，否则 Next 16 会拦截 dev 资源。
> 已在 `next.config.ts` 中通过 `allowedDevOrigins` 放行这两个 host。

### 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 开发服务器 |
| `pnpm build` / `pnpm start` | 生产构建 / 启动 |
| `pnpm format` | Biome 格式化并写回 |
| `pnpm format:check` | 只检查格式（CI 用） |
| `pnpm check` | 格式化 + 整理 import |
| `pnpm check:ci` | 只检查，不写回 |
| `pnpm test` | Vitest 单元测试（domain + store，103 个） |
| `pnpm e2e` | Playwright 端到端测试（11 个，含完整 7 天流程） |
| `pnpm typecheck` | TypeScript 检查 |
| `pnpm lint` | ESLint |
| `pnpm verify` | check:ci + typecheck + lint + test + build |

### 代码格式

格式化用 **Biome**，lint 用 **ESLint** —— 两者职责不重叠：

- `biome.json` 里 `linter.enabled: false`，避免同一问题被两个工具重复报错
  （`eslint-config-next` 已覆盖 Next/React 规则）。
- Biome 负责：格式化 + 整理 import（assist）。
- 缩进 2 空格、双引号、分号、行宽 90，与现有代码风格一致。
- `globals.css` 需要 `css.parser.tailwindDirectives: true` 才能解析 Tailwind v4 的
  `@import "tailwindcss"` / `@theme`。
- `.vscode/settings.json` 已把 Biome 设为默认 formatter 并开启保存时格式化。

> ⚠️ 改完代码请跑 **`pnpm check`**，不要只跑 `pnpm format`。
> `format` 只做格式化，**不会**整理 import，而 `pnpm verify` / `check:ci` 会检查
> import 顺序 —— 只跑 `format` 依然会失败。稳妥做法是直接 `pnpm verify`。

---

## 页面

仅 6 个核心页面，底部导航 4 个入口。

| Route | 页面 | 说明 |
| --- | --- | --- |
| `/` | 我的世界 | 最重要：世界场景 + 今日成长 + 下一步期待 |
| `/goals` | 今日成长 | 5 选 3 预设目标 → 任务列表 → 完成确认 |
| `/pet` | 我的伙伴 | 宠物状态、命名、最近发生、下一次成长 |
| `/plant` | 成长植物 | 阶段、成长记录、距下一次成长 |
| `/history` | 成长轨迹 | 7 天故事时间线（无排名） |
| `/reward` | 完成反馈 | 实现为全屏 Overlay，不是独立路由 |
| `/debug/export` | 实验数据导出 | JSON 下载（AC5） |

「成长轨迹」从首页 / 成长页进入。

---

## 目录结构

```text
src/
├── app/                     # 路由（全部为 client component，数据来自 localStorage）
│   ├── page.tsx             # 我的世界
│   ├── goals/ pet/ plant/ history/
│   └── debug/export/        # 实验数据导出
├── components/
│   ├── AppShell.tsx         # 唯一的 client shell：hydration + 所有全屏时刻
│   ├── world/               # WorldScene + sprites（纯 SVG 分层）
│   ├── ui/
│   │   ├── icons.tsx        # 自绘 SVG 图标集
│   │   ├── Skeletons.tsx    # 首屏骨架（按路由）
│   │   └── primitives.tsx   # Card / Button / ProgressBar / Chip
│   ├── growth/ reward/ onboarding/ navigation/ debug/
├── domain/                  # 纯函数，无 React / 浏览器依赖
│   ├── growth.ts pet.ts plant.ts world.ts milestone.ts reward.ts types.ts
├── data/                    # goals.ts（5 个预设目标）days.ts（Day1–7 剧本）
├── store/                   # Zustand + persist + 派生 hooks
└── analytics/
    ├── events.ts            # 事件构造与上限
    ├── persistence.ts       # 独立 key + 去抖写入
    └── export.ts            # 实验 JSON 组装
```

**状态计算原则（spec §17）**：所有阈值逻辑集中在 `domain/`，页面只调用
`getGrowthState(day, totalEnergy, todayEnergy)` 等函数，不散落判断。

> 改代码前建议先看 [`AGENTS.md`](AGENTS.md)：里面记录了架构约束和几个容易踩的坑
> （zustand v5 的 selector 稳定性、CSS transform 会覆盖 SVG transform、
> localStorage 必须包 try/catch 等）。

---

## 关键设计

### Day Gate

宠物 / 植物的**视觉大事件**由「能量阈值」和「当天上限」共同决定，取两者中较弱的一个：

| Day | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pet（上限） | wiggling_egg | cracked_egg | baby | baby | young | young | evolved |
| Plant（上限） | sprout | leaf | young_plant | young_plant | bud | tree | bloom |

没有 Day Gate，高完成度学生第一天就会看完整个故事，实验也就无法测量
「第二天是否还会回来」。

**Day 7 额外需要当天行动**：即使带着 180 能量进入 Day 7，也需要完成当天一个目标，
三个事件（开花 → 进化 → 开门）才会播放 —— 对应 spec §11「完成最终任务后」。

### 世界场景

纯 SVG 分层，无 Canvas（spec §3）：

```text
Background → Sky → Sun → Clouds → Ground → NewArea → Rock → Flowers
→ Plant → Pet → Butterfly → MysteryGate
```

Day 7 时相机左移 80px，露出右侧新区域（小溪、小屋、山丘）——
「地图变大了」这一下是真实可感的。

> 注意：CSS `transform` 会覆盖 SVG 的 `transform` 属性。
> 因此**定位**在父 `<g transform="translate(...)">`，
> **动画**在子 `<g className="anim-*">`，两者不能写在同一个元素上。
> `e2e` 中有专门的回归测试守护这一点。

### 原则（spec §1）

- **P1 Growth > Points**：第一反馈是世界变化，数值只作辅助。
- **P2 每天世界必须变化**：花 / 蝴蝶 / 神秘门都是按天解锁，不依赖完成任务。
- **P3 永远有下一步**：`getNextMilestone()` 对任意状态都返回可执行的下一步（AC3，有测试覆盖）。
- **P4 Student-first**：文案测试断言不出现「作业 / 失败 / 没完成 / 检查 / 处罚」等词。
- **P5 不制造失败焦虑**：不完成不会枯萎、不会生病，第二天继续即可。

### 主动性测量（spec §15）

每天第一次完成任务后，在 Reward 第 4 段出现一次极轻量的二选一：

```text
今天是谁先想到打开成长岛的？ [ 我自己想起来的 ] [ 有人提醒我的 ]
```

记录为 `initiative: "self" | "prompted"`，Day 4 也会保留。

---

## 测试模式

真实等待 7 天太低效，因此提供隐藏 Debug Panel：

```text
http://localhost:3000/?debug=1
```

包含 Current Day `[-] Day N [+]`、Energy `[-10] [+10]`、
`Trigger Reward`、`Trigger Day7 Event`、`Download Data`、`Reset Prototype`。
正式实验时不带 `?debug=1` 即可完全隐藏。

---

## Analytics（P0-EXP-01）

分析系统用 **PostHog**，不做自建 dashboard —— Phase 0 要的是答案，不是工程。

### 配置

```bash
cp .env.example .env.local
# 填入 NEXT_PUBLIC_POSTHOG_KEY（PostHog 项目的 project API key）
```

**事件走同源反向代理，不直连 PostHog。** `next.config.ts` 把 `/ingest/*`
rewrite 到 PostHog（US/EU 都按 `NEXT_PUBLIC_POSTHOG_HOST` 推导）。
这是 PostHog 官方 Next.js 指南里专门的一节：uBlock 这类拦截器内置了
`posthog.com` 规则，直连会被静默丢掉 —— 那意味着跑在装了拦截器的家庭设备上时，
实验数据会**悄悄变成零**。走自己的域名就没这个问题。

**不配置也能跑**：所有 tracker 变成 no-op，应用完全正常，本地事件日志照常记录，
`/debug/export` 依然可导出。这样开发和 e2e 不需要任何 PostHog 账号。

### 架构：业务层不直接调用 PostHog

```text
src/analytics/
├── participant.ts   # 匿名 UUID（本地持久化）
├── properties.ts    # 公共属性 + EXPERIMENT_VERSION
├── client.ts        # 唯一投递事件的地方
├── track.ts         # 业务层唯一入口：trackGoalCompleted({...})
├── events.ts        # 本地事件日志
└── export.ts        # 离线 JSON 导出
```

业务代码只写 `trackGoalCompleted({ goalType: 'reading', day: 3 })`，
组件里**不允许**出现任何 PostHog 调用。以后换自建分析或加数仓，只改 `client.ts`。

> **没有用 posthog-js。** 实测该 SDK（1.434.2）在**静态页面 + 官方预编译包 +
> 最小配置 `{ api_host }`** 的情况下：能 init、能拉到 remote config、`capture()`
> 正常返回，但**从不发出事件**（无 `/e/`、无 `/batch/`，`__request_queue` 始终为 0）。
> 同一浏览器 `fetch` POST 到 PostHog 文档中的 `/batch/` 返回 200 且事件确实到达。
> 既然 autocapture / session replay / feature flags / surveys 我们本来就全部关闭、
> 事件表也是固定的 14 个，直接走 HTTP capture API 更简单、可验证，也少一个 50 KB 依赖。
> 投递失败不会影响应用（`fetch` 的 rejection 被吞掉）。

### 身份：匿名 participant UUID

首次进入生成 `crypto.randomUUID()` 并持久化到 `growth-world-participant-v1`
（独立 key，所以 Reset 不会换人），随后 `posthog.identify(participantId, { experiment_version })`。

> **绝不 identify 真实身份。** 目标用户是 8–12 岁儿童，数据最小化从现在就要坚持：
> 不要 email、手机号、真实姓名、学校。`identify()` 只接受那个 UUID。
> `.env.example` 里也写明了不要加任何存放真实身份的变量。

### 事件 Schema：14 个，只回答 6 个问题

| Event | 关键属性 |
| --- | --- |
| `experiment_started` | `pet_species`, `world_name_set` |
| `session_started` | — （配合 `experiment_day` 就是留存信号） |
| `world_viewed` / `pet_viewed` / `plant_viewed` / `history_viewed` | `pet_state` / `plant_state` |
| `goal_selected` | `goal_type` |
| `goal_completed` | `goal_type`, `energy_earned`, `pet_state`, `plant_state`, `total_energy` |
| `reward_viewed` | `goal_type`, `is_major`, `reward_target` |
| `initiative_answered` | `initiative: 'self' \| 'prompted'` |
| `milestone_viewed` | `milestone_id` |
| `day_completed` | `goals_completed`, `energy_earned` |
| `day7_completed` | `total_energy` |
| `continue_requested` | `total_energy` |

**所有事件**都自动带公共属性：

```json
{
  "experiment_version": "phase0-v1",
  "experiment_day": 3,
  "$lib": "web",
  "$pathname": "/pet",
  "$current_url": "https://growth.linonward.com/pet"
}
```

`$lib` / `$current_url` / `$pathname` 是 SDK 本来会自动加的上下文（HTTP 方式要自己带），
否则 PostHog 的 Library 和 URL/Screen 两列会是空的。
**`$current_url` 只拼 origin + pathname**，不带 query 和 hash —— 见上面的隐私说明。

这是在 `createEvent()` 里统一合并的，不是每个调用点各写一遍 ——
结构上不可能漏。

### 两条设计纪律

**① 属性优先于事件数量。** 不要 `reading_completed` / `study_completed` /
`exercise_completed` 三个事件，而是 `goal_completed` + `goal_type`。
同理 initiative 不要两个事件，而是 `initiative_answered` + `initiative`。

**② 不要每个按钮埋一个点。** 事件列表是假设驱动的，只回答上面那 6 个问题。
需要新维度时优先扩展已有事件的属性。

### 在 PostHog 里建四个视图（AC ⑩）

**1. Growth Loop Funnel** —— 核心闭环转化

```text
experiment_started → goal_selected → goal_completed → reward_viewed → world_viewed
```

如果 `goal_selected → goal_completed` 掉得厉害，要研究的是
「为什么现实行为没有发生」，而不是去优化 Reward 动画。

**2. Retention（D1–D7）** —— 比 Funnel 更重要

用 `session_started` 做 retention，按 `experiment_day` 看。
重点盯 **Day 3 → Day 4**：前三天新鲜感很强，真正的危险是 novelty cliff。

**3. SAAR（North Star）** —— 自主发起率

对 `initiative_answered` 按 `initiative` 做 breakdown：

```text
self / (self + prompted)
```

Phase 0 投资阈值暂定 **≥ 40%**。这是实验决策线，不是行业 benchmark。

**4. Day 7 Continue Funnel** —— 需求信号

```text
day7_completed → continue_requested
```

### 隐私

| | |
| --- | --- |
| Product Analytics | ✅ |
| Anonymous ID | ✅ |
| Funnels / Retention | ✅ |
| Session Replay | ❌ 不引入（SDK 都没装，无从开启） |
| Autocapture | ❌ 不存在：只发上面那 14 个事件 |
| 真实身份 / 个人数据 | ❌ 不采集 |
| URL | ⚠️ **只发路径**（`/pet`），**不发 query / hash** —— 这样 PostHog 的 Screen 列可用，而 `?debug=1` 之类永远不出设备 |
| referrer / 来源域名 | ❌ 从不发送 |
| 请求目标 | 只发到自己的域名 `/ingest/*`，浏览器端不出现 `posthog.com` |

Session Replay 对调试很诱人，但面对 8–12 岁儿童不能顺手打开 ——
真要开，得先单独处理监护人同意、采集范围、输入遮罩、数据保留与合规。

### 离线兜底

事件同时在本地记一份，`/debug/export` 或 `Download Experiment Data` 可导出 JSON，
其中 `participantId` 与 PostHog 收到的是同一个 UUID。没有网络 / 没配 key 时
依然能拿到完整数据。

---

## 验收标准对照（spec §27）

| AC | 状态 |
| --- | --- |
| AC1 10 岁学生不看教程也能理解怎么让世界继续成长 | 首页常驻 Next Milestone + 单一 CTA |
| AC2 完成目标 5 秒内得到视觉反馈 | Reward 4 段流程，首段 900ms |
| AC3 首页永远能回答「下一步做什么」 | `getNextMilestone()` 穷举测试覆盖 |
| AC4 Day1 ≠ Day3 ≠ Day7 | 见 `docs/screens/`，并有 E2E 场景位置回归 |
| AC5 能准确收集 5 项实验数据 | `/debug/export` + `buildExportPayload()` |

### 画面差异

| Day 1 | Day 3 | Day 7 |
| --- | --- | --- |
| ![Day 1](docs/screens/day-1.png) | ![Day 3](docs/screens/day-3.png) | ![Day 7](docs/screens/day-7.png) |

Day 6 是刻意的 anticipation 实验：小门出现，但当天无论完成多少任务都不会打开。

| 今日成长 | 我的伙伴 | 成长轨迹 |
| --- | --- | --- |
| ![今日成长](docs/screens/goals.png) | ![我的伙伴](docs/screens/pet.png) | ![成长轨迹](docs/screens/history.png) |

---

## 视觉系统

方向来自 spec §20：**warm · calm · soft · nature · storybook · cozy**。

- **设计 token 集中在 `globals.css`**：排版层级（`.t-display` / `.t-title` /
  `.t-headline` / `.t-body` / `.t-caption` / `.t-label`，行高按中文调过）、暖色分层阴影
  （`--shadow-soft` / `--shadow-lift`）、表面（`.card` / `.card-warm` / `.card-hero`）、
  按钮（`.btn-primary` / `.btn-ghost`）。
- **图标是自绘 SVG**（`src/components/ui/icons.tsx`），不用 emoji 做 UI 装饰。
  四个 emoji 各自带着不同的字重、尺寸和配色，永远拼不成一套系统；自绘图标共用一套
  描边并继承 `currentColor`，所以选中态能把整个字形染成品牌绿。
- **emoji 只作为叙事内容保留**（🥚→🐣、🌱→🌳），并统一包在 `EmojiChip` 的圆形底色里，
  这样它们看起来是有意为之而不是贴上来的。
- **模板图标**由 `CATEGORY_ICON` 映射到五个类别图标，每个类别一个色调。

---

## 性能

两处实测优化（都是按 vercel-react-best-practices 审查后做的）：

### 1. analytics 与游戏状态分开存储

事件日志原本是 store 的一个字段，zustand 每次 `set()` 都会把整个数组重新序列化 ——
实测占每次写入的 **84%**，而且会随着一周的使用持续变大。

现在日志写在独立的 key（`growth-world-analytics-v1`），并且：

- 写操作去抖（800ms）+ 在 `pagehide` / `visibilitychange` 时同步 flush
- `visibilitychange` 是为了覆盖移动端 Safari（它经常不触发 `pagehide`）
- 所有 localStorage 访问都包了 try/catch —— 无痕模式和配额超限都会抛异常，
  埋点绝不能因此弄挂应用

单日完整流程实测：

| | 优化前 | 优化后 |
| --- | --- | --- |
| 总写入量 | 32.8 KB | **10.7 KB** |
| 游戏状态单次写入 | 4624 B | **724 B** |
| 31 个事件的写入次数 | ~31 次 | **2 次** |

> `resetPrototype` 会**保留**日志并追加一条 `prototype_reset` —— Debug 按钮很容易误触，
> 丢掉已收集的数据比多留几天历史更糟。

### 2. 首屏渲染真实骨架

所有内容都来自 localStorage，服务端拿不到数据，所以首屏本来是
「🌱 正在打开你的世界…」一个居中 spinner。

现在 `RouteSkeleton` 会按当前路由渲染**布局一致的骨架**（骨架块尺寸对齐真实元素，
所以数据到达时不会跳动），底部导航也从第一帧就在，且选中态正确。
第一次访问的学生看不到这些 —— 它被不透明的欢迎页盖住了。

| | 优化前 | 优化后 |
| --- | --- | --- |
| 首屏 HTML | 8.5 KB（只有 spinner） | **~13 KB（按路由的真实骨架）** |
| 首屏 JS | 509 KB | 523 KB（+14 KB 骨架代码） |

---

## 部署

线上地址：**https://growth.linonward.com**（Vercel，`linonward/growth` 项目）

```bash
vercel deploy --prod --scope linonward   # 生产
vercel deploy --scope linonward          # 预览
```

`.vercelignore` 是必须的：没有它 CLI 会把本地的 `.next` 一起上传，那是几百 MB。

**目前没有接 Git 自动部署** —— Vercel 账号是 `linonward2026`，而仓库在 `linonward`
名下，Vercel 没有对应的 GitHub App 权限，`vercel git connect` 会失败。
在 Vercel 控制台 → Settings → Git 连一次即可，在那之前每次都要手动 deploy。

> 因为部署走的是**本地目录**而不是远程仓库，线上会比 `origin/main` 新 ——
> 记得及时 push，否则 GitHub 和线上会不一致。

---

## 技术栈

Next.js 16（App Router / Turbopack）· TypeScript · Tailwind CSS 4 ·
Framer Motion · Zustand（persist → localStorage）· Vitest · Playwright

无数据库、无 API、无鉴权。

两个值得注意的点：

- **Framer Motion 是懒加载的**，只在四个全屏 overlay 分块里，首屏不加载它
  （省 146 KB）。世界场景的 Day 7 推镜用的是 CSS transition。
- **所有页面都是 client component**，因为数据全部来自 localStorage，服务端没有
  可渲染的内容。首屏是「按路由的骨架 + 导航」，不是真实数据 —— 详见
  [`AGENTS.md`](AGENTS.md)。

---

## Phase 0 之后

代码结构允许后续扩展 Pet System / Plant System / World Building / Growth Graph /
Goal System / Family / AI / Long-term Progression，但 Phase 0 只证明一件事：

> **孩子不是因为 App 要求他打卡而回来，而是因为他想看看「自己的世界接下来会变成什么样」。**
