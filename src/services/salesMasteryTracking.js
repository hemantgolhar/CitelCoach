import { recordAdviceShown, adviceId } from "./principleHistory.js";
import { aggregateEffectiveness, rankGroups } from "./adviceEffectiveness.js";
import { selectPeriod } from "./coachEngine.js";
import { dayKey } from "../utils/metrics.js";
export function masteryAdvice(
  result,
  context = "sales-mastery",
  conversationId = "",
) {
  return {
    domain: "sales",
    framework: result.framework,
    stage: result.stage,
    conversationId,
    version: 1,
    selectedPhilosophy: "sales-mastery",
    philosophy: "sales-mastery",
    principle: result.framework,
    principleLabel: result.framework.replaceAll("_", " "),
    problem: result.problem,
    bottleneck: result.bottleneck,
    insight: result.response,
    exercise: result.nextQuestion,
    action: result.action,
    actionPath: result.actionRoute,
    actionLabel: "TRY NEXT ACTION",
    evidence: result.evidence,
    context,
    stats: result.stats,
    date: result.date,
    personality: result.personality,
  };
}
export const recordMasteryShown = (
  result,
  context,
  activities,
  conversationId,
) =>
  recordAdviceShown(masteryAdvice(result, context, conversationId), {
    activities,
  });
export const masteryAdviceId = (result, context, conversationId) =>
  adviceId(masteryAdvice(result, context, conversationId));
export function masteryHistorySummary(rows) {
  const groups = rankGroups(
    aggregateEffectiveness(rows.filter((r) => r.domain === "sales")),
  );
  const best = groups.find((g) => g.meaningful);
  return {
    groups,
    observation: best
      ? `${best.principle.replaceAll("_", " ")} actions were reported completed ${best.completed} of ${best.shown} times across your history. This describes follow-through, not a causal effect on sales.`
      : "More framework history is needed: at least five recommendations across three days.",
  };
}
export function pipelineSignals(data, date = dayKey()) {
  const rows = selectPeriod(data.salesActivities || [], { date, days: 7 });
  const counts = {
    visits: rows.filter((r) => r.kind === "meeting").length,
    calls: rows.filter((r) => r.kind === "call" || r.channel === "Call").length,
    decisionMakers: rows.filter((r) => r.decisionMaker === true).length,
    demos: rows.filter((r) => r.demo === true).length,
    followUps: rows.filter((r) => r.kind === "followup").length,
    sales: rows.filter((r) => r.outcome === "SOLD").length,
  };
  return {
    ...counts,
    attempts: rows.filter((r) => ["meeting", "call"].includes(r.kind)).length,
    conversion: counts.demos
      ? Math.round((counts.sales / counts.demos) * 100)
      : null,
  };
}
export function salesSkillSignals(data) {
  const rows = (data.salesActivities || []).map((a) => {
    const review = (data.meetings || []).find((r) => r.id === a.id && r.review);
    return {
      ...a,
      ...review,
      observations: {
        ...(typeof review?.showValue === "boolean"
          ? { value: review.showValue }
          : {}),
        ...(a.observations || {}),
        ...(review?.observations || {}),
      },
    };
  });
  const practices = data.practiceSessions || [];
  const mapping = [
    ["Prospecting", null, "PROSPECTING"],
    ["Decision-maker access", "decisionMaker", "DECISION_MAKER_ACCESS"],
    ["Discovery", "discovery", "DISCOVERY"],
    ["Qualification", "qualificationComplete", "QUALIFICATION"],
    ["Value communication", "value", "VALUE"],
    ["Objection diagnosis", "objectionDiagnosed", "OBJECTION"],
    ["Objection handling", "objectionHandled", "OBJECTION"],
    ["Negotiation", "negotiated", "NEGOTIATION"],
    ["Closing", "askedSale", "CLOSING"],
    ["Follow-up", null, "FOLLOW_UP"],
  ];
  return mapping.map(([name, key, stage]) => {
    if (stage === "QUALIFICATION")
      for (const row of rows) {
        const keys = [
          "problem",
          "impact",
          "decisionMaker",
          "budget",
          "timing",
          "nextStep",
        ];
        if (
          keys.every(
            (k) => typeof (row.observations[k] ?? row[k]) === "boolean",
          )
        )
          row.observations.qualificationComplete = keys.every(
            (k) => (row.observations[k] ?? row[k]) === true,
          );
      }
    const applicable =
      stage === "OBJECTION" ? rows.filter((r) => r.objection) : rows;
    const observed = key
      ? applicable.filter(
          (r) => typeof (r.observations[key] ?? r[key]) === "boolean",
        )
      : [];
    const done = new Set(
      rows.filter((r) => r.kind === "followup").map((r) => r.followUpOf),
    );
    const due = rows.filter(
      (r) => r.followUpDate && r.followUpDate <= dayKey(),
    );
    const completed =
      stage === "FOLLOW_UP"
        ? due.filter((r) => done.has(r.id)).length
        : key
          ? observed.filter((r) => (r.observations[key] ?? r[key]) === true)
              .length
          : rows.filter((r) => ["meeting", "call"].includes(r.kind)).length;
    const sample = stage === "FOLLOW_UP" ? due.length : observed.length;
    return {
      name,
      stage,
      practice:
        practices.filter(
          (r) => r.stage === stage || r.results?.some((x) => x.stage === stage),
        ).length +
        (stage === "OBJECTION" ? (data.objectionPractice || []).length : 0),
      sample,
      completed,
      score: sample >= 3 ? Math.round((completed / sample) * 100) : null,
      realActivity: key ? observed.length : applicable.length,
      outcomes: (key ? observed : applicable).filter(
        (r) => r.outcome === "SOLD",
      ).length,
    };
  });
}
