import React from "react";
import { salesDayStreak } from "../services/practicalBehavior";
import { useStore } from "../hooks/useStore";
import {
  metrics,
  labels,
  streaks,
  funnel,
  bottleneck,
  dayKey,
} from "../utils/metrics";
import { Card, PageHead, Action } from "../components/UI";
import CoachingPatterns from "./CoachingPatterns";
import { MasteryProgress } from "./SalesMastery";
export default function Progress() {
  const { data } = useStore(),
    m = metrics(data.salesActivities),
    xp = data.xpHistory.reduce((a, x) => a + x.amount, 0),
    streak = salesDayStreak(data);
  const avg = (a) =>
    a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : null;
  const skills = {
    Opening: avg(
      data.meetings.filter((x) => x.review).map((x) => (x.opening ? 100 : 0)),
    ),
    Discovery: avg(
      data.meetings.filter((x) => x.review).map((x) => (x.discovery ? 100 : 0)),
    ),
    "Pitch (practice self-rating)": avg(
      data.pitchPractice.map((x) =>
        x.rating === "Confident" ? 100 : x.rating === "Practiced" ? 60 : 20,
      ),
    ),
    "Value Explanation": avg(
      data.meetings.filter((x) => x.review).map((x) => (x.showValue ? 100 : 0)),
    ),
    "Objections (practice self-rating)": avg(
      data.objectionPractice.map((x) => x.rating * 50),
    ),
    Closing: avg(
      data.meetings.filter((x) => x.review).map((x) => (x.askedSale ? 100 : 0)),
    ),
    "Follow-Up": data.salesActivities.some((x) => x.followUpDate)
      ? Math.round(
          (data.salesActivities.filter((x) => x.kind === "followup").length /
            Math.max(
              1,
              data.salesActivities.filter((x) => x.followUpDate).length,
            )) *
            100,
        )
      : null,
    "Confidence (self-rating)": avg(
      data.pitchPractice.map((x) =>
        x.rating === "Confident" ? 100 : x.rating === "Practiced" ? 60 : 20,
      ),
    ),
    Consistency: Math.min(100, (streak.current / 7) * 100),
  };
  return (
    <>
      <PageHead
        eyebrow="ACTIVITY → INSIGHT → IMPROVEMENT"
        title="See how you’re growing."
        description="Your own activity, your own patterns. No invented progress."
      />
      <div className="goal-grid">
        {Object.entries(labels).map(([k, l]) => (
          <Card key={k}>
            <span className="muted">Total {l.toLowerCase()}</span>
            <strong className="metric">
              {k === "revenue" ? "₹" : ""}
              {m[k].toLocaleString("en-IN")}
            </strong>
          </Card>
        ))}
      </div>
      <div className="two-col">
        <Card>
          <span className="eyebrow">CONVERSION COACH</span>
          <h2>Find the next improvement.</h2>
          <p>{bottleneck(m)}</p>
          {funnel(m, data.salesActivities).map(([l, v]) => (
            <div className="skill" key={l}>
              <div>
                <span>{l}</span>
                <strong>{v}%</strong>
              </div>
              <div className="bar">
                <i style={{ width: Math.min(100, v) + "%" }} />
              </div>
            </div>
          ))}
          <small>
            Sales and demos may occur on different visits. These are activity
            ratios, not cohort conversion rates.
          </small>
          <Action to="/more/calculator">Plan your activity</Action>
        </Card>
        <Card>
          <span className="eyebrow">LAST 7 DAYS</span>
          <h2>Showing up adds up.</h2>
          <div className="chart">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - 6 + i);
              const count = data.salesActivities.filter(
                (x) => x.day === dayKey(d) && x.kind === "meeting",
              ).length;
              const max = Math.max(
                5,
                ...Array.from({ length: 7 }, (_, j) => {
                  const n = new Date();
                  n.setDate(n.getDate() - j);
                  return data.salesActivities.filter(
                    (x) => x.day === dayKey(n) && x.kind === "meeting",
                  ).length;
                }),
              );
              return (
                <div key={i}>
                  <span>{count}</span>
                  <i style={{ height: Math.max(3, (count / max) * 140) }} />
                  <small>
                    {d.toLocaleDateString("en", { weekday: "short" })}
                  </small>
                </div>
              );
            })}
          </div>
          <p>
            {xp} XP · Level {Math.min(5, 1 + Math.floor(xp / 500))}
          </p>
          <p>
            {streak.current} day current streak · {streak.best} day best streak
          </p>
        </Card>
        <Card>
          <span className="eyebrow">LEGACY PRACTICE & REVIEW INDICATORS</span>
          <h2>Practice with purpose.</h2>
          {Object.entries(skills).map(([k, v]) => (
            <div className="skill" key={k}>
              <div>
                <span>{k}</span>
                <strong>
                  {v === null
                    ? "No evidence yet"
                    : Math.round(Math.min(100, v)) + "%"}
                </strong>
              </div>
              <div className="bar">
                <i style={{ width: Math.min(100, v || 0) + "%" }} />
              </div>
            </div>
          ))}
          <small>
            Directional indicators from self-ratings and meeting reviews, not
            objective proficiency measurements.
          </small>
        </Card>
        <Card>
          <span className="eyebrow">PRACTICE & LESSONS</span>
          <h2>
            {data.objectionPractice.length + data.pitchPractice.length} practice
            repetitions
          </h2>
          <p>
            {data.pitchPractice.length} pitch sessions ·{" "}
            {data.objectionPractice.length} objection responses
          </p>
          <h3>Lost-deal patterns</h3>
          {data.salesExperiments.filter((x) => x.type === "autopsy").length ? (
            Object.entries(
              data.salesExperiments
                .filter((x) => x.type === "autopsy")
                .reduce(
                  (a, r) => ({ ...a, [r.failure]: (a[r.failure] || 0) + 1 }),
                  {},
                ),
            ).map(([k, v]) => (
              <p key={k}>
                {k}: {v}
              </p>
            ))
          ) : (
            <p>Complete a deal autopsy to discover where deals stall.</p>
          )}
          <Action to="/more/autopsy">Review a lost deal</Action>
        </Card>
      </div>
      <MasteryProgress />
      <CoachingPatterns />
    </>
  );
}
