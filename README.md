# 滴滴代吵

一个移动端 App 原型 Demo，定位是 AI 情绪表达与“嘴替”工具。

它不是鼓励用户攻击别人，而是帮助用户在冲突场景中：

- 先把事情讲清楚
- 找到自己真正想达成的目标
- 不被对方带偏
- 用更稳、更有气势、更有边界的方式回复

当前版本默认调用真实 AI API。只有显式设置 `DEMO_MODE=true` 时，后端才允许使用 demo / fallback 数据；正式演示和真实使用请保持 `DEMO_MODE=false`。

## 这个项目能做什么

项目里主要有 5 个页面：

- `首页`：展示项目名、Slogan、App Logo 和核心功能入口。
- `临时代吵`：适合临时遇到冲突时用。输入“发生了什么、对方说了什么、你想达到什么结果”，AI 帮你接下一句。
- `专属嘴替`：先创建一个更像你本人的说话人格，再让 AI 按你的风格帮你回复。
- `吵架训练场`：不是直接替你说，而是模拟对手，帮你练习怎么守主线、讲逻辑、控风险。
- `记录 / 我的`：查看历史记录，管理嘴替人格、偏好设置和账号相关设置。

一句话理解：

- 赶时间要一句能发的回复，用 `临时代吵`。
- 想让回复更像自己，用 `专属嘴替`。
- 想练表达能力，用 `吵架训练场`。

## 适合谁看

这份 README 尽量按“小白也能跑起来”的方式写。

你不需要先懂前端框架，只要会打开终端、复制命令、编辑一个 `.env` 文件，就可以启动项目。

## 运行前准备

你需要准备：

1. 一台电脑。
2. Node.js，建议使用 Node.js 18 或更高版本。
3. 一个 AI API Key，二选一即可：
   - `DEEPSEEK_API_KEY`
   - `OPENAI_API_KEY`

检查自己有没有安装 Node.js：

```bash
node -v
```

检查自己有没有安装 npm：

```bash
npm -v
```

如果这两个命令都能输出版本号，比如 `v20.x.x`、`10.x.x`，说明基础环境没问题。

## 第一次启动项目

### 1. 进入项目目录

如果你已经在这个项目目录里，可以跳过这一步。

```bash
cd stitch_manga_proxy_argue_ui
```

### 2. 安装依赖

第一次运行前需要安装依赖：

```bash
npm install
```

安装完成后，项目里会出现或更新 `node_modules` 目录。

### 3. 配置 API Key

在项目根目录新建一个 `.env` 文件，写入下面内容。

如果你用 DeepSeek：

```env
DEEPSEEK_API_KEY=你的 DeepSeek Key
DEMO_MODE=false
```

如果你用 OpenAI：

```env
OPENAI_API_KEY=你的 OpenAI Key
DEMO_MODE=false
```

注意：

- `你的 DeepSeek Key` / `你的 OpenAI Key` 要替换成真实 key。
- 不要把 API Key 发给别人，也不要提交到公开仓库。
- `.env` 和 `api.env` 都可以被读取；一般新手用 `.env` 就够了。
- 如果 `.env` 没写 `DEMO_MODE`，默认等同于 `false`。

### 4. 启动本地服务

```bash
npm run dev
```

启动成功后，终端会看到类似：

```text
滴滴代吵 running at http://localhost:3000
```

然后用浏览器打开：

```text
http://localhost:3000
```

如果 `3000` 端口被占用了，可以换一个端口：

```bash
PORT=3001 npm run dev
```

然后访问：

```text
http://localhost:3001
```

## 常用命令

```bash
npm install
```

安装项目依赖。第一次运行项目时使用。

```bash
npm run dev
```

启动本地开发服务。前端页面和后端 API 都由这个服务提供。

```bash
npm run preview
```

预览项目。当前和 `npm run dev` 使用同一个服务入口。

```bash
npm run build
```

检查核心静态文件是否存在。这个项目当前不是传统打包流程，所以它主要用于基础检查。

## 环境变量说明

项目会读取 `.env`，也会读取 `api.env`。如果两个文件都有，通常 `.env` 优先满足日常本地开发。

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 二选一 | DeepSeek API Key。配置后会优先使用 DeepSeek。 |
| `OPENAI_API_KEY` | 二选一 | OpenAI API Key。没有 DeepSeek Key 时使用 OpenAI。 |
| `DEMO_MODE` | 否 | 是否允许 demo / fallback 数据。正式演示建议 `false`。 |
| `PORT` | 否 | 本地服务端口，默认 `3000`。 |
| `AI_MODEL` | 否 | 通用模型名覆盖。 |
| `AI_BASE_URL` | 否 | 通用 API Base URL 覆盖。 |
| `DEEPSEEK_MODEL` | 否 | DeepSeek 模型名，默认 `deepseek-chat`。 |
| `DEEPSEEK_BASE_URL` | 否 | DeepSeek Base URL，默认 `https://api.deepseek.com`。 |
| `OPENAI_MODEL` | 否 | OpenAI 模型名，默认 `gpt-4.1-mini`。 |
| `OPENAI_BASE_URL` | 否 | OpenAI Base URL。一般不用填。 |
| `FEISHU_APP_ID` | 否 | 飞书机器人相关配置。没配也能正常使用核心功能。 |
| `FEISHU_APP_SECRET` | 否 | 飞书机器人相关配置。 |
| `FEISHU_VERIFICATION_TOKEN` | 否 | 飞书事件校验 token。 |
| `FEISHU_ENCRYPT_KEY` | 否 | 飞书加密事件解密 key。 |

