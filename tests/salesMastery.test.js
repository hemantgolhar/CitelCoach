import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import {
  salesMastery,
  SALES_STAGES,
  detectConversationStage,
  spinQuestion,
  qualificationScore,
  dealQuality,
  selectClose,
  microCommitment,
  classifyObjection,
  diagnoseObjection,
  negotiationGuidance,
  classifyFollowUp,
  followUpObjective,
  FOLLOW_UP_PURPOSES,
  helpNow,
  assistOptions,
  autopsyStep,
} from "../src/services/salesMasteryEngine.js";
import { playbookFor, salesPlaybooks } from "../src/data/salesPlaybooks.js";
import {
  salesSkillSignals,
  pipelineSignals,
  recordMasteryShown,
  masteryHistorySummary,
} from "../src/services/salesMasteryTracking.js";
import {
  customerPersonalities,
  difficulties,
  roleplayRound,
  evaluateRoleplay,
} from "../src/services/salesRoleplay.js";
import { analyzeSales } from "../src/services/coachEngine.js";
import { recommendAdaptive } from "../src/services/adaptivePhilosophy.js";
import {
  completePrinciple,
  saveAdviceFeedback,
} from "../src/services/principleHistory.js";
import {
  stores,
  clear,
  all,
  put,
  backup,
  restore,
  validateBackup,
} from "../src/db/database.js";
import { metrics } from "../src/utils/metrics.js";
import { startFocus, focusProgress } from "../src/services/focusBlocks.js";
const date = "2026-09-03",
  now = new Date(date + "T12:00:00"),
  analysis = analyzeSales({ date });
const data = () => Object.fromEntries(stores.map((s) => [s, []]));
const ready = {
  problem: true,
  impact: true,
  decisionMaker: true,
  need: true,
  value: true,
  budget: true,
  timing: true,
  nextStep: true,
  discovery: true,
  interested: true,
  demo: true,
};
const activity = (id, extras = {}) => ({
  id,
  kind: "meeting",
  day: date,
  outcome: "REJECTED",
  createdAt: date + "T12:01:00",
  ...extras,
});
test("nineteen standardized stages are unique and funnel maps to conversation stage", () => {
  assert.equal(SALES_STAGES.length, 19);
  assert.equal(new Set(SALES_STAGES).size, 19);
  assert.equal(detectConversationStage({}, analysis), "PROSPECTING");
  assert.equal(
    detectConversationStage({ decisionMaker: false }, analysis),
    "DECISION_MAKER_ACCESS",
  );
  assert.equal(
    detectConversationStage({ problem: false, stage: "CLOSING" }, analysis),
    "DISCOVERY",
  );
  assert.equal(detectConversationStage({ outcome: "SOLD" }, analysis), "WON");
  assert.equal(
    detectConversationStage({ outcome: "REJECTED", finished: true }, analysis),
    "LOST",
  );
});
for (const p of salesPlaybooks)
  test(`${p.name} has original SPIN questions and a claim-verification playbook`, () => {
    assert.equal(Object.keys(p.spin).length, 4);
    assert.equal(spinQuestion(p.id, "SITUATION", 1), p.spin.PROBLEM);
    assert.equal(spinQuestion(p.name, "NEED"), p.spin.NEED);
    assert.match(p.verification, /VERIFY PRODUCT CLAIM/);
    assert.ok(
      p.idealCustomer &&
        p.demoStrategy &&
        p.badFit.length &&
        p.followUpStrategy,
    );
    assert.equal(Object.keys(p.qualification).length, 6);
  });
