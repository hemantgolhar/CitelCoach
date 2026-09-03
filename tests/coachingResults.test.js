import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import {
  summarizeAdvice,
  aggregateEffectiveness,
  personalBests,
  pendingFeedback,
  relevantOutcome,
} from "../src/services/adviceEffectiveness.js";
import {
  firstActionTimes,
  recoveryTimes,
  actionStreaks,
  habitLoop,
  recordSalesDayOpen,
} from "../src/services/behaviorMetrics.js";
import {
  chooseHistorical,
  recommendAdaptive,
} from "../src/services/adaptivePhilosophy.js";
import {
  weeklyReview,
  createCoachingExperiment,
  experimentReport,
} from "../src/services/coachingReview.js";
import {
  recordAdviceShown,
  completePrinciple,
  saveAdviceFeedback,
  dismissAdviceFeedback,
} from "../src/services/principleHistory.js";
import { analyzeSales } from "../src/services/coachEngine.js";
import { selectPhilosophy } from "../src/services/philosophyEngine.js";
import { all, clear, backup, restore } from "../src/db/database.js";
const date = "2026-09-03",
  now = new Date("2026-09-03T12:00:00");
const stamp = (day, minute = 0) =>
  `${day}T09:${String(minute).padStart(2, "0")}:00`;
const act = (id, day = date, minute = 0, extra = {}) => ({
  id,
  day,
  kind: "meeting",
  createdAt: stamp(day, minute),
  outcome: "REJECTED",
  ...extra,
});
const sample = (
  principle = "DECISION",
  philosophy = "grow-rich",
  completed = 5,
) =>
  Array.from({ length: 5 }, (_, i) => ({
    id: principle + i,
    type: "principle",
    day: `2026-08-${28 + i}`,
    shownAt: `2026-08-${28 + i}T09:00:00`,
    principle,
    philosophy,
    context: "motivate",
    problem: "PROCRASTINATION",
    actionPath: "/live",
    completed: i < completed,
  })).map((r, i) => ({
    ...r,
    day: ["2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31", "2026-09-01"][
      i
    ],
    shownAt: stamp(
      ["2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31", "2026-09-01"][i],
    ),
  }));
const analysis = analyzeSales({ date });
const options = {
  analysis,
  philosophy: "citelcoach",
  context: "motivate",
  blocker: "I am procrastinating",
};
const base = selectPhilosophy(options);
test("outcome relevance depends on the sales step rather than treating every visit as a close", () => {
  assert.equal(
    relevantOutcome({ bottleneck: "CLOSING", outcome: "Completed visit" }),
    false,
  );
  assert.equal(
    relevantOutcome({ bottleneck: "CLOSING", outcome: "Sale" }),
    true,
  );
  assert.equal(
    relevantOutcome({ bottleneck: "DISCOVERY", outcome: "Got demo" }),
    true,
  );
});

