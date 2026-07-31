import type { CSSProperties } from "react";

/**
 * The OneGames character.
 *
 * A sibling to the reader that sits beside the OneRead wordmark: the same
 * construction language — a round, spiky ink body, two oversized eyes, thin
 * limbs, and something held in front — drawn as its own creature rather than a
 * copy. Where the reader holds a book, this one holds a puzzle grid, with the
 * single filled cell that is the signature of the OneGames logo family.
 *
 * Drawn in code so it stays crisp at 16px in a browser tab and at 200px on a
 * social card, from one source.
 */
const INK = "#1A1A1A";
const ACCENT = "#3F6FA8";
const PALE = "#DCE8F7";

const BODY = { x: 50, y: 44, r: 25 };

/**
 * Rounded, uneven quills. Lengths and weights vary so the silhouette reads as
 * drawn rather than generated; the gap at the bottom leaves room for the legs.
 */
const SPIKES = [
  -100, -88, -76, -65, -54, -43, -32, -21, -10, 1, 12, 23, 34, 45, 56, 67, 78, 89, 100, 111,
  122, 133, 144, 155, 166, 177, 188, 199, 210, 221, 232, 243, 254, 265,
].map((degrees, index) => {
  const radians = (degrees * Math.PI) / 180;
  const length = [13, 9, 15, 11, 16, 10, 14, 12][index % 8];
  const width = [4.6, 3.6, 5.2, 4, 5.6, 3.8, 4.8, 4.2][index % 8];
  return {
    x1: BODY.x + Math.cos(radians) * (BODY.r - 3),
    y1: BODY.y + Math.sin(radians) * (BODY.r - 3),
    x2: BODY.x + Math.cos(radians) * (BODY.r + length),
    y2: BODY.y + Math.sin(radians) * (BODY.r + length),
    width,
  };
});

export function BrandCharacter({
  size,
  className = "",
  style,
  title,
}: {
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** Give a title only where the mark is not already labelled by its context. */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`brand-character ${className}`.trim()}
      style={style}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {/* Quills, then body, so the joins disappear under the silhouette. */}
      <g stroke={INK} strokeLinecap="round">
        {SPIKES.map((spike) => (
          <line
            key={`${spike.x2.toFixed(2)}-${spike.y2.toFixed(2)}`}
            x1={spike.x1}
            y1={spike.y1}
            x2={spike.x2}
            y2={spike.y2}
            strokeWidth={spike.width}
          />
        ))}
      </g>
      <circle cx={BODY.x} cy={BODY.y} r={BODY.r} fill={INK} />

      {/* Legs and arms, drawn before the grid so it reads as held in front. */}
      <g stroke={INK} strokeWidth={3.2} strokeLinecap="round" fill="none">
        <path d="M44 66v28" />
        <path d="M56 66v28" />
        <path d="M44 94h5.5" />
        <path d="M56 94h5.5" />
      </g>
      <g stroke={INK} strokeWidth={3} strokeLinecap="round" fill="none">
        <path d="M26 57c-2 9 2 16 11 18" />
        <path d="M74 57c2 9-2 16-11 18" />
      </g>

      {/* Eyes. */}
      <g>
        <circle cx={41} cy={39} r={10.5} fill="#FFFFFF" stroke={INK} strokeWidth={1.6} />
        <circle cx={59} cy={41} r={9.5} fill="#FFFFFF" stroke={INK} strokeWidth={1.6} />
        <circle cx={44} cy={42} r={4.4} fill={INK} />
        <circle cx={61} cy={44} r={4} fill={INK} />
        <circle cx={42.4} cy={40.2} r={1.5} fill="#FFFFFF" />
        <circle cx={59.6} cy={42.4} r={1.4} fill="#FFFFFF" />
      </g>

      {/* The puzzle grid, with the family's one filled cell. */}
      <g>
        <rect
          x={36}
          y={64}
          width={28}
          height={20}
          rx={3}
          fill="#FFFFFF"
          stroke={INK}
          strokeWidth={2.6}
        />
        <rect x={37.2} y={65.2} width={8.1} height={5.5} fill={PALE} />
        <rect x={54.7} y={77.5} width={8.1} height={5.3} fill={ACCENT} />
        <path
          d="M45.3 64v20M54.7 64v20M36 70.7h28M36 77.3h28"
          stroke={INK}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
