import test from "node:test";
import assert from "node:assert/strict";
import { analyzeSales, selectPeriod } from "../src/services/coachEngine.js";
import { normalizeGoals, defaults } from "../src/utils/metrics.js";
const date = "2026-09-03";
const visits = (count, extra = {}) =>
  Array.from({ length: count }, (_, i) => ({
    id: "visit-" + i,
    day: date,
    kind: "meeting",
    outcome: "REJECTED",
    decisionMaker: true,
    demo: false,
    ...extra,
  }));
const run = (activities, extra = {}) =>
  analyzeSales({ activities, date, ...extra });

test("low activity starts the day, without inventing a skill diagnosis", () => {
  const result = run([]);
  assert.equal(result.bottleneck, "ACTIVITY");
  assert.equal(result.nextAction.to, "/live");
  assert.equal(result.mission.title, "Visit prospect 1 of 10.");
  assert.equal(result.detected, false);
});
test("insufficient data counts real conversations, not owner-absent visits", () => {
  const result = run([
    ...visits(3),
    ...visits(1, {
      id: "absent",
      outcome: "OWNER ABSENT",
      decisionMaker: false,
    }),
  ]);
  assert.equal(result.bottleneck, "INSUFFICIENT_DATA");
  assert.equal(result.realConversations, 3);
  assert.equal(result.mission.title, "Visit prospect 5 of 10.");
});
test("low decision-maker access takes priority over downstream conversion", () => {
  const result = run(visits(8).map((r, i) => ({ ...r, decisionMaker: i < 2 })));
  assert.equal(result.bottleneck, "DECISION_MAKER_ACCESS");
  assert.ok(
    result.evidence.includes(
      "2 decision makers in 8 visits with access recorded",
    ),
  );
});
test("many owner-absent outcomes identify access even without conversations", () => {
  assert.equal(
    run(visits(5, { outcome: "OWNER ABSENT", decisionMaker: false }))
      .bottleneck,
    "DECISION_MAKER_ACCESS",
  );
});
test("low demo conversion recommends demonstration preparation", () => {
  const result = run(visits(6).map((r, i) => ({ ...r, demo: i === 0 })));
  assert.equal(result.bottleneck, "DEMO");
  assert.equal(result.stats.demos, 1);
  assert.equal(result.nextAction.to, "/coach/products");
});
test("reviews distinguish skipped discovery from a low demo ratio", () => {
  const result = run(visits(6), {
    meetings: [
      { id: "r1", day: date, review: true, discovery: false },
      { id: "r2", day: date, review: true, discovery: false },
    ],
  });
  assert.equal(result.bottleneck, "DISCOVERY");
  assert.equal(result.stats.visits, 6);
});
test("high demos and zero sales recommend five closing scenarios", () => {
  const result = run(visits(6).map((r, i) => ({ ...r, demo: i < 4 })));
  assert.equal(result.bottleneck, "CLOSING");
  assert.deepEqual(result.evidence, ["4 demos", "0 sales"]);
  assert.equal(
    result.recommendedPractice.instruction,
    "Practice 5 closing scenarios.",
  );
  assert.equal(result.nextAction.to, "/coach/frameworks?focus=closing");
});
test("value evidence refines a high-demo low-sales diagnosis", () => {
  const result = run(visits(6, { demo: true }), {
    meetings: [
      { day: date, review: true, showValue: false },
      { day: date, review: true, showValue: false },
    ],
  });
  assert.equal(result.bottleneck, "VALUE");
});
test("repeated objection beats a generic closing recommendation", () => {
  const result = run(
    visits(6, { demo: true }).map((r, i) => ({
      ...r,
      objection: i < 3 ? "I will think about it" : null,
    })),
  );
  assert.equal(result.bottleneck, "OBJECTION_HANDLING");
  assert.match(result.evidence[0], /^3 conversations/);
  assert.ok(result.nextAction.to.includes("I%20will%20think%20about%20it"));
});
test("follow-up problem includes prior due commitments and excludes future ones", () => {
  const due = visits(3, {
    day: "2026-09-01",
    outcome: "FOLLOW-UP",
    followUpDate: date,
  });
  const result = run([
    ...due,
    {
      id: "future",
      day: "2026-09-02",
      kind: "meeting",
      outcome: "FOLLOW-UP",
      followUpDate: "2026-09-10",
    },
  ]);
  assert.equal(result.bottleneck, "FOLLOW_UP");
  assert.equal(result.pendingFollowUps, 3);
  assert.equal(result.stats.visits, 0);
  assert.equal(result.mission.followUpAction.to, "/more/followups");
});
test("linked completed follow-ups are not pending or extra visits", () => {
  const due = visits(3, {
    day: "2026-09-01",
    followUpDate: date,
    outcome: "FOLLOW-UP",
  });
  const result = run([
    ...due,
    ...due.map((r, i) => ({
      id: "done" + i,
      kind: "followup",
      day: date,
      outcome: "SOLD",
      followUpOf: r.id,
      value: 100,
    })),
  ]);
  assert.equal(result.pendingFollowUps, 0);
  assert.equal(result.stats.followUps, 3);
  assert.equal(result.stats.visits, 0);
  assert.notEqual(result.bottleneck, "FOLLOW_UP");
});
test("old records without decision-maker flags are not treated as explicit failures", () => {
  const result = run(visits(6, { decisionMaker: undefined }));
  assert.notEqual(result.bottleneck, "DECISION_MAKER_ACCESS");
  assert.equal(result.stats.decisionMakers, 0);
});
test("old goals receive defaults, explicit zero remains zero, inputs unchanged", () => {
  const goals = { visits: 8, demos: 0 };
  assert.equal(normalizeGoals(goals).decisionMakers, defaults.decisionMakers);
  assert.equal(normalizeGoals(goals).demos, 0);
  assert.deepEqual(goals, { visits: 8, demos: 0 });
});
test("personality changes wording, never the evidence or action", () => {
  const activities = visits(6, { demo: true });
  const results = ["Supportive", "Tough", "Analytical", "Sales Manager"].map(
    (personality) => run(activities, { personality }),
  );
  assert.equal(new Set(results.map((r) => r.recommendation)).size, 4);
  for (const result of results) {
    assert.equal(result.bottleneck, results[0].bottleneck);
    assert.deepEqual(result.evidence, results[0].evidence);
    assert.deepEqual(result.nextAction, results[0].nextAction);
    assert.deepEqual(
      result.recommendedPractice,
      results[0].recommendedPractice,
    );
  }
});
test("calendar windows isolate today and support future 7/30 day analysis", () => {
  const rows = [
    "2026-08-05",
    "2026-08-27",
    "2026-08-28",
    "2026-09-03",
    "2026-09-04",
  ].map((day) => ({ day }));
  assert.equal(selectPeriod(rows, { date, days: 1 }).length, 1);
  assert.equal(selectPeriod(rows, { date, days: 7 }).length, 2);
  assert.equal(selectPeriod(rows, { date, days: 30 }).length, 4);
  assert.throws(() => selectPeriod(rows, { date, days: 2 }));
  assert.equal(
    run(visits(6, { day: "2026-09-02", demo: true })).bottleneck,
    "ACTIVITY",
  );
});
test("today is not affected by future completion records", () => {
  const due = visits(3, { followUpDate: date });
  assert.equal(
    run([
      ...due,
      ...due.map((r, i) => ({
        id: "future" + i,
        kind: "followup",
        day: "2026-09-04",
        followUpOf: r.id,
      })),
    ]).pendingFollowUps,
    3,
  );
});
test("met visit targets never produce prospect 11 of 10", () => {
  const result = run(visits(10, { demo: true, outcome: "SOLD" }));
  assert.equal(
    result.mission.title,
    "Visit target reached. Choose your next action.",
  );
  assert.equal(result.nextAction.to, "/more/goals");
});
