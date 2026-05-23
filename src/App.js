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
  initialTrainingSession,
  makeOpeningOpponent,
  relationProfiles
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
      profiles: structuredClone(relationProfiles),
      activePersona: initialPersonaSession.who,
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
    if (this.state.page === "persona") {
      return PersonaPage(this.state.persona, this.state.profiles);
    }
    if (this.state.page === "training") return TrainingPage(this.state.training);
    if (this.state.page === "records") {
      return RecordsPage({
        temp: this.state.temp,
        persona: this.state.persona,
        training: this.state.training
      });
    }
    if (this.state.page === "profile") {
      return ProfilePage({ activePersona: this.state.activePersona, profiles: this.state.profiles });
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

    const chipTarget = event.target.closest("[data-chip-session]");
    if (chipTarget) {
      const sessionKey = chipTarget.dataset.chipSession;
      const field = chipTarget.dataset.chipField;
      this.setState({
        [sessionKey]: { ...this.state[sessionKey], [field]: chipTarget.dataset.chipValue }
      });
      return;
    }

    const profileTarget = event.target.closest("[data-load-profile]");
    if (profileTarget) {
      const profile = this.state.profiles.find((item) => item.id === profileTarget.dataset.loadProfile);
      if (!profile) return;
      this.setState({
        activePersona: profile.name,
        persona: {
          ...this.state.persona,
          profileId: profile.id,
          who: profile.name,
          relation: profile.relation,
          commonConflict: profile.commonConflict,
          tactics: profile.tactics,
          style: profile.style,
          boundary: profile.boundary,
          expectation: profile.expectation
        }
      });
      return;
    }

    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) return;

    const action = actionTarget.dataset.action;

    if (action === "start-temp-chat") {
      this.setState({ temp: { ...this.state.temp, step: "chat", input: this.state.temp.latest || "" } });
    }

    if (action === "edit-temp-setup") {
      this.setState({ temp: { ...this.state.temp, step: "setup" } });
    }

    if (action === "temp-reply") {
      const text = this.state.temp.input.trim();
      if (!text) return;
      const turn = buildTempChatTurn(this.state.temp, text);
      this.setState({
        temp: { ...this.state.temp, latest: text, input: "", rounds: [...this.state.temp.rounds, turn] }
      });
    }

    if (action === "save-persona-profile") {
      const profile = this.buildProfileFromPersona();
      const profiles = this.state.profiles.some((item) => item.id === profile.id)
        ? this.state.profiles.map((item) => (item.id === profile.id ? profile : item))
        : [profile, ...this.state.profiles];
      this.setState({ profiles, activePersona: profile.name, persona: { ...this.state.persona, profileId: profile.id } });
    }

    if (action === "start-persona-chat") {
      this.setState({
        activePersona: this.state.persona.who,
        persona: { ...this.state.persona, step: "chat", input: this.state.persona.latest || "" }
      });
    }

    if (action === "edit-persona-setup") {
      this.setState({ persona: { ...this.state.persona, step: "setup" } });
    }

    if (action === "persona-reply") {
      const text = this.state.persona.input.trim();
      if (!text) return;
      const turn = buildPersonaChatTurn(this.state.persona, text);
      this.setState({
        persona: { ...this.state.persona, latest: text, input: "", rounds: [...this.state.persona.rounds, turn] }
      });
    }

    if (action === "start-training-chat") {
      const opponent = makeOpeningOpponent(this.state.training.scene);
      this.setState({ training: { ...this.state.training, step: "chat", opponent } });
    }

    if (action === "edit-training-setup") {
      this.setState({ training: { ...this.state.training, step: "setup" } });
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

  handleInput(event) {
    const setup = event.target.dataset.setupInput;
    if (setup) {
      const [sessionKey, field] = setup.split(".");
      this.state[sessionKey] = { ...this.state[sessionKey], [field]: event.target.value };
      return;
    }

    const inputType = event.target.dataset.sessionInput;
    if (inputType) {
      this.state[inputType] = { ...this.state[inputType], input: event.target.value };
    }
  }

  buildProfileFromPersona() {
    const session = this.state.persona;
    return {
      id: session.profileId || `profile-${Date.now()}`,
      name: session.who || "新的关系对象",
      relation: session.relation || "",
      commonConflict: session.commonConflict || "",
      tactics: session.tactics || "",
      style: session.style || "",
      boundary: session.boundary || "",
      expectation: session.expectation || ""
    };
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
              <p class="eyebrow">对方说一句，我帮你接一句</p>
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
