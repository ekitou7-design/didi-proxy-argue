# Data Model Notes

本文档基于当前前端实际使用字段整理，主要参考 `src/App.js`、`src/pages/TempArguePage.js`、`src/pages/PersonaPage.js`、`src/pages/TrainingPage.js` 与初始化数据。此文档只描述现状和后续统一建议，不代表代码已经完成迁移。

## Message

### 当前状态

当前消息结构不统一：

- 专属嘴替聊天 `proxyPersona.chatTurns` 使用 `{ id, role, text }`。
- 专属嘴替页面的示例消息也使用 `{ id, role, text }`。
- 训练场 `training.messages` 使用 `{ role, content }`，用户发送时是 `{ role: "user", content }`，AI 回复是 `{ role: "assistant", content }`。
- 临时吵没有通用 Message，使用 `rounds` 结构表达一轮对话：`{ id, opponent, analysis, mainline, replies }`。
- `role` 当前主要为 `"user"` / `"assistant"`，但页面展示语义不完全一致：临时吵中的用户侧气泡实际代表“对方”，训练场中的 assistant 代表 AI 对手。

### 建议统一格式

```js
{
  id: "message-id",
  role: "user" | "assistant" | "opponent" | "system",
  content: "消息正文",
  createdAt: "ISO 时间字符串"
}
```

迁移时建议先兼容旧字段：读取 `content || text`，写入新消息时只写 `content`。

## TempSession

### 当前状态

初始化字段：

```js
{
  type: "临时代吵",
  step: "setup",
  who,
  context,
  latest,
  goal,
  tone,
  boundary,
  generatedScenario,
  scenarioStatus,
  scenarioMessage,
  settingsOpen,
  input,
  isSubmitting,
  rounds
}
```

页面和 App 中实际使用：

- `who`：当前对手身份，例如客服、室友、对象。
- `context`：前情提要，也相当于场景背景。
- `latest`：对方上一句或第一句。
- `goal`：用户想达到的效果。
- `tone`：攻击力/语气强度。
- `boundary`：边界说明，当前初始化存在，但页面使用较少。
- `generatedScenario`：临时场景，包含 `title`、`background`、`opponentPersona`、`openingMessage`、`mainline`、`userGoal`、`tone`。
- `rounds`：每轮临时接话结果。

`rounds` 当前结构：

```js
{
  id,
  opponent,
  analysis,
  mainline,
  replies: [
    { label, text }
  ]
}
```

### 建议统一格式

```js
{
  id: "temp-session-id",
  status: "setup" | "loading" | "ready" | "submitting",
  opponent: {
    name: "对方身份",
    openingMessage: "对方开场"
  },
  background: "前情提要",
  goal: "用户诉求",
  tone: "语气强度",
  boundary: "边界",
  scenario: TempScenario,
  messages: Message[],
  rounds: TempRound[]
}
```

建议保留 `rounds` 作为临时吵的结果容器，但后续可让 `opponent` 文本和助手回复也同步映射为 `messages`。

## PersonaProfile

### 当前状态

专属嘴替人格来源有两类：

- txt 蒸馏结果：保存在 `distillResults`。
- 测试题结果：保存在 `testResults`。

`proxyPersona` 当前状态包含：

```js
{
  userId,
  activeTab,
  upload: {
    targetSpeaker,
    sourceType,
    relationship,
    background,
    chatText
  },
  testAnswers,
  personas,
  selectedPersonaId,
  currentProfile,
  replyForm,
  chatTurns,
  replyResult,
  isReplyGenerating,
  message
}
```

人格展示和生成回复时实际兼容多种字段：

- 基础识别：`id`、`profileName`、`typeName`、`name`、`sourceType`。
- 摘要：`oneLineSummary`、`sourceSummary`、`profileSummary`、`subtitle`。
- 标签：`personalityTags`、`tags`、`dimensions`、`commonPhrases`。
- 语气/策略：`tone`、`replyStrategy`、`logicStyle`。
- 嵌套档案：`personaProfile`、`styleProfile`。
- 蒸馏档案中可能包含：`expressionDNA`、`languageFingerprint`、`sentencePatterns`、`emotionalPattern`、`conflictStrategies`、`conflictHeuristics`、`antiPatterns`、`honestBoundaries`、`styleReproductionGuide`、`systemPromptFragment`。

