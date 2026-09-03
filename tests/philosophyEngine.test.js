import test from "node:test";
import assert from "node:assert/strict";
import { analyzeSales } from "../src/services/coachEngine.js";
import {
  selectPhilosophy,
  planTomorrow,
  morningFromPlan,
} from "../src/services/philosophyEngine.js";
import { applyCoachPersonality } from "../src/services/coachPersonality.js";
import { philosophies, normalizePhilosophy } from "../src/data/philosophies.js";
const date = "2026-09-03";
const visits = (n, extra = {}) =>
  Array.from({ length: n }, (_, i) => ({
    id: String(i),
    day: date,
    kind: "meeting",
    outcome: "REJECTED",
    decisionMaker: true,
    demo: true,
    ...extra,
  }));
const low = analyzeSales({ activities: visits(2, { demo: false }), date });
const closing = analyzeSales({ activities: visits(6), date });
const pick = (philosophy, extra = {}) =>
  selectPhilosophy({ analysis: low, philosophy, ...extra });

test("Limitless selects mindset from reported fear and uses real evidence", () => {
  const result = pick("limitless", {
    context: "motivate",
    blocker: "Fear of rejection",
    successEvidence: [{ text: "Asked one useful question yesterday." }],
  });
  assert.equal(result.principle, "MINDSET");
  assert.equal(result.stats.visits, 2);
  assert.ok(result.evidence.includes("2 visits"));
  assert.ok(result.evidence.some((e) => e.includes("yesterday")));
  assert.equal(
    result.action,
    "Have 3 more real conversations before judging the market.",
  );
});
test("Limitless motivation selects one achievable visit for procrastination", () => {
  const r = pick("limitless", {
    context: "motivate",
    blocker: "I am procrastinating",
  });
  assert.equal(r.principle, "MOTIVATION");
  assert.equal(r.actionLabel, "DO ONE VISIT");
  assert.equal(r.actionPath, "/live");
});
test("Limitless methods keeps supported closing evidence and destination", () => {
  const r = pick("limitless", { analysis: closing });
  assert.equal(r.principle, "METHOD");
  assert.ok(r.evidence.includes("6 demos"));
  assert.ok(r.evidence.includes("0 sales"));
  assert.equal(r.actionPath, closing.nextAction.to);
});
test("Think and Grow Rich decision responds to overthinking", () => {
  const r = pick("grow-rich", { context: "motivate", blocker: "Overthinking" });
  assert.equal(r.principle, "DECISION");
  assert.equal(r.duration, 300);
  assert.equal(r.actionPath, "/live");
});
test("persistence after rejection uses the next actual prospect number", () => {
  const r = pick("grow-rich", {
    context: "rejection",
    objection: "Too expensive",
  });
  assert.equal(r.principle, "PERSISTENCE");
  assert.equal(r.action, "Complete prospect #3 and record what happened.");
  assert.equal(r.actionLabel, "NEXT PROSPECT");
});
test("organized planning opens calculator for goals and follow-up list for due commitments", () => {
  assert.equal(
    pick("grow-rich", { context: "goals" }).actionPath,
    "/more/calculator",
  );
  const analysis = analyzeSales({
    date,
    activities: visits(3, { followUpDate: date, outcome: "FOLLOW-UP" }),
  });
  const r = pick("grow-rich", { analysis });
  assert.equal(r.principle, "ORGANIZED_PLANNING");
  assert.equal(r.actionPath, "/more/followups");
});
test("mental rehearsal before a meeting ends with entering, not a guaranteed result", () => {
  const r = pick("subconscious", { context: "pre-meeting" });
  assert.equal(r.principle, "MENTAL_REHEARSAL");
  assert.equal(r.actionLabel, "ENTER NOW");
  assert.equal(r.actionPath, "/live");
  assert.match(r.exercise, /safely stationary/);
});
test("Sales Psychology selects discovery from low demo conversion", () => {
  const analysis = analyzeSales({
    date,
    activities: visits(8).map((r, i) => ({ ...r, demo: i < 2 })),
  });
  const r = pick("sales-psychology", { analysis });
  assert.equal(r.principle, "DISCOVERY");
  assert.equal(r.actionPath, "/coach/frameworks?focus=discovery");
  assert.equal(r.stats.decisionMakers, 8);
});
test("combined routing chooses exactly one deterministic primary principle", () => {
  const cases = [
    ["Fear of rejection", "subconscious", "MENTAL_REHEARSAL"],
    ["I am procrastinating", "limitless", "MOTIVATION"],
    ["Overthinking", "grow-rich", "DECISION"],
  ];
  for (const [blocker, philosophy, principle] of cases) {
    const options = { context: "motivate", blocker };
    const result = pick("citelcoach", options);
    assert.equal(result.philosophy, philosophy);
    assert.equal(result.principle, principle);
    assert.deepEqual(result, pick("citelcoach", options));
  }
  assert.equal(pick("citelcoach", { analysis: closing }).principle, "CLOSING");
  assert.equal(
    pick("citelcoach", { context: "rejection" }).principle,
    "PERSISTENCE",
  );
  assert.equal(
    pick("citelcoach", { context: "goals" }).principle,
    "ORGANIZED_PLANNING",
  );
});
test("philosophy and personality are independent; tone never changes action or principle", () => {
  const raw = pick("limitless", { analysis: closing });
  const frozen = JSON.stringify(raw);
  const tones = ["Supportive", "Tough", "Analytical", "Sales Manager"].map(
    (t) => applyCoachPersonality(raw, t),
  );
  assert.equal(new Set(tones.map((r) => r.spokenInsight)).size, 4);
  for (const result of tones) {
    assert.equal(result.principle, raw.principle);
    assert.equal(result.action, raw.action);
    assert.equal(result.actionPath, raw.actionPath);
    assert.deepEqual(result.evidence, raw.evidence);
  }
  assert.equal(JSON.stringify(raw), frozen);
});
test("legacy or unknown philosophy defaults safely to CitelCoach Method", () => {
  assert.equal(normalizePhilosophy(undefined), "citelcoach");
  assert.equal(normalizePhilosophy("removed"), "citelcoach");
  assert.equal(pick(undefined).selectedPhilosophy, "citelcoach");
});
test("all original catalog principles have a usable exercise and action", () => {
  for (const book of philosophies.filter((p) => p.id !== "citelcoach"))
    for (const p of book.principles) {
      const r = pick(book.id, { context: "book", principle: p.id });
      assert.equal(r.principle, p.id);
      assert.equal(r.action, p.action);
      assert.ok(r.exercise);
      assert.ok(r.actionPath.startsWith("/"));
      assert.ok(r.sourceLabel);
    }
});
test("evening plan uses recorded data and morning preserves its dated basis", () => {
  const plan = planTomorrow({ analysis: closing, philosophy: "citelcoach" });
  assert.equal(plan.forDate, "2026-09-04");
  assert.equal(plan.advice.principle, "CLOSING");
  assert.ok(plan.evidence.includes("6 demos"));
  const morning = morningFromPlan(plan, {
    date: "2026-09-04",
    philosophy: "citelcoach",
    stats: low.stats,
  });
  assert.equal(morning.principle, "CLOSING");
  assert.equal(morning.context, "morning");
  assert.equal(morning.date, "2026-09-04");
  assert.match(morning.evidence[0], /2026-09-03/);
  assert.equal(
    morningFromPlan(plan, {
      date: "2026-09-05",
      philosophy: "citelcoach",
      stats: low.stats,
    }),
    null,
  );
  assert.equal(
    morningFromPlan(plan, {
      date: "2026-09-04",
      philosophy: "limitless",
      stats: low.stats,
    }),
    null,
  );
});
test("morning with no debrief and old debriefs need no migration", () => {
  assert.equal(
    morningFromPlan(undefined, {
      date,
      philosophy: "citelcoach",
      stats: low.stats,
    }),
    null,
  );
  assert.equal(
    pick("citelcoach", { analysis: analyzeSales({ date }), context: "morning" })
      .principle,
    "DECISION",
  );
});
