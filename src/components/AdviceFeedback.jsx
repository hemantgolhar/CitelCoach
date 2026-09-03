import React, { useState } from "react";
import { useStore } from "../hooks/useStore";
import { outcomeOptions, RATINGS } from "../services/adviceEffectiveness";
import {
  saveAdviceFeedback,
  dismissAdviceFeedback,
} from "../services/principleHistory";
import { Select, Field, SaveButton } from "./UI";
export default function AdviceFeedback({ record, dismissible = false }) {
  const { data, refresh } = useStore();
  const [outcome, setOutcome] = useState(record.outcome || ""),
    [rating, setRating] = useState(record.usefulness || ""),
    [notes, setNotes] = useState(record.outcomeNote || ""),
    [saved, setSaved] = useState(false);
  return (
    <section className="feedback-form">
      <h3>What happened after this action?</h3>
      <p>{record.action}</p>
      <div className="two-col">
        <Select
          label="Outcome (optional)"
          value={outcome}
          onChange={setOutcome}
          options={[
            { value: "", label: "Skip outcome" },
            ...outcomeOptions(record),
          ]}
        />
        <Select
          label="How useful was this advice? (optional)"
          value={rating}
          onChange={setRating}
          options={[
            { value: "", label: "Skip rating" },
            ...[...RATINGS].reverse(),
          ]}
        />
      </div>
      <Field label="Notes (optional)">
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="button-row">
        <SaveButton
          onClick={async () => {
            await saveAdviceFeedback(record.id, {
              outcome,
              usefulness: rating,
              notes,
              activities: data.salesActivities,
            });
            setSaved(true);
            await refresh();
          }}
        >
          Save feedback
        </SaveButton>
        {dismissible && (
          <SaveButton
            onClick={async () => {
              await dismissAdviceFeedback(record.id);
              await refresh();
            }}
          >
            Skip
          </SaveButton>
        )}
      </div>
      {saved && <p role="status">Feedback saved.</p>}
      <small>
        Reporting a result does not add a visit, sale or XP. Log actual sales
        activity in Live Sales.
      </small>
    </section>
  );
}