### 建议统一格式

```js
{
  id: "persona-id",
  sourceType: "distill" | "test",
  profileName: "人格名称",
  summary: "一句话概括",
  tags: [],
  tone: "语气",
  replyStrategy: "回复策略",
  styleProfile: {
    expressionDNA: {},
    languageFingerprint: {},
    sentencePatterns: [],
    emotionalPattern: {},
    conflictStrategies: [],
    conflictHeuristics: [],
    antiPatterns: [],
    honestBoundaries: [],
    styleReproductionGuide: {},
    systemPromptFragment: ""
  },
  createdAt: "ISO 时间字符串"
}
```

迁移时建议先写适配函数，把 `personaProfile || styleProfile || profile` 归一化为展示层可读对象。

## PersonaSession

### 当前状态

项目里存在两个“专属嘴替”相关 session：

- `persona`：旧的关系型 session，字段包括 `profileId`、`who`、`relation`、`commonConflict`、`tactics`、`style`、`expectation`、`context`、`latest`、`goal`、`tone`、`boundary`、`input`、`rounds`。
- `proxyPersona`：当前页面主要使用的专属嘴替状态，包含人格列表、当前人格、回复表单和聊天记录。

当前聊天记录使用：

```js
chatTurns: [
  {
    id,
    role: "user" | "assistant",
    text
  }
]
```

回复表单：

```js
replyForm: {
  opponentMessage,
  background,
  goal,
  mode,
  strength
}
```

生成结果：

```js
replyResult: {
  reply,
  strategy,
  tone
}
```

### 建议统一格式

```js
{
  id: "persona-session-id",
  currentProfileId: "persona-id",
  input: {
    opponentMessage: "",
    background: "",
    goal: "",
    mode: "",
    strength: ""
  },
  messages: Message[],
  lastResult: {
    reply: "",
    strategy: "",
    tone: ""
  },
  status: "idle" | "generating" | "error",
  message: "页面状态提示"
}
```

建议后续逐步弱化旧 `persona` session，只保留真正被记录页或旧流程使用的字段。

## TrainingScenario

### 当前状态

训练场场景可能来自三处：

- `training.generatedScenario`：后端随机/预设场景返回，或前端本地草稿。
- `buildScenarioFromGameConfig(config)`：根据配置生成本地场景。
- `buildPresetScenarioDraft(input)`：预设训练草稿。

当前常见字段：

```js
{
  id,
  title,
  background,
  scene,
  roleA: { name, description, goal },
  roleB: { name, description, goal },
  playerRoleKey,
  aiRoleKey,
  playerIdentity,
  aiIdentity,
  aiDifficulty,
  difficulty,
  category,
  relationship,
  opponentProfile: {
    type,
    personality,
    tactics
  },
  openingMessage,
  userGoal,
  realMainline,
  mainline: {
    fact,
    impact,
    request,
    boundary
  },
  traps,
  trainingFocus,
  scoreFocus,
  suggestedFirstReplyHint,
  createdAt
}
```

页面直接使用较多的是 `title`、`background`、`openingMessage`、`userGoal`、`roleA`、`roleB`、`playerRoleKey`、`difficulty`。

### 建议统一格式

```js
{
  id: "scenario-id",
  title: "标题",
  background: "背景",
  openingMessage: "AI 对手开场",
  userGoal: "玩家目标",
  difficulty: "easy" | "normal" | "hard" | "hell",
  roles: {
    userRole: { key: "A", name: "", description: "", goal: "" },
    opponentRole: { key: "B", name: "", description: "", goal: "" }
  },
  mainline: {
    fact: "",
    impact: "",
    request: "",
    boundary: ""
  },
  traps: [],
  trainingFocus: [],
  scoreFocus: {},
  createdAt: "ISO 时间字符串"
}
```

短期不建议立刻替换 `roleA` / `roleB`，因为前后端和页面都在用；可以先新增派生 getter。

## TrainingSession

### 当前状态

初始化字段：

