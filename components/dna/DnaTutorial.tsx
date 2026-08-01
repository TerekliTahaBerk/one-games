"use client";
import { useEffect, useState } from "react";
import { useModalFocus } from "./useModalFocus";

const STEPS = [
  {
    title: "Two pair families.",
    body: "A and T belong together. C and G form the other pair family.",
  },
  {
    title: "Balance every line.",
    body: "Half of every row and column is A–T, half is C–G. Every line also uses all four bases.",
  },
  {
    title: "No twins touching.",
    body: "Matching letters cannot touch horizontally or vertically. Diagonals are fine.",
  },
  {
    title: "Complete each bond.",
    body: "Linked cells complement each other: A with T, and C with G.",
  },
];
export function DnaTutorial({
  open,
  onClose,
}: {
  open: boolean;
  onClose(): void;
}) {
  const [step, setStep] = useState(0);
  const modalRef = useModalFocus(open, onClose);
  useEffect(() => {
    if (open) queueMicrotask(() => setStep(0));
  }, [open]);
  if (!open) return null;
  const current = STEPS[step];
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={modalRef}
        className="dna-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dna-tutorial-title"
      >
        <span className="caption">
          How to play · {step + 1} of {STEPS.length}
        </span>
        <h2 id="dna-tutorial-title">{current.title}</h2>
        <div className="tutorial-sample" aria-hidden="true">
          <span>A</span>
          <b>↔</b>
          <span>T</span>
          <span>C</span>
          <b>↔</b>
          <span>G</span>
        </div>
        <p>{current.body}</p>
        <div className="modal-actions">
          <button type="button" className="text-action" onClick={onClose}>
            Skip
          </button>
          <button
            type="button"
            className="pill-primary"
            autoFocus
            onClick={() => {
              if (step + 1 === STEPS.length) onClose();
              else setStep((value) => value + 1);
            }}
          >
            {step + 1 === STEPS.length ? "Play today’s puzzle" : "Next"}
          </button>
        </div>
      </section>
    </div>
  );
}
