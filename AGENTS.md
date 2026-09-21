<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

> 上面那段 `nextjs-agent-rules` 由 `next dev` / `next build` 自动维护，
> **不要翻译也不要删改** —— 与 Next.js 内置模板不一致时它会被重新写入。
> 这一段之后的内容可以自由编辑。

# 项目说明

这是「7 天学生成长世界」的 Phase 0 原型，面向 8–12 岁学生。
它只验证一件事，其余一律不做：

> **孩子回来，是因为他想看看自己的世界接下来会变成什么样，而不是因为 App 催他打卡。**

明确不做（spec §0）：登录注册、后端、AI、社交、排行榜、商城、金币、付费、
老师端、家长后台、多宠物、多地图。持久化只用 `localStorage`。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 开发服务器（:3000） |
| `pnpm verify` | CI 跑的全部检查 —— 收工前先跑这个 |
| `pnpm check` | Biome 格式化 **+ 整理 import** |
| `pnpm format` | **只**格式化 —— 见下面的坑 |
| `pnpm test` / `pnpm e2e` | Vitest 单测 / Playwright 端到端 |
| `pnpm typecheck` / `pnpm lint` | tsc / ESLint |

**开发服务器要用 `localhost` 打开，不要用 `127.0.0.1`。**
Next 16 会拦截不在 `allowedDevOrigins` 里的来源，页面会服务端渲染出来但永远不 hydration，
看起来就是卡在启动页。

**改完代码跑 `pnpm check`，不要只跑 `pnpm format`。**
只有 `check` 会执行 Biome 的 organize-imports assist；手改的文件可能格式没问题，
却依然过不了 `pnpm check:ci`（`pnpm verify` 跑的就是它）。

**`next dev` 运行时不要 `rm -rf .next`。**
这会毁掉 Turbopack 的 dev 产物，服务器会开始返回 500，直到重启才恢复。

## 架构

- **`src/domain/` 是所有阈值的唯一出处。** 纯函数，不依赖 React 和浏览器。
  页面和组件必须调用 `getGrowthState()` / `getPetState()` / `getNextMilestone()`，
  不要自己重写判断条件（spec §17）。domain 层有完整单测。
- **`src/store/`** 是 Zustand + `persist`。派生值通过 `store/hooks.ts` 里的
  memo 化 hook 暴露。
- **`src/components/AppShell.tsx`** 是唯一的 client shell，负责 hydration、
  首屏骨架，以及所有全屏时刻（首次进入、跨天欢迎、Reward、Day 7 终章、Debug 面板）。
  各个页面只负责展示。
- **`src/analytics/`** 是分析层：`participant.ts`（匿名身份）、
  `properties.ts`（公共属性）、`client.ts`（唯一投递事件的地方）、
  `track.ts`（业务层唯一入口）、`events.ts` + `export.ts`（本地日志与导出）。
  事件日志写在**独立的 storage key** 里，绝不放进持久化的游戏状态 ——
  原因见「存储」一节，规则见「Analytics 的硬性约束」。

### Day Gate 是承重结构，不要拆

每个视觉里程碑都取「能量达到了」和「今天允许到哪」两者中**较弱**的一个。
没有 Day Gate，高完成度的孩子第一天就会看完整个故事，实验也就无法测量
「第二天是否还会回来」。

Day 7 还额外要求**当天有行动**：这样三个事件（开花 → 进化 → 开门）是在完成目标时播放，
而不是在跨天的一瞬间 —— 即使孩子带着 180 能量进入 Day 7 也一样。

`tests/domain/*.test.ts` 把这些表格钉死了，改动前先看测试。

## 容易踩的坑

**六个页面全是 client component，这是有意为之。**
所有数据都来自 `localStorage`，服务端没有真实内容可渲染。
首屏 HTML 是「按路由的骨架（`components/ui/Skeletons.tsx`）+ 导航」，真实数据在
hydration 之后才到。不要试图把内容做成服务端渲染 —— 没有东西可渲染。

**zustand v5 通过 `useSyncExternalStore` 取值，selector 每次返回新对象会让 React 无限循环。**
请使用 `store/hooks.ts` 里 memo 化的 hook。确实需要派生对象时，
用 `useMemo` 从基本类型的选择结果里算出来。

**CSS 的 `transform` 会覆盖 SVG 的 `transform` 属性。**
同时带 `.anim-*` 动画类和 SVG `translate` 的元素，会静默塌陷到原点。
把**定位**放在外层 `<g>`、**动画**放在内层 `<g>`。
`e2e` 里有专门的回归测试守着这点。

**存储是分开的，而且每次访问都包了 try/catch。**
游戏状态在 `growth-world-prototype-v1`；事件日志在 `growth-world-analytics-v1`，
写入去抖 800ms，并在 `pagehide` / `visibilitychange` 时 flush。
`localStorage` 在 Safari 无痕模式和配额超限时会抛异常，埋点绝不能因此弄挂应用。
`resetPrototype` 会**故意保留**事件日志（只清进度，不追加事件 ——
schema 里没有 reset 事件）—— Debug 按钮很容易误触，
丢已收集的数据比多留几天历史更糟。
身份存在第三个 key `growth-world-participant-v1`，同样不受 reset 影响。