```js
{
  type,
  step,
  gameState,
  scene,
  debateTopic,
  playerIdentity,
  aiIdentity,
  playerSide,
  aiSide,
  aiDifficulty,
  difficulty,
  goal,
  gameConfig,
  maxRounds,
  persuasionScore,
  persuasionDelta,
  opponentState,
  review,
  result,
  offTrackStreak,
  randomScenarioForm,
  generatedScenario,
  scenarioStatus,
  scenarioMessage,
  settingsOpen,
  round,
  opponent,
  messages,
  input,
  isSubmitting,
  feedbacks
}
```

训练中消息：

```js
messages: [
  { role: "assistant", content: "AI 对手发言" },
  { role: "user", content: "玩家回复" }
]
```

反馈项：

```js
{
  id,
  userReply,
  nextOpponent,
  persuasionDelta,
  persuasionScore,
  feedback,
  roundScore: {
    overallScore,
    scores: {
      logic,
      power,
      boundary,
      mainline,
      risk
    },
    advantages,
    suggestion,
    weaknesses,
    betterReply
  },
  opponentState
}
```

状态字段存在同义情况：

- `gameState`：`idle`、`playing`、`finished`。
- `step`：`setup`、`chat`、`finished`。
- `scenarioStatus`：`idle`、`loading`、`done`、`error`。
- `isSubmitting`：当前是否请求中。

### 建议统一格式

```js
{
  id: "training-session-id",
  status: "idle" | "playing" | "finished",
  scenarioStatus: "idle" | "loading" | "done" | "error",
  config: TrainingGameConfig,
  scenario: TrainingScenario,
  messages: Message[],
  round: 1,
  maxRounds: 5,
  score: {
    persuasion: 0,
    delta: 0,
    opponentState: "strong"
  },
  feedbacks: [],
  review: null,
  result: "",
  input: "",
  isSubmitting: false
}
```

建议后续把 `persuasionScore` / `persuasionDelta` 归入 `score`，但迁移前保留旧字段，避免训练场页面和后端 payload 同时大改。

## TrainingGameConfig

### 当前状态

前端配置结构：

```js
{
  scene,
  roleA: {
    name,
    description,
    goal
  },
  roleB: {
    name,
    description,
    goal
  },
  playerRoleKey,
  aiRoleKey,
  trainingGoals,
  difficulty
}
```

前端主要使用字段：

- `scene`：设置页文本域、HUD 标题、生成 payload。
- `roleA` / `roleB`：角色编辑、角色选择、聊天气泡名称。
- `playerRoleKey`：玩家选择 A/B。
- `aiRoleKey`：通常由 `playerRoleKey` 推导，也会写入状态。
- `trainingGoals`：目标 chip、HUD、payload。
- `difficulty`：难度 chip、回合数、payload。

后端/场景返回相关字段：

- `gameConfig` 会作为 `/api/training/scenario/preset` 和 `/api/training/reply` payload 发送。
- `generatedScenario` 可能返回 `roleA`、`roleB`、`playerRoleKey`、`aiRoleKey`、`aiDifficulty`、`difficulty`、`userGoal`。
- 前端 `scenarioToGameConfig` 会从 `generatedScenario` 和旧 `gameConfig` 合成新的 `gameConfig`。

### 建议统一格式

```js
{
  scene: "",
  roles: {
    A: { name: "", description: "", goal: "" },
    B: { name: "", description: "", goal: "" }
  },
  playerRoleKey: "A" | "B",
  aiRoleKey: "A" | "B",
  trainingGoals: [],
  difficulty: "easy" | "normal" | "hard" | "hell"
}
```

短期建议继续保留 `roleA` / `roleB`，因为当前表单路径如 `training.gameConfig.roleA.name` 直接依赖该结构。未来可在领域层提供 `roles.A` 和 `roleA` 的兼容转换。

## 后续统一优先级

1. 优先统一 Message：把新写入的专属嘴替消息改为 `{ id, role, content, createdAt }`，读取阶段兼容 `text`。
2. 抽出 normalize 函数：`normalizeMessage`、`normalizePersonaProfile`、`normalizeTrainingGameConfig`，先不改页面结构。
3. 统一训练场消息和专属嘴替消息展示组件，让两者都吃 `Message.content`。
4. 收敛 `TrainingSession` 状态：减少 `gameState` / `step` / `scenarioStatus` 的交叉含义。
5. 最后再考虑 `TrainingScenario.roles` 替换 `roleA` / `roleB`，这一步影响前后端 payload 和表单路径，优先级最低。