最小可用配置示例：

```env
DEEPSEEK_API_KEY=sk-xxxx
DEMO_MODE=false
```

或者：

```env
OPENAI_API_KEY=sk-xxxx
DEMO_MODE=false
```

## 新手使用流程

### 临时代吵

适合“我现在就需要一句回复”的场景。

推荐填写方式：

- `对象`：你在和谁沟通，比如同事、室友、伴侣、客服。
- `场景`：发生了什么，不用长，写清楚矛盾点即可。
- `对方说了什么`：尽量贴近原话。
- `目标`：你想要道歉、解释、拒绝、争取补偿，还是让对方停止某种行为。
- `语气 / 攻击力`：新手建议先用中等强度。

生成后不要只看最狠的那句，建议先看：

- 主线有没有守住
- 有没有跑题
- 有没有人身攻击或过度升级
- 哪个版本最适合真的发出去

### 专属嘴替

适合“我想让 AI 更像我本人说话”的场景。

一般流程：

1. 先创建或生成一个嘴替人格。
2. 输入当前冲突前情。
3. 输入对方刚说的话。
4. 输入你想表达的目标。
5. 让 AI 生成更像你的回复。

如果你上传聊天记录或文本用来蒸馏人格，请先删掉隐私信息，比如姓名、手机号、地址、学校、公司、账号等。

### 吵架训练场

适合“我想练习表达，不想每次都被带偏”的场景。

训练场会关注：

- 逻辑是否清楚
- 气势是否足够
- 边界是否安全
- 有没有守住主线
- 风险是否过高

新手建议先选普通难度和中等强度。目标不是赢得最凶，而是练会更稳地表达。

## API 接口概览

本地服务启动后，前端会调用同一个服务里的 API。

| 接口 | 方法 | 用途 |
| --- | --- | --- |
| `/api/health` | GET | 健康检查。 |
| `/api/temp-chat` | POST | 临时代吵多轮接话。 |
| `/api/temp-scenario` | POST | 生成临时冲突场景。 |
| `/api/temp-argue` | POST | 旧版临时代吵生成接口。 |
| `/api/persona/extract` | POST | 从文本中提取嘴替人格。 |
| `/api/persona/reply` | POST | 按专属嘴替人格生成回复。 |
| `/api/persona/test-result` | POST | 根据测试题生成嘴替结果。 |
| `/api/persona/analyze-chat` | POST | 分析聊天风格。 |
| `/api/training/scenario/random` | POST | 随机生成训练场景。 |
| `/api/training/scenario/preset` | POST | 根据预设生成训练场景。 |
| `/api/training/reply` | POST | 训练场多轮对话。 |
| `/api/training/score` | POST | 训练回复评分。 |
| `/api/feishu/send` | POST | 发送内容到飞书。 |
| `/api/feishu/events` | POST | 接收飞书事件。 |

测试服务是否启动：

```bash
curl http://localhost:3000/api/health
```

正常会返回类似：

```json
{
  "ok": true,
  "name": "didi-proxy-argue-backend"
}
```

## AI API 返回约定

所有 AI 对话、生成、评分、蒸馏功能默认必须调用真实后端 API。

真实响应应带：

```json
{
  "source": "ai"
}
```

只有显式 `DEMO_MODE=true` 时，fallback / demo 响应才允许出现，并应带：

```json
{
  "source": "fallback"
}
```

前端会把 fallback 或缺失 `source` 的结果显示为错误，而不是当成成功结果。

### 临时代吵输入示例

```json
{
  "scene": "室友总是不打扫卫生",
  "opponent": "你怎么这么事多？",
  "goal": "让对方承担自己的卫生责任",
  "tone": "强硬"
}
```

### 临时代吵返回示例

```json
{
  "mainLine": "把问题拉回公共卫生责任，而不是陷入谁事多的争吵",
  "recommended": "我不是事多，我是在说公共空间不能一直由一个人收拾。你用过的地方请你自己处理干净。",
  "harder": "别把不想收拾包装成我事多。公共空间是大家一起用的，你该负责的部分请你现在处理。",
  "decent": "我不是想吵架，只是希望公共空间能按约定一起维护。你用完后清理一下就好。",
  "offTopic": "不要被“你事多”带偏，继续围绕卫生责任说。"
}
```