**`data-testid` 归 e2e 所有。**
测试覆盖完整 Day 1 → 7 流程、Day Gate、导航几何、首屏行为。
改样式时请保留 testid，以及导航的结构（整格链接、≥44×44 点击区）。

**Day 6 的神秘小门是 anticipation 实验的一部分：当天无论完成多少任务都不能打开。**

**目标库有两条硬规则，`tests/data/goals.test.ts` 守着。**
① 每条目标必须「科目 + 动作 + 数量」（`amount` 字段），不能是可做可不做的空话；
② 只写「要做什么」，绝不写「不要做什么」，也绝不出现 走神 / 乱走 / 坐不住 这类
问题行为词。走神、离座这类行为要用**替代行为**表达（"想站起来时先举手"），
而不是压制（"不要乱动"）—— 压制的目标对坐不住的孩子等于没有目标。
另外文案要**奖励动作不奖励结果**（"对错都算"），否则目标会变成又一次失败记录。

**文案规则（spec §1，P4/P5）。** 不要出现 作业 / 检查 / 家长任务 / 处罚 / 没完成 /
失败；改用 今日成长 / 我的目标 / 成长能量 / 今天做到了 / 下一次变化。
没完成任何一天都不会被惩罚 —— 世界不会死、不会枯萎、不会生病。
`tests/domain/milestone.test.ts` 会断言这些禁用词没有混进来。

## Analytics 的硬性约束

**只有 `src/analytics/client.ts` 能投递事件。** 业务代码一律走
`src/analytics/track.ts` 的类型化函数，例如
`trackGoalCompleted({ day, goalType, energyEarned, petState, plantState, totalEnergy })`。
组件里出现任何 PostHog / fetch 调用都是错的。

**参与者身份只能是匿名 UUID。** 投递出去的 `distinct_id` 只能是
`getParticipantId()` 返回的那个 `crypto.randomUUID()`（身份通过一次 `$identify`
事件登记，`$set` 里只有 `experiment_version`）。
绝不允许 email / 手机号 / 真实姓名 / 学校 —— 用户是 8–12 岁儿童，
数据最小化是硬要求，不是偏好。`.env.example` 里也写了这条。

**事件 schema 是 14 个，写在 `ANALYTICS_EVENT_NAMES`（`domain/types.ts`）。**
不要因为「加个埋点」就新增事件：
- 需要新维度 → 扩展已有事件的属性（`goal_completed.goal_type` 就是这么做的）
- 不要每个按钮一个事件；事件表是假设驱动的
- `experiment_version` / `experiment_day` 由 `createEvent()` 统一合并，
  调用点不用管，也不可能漏

**Session Replay 保持关闭。** 真要开，得先处理监护人同意、输入遮罩、
数据保留和儿童隐私合规 —— 不是改个配置的事。

**不配置 PostHog 必须完全可用。** 没有 `NEXT_PUBLIC_POSTHOG_KEY` 时所有 tracker
是 no-op，本地事件日志和 `/debug/export` 照常工作。不要写出依赖 PostHog 存在的代码。

**事件走同源 `/ingest/*` 反向代理**（rewrite 在 `next.config.ts`）。
不要改成直连 `us.i.posthog.com` —— tracking blocker 会静默丢掉请求，
实验数据会无声无息变成零。这是 PostHog 官方 Next.js 指南明确建议的做法。

**上下文属性要自己带。** HTTP 方式没有 SDK 帮忙，`client.ts` 里
`contextProps()` 负责补 `$lib` / `$current_url` / `$pathname` / `$host` ——
少了它们 PostHog 的 Library 和 URL/Screen 两列会是空的。
**`$current_url` 只允许拼 `origin + pathname`，绝不能带上 query 或 hash**，
`tests/analytics/client.test.ts` 会断言这一点。

**没有装 posthog-js，是直接 POST 到 PostHog 的 HTTP capture API。**
原因见 `client.ts` 顶部注释：SDK 1.434.2 在最小配置下也从不发送事件（已在
静态页面用官方预编译包复现），而 HTTP API 实测 200 且事件到达。
不要"顺手"把它换回 SDK —— 换之前先按注释里的方法验证事件真的发出去了。

## 部署

Vercel，从本地目录部署：`vercel deploy --prod --scope linonward`。
项目已 link（`.vercel/` 已 gitignore）。

`.vercelignore` 是必须的：否则 CLI 会把本地 `.next` 一起上传，那是几百 MB。

**目前没有接 Git 自动部署** —— Vercel 账号是 `linonward2026`，
而仓库在 `linonward` 名下，Vercel 没有对应的 GitHub App 权限。
在 Vercel 控制台 → Settings → Git 连一次即可；在那之前每次都得手动 deploy。
