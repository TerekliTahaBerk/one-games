import type { CSSProperties } from "react";

/**
 * The OneGames identity family.
 *
 * Every mark is drawn in code on a shared 64×64 grid so it stays crisp at any
 * size — a 20px footer lockup and a 220px homepage mark come from the same
 * geometry. The family is held together by one construction language:
 *
 * - the same 3.2 outer stroke and 2 inner stroke, in ink
 * - the same 9-unit corner radius and round joins
 * - one pale accent per game, plus a single solid accent moment
 *
 * The marks are purely geometric. There are no characters, faces, or mascots,
 * and none of them borrow another puzzle brand's silhouette or palette.
 */
export type GameKey = "sudoku" | "word" | "match" | "numbers";

type Palette = { accent: string; pale: string; wash: string };

export const GAME_PALETTE: Record<GameKey, Palette> = {
  sudoku: { accent: "#3F6FA8", pale: "#DCE8F7", wash: "#EFF5FC" },
  word: { accent: "#6E5598", pale: "#E7DFF6", wash: "#F3EFFA" },
  match: { accent: "#9B5C72", pale: "#F5E1E8", wash: "#FAEFF3" },
  numbers: { accent: "#3F7652", pale: "#DFEDE4", wash: "#EFF6F1" },
};

export const GAME_LABEL: Record<GameKey, string> = {
  sudoku: "OneSudoku",
  word: "OneWord",
  match: "OneMatch",
  numbers: "OneNumbers",
};

const INK = "#1A1A1A";
const OUTER = 3.2;
const INNER = 2;

/** Third-lines of the OneSudoku panel, shared by the grid and its cells. */
const T0 = 6;
const T1 = 23.333;
const T2 = 40.667;
const T3 = 58;

const NUMBERS_PANEL =
  "M7 22C7 13.716 13.716 7 22 7H52C54.761 7 57 9.239 57 12V42C57 50.284 50.284 57 42 57H12C9.239 57 7 54.761 7 52Z";

function SudokuMark({ accent, pale }: Palette) {
  const cell = (column: number, row: number, fill: string) => (
    <rect
      x={[T0, T1, T2][column]}
      y={[T0, T1, T2][row]}
      width={T1 - T0}
      height={T1 - T0}
      fill={fill}
    />
  );

  return (
    <>
      {/* A pale cell rhythm resolving into one solid completion cell. */}
      <g clipPath="url(#one-sudoku-clip)">
        <rect x={T0} y={T0} width={T3 - T0} height={T3 - T0} fill="#FFFFFF" />
        {cell(0, 0, pale)}
        {cell(1, 1, pale)}
        {cell(2, 2, accent)}
      </g>
      <path
        d={`M${T1} ${T0}V${T3}M${T2} ${T0}V${T3}M${T0} ${T1}H${T3}M${T0} ${T2}H${T3}`}
        stroke={INK}
        strokeWidth={INNER}
        strokeLinecap="round"
      />
      <rect
        x={T0}
        y={T0}
        width={T3 - T0}
        height={T3 - T0}
        rx={9}
        fill="none"
        stroke={INK}
        strokeWidth={OUTER}
      />
    </>
  );
}

/** Three tiles resting on — and leaning against — one shared base. */
const WORD_BASE_Y = 47;
const WORD_TILES = [
  { x: 7.5, rotate: -9 },
  { x: 39.5, rotate: 9 },
];
const WORD_TILE_Y = 21;
const WORD_TILE_HEIGHT = 26;

function WordMark({ accent, pale }: Palette) {
  return (
    <>
      <rect
        x={6}
        y={WORD_BASE_Y}
        width={52}
        height={8}
        rx={4}
        fill={pale}
        stroke={INK}
        strokeWidth={OUTER}
        strokeLinejoin="round"
      />
      {WORD_TILES.map((tile) => (
        <rect
          key={tile.x}
          x={tile.x}
          y={WORD_TILE_Y}
          width={17}
          height={WORD_TILE_HEIGHT}
          rx={4.5}
          fill={pale}
          stroke={INK}
          strokeWidth={OUTER}
          strokeLinejoin="round"
          // Pivot on the base so the tiles lean rather than float.
          transform={`rotate(${tile.rotate} ${tile.x + 8.5} ${WORD_BASE_Y})`}
        />
      ))}
      {/* The upright middle tile is this mark's single solid accent moment. */}
      <rect
        x={23.5}
        y={WORD_TILE_Y}
        width={17}
        height={WORD_TILE_HEIGHT}
        rx={4.5}
        fill={accent}
        stroke={INK}
        strokeWidth={OUTER}
        strokeLinejoin="round"
      />
    </>
  );
}

