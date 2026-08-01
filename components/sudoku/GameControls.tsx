"use client";

import {
  EraseIcon,
  HintIcon,
  NotesIcon,
  RedoIcon,
  UndoIcon,
} from "./ControlIcons";

interface Props {
  board: number[];
  notesMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
  disabled: boolean;
  onNumber: (value: number) => void;
  onNotes: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onErase: () => void;
  onHint: () => void;
}

const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function GameControls({
  board,
  notesMode,
  canUndo,
  canRedo,
  disabled,
  onNumber,
  onNotes,
  onUndo,
  onRedo,
  onErase,
  onHint,
}: Props) {
  const counts = board.reduce<Record<number, number>>((result, value) => {
    result[value] = (result[value] ?? 0) + 1;
    return result;
  }, {});

  return (
    <div className="game-controls" aria-label="Game controls">
      <div className="tool-row">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo || disabled}
          aria-label="Undo"
          title="Undo"
        >
          <UndoIcon />
          <small>Undo</small>
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo || disabled}
          aria-label="Redo"
          title="Redo"
        >
          <RedoIcon />
          <small>Redo</small>
        </button>
        <button
          type="button"
          onClick={onErase}
          disabled={disabled}
          aria-label="Erase selected cell"
          title="Erase"
        >
          <EraseIcon />
          <small>Erase</small>
        </button>
        <button
          type="button"
          onClick={onNotes}
          disabled={disabled}
          className={`notes-toggle${notesMode ? " is-active" : ""}`}
          aria-pressed={notesMode}
          aria-label={`Notes mode ${notesMode ? "on" : "off"}`}
          title="Pencil in candidates"
        >
          <NotesIcon />
          <small>Notes</small>
          <span className="toggle-pip" aria-hidden="true">
            {notesMode ? "on" : "off"}
          </span>
        </button>
        <button
          type="button"
          onClick={onHint}
          disabled={disabled}
          aria-label="Get a hint"
          title="Hint"
        >
          <HintIcon />
          <small>Hint</small>
        </button>
      </div>

      <div className="number-row">
        {VALUES.map((value) => {
          const placed = counts[value] ?? 0;
          const remaining = Math.max(0, 9 - placed);
          return (
            <button
              type="button"
              key={value}
              className="number-key"
              onClick={() => onNumber(value)}
              disabled={remaining === 0 || disabled}
              aria-label={`Enter ${value}${remaining === 0 ? ", all placed" : `, ${remaining} left`}`}
            >
              <span className="number-key-value">{value}</span>
              <small aria-hidden="true">{remaining === 0 ? "✓" : remaining}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
