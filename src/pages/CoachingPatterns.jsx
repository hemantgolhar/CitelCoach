import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import {
  summarizeAdvice,
  aggregateEffectiveness,
  personalBests,
  pendingFeedback,
  rankGroups,
} from "../services/adviceEffectiveness";
import {
  firstActionTimes,
  recoveryTimes,
  actionStreaks,
} from "../services/behaviorMetrics";
import {
  weeklyReview,
  createCoachingExperiment,
  experimentReport,
} from "../services/coachingReview";
import { philosophyById, principleById } from "../data/philosophies";
import { dayKey } from "../utils/metrics";
import AdviceFeedback from "../components/AdviceFeedback";
import { Card, Select, SaveButton, Accordion } from "../components/UI";
const rate = (n) => (n == null ? "Not enough data" : Math.round(n * 100) + "%");
const mins = (n) => (n == null ? "Not measured" : Math.round(n) + " min");
const name = (g) =>
  g
    ? principleById(g.philosophy, g.principle)?.label || g.principle
    : "More history needed";
export default function CoachingPatterns() {
  const { data, save } = useStore(),
    [dimension, setDimension] = useState("principle");
  const history = data.mindsetSessions.filter((r) => r.domain !== "sales"),
    summary = summarizeAdvice(history),
    best = personalBests(history),
    first = firstActionTimes(data.salesActivities, data.settings),
    recovery = recoveryTimes(data.salesActivities),
    streak = actionStreaks(data),
    weekly = weeklyReview(data);
  const groups = aggregateEffectiveness(history, dimension).filter(
    (g) => g.meaningful,
  );
  const useful = aggregateEffectiveness(history)
    .filter((g) => g.meaningful && g.ratingCount >= 3)
    .sort((a, b) => b.averageUsefulness - a.averageUsefulness);
  const pending = pendingFeedback(history),
    experiments = data.salesExperiments.filter(
      (r) => r.type === "coachingExperiment",
    ),
    active = experiments.find((e) => !e.stoppedAt && e.endDay >= dayKey());
  return (
    <section className="coaching-patterns">
      <div className="section-title">
        <h2>Your coaching patterns</h2>
        <Link to="/coach/wisdom?view=history">Advice history ↗</Link>
      </div>
      <Card>
        <div className="number-grid">
          {[
            ["Advice completion", rate(summary.completionRate)],
            ["Most acted-on principle", name(best.action)],
            [
              "Most useful principle",
              useful.length >= 2 ? name(useful[0]) : "More ratings needed",
            ],
            ["Time to first action · today", mins(first.today)],
            ["Recovery time · today", mins(recovery.today)],
            ["Current sales-day streak", streak.salesDay.current + " days"],
          ].map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <h3>{value}</h3>
            </div>
          ))}
        </div>
        <p className="fine">
          Completion is self-reported. Comparisons require at least 5 exposures
          over 3 distinct days per approach and at least two eligible
          approaches. Optional outcome rates use reported outcomes only.
        </p>
        <Accordion title="Timing and completed-behavior streaks">
          <p>
            Time to first action: today {mins(first.today)} · 7-day average{" "}
            {mins(first.average7)} · best {mins(first.best)}.
          </p>
          <p>
            Rejection recovery: today {mins(recovery.today)} · recorded average{" "}
            {mins(recovery.average)}.
          </p>
          <p className="fine">
            First-action timing begins with the first visible app opening each
            local day. Older days without an opening timestamp are unknown.
            Recovery measures a rejection to the next same-day prospect visit;
            overnight gaps are excluded. Take breaks when needed.
          </p>
          {Object.entries({
            salesDay: "Sales Day Streak",
            firstAction: "First-Action Streak",
            practice: "Practice Streak",
            followUp: "Follow-Up Streak",
            recovery: "Recovery Streak",
          }).map(([key, label]) => (
            <p key={key}>
              {label}: {streak[key].current} current · {streak[key].best} best
            </p>
          ))}
          <p className="fine">
            Opening the app or marking advice DONE alone does not earn a
            behavior streak.
          </p>
        </Accordion>
      </Card>
      {pending && (
        <Card>
          <AdviceFeedback key={pending.id} record={pending} dismissible />
        </Card>
      )}
      <Card>
        <h2>Coaching that works for you</h2>
        <Select
          label="Compare by"
          value={dimension}
          onChange={setDimension}
          options={[
            { value: "principle", label: "Principle" },
            { value: "philosophy", label: "Philosophy" },
            { value: "bottleneck", label: "Bottleneck" },
            { value: "problem", label: "Problem / situation" },
            { value: "action", label: "Action type" },
          ]}
        />
        {groups.length < 2 ? (
          <p>
            Keep using CitelCoach. More activity is needed before comparing
            coaching approaches.
          </p>
        ) : (
          groups.map((g) => (
            <div className="pattern-row" key={g.key}>
              <h3>
                {dimension === "principle"
                  ? name(g)
                  : dimension === "philosophy"
                    ? philosophyById(g.key).name
                    : g.key.replaceAll("_", " ")}
              </h3>
              <p>
                {g.shown} shown · {g.completed} completed ·{" "}
                {rate(g.completionRate)} completion
              </p>
              <div className="bar">
                <i style={{ width: rate(g.completionRate) }} />
              </div>
              <small>
                {g.positiveOutcomes}/{g.reportedOutcomes} reported positive
                outcomes · outcome rate {rate(g.outcomeRate)} · {g.demos} demos,{" "}
                {g.sales} sales self-reported
              </small>
              <p className="fine">
                Usefulness:{" "}
                {g.averageUsefulness == null
                  ? "Not rated"
                  : g.averageUsefulness.toFixed(1) +
                    "/4 from " +
                    g.ratingCount +
                    " ratings"}
              </p>
            </div>
          ))
        )}
        <p className="fine">
          These are associations in your records, not evidence that a philosophy
          caused an outcome.
        </p>
        <Accordion title="Personal best principles">
          {[
            ["action", "Best for action"],
            ["rejection", "Best for rejection"],
            ["meetings", "Best before meetings"],
            ["skill", "Best for sales skill"],
          ].map(([key, label]) => (
            <p key={key}>
              <strong>{label}:</strong> {name(best[key])}
              {best[key]
                ? ` — ${best[key].completed} of ${best[key].shown} similar actions completed.`
                : ""}
            </p>
          ))}
        </Accordion>
      </Card>
      <Card>
        <Accordion title="Weekly coach review · last 7 days">
          <p>
            {weekly.activity.visits} visits · {weekly.activity.decisionMakers}{" "}
            decision makers · {weekly.activity.demos} demos ·{" "}
            {weekly.activity.followUps} follow-ups · {weekly.activity.sales}{" "}
            sales · ₹{weekly.activity.revenue.toLocaleString("en-IN")}
          </p>
          <p>Bottleneck: {weekly.analysis.title}</p>
          <p>
            Strongest recorded skill:{" "}
            {weekly.strongest?.label || "More reviews needed"} · weakest:{" "}
            {weekly.weakest?.label || "More reviews needed"}
          </p>
          <small>
            Skills use at least three self-ratings or review responses, not
            objective proficiency tests.
          </small>
          <p>
            Most common objection:{" "}
            {weekly.commonObjection
              ? weekly.commonObjection[0] +
                " (" +
                weekly.commonObjection[1] +
                ")"
              : "None recorded"}
          </p>
          <p>
            Best-followed principle: {name(weekly.best)} · least completed
            (“most ignored”): {name(weekly.ignored)}
          </p>
          <p>
            First action: {mins(weekly.timing.average7)} average · recovery:{" "}
            {mins(weekly.recovery.average)} average.
          </p>
          <span className="eyebrow">NEXT WEEK’S PRIMARY FOCUS</span>
          <p>{weekly.practical.consistency}</p>
          <p>Most often left incomplete: {weekly.practical.avoided}</p>
          <p>
            Minimum days: {weekly.practical.minimumUsed} started ·{" "}
            {weekly.practical.minimumCompleted} completed.
          </p>
          <p>
            Best focus block by target completion:{" "}
            {weekly.practical.bestFocus
              ? `${weekly.practical.bestFocus.focusType}, ${weekly.practical.bestFocus.completed} / ${weekly.practical.bestFocus.planned} actions on ${weekly.practical.bestFocus.day}. This is an association, not proof of an effect.`
              : "No completed activity in focus blocks yet."}
          </p>
          <h3>{weekly.focus.title}</h3>
          <p>Recommended principle: {weekly.focus.principle}</p>
          <p>
            <strong>Field challenge:</strong> {weekly.focus.challenge}
          </p>
        </Accordion>
      </Card>
      <Card>
        <h2>Personal coaching experiment</h2>
        <p>
          Use Decision-based coaching for procrastination for 7 days. This
          applies when you select procrastination in Motivate Me and use
          CitelCoach Method.
        </p>
        <p className="fine">
          Optional personal observation, not a controlled or scientifically
          valid trial. Existing sales data is never changed.
        </p>
        <SaveButton
          disabled={!!active}
          onClick={() =>
            save(
              "salesExperiments",
              createCoachingExperiment(data.salesActivities),
            )
          }
        >
          {active ? "Experiment active" : "Start 7-day experiment"}
        </SaveButton>
        {experiments.map((e) => {
          const report = experimentReport(e, history, data.salesActivities);
          return (
            <div className="pattern-row" key={e.id}>
              <h3>
                {e.title} · {report.status}
              </h3>
              <small>
                {e.startDay} to {e.endDay}
              </small>
              <p>
                {report.shown} exposures · {report.completed} completed ·{" "}
                {report.activity.visits} visits recorded during this period.
              </p>
              <p>
                Previous 7 days: {report.baseline?.visits ?? "unknown"} visits ·
                experiment period: {report.activity.visits} visits
                {report.baseline
                  ? " · change " +
                    (report.activity.visits - report.baseline.visits)
                  : ""}
                .
              </p>
              <p className="fine">
                {report.status === "Active"
                  ? "The current period is incomplete; counts are not yet comparable."
                  : "Observation only: duration, opportunity and market conditions may differ."}
              </p>
              {report.status === "Active" && (
                <SaveButton
                  onClick={() =>
                    save("salesExperiments", {
                      ...e,
                      stoppedAt: new Date().toISOString(),
                    })
                  }
                >
                  End experiment early
                </SaveButton>
              )}
            </div>
          );
        })}
      </Card>
    </section>
  );
}
