import { db } from "../db/database.js";
import { dayKey } from "../utils/metrics.js";
export const focusTypes = [
  "Prospecting",
  "Follow-ups",
  "Pitch practice",
  "Objection practice",
  "Sales review",
];
export const focusRoutes = {
  Prospecting: "/live",
  "Follow-ups": "/more/followups",
  "Pitch practice": "/practice?mode=pitch",
  "Objection practice": "/practice?mode=battle",
  "Sales review": "/more/review",
};
export const activeFocus = (data) =>
  data.salesExperiments?.find((r) => r.type === "focusBlock" && !r.endedAt);
function relevant(data, type) {
  if (type === "Pitch practice") return data.pitchPractice || [];
  if (type === "Objection practice") return data.objectionPractice || [];
  if (type === "Sales review")
    return (data.meetings || []).filter((r) => r.review);
  return (data.salesActivities || []).filter((r) =>
    type === "Follow-ups"
      ? r.kind === "followup"
      : ["meeting", "call"].includes(r.kind),
  );
}
export function focusProgress(block, data, now = new Date()) {
  const end = block.endedAt ? Date.parse(block.endedAt) : +now;
  const records = relevant(data, block.focusType).filter((r) => {
    const stamp =
      block.focusType === "Sales review"
        ? r.updatedAt || r.createdAt
        : r.createdAt;
    return (
      !block.baselineIds.includes(r.id) &&
      Date.parse(stamp) >= Date.parse(block.startedAt) &&
      Date.parse(stamp) <= end
    );
  });
  return {
    completed: records.length,
    activityIds: records.map((r) => r.id),
    actualMinutes: Math.max(0, (end - Date.parse(block.startedAt)) / 60000),
  };
}
export async function startFocus(
  { focusType, duration, planned },
  data,
  now = new Date(),
) {
  if (
    !focusTypes.includes(focusType) ||
    ![25, 45, 60, 90].includes(duration) ||
    !Number.isInteger(planned) ||
    planned < 1 ||
    planned > 1000
  )
    throw Error("Choose a focus, duration and activity target from 1 to 1000.");
  const tx = (await db()).transaction("salesExperiments", "readwrite");
  const rows = await tx.store.getAll();
  if (rows.some((r) => r.type === "focusBlock" && !r.endedAt)) {
    await tx.done;
    throw Error("Finish the current focus block first.");
  }
  const row = {
    id: crypto.randomUUID(),
    type: "focusBlock",
    day: dayKey(now),
    focusType,
    duration,
    planned,
    startedAt: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    baselineIds: relevant(data, focusType).map((r) => r.id),
  };
  await tx.store.put(row);
  await tx.done;
  return row;
}
export async function finishFocus(
  id,
  { distractions, outcome, notes },
  data,
  now = new Date(),
) {
  if (
    !Number.isInteger(distractions) ||
    distractions < 0 ||
    !outcome?.trim() ||
    !notes?.trim()
  )
    throw Error("Add distractions (0 or more), a result and one lesson.");
  const tx = (await db()).transaction(
    ["salesExperiments", "xpHistory"],
    "readwrite",
  );
  const store = tx.objectStore("salesExperiments"),
    row = await store.get(id);
  if (!row || row.type !== "focusBlock") {
    await tx.done;
    throw Error("Focus block not found.");
  }
  if (row.endedAt) {
    await tx.done;
    return row;
  }
  const progress = focusProgress(row, data, now);
  const finished = {
    ...row,
    ...progress,
    endedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    distractions,
    outcome: outcome.trim(),
    notes: notes.trim(),
    meaningful: progress.completed >= row.planned,
  };
  await store.put(finished);
  if (finished.meaningful)
    await tx.objectStore("xpHistory").put({
      id: "focus:" + id,
      amount: 10,
      reason: "Focus activity target completed",
      day: dayKey(now),
      createdAt: now.toISOString(),
    });
  await tx.done;
  return finished;
}