test("effectiveness separates completion, optional outcomes, and usefulness denominators", () => {
  const rows = sample().map((r, i) => ({
    ...r,
    outcome: i < 2 ? "Sale" : i === 2 ? "Rejected" : null,
    usefulness: i < 2 ? "Very useful" : null,
  }));
  const result = summarizeAdvice(rows);
  assert.equal(result.shown, 5);
  assert.equal(result.completed, 5);
  assert.equal(result.positiveOutcomes, 2);
  assert.equal(result.outcomeRate, 2 / 3);
  assert.equal(result.averageUsefulness, 4);
  assert.equal(result.ratingCount, 2);
  for (const dimension of [
    "philosophy",
    "principle",
    "problem",
    "bottleneck",
    "action",
  ])
    assert.equal(aggregateEffectiveness(rows, dimension)[0].shown, 5);
});
test("insufficient sample requires five exposures across three days", () => {
  assert.equal(summarizeAdvice(sample().slice(0, 4)).meaningful, false);
  assert.equal(
    summarizeAdvice(sample().map((r) => ({ ...r, day: date }))).meaningful,
    false,
  );
  assert.equal(personalBests(sample()).action, null);
});
test("personal best ranks meaningful competing principles by completion", () => {
  const result = personalBests([
    ...sample(),
    ...sample("MOTIVATION", "limitless", 3),
  ]);
  assert.equal(result.action.principle, "DECISION");
  assert.equal(result.rejection, null);
});
test("history preference uses relevant context only and excludes current-day feedback", () => {
  assert.equal(chooseHistorical(base, sample()).principle, "DECISION");
  assert.equal(
    chooseHistorical(
      base,
      sample().map((r) => ({ ...r, day: date })),
    ),
    null,
  );
  assert.equal(
    chooseHistorical(
      base,
      sample().map((r) => ({ ...r, problem: "REJECTION" })),
    ),
    null,
  );
});
test("diversity chooses a similarly completed appropriate alternative after repetition", () => {
  const decision = sample().map((r, i) => ({
    ...r,
    shownAt: `2026-09-02T10:0${i}:00`,
  }));
  const result = chooseHistorical(base, [
    ...sample("MOTIVATION", "limitless"),
    ...decision,
  ]);
  assert.equal(result.principle, "MOTIVATION");
  assert.equal(result.diverse, true);
  assert.equal(
    chooseHistorical(base, [
      ...sample("MOTIVATION", "limitless", 2),
      ...decision,
    ]).principle,
    "DECISION",
  );
});
test("adaptation respects manual philosophy and explains combined historical preference", () => {
  assert.equal(
    recommendAdaptive({ options, history: sample() }).principle,
    "DECISION",
  );
  assert.match(
    recommendAdaptive({ options, history: sample() }).adaptationReason,
    /5 of 5/,
  );
  assert.equal(
    recommendAdaptive({
      options: { ...options, philosophy: "limitless" },
      history: sample(),
    }).principle,
    "MOTIVATION",
  );
});
test("first-action timing excludes unobserved and reversed starts", () => {
  const settings = [{ type: "salesDay", day: date, startedAt: stamp(date) }];
  assert.equal(firstActionTimes([act("v", date, 7)], settings, now).today, 7);
  assert.equal(firstActionTimes([act("v", date, 7)], [], now).today, null);
  assert.equal(
    firstActionTimes(
      [act("v", date, 7)],
      [{ ...settings[0], startedAt: stamp(date, 10) }],
      now,
    ).today,
    null,
  );
});
test("repeated starting delays need three measured days; weekly review chooses one focus", () => {
  const days = ["2026-09-01", "2026-09-02", "2026-09-03"];
  const settings = days.map((day) => ({
    type: "salesDay",
    day,
    startedAt: stamp(day),
  }));
  const activities = days.map((day, i) => act(String(i), day, 25));
  const timing = firstActionTimes(activities, settings, now);
  assert.equal(timing.repeatedDelay, true);
  assert.equal(timing.average7, 25);
  const report = weeklyReview({ salesActivities: activities, settings }, now);
  assert.equal(report.focus.title, "Start faster.");
  assert.equal(report.focus.principle, "Decision");
  assert.equal(report.strongest, null);
  const advice = recommendAdaptive({
    options: { analysis, context: "home", philosophy: "citelcoach" },
    repeatedDelay: true,
  });
  assert.equal(advice.problem, "STARTING_DELAY");
  assert.equal(advice.principle, "DECISION");
});
test("recovery ends at next same-day prospect, excludes follow-ups and overnight gaps", () => {
  const result = recoveryTimes(
    [
      act("no", date, 0),
      act("call", date, 2, { kind: "followup", outcome: "SOLD" }),
      act("visit", date, 4, { outcome: "SOLD" }),
    ],
    now,
  );
  assert.equal(result.today, 4);
  assert.equal(result.rows.length, 1);
  assert.equal(
    recoveryTimes(
      [act("no", "2026-09-02"), act("next", date, 4, { outcome: "SOLD" })],
      now,
    ).rows.length,
    0,
  );
});
test("habit loops are behavior cues with existing app rewards, not automatic XP", () => {
  assert.match(habitLoop("rejection").routine, /30-second/);
  assert.match(
    habitLoop("motivate", "I am procrastinating").routine,
    /one visit/,
  );
  assert.match(habitLoop("morning").reward, /existing XP/);
  assert.equal(habitLoop("home"), null);
});
test("action streaks require logged actions and never count app opening or DONE", () => {
  const empty = {
    settings: [{ type: "salesDay", day: date, startedAt: stamp(date) }],
    salesActivities: [],
    mindsetSessions: [{ completed: true, day: date }],
    pitchPractice: [],
    objectionPractice: [],
  };
  assert.equal(actionStreaks(empty, now).firstAction.current, 0);
  const full = {
    ...empty,
    salesActivities: [
      act("one", date, 1),
      act("two", date, 4, { outcome: "SOLD" }),
      act("follow", date, 5, { kind: "followup", outcome: "FOLLOW-UP" }),
    ],
    pitchPractice: [{ day: date }],
  };
  const s = actionStreaks(full, now);
  assert.equal(s.firstAction.current, 1);
  assert.equal(s.recovery.current, 1);
  assert.equal(s.followUp.current, 1);
  assert.equal(s.practice.current, 1);
  assert.equal(s.salesDay.current, 0);
});
test("daily app opening is stored once without moving the start on reload", async () => {
  await clear();
  await recordSalesDayOpen(now);
  await recordSalesDayOpen(new Date(+now + 60000));
  const rows = await all("settings");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].startedAt, now.toISOString());
});
test("optional follow-up is delayed, can be skipped, and does not infer success", async () => {
  await clear();
  const advice = selectPhilosophy({ analysis });
  const shown = await recordAdviceShown(advice, { now: now.toISOString() });
  const done = await completePrinciple(shown.id, { now: now.toISOString() });
  assert.equal(pendingFeedback([done], new Date(+now + 5 * 60000)), null);
  assert.equal(
    pendingFeedback([done], new Date(+now + 11 * 60000)).id,
    shown.id,
  );
  assert.equal(summarizeAdvice([done]).positiveOutcomes, 0);
  await dismissAdviceFeedback(shown.id);
  assert.equal(
    pendingFeedback(await all("mindsetSessions"), new Date(+now + 11 * 60000)),
    null,
  );
});
test("outcome feedback persists snapshots without logging a sale, and survives backup", async () => {
  await clear();
  const advice = selectPhilosophy({ analysis });
  const shown = await recordAdviceShown(advice, { now: stamp(date, 0) });
  await assert.rejects(
    saveAdviceFeedback(shown.id, { outcome: "Sale" }),
    /DONE/,
  );
  await completePrinciple(shown.id, { now: stamp(date, 1) });
  const record = await saveAdviceFeedback(shown.id, {
    outcome: "Sale",
    usefulness: "Useful",
    notes: "Customer agreed.",
    activities: [act("sale", date, 4, { outcome: "SOLD", value: 500 })],
    now: stamp(date, 5),
  });
  assert.equal(record.statsAfterAction.sales, 1);
  assert.equal(record.usefulness, "Useful");
  assert.equal((await all("salesActivities")).length, 0);
  assert.equal((await all("xpHistory")).length, 0);
  const b = await backup();
  await clear();
  await restore(b, true);
  assert.equal((await all("mindsetSessions"))[0].outcome, "Sale");
  await assert.rejects(saveAdviceFeedback(shown.id, { usefulness: "amazing" }));
});
test("legacy advice needs no outcome or rating and remains measurable", () => {
  const result = summarizeAdvice([
    {
      type: "principle",
      id: "old",
      completed: true,
      day: date,
      advice: { bottleneck: "CLOSING" },
    },
  ]);
  assert.equal(result.completed, 1);
  assert.equal(result.outcomeRate, null);
  assert.equal(result.averageUsefulness, null);
  assert.equal(
    aggregateEffectiveness(
      [{ type: "principle", advice: { bottleneck: "CLOSING" } }],
      "bottleneck",
    )[0].key,
    "CLOSING",
  );
});
test("experiment lasts seven dates and only matches procrastination in Combined", () => {
  const experiment = { ...createCoachingExperiment([], now), id: "experiment" };
  assert.equal(experiment.endDay, "2026-09-09");
  const advice = recommendAdaptive({ options, experiments: [experiment] });
  assert.equal(advice.experimentId, "experiment");
  assert.equal(advice.principle, "DECISION");
  assert.equal(
    recommendAdaptive({
      options: { ...options, blocker: "Fear of rejection" },
      experiments: [experiment],
    }).experimentId,
    undefined,
  );
  const report = experimentReport(
    experiment,
    [
      {
        type: "principle",
        experimentId: "experiment",
        completed: true,
        day: date,
      },
    ],
    [],
    new Date("2026-09-10T12:00:00"),
  );
  assert.equal(report.status, "Complete");
  assert.equal(report.shown, 1);
  assert.equal(report.completed, 1);
});
