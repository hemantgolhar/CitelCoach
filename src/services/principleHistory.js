import { db } from "../db/database.js";
import { metrics, dayKey } from "../utils/metrics.js";
import { OUTCOMES, RATINGS, actionType } from "./adviceEffectiveness.js";

export function adviceId(advice, context = advice.context) {
  // Exact content identity avoids collisions and duplicate exposure records on rerender/reload.
  return (
    "principle:" +
    JSON.stringify([
      advice.date,
      context,
      advice.selectedPhilosophy,
      advice.philosophy,
      advice.principle,
      advice.problem,
      advice.action,
      advice.exercise,
      advice.evidence,
      advice.personality || "Supportive",
      ...(advice.domain === "sales"
        ? [advice.conversationId || "", advice.stage]
        : []),
    ])
  );
}
export async function recordAdviceShown(
  advice,
  {
    context = advice.context,
    activities = [],
    now = new Date().toISOString(),
  } = {},
) {
  const id = adviceId(advice, context),
    database = await db();
  const tx = database.transaction("mindsetSessions", "readwrite");
  const old = await tx.store.get(id);
  if (old) {
    await tx.done;
    return old;
  }
  const record = {
    id,
    type: "principle",
    ...(advice.domain === "sales"
      ? {
          domain: "sales",
          framework: advice.framework,
          stage: advice.stage,
          conversationId: advice.conversationId || null,
        }
      : {}),
    schemaVersion: 1,
    day: advice.date,
    title: advice.principleLabel,
    philosophy: advice.philosophy,
    selectedPhilosophy: advice.selectedPhilosophy,
    principle: advice.principle,
    bottleneck: advice.bottleneck,
    problem: advice.problem,
    actionType: actionType(advice),
    experimentId: advice.experimentId || null,
    reason: advice.insight,
    context,
    action: advice.action,
    actionPath: advice.actionPath,
    completed: false,
    completedAt: null,
    shownAt: now,
    createdAt: now,
    updatedAt: now,
    advice,
    statsAtShown: { ...advice.stats },
    activityIdsAtShown: activities.map((a) => a.id),
  };
  await tx.store.put(record);
  await tx.done;
  return record;
}
export function subsequentActivity(record, activities) {
  const original = new Set(record.activityIdsAtShown || []);
  return activities.filter(
    (a) => !original.has(a.id) && a.createdAt >= record.shownAt,
  );
}
export async function completePrinciple(
  id,
  { activities = [], now = new Date().toISOString() } = {},
) {
  const tx = (await db()).transaction("mindsetSessions", "readwrite");
  const record = await tx.store.get(id);
  if (!record || record.type !== "principle") {
    await tx.done;
    throw Error("This advice has not been recorded as shown.");
  }
  if (record.completed) {
    await tx.done;
    return record;
  }
  const after = subsequentActivity(record, activities);
  const completed = {
    ...record,
    completed: true,
    completedAt: now,
    completionSource: "self-report",
    updatedAt: now,
    activityIdsAtCompletion: after.map((a) => a.id),
    statsAtCompletion: metrics(after),
  };
  await tx.store.put(completed);
  await tx.done;
  return completed;
}
export async function savePrincipleOutcome(
  id,
  note,
  now = new Date().toISOString(),
) {
  const tx = (await db()).transaction("mindsetSessions", "readwrite");
  const row = await tx.store.get(id);
  if (row?.type !== "principle") {
    await tx.done;
    throw Error("Advice record not found.");
  }
  const result = { ...row, outcomeNote: String(note).trim(), updatedAt: now };
  await tx.store.put(result);
  await tx.done;
  return result;
}
export async function saveAdviceFeedback(
  id,
  {
    outcome = "",
    usefulness = "",
    notes = "",
    activities = [],
    now = new Date().toISOString(),
  } = {},
) {
  if (outcome && !OUTCOMES.includes(outcome))
    throw Error("Choose a listed outcome.");
  if (usefulness && !RATINGS.includes(usefulness))
    throw Error("Choose a listed usefulness rating.");
  const tx = (await db()).transaction("mindsetSessions", "readwrite");
  const row = await tx.store.get(id);
  if (!row || row.type !== "principle" || !row.completed) {
    await tx.done;
    throw Error("Mark this advice DONE before reporting an outcome.");
  }
  const later = activities.filter(
    (a) =>
      Date.parse(a.createdAt) > Date.parse(row.completedAt) &&
      Date.parse(a.createdAt) <= Date.parse(now) &&
      a.day === dayKey(new Date(row.completedAt)),
  );
  const result = {
    ...row,
    outcome: outcome || null,
    usefulness: usefulness || null,
    outcomeNote: notes.trim(),
    feedbackAt: now,
    updatedAt: now,
    statsAfterAction: metrics(later),
    activityIdsAfterAction: later.map((a) => a.id),
    afterWindow: {
      from: row.completedAt,
      to: now,
      day: dayKey(new Date(row.completedAt)),
    },
    feedbackSource: "self-report",
  };
  await tx.store.put(result);
  await tx.done;
  return result;
}
export async function dismissAdviceFeedback(
  id,
  now = new Date().toISOString(),
) {
  const tx = (await db()).transaction("mindsetSessions", "readwrite");
  const row = await tx.store.get(id);
  if (row?.type === "principle")
    await tx.store.put({ ...row, feedbackDismissedAt: now, updatedAt: now });
  await tx.done;
}