### 专属嘴替输入示例

```json
{
  "style": "我平时说话直接，但不想骂人",
  "problem": "容易被对方带偏，最后开始解释太多",
  "expectation": "帮我说得更清楚、有边界",
  "boundary": "不要脏话，不要人身攻击"
}
```

### 专属嘴替返回示例

```json
{
  "styleAnalysis": "表达直接，适合短句和明确边界",
  "mainLine": "拒绝继续被转移话题",
  "myVersion": "我先把话说清楚：现在讨论的是这件事本身，不是我态度好不好。你如果愿意解决，我们就继续说解决办法。",
  "softer": "我想先回到事情本身。我们可以不互相评价态度，先把问题怎么解决说清楚。",
  "harder": "别再拿我的态度转移问题。现在要说的是你这件事怎么处理。",
  "pause": "我现在不想在情绪里继续说，等你愿意讨论解决方案时我们再聊。"
}
```

## 项目结构

```text
.
├── index.html
├── package.json
├── package-lock.json
├── dev-server.mjs
├── DESIGN.md
├── docs
│   ├── data-model.md
│   └── new-user-tutorial.md
├── public
│   └── app-logo.svg
├── server
│   ├── index.mjs
│   ├── openaiClient.mjs
│   ├── prompts.mjs
│   ├── feishuBot.mjs
│   └── services
├── src
│   ├── App.js
│   ├── main.js
│   ├── styles.css
│   ├── components
│   ├── controllers
│   ├── data
│   ├── domain
│   ├── pages
│   ├── services
│   └── utils
└── test
    ├── training-role-mapping.test.mjs
    └── training-scenario-fault.test.mjs
```

## 主要文件说明

- `server/index.mjs`：Express 后端入口，提供静态页面和 API。
- `server/openaiClient.mjs`：读取环境变量，创建 AI 客户端，统一请求模型。
- `server/prompts.mjs`：主要 AI prompt 构造逻辑。
- `src/App.js`：前端应用状态、页面切换和主要交互分发。
- `src/main.js`：前端启动入口。
- `src/styles.css`：移动端 UI 样式和漫画风视觉系统。
- `src/services/api.js`：前端请求后端 API 的封装。
- `src/pages/TempArguePage.js`：临时代吵页面。
- `src/pages/PersonaPage.js`：专属嘴替页面。
- `src/pages/TrainingPage.js`：吵架训练场页面。
- `src/pages/RecordsPage.js`：历史记录页面。
- `docs/new-user-tutorial.md`：新手引导设计文档。
- `docs/data-model.md`：数据模型说明。

## 视觉风格

整体采用日系漫画 App / 手绘社交软件方向：

- cream 纸感背景
- thick black outlines 粗黑描边
- sticker-like buttons 贴纸按钮
- soft pink、orange red、yellow、blue 辅助色
- 手写感中文排版
- cute but chaotic meme anime style

## 常见问题

### 打开页面后 AI 功能报错：还没有配置 API Key

检查 `.env` 里是否写了 `DEEPSEEK_API_KEY` 或 `OPENAI_API_KEY`。

改完 `.env` 后，需要停止服务再重新运行：

```bash
npm run dev
```

### 端口 3000 被占用

换一个端口启动：

```bash
PORT=3001 npm run dev
```

然后打开 `http://localhost:3001`。

### 页面能打开，但生成很慢

AI 接口需要联网请求，速度取决于网络和模型服务。可以先看终端有没有报错。

### 终端提示 AI returned invalid JSON

说明模型返回的内容不是项目期望的 JSON 格式。可以重试一次，或者换更稳定的模型。

### 飞书相关报错会影响核心功能吗

一般不会。没有配置 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` 时，后端会提示飞书回复会被跳过，但临时代吵、专属嘴替、训练场仍然可以用。

## 表达安全边界

产品里的“攻击力”更准确地说是“回击力度”。

可以：

- 强硬表达
- 讽刺或反问
- 拆对方逻辑
- 明确拒绝
- 提醒边界

避免：

- 脏话辱骂
- 人身攻击
- 威胁恐吓
- 歧视表达
- 隐私攻击
- 鼓动现实伤害

目标是让表达更有气势、更有逻辑，而不是单纯升级冲突。

## 给开发者的提示

这个项目当前是一个轻量原型：

- 前端没有复杂构建工具，页面由 `index.html` 加载 `src/main.js`。
- 后端用 Express 同时提供静态文件和 API。
- AI 返回值尽量保持 JSON 格式，前端会根据字段渲染不同结果。
- 如果你新增 AI 接口，请同步更新 `src/services/api.js` 和本 README 的接口说明。
