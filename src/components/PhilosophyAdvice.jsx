import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import { usePhilosophy } from "../hooks/usePhilosophy";
import {
  adviceId,
  recordAdviceShown,
  completePrinciple,
} from "../services/principleHistory";
import { Action, SaveButton } from "./UI";
import { habitLoop } from "../services/behaviorMetrics";

export default function PhilosophyAdvice({
  advice: provided,
  heading,
  showEvidence = true,
  onAction,
  ...options
}) {
  const navigate = useNavigate();
  const generated = usePhilosophy(options);
  const advice = provided || generated.advice;
  const loop = habitLoop(advice.context, advice.contextDetail);
  const { data, refresh } = useStore();
  const [error, setError] = useState("");
  const id = adviceId(advice),
    record = data.mindsetSessions.find((r) => r.id === id);
  useEffect(() => {
    let cancelled = false;
    if (!record)
      recordAdviceShown(advice, { activities: data.salesActivities })
        .then(() => {
          if (!cancelled) return refresh();
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
    return () => {
      cancelled = true;
    };
  }, [id, !!record]);
  return (
    <section
      className="philosophy-advice"
      aria-label={heading || "Coaching principle"}
    >
      {heading && <h3>{heading}</h3>}
      <span className="eyebrow">
        {advice.principleLabel.toUpperCase()}{" "}
        {advice.principle === "METHOD" ? "CHECK" : ""}
      </span>
      <p className="philosophy-insight">
        {advice.spokenInsight || advice.insight}
      </p>
      {showEvidence && (
        <div className="coach-evidence">
          {advice.evidence.map((e, i) => (
            <span key={i}>{e}</span>
          ))}
        </div>
      )}
      <p>{advice.exercise}</p>
      {advice.adaptationReason && (
        <p className="fine">{advice.adaptationReason}</p>
      )}
      {loop && (
        <details>
          <summary>Your action habit</summary>
          <p>
            <strong>Cue:</strong> {loop.cue}
          </p>
          <p>
            <strong>Routine:</strong> {loop.routine}
          </p>
          <p>
            <strong>Reward:</strong> {loop.reward}
          </p>
        </details>
      )}
      <small className="source-label">
        {advice.sourceLabel} · About{" "}
        {advice.duration < 60
          ? advice.duration + " sec"
          : Math.ceil(advice.duration / 60) + " min"}
      </small>
      <p className="philosophy-action">
        <strong>Action:</strong> {advice.action}
      </p>
      <div className="button-row">
        {onAction ? (
          <SaveButton
            onClick={async () => {
              await onAction();
              navigate(advice.actionPath);
            }}
          >
            {advice.actionLabel}
          </SaveButton>
        ) : (
          <Action to={advice.actionPath}>{advice.actionLabel}</Action>
        )}
        <SaveButton
          disabled={record?.completed}
          onClick={async () => {
            setError("");
            await recordAdviceShown(advice, {
              activities: data.salesActivities,
            });
            await completePrinciple(id, { activities: data.salesActivities });
            await refresh();
          }}
        >
          {record?.completed ? "DONE ✓" : "DONE"}
        </SaveButton>
      </div>
      <small>
        {record?.completed
          ? "Completion saved as your report."
          : "Mark DONE after completing the action. Opening a tool does not mark it done."}
      </small>
      {error && (
        <p role="alert" className="error">
          Could not save advice history: {error}
        </p>
      )}
    </section>
  );
}
