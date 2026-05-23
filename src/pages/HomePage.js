import FeatureCard from "../components/FeatureCard.js";
import { features } from "../data/mockData.js";

export default function HomePage() {
  return `
    <div class="page home-page">
      <section class="hero-panel">
        <div class="brand-lockup">
          <p class="hero-kana">DIDI DAICHAO</p>
          <h2>滴滴代吵</h2>
          <p>吵不赢？让我来。</p>
        </div>
        <div class="hero-illustration" aria-label="漫画占位插画">
          <div class="burst">哔哔</div>
          <img class="hero-logo" src="/public/app-logo.svg" alt="滴滴代吵 App Logo" />
          <div class="bubble big">逻辑</div>
          <div class="bubble small">边界</div>
        </div>
      </section>

      <section class="feature-list">
        ${features.map((feature) => FeatureCard(feature)).join("")}
      </section>

      <section class="comic-strip">
        <span>今日守则</span>
        <p>有气势，不越界；有逻辑，不内耗。</p>
      </section>
    </div>
  `;
}