test("discovery blocks closing, demos and negotiation when need is unknown", () => {
  for (const stage of [
    "CLOSING",
    "DEMO",
    "PRESENTATION",
    "NEGOTIATION",
    "VALUE",
  ]) {
    const r = salesMastery({ analysis, date, conversation: { stage } });
    assert.equal(r.framework, "CONSULTATIVE");
    assert.equal(r.problem, "INSUFFICIENT_DISCOVERY");
    assert.match(r.action, /two discovery/);
  }
  assert.equal(
    selectClose({ budget: true, value: true }).type,
    "DISCOVERY_FIRST",
  );
});
test("qualification and quality count explicit evidence, not truthy text or purchase probability", () => {
  assert.equal(qualificationScore({}).score, 0);
  assert.equal(qualificationScore({ problem: "yes" }).known, 0);
  assert.deepEqual(qualificationScore(ready), {
    score: 100,
    known: 6,
    total: 6,
    label: "Strong",
    note: "Checklist coverage from your recorded answers; not purchase probability.",
  });
  assert.equal(dealQuality({}).label, "EARLY");
  assert.equal(
    dealQuality({ problem: true, need: true, value: true }).label,
    "DEVELOPING",
  );
  assert.equal(dealQuality(ready).label, "STRONG");
});
test("Challenger tests a perspective without invented statistics when discovery found no problem", () => {
  const r = salesMastery({
    analysis,
    date,
    product: "reviews",
    conversation: { discovery: true, problem: false },
  });
  assert.equal(r.framework, "CHALLENGER");
  assert.match(r.response, /may or may not/);
  assert.doesNotMatch(r.response, /\d+%/);
  assert.match(r.action, /no problem may exist/);
});
test("weak pipeline prescribes five attempts ahead of mindset", () => {
  const r = salesMastery({ analysis, date });
  assert.equal(r.framework, "PROSPECTING");
  assert.equal(r.response, "Your pipeline needs more conversations.");
  assert.match(r.action, /5 prospecting/);
});
for (const [text, type] of [
  ["Too expensive", "PRICE"],
  ["What is the benefit?", "VALUE"],
  ["We don't need it", "NEED"],
  ["Can I trust this?", "TRUST"],
  ["We are busy", "TIMING"],
  ["My partner decides", "AUTHORITY"],
  ["We already have something similar", "COMPETITOR"],
  ["Is my data secure?", "RISK"],
  ["Send details on WhatsApp", "INFORMATION"],
  ["I'll think about it", "STALL"],
  ["Hmm", "UNKNOWN"],
])
  test(`objection classification: ${type}`, () => {
    assert.equal(classifyObjection(text), type);
    const r = diagnoseObjection(text);
    assert.match(r.mayMean, /may mean/);
    assert.ok(r.question && r.nextStep && r.response);
    assert.equal(r.steps.join(" "), "LISTEN ACKNOWLEDGE EXPLORE RESPOND");
  });
