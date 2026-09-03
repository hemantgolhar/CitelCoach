import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import {
  dayKey,
  defaults,
  labels,
  metrics,
  calculate,
  bottleneck,
} from "../utils/metrics";
import { products, objections } from "../data/content";
import { MasteryAutopsy } from "./SalesMastery";
import {
  followUpObjective,
  classifyFollowUp,
} from "../services/salesMasteryEngine";
import { ObservationFields, MasteryAdvice } from "../components/SalesMastery";
import { salesMastery } from "../services/salesMasteryEngine";
import {
  Card,
  Field,
  Select,
  Check,
  SaveButton,
  Action,
  Empty,
} from "../components/UI";
export default function Planning({ mode }) {
  if (mode === "autopsy") return <MasteryAutopsy />;
  return mode === "goals" ? (
    <Goals />
  ) : mode === "sprint" ? (
    <Sprint />
  ) : mode === "followups" ? (
    <Followups />
  ) : mode === "calculator" ? (
    <Calculator />
  ) : (
    <Review autopsy={mode === "autopsy"} />
  );
}
function Goals() {
  const { data, save } = useStore(),
    [goals, setGoals] = useState(
      data.dailyGoals.find((g) => g.id === dayKey()) || defaults,
    ),
    [done, setDone] = useState(false);
  const actual = metrics(
    data.salesActivities.filter((r) => r.day === dayKey()),
  );
  return (
    <Card>
      <h2>Today’s targets</h2>
      <p>
        Targets apply to today. Zero means you are not targeting that activity.
      </p>
      <div className="number-grid">
        {Object.entries(labels).map(([k, l]) => (
          <Field label={l + (k === "revenue" ? " (₹)" : "")} key={k}>
            <input
              type="number"
              min="0"
              step={k === "revenue" ? "0.01" : "1"}
              value={goals[k]}
              onChange={(e) => setGoals({ ...goals, [k]: e.target.value })}
            />
            <small>
              Actual today: {k === "revenue" ? "₹" : ""}
              {actual[k].toLocaleString("en-IN")} / {goals[k]}
            </small>
          </Field>
        ))}
      </div>
      <SaveButton
        onClick={async () => {
          for (const k of Object.keys(defaults))
            if (
              goals[k] === "" ||
              !Number.isFinite(+goals[k]) ||
              +goals[k] < 0 ||
              (k !== "revenue" && !Number.isInteger(+goals[k]))
            )
              throw Error(
                "Use non-negative numbers, and whole numbers for activity goals.",
              );
          await save("dailyGoals", {
            ...Object.fromEntries(
              Object.keys(defaults).map((k) => [k, +goals[k]]),
            ),
            id: dayKey(),
          });
          setDone(true);
        }}
      >
        Save today’s goals
      </SaveButton>
      {done && (
        <p role="status" className="notice">
          Goals saved.
        </p>
      )}
    </Card>
  );
}
function Followups() {
  const { data } = useStore(),
    completed = new Set(
      data.salesActivities.map((a) => a.followUpOf).filter(Boolean),
    ),
    pending = data.salesActivities
      .filter((a) => a.followUpDate && !completed.has(a.id))
      .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));
  return (
    <>
      {pending.length ? (
        pending.map((a) => (
          <Card key={a.id}>
            <span className="eyebrow">
              {a.followUpDate < dayKey()
                ? "OVERDUE"
                : a.followUpDate === dayKey()
                  ? "DUE TODAY"
                  : "UPCOMING"}{" "}
              · {a.followUpDate}
            </span>
            <h2>{a.product}</h2>
            <p>{a.reason || "Reconnect with the decision maker."}</p>
            <p>
              <strong>
                {a.followUpPurpose || classifyFollowUp(a.reason)}:
              </strong>{" "}
              {followUpObjective(
                a.followUpPurpose || classifyFollowUp(a.reason),
              )}
            </p>
            <p>{a.notes}</p>
            <Action to={"/live?followup=" + a.id}>Record follow-up</Action>
          </Card>
        ))
      ) : (
        <Card>
          <Empty>
            No pending follow-ups. Agree on the next step during your next
            visit.
          </Empty>
          <Action to="/live">Start selling</Action>
        </Card>
      )}
    </>
  );
}
function Sprint() {
  const { data, save } = useStore(),
    existing = data.salesExperiments.find(
      (s) => s.type === "sprint" && !s.completed,
    ),
    [duration, setDuration] = useState("30"),
    [goals, setGoals] = useState({ visits: 5, decisionMakers: 3, demos: 2 }),
    [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const active = existing,
    m = metrics(
      active
        ? data.salesActivities.filter(
            (a) =>
              a.createdAt >= active.startedAt && a.createdAt <= active.endsAt,
          )
        : [],
    ),
    elapsed = active
      ? Math.max(
          0,
          Math.floor((clock - new Date(active.startedAt).getTime()) / 60000),
        )
      : 0,
    complete =
      active && Object.keys(goals).every((k) => m[k] >= active.goals[k]);
  return (
    <Card>
      <h2>{active ? "One focused block." : "Set up your sales sprint."}</h2>
      {active ? (
        <>
          <span className="eyebrow">
            {Math.min(elapsed, active.duration)} / {active.duration} MINUTES ·{" "}
            {clock >= new Date(active.endsAt).getTime()
              ? "TIME COMPLETE"
              : "IN PROGRESS"}
          </span>
          <div className="goal-grid">
            {Object.keys(goals).map((k) => (
              <div key={k}>
                <strong className="metric">
                  {m[k]} / {active.goals[k]}
                </strong>
                <small>{labels[k]}</small>
              </div>
            ))}
          </div>
          <p>
            The session uses saved start and end times, so reloading does not
            reset it. Only activity inside this time window counts.
          </p>
          <div className="button-row">
            <Action to="/live">Continue selling</Action>
            <SaveButton
              onClick={() =>
                save(
                  "salesExperiments",
                  {
                    ...active,
                    completed: true,
                    successful: complete,
                    result: m,
                  },
                  complete ? 30 : 0,
                )
              }
            >
              {complete ? "Finish sprint · +30 XP" : "End & save sprint"}
            </SaveButton>
          </div>
        </>
      ) : (
        <>
          <Select
            label="Duration"
            value={duration}
            onChange={setDuration}
            options={["30", "60", "90"].map((v) => ({
              value: v,
              label: v + " minutes",
            }))}
          />
          <div className="number-grid">
            {Object.keys(goals).map((k) => (
              <Field label={labels[k]} key={k}>
                <input
                  type="number"
                  min="1"
                  value={goals[k]}
                  onChange={(e) => setGoals({ ...goals, [k]: +e.target.value })}
                />
              </Field>
            ))}
          </div>
          <SaveButton
            onClick={() => {
              if (
                Object.values(goals).some((v) => v < 1 || !Number.isInteger(v))
              )
                throw Error("Choose whole-number goals of at least one.");
              return save("salesExperiments", {
                type: "sprint",
                title: "Sales sprint",
                duration: +duration,
                goals,
                startedAt: new Date().toISOString(),
                endsAt: new Date(Date.now() + duration * 60000).toISOString(),
                completed: false,
              });
            }}
          >
            Start sprint
          </SaveButton>
        </>
      )}
      <h3>Recent sprints</h3>
      {data.salesExperiments
        .filter((s) => s.type === "sprint" && s.completed)
        .slice(-3)
        .map((s) => (
          <p key={s.id}>
            {s.day} · {s.duration} min ·{" "}
            {s.successful ? "Targets reached" : "Session saved"}
          </p>
        ))}
    </Card>
  );
}
function Calculator() {
  const [values, setValues] = useState({
      target: 100000,
      value: 5000,
      close: 20,
      demo: 50,
      access: 60,
      days: 22,
    }),
    result = calculate(...Object.values(values));
  return (
    <Card>
      <h2>Work backwards from your goal.</h2>
      <div className="number-grid">
        {Object.entries({
          target: "Monthly revenue target (₹)",
          value: "Average sale value (₹)",
          close: "Demo → sale rate (%)",
          demo: "Decision maker → demo rate (%)",
          access: "Visit → decision maker rate (%)",
          days: "Selling days per month",
        }).map(([k, l]) => (
          <Field label={l} key={k}>
            <input
              type="number"
              min="1"
              max={["close", "demo", "access"].includes(k) ? 100 : undefined}
              value={values[k]}
              onChange={(e) => setValues({ ...values, [k]: +e.target.value })}
            />
          </Field>
        ))}
      </div>
      {result ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Activity</th>
                <th>Monthly</th>
                <th>Weekly*</th>
                <th>Daily</th>
              </tr>
            </thead>
            <tbody>
              {["sales", "demos", "decisionMakers", "visits"].map((k) => (
                <tr key={k}>
                  <td>{labels[k]}</td>
                  <td>{result[k]}</td>
                  <td>{Math.ceil(result[k] / 4.33)}</td>
                  <td>{Math.ceil(result[k] / values.days)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="fine">
            *Average 4.33 weeks/month. Planning estimates based on your inputs,
            rounded up; outcomes are not guaranteed.
          </p>
        </div>
      ) : (
        <p className="error">
          Enter positive numbers. Rates must be between 1% and 100%.
        </p>
      )}
      <Action to="/more/goals">Set daily targets</Action>
    </Card>
  );
}
const autopsyQuestions = [
  "Did you reach the decision maker?",
  "Did you identify a clear problem?",
  "Did the customer acknowledge the problem?",
  "Did you demonstrate value?",
  "Did the customer understand the price?",
  "Was an objection raised?",
  "Did you handle the objection?",
  "Did you ask for the sale?",
  "Did you create a next step?",
  "Did you open with permission and relevance?",
  "Was the pitch clear and linked to a need?",
  "Did you show a relevant demonstration?",
];
function Review({ autopsy }) {
  const { data, save } = useStore(),
    [params] = useSearchParams(),
    source = data.meetings.find((m) => m.id === params.get("meeting")),
    [product, setProduct] = useState(source?.product || products[0].name),
    [customer, setCustomer] = useState("Business owner"),
    [outcome, setOutcome] = useState(source?.outcome || "REJECTED"),
    [objection, setObjection] = useState(
      source?.objection || objections[0].title,
    ),
    [checks, setChecks] = useState({
      opening: false,
      discovery: false,
      showValue: false,
      askedSale: false,
    }),
    [answers, setAnswers] = useState(Array(12).fill(false)),
    [wrong, setWrong] = useState(""),
    [notes, setNotes] = useState(""),
    [feedback, setFeedback] = useState("");
  const [observations, setObservations] = useState(source?.observations || {});
  const failure = () =>
    !answers[9]
      ? "Approach"
      : !answers[0]
        ? "Decision Maker"
        : !answers[1]
          ? "Discovery"
          : !answers[2]
            ? "Need"
            : !answers[10]
              ? "Pitch"
              : !answers[11]
                ? "Demo"
                : !answers[3]
                  ? "Value"
                  : !answers[4]
                    ? "Price"
                    : answers[5] && !answers[6]
                      ? "Objection"
                      : !answers[7]
                        ? "Closing"
                        : !answers[8]
                          ? "Follow-up"
                          : "Fit / timing";
  return (
    <Card>
      <h2>
        {autopsy ? "Find the failure point." : "Review the conversation."}
      </h2>
      <div className="two-col">
        <Select
          label="Product"
          value={product}
          onChange={setProduct}
          options={products.map((p) => p.name)}
        />
        <Field label="Customer type">
          <input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          />
        </Field>
      </div>
      {autopsy ? (
        autopsyQuestions.map((q, i) => (
          <Check
            key={q}
            label={q}
            checked={answers[i]}
            onChange={(v) =>
              setAnswers((a) => a.map((x, n) => (n === i ? v : x)))
            }
          />
        ))
      ) : (
        <>
          <Select
            label="Outcome"
            value={outcome}
            onChange={setOutcome}
            options={["SOLD", "FOLLOW-UP", "REJECTED", "OWNER ABSENT"]}
          />
          <Select
            label="Main objection"
            value={objection}
            onChange={setObjection}
            options={["None", ...objections.map((o) => o.title)]}
          />
          {Object.entries({
            opening: "Did I open with permission and relevance?",
            discovery: "Did I ask discovery questions?",
            showValue: "Did I show value?",
            askedSale: "Did I ask for the sale?",
          }).map(([k, l]) => (
            <Check
              key={k}
              label={l}
              checked={checks[k]}
              onChange={(v) => setChecks({ ...checks, [k]: v })}
            />
          ))}
          <Field label="What went wrong?">
            <input value={wrong} onChange={(e) => setWrong(e.target.value)} />
          </Field>
        </>
      )}
      <Field label="Notes / lesson">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <ObservationFields value={observations} onChange={setObservations} />
      <SaveButton
        onClick={async () => {
          if (autopsy) {
            const point = failure();
            await save("salesExperiments", {
              type: "autopsy",
              product,
              customer,
              answers,
              notes,
              failure: point,
            });
            setFeedback(
              point === "Fit / timing"
                ? "Your process covered the key steps. Check fit and timing; a respectful no is still a valid outcome."
                : "Focus area: " +
                    point +
                    ". Revisit this step before improving the rest of the pitch.",
            );
          } else {
            const text = !checks.discovery
              ? "You may have pitched too early. Ask one discovery question before introducing features."
              : checks.showValue && !checks.askedSale
                ? "You may be explaining well but not asking directly for commitment. Invite a clear, pressure-free next step."
                : bottleneck(metrics(data.salesActivities));
            await save("meetings", {
              ...source,
              id: source?.id,
              review: true,
              observations,
              product,
              customer,
              outcome,
              objection,
              ...checks,
              wrong,
              notes,
              feedback: text,
            });
            setFeedback(text);
          }
        }}
      >
        Save & get coaching
      </SaveButton>
      {feedback && (
        <div className="response">
          <h3>Your next improvement</h3>
          <p>{feedback}</p>
          <MasteryAdvice
            context="after-meeting"
            conversationId={source?.id || "unlinked-review"}
            result={salesMastery({
              data,
              product,
              conversation: {
                ...observations,
                discovery: observations.discovery ?? checks.discovery,
                stage: "CLOSING",
              },
              personality: data.settings.find((s) => s.id === "preferences")
                ?.personality,
            })}
          />
          <Action to="/live">Try it with the next prospect</Action>
        </div>
      )}
      <p className="fine">
        Reviews add coaching notes; they do not add another visit or change
        activity totals.
      </p>
    </Card>
  );
}
