import { navItems } from "../data/mockData.js";

export default function BottomNav(activePage) {
  return `
    <nav class="bottom-nav" aria-label="底部导航">
      ${navItems
        .map(
          (item) => `
            <button class="nav-item ${activePage === item.key ? "active" : ""}" data-page="${item.key}">
              <span class="nav-mark">${item.mark}</span>
              <span>${item.label}</span>
            </button>
          `
        )
        .join("")}
    </nav>
  `;
}
