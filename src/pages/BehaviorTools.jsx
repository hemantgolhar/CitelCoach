import React, { useState, useEffect } from "react";
import { useStore } from "../hooks/useStore";
import {
  Card,
  Field,
  Select,
  SaveButton,
  Action,
  Check,
} from "../components/UI";
import { dayKey, labels } from "../utils/metrics";
import {
  minimumDefaults,
  minimumStatus,
  validMinimum,
  detectFrog,
  behaviorSignals,
} from "../services/practicalBehavior";
import {
  activeFocus,
  focusTypes,
  focusRoutes,
  focusProgress,
  startFocus,
  finishFocus,
} from "../services/focusBlocks";
export function HabitCues() {
  const { data } = useStore();
  const stacks = data.settings.filter(
    (r) => r.type === "habitStack" && r.enabled,
  );
  return stacks.length ? (
    <details>
      <summary>Your enabled habit stacks</summary>
      {stacks.map((r) => (
        <p key={r.id}>
          <strong>{r.cue}</strong> → {r.steps.join(" → ")}
        </p>
      ))}
    </details>
  ) : null;
}
export function BehaviorNudge() {
  const { data } = useStore(),
    block = activeFocus(data),
    minimum = minimumStatus(data),
    signals = behaviorSignals(data),
    frog = detectFrog(data);
  const card = block
    ? [
        "FOCUS BLOCK",
        `${block.focusType}: resume or review your saved block.`,
        "/more/focus",
      ]
    : minimum.record || signals.missedDay
      ? [
          "MINIMUM DAY",
          minimum.complete
            ? "Your minimum is complete. Today’s recorded actions count."
            : "Today does not need to be perfect. Protect the habit.",
          "/more/minimum",
        ]
      : frog && frog.priority >= 65
        ? ["TODAY’S FROG", frog.task, "/more/frog"]
        : signals.scattered || signals.lowQuality
          ? ["FOCUS BLOCK", "Give one activity a defined block.", "/more/focus"]
          : null;
  return card ? (
    <Card className="behavior-nudge">
      <span className="eyebrow">{card[0]}</span>
      <p>{card[1]}</p>
      <Action to={card[2]}>OPEN</Action>
    </Card>
  ) : null;
}
export default function BehaviorTools({ mode }) {
  return mode === "focus" ? (
    <Focus />
  ) : mode === "minimum" ? (
    <Minimum />
  ) : mode === "habits" ? (
    <Habits />
  ) : (
    <Frog />
  );
}
function Frog() {
  const { data } = useStore();
  const frog = detectFrog(data);
  return (
    <Card>
      {frog ? (
        <>
          <h2>{frog.task}</h2>
          <p>{frog.reason}</p>
          <p>Estimated effort: {frog.estimatedEffort}</p>
          <Action to={frog.actionRoute}>START THIS TASK</Action>
        </>
      ) : (
        <>
          <p>No clear avoided task in your records yet.</p>
          <Action to="/more/goals">Review today’s goals</Action>
        </>
      )}
    </Card>
  );
}
function Habits() {
  const { data, save } = useStore();
  const [cue, setCue] = useState("After morning tea"),
    [steps, setSteps] = useState(
      "Open CitelCoach\nReview target\nStart first prospect",
    ),
    [edit, setEdit] = useState(null),
    [notice, setNotice] = useState("");
  return (
    <>
      <Card>
        <p>
          Use an existing routine as the cue. One short action per line. These
          remain on your device.
        </p>
        <Field label="Cue">
          <input
            value={cue}
            maxLength={200}
            onChange={(e) => setCue(e.target.value)}
          />
        </Field>
        <Field label="Steps">
          <textarea
            value={steps}
            maxLength={1500}
            onChange={(e) => setSteps(e.target.value)}
          />
        </Field>
        <SaveButton
          onClick={async () => {
            const list = steps
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean);
            if (!cue.trim() || !list.length)
              throw Error("Add a cue and at least one step.");
            await save("settings", {
              ...(edit || {}),
              type: "habitStack",
              cue: cue.trim(),
              steps: list,
              enabled: edit?.enabled ?? true,
            });
            setEdit(null);
            setNotice("Habit stack saved.");
          }}
        >
          Save habit stack
        </SaveButton>
        <p role="status">{notice}</p>
      </Card>
      {data.settings
        .filter((r) => r.type === "habitStack")
        .map((r) => (
          <Card key={r.id}>
            <h3>{r.cue}</h3>
            <p>{r.steps.join(" → ")}</p>
            <SaveButton
              onClick={() => save("settings", { ...r, enabled: !r.enabled })}
            >
              {r.enabled ? "Disable" : "Enable"}
            </SaveButton>
            <button
              className="button secondary"
              onClick={() => {
                setEdit(r);
                setCue(r.cue);
                setSteps(r.steps.join("\n"));
                setNotice("Editing this stack.");
              }}
            >
              Edit
            </button>
          </Card>
        ))}
    </>
  );
}
function Minimum() {
  const { data, save } = useStore();
  const [goals, setGoals] = useState(
    data.settings.find((r) => r.id === "minimum-config")?.goals ||
      minimumDefaults,
  );
  const status = minimumStatus(data);
  return (
    <Card>
      <h2>Today does not need to be perfect. Protect the habit.</h2>
      <p>
        A started day uses a saved copy of these targets. Changing your defaults
        affects future days. Only recorded sales activity counts toward
        completion and your sales-day streak.
      </p>
      {Object.keys(minimumDefaults).map((k) => (
        <Field key={k} label={labels[k]}>
          <input
            type="number"
            min="0"
            max="1000"
            value={goals[k]}
            onChange={(e) =>
              setGoals({ ...goals, [k]: Number(e.target.value) })
            }
          />
        </Field>
      ))}
      <SaveButton
        onClick={async () => {
          if (!validMinimum(goals))
            throw Error(
              "Use whole numbers and include at least one visit or follow-up.",
            );
          await save("settings", {
            id: "minimum-config",
            type: "minimumConfig",
            goals,
          });
        }}
      >
        Save future minimum
      </SaveButton>
      {!status.record ? (
        <SaveButton
          onClick={async () => {
            if (!validMinimum(goals))
              throw Error("Include at least one real sales action.");
            await save("settings", {
              id: "minimum-day:" + dayKey(),
              type: "minimumDay",
              goals: { ...goals },
            });
          }}
        >
          START MINIMUM DAY
        </SaveButton>
      ) : (
        <>
          <h3>
            {status.complete
              ? "Minimum completed"
              : "Today’s minimum is active"}
          </h3>
          {Object.keys(minimumDefaults).map((k) => (
            <p key={k}>
              {labels[k]}: {status.counts[k]} / {status.record.goals[k]}
            </p>
          ))}
          <Action to="/live">Record sales activity</Action>
          <Action to="/more/followups" secondary>
            Complete follow-ups
          </Action>
        </>
      )}
    </Card>
  );
}
function Focus() {
  const { data, refresh } = useStore(),
    block = activeFocus(data);
  const [focusType, setType] = useState(focusTypes[0]),
    [duration, setDuration] = useState(25),
    [planned, setPlanned] = useState(3),
    [distractions, setDistractions] = useState(0),
    [outcome, setOutcome] = useState(""),
    [notes, setNotes] = useState(""),
    [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const progress = block ? focusProgress(block, data, now) : null;
  return (
    <>
      <Card>
        {block ? (
          <>
            <span className="eyebrow">ONE FOCUS · {block.focusType}</span>
            <h2>
              {Math.max(0, Math.ceil(block.duration - progress.actualMinutes))}{" "}
              minutes remaining
            </h2>
            <p>
              Planned: {block.planned} completed {block.focusType.toLowerCase()}{" "}
              actions in {block.duration} minutes.
            </p>
            <p>
              Recorded in this block: {progress.completed} · elapsed{" "}
              {Math.floor(progress.actualMinutes)} minutes
            </p>
            <Action to={focusRoutes[block.focusType]}>
              CONTINUE {block.focusType.toUpperCase()}
            </Action>
            <p>
              When ready to stop, review your work below. Time alone does not
              complete an activity.
            </p>
            <Field label="Distractions (your estimate)">
              <input
                type="number"
                min="0"
                value={distractions}
                onChange={(e) => setDistractions(Number(e.target.value))}
              />
            </Field>
            <Field label="Result">
              <input
                value={outcome}
                maxLength={500}
                onChange={(e) => setOutcome(e.target.value)}
              />
            </Field>
            <Field label="Lesson / next step">
              <textarea
                value={notes}
                maxLength={1500}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <SaveButton
              onClick={async () => {
                await finishFocus(
                  block.id,
                  { distractions, outcome, notes },
                  data,
                );
                await refresh();
                setOutcome("");
                setNotes("");
                setDistractions(0);
              }}
            >
              END & REVIEW BLOCK
            </SaveButton>
          </>
        ) : (
          <>
            <Select
              label="One focus"
              value={focusType}
              onChange={setType}
              options={focusTypes}
            />
            <Select
              label="Minutes"
              value={duration}
              onChange={(v) => setDuration(Number(v))}
              options={[25, 45, 60, 90].map((n) => ({
                value: n,
                label: n + " minutes",
              }))}
            />
            <Field label="Planned completed actions">
              <input
                type="number"
                min="1"
                max="1000"
                value={planned}
                onChange={(e) => setPlanned(Number(e.target.value))}
              />
            </Field>
            <p>
              Choose one task. Put aside unrelated work. Starting earns no XP;
              completing the recorded activity target earns 10 XP once,
              alongside normal activity rewards.
            </p>
            <SaveButton
              onClick={async () => {
                await startFocus({ focusType, duration, planned }, data);
                await refresh();
              }}
            >
              START FOCUS SALES BLOCK
            </SaveButton>
          </>
        )}
      </Card>
      {!block && (
        <details>
          <summary>Completed focus blocks</summary>
          {data.salesExperiments
            .filter((r) => r.type === "focusBlock" && r.endedAt)
            .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
            .map((r) => (
              <Card key={r.id}>
                <h3>
                  {r.focusType} · {r.day}
                </h3>
                <p>
                  Planned {r.planned} in {r.duration} min · completed{" "}
                  {r.completed} in {Math.round(r.actualMinutes)} min
                </p>
                <p>
                  Distractions: {r.distractions} ·{" "}
                  {r.meaningful ? "Activity target met" : "Partial block"}
                </p>
                <p>Result: {r.outcome}</p>
                <p>Lesson: {r.notes}</p>
              </Card>
            ))}
        </details>
      )}
    </>
  );
}