/**
 * Three rings whose centres each sit exactly one radius from the shared middle,
 * so every ring passes through the same point.
 */
const MATCH_CENTRE = { x: 32, y: 34 };
const MATCH_RADIUS = 13;
const MATCH_RINGS = [-90, 30, 150].map((degrees) => {
  const radians = (degrees * Math.PI) / 180;
  return {
    cx: MATCH_CENTRE.x + Math.cos(radians) * MATCH_RADIUS,
    cy: MATCH_CENTRE.y + Math.sin(radians) * MATCH_RADIUS,
  };
});

function MatchMark({ accent, pale }: Palette) {
  return (
    <>
      {MATCH_RINGS.map((ring) => (
        <circle
          key={`${ring.cx.toFixed(2)}-${ring.cy.toFixed(2)}`}
          cx={ring.cx}
          cy={ring.cy}
          r={MATCH_RADIUS}
          fill={pale}
          fillOpacity={0.65}
          stroke={INK}
          strokeWidth={OUTER}
        />
      ))}
      <circle
        cx={MATCH_CENTRE.x}
        cy={MATCH_CENTRE.y}
        r={5}
        fill={accent}
        stroke={INK}
        strokeWidth={INNER}
      />
    </>
  );
}

function NumbersMark({ accent, pale }: Palette) {
  return (
    <>
      <path d={NUMBERS_PANEL} fill="#FFFFFF" />
      <g clipPath="url(#one-numbers-clip)">
        <rect x={7} y={7} width={25} height={25} fill={pale} />
        <rect x={32} y={32} width={25} height={25} fill={pale} />
      </g>
      {/* Plus and equals, drawn as strokes so they never depend on a font. */}
      <path
        d="M19.5 14.5v11M14 20h11"
        stroke={accent}
        strokeWidth={INNER + 0.6}
        strokeLinecap="round"
      />
      <path
        d="M39 41h11M39 47.5h11"
        stroke={accent}
        strokeWidth={INNER + 0.6}
        strokeLinecap="round"
      />
      <path d="M32 7v50M7 32h50" stroke={INK} strokeWidth={INNER} strokeLinecap="round" />
      <path d={NUMBERS_PANEL} fill="none" stroke={INK} strokeWidth={OUTER} strokeLinejoin="round" />
    </>
  );
}

interface Props {
  game: GameKey;
  /** Rendered size in px. The mark is vector, so any value stays sharp. */
  size?: number;
  /** Decorative marks are hidden from assistive technology. */
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function GameLogo({ game, size = 96, decorative = false, className = "", style }: Props) {
  const palette = GAME_PALETTE[game];

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`game-logo game-logo-${game} ${className}`.trim()}
      style={style}
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : `${GAME_LABEL[game]} logo`}
      focusable="false"
    >
      {game === "sudoku" && (
        <>
          <defs>
            <clipPath id="one-sudoku-clip">
              <rect x={T0} y={T0} width={T3 - T0} height={T3 - T0} rx={9} />
            </clipPath>
          </defs>
          <SudokuMark {...palette} />
        </>
      )}
      {game === "word" && <WordMark {...palette} />}
      {game === "match" && <MatchMark {...palette} />}
      {game === "numbers" && (
        <>
          <defs>
            <clipPath id="one-numbers-clip">
              <path d={NUMBERS_PANEL} />
            </clipPath>
          </defs>
          <NumbersMark {...palette} />
        </>
      )}
    </svg>
  );
}

/**
 * The four marks nested into one small lockup — used wherever the membership
 * (rather than a single game) is the subject: access, pricing, social card.
 */
export function GameLogoFamily({
  size = 46,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const games: GameKey[] = ["sudoku", "word", "match", "numbers"];
  return (
    <span className={`logo-family ${className}`.trim()} role="img" aria-label="The OneGames family">
      {games.map((game) => (
        <GameLogo key={game} game={game} size={size} decorative />
      ))}
    </span>
  );
}
