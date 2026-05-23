export default function FeatureCard(feature) {
  return `
    <button class="feature-card ${feature.color}" data-page="${feature.key}">
      <span class="feature-tone">${feature.mark}</span>
      <div>
        <h3>${feature.title}</h3>
        <p>${feature.desc}</p>
        <span class="enter-pill">${feature.tone}</span>
      </div>
      <span class="feature-arrow">›</span>
    </button>
  `;
}
