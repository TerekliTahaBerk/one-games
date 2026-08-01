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
 * - a pale cell rhythm, plus a single solid accent moment
 *
 * The marks are purely geometric. There are no characters, faces, or mascots,
 * and none of them borrow another puzzle brand's silhouette or palette.
 */
export type GameKey = "sudoku" | "dna";

type Palette = { accent: string; pale: string; wash: string };

export const GAME_PALETTE: Record<GameKey, Palette> = {
  sudoku: { accent: "#3F6FA8", pale: "#DCE8F7", wash: "#EFF5FC" },
  dna: { accent: "#477B72", pale: "#DDEBE6", wash: "#F4F7F3" },
};

export const GAME_LABEL: Record<GameKey, string> = {
  sudoku: "OneSudoku",
  dna: "OneDNA",
};

const INK = "#1A1A1A";
const OUTER = 3.2;
const INNER = 2;

/**
 * The colored-group palette, at mark strength.
 *
 * These are the same families the OneSudoku board uses — `--region-*` in
 * app/globals.css — carried a step deeper, because the board's washes sit under
 * a 30px numeral while these have to survive a 20px lockup.
 */
export const SUDOKU_REGION_PALE = {
  coral: "#F1D9D4",
  mint: "#D8E8DE",
  gold: "#EFE3C8",
} as const;

/** Third-lines of the OneSudoku panel, shared by the grid and its cells. */
const T0 = 6;
const T1 = 23.333;
const T2 = 40.667;
const T3 = 58;

function SudokuMark({ accent }: Palette) {
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
      {/*
        Three colour families crossing the grid, resolving into one solid
        completion cell. The tinted cells share no row and no column, so the
        mark is a valid colored group in miniature — the rule the game plays by,
        drawn rather than described. The solid accent keeps its original corner.
      */}
      <g clipPath="url(#one-sudoku-clip)">
        <rect x={T0} y={T0} width={T3 - T0} height={T3 - T0} fill="#FFFFFF" />
        {cell(0, 2, SUDOKU_REGION_PALE.coral)}
        {cell(1, 1, SUDOKU_REGION_PALE.mint)}
        {cell(2, 0, SUDOKU_REGION_PALE.gold)}
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

/**
 * The OneDNA bond seal.
 *
 * Four soft endpoints form two complementary pairs. Their mirrored paths meet
 * in the middle without becoming a literal laboratory helix: the mark now
 * speaks the game's own visual language — pair, connect, complete — while the
 * rounded frame keeps it visibly related to the OneSudoku tile.
 */
function DnaMark({ accent, pale, wash }: Palette) {
  return (
    <>
      <rect x="6" y="6" width="52" height="52" rx="15" fill={wash} />
      <path
        d="M18 19C27 19 25 31 32 31s5 14 14 14"
        fill="none"
        stroke={INK}
        strokeWidth={INNER}
        strokeLinecap="round"
      />
      <path
        d="M46 19C37 19 39 31 32 31S27 45 18 45"
        fill="none"
        stroke={INK}
        strokeWidth={INNER}
        strokeLinecap="round"
      />
      <circle
        cx="18"
        cy="19"
        r="6"
        fill={pale}
        stroke={INK}
        strokeWidth={INNER}
      />
      <circle
        cx="46"
        cy="19"
        r="6"
        fill="#EFE4D3"
        stroke={INK}
        strokeWidth={INNER}
      />
      <circle
        cx="18"
        cy="45"
        r="6"
        fill="#EFE4D3"
        stroke={INK}
        strokeWidth={INNER}
      />
      <circle
        cx="46"
        cy="45"
        r="6"
        fill={accent}
        stroke={INK}
        strokeWidth={INNER}
      />
      <circle cx="32" cy="31" r="2.5" fill={INK} />
      <rect
        x="6"
        y="6"
        width="52"
        height="52"
        rx="15"
        fill="none"
        stroke={INK}
        strokeWidth={OUTER}
      />
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

export function GameLogo({
  game,
  size = 96,
  decorative = false,
  className = "",
  style,
}: Props) {
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
      {game === "dna" && <DnaMark {...palette} />}
    </svg>
  );
}

/**
 * The family in one small lockup — used wherever the membership (rather than a
 * single game) is the subject: access, pricing, social card.
 */
export function GameLogoFamily({
  size = 46,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const games: GameKey[] = ["sudoku", "dna"];
  return (
    <span
      className={`logo-family ${className}`.trim()}
      role="img"
      aria-label="The OneGames family"
    >
      {games.map((game) => (
        <GameLogo key={game} game={game} size={size} decorative />
      ))}
    </span>
  );
}
