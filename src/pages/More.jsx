import React from "react";
import { Link, useLocation } from "react-router-dom";
import { PageHead } from "../components/UI";
import Planning from "./Planning";
import Mindset from "./Mindset";
import Settings from "./Settings";
import BehaviorTools from "./BehaviorTools";
import { ConversationCoach } from "./SalesMastery";
export const modules = [
  ["conversation", "Conversation coach", "One question, one useful next step."],
  [
    "frog",
    "Today’s frog",
    "Choose an important next action from your records.",
  ],
  [
    "focus",
    "Focus sales block",
    "One activity, a clear target, a useful review.",
  ],
  ["minimum", "Minimum sales day", "Protect the habit with a manageable day."],
  ["habits", "Habit stacks", "Connect daily cues to sales actions."],
  ["goals", "Daily goals", "Make today’s actions measurable."],
  ["sprint", "Sales sprint", "30, 60 or 90 minutes of focus."],
  ["followups", "Follow-ups", "Keep the promises you made."],
  ["review", "After-meeting coach", "Turn a conversation into a lesson."],
  ["autopsy", "Deal autopsy", "Find where the opportunity stalled."],
  ["calculator", "Goal calculator", "Work backwards from your target."],
  ["mindset", "Mindset studio", "Visualize, then take action."],
  ["guided", "Guided sessions", "Build calm and focused self-talk."],
  ["identity", "Identity builder", "Who you are is what you practice."],
  ["thoughts", "Thought converter", "Challenge a thought. Choose an action."],
  ["rejections", "Rejection counter", "Make room for a respectful no."],
  ["evidence", "Success evidence", "Remember what you have done well."],
  ["morning", "Morning ritual", "Give your day a deliberate start."],
  ["evening", "Evening debrief", "Reflect today. Improve tomorrow."],
  ["vision", "Vision board", "Keep a meaningful goal in sight."],
  ["settings", "Settings & backup", "Your preferences. Your data."],
];
export default function More() {
  const location = useLocation();
  const mode = location.pathname.split("/")[2],
    entry = modules.find((m) => m[0] === mode);
  return (
    <>
      <PageHead
        eyebrow="YOUR COACHING TOOLKIT"
        title={entry?.[1] || "Build a better sales day."}
        description={
          entry?.[2] ||
          "Small routines that connect mindset to meaningful action."
        }
      />
      {entry ? (
        <>
          <Link className="text-link" style={{ marginBottom: 20 }} to="/more">
            ← All tools
          </Link>
          {mode === "conversation" ? (
            <ConversationCoach key={location.search} />
          ) : ["frog", "focus", "minimum", "habits"].includes(mode) ? (
            <BehaviorTools key={mode} mode={mode} />
          ) : mode === "settings" ? (
            <Settings />
          ) : [
              "goals",
              "sprint",
              "followups",
              "review",
              "autopsy",
              "calculator",
            ].includes(mode) ? (
            <Planning key={mode} mode={mode} />
          ) : (
            <Mindset key={mode} mode={mode} />
          )}
        </>
      ) : (
        <div className="more-grid">
          {modules.map(([id, t, d]) => (
            <Link key={id} to={"/more/" + id}>
              <h3>{t} ↗</h3>
              <p>{d}</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
