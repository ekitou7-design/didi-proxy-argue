# 滴滴代吵

一个移动端 App 原型 Demo，定位是 AI 情绪表达与“嘴替”工具。核心不是鼓励攻击别人，而是帮助用户在冲突场景中整理逻辑、稳定情绪，并生成更有气势但不过界的表达。

当前版本使用本地 mock 数据，不接入真实 AI API。

## Demo 功能

- 首页：项目名、Slogan、漫画风占位插画、三个主功能入口、底部导航
- 临时代吵：面向一次性冲突，填写冲突场景、对方原话、表达目的，选择代吵人格和输出强度后生成多段回复
- 专属嘴替：面向男朋友、朋友、室友、家人、熟人合作等长期关系，粘贴聊天记录后生成更像用户本人的回复
- 吵架训练场：回合制小游戏，选择场景、难度和对手类型，输入回复后获得评分、优化建议、下一轮反击和最终战斗报告
- 我的：展示当前嘴替人格、历史记录、偏好设置和隐私说明

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

当前项目使用零依赖本地开发服务器，避免因为依赖安装问题影响 Demo 展示。

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
        └── ProfilePage.js
```

## 主要模块

- `src/App.js`：页面状态、简单路由、交互事件分发
- `src/data/mockData.js`：功能入口、回复示例、人格数据、训练题目
- `src/styles.css`：统一移动端 UI 样式和漫画风视觉系统
- `src/pages/TempArguePage.js`：临时代吵页面，包含人格选择、输出强度和多结果卡片
- `src/pages/PersonaPage.js`：专属嘴替页面，包含聊天记录学习输入和熟人关系多版本回复
- `src/pages/TrainingPage.js`：吵架训练场页面，包含场景/难度/对手选择、回合输入、评分和战斗报告

## 后续接 AI API

可以优先替换 `src/data/mockData.js` 中的写死回复，再把 `src/App.js` 里的 `generate` 逻辑改成异步请求。

临时代吵建议后端接口输入：

```json
{
  "scene": "发生了什么",
  "opponent": "对方说了什么",
  "goal": "用户想达到的目的",
  "persona": "温柔但致命型",
  "intensity": "强硬"
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
  "chatLog": "用户粘贴的聊天记录",
  "latest": "对方最新一句话",
  "state": "我现在的状态",
  "realMessage": "我真实想表达什么",
  "goal": "我希望达到什么效果"
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
  "opponentType": "阴阳型",
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
