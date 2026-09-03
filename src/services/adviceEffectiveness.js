export const RATINGS = ["Not useful", "Neutral", "Useful", "Very useful"];
export const OUTCOMES = [
  "Completed visit",
  "Reached decision maker",
  "Got demo",
  "Follow-up created",
  "Sale",
  "Rejected",
  "No meaningful result",
];
export const MIN_SHOWN = 5;
export const MIN_DAYS = 3;
const positive = new Set(OUTCOMES.slice(0, 5));
export function relevantOutcome(record) {
  const problem =
    record.bottleneck || record.advice?.bottleneck || adviceProblem(record);
  const eligible = {
    CLOSING: ["Sale", "Follow-up created"],
    VALUE: ["Sale", "Follow-up created"],
    DISCOVERY: ["Got demo", "Sale"],
    DEMO: ["Got demo", "Sale"],
    FOLLOW_UP: ["Sale", "Follow-up created", "Reached decision maker"],
  }[problem];
  return eligible
    ? eligible.includes(record.outcome)
    : positive.has(record.outcome);
}
export function outcomeOptions(record) {
  const preferred =
    actionType(record) === "PRACTICE"
      ? ["Got demo", "Reached decision maker", "Sale"]
      : actionType(record) === "FOLLOW_UP"
        ? ["Reached decision maker", "Sale", "Follow-up created"]
        : ["Completed visit", "Reached decision maker"];
  return [...preferred, ...OUTCOMES.filter((o) => !preferred.includes(o))];
}
export const principleKey = (r) => `${r.philosophy}:${r.principle}`;
export const adviceProblem = (r) =>
  r.problem ||
  r.advice?.problem ||
  r.bottleneck ||
  r.advice?.bottleneck ||
  "UNKNOWN";
export function actionType(r) {
  if (r.actionType) return r.actionType;
  const path = r.actionPath || r.advice?.actionPath || "";
  if (path.includes("followups")) return "FOLLOW_UP";
  if (
    path.includes("practice") ||
    path.includes("frameworks") ||
    path.includes("objections") ||
    path.includes("products")
  )
    return "PRACTICE";
  if (
    path.includes("goals") ||
    path.includes("calculator") ||
    path.includes("evening")
  )
    return "PLAN";
  if (path.includes("identity") || path.includes("boost")) return "PREPARE";
  return path === "/live" ? "VISIT" : "OTHER";
}
export function summarizeAdvice(records) {
  const rows = records.filter((r) => r.type === "principle");
  const completed = rows.filter((r) => r.completed === true);
  const reported = completed.filter((r) => OUTCOMES.includes(r.outcome));
  const ratings = rows
    .filter((r) => RATINGS.includes(r.usefulness))
    .map((r) => RATINGS.indexOf(r.usefulness) + 1);
  const positiveOutcomes = reported.filter((r) =>
    positive.has(r.outcome),
  ).length;
  return {
    shown: rows.length,
    completed: completed.length,
    completionRate: rows.length ? completed.length / rows.length : null,
    reportedOutcomes: reported.length,
    positiveOutcomes,
    relevantOutcomes: reported.filter(relevantOutcome).length,
    relevantOutcomeRate: reported.length
      ? reported.filter(relevantOutcome).length / reported.length
      : null,
    outcomeRate: reported.length ? positiveOutcomes / reported.length : null,
    ratingCount: ratings.length,
    averageUsefulness: ratings.length
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null,
    demos: reported.filter((r) => r.outcome === "Got demo").length,
    sales: reported.filter((r) => r.outcome === "Sale").length,
    meaningful:
      rows.length >= MIN_SHOWN &&
      new Set(rows.map((r) => r.day)).size >= MIN_DAYS,
  };
}
export function aggregateEffectiveness(records, dimension = "principle") {
  const keyOf = {
    philosophy: (r) => r.philosophy,
    principle: principleKey,
    problem: adviceProblem,
    bottleneck: (r) => r.bottleneck || r.advice?.bottleneck || "UNKNOWN",
    action: actionType,
  }[dimension];
  if (!keyOf) throw Error("Unknown effectiveness dimension.");
  const groups = new Map();
  for (const row of records.filter((r) => r.type === "principle")) {
    const key = keyOf(row) || "UNKNOWN";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups].map(([key, rows]) => ({
    key,
    philosophy: rows[0].philosophy,
    principle: rows[0].principle,
    ...summarizeAdvice(rows),
  }));
}
// Completion ranks first. Sparse optional feedback is not used as a tie-breaker.
export function rankGroups(groups) {
  return [...groups].sort(
    (a, b) =>
      b.completionRate - a.completionRate ||
      (a.reportedOutcomes >= 3 && b.reportedOutcomes >= 3
        ? b.relevantOutcomeRate - a.relevantOutcomeRate
        : 0) ||
      (a.ratingCount >= 3 && b.ratingCount >= 3
        ? b.averageUsefulness - a.averageUsefulness
        : 0) ||
      a.key.localeCompare(b.key),
  );
}
export function personalBests(records) {
  const definitions = {
    action: () => true,
    rejection: (r) => r.context === "rejection",
    meetings: (r) => r.context === "pre-meeting",
    skill: (r) =>
      [
        "DISCOVERY",
        "DEMO",
        "VALUE",
        "OBJECTION_HANDLING",
        "CLOSING",
        "DECISION_MAKER_ACCESS",
      ].includes(r.bottleneck || r.advice?.bottleneck),
  };
  return Object.fromEntries(
    Object.entries(definitions).map(([key, filter]) => {
      const groups = rankGroups(
        aggregateEffectiveness(records.filter(filter)).filter(
          (g) => g.meaningful,
        ),
      );
      return [key, groups.length >= 2 ? groups[0] : null];
    }),
  );
}
export function pendingFeedback(records, now = new Date()) {
  // Wait at least ten minutes. Dismissal hides the prompt, not the editable history.
  return (
    records
      .filter(
        (r) =>
          r.type === "principle" &&
          r.completed &&
          r.completedAt &&
          !r.feedbackAt &&
          !r.feedbackDismissedAt &&
          new Date(now) - new Date(r.completedAt) >= 10 * 60000,
      )
      .sort((a, b) =>
        String(b.completedAt).localeCompare(String(a.completedAt)),
      )[0] || null
  );
}
