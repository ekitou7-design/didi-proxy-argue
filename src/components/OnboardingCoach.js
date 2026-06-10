import { escapeAttr, escapeHtml } from "../utils/html.js";

export const onboardingModules = {
  temp: [
    {
      target: "temp-settings",
      title: "先还原你的现场",
      body: "这不是编一场架。把现实里那个人是谁、刚说了什么、前情是什么、你想争取什么写清楚。"
    },
    {
      target: "temp-opponent-input",
      title: "输入对方刚说的话",
      body: "底部输入框默认粘贴对方最新一句原话。你贴得越像现场，我接出来的话越能直接用。"
    },
    {
      target: "temp-reply-opponent",
      title: "主流程：帮你接一句",
      body: "现实里对方又回你一句，就贴进输入框点这里。我会按前情、诉求和边界生成下一句。"
    },
    {
      target: "temp-reply-intent",
      title: "补充：按你的意思说",
      body: "如果你没有对方新话，只是心里有个想法，就用这里把意思整理成更清楚、更稳的表达。"
    },
    {
      target: "temp-intensity",
      title: "攻击力",
      body: "这里调的是压迫感，不是脏话程度。低更体面，中更有边界，高更锋利，但都不做人身攻击。"
    },
    {
      target: "temp-generate-scenario",
      title: "没素材时再用示例",
      body: "换个场景只是给你试手。真正求助时，优先填自己的现实冲突，再贴对方原话。"
    }
  ],
  persona: [
    {
      target: "persona-create",
      title: "给长期关系建档案",
      body: "熟人、对象、室友、同事这类反复起冲突的人，适合建成专属嘴替，之后回复会更贴你的处境。"
    },
    {
      target: "persona-distill",
      title: "有聊天记录就蒸馏",
      body: "上传 txt 可以学习你的表达风格和关系背景。上传前先删姓名、手机号、地址、学校和公司。"
    },
    {
      target: "persona-test",
      title: "没记录就做测试",
      body: "没有聊天记录也能用。做一组测试题，先生成一个能接话的嘴替档案。"
    },
    {
      target: "persona-reply-settings",
      title: "回复设置",
      body: "这里决定回复像不像你、说得多直白、强度多高。想稳一点就别一上来拉满。"
    },
    {
      target: "persona-generate-reply",
      title: "让嘴替接住对方",
      body: "把前情、对方原话和你的目标交给它。它会按你的档案，生成更像你本人能发出去的话。"
    },
    {
      target: "persona-feishu",
      title: "飞书设置",
      body: "这是可选入口。需要团队或群里接收回复时再配置，不影响日常使用。"
    }
  ],
  training: [
    {
      target: "training-generate",
      title: "这是练习，不是求助现场",
      body: "训练场会生成一个模拟对手，让你练习抓主线、扛阴阳、提要求。真实求助还是去临时吵。"
    },
    {
      target: "training-start",
      title: "开始训练",
      body: "确认当前场景、你扮演谁、你要达成什么目标后，就可以开始多轮对话。"
    },
    {
      target: "training-goals",
      title: "训练目标",
      body: "每局只抓几个重点练，比如不被嘲讽带偏、坚持主线、把要求说清楚。"
    },
    {
      target: "training-submit",
      title: "发送",
      body: "训练开始后，你在这里发言，AI 对手会继续反驳、推脱或施压。"
    },
    {
      target: "training-finish",
      title: "结束本轮 / 本轮反馈",
      body: "随时结束本轮看反馈。系统会看你的逻辑、气势、边界、主线和风险点。"
    }
  ]
};

const globalOnboardingSteps = [
  {
    title: "你不是来编一场架。",
    body: "你是在现实里被某个人一句话卡住了，想找人帮你想下一句怎么回。"
  },
  {
    title: "输入框放对方原话。",
    body: "把对方刚刚说的那句话贴进来。不是随便写两个人吵架，而是让我接住你正在经历的现场。"
  },
  {
    title: "我帮你接下一句。",
    body: "我会结合前情、诉求和边界，给你一条能参考、能改、也能直接发的回复。"
  }
];

export function OnboardingGlobalTip(step = 0) {
  const safeStep = Math.min(Math.max(Number(step) || 0, 0), globalOnboardingSteps.length - 1);
  const item = globalOnboardingSteps[safeStep];
  const isLast = safeStep >= globalOnboardingSteps.length - 1;
  return `
    <section class="onboarding-global-tip" role="dialog" aria-label="新手攻略提示">
      <div class="onboarding-card compact">
        <span class="onboarding-kicker">新手攻略 · ${safeStep + 1}/${globalOnboardingSteps.length}</span>
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.body)}</p>
        <div class="onboarding-actions">
          ${safeStep === 0 ? `<button class="secondary-button warm onboarding-secondary" data-onboarding-action="skip-all">跳过攻略</button>` : ""}
          <button class="primary-button onboarding-primary" data-onboarding-action="${isLast ? "dismiss-global" : "next-global-step"}">
            ${isLast ? "我知道了" : "下一步"}
          </button>
        </div>
      </div>
    </section>
  `;
}

export function OnboardingCoach({ page, step = 0 }) {
  const steps = onboardingModules[page] || [];
  const item = steps[step];
  if (!item) return "";

  const isFirst = step === 0;
  const isLast = step >= steps.length - 1;
  return `
    <section
      class="onboarding-overlay"
      data-onboarding-overlay
      data-onboarding-target="${escapeAttr(item.target)}"
      role="dialog"
      aria-label="${escapeAttr(`${moduleTitle(page)}新手攻略`)}"
    >
      <div class="onboarding-highlight" aria-hidden="true"></div>
      <div class="onboarding-card">
        <span class="onboarding-kicker">${escapeHtml(moduleTitle(page))} · ${step + 1}/${steps.length}</span>
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.body)}</p>
        <div class="onboarding-actions">
          ${isFirst ? `<button class="secondary-button warm onboarding-secondary" data-onboarding-action="skip-all">跳过全部新手攻略</button>` : ""}
          <button class="primary-button onboarding-primary" data-onboarding-action="${isLast ? "finish-module" : "next-step"}">
            ${isLast ? "我知道了" : "下一步"}
          </button>
        </div>
      </div>
    </section>
  `;
}

function moduleTitle(page) {
  if (page === "persona") return "专属嘴替";
  if (page === "training") return "训练场";
  return "临时吵";
}
