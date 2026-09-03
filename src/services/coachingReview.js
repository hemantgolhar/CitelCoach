import { analyzeSales, selectPeriod } from "./coachEngine.js";
import { metrics, dayKey } from "../utils/metrics.js";
import {
  aggregateEffectiveness,
  rankGroups,
  summarizeAdvice,
} from "./adviceEffectiveness.js";
import { firstActionTimes, recoveryTimes } from "./behaviorMetrics.js";
import { practicalReview } from "./practicalBehavior.js";
export function weeklyReview(data, now = new Date()) {
  const date = dayKey(now),
    period = { date, days: 7 },
    activities = selectPeriod(data.salesActivities || [], period),
    history = selectPeriod(data.mindsetSessions || [], period).filter(
      (r) => r.domain !== "sales",
    ),
    reviews = selectPeriod(data.meetings || [], period).filter((r) => r.review);
  const analysis = analyzeSales({
    activities: data.salesActivities || [],
    meetings: data.meetings || [],
    date,
    days: 7,
  });
  const timing = firstActionTimes(
      data.salesActivities || [],
      data.settings || [],
      now,
    ),
    recovery = recoveryTimes(activities, now);
  const skills = [];
  for (const [key, label] of [
    ["opening", "Opening"],
    ["discovery", "Discovery"],
    ["showValue", "Value"],
    ["askedSale", "Closing"],
  ]) {
    const sample = reviews.filter((r) => typeof r[key] === "boolean");
    if (sample.length >= 3)
      skills.push({
        label,
        score: sample.filter((r) => r[key]).length / sample.length,
        sample: sample.length,
      });
  }
  const pitch = selectPeriod(data.pitchPractice || [], period),
    objection = selectPeriod(data.objectionPractice || [], period);
  if (pitch.length >= 3)
    skills.push({
      label: "Pitch",
      score:
        pitch.reduce(
          (n, r) =>
            n +
            (r.rating === "Confident"
              ? 1
              : r.rating === "Practiced"
                ? 0.6
                : 0.2),
          0,
        ) / pitch.length,
      sample: pitch.length,
    });
  if (objection.length >= 3)
    skills.push({
      label: "Objection handling",
      score: objection.reduce((n, r) => n + r.rating / 2, 0) / objection.length,
      sample: objection.length,
    });
  skills.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  const counts = {};
  for (const a of activities) {
    if (a.objection && a.objection !== "None")
      counts[a.objection] = (counts[a.objection] || 0) + 1;
  }
  const common =
    Object.entries(counts).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    )[0] || null;
  const groups = rankGroups(
    aggregateEffectiveness(history).filter((g) => g.meaningful),
  );
  const focus = timing.repeatedDelay
    ? {
        title: "Start faster.",
        principle: "Decision",
        challenge:
          "When practical, begin your first prospect within 10 minutes of opening Sales Day.",
      }
    : {
        CLOSING: {
          title: "Improve demo-to-close conversion.",
          principle: "Closing",
          challenge:
            "Practice three closing questions, then invite a clear commitment after each qualified demo.",
        },
        FOLLOW_UP: {
          title: "Complete agreed follow-ups.",
          principle: "Organized planning",
          challenge:
            "Complete one due follow-up before the first new visit each day.",
        },
        DECISION_MAKER_ACCESS: {
          title: "Reach the decision maker.",
          principle: "Decision process",
          challenge:
            "Ask who decides and when they are available before each pitch.",
        },
        DISCOVERY: {
          title: "Ask before pitching.",
          principle: "Discovery",
          challenge:
            "Ask two discovery questions in each qualified conversation.",
        },
        DEMO: {
          title: "Connect discovery to a relevant demo.",
          principle: "Discovery",
          challenge:
            "Confirm one problem before offering a short demonstration.",
        },
        VALUE: {
          title: "Make value specific.",
          principle: "Value",
          challenge:
            "Link one verified benefit to a need the customer described.",
        },
        OBJECTION_HANDLING: {
          title: "Clarify the recurring concern.",
          principle: "Objections",
          challenge:
            "Rehearse the most common objection before your first visit.",
        },
      }[analysis.bottleneck] || {
        title: "Build a consistent activity sample.",
        principle: "Decision",
        challenge: "Start with one recorded prospect visit each sales day.",
      };
  const practical = practicalReview(data, now);
  const completedBlocks = selectPeriod(
    data.salesExperiments || [],
    period,
  ).filter(
    (r) => r.type === "focusBlock" && r.endedAt && r.completed >= r.planned,
  );
  const followBlocks = completedBlocks.filter(
    (r) => r.focusType === "Follow-ups",
  );
  const recommendation =
    new Set(followBlocks.map((r) => r.day)).size >= 3 &&
    analysis.bottleneck === "FOLLOW_UP"
      ? {
          title: "Give follow-ups a dedicated block.",
          principle: "Single-tasking",
          challenge: `You met your follow-up block target on ${new Set(followBlocks.map((r) => r.day)).size} days this week. Try one dedicated follow-up block again; this association does not establish what caused completion.`,
        }
      : focus;
  return {
    period,
    practical,
    activity: metrics(activities),
    analysis,
    strongest: skills[0] || null,
    weakest: skills.length > 1 ? skills.at(-1) : null,
    commonObjection: common,
    best: groups.length >= 2 ? groups[0] : null,
    ignored:
      groups.length >= 2
        ? [...groups].sort((a, b) => a.completionRate - b.completionRate)[0]
        : null,
    timing,
    recovery,
    focus: recommendation,
  };
}
export function createCoachingExperiment(activities, now = new Date()) {
  const startDay = dayKey(now),
    end = new Date(now);
  end.setDate(end.getDate() + 6);
  const prior = new Date(now);
  prior.setDate(prior.getDate() - 1);
  return {
    type: "coachingExperiment",
    title: "Decision for procrastination",
    startDay,
    endDay: dayKey(end),
    startedAt: now.toISOString(),
    targetProblem: "PROCRASTINATION",
    philosophy: "grow-rich",
    principle: "DECISION",
    baseline: metrics(
      selectPeriod(activities, { date: dayKey(prior), days: 7 }),
    ),
    baselinePeriodEnd: dayKey(prior),
  };
}
export function experimentReport(
  experiment,
  history,
  activities,
  now = new Date(),
) {
  const exposures = history.filter((r) => r.experimentId === experiment.id);
  const activity = activities.filter(
    (a) =>
      a.day >= experiment.startDay &&
      a.day <= experiment.endDay &&
      a.createdAt >= experiment.startedAt &&
      Date.parse(a.createdAt) <= +now &&
      (!experiment.stoppedAt || a.createdAt <= experiment.stoppedAt),
  );
  return {
    status: experiment.stoppedAt
      ? "Stopped"
      : dayKey(now) > experiment.endDay
        ? "Complete"
        : "Active",
    ...summarizeAdvice(exposures),
    activity: metrics(activity),
    baseline: experiment.baseline || null,
  };
}