test("LAER branches follow the clarified concern instead of default price defense", () => {
  const initial = diagnoseObjection("Too expensive");
  assert.match(initial.question, /budget|investment/);
  const budget = diagnoseObjection("Too expensive", "Budget limit"),
    value = diagnoseObjection("Too expensive", "Value unclear");
  assert.notEqual(budget.response, value.response);
  assert.match(budget.response, /approved/);
  assert.match(value.nextStep, /make sense/);
  assert.match(diagnoseObjection("No need", "Need absent").response, /Accept/);
});
test("repeated customer objection is read from actual data rather than assumed price", () => {
  const d = data();
  d.salesActivities = Array.from({ length: 6 }, (_, i) =>
    activity(String(i), {
      objection: "Can I trust this?",
      decisionMaker: true,
    }),
  );
  const a = analyzeSales({ activities: d.salesActivities, date });
  assert.equal(a.bottleneck, "OBJECTION_HANDLING");
  const result = salesMastery({ data: d, analysis: a, date });
  assert.equal(result.framework, "LAER");
  assert.equal(result.problem, "TRUST");
});
test("ethical negotiation explores constraints and never invents an approved offer", () => {
  const n = negotiationGuidance();
  assert.match(n.action, /actually approved/);
  assert.match(n.question, /business sense/);
  assert.match(
    negotiationGuidance({ approvedTrade: "Verified two-unit package" }).action,
    /Verified two-unit/,
  );
  assert.equal(
    salesMastery({
      analysis,
      date,
      conversation: { ...ready, stage: "NEGOTIATION" },
    }).framework,
    "ETHICAL_NEGOTIATION",
  );
});
test("six closing approaches respect evidence and readiness", () => {
  assert.equal(selectClose(ready).type, "DIRECT");
  assert.equal(selectClose({ ...ready, interested: false }).type, "TRIAL");
  assert.equal(selectClose({ ...ready, benefitsConfirmed: 2 }).type, "SUMMARY");
  assert.equal(
    selectClose({
      ...ready,
      verifiedOptions: ["Confirmed option A", "Confirmed option B"],
    }).type,
    "ALTERNATIVE",
  );
  assert.equal(selectClose({ ...ready, notReady: true }).type, "NEXT_STEP");
  assert.equal(
    selectClose({ ...ready, consentNextStep: true }).type,
    "ASSUMPTIVE_NEXT_STEP",
  );
  assert.equal(
    selectClose({ ...ready, decisionMaker: false }).type,
    "NEXT_STEP",
  );
});
test("micro commitments advance only to a legitimate next step", () => {
  assert.match(microCommitment({}), /two questions/);
  assert.match(
    microCommitment({ ...ready, decisionMaker: false }),
    /person who decides/,
  );
  assert.match(microCommitment({ ...ready, demo: false }), /demonstration/);
  assert.match(microCommitment({ ...ready, value: false }), /clarify/);
});
test("follow-up classification provides a specific objective for all eight purposes", () => {
  const texts = [
    "send information",
    "decision pending",
    "partner approval",
    "budget next month",
    "demo",
    "trial",
    "no response",
    "checking",
  ];
  assert.deepEqual(texts.map(classifyFollowUp), FOLLOW_UP_PURPOSES);
  assert.equal(new Set(FOLLOW_UP_PURPOSES.map(followUpObjective)).size, 8);
  assert.match(followUpObjective("Partner approval"), /decision maker/);
});
test("real-time help stays short, avoids invented prices and respects discovery", () => {
  for (const option of assistOptions) {
    const r = helpNow(option, { analysis, date });
    assert.ok(r.nextQuestion && r.action);
    assert.ok(r.response.length < 300);
  }
  assert.match(
    helpNow("Customer wants price", { analysis, date }).action,
    /VERIFY PRODUCT CLAIM/,
  );
  assert.equal(
    helpNow("I don't know how to close", { analysis, date }).framework,
    "CONSULTATIVE",
  );
  assert.match(
    helpNow("Customer says think about it", { analysis, date }).nextQuestion,
    /usefulness, price, or timing/,
  );
});
test("autopsy stops after the first missing step without treating unseen answers as failures", () => {
  assert.equal(autopsyStep({}).key, "decisionMaker");
  assert.equal(autopsyStep({ decisionMaker: true }).key, "problem");
  const r = autopsyStep({ decisionMaker: true, problem: false });
  assert.equal(r.done, true);
  assert.equal(r.stage, "DISCOVERY");
  assert.equal(r.practice, "SPIN Problem Questions");
});
test("personality changes coaching phrasing only; mindset preference cannot override selling evidence", () => {
  const opts = { analysis, date, conversation: { ...ready, stage: "CLOSING" } };
  const a = salesMastery({ ...opts, personality: "Tough" }),
    b = salesMastery({ ...opts, personality: "Supportive" });
  assert.equal(a.framework, b.framework);
  assert.equal(a.nextQuestion, b.nextQuestion);
  assert.notEqual(a.coachTip, b.coachTip);
  assert.equal(a.framework, "CLOSE_DIRECT");
  const mindset = recommendAdaptive({
    options: {
      analysis,
      philosophy: "atomic-habits",
      blocker: "procrastinating",
    },
  });
  assert.equal(mindset.philosophy, "atomic-habits");
  assert.equal(a.domain, "sales");
});
test("practice without field observations never becomes a high field-skill score", () => {
  const d = data();
  d.practiceSessions = Array.from({ length: 20 }, (_, i) => ({
    id: String(i),
    stage: "DISCOVERY",
  }));
  const s = salesSkillSignals(d).find((s) => s.name === "Discovery");
  assert.equal(s.practice, 20);
  assert.equal(s.score, null);
  assert.equal(s.realActivity, 0);
  d.salesActivities = [
    activity("1", { observations: { discovery: true } }),
    activity("2", { observations: { discovery: false } }),
    activity("3"),
  ];
  assert.equal(
    salesSkillSignals(d).find((s) => s.name === "Discovery").score,
    null,
  );
  d.salesActivities.push(activity("4", { observations: { discovery: true } }));
  assert.equal(
    salesSkillSignals(d).find((s) => s.name === "Discovery").score,
    67,
  );
});
test("calls are separate from visits and contribute to prospecting focus work", async () => {
  const d = data();
  d.salesActivities = [activity("call", { kind: "call" }), activity("visit")];
  assert.equal(metrics(d.salesActivities).visits, 1);
  assert.equal(pipelineSignals(d, date).calls, 1);
  assert.equal(pipelineSignals(d, date).attempts, 2);
  await clear();
  const block = await startFocus(
    { focusType: "Prospecting", duration: 25, planned: 1 },
    data(),
    now,
  );
  assert.equal(
    focusProgress(block, d, new Date(date + "T12:10:00")).completed,
    2,
  );
});
test("roleplay covers every personality and difficulty and rewards ethical choices only", () => {
  for (const personality of customerPersonalities)
    for (const difficulty of difficulties) {
      const r = roleplayRound({ personality, difficulty });
      assert.equal(r.options.length, 3);
      assert.equal(
        evaluateRoleplay(r, "listen", "Clarifies need with permission").score,
        1,
      );
      assert.equal(evaluateRoleplay(r, "pressure", "Example").score, 0);
    }
  assert.equal(
    roleplayRound({ personality: "Owner-not-present" }).stage,
    "DECISION_MAKER_ACCESS",
  );
  assert.throws(
    () =>
      evaluateRoleplay(roleplayRound({ difficulty: "Expert" }), "listen", ""),
    /Explain/,
  );
});
test("framework exposure, stage, completion and outcome survive existing backup without activity inflation", async () => {
  await clear();
  const result = salesMastery({
    analysis,
    date,
    conversation: { stage: "DISCOVERY" },
  });
  const row = await recordMasteryShown(result, "test", [], "conversation-1");
  await recordMasteryShown(result, "test", [], "conversation-1");
  assert.equal((await all("mindsetSessions")).length, 1);
  assert.equal(row.domain, "sales");
  assert.equal(row.stage, "DISCOVERY");
  assert.equal(row.framework, "SPIN");
  await completePrinciple(row.id);
  await saveAdviceFeedback(row.id, {
    outcome: "No meaningful result",
    usefulness: "Useful",
  });
  await put(
    "salesActivities",
    activity("call", {
      kind: "call",
      observations: { problem: true },
      followUpPurpose: "Demo pending",
      conversationStage: "DEMO",
      masteryAdviceId: row.id,
    }),
  );
  const b = await backup();
  await clear();
  await restore(b, true);
  assert.equal((await all("salesActivities")).length, 1);
  assert.equal((await all("xpHistory")).length, 0);
  assert.equal(
    (await all("mindsetSessions"))[0].outcome,
    "No meaningful result",
  );
  const bad = structuredClone(b);
  bad.data.salesActivities[0].observations.problem = "yes";
  assert.throws(() => validateBackup(bad));
});
test("framework summaries require meaningful history and use associative wording", () => {
  const row = {
    type: "principle",
    domain: "sales",
    philosophy: "sales-mastery",
    principle: "SPIN",
    completed: true,
  };
  assert.match(
    masteryHistorySummary([row]).observation,
    /More framework history/,
  );
  const records = Array.from({ length: 5 }, (_, i) => ({
    ...row,
    day: `2026-08-${20 + i}`,
  }));
  assert.match(masteryHistorySummary(records).observation, /5 of 5/);
  assert.match(
    masteryHistorySummary(records).observation,
    /not a causal effect/,
  );
});
test("legacy empty data and version-one backups remain valid", async () => {
  await clear();
  const b = await backup();
  assert.equal(validateBackup(b).version, 1);
  assert.equal(salesMastery({ data: data(), date }).framework, "PROSPECTING");
  assert.equal(playbookFor("unknown").id, "aura");
});
