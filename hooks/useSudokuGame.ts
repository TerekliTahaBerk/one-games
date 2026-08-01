"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  candidatesFor,
  conflictDetails,
  getAllPeers,
  getGroupFor,
  isComplete,
  NO_GROUPS,
  solve,
} from "@/lib/sudoku/solver";
import { getDailyPuzzle } from "@/lib/sudoku/puzzles";
import { regionName } from "@/lib/sudoku/regions";
import {
  clearGame,
  DEFAULT_SETTINGS,
  loadGame,
  loadSettings,
  recordCompletion,
  saveGame,
  saveSettings,
} from "@/lib/sudoku/persistence";
import {
  SAVE_VERSION,
  type Board,
  type ColoredGroup,
  type Difficulty,
  type GameSave,
  type Notes,
  type Settings,
  type Snapshot,
  type Stats,
  type SudokuPuzzle,
} from "@/lib/sudoku/types";

function createGame(date: string, difficulty: Difficulty, puzzle: SudokuPuzzle): GameSave {
  return {
    version: SAVE_VERSION,
    puzzleId: puzzle.id,
    date,
    difficulty,
    board: [...puzzle.clues],
    notes: {},
    elapsed: 0,
    started: false,
    completed: false,
    mistakes: 0,
    hints: 0,
    history: [],
    future: [],
  };
}

/** Placing a value clears it from every peer's notes — colored peers included. */
function removePeerNotes(
  notes: Notes,
  index: number,
  value: number,
  groups: readonly ColoredGroup[],
): Notes {
  const next = { ...notes };
  getAllPeers(index, groups).forEach((peer) => {
    if (next[peer]?.includes(value)) next[peer] = next[peer].filter((note) => note !== value);
  });
  return next;
}

function allCandidates(board: Board, groups: readonly ColoredGroup[]): Notes {
  return Object.fromEntries(
    board.map((value, index) => [index, value ? [] : candidatesFor(board, index, groups)]),
  );
}

function playSoftTone(): void {
  try {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 420;
    gain.gain.setValueAtTime(0.025, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.06);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.06);
  } catch {
    // Audio is an optional enhancement.
  }
}

