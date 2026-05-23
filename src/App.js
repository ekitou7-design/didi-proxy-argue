import BottomNav from "./components/BottomNav.js";
import HomePage from "./pages/HomePage.js";
import TempArguePage, { initialTempForm } from "./pages/TempArguePage.js";
import PersonaPage from "./pages/PersonaPage.js";
import TrainingPage from "./pages/TrainingPage.js";
import ProfilePage from "./pages/ProfilePage.js";
import { personas, tempReplies, tempStyles } from "./data/mockData.js";

const pageTitles = {
  home: "滴滴代吵",
  temp: "临时代吵",
  persona: "专属嘴替",
  training: "吵架训练场",
  profile: "我的"
};

export default class App {
  constructor(root) {
    this.root = root;
    this.state = {
      page: "home",
      activePersona: "温柔但致命型",
      selectedPersonaId: personas[0].id,
      tempForm: { ...initialTempForm },
      tempStyle: tempStyles[0],
      tempReply: tempReplies[tempStyles[0]],
      copied: false,
      selectedAnswer: null
    };

    this.root.addEventListener("click", (event) => this.handleClick(event));
    this.root.addEventListener("input", (event) => this.handleInput(event));
  }

  setState(nextState) {
    this.state = { ...this.state, ...nextState };
    this.render();
  }

  getPage() {
    if (this.state.page === "temp") {
      return TempArguePage({
        form: this.state.tempForm,
        style: this.state.tempStyle,
        reply: this.state.tempReply,
        copied: this.state.copied
      });
    }

    if (this.state.page === "persona") {
      return PersonaPage({
        activePersona: this.state.activePersona,
        selectedId: this.state.selectedPersonaId
      });
    }

    if (this.state.page === "training") {
      return TrainingPage(this.state.selectedAnswer);
    }

    if (this.state.page === "profile") {
      return ProfilePage({ activePersona: this.state.activePersona });
    }

    return HomePage();
  }

  handleClick(event) {
    const pageTarget = event.target.closest("[data-page]");
    if (pageTarget) {
      this.setState({ page: pageTarget.dataset.page });
      return;
    }

    const styleTarget = event.target.closest("[data-style]");
    if (styleTarget) {
      this.setState({ tempStyle: styleTarget.dataset.style, copied: false });
      return;
    }

    const personaTarget = event.target.closest("[data-persona]");
    if (personaTarget) {
      this.setState({ selectedPersonaId: personaTarget.dataset.persona });
      return;
    }

    const answerTarget = event.target.closest("[data-answer]");
    if (answerTarget) {
      this.setState({ selectedAnswer: Number(answerTarget.dataset.answer) });
      return;
    }

    const actionTarget = event.target.closest("[data-action]");
    if (!actionTarget) return;

    const action = actionTarget.dataset.action;
    if (action === "generate") {
      this.setState({
        tempReply: tempReplies[this.state.tempStyle],
        copied: false
      });
    }

    if (action === "remix") {
      const nextIndex = (tempStyles.indexOf(this.state.tempStyle) + 1) % tempStyles.length;
      const nextStyle = tempStyles[nextIndex];
      this.setState({
        tempStyle: nextStyle,
        tempReply: tempReplies[nextStyle],
        copied: false
      });
    }

    if (action === "copy") {
      navigator.clipboard?.writeText(this.state.tempReply);
      this.setState({ copied: true });
    }

    if (action === "use-persona") {
      const selected = personas.find((persona) => persona.id === this.state.selectedPersonaId);
      this.setState({ activePersona: selected.name });
    }
  }

  handleInput(event) {
    const field = event.target.dataset.field;
    if (!field) return;

    this.state.tempForm = {
      ...this.state.tempForm,
      [field]: event.target.value
    };
  }

  render() {
    const { page } = this.state;

    this.root.innerHTML = `
      <div class="app-shell">
        <div class="phone-frame">
          <header class="top-bar">
            <button class="mini-sticker" data-page="home">DD</button>
            <div>
              <p class="eyebrow">AI 情绪表达嘴替工具</p>
              <h1>${pageTitles[page]}</h1>
            </div>
            <button class="mini-sticker danger" data-page="persona">替</button>
          </header>
          <main class="page-scroll">${this.getPage()}</main>
          ${BottomNav(page)}
        </div>
      </div>
    `;
  }
}
