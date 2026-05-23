import { personas } from "../data/mockData.js";

export default function PersonaPage({ activePersona, selectedId }) {
  const selected = personas.find((persona) => persona.id === selectedId);

  return `
    <div class="page persona-page">
      <section class="persona-grid">
        ${personas
          .map(
            (persona) => `
              <button class="persona-card ${selectedId === persona.id ? "selected" : ""}" data-persona="${persona.id}">
                <div class="persona-avatar">${persona.name.slice(0, 2)}</div>
                <div>
                  <h2>${persona.name}</h2>
                  <p>${persona.intro}</p>
                  <div class="tag-row">
                    ${persona.tags.map((tag) => `<span>${tag}</span>`).join("")}
                  </div>
                </div>
              </button>
            `
          )
          .join("")}
      </section>

      <section class="detail-panel">
        <div class="card-title-row">
          <h2>${selected.name}</h2>
          <span class="stamp">${activePersona === selected.name ? "使用中" : "待启用"}</span>
        </div>
        <p class="sample-text">${selected.sample}</p>
        <button class="primary-button" data-action="use-persona">使用这个嘴替</button>
      </section>
    </div>
  `;
}
