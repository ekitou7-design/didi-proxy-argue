export function FeatureIcon(key) {
  const icons = {
    temp: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M10 13h21a8 8 0 0 1 0 16H20l-9 7v-7h-1a8 8 0 0 1 0-16Z" />
        <path d="M33 20h5a6 6 0 0 1 0 12h-3l-6 5v-5h-3" />
      </svg>
    `,
    persona: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M14 16c2-7 18-7 20 0l2 13c1 7-23 7-24 0l2-13Z" />
        <path d="M18 25c2 3 10 3 12 0" />
        <path d="M19 18h.2M29 18h.2" />
      </svg>
    `,
    training: `
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path d="M13 11h22v8c0 9-5 15-11 18-6-3-11-9-11-18v-8Z" />
        <path d="M18 24h12M24 18v12" />
      </svg>
    `
  };
  return icons[key] || `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M12 12h24v24H12z" />
    </svg>
  `;
}
