import BottomNav from "./components/BottomNav.js";
import HomePage from "./pages/HomePage.js";
import TempArguePage from "./pages/TempArguePage.js";
import PersonaPage from "./pages/PersonaPage.js";
import TrainingPage from "./pages/TrainingPage.js";
import ProfilePage from "./pages/ProfilePage.js";
import RecordsPage from "./pages/RecordsPage.js";
import {
  buildPersonaChatTurn,
  buildTempChatTurn,
  buildTrainingChatTurn,
  initialPersonaSession,
  initialTempSession,
  initialTrainingSession
} from "./data/mockData.js";

const pageTitles = {
  home: "滴滴代吵",
  temp: "临时代吵",
  persona: "专属嘴替",
  training: "吵架训练场",
  records: "记录",
  profile: "我的"
};

export default class App {
  constructor(root) {
    this.root = root;
    this.state = {
      page: "home",
      activePersona: initialPersonaSession.personaName,
      temp: structuredClone(initialTempSession),
      persona: structuredClone(initialPersonaSession),
      training: structuredClone(initialTrainingSession)
    };

    this.root.addEventListener("click", (event) => this.handleClick(event));
    this.root.addEventListener("input", (event) => this.handleInput(event));
  }

  setState(nextState) {
    this.state = { ...this.state, ...nextState };
    this.render();
  }

  getPage() {
    if (this.state.page === "temp") return TempArguePage(this.state.temp);
    if (this.state.page === "persona") return PersonaPage(this.state.persona);
    if (this.state.page === "training") return TrainingPage(this.state.training);
    if (this.state.page === "records") return RecordsPage();
    if (this.state.page === "profile") {
      return ProfilePage({ activePersona: this.state.activePersona });
    }
    return HomePage();
  }

  handleClick(event) {
    const copyTarget = event.target.closest("[data-copy-reply]");
    if (copyTarget) {
      navigator.clipboard?.writeText(copyTarget.dataset.copyReply);
      copyTarget.textContent = "已复制";
      return;
    }

    const pageTarget = event.target.closest("[data-page]");
    if (pageTarget) {
      this.setState({ page: pageTarget.dataset.page });
      return;
    }

    this.handleSetupChoice(event);

    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) return;

    const action = actionTarget.dataset.action;

    if (action === "start-temp-chat") {
      this.setState({ temp: { ...this.state.temp, step: "chat" } });
    }

    if (action === "temp-reply") {
      const text = this.state.temp.input.trim();
      if (!text) return;
      const turn = buildTempChatTurn(this.state.temp, text);
      this.setState({
        temp: {
          ...this.state.temp,
          input: "",
          rounds: [...this.state.temp.rounds, turn]
        }
      });
    }

    if (action === "start-persona-chat") {
      this.setState({
        activePersona: this.state.persona.personaName,
        persona: { ...this.state.persona, step: "chat" }
      });
    }

    if (action === "persona-reply") {
      const text = this.state.persona.input.trim();
      if (!text) return;
      const turn = buildPersonaChatTurn(this.state.persona, text);
      this.setState({
        persona: {
          ...this.state.persona,
          input: "",
          rounds: [...this.state.persona.rounds, turn]
        }
      });
    }

    if (action === "start-training-chat") {
      this.setState({ training: { ...this.state.training, step: "chat" } });
    }

    if (action === "training-submit") {
      const reply = this.state.training.input.trim();
      if (!reply) return;
      const feedback = buildTrainingChatTurn(this.state.training, reply);
      this.setState({
        training: {
          ...this.state.training,
          input: "",
          round: this.state.training.round + 1,
          opponent: feedback.nextOpponent,
          feedbacks: [...this.state.training.feedbacks, feedback]
        }
      });
    }
  }

  handleSetupChoice(event) {
    const tempWho = event.target.closest("[data-temp-who]");
    if (tempWho) {
      this.setState({ temp: { ...this.state.temp, who: tempWho.dataset.tempWho } });
      return;
    }

    const tempGoal = event.target.closest("[data-temp-goal]");
    if (tempGoal) {
      this.setState({ temp: { ...this.state.temp, goal: tempGoal.dataset.tempGoal } });
      return;
    }

    const tempTone = event.target.closest("[data-temp-tone]");
    if (tempTone) {
      this.setState({ temp: { ...this.state.temp, tone: tempTone.dataset.tempTone } });
      return;
    }

    const scene = event.target.closest("[data-training-scene]");
    if (scene) {
      this.setState({ training: { ...this.state.training, scene: scene.dataset.trainingScene } });
      return;
    }

    const difficulty = event.target.closest("[data-training-difficulty]");
    if (difficulty) {
      this.setState({
        training: { ...this.state.training, difficulty: difficulty.dataset.trainingDifficulty }
      });
    }
  }

  handleInput(event) {
    const setupKey = event.target.dataset.personaSetup;
    if (setupKey) {
      this.state.persona = {
        ...this.state.persona,
        [setupKey]: event.target.value
      };
      return;
    }

    const inputType = event.target.dataset.sessionInput;
    if (inputType === "temp") {
      this.state.temp = { ...this.state.temp, input: event.target.value };
      return;
    }

    if (inputType === "persona") {
      this.state.persona = { ...this.state.persona, input: event.target.value };
      return;
    }

    if (inputType === "training") {
      this.state.training = { ...this.state.training, input: event.target.value };
    }
  }

  render() {
    const { page } = this.state;

    this.root.innerHTML = `
      <div class="app-shell">
        <div class="phone-frame">
          <header class="top-bar">
            <button class="mini-sticker logo-sticker" data-page="home" aria-label="回到首页">
              <img src="/public/app-logo.svg" alt="" />
            </button>
            <div>
              <p class="eyebrow">实时对话式吵架嘴替</p>
              <h1>${pageTitles[page]}</h1>
            </div>
            <button class="mini-sticker danger" data-page="records">录</button>
          </header>
          <main class="page-scroll">${this.getPage()}</main>
          ${BottomNav(page)}
        </div>
      </div>
    `;
  }
}
