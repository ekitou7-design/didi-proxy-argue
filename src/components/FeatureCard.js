export default function FeatureCard(feature) {
  return `
    <button class="feature-card ${feature.color}" data-page="${feature.key}">
      <span class="feature-tone">${feature.tone}</span>
      <div>
        <h3>${feature.title}</h3>
        <p>${feature.desc}</p>
      </div>
      <span class="feature-arrow">›</span>
    </button>
  `;
}
