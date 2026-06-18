# 滴滴代吵

一个移动端 App 原型 Demo，定位是 AI 情绪表达与“嘴替”工具。核心不是鼓励攻击别人，而是帮助用户在冲突场景中整理逻辑、稳定情绪，并在对话里一轮一轮接住对方的话。

当前版本默认调用真实 AI API。只有显式设置 `DEMO_MODE=true` 时，后端才允许使用 demo / fallback 数据；正式演示和真实使用请保持 `DEMO_MODE=false`。

## Demo 功能

- 首页：项目名、Slogan、App Logo、三个核心功能入口卡片
- 临时代吵：二级功能页，先设置对象、目标和语气，再进入实时吵架聊天页
- 专属嘴替：二级功能页，先保存嘴替人格，再按用户风格实时接话
- 吵架训练场：二级功能页，选择场景和难度后进入多轮训练对话
- 记录：统一展示临时代吵、专属嘴替和训练场多轮历史记录
- 我的：只保留我的嘴替人格、偏好设置和账号设置

## 视觉风格

整体采用日系漫画 App / 手绘社交软件方向：

- cream 纸感背景
- thick black outlines 粗黑描边
- sticker-like buttons 贴纸按钮
- soft pink、orange red、yellow、blue 辅助色
- 手写感中文排版
- cute but chaotic meme anime style

## 本地运行

```bash
npm run dev
```

默认访问：

```text
http://localhost:3000
```

运行前请在 `.env` 或 `api.env` 中配置 `DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY`。如果 `.env` 没写 `DEMO_MODE`，默认等同于 `false`。

正式演示 / 真实使用建议：

```env
DEMO_MODE=false
```

## 检查项目

```bash
npm run build
```

这个命令会检查核心静态文件是否存在。

## 文件结构

```text
.
├── index.html
├── package.json
├── dev-server.mjs
├── DESIGN.md
├── code.html
├── screen.png
└── src
    ├── App.js
    ├── main.js
    ├── styles.css
    ├── data
    │   └── mockData.js
    ├── components
    │   ├── BottomNav.js
    │   ├── FeatureCard.js
    │   └── ResultCard.js
    └── pages
        ├── HomePage.js
        ├── TempArguePage.js
        ├── PersonaPage.js
        ├── TrainingPage.js
        ├── RecordsPage.js
        └── ProfilePage.js
```

## 主要模块

- `src/App.js`：页面状态、简单路由、交互事件分发
- `src/data/mockData.js`：导航、选项和部分静态配置；AI 生成链路默认不使用本地 mock 成功兜底
- `src/styles.css`：统一移动端 UI 样式和漫画风视觉系统
- `src/pages/TempArguePage.js`：临时代吵页面，包含开局设置和实时接话聊天窗口
- `src/pages/PersonaPage.js`：专属嘴替页面，包含人格设置和按本人风格接话的聊天窗口
- `src/pages/TrainingPage.js`：吵架训练场页面，包含训练设置和多轮评分反馈
- `src/pages/RecordsPage.js`：统一历史记录页面

## AI API 约定

所有 AI 对话、生成、评分、蒸馏功能默认必须调用真实后端 API。真实响应应带 `source: "ai"`；只有显式 `DEMO_MODE=true` 时，fallback / demo 响应才允许出现，并应带 `source: "fallback"`。前端会把 fallback 或缺失 source 的结果显示为错误，而不是当成成功结果。

临时代吵建议后端接口输入：

```json
{
  "scene": "发生了什么",
  "opponent": "对方说了什么",
  "goal": "用户想达到的目的",
  "tone": "强硬"
}
```

临时代吵建议返回：

```json
{
  "mainLine": "吵架主线",
  "recommended": "推荐回复",
  "harder": "更强硬版",
  "decent": "更体面版",
  "offTopic": "跑题提醒"
}
```

专属嘴替建议后端接口输入：

```json
{
  "style": "我的说话风格",
  "problem": "我吵架时最容易出现的问题",
  "expectation": "我希望嘴替帮我做到什么",
  "boundary": "我不想越过的表达边界"
}
```

专属嘴替建议返回：

```json
{
  "styleAnalysis": "你的语言风格分析",
  "mainLine": "当前吵架主线",
  "myVersion": "像你本人版回复",
  "softer": "更温和版",
  "harder": "更强硬版",
  "pause": "暂停对话版"
}
```

吵架训练场建议后端接口输入：

```json
{
  "scene": "宿舍卫生大战",
  "difficulty": "黄金",
  "round": 1,
  "opponentAttack": "对方本轮发言",
  "userReply": "用户输入的回复"
}
```

吵架训练场建议返回：

```json
{
  "scores": {
    "logic": 82,
    "power": 76,
    "boundary": 88,
    "mainline": 80,
    "risk": 24,
    "winRate": 78
  },
  "drifted": false,
  "suggestion": "回复优化建议",
  "optimized": "优化后的回复",
  "nextAttack": "下一轮对方反击",
  "report": "最终战斗报告"
}
```

## 表达安全边界

产品建议把“攻击力”设计成“回击力度”，并保留风险提醒：

- 可以强硬、讽刺、反问、拆逻辑
- 避免脏话、人身攻击、威胁、歧视和隐私攻击
- 目标是让表达更有气势，而不是单纯升级冲突
