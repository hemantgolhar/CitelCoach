import React from "react";
import { BehaviorNudge } from "./BehaviorTools";
import { salesDayStreak } from "../services/practicalBehavior";
import { Link } from "react-router-dom";
import {
  Zap,
  Target,
  Sunrise,
  HeartPulse,
  MessageSquare,
  Mic,
  ArrowUpRight,
  Flame,
} from "lucide-react";
import { useStore } from "../hooks/useStore";
import { dayKey, streaks, labels } from "../utils/metrics";
import { analyzeSales } from "../services/coachEngine";
import { frameworks } from "../data/content";
import PhilosophyAdvice from "../components/PhilosophyAdvice";
import { MasteryAdvice } from "../components/SalesMastery";
import AdviceFollowup from "../components/AdviceFollowup";
import { Card, PageHead, Action, Empty, SaveButton } from "../components/UI";

export default function Home() {
  const { data, save } = useStore();
  const today = dayKey();
  const preferences = data.settings.find((s) => s.id === "preferences") || {};
  const coach = analyzeSales({
    activities: data.salesActivities,
    meetings: data.meetings,
    goals: data.dailyGoals.find((g) => g.id === today),
    personality: preferences.personality,
    date: today,
  });
  const { stats: m, targets: goals, mission } = coach;
  const active = data.salesActivities.some((a) => a.day === today);
  const xp = data.xpHistory.reduce((sum, r) => sum + r.amount, 0);
  const level = Math.min(5, 1 + Math.floor(xp / 500));
  const streak = salesDayStreak(data);
  const tech =
    frameworks[
      Math.floor(new Date(today + "T12:00:00").getTime() / 86400000) %
        frameworks.length
    ];
  const complete = data.mindsetSessions.some(
    (s) => s.id === "technique:" + today,
  );
  const hour = new Date().getHours();
  const recent = [...data.salesActivities]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 4);
  return (
    <div className="action-home">
      <PageHead
        eyebrow="YOUR SALES DAY"
        title={`Good ${hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}, Hemant`}
      >
        <div className="date">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </div>
      </PageHead>
      <BehaviorNudge />
      <Card className="sales-day-card">
        <div className="sales-day-heading">
          <span className="pill">
            <i />
            {active ? "SALES DAY ACTIVE" : "READY TO START"}
          </span>
          <Link to="/more/goals">
            Edit goals <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="day-scoreboard" aria-label="Today's sales scoreboard">
          {["visits", "decisionMakers", "demos", "sales"].map((k) => (
            <div key={k}>
              <span>{labels[k]}</span>
              <strong>
                {m[k]}
                <small>/{goals[k]}</small>
              </strong>
            </div>
          ))}
        </div>
        <div className="day-score-footer">
          <span>
            Follow-ups{" "}
            <b>
              {m.followUps}/{goals.followUps}
            </b>
          </span>
          <span>
            Revenue <b>₹{m.revenue.toLocaleString("en-IN")}</b>
            <small> / ₹{goals.revenue.toLocaleString("en-IN")}</small>
          </span>
        </div>
        <Action to="/live">
          {active ? "CONTINUE SELLING" : "START MY SALES DAY"}
        </Action>
      </Card>
      <Card className="next-mission-card">
        <span className="eyebrow">NEXT MISSION</span>
        <h2>{mission.title}</h2>
        <p>{mission.instruction}</p>
        {mission.followUpAction && (
          <Action to={mission.followUpAction.to}>
            {mission.followUpAction.label}
          </Action>
        )}
        <Action secondary={!!mission.followUpAction} to={mission.nextAction.to}>
          {mission.nextAction.label}
        </Action>
      </Card>
      <Card className={"adaptive-coach " + (coach.detected ? "detected" : "")}>
        <div className="coach-card-heading">
          <span className="eyebrow">
            {coach.detected ? "COACH DETECTED" : "COACH"}
          </span>
          <small>
            Offline rules ·{" "}
            {coach.severity === "high"
              ? "Priority focus"
              : coach.severity === "medium"
                ? "Next improvement"
                : "Building evidence"}
          </small>
        </div>
        <h2>{coach.title}</h2>
        <p>{coach.explanation}</p>
        <div className="coach-evidence" aria-label="Evidence for coaching">
          {coach.evidence.map((e) => (
            <span key={e}>{e}</span>
          ))}
        </div>
        <MasteryAdvice analysis={coach} />
        <details>
          <summary>Mindset & behavior support</summary>
          <PhilosophyAdvice
            context="home"
            analysis={coach}
            showEvidence={false}
          />
        </details>
      </Card>
      <div className="section-title">
        <h2>I need help with…</h2>
      </div>
      <div className="help-grid">
        {[
          ["Motivate Me", "/coach/motivate", Zap],
          ["Practice Objection", "/practice?mode=battle", MessageSquare],
          ["Practice Pitch", "/practice?mode=pitch", Mic],
          ["Pre-Meeting Boost", "/coach/boost", Sunrise],
          ["Rejection Reset", "/coach/reset", HeartPulse],
          ["Sales Sprint", "/more/sprint", Target],
        ].map(([title, to, Icon]) => (
          <Link key={title} to={to}>
            <Icon size={18} />
            <span>{title}</span>
            <ArrowUpRight size={14} />
          </Link>
        ))}
      </div>
      <div className="home-secondary">
        <Card className="technique">
          <span className="eyebrow">DAILY TECHNIQUE</span>
          <h2>{tech.name}</h2>
          <p>{tech.what}</p>
          <blockquote>“{tech.example}”</blockquote>
          <p>{tech.exercise}</p>
          <SaveButton
            disabled={complete}
            onClick={() =>
              save("mindsetSessions", {
                id: "technique:" + today,
                title: tech.name,
              })
            }
          >
            {complete ? "Challenge completed ✓" : "Mark complete"}
          </SaveButton>
        </Card>
        <Card className="home-history">
          <div className="section-title">
            <h2>Recent activity</h2>
            <Link to="/progress">
              Progress <ArrowUpRight size={14} />
            </Link>
          </div>
          {recent.length ? (
            recent.map((a) => (
              <div className="activity" key={a.id}>
                <div>
                  <strong>
                    {a.outcome === "SOLD"
                      ? "Sale recorded"
                      : a.outcome === "FOLLOW-UP"
                        ? "Follow-up scheduled"
                        : a.outcome === "OWNER ABSENT"
                          ? "Owner unavailable"
                          : "Conversation recorded"}
                  </strong>
                  <small>
                    {a.product} · {a.day}
                  </small>
                </div>
                <span className="tag">
                  {a.kind === "followup"
                    ? "Follow-up"
                    : a.kind === "call"
                      ? "Call"
                      : "Visit"}
                </span>
              </div>
            ))
          ) : (
            <Empty>No activity recorded yet.</Empty>
          )}
        </Card>
      </div>
      <div className="home-momentum">
        <span>
          <Flame size={16} />
          {streak.current} day streak
        </span>
        <span>
          <Zap size={16} />
          {xp} XP
        </span>
        <span>
          Level {level} ·{" "}
          {
            [
              "Starter",
              "Prospector",
              "Closer",
              "Sales Warrior",
              "Sales Master",
            ][level - 1]
          }
        </span>
        <small>
          {level < 5
            ? `${500 - (xp % 500)} XP to next level`
            : "Highest level reached"}
        </small>
      </div>
      <AdviceFollowup />
    </div>
  );
}
