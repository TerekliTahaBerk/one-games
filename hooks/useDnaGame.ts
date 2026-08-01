"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nextLogicalDeduction } from "@/lib/dna/logical-solver";
import { findConflicts, isSolved } from "@/lib/dna/rules";
import { getDailyDnaPuzzle } from "@/lib/dna/puzzles";
import {
  clearDnaGame,
  DEFAULT_DNA_SETTINGS,
  loadDnaGame,
  loadDnaSettings,
  recordDnaCompletion,
  saveDnaGame,
  saveDnaSettings,
} from "@/lib/dna/persistence";
import {
  DNA_SAVE_VERSION,
  type DnaBase,
  type DnaDifficulty,
  type DnaGameSave,
  type DnaSettings,
  type DnaSnapshot,
  type DnaStats,
} from "@/lib/dna/types";

function fresh(
  date: string,
  difficulty: DnaDifficulty,
  puzzle: ReturnType<typeof getDailyDnaPuzzle>,
): DnaGameSave {
  return {
    version: DNA_SAVE_VERSION,
    puzzleId: puzzle.id,
    date,
    difficulty,
    size: puzzle.size,
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

export function useDnaGame(date: string, difficulty: DnaDifficulty) {
  const puzzle = useMemo(
    () => getDailyDnaPuzzle(date, difficulty),
    [date, difficulty],
  );
  const [game, setGame] = useState(() => fresh(date, difficulty, puzzle));
  const [selected, setSelected] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettingsState] =
    useState<DnaSettings>(DEFAULT_DNA_SETTINGS);
  const [announcement, setAnnouncement] = useState("");
  const [hintMessage, setHintMessage] = useState("");
  const [hintCells, setHintCells] = useState<number[]>([]);
  const [completionStats, setCompletionStats] = useState<DnaStats | null>(null);
  const recorded = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const conflicts = useMemo(
    () => findConflicts(game.board, puzzle),
    [game.board, puzzle],
  );

  useEffect(() => {
    queueMicrotask(() => {
      setGame(
        loadDnaGame(date, difficulty, puzzle.id, puzzle.size) ??
          fresh(date, difficulty, puzzle),
      );
      setSettingsState(loadDnaSettings());
      setSelected(null);
      setPaused(false);
      setHintMessage("");
      setHintCells([]);
      setCompletionStats(null);
      recorded.current = false;
      setHydrated(true);
    });
  }, [date, difficulty, puzzle]);
  useEffect(() => {
    if (hydrated) saveDnaGame(game);
  }, [game, hydrated]);
  useEffect(() => {
    if (!game.started || game.completed || paused) return;
    const timer = window.setInterval(
      () =>
        setGame((current) => ({ ...current, elapsed: current.elapsed + 1 })),
      1000,
    );
    return () => clearInterval(timer);
  }, [game.started, game.completed, paused]);
  useEffect(() => {
    const visible = () => {
      if (document.hidden && game.started && !game.completed) {
        setPaused(true);
        setAnnouncement("Puzzle paused");
      }
    };
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, [game.started, game.completed]);
  useEffect(
    () => () => {
      void audio.current?.close();
      audio.current = null;
    },
    [],
  );

  const finish = useCallback(
    (next: DnaGameSave) => {
      if (
        !isSolved(next.board, puzzle) ||
        next.board.some((base, index) => base !== puzzle.solution[index])
      )
        return next;
      const completed = {
        ...next,
        completed: true,
        completedAt: new Date().toISOString(),
      };
      if (!recorded.current) {
        recorded.current = true;
        setCompletionStats(recordDnaCompletion(completed));
        setAnnouncement("Puzzle complete. Beautifully paired.");
      }
      return completed;
    },
    [puzzle],
  );
  const snapshot = useCallback(
    (current: DnaGameSave) => ({
      ...current,
      started: true,
      history: [
        ...current.history.slice(-49),
        { board: current.board, notes: current.notes },
      ],
      future: [],
    }),
    [],
  );

  const enter = useCallback(
    (base: DnaBase) => {
      if (
        selected === null ||
        puzzle.clues[selected] ||
        paused ||
        game.completed
      )
        return;
      setGame((current) => {
        const next = snapshot(current),
          board = [...next.board];
        board[selected] = base;
        const incorrect =
          settings.checkMistakes && puzzle.solution[selected] !== base;
        if (settings.sound && !incorrect) {
          const existing =
            audio.current?.state === "closed" ? null : audio.current;
          audio.current = existing ?? new AudioContext();
          const oscillator = audio.current.createOscillator();
          const gain = audio.current.createGain();
          oscillator.frequency.value = 420;
          gain.gain.setValueAtTime(0.025, audio.current.currentTime);
          gain.gain.exponentialRampToValueAtTime(
            0.0001,
            audio.current.currentTime + 0.06,
          );
          oscillator.connect(gain).connect(audio.current.destination);
          oscillator.addEventListener(
            "ended",
            () => {
              oscillator.disconnect();
              gain.disconnect();
            },
            { once: true },
          );
          oscillator.start();
          oscillator.stop(audio.current.currentTime + 0.06);
        }
        setAnnouncement(
          incorrect ? `${base} does not fit here` : `${base} entered`,
        );
        setHintMessage("");
        setHintCells([]);
        return finish({
          ...next,
          board,
          mistakes: next.mistakes + (incorrect ? 1 : 0),
        });
      });
    },
    [
      selected,
      puzzle,
      paused,
      game.completed,
      snapshot,
      settings.checkMistakes,
      settings.sound,
      finish,
    ],
  );
  const erase = useCallback(() => {
    if (selected === null || puzzle.clues[selected] || paused || game.completed)
      return;
    setGame((current) => {
      if (!current.board[selected]) return current;
      const next = snapshot(current),
        board = [...next.board];
      board[selected] = null;
      return { ...next, board };
    });
    setAnnouncement("Cell cleared");
  }, [selected, puzzle.clues, paused, game.completed, snapshot]);
  const undo = useCallback(
    () =>
      setGame((current) => {
        const prior = current.history.at(-1);
        if (!prior) return current;
        const present: DnaSnapshot = {
          board: current.board,
          notes: current.notes,
        };
        return {
          ...current,
          board: [...prior.board],
          notes: prior.notes,
          history: current.history.slice(0, -1),
          future: [...current.future, present],
          completed: false,
        };
      }),
    [],
  );
  const redo = useCallback(
    () =>
      setGame((current) => {
        const next = current.future.at(-1);
        if (!next) return current;
        const present: DnaSnapshot = {
          board: current.board,
          notes: current.notes,
        };
        return finish({
          ...current,
          board: [...next.board],
          notes: next.notes,
          history: [...current.history, present],
          future: current.future.slice(0, -1),
        });
      }),
    [finish],
  );
  const hint = useCallback(() => {
    const deduction = nextLogicalDeduction(game.board, puzzle);
    setGame((current) => ({
      ...current,
      started: true,
      hints: current.hints + 1,
    }));
    if (!deduction) {
      setHintMessage(
        "No supported logical move is available from this position. Check highlighted conflicts first.",
      );
      setHintCells([...conflicts.keys()]);
      return;
    }
    setHintMessage(deduction.explanation);
    setHintCells([...deduction.targetCells, ...deduction.supportingCells]);
    setSelected(deduction.targetCells[0]);
    setAnnouncement(`Hint: ${deduction.explanation}`);
  }, [game.board, puzzle, conflicts]);
  const reset = useCallback(() => {
    clearDnaGame(date, difficulty);
    setGame(fresh(date, difficulty, puzzle));
    setSelected(null);
    setPaused(false);
    setHintMessage("");
    setHintCells([]);
    recorded.current = false;
  }, [date, difficulty, puzzle]);
  const setSettings = useCallback((next: DnaSettings) => {
    setSettingsState(next);
    saveDnaSettings(next);
  }, []);
  const togglePause = useCallback(() => setPaused((value) => !value), []);

  return {
    puzzle,
    game,
    selected,
    setSelected,
    paused,
    togglePause,
    hydrated,
    settings,
    setSettings,
    announcement,
    hintMessage,
    hintCells,
    completionStats,
    conflicts,
    enter,
    erase,
    undo,
    redo,
    hint,
    reset,
  };
}
