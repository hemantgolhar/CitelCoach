import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import {
  Card,
  Select,
  Field,
  Action,
  SaveButton,
  Accordion,
} from "../components/UI";
import {
  masteryLessons,
  salesPlaybooks,
  playbookFor,
} from "../data/salesPlaybooks";
import {
  salesMastery,
  autopsyStep,
  autopsySteps,
  diagnoseObjection,
  objectionBranches,
} from "../services/salesMasteryEngine";
import { MasteryAdvice, ObservationFields } from "../components/SalesMastery";
import {
  salesSkillSignals,
  pipelineSignals,
  masteryHistorySummary,
  recordMasteryShown,
} from "../services/salesMasteryTracking";
import {
  customerPersonalities,
  difficulties,
  roleplayRound,
  evaluateRoleplay,
} from "../services/salesRoleplay";
import AdviceFeedback from "../components/AdviceFeedback";
import { completePrinciple } from "../services/principleHistory";
export default function SalesMasteryLibrary() {
  const { data, save } = useStore();
  const [params] = useSearchParams();
  const [stage, setStage] = useState(params.get("stage") || "DISCOVERY"),
    [product, setProduct] = useState("aura"),
    [said, setSaid] = useState("Too expensive"),
    [branch, setBranch] = useState("Not clarified"),
    [notice, setNotice] = useState("");
  const lesson =
      masteryLessons.find((l) => l.stage === stage) || masteryLessons[2],
    p = playbookFor(product),
    d = diagnoseObjection(said, branch);
  return (
    <>
      <Card>
        <h2>Sales Mastery</h2>
        <Select
          label="Skill"
          value={lesson.stage}
          onChange={setStage}
          options={masteryLessons.map((l) => ({
            value: l.stage,
            label: l.name,
          }))}
        />
        <Select
          label="Product"
          value={product}
          onChange={setProduct}
          options={salesPlaybooks.map((p) => ({ value: p.id, label: p.name }))}
        />
        <p>
          <strong>Learn · {lesson.framework}:</strong> {lesson.learn}
        </p>
        <p>
          <strong>Example:</strong>{" "}
          {stage === "DISCOVERY" ? p.spin.PROBLEM : lesson.example}
        </p>
        <p>
          <strong>Practice:</strong> {lesson.practice}
        </p>
        <p>
          <strong>Field challenge:</strong> {lesson.challenge}
        </p>
        <SaveButton
          onClick={async () => {
            await save("practiceSessions", {
              type: "salesMasteryPractice",
              stage: lesson.stage,
              framework: lesson.framework,
              product,
              completed: true,
            });
            setNotice("Practice recorded separately from field performance.");
          }}
        >
          I completed this practice
        </SaveButton>
        <p role="status">{notice}</p>
        <Action to={"/more/conversation?product=" + product}>
          Open conversation coach
        </Action>
      </Card>
      {stage === "Objection" || stage === "OBJECTION" ? (
        <Card>
          <h3>Listen → Acknowledge → Explore → Respond</h3>
          <Field label="What they said">
            <input
              value={said}
              onChange={(e) => {
                setSaid(e.target.value);
                setBranch("Not clarified");
              }}
            />
          </Field>
          <p>
            <strong>{d.type}:</strong> {d.mayMean}
          </p>
          <p>
            <strong>What to find out:</strong> {d.findOut}
          </p>
          <p>
            <strong>Question:</strong> {d.question}
          </p>
          <Select
            label="What you learned"
            value={branch}
            onChange={setBranch}
            options={objectionBranches}
          />
          <p>
            <strong>Possible response:</strong> {d.response}
          </p>
          <p>
            <strong>Next step:</strong> {d.nextStep}
          </p>
        </Card>
      ) : null}
      <Card>
        <h3>Pipeline tools</h3>
        <div className="button-row">
          <Action to="/live">Record an attempt</Action>
          <Action to="/more/focus">Focus block</Action>
          <Action to="/more/minimum">Minimum day</Action>
          <Action to="/more/frog">Today’s frog</Action>
          <Action to="/more/calculator">Pipeline calculator</Action>
        </div>
      </Card>
      <SalesRoleplay />
    </>
  );
}
export function ProductMastery({ product }) {
  const p = playbookFor(product);
  return (
    <Card>
      <h3>Sales Mastery playbook · {p.name}</h3>
      <p>{p.verification}</p>
      <Accordion title="SPIN discovery — use situation questions sparingly">
        {Object.entries(p.spin).map(([k, v]) => (
          <p key={k}>
            <strong>{k}:</strong> {v}
          </p>
        ))}
      </Accordion>
      <Accordion title="Qualification questions">
        {Object.entries(p.qualification).map(([k, v]) => (
          <p key={k}>{v}</p>
        ))}
      </Accordion>
      <Accordion title="Teach and tailor">
        <p>
          {p.insight} Ask whether this applies before recommending anything.
        </p>
      </Accordion>
      <Accordion title="Demo strategy">
        <p>{p.demoStrategy}</p>
      </Accordion>
      <Accordion title="Diagnose common objections">
        {p.objections.map((s) => {
          const d = diagnoseObjection(s);
          return (
            <div key={s}>
              <h4>{s}</h4>
              <p>{d.mayMean}</p>
              <p>{d.question}</p>
            </div>
          );
        })}
      </Accordion>
      <Accordion title="Closing and follow-up">
        {p.closingQuestions.map((q) => (
          <p key={q}>{q}</p>
        ))}
        <p>{p.followUpStrategy}</p>
      </Accordion>
      <Accordion title="Bad-fit indicators">
        {p.badFit.map((s) => (
          <p key={s}>{s}</p>
        ))}
      </Accordion>
    </Card>
  );
}
export function ConversationCoach() {
  const { data, save } = useStore();
  const [params] = useSearchParams();
  const [id] = useState(params.get("session") || crypto.randomUUID());
  const prior = data.settings.find(
    (r) => r.id === id && r.type === "salesConversation",
  );
  const [product, setProduct] = useState(
      prior?.product || params.get("product") || "aura",
    ),
    [customer, setCustomer] = useState(prior?.customer || "Business owner"),
    [index, setIndex] = useState(prior?.index || 0),
    [facts, setFacts] = useState(prior?.observations || {}),
    [notice, setNotice] = useState("");
  const stages = [
    "APPROACH",
    "DISCOVERY",
    "PROBLEM",
    "PRESENTATION",
    "DEMO",
    "OBJECTION",
    "CLOSING",
    "FOLLOW_UP",
  ];
  const titles = [
    "OPEN",
    "DISCOVER",
    "DIAGNOSE",
    "PRESENT",
    "DEMO",
    "HANDLE CONCERN",
    "CLOSE",
    "NEXT STEP",
  ];
  const result = salesMastery({
    data,
    product,
    conversation: { ...facts, stage: stages[index] },
    personality: data.settings.find((r) => r.id === "preferences")?.personality,
  });
  async function persist(next) {
    const advice = await recordMasteryShown(
      result,
      "conversation-coach",
      data.salesActivities,
      id,
    );
    await save("settings", {
      id,
      type: "salesConversation",
      product,
      customer,
      index: next,
      observations: facts,
      stage: stages[next],
      lastAdviceId: advice.id,
      framework: result.framework,
    });
    setIndex(next);
    setNotice("Conversation notes saved locally.");
  }
  return (
    <Card>
      <Select
        label="Product"
        value={product}
        onChange={setProduct}
        options={salesPlaybooks.map((p) => ({ value: p.id, label: p.name }))}
      />
      <Field label="Customer type">
        <input value={customer} onChange={(e) => setCustomer(e.target.value)} />
      </Field>
      <h2>
        {index + 1} / 8 · {titles[index]}
      </h2>
      <p>
        <strong>Ask:</strong> {result.nextQuestion}
      </p>
      <p>
        <strong>Backup:</strong> {result.microCommitment}
      </p>
      <p>
        <strong>Tip:</strong> {result.coachTip}
      </p>
      <ObservationFields value={facts} onChange={setFacts} />
      <div className="button-row">
        {index > 0 && (
          <SaveButton onClick={() => persist(index - 1)}>Back</SaveButton>
        )}
        <SaveButton onClick={() => persist(Math.min(7, index + 1))}>
          {index === 7 ? "Save next-step notes" : "Save & next"}
        </SaveButton>
        <SaveButton onClick={() => persist(index)}>
          Save current notes
        </SaveButton>
        {data.settings.some((r) => r.id === id) && (
          <Action to={"/live?conversation=" + id}>Record actual result</Action>
        )}
      </div>
      <p role="status">{notice}</p>
      <p className="fine">
        Advancing a screen does not confirm a need or log a visit. Unknown facts
        keep discovery ahead of closing.
      </p>
      {data.settings.filter((r) => r.type === "salesConversation").length >
        0 && (
        <Accordion title="Resume a saved conversation">
          {data.settings
            .filter((r) => r.type === "salesConversation")
            .map((r) => (
              <p key={r.id}>
                <Action to={"/more/conversation?session=" + r.id}>
                  {r.customer} · {playbookFor(r.product).name}
                </Action>
              </p>
            ))}
        </Accordion>
      )}
    </Card>
  );
}
export function MasteryAutopsy() {
  const { data, save } = useStore();
  const [params] = useSearchParams(),
    source = data.meetings.find((r) => r.id === params.get("meeting"));
  const [answers, setAnswers] = useState({}),
    [notes, setNotes] = useState(""),
    [notice, setNotice] = useState("");
  const step = autopsyStep(answers);
  return (
    <Card>
      <h2>Find the first missing step.</h2>
      {!step.done ? (
        <>
          <p>{step.question}</p>
          <div className="button-row">
            <button
              className="button"
              onClick={() => setAnswers({ ...answers, [step.key]: true })}
            >
              Yes
            </button>
            <button
              className="button secondary"
              onClick={() => setAnswers({ ...answers, [step.key]: false })}
            >
              No / not established
            </button>
          </div>
        </>
      ) : (
        <>
          <h3>Likely breakdown: {step.stage.replaceAll("_", " ")}</h3>
          <p>
            <strong>What to practice:</strong> {step.practice}
          </p>
          <p>
            <strong>Next field challenge:</strong> {step.challenge}
          </p>
          <Field label="Lesson (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
          <SaveButton
            onClick={async () => {
              await save("salesExperiments", {
                type: "masteryAutopsy",
                meetingId: source?.id || null,
                answers,
                stage: step.stage,
                notes,
              });
              if (source)
                await save("meetings", {
                  ...source,
                  review: true,
                  observations: { ...source.observations, ...answers },
                  masteryBreakdown: step.stage,
                });
              setNotice("Autopsy saved without adding activity.");
            }}
          >
            Save coaching
          </SaveButton>
          <Action to={"/practice?mode=mastery&stage=" + step.stage}>
            Practice this step
          </Action>
        </>
      )}
      <p role="status">{notice}</p>
      <button
        className="secondary"
        onClick={() => {
          setAnswers({});
          setNotice("");
        }}
      >
        Start again
      </button>
      <p>
        Stop at the first unestablished step. A missing answer suggests what to
        clarify; it does not prove why the sale was lost.
      </p>
    </Card>
  );
}
export function SalesRoleplay() {
  const { save } = useStore();
  const [product, setProduct] = useState("aura"),
    [personality, setPersonality] = useState("Friendly"),
    [difficulty, setDifficulty] = useState("Normal"),
    [round, setRound] = useState(0),
    [results, setResults] = useState([]),
    [reason, setReason] = useState(""),
    [feedback, setFeedback] = useState(null),
    [saved, setSaved] = useState(false);
  const scenario = roleplayRound({ product, personality, difficulty, round });
  const restart = () => {
    setRound(0);
    setResults([]);
    setFeedback(null);
    setSaved(false);
    setReason("");
  };
  return (
    <Card>
      <h2>Offline sales roleplay</h2>
      {round === 0 && !feedback && (
        <>
          <Select
            label="Roleplay product"
            value={product}
            onChange={setProduct}
            options={salesPlaybooks.map((p) => ({
              value: p.id,
              label: p.name,
            }))}
          />
          <Select
            label="Customer personality"
            value={personality}
            onChange={setPersonality}
            options={customerPersonalities}
          />
          <Select
            label="Difficulty"
            value={difficulty}
            onChange={setDifficulty}
            options={difficulties}
          />
        </>
      )}
      {round < scenario.rounds ? (
        <>
          <span className="eyebrow">
            {scenario.stage} · {round + 1} / {scenario.rounds}
          </span>
          <p>{scenario.prompt}</p>
          {scenario.hint && (
            <p>
              <strong>Hint:</strong> {scenario.hint}
            </p>
          )}
          {scenario.requiresReason && (
            <Field label="Why is your next response useful?">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          )}
          {!feedback ? (
            scenario.options.map((o) => (
              <SaveButton
                key={o.id}
                onClick={async () => {
                  const result = evaluateRoleplay(scenario, o.id, reason);
                  setFeedback(result);
                  setResults([...results, result]);
                }}
              >
                {o.text}
              </SaveButton>
            ))
          ) : (
            <>
              <p>{feedback.feedback}</p>
              <button
                className="button"
                onClick={() => {
                  setRound(round + 1);
                  setFeedback(null);
                  setReason("");
                }}
              >
                Next situation
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <h3>
            {results.filter((r) => r.score).length} / {results.length}{" "}
            listening-first choices
          </h3>
          <p>
            This is a structured practice result, not a field-skill score.
            Written reasoning is saved for self-review; it is not automatically
            graded.
          </p>
          <SaveButton
            disabled={saved}
            onClick={async () => {
              await save("practiceSessions", {
                type: "salesRoleplay",
                product,
                personality,
                difficulty,
                results,
                score: results.reduce((n, r) => n + r.score, 0),
                completed: true,
              });
              setSaved(true);
            }}
          >
            {saved ? "Practice saved" : "Save roleplay"}
          </SaveButton>
          <button className="button secondary" onClick={restart}>
            New roleplay
          </button>
        </>
      )}
    </Card>
  );
}
export function MasteryProgress() {
  const { data, refresh } = useStore();
  const p = pipelineSignals(data),
    signals = salesSkillSignals(data),
    history = data.mindsetSessions.filter((r) => r.domain === "sales"),
    summary = masteryHistorySummary(history);
  return (
    <Card>
      <h2>Sales Mastery · real behavior and practice</h2>
      <p>
        Last 7 days: {p.visits} visits · {p.calls} calls · {p.decisionMakers}{" "}
        decision-maker conversations · {p.demos} demos · {p.followUps}{" "}
        follow-ups.
      </p>
      <p>
        {p.attempts} prospecting attempts · {p.sales} recorded sales. Pipeline
        ratios describe your records; they are not predictions.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Skill</th>
              <th>Practice records</th>
              <th>Observed behavior</th>
              <th>Sales in related records</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => (
              <tr key={s.name}>
                <td>{s.name}</td>
                <td>{s.practice}</td>
                <td>
                  {s.score == null
                    ? `${s.completed} completed / ${s.sample} observed; more evidence needed`
                    : `${s.score}% (${s.completed}/${s.sample})`}
                </td>
                <td>{s.outcomes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Behavior percentages require at least three explicit observations.
        Unknown facts and practice ratings do not count as successful field
        behavior.
      </p>
      <h3>Framework follow-through</h3>
      <p>{summary.observation}</p>
      <Accordion title="Sales advice history and outcomes">
        {[...history]
          .sort((a, b) => b.shownAt.localeCompare(a.shownAt))
          .slice(0, 30)
          .map((r) => (
            <div key={r.id}>
              <h4>
                {r.framework || r.principle} · {r.stage} · {r.day}
              </h4>
              <p>
                {r.action} ·{" "}
                {r.completed
                  ? "Completed (self-report)"
                  : "Not marked complete"}
              </p>
              {r.completed ? (
                <AdviceFeedback record={r} />
              ) : (
                <SaveButton
                  onClick={async () => {
                    await completePrinciple(r.id, {
                      activities: data.salesActivities,
                    });
                    await refresh();
                  }}
                >
                  I completed this action
                </SaveButton>
              )}
            </div>
          ))}
      </Accordion>
    </Card>
  );
}