export function useSudokuGame(date: string, difficulty: Difficulty) {
  const puzzle = useMemo(() => getDailyPuzzle(date, difficulty), [date, difficulty]);
  const clues = puzzle.clues;
  const coloredGroups = puzzle.coloredGroups;

  const [game, setGame] = useState<GameSave>(() => createGame(date, difficulty, puzzle));
  const [selected, setSelected] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [paused, setPaused] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [hintMessage, setHintMessage] = useState("");
  const [completionStats, setCompletionStats] = useState<Stats | null>(null);
  const [lastEntry, setLastEntry] = useState<number | null>(null);
  const solution = useMemo(() => solve(clues, coloredGroups), [clues, coloredGroups]);
  const recorded = useRef(false);

  useEffect(() => {
    queueMicrotask(() => {
      setGame(loadGame(date, difficulty, puzzle.id) ?? createGame(date, difficulty, puzzle));
      setSettings(loadSettings());
      setSelected(null);
      setPaused(false);
      setHintMessage("");
      setCompletionStats(null);
      setLastEntry(null);
      recorded.current = false;
      setHydrated(true);
    });
  }, [date, difficulty, puzzle]);

  useEffect(() => {
    if (hydrated) saveGame(game);
  }, [game, hydrated]);

  useEffect(() => {
    if (!game.started || game.completed || paused) return;
    const timer = window.setInterval(() => {
      setGame((current) => ({ ...current, elapsed: current.elapsed + 1 }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [game.started, game.completed, paused]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && game.started && !game.completed) {
        setPaused(true);
        setAnnouncement("Puzzle paused");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [game.started, game.completed]);

  // A short-lived flag so a correct entry can flash without a motion library.
  useEffect(() => {
    if (lastEntry === null) return;
    const timer = window.setTimeout(() => setLastEntry(null), 450);
    return () => window.clearTimeout(timer);
  }, [lastEntry]);

  const finishIfComplete = useCallback(
    (next: GameSave): GameSave => {
      if (
        !isComplete(next.board, coloredGroups) ||
        !solution ||
        next.board.some((value, index) => value !== solution[index])
      ) {
        return next;
      }
      const completed = { ...next, completed: true, completedAt: new Date().toISOString() };
      if (!recorded.current) {
        recorded.current = true;
        setCompletionStats(recordCompletion(completed));
        setAnnouncement("Puzzle complete. Nicely done.");
      }
      return completed;
    },
    [solution, coloredGroups],
  );

  const pushSnapshot = useCallback(
    (current: GameSave): GameSave => ({
      ...current,
      history: [...current.history.slice(-49), { board: current.board, notes: current.notes }],
      future: [],
      started: true,
    }),
    [],
  );

  const enter = useCallback(
    (value: number) => {
      if (selected === null || clues[selected] || paused || game.completed) return;
      setGame((current) => {
        const withHistory = pushSnapshot(current);
        if (notesMode) {
          const existing = withHistory.notes[selected] ?? [];
          const nextValues = existing.includes(value)
            ? existing.filter((note) => note !== value)
            : [...existing, value].sort();
          setAnnouncement(`Candidate ${value} ${existing.includes(value) ? "removed" : "added"}`);
          return { ...withHistory, notes: { ...withHistory.notes, [selected]: nextValues } };
        }
        const board = [...withHistory.board];
        board[selected] = value;
        // One entry is at most one mistake, however many rules it happens to break.
        const incorrect = settings.checkMistakes && solution?.[selected] !== value;
        const cleanedNotes = settings.autoRemoveNotes
          ? removePeerNotes(withHistory.notes, selected, value, coloredGroups)
          : withHistory.notes;
        const notes = settings.autoCandidates
          ? allCandidates(board, coloredGroups)
          : { ...cleanedNotes, [selected]: [] };
        if (settings.sound && !incorrect) playSoftTone();
        if (!incorrect) setLastEntry(selected);
        setAnnouncement(incorrect ? `${value} conflicts with the solution` : `${value} entered`);
        return finishIfComplete({
          ...withHistory,
          board,
          notes,
          mistakes: withHistory.mistakes + (incorrect ? 1 : 0),
        });
      });
    },
    [
      selected,
      clues,
      paused,
      game.completed,
      pushSnapshot,
      notesMode,
      settings.checkMistakes,
      settings.autoRemoveNotes,
      settings.autoCandidates,
      settings.sound,
      solution,
      coloredGroups,
      finishIfComplete,
    ],
  );

  const erase = useCallback(() => {
    if (selected === null || clues[selected] || paused || game.completed) return;
    setGame((current) => {
      if (!current.board[selected] && !current.notes[selected]?.length) return current;
      const withHistory = pushSnapshot(current);
      const board = [...withHistory.board];
      board[selected] = 0;
      return { ...withHistory, board, notes: { ...withHistory.notes, [selected]: [] } };
    });
    setAnnouncement("Cell cleared");
  }, [selected, clues, paused, game.completed, pushSnapshot]);

  const undo = useCallback(() => {
    setGame((current) => {
      const snapshot = current.history.at(-1);
      if (!snapshot) return current;
      const present: Snapshot = { board: current.board, notes: current.notes };
      return {
        ...current,
        board: snapshot.board,
        notes: snapshot.notes,
        history: current.history.slice(0, -1),
        future: [...current.future, present],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setGame((current) => {
      const snapshot = current.future.at(-1);
      if (!snapshot) return current;
      const present: Snapshot = { board: current.board, notes: current.notes };
      return {
        ...current,
        board: snapshot.board,
        notes: snapshot.notes,
        history: [...current.history, present],
        future: current.future.slice(0, -1),
      };
    });
  }, []);

  const hint = useCallback(() => {
    if (!solution || paused || game.completed) return;
    let target = game.board.findIndex(
      (value, index) => !value && candidatesFor(game.board, index, coloredGroups).length === 1,
    );
    if (target === -1) target = game.board.findIndex((value) => !value);
    if (target === -1) return;
    const row = Math.floor(target / 9) + 1;
    const column = (target % 9) + 1;
    const withColour = candidatesFor(game.board, target, coloredGroups);
    const withoutColour = candidatesFor(game.board, target, NO_GROUPS);
    const group = getGroupFor(target, coloredGroups);
    setSelected(target);
    if (withColour.length === 1 && withoutColour.length > 1 && group) {
      setHintMessage(
        `Only ${solution[target]} can go in row ${row}, column ${column} — the other options already sit in its ${regionName(group.color)} cells.`,
      );
    } else if (withColour.length === 1) {
      setHintMessage(`Only ${solution[target]} can go in row ${row}, column ${column}.`);
    } else {
      setHintMessage(`Look again at row ${row}, column ${column}. One value fits cleanly.`);
    }
    setGame((current) => ({ ...current, hints: current.hints + 1, started: true }));
    setAnnouncement(`Hint: row ${row}, column ${column} selected`);
  }, [solution, paused, game, coloredGroups]);

  const updateSettings = useCallback(
    (next: Settings) => {
      setSettings(next);
      if (next.autoCandidates && !settings.autoCandidates) {
        setGame((current) => ({ ...current, notes: allCandidates(current.board, coloredGroups) }));
      }
      saveSettings(next);
    },
    [settings.autoCandidates, coloredGroups],
  );

  const reset = useCallback(() => {
    clearGame(date, difficulty);
    setGame(createGame(date, difficulty, puzzle));
    setSelected(null);
    setPaused(false);
    setHintMessage("");
    setCompletionStats(null);
    setLastEntry(null);
    recorded.current = false;
  }, [date, difficulty, puzzle]);

  const togglePause = useCallback(() => {
    setPaused((value) => {
      setAnnouncement(value ? "Puzzle resumed" : "Puzzle paused");
      return !value;
    });
  }, []);

  const conflicts = useMemo(
    () => conflictDetails(game.board, coloredGroups),
    [game.board, coloredGroups],
  );

  return {
    game,
    puzzle,
    clues,
    coloredGroups,
    selected,
    setSelected,
    notesMode,
    setNotesMode,
    paused,
    togglePause,
    settings,
    updateSettings,
    hydrated,
    announcement,
    hintMessage,
    completionStats,
    conflicts,
    lastEntry,
    enter,
    erase,
    undo,
    redo,
    hint,
    reset,
  };
}
