"use client";

import { useEffect } from "react";
import type { Settings } from "@/lib/sudoku/types";

interface Props {
  open: boolean;
  settings: Settings;
  onChange: (settings: Settings) => void;
  onClose: () => void;
  onReset: () => void;
  onResetAll: () => void;
}

const TOGGLES: Array<[keyof Settings, string, string]> = [
  ["checkMistakes", "Check mistakes immediately", "Gently mark an incorrect entry as you play."],
  ["highlightRelated", "Highlight related cells", "Shade the selected row, column, and box."],
  ["highlightMatching", "Highlight matching numbers", "Find every copy of the selected number."],
  [
    "autoRemoveNotes",
    "Remove notes automatically",
    "Clear a candidate when that number is placed nearby.",
  ],
  ["autoCandidates", "Auto-candidates", "Fill candidate notes for every empty cell."],
  ["sound", "Sound effects", "A subtle tone for important actions. Off by default."],
  ["reducedMotion", "Reduce motion", "Minimise interface transitions."],
];

export function SettingsPanel({ open, settings, onChange, onClose, onReset, onResetAll }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="modal-heading">
          <h2 id="settings-title">Settings</h2>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            autoFocus
          >
            ×
          </button>
        </div>

        <div className="setting-list">
          {TOGGLES.map(([key, label, description]) => (
            <label className="setting-row" key={key}>
              <span>
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={(event) => onChange({ ...settings, [key]: event.target.checked })}
              />
              <i aria-hidden="true" />
            </label>
          ))}
        </div>

        <div className="danger-zone">
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Reset this puzzle and erase its progress?")) onReset();
            }}
          >
            <span>Reset current puzzle</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "Reset all OneGames progress and settings on this device? This cannot be undone.",
                )
              ) {
                onResetAll();
              }
            }}
          >
            <span>Reset all local data</span>
          </button>
        </div>
      </section>
    </div>
  );
}
