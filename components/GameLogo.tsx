type GameLogoName = "sudoku" | "word" | "match" | "numbers";

const labels: Record<GameLogoName, string> = {
  sudoku: "OneSudoku logo",
  word: "OneWord logo",
  match: "OneMatch logo",
  numbers: "OneNumbers logo",
};

export function GameLogo({
  game,
  decorative = false,
  className = "",
}: {
  game: GameLogoName;
  decorative?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`game-logo logo-${game} ${className}`}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : labels[game]}
    >
      {game === "sudoku" && (
        <span className="sudoku-mark">
          {Array.from({ length: 9 }, (_, index) => <i key={index} />)}
        </span>
      )}
      {game === "word" && (
        <span className="word-mark">
          <i>A</i><i>O</i><i>E</i>
        </span>
      )}
      {game === "match" && (
        <span className="match-mark">
          <i /><i /><i />
        </span>
      )}
      {game === "numbers" && (
        <span className="numbers-mark">
          <i>1</i><i>+</i><i>2</i><i>=</i>
        </span>
      )}
    </span>
  );
}
