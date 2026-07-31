/**
 * The OneGames character as an SVG string, for the build-time asset scripts.
 *
 * This mirrors the geometry in components/BrandCharacter.tsx — the component is
 * the source of truth for the running app, this is the source of truth for the
 * favicon and the social card. Change one, change the other.
 */
const INK = "#1A1A1A";
const ACCENT = "#3F6FA8";
const PALE = "#DCE8F7";
const BODY = { x: 50, y: 44, r: 25 };

const SPIKES = Array.from({ length: 34 }, (_, index) => -108 + index * 10.6)
  .filter((degrees) => degrees < 58 || degrees > 122)
  .map((degrees, index) => {
    const radians = (degrees * Math.PI) / 180;
    const length = [12, 8, 14, 10, 15, 9, 13, 11][index % 8];
    const width = [4.4, 3.4, 5, 3.8, 5.4, 3.6, 4.6, 4][index % 8];
    return {
      x1: BODY.x + Math.cos(radians) * (BODY.r - 3),
      y1: BODY.y + Math.sin(radians) * (BODY.r - 3),
      x2: BODY.x + Math.cos(radians) * (BODY.r + length),
      y2: BODY.y + Math.sin(radians) * (BODY.r + length),
      width,
    };
  });

/** The drawing itself, on a 100×100 grid, without an `<svg>` wrapper. */
export function characterBody() {
  return `<g stroke="${INK}" stroke-linecap="round">
${SPIKES.map(
  (s) =>
    `    <line x1="${s.x1.toFixed(2)}" y1="${s.y1.toFixed(2)}" x2="${s.x2.toFixed(2)}" y2="${s.y2.toFixed(2)}" stroke-width="${s.width}"/>`,
).join("\n")}
  </g>
  <circle cx="${BODY.x}" cy="${BODY.y}" r="${BODY.r}" fill="${INK}"/>
  <g stroke="${INK}" stroke-width="3.2" stroke-linecap="round" fill="none">
    <path d="M44 66v28"/><path d="M56 66v28"/><path d="M44 94h5.5"/><path d="M56 94h5.5"/>
  </g>
  <g stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none">
    <path d="M26 57c-2 9 2 16 11 18"/><path d="M74 57c2 9-2 16-11 18"/>
  </g>
  <circle cx="41" cy="39" r="10.5" fill="#FFFFFF" stroke="${INK}" stroke-width="1.6"/>
  <circle cx="59" cy="41" r="9.5" fill="#FFFFFF" stroke="${INK}" stroke-width="1.6"/>
  <circle cx="44" cy="42" r="4.4" fill="${INK}"/>
  <circle cx="61" cy="44" r="4" fill="${INK}"/>
  <circle cx="42.4" cy="40.2" r="1.5" fill="#FFFFFF"/>
  <circle cx="59.6" cy="42.4" r="1.4" fill="#FFFFFF"/>
  <rect x="36" y="64" width="28" height="20" rx="3" fill="#FFFFFF" stroke="${INK}" stroke-width="2.6"/>
  <rect x="37.2" y="65.2" width="8.1" height="5.5" fill="${PALE}"/>
  <rect x="54.7" y="77.5" width="8.1" height="5.3" fill="${ACCENT}"/>
  <path d="M45.3 64v20M54.7 64v20M36 70.7h28M36 77.3h28" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>`;
}

export function characterSvg(size) {
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  ${characterBody()}
</svg>`;
}
