import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import {
  stores,
  clear,
  put,
  all,
  backup,
  restore,
  validateBackup,
} from "../src/db/database.js";
import {
  behaviorSignals,
  detectFrog,
  minimumStatus,
  salesDayStreak,
  practicalReview,
} from "../src/services/practicalBehavior.js";
import {
  startFocus,
  finishFocus,
  focusProgress,
  activeFocus,
} from "../src/services/focusBlocks.js";
import { selectPhilosophy } from "../src/services/philosophyEngine.js";
import {
  recommendAdaptive,
  appropriateCandidates,
} from "../src/services/adaptivePhilosophy.js";
import { analyzeSales } from "../src/services/coachEngine.js";
import { weeklyReview } from "../src/services/coachingReview.js";
const now = new Date("2026-09-03T12:00:00"),
  date = "2026-09-03";
const empty = () => Object.fromEntries(stores.map((s) => [s, []]));
const act = (id, extras = {}) => ({
  id,
  day: date,
  kind: "meeting",
  outcome: "REJECTED",
  createdAt: new Date("2026-09-03T12:05:00").toISOString(),
  ...extras,
});
const analysis = analyzeSales({ date });
test("sufficient matching history can select Atomic Habits over the default and remains tone independent", () => {
  const history = Array.from({ length: 5 }, (_, i) => ({
    id: "h" + i,
    type: "principle",
    day: ["2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31", "2026-09-01"][
      i
    ],
    shownAt: "2026-08-28T09:00:00",
    context: "motivate",
    problem: "PROCRASTINATION",
    philosophy: "atomic-habits",
    principle: "REDUCE_FRICTION",
    actionPath: "/live",
    completed: true,
  }));
  const advice = recommendAdaptive({
    options: { analysis, context: "motivate", blocker: "I am procrastinating" },
    history,
  });
  assert.equal(advice.philosophy, "atomic-habits");
  assert.match(advice.adaptationReason, /5 of 5/);
});
test("weekly recommendation uses repeat block evidence associatively", () => {
  const data = empty();
  data.salesActivities = Array.from({ length: 4 }, (_, i) =>
    act("due" + i, { day: "2026-09-01", followUpDate: "2026-09-02" }),
  );
  data.salesExperiments = ["2026-09-01", "2026-09-02", "2026-09-03"].map(
    (day) => ({
      id: day,
      type: "focusBlock",
      day,
      endedAt: now.toISOString(),
      focusType: "Follow-ups",
      planned: 2,
      completed: 2,
    }),
  );
  const review = weeklyReview(data, now);
  assert.equal(review.focus.principle, "Single-tasking");
  assert.match(review.focus.challenge, /association/);
});
test("combined friction uses observed delays; manual setting wins", () => {
  const options = {
    analysis,
    context: "home",
    behavior: { repeatedDelay: true },
  };
  const advice = recommendAdaptive({ options, repeatedDelay: true });
  assert.equal(advice.philosophy, "atomic-habits");
  assert.equal(advice.principle, "REDUCE_FRICTION");
  assert.equal(advice.actionPath, "/live");
  assert.equal(advice.actionLabel, "DO ONE VISIT");
  assert.equal(
    recommendAdaptive({ options: { ...options, philosophy: "limitless" } })
      .philosophy,
    "limitless",
  );
});
test("never miss twice requires a saved missed target and has a practical action", () => {
  const data = empty();
  assert.equal(behaviorSignals(data, now).missedDay, false);
  data.dailyGoals = [{ id: "2026-09-02", visits: 5 }];
  const behavior = behaviorSignals(data, now);
  assert.equal(behavior.missedDay, true);
  const advice = selectPhilosophy({ analysis, behavior });
  assert.equal(advice.principle, "NEVER_MISS_TWICE");
  assert.equal(advice.actionPath, "/more/minimum");
});
test("frog prioritizes oldest overdue commitments and excludes linked completions", () => {
  const data = empty();
  data.salesActivities = [
    act("a", { day: "2026-09-01", followUpDate: "2026-09-01" }),
    act("b", { followUpDate: "2026-09-02" }),
    act("c", { kind: "followup", followUpOf: "a" }),
  ];
  const frog = detectFrog(data, now);
  assert.equal(frog.priority, 100);
  assert.match(frog.reason, /oldest due 2026-09-02/);
  assert.equal(frog.actionRoute, "/more/followups");
  const advice = selectPhilosophy({ analysis, behavior: { frog } });
  assert.equal(advice.philosophy, "eat-that-frog");
  assert.equal(advice.actionPath, "/more/followups");
});
test("practice without action recommends field work, not more practice", () => {
  const data = empty();
  data.pitchPractice = [1, 2, 3].map((id) => ({
    id: String(id),
    day: date,
    rating: "Confident",
  }));
  const behavior = behaviorSignals(data, now);
  assert.equal(behavior.practiceWithoutAction, true);
  const frog = detectFrog(data, now);
  assert.equal(frog.actionRoute, "/live");
  assert.equal(selectPhilosophy({ analysis, behavior }).principle, "EXECUTION");
  data.salesActivities = [act("visit")];
  assert.equal(behaviorSignals(data, now).practiceWithoutAction, false);
});
test("low-quality practice and reported recurring distraction route to Deep Work", () => {
  const data = empty();
  data.objectionPractice = [1, 2, 3].map((id) => ({
    id: String(id),
    day: date,
    rating: 0,
  }));
  data.salesActivities = [act("visit")];
  assert.equal(
    selectPhilosophy({ analysis, behavior: behaviorSignals(data, now) })
      .principle,
    "DELIBERATE_PRACTICE",
  );
  assert.equal(
    selectPhilosophy({ analysis, behavior: { scattered: true } }).principle,
    "SINGLE_TASK",
  );
});
test("frog uses high-priority scheduled work, observed first-action delay and repeated incomplete actions", () => {
  const data = empty();
  data.salesActivities = [
    act("a", { scheduledPriority: "High", followUpDate: date }),
  ];
  assert.equal(detectFrog(data, now).priority, 90);
  data.salesActivities = [];
  data.settings = [
    { id: "sales-day:" + date, startedAt: "2026-09-03T09:00:00" },
  ];
  assert.equal(detectFrog(data, now).priority, 65);
  data.mindsetSessions = [1, 2, 3].map((id) => ({
    id: String(id),
    day: date,
    type: "principle",
    completed: false,
    action: "Ask one closing question",
    actionPath: "/coach/frameworks?focus=closing",
  }));
  assert.equal(detectFrog(data, now).priority, 80);
});
test("minimum day streak requires actual targets, never just activation", () => {
  const data = empty();
  data.settings = [
    {
      id: "minimum-day:" + date,
      type: "minimumDay",
      day: date,
      goals: { visits: 1, decisionMakers: 1, demos: 0, followUps: 1 },
    },
  ];
  assert.equal(minimumStatus(data, date).complete, false);
  assert.equal(salesDayStreak(data, now).current, 0);
  data.salesActivities = [
    act("a", { decisionMaker: true }),
    act("b", { kind: "followup" }),
  ];
  assert.equal(minimumStatus(data, date).complete, true);
  assert.equal(salesDayStreak(data, now).current, 1);
  data.settings.push({ id: "minimum-config", goals: { visits: 99 } });
  assert.equal(minimumStatus(data, date).complete, true);
});
test("focus persists across reload, counts only relevant new work, and rewards completion once", async () => {
  await clear();
  const data = empty();
  data.salesActivities = [act("old")];
  const block = await startFocus(
    { focusType: "Prospecting", duration: 25, planned: 1 },
    data,
    now,
  );
  assert.equal((await all("xpHistory")).length, 0);
  assert.equal(
    activeFocus({ ...data, salesExperiments: await all("salesExperiments") })
      .id,
    block.id,
  );
  await assert.rejects(
    startFocus(
      { focusType: "Pitch practice", duration: 45, planned: 2 },
      data,
      now,
    ),
    /Finish/,
  );
  data.salesActivities.push(act("new"), act("follow", { kind: "followup" }));
  const end = new Date("2026-09-03T12:10:00");
  assert.equal(focusProgress(block, data, end).completed, 1);
  const done = await finishFocus(
    block.id,
    { distractions: 2, outcome: "One visit", notes: "Begin with a question" },
    data,
    end,
  );
  assert.equal(done.completed, 1);
  assert.equal(done.actualMinutes, 10);
  assert.equal(done.meaningful, true);
  await finishFocus(
    block.id,
    { distractions: 0, outcome: "Again", notes: "Again" },
    data,
    end,
  );
  assert.equal((await all("xpHistory")).length, 1);
  const b = await backup();
  await clear();
  await restore(b, true);
  assert.equal(
    (await all("salesExperiments"))[0].notes,
    "Begin with a question",
  );
});
test("empty focus ending records partial work without XP; review uses its completion timestamp", async () => {
  await clear();
  const data = empty();
  const block = await startFocus(
    { focusType: "Sales review", duration: 45, planned: 2 },
    data,
    now,
  );
  data.meetings = [
    act("older", {
      createdAt: "2026-09-01T09:00:00",
      updatedAt: "2026-09-03T12:03:00",
      review: true,
    }),
  ];
  assert.equal(
    focusProgress(block, data, new Date("2026-09-03T12:10:00")).completed,
    1,
  );
  const row = await finishFocus(
    block.id,
    { distractions: 0, outcome: "Partial", notes: "Resume later" },
    data,
    new Date("2026-09-03T12:10:00"),
  );
  assert.equal(row.meaningful, false);
  assert.equal((await all("xpHistory")).length, 0);
});
test("habit stacks and minimum snapshots survive backup with enable state", async () => {
  await clear();
  await put("settings", {
    id: "stack",
    type: "habitStack",
    cue: "After lunch",
    steps: ["Complete follow-ups"],
    enabled: false,
  });
  await put("settings", {
    id: "minimum-day:" + date,
    type: "minimumDay",
    day: date,
    goals: { visits: 1, decisionMakers: 0, demos: 0, followUps: 0 },
  });
  const b = await backup();
  await clear();
  await restore(b, true);
  assert.equal(
    (await all("settings")).find((r) => r.id === "stack").enabled,
    false,
  );
  const bad = structuredClone(b);
  bad.data.settings.find((r) => r.id === "stack").steps = null;
  assert.throws(() => validateBackup(bad));
});
test("weekly practical summary reports observed days, minimum usage and completed block association", () => {
  const data = empty();
  data.salesActivities = [act("a")];
  data.salesExperiments = [
    {
      type: "focusBlock",
      day: date,
      endedAt: now.toISOString(),
      focusType: "Follow-ups",
      completed: 3,
      planned: 3,
    },
  ];
  const report = practicalReview(data, now);
  assert.match(report.consistency, /1 of the last 7/);
  assert.equal(report.bestFocus.focusType, "Follow-ups");
  assert.equal(report.minimumUsed, 0);
});
test("historical candidate pool includes old and new starting approaches; empty legacy state unchanged", () => {
  const candidates = appropriateCandidates({ problem: "STARTING_DELAY" });
  assert.ok(candidates.some((r) => r.key === "grow-rich:DECISION"));
  assert.ok(candidates.some((r) => r.key === "atomic-habits:REDUCE_FRICTION"));
  assert.equal(selectPhilosophy({ analysis }).philosophy, "grow-rich");
  assert.deepEqual(salesDayStreak(empty(), now), { current: 0, best: 0 });
  assert.equal(detectFrog(empty(), now), null);
});
