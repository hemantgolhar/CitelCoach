import { dayKey, metrics, streaks } from "../utils/metrics.js";
import { selectPeriod, analyzeSales } from "./coachEngine.js";
export const minimumDefaults = {
  visits: 5,
  decisionMakers: 2,
  demos: 1,
  followUps: 2,
};
export function validMinimum(goals) {
  return (
    goals &&
    Object.keys(minimumDefaults).every(
      (k) => Number.isInteger(goals[k]) && goals[k] >= 0 && goals[k] <= 1000,
    ) &&
    goals.visits + goals.followUps > 0
  );
}
export function minimumStatus(data, date = dayKey()) {
  const record = data.settings?.find((r) => r.id === "minimum-day:" + date);
  const counts = metrics(
    (data.salesActivities || []).filter((r) => r.day === date),
  );
  return {
    record,
    counts,
    complete:
      !!record &&
      validMinimum(record.goals) &&
      Object.keys(minimumDefaults).every((k) => counts[k] >= record.goals[k]),
  };
}
export function salesDayStreak(data, now = new Date()) {
  const rows = (data.salesActivities || []).filter((r) => r.day <= dayKey(now));
  const min =
    data.settings?.find((r) => r.id === "preferences")?.streakMinimum || 5;
  const days = [...new Set(rows.map((r) => r.day))].filter(
    (day) =>
      metrics(rows.filter((r) => r.day === day)).visits >= min ||
      minimumStatus(data, day).complete,
  );
  return streaks(
    days.map((day) => ({ kind: "meeting", day })),
    1,
    now,
  );
}
export function behaviorSignals(data, now = new Date()) {
  const date = dayKey(now),
    yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const recent = selectPeriod(data.salesActivities || [], { date, days: 7 });
  const history = selectPeriod(data.mindsetSessions || [], {
    date,
    days: 7,
  }).filter((r) => r.type === "principle");
  const practice = selectPeriod(
    [...(data.pitchPractice || []), ...(data.objectionPractice || [])],
    { date, days: 7 },
  );
  const oldGoal = data.dailyGoals?.find((r) => r.id === dayKey(yesterday));
  const oldActivity = metrics(
    recent.filter((r) => r.day === dayKey(yesterday)),
  );
  const missedDay =
    !!oldGoal &&
    Object.keys(minimumDefaults).some(
      (k) => oldActivity[k] < (oldGoal[k] || 0),
    ) &&
    !minimumStatus(data, dayKey(yesterday)).complete;
  const blocks = selectPeriod(data.salesExperiments || [], {
    date,
    days: 7,
  }).filter((r) => r.type === "focusBlock" && r.endedAt);
  return {
    missedDay,
    practiceWithoutAction: practice.length >= 3 && recent.length === 0,
    repeatedProcrastination:
      history.filter((r) => r.problem === "PROCRASTINATION" && !r.completed)
        .length >= 3,
    inconsistent:
      new Set(recent.map((r) => r.day)).size >= 2 &&
      new Set(recent.map((r) => r.day)).size <= 3 &&
      history.filter((r) => r.completed).length >= 3,
    scattered: blocks.filter((r) => r.distractions >= 3).length >= 2,
    lowQuality:
      practice.length >= 3 &&
      practice.filter((r) => r.rating === "Needs Work" || r.rating === 0)
        .length /
        practice.length >=
        0.6,
    evidence: [
      `${practice.length} practice records and ${recent.length} field actions in the last seven days.`,
    ],
  };
}
export function detectFrog(data, now = new Date(), analysis) {
  const date = dayKey(now),
    rows = (data.salesActivities || []).filter((r) => r.day <= date);
  const completed = new Set(rows.map((r) => r.followUpOf).filter(Boolean));
  const due = rows
    .filter(
      (r) => r.followUpDate && r.followUpDate < date && !completed.has(r.id),
    )
    .sort((a, b) => a.followUpDate.localeCompare(b.followUpDate));
  const make = (task, reason, priority, effort, actionRoute) => ({
    task,
    reason,
    priority,
    estimatedEffort: effort,
    actionRoute,
  });
  if (due.length)
    return make(
      `Complete the oldest ${Math.min(3, due.length)} follow-up${due.length > 1 ? "s" : ""}`,
      `${due.length} overdue commitments remain open; oldest due ${due[0].followUpDate}.`,
      100,
      `${Math.min(3, due.length) * 10} minutes`,
      "/more/followups",
    );
  const scheduled = rows
    .filter(
      (r) =>
        r.followUpDate === date &&
        !completed.has(r.id) &&
        (r.scheduledValue > 0 || r.scheduledPriority === "High"),
    )
    .sort((a, b) => (b.scheduledValue || 0) - (a.scheduledValue || 0))[0];
  if (scheduled)
    return make(
      `Contact ${scheduled.customer || "the scheduled decision maker"}`,
      `A high-priority commitment is scheduled for today${scheduled.scheduledValue ? `; estimated value ${scheduled.scheduledValue}` : ""}.`,
      90,
      "15 minutes",
      "/more/followups",
    );
  const signals = behaviorSignals(data, now);
  if (signals.practiceWithoutAction)
    return make(
      "Start one prospect visit",
      "At least three practice attempts but no field action recorded this week. Test one prepared opening.",
      85,
      "10 minutes",
      "/live",
    );
  const history = selectPeriod(data.mindsetSessions || [], {
    date,
    days: 7,
  }).filter((r) => r.type === "principle" && !r.completed);
  const repeated = history.find(
    (r) =>
      history.filter((a) => a.actionPath === r.actionPath).length >= 3 &&
      /^\/(live|practice|coach|more)(\/|\?|$)/.test(r.actionPath || ""),
  );
  if (repeated)
    return make(
      repeated.action,
      "At least three similar recommendations remain incomplete; this suggests a postponed action, not a proven cause.",
      80,
      "10 minutes",
      repeated.actionPath,
    );
  const a =
    analysis ||
    analyzeSales({
      activities: rows,
      meetings: data.meetings || [],
      goals: data.dailyGoals?.find((r) => r.id === date),
      date,
    });
  if (!["ACTIVITY", "INSUFFICIENT_DATA"].includes(a.bottleneck))
    return make(
      a.nextAction.label,
      a.explanation,
      70,
      "10 minutes",
      a.nextAction.to,
    );
  const opened = data.settings?.find((r) => r.id === "sales-day:" + date);
  if (
    !rows.some((r) => r.day === date) &&
    opened &&
    +now - Date.parse(opened.startedAt) > 20 * 60000
  )
    return make(
      "Start your first field visit",
      "Your observed sales day began over 20 minutes ago; no field action is recorded.",
      65,
      "10 minutes",
      "/live",
    );
  const goal = data.dailyGoals?.find((r) => r.id === date);
  if (goal && a.stats.visits < goal.visits)
    return make(
      "Complete one planned visit",
      `${a.stats.visits} of ${goal.visits} planned visits recorded today.`,
      40,
      "10 minutes",
      "/live",
    );
  return null;
}
export function practicalReview(data, now = new Date()) {
  const period = { date: dayKey(now), days: 7 };
  const rows = selectPeriod(data.salesActivities || [], period);
  const blocks = selectPeriod(data.salesExperiments || [], period).filter(
    (r) => r.type === "focusBlock" && r.endedAt,
  );
  const best =
    [...blocks]
      .filter((r) => r.completed > 0)
      .sort((a, b) => b.completed / b.planned - a.completed / a.planned)[0] ||
    null;
  const missing = selectPeriod(data.mindsetSessions || [], period).filter(
    (r) => r.type === "principle" && !r.completed,
  );
  const counts = {};
  missing.forEach(
    (r) =>
      (counts[r.actionType || r.actionPath] =
        (counts[r.actionType || r.actionPath] || 0) + 1),
  );
  const avoided = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const minimum = selectPeriod(data.settings || [], period).filter(
    (r) => r.type === "minimumDay",
  );
  return {
    consistency: `Field activity recorded on ${new Set(rows.map((r) => r.day)).size} of the last 7 calendar days; days off are not inferred.`,
    avoided:
      avoided?.[1] >= 3
        ? `${avoided[0]} (${avoided[1]} incomplete recommendations)`
        : "Not enough repeated evidence",
    bestFocus: best,
    minimumUsed: minimum.length,
    minimumCompleted: minimum.filter((r) => minimumStatus(data, r.day).complete)
      .length,
  };
}
