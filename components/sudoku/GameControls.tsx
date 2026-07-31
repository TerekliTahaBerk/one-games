"use client";

interface Props {
  board: number[];
  notesMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onNumber: (value: number) => void;
  onNotes: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onErase: () => void;
  onHint: () => void;
}

export function GameControls(props: Props) {
  const counts = props.board.reduce<Record<number, number>>((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});

  return (
    <div className="game-controls" aria-label="Game controls">
      <div className="tool-row">
        <button type="button" onClick={props.onUndo} disabled={!props.canUndo} aria-label="Undo">
          <span aria-hidden="true">↶</span>
          <small>Undo</small>
        </button>
        <button type="button" onClick={props.onRedo} disabled={!props.canRedo} aria-label="Redo">
          <span aria-hidden="true">↷</span>
          <small>Redo</small>
        </button>
        <button type="button" onClick={props.onErase} aria-label="Erase selected cell">
          <span aria-hidden="true">⌫</span>
          <small>Erase</small>
        </button>
        <button
          type="button"
          onClick={props.onNotes}
          className={props.notesMode ? "is-active" : ""}
          aria-pressed={props.notesMode}
          aria-label={`Notes mode ${props.notesMode ? "on" : "off"}`}
        >
          <span aria-hidden="true">✎</span>
          <small>Notes {props.notesMode ? "on" : "off"}</small>
        </button>
        <button type="button" onClick={props.onHint} aria-label="Get a hint">
          <span aria-hidden="true">?</span>
          <small>Hint</small>
        </button>
      </div>

      <div className="number-row">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => {
          const placed = counts[value] ?? 0;
          return (
            <button
              type="button"
              key={value}
              onClick={() => props.onNumber(value)}
              disabled={placed >= 9}
              aria-label={`Enter ${value}${placed >= 9 ? ", all placed" : ""}`}
            >
              {value}
              <small>{placed >= 9 ? "done" : 9 - placed}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
