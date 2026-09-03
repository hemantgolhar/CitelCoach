import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  philosophies,
  philosophyById,
  normalizePhilosophy,
} from "../data/philosophies";
import { useStore } from "../hooks/useStore";
import PhilosophyAdvice from "../components/PhilosophyAdvice";
import AdviceFeedback from "../components/AdviceFeedback";
import {
  completePrinciple,
  savePrincipleOutcome,
  subsequentActivity,
} from "../services/principleHistory";
import { metrics } from "../utils/metrics";
import {
  Card,
  Select,
  Accordion,
  Field,
  SaveButton,
  Empty,
} from "../components/UI";

export default function BookWisdom() {
  const { data } = useStore();
  const [query, setQuery] = useSearchParams();
  const selected = normalizePhilosophy(
    query.get("philosophy") ||
      data.settings.find((s) => s.id === "preferences")?.philosophy,
  );
  const philosophy = philosophyById(selected),
    view = query.get("view");
  const [principle, setPrinciple] = useState("");
  const history = data.mindsetSessions
    .filter((r) => r.type === "principle" && r.domain !== "sales")
    .sort((a, b) => String(b.shownAt).localeCompare(String(a.shownAt)));
  return (
    <>
      <div className="section-title">
        <h2>Book Wisdom</h2>
        <Link to="/more/settings">Coaching settings ↗</Link>
      </div>
      <div className="tabs">
        <button
          className={view !== "history" ? "active" : ""}
          onClick={() => setQuery({ philosophy: selected })}
        >
          Principles & practice
        </button>
        <button
          className={view === "history" ? "active" : ""}
          onClick={() => setQuery({ view: "history", philosophy: selected })}
        >
          Principle history ({history.length})
        </button>
      </div>
      {view === "history" ? (
        <>
          <p className="fine">
            DONE is self-reported. Subsequent activity shows sequence, not proof
            that advice caused a sale. No automatic proficiency or sales score
            is inferred.
          </p>
          {history.length ? (
            history.map((record) => (
              <HistoryItem key={record.id} record={record} />
            ))
          ) : (
            <Card>
              <Empty>
                Advice you see on Home and in coaching tools will appear here.
              </Empty>
            </Card>
          )}
        </>
      ) : (
        <>
          <Select
            label="Explore a philosophy"
            value={selected}
            onChange={(v) => {
              setPrinciple("");
              setQuery({ philosophy: v });
            }}
            options={philosophies.map((p) => ({ value: p.id, label: p.name }))}
          />
          <Card>
            <h2>{philosophy.name}</h2>
            <p>{philosophy.overview}</p>
            <small>
              {philosophy.sourceLabel}. Original CitelCoach exercises, not book
              quotations or an author’s voice.
            </small>
            <p className="fine">
              These practices prepare attention and behavior. Outcomes also
              depend on customer need, offer, pricing, trust, skill, follow-up
              and market conditions.
            </p>
            <h3>Core principles</h3>
            {philosophy.principles.map((p) => (
              <Accordion key={p.id} title={p.label}>
                <p>{p.overview}</p>
                <h4>When CitelCoach uses it</h4>
                <p>{p.when}</p>
                <h4>Exercise</h4>
                <p>{p.exercise}</p>
                <button
                  className="secondary"
                  onClick={() => setPrinciple(p.id)}
                >
                  Practice {p.label}
                </button>
              </Accordion>
            ))}
          </Card>
          <Card>
            <PhilosophyAdvice
              key={selected + principle}
              context={principle ? "book" : "home"}
              philosophy={selected}
              principle={principle || undefined}
              heading={
                principle
                  ? "Practice this principle"
                  : "One principle for your current sales day"
              }
            />
          </Card>
          <p className="fine">
            Exploring does not change your saved philosophy. Change it in
            Coaching settings.
          </p>
        </>
      )}
    </>
  );
}
function HistoryItem({ record }) {
  const { data, refresh } = useStore();
  const [note, setNote] = useState(record.outcomeNote || "");
  const after = metrics(subsequentActivity(record, data.salesActivities));
  return (
    <Card>
      <span className="eyebrow">
        {record.day} · {record.context} ·{" "}
        {record.completed ? "DONE" : "NOT COMPLETED"}
      </span>
      <h3>
        {philosophyById(record.philosophy).name} ·{" "}
        {record.advice?.principleLabel || record.principle}
      </h3>
      <p>{record.action}</p>
      <Accordion title="Reason, evidence & outcome">
        <p>{record.reason}</p>
        {record.advice?.evidence?.map((e, i) => (
          <p key={i}>{e}</p>
        ))}
        <p>{record.advice?.exercise}</p>
        <p className="fine">
          Shown: {new Date(record.shownAt).toLocaleString()}
          {record.completedAt
            ? " · Done: " + new Date(record.completedAt).toLocaleString()
            : ""}
        </p>
        <p>
          Recorded afterward: {after.visits} visits · {after.followUps}{" "}
          follow-ups · {after.sales} sales.
        </p>
        <Field label="What happened afterward? (optional)">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <SaveButton
          onClick={async () => {
            await savePrincipleOutcome(record.id, note);
            await refresh();
          }}
        >
          Save outcome note
        </SaveButton>
      </Accordion>
      {!record.completed && (
        <div className="button-row">
          <SaveButton
            onClick={async () => {
              await completePrinciple(record.id, {
                activities: data.salesActivities,
              });
              await refresh();
            }}
          >
            DONE
          </SaveButton>
        </div>
      )}
      {record.completed && (
        <Accordion title="Optional action result & usefulness">
          <AdviceFeedback record={record} />
        </Accordion>
      )}
    </Card>
  );
}
