"use client";

import type { DnaSettings } from "@/lib/dna/types";
import { useModalFocus } from "./useModalFocus";

export function DnaSettingsPanel({
  open,
  settings,
  onChange,
  onClose,
  onTutorial,
  onReset,
  onResetAll,
}: {
  open: boolean;
  settings: DnaSettings;
  onChange(next: DnaSettings): void;
  onClose(): void;
  onTutorial(): void;
  onReset(): void;
  onResetAll(): void;
}) {
  const modalRef = useModalFocus(open, onClose);
  if (!open) return null;
  const toggle = (key: keyof DnaSettings) =>
    onChange({ ...settings, [key]: !settings[key] });
  return (
    <div className="modal-backdrop">
      <section
        ref={modalRef}
        className="dna-modal settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="OneDna settings"
      >
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close settings"
        >
          ×
        </button>
        <h2>Settings</h2>
        {(
          [
            ["checkMistakes", "Check mistakes"],
            ["highlightRelated", "Highlight row and column"],
            ["highlightBonded", "Highlight bonded partner"],
            ["sound", "Sound"],
            ["reducedMotion", "Reduce motion"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className="setting-row"
            type="button"
            role="switch"
            aria-checked={settings[key]}
            onClick={() => toggle(key)}
          >
            <span>{label}</span>
            <i aria-hidden="true" className={settings[key] ? "is-on" : ""} />
          </button>
        ))}
        <button className="setting-action" type="button" onClick={onTutorial}>
          Replay tutorial
        </button>
        <button
          className="setting-action"
          type="button"
          onClick={() => {
            if (confirm("Reset this OneDna puzzle?")) {
              onReset();
              onClose();
            }
          }}
        >
          Reset current puzzle
        </button>
        <button
          className="setting-action danger"
          type="button"
          onClick={() => {
            if (
              confirm(
                "Reset all OneDna saves, settings, and statistics on this device? Sudoku data will stay untouched.",
              )
            ) {
              onResetAll();
              onClose();
            }
          }}
        >
          Reset all OneDna data
        </button>
      </section>
    </div>
  );
}
