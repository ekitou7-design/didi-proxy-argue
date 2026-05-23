import BottomNav from "./components/BottomNav.js";
import HomePage from "./pages/HomePage.js";
import TempArguePage, { initialTempForm } from "./pages/TempArguePage.js";
import PersonaPage from "./pages/PersonaPage.js";
import TrainingPage from "./pages/TrainingPage.js";
import ProfilePage from "./pages/ProfilePage.js";
import {
  buildPersonaReplyResult,
  buildTempArgueResult,
  buildTrainingRound,
  initialPersonaForm,
  initialTrainingState,
  personas,
  tempIntensities
} from "./data/mockData.js";

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
      tempPersonaId: personas[0].id,
      tempIntensity: tempIntensities[0],
      tempResult: buildTempArgueResult({
        form: initialTempForm,
        personaId: personas[0].id,
        intensity: tempIntensities[0]
      }),
      personaForm: { ...initialPersonaForm },
      personaResult: buildPersonaReplyResult(initialPersonaForm),
      training: { ...initialTrainingState },
      copied: false,
      personaCopied: false,
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
        personaId: this.state.tempPersonaId,
        intensity: this.state.tempIntensity,
        result: this.state.tempResult,
        copied: this.state.copied
      });
    }

    if (this.state.page === "persona") {
      return PersonaPage({
        form: this.state.personaForm,
        result: this.state.personaResult,
        copied: this.state.personaCopied
      });
    }

    if (this.state.page === "training") {
      return TrainingPage(this.state.training);
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

    const intensityTarget = event.target.closest("[data-intensity]");
    if (intensityTarget) {
      this.setState({ tempIntensity: intensityTarget.dataset.intensity, copied: false });
      return;
    }

    const tempPersonaTarget = event.target.closest("[data-temp-persona]");
    if (tempPersonaTarget) {
      this.setState({ tempPersonaId: tempPersonaTarget.dataset.tempPersona, copied: false });
      return;
    }

    const trainingSceneTarget = event.target.closest("[data-training-scene]");
    if (trainingSceneTarget) {
      this.setState({
        training: {
          ...this.state.training,
          scene: trainingSceneTarget.dataset.trainingScene,
          round: 1,
          currentAttack: null,
          result: null,
          report: null
        }
      });
      return;
    }

    const trainingDifficultyTarget = event.target.closest("[data-training-difficulty]");
    if (trainingDifficultyTarget) {
      this.setState({
        training: {
          ...this.state.training,
          difficulty: trainingDifficultyTarget.dataset.trainingDifficulty,
          round: 1,
          currentAttack: null,
          result: null,
          report: null
        }
      });
      return;
    }

    const trainingOpponentTarget = event.target.closest("[data-training-opponent]");
    if (trainingOpponentTarget) {
      this.setState({
        training: {
          ...this.state.training,
          opponentType: trainingOpponentTarget.dataset.trainingOpponent,
          round: 1,
          currentAttack: null,
          result: null,
          report: null
        }
      });
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
        tempResult: buildTempArgueResult({
          form: this.state.tempForm,
          personaId: this.state.tempPersonaId,
          intensity: this.state.tempIntensity
        }),
        copied: false
      });
    }

    if (action === "remix") {
      const nextIndex =
        (tempIntensities.indexOf(this.state.tempIntensity) + 1) % tempIntensities.length;
      const nextIntensity = tempIntensities[nextIndex];
      this.setState({
        tempIntensity: nextIntensity,
        tempResult: buildTempArgueResult({
          form: this.state.tempForm,
          personaId: this.state.tempPersonaId,
          intensity: nextIntensity
        }),
        copied: false
      });
    }

    if (action === "copy") {
      navigator.clipboard?.writeText(this.state.tempResult.recommended);
      this.setState({ copied: true });
    }

    if (action === "generate-persona") {
      this.setState({
        personaResult: buildPersonaReplyResult(this.state.personaForm),
        personaCopied: false
      });
    }

    if (action === "copy-persona") {
      navigator.clipboard?.writeText(this.state.personaResult.myVersion);
      this.setState({ personaCopied: true });
    }

    if (action === "gentle-persona") {
      this.setState({
        personaResult: {
          ...this.state.personaResult,
          myVersion: this.state.personaResult.softer
        },
        personaCopied: false
      });
    }

    if (action === "score-training") {
      const result = buildTrainingRound(this.state.training);
      this.setState({
        training: {
          ...this.state.training,
          result,
          report: null
        }
      });
    }

    if (action === "next-round") {
      this.setState({
        training: {
          ...this.state.training,
          round: this.state.training.round + 1,
          currentAttack: this.state.training.result?.nextAttack || this.state.training.currentAttack,
          reply: "",
          result: null,
          report: null
        }
      });
    }

    if (action === "finish-training") {
      const result = this.state.training.result || buildTrainingRound(this.state.training);
      this.setState({
        training: {
          ...this.state.training,
          result,
          report: result.report
        }
      });
    }

    if (action === "use-persona") {
      const selected = personas.find((persona) => persona.id === this.state.selectedPersonaId);
      this.setState({ activePersona: selected.name });
    }
  }

  handleInput(event) {
    const field = event.target.dataset.field;
    const personaField = event.target.dataset.personaField;
    const trainingField = event.target.dataset.trainingField;

    if (trainingField) {
      this.state.training = {
        ...this.state.training,
        [trainingField]: event.target.value
      };
      return;
    }

    if (personaField) {
      this.state.personaForm = {
        ...this.state.personaForm,
        [personaField]: event.target.value
      };
      return;
    }

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
