import { dayKey, streaks } from "../utils/metrics.js";
import { db } from "../db/database.js";
import { salesDayStreak } from "./practicalBehavior.js";
const average = (a) =>
  a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
export async function recordSalesDayOpen(now = new Date()) {
  const day = dayKey(now),
    id = "sales-day:" + day,
    tx = (await db()).transaction("settings", "readwrite");
  const existing = await tx.store.get(id);
  if (existing) {
    await tx.done;
    return false;
  }
  const time = now.toISOString();
  await tx.store.put({
    id,
    type: "salesDay",
    day,
    startedAt: time,
    createdAt: time,
    updatedAt: time,
  });
  await tx.done;
  return true;
}
export function firstActionTimes(activities, settings, now = new Date()) {
  const rows = [];
  for (const start of settings.filter((r) => r.type === "salesDay")) {
    const candidates = activities
      .filter(
        (a) =>
          a.day === start.day &&
          ["meeting", "followup", "call"].includes(a.kind) &&
          Date.parse(a.createdAt) <= +now,
      )
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    const first = candidates[0]; // Never fabricate a delay if activity predates observed app opening.
    const minutes = first
      ? (Date.parse(first.createdAt) - Date.parse(start.startedAt)) / 60000
      : NaN;
    if (Number.isFinite(minutes) && minutes >= 0)
      rows.push({ day: start.day, minutes, activityId: first.id });
  }
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  const recent = rows.filter(
    (r) => r.day >= dayKey(start) && r.day <= dayKey(now),
  );
  return {
    rows,
    today: rows.find((r) => r.day === dayKey(now))?.minutes ?? null,
    average7: average(recent.map((r) => r.minutes)),
    best: rows.length ? Math.min(...rows.map((r) => r.minutes)) : null,
    repeatedDelay: recent.filter((r) => r.minutes > 20).length >= 3,
    observedDays: recent.length,
  };
}
export function recoveryTimes(activities, now = new Date()) {
  const ordered = activities
    .filter(
      (a) =>
        Number.isFinite(Date.parse(a.createdAt)) &&
        Date.parse(a.createdAt) <= +now,
    )
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const rows = [];
  for (const rejection of ordered.filter((a) => a.outcome === "REJECTED")) {
    const next = ordered.find(
      (a) =>
        a.kind === "meeting" &&
        a.day === rejection.day &&
        Date.parse(a.createdAt) > Date.parse(rejection.createdAt),
    );
    if (next)
      rows.push({
        day: rejection.day,
        minutes:
          (Date.parse(next.createdAt) - Date.parse(rejection.createdAt)) /
          60000,
        rejectionId: rejection.id,
        activityId: next.id,
      });
  }
  return {
    rows,
    today: average(
      rows.filter((r) => r.day === dayKey(now)).map((r) => r.minutes),
    ),
    average: average(rows.map((r) => r.minutes)),
  };
}
function streakFromDays(days, now) {
  return streaks(
    [...new Set(days)].map((day) => ({ kind: "meeting", day })),
    1,
    now,
  );
}
export function actionStreaks(data, now = new Date()) {
  const activities = (data.salesActivities || []).filter(
    (r) => r.day <= dayKey(now),
  );
  return {
    salesDay: salesDayStreak(data, now),
    firstAction: streakFromDays(
      firstActionTimes(activities, data.settings || [], now).rows.map(
        (r) => r.day,
      ),
      now,
    ),
    practice: streakFromDays(
      [...(data.pitchPractice || []), ...(data.objectionPractice || [])]
        .filter((r) => r.day <= dayKey(now))
        .map((r) => r.day),
      now,
    ),
    followUp: streakFromDays(
      activities.filter((r) => r.kind === "followup").map((r) => r.day),
      now,
    ),
    recovery: streakFromDays(
      recoveryTimes(activities, now).rows.map((r) => r.day),
      now,
    ),
  };
}
export function habitLoop(context, blocker = "") {
  if (context === "rejection")
    return {
      cue: "Rejection occurs",
      routine:
        "Take a 30-second reset, then record the next prospect when ready.",
      reward:
        "The next logged visit earns existing activity XP and recovery-streak progress.",
      actionPath: "/live",
    };
  if (/procrastinat|lazy/i.test(blocker))
    return {
      cue: "You notice procrastination",
      routine: "Choose one nearby business and record one visit.",
      reward:
        "A completed visit earns existing activity XP. DONE records follow-through separately.",
      actionPath: "/live",
    };
  if (context === "morning")
    return {
      cue: "Sales day starts",
      routine: "Complete your morning ritual, then record the first prospect.",
      reward:
        "Logged activity earns existing XP and contributes to your activity streak.",
      actionPath: "/more/morning",
    };
  return null;
}
