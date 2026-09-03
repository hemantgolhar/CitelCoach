import { dayKey, metrics, normalizeGoals, percent } from "../utils/metrics.js";
import { coachWording as wording } from "./coachPersonality.js";

export const BOTTLENECKS = Object.freeze([
  "ACTIVITY",
  "DECISION_MAKER_ACCESS",
  "DISCOVERY",
  "DEMO",
  "VALUE",
  "OBJECTION_HANDLING",
  "CLOSING",
  "FOLLOW_UP",
  "INSUFFICIENT_DATA",
]);
const action = (label, to) => ({ label, to });
const practice = (label, to, instruction) => ({ label, to, instruction });
const closing = practice(
  "PRACTICE CLOSING",
  "/coach/frameworks?focus=closing",
  "Practice 5 closing scenarios.",
);
const discovery = practice(
  "PRACTICE DISCOVERY",
  "/coach/frameworks?focus=discovery",
  "Practice two open-ended discovery questions.",
);

function recordDay(row) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(row.day || "")) return row.day;
  const parsed = new Date(row.createdAt);
  return Number.isNaN(parsed.getTime()) ? null : dayKey(parsed);
}

// Calendar windows are inclusive and use local days, never rolling UTC hours.
export function selectPeriod(rows, { date = dayKey(), days = 1 } = {}) {
  if (![1, 7, 30].includes(days) || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw Error("Use a local date and a 1, 7 or 30 day period.");
  const start = new Date(date + "T12:00:00");
  start.setDate(start.getDate() - days + 1);
  const startDay = dayKey(start);
  return rows.filter((row) => {
    const day = recordDay(row);
    return day && day >= startDay && day <= date;
  });
}

/** Pure, offline rules. Pass full activity history so due follow-ups remain visible.
 * Reviews are supporting evidence only: they never increment activity totals.
 * Rule priority: due commitments → access → small sample → repeated objection
 * → discovery/demo → value/closing → remaining targets. No inferred AI score.
 */
export function analyzeSales({
  activities = [],
  meetings = [],
  goals = {},
  personality = "Supportive",
  date = dayKey(),
  days = 1,
} = {}) {
  const period = { date, days };
  const rows = selectPeriod(activities, period);
  const stats = metrics(rows);
  const targets = normalizeGoals(goals);
  const visits = rows.filter((r) => r.kind === "meeting");
  const realConversations = rows.filter((r) =>
    ["SOLD", "FOLLOW-UP", "REJECTED"].includes(r.outcome),
  ).length;
  const observedAccess = visits.filter(
    (r) => typeof r.decisionMaker === "boolean",
  );
  const reached = observedAccess.filter((r) => r.decisionMaker).length;
  const ownersAbsent = visits.filter(
    (r) => r.outcome === "OWNER ABSENT",
  ).length;
  const reviews = selectPeriod(meetings, period).filter((r) => r.review);
  const allUntilEnd = activities.filter(
    (r) => recordDay(r) && recordDay(r) <= date,
  );
  const completedIds = new Set(
    allUntilEnd
      .filter((r) => r.kind === "followup")
      .map((r) => r.followUpOf)
      .filter(Boolean),
  );
  const due = allUntilEnd.filter(
    (r) => r.followUpDate && r.followUpDate <= date,
  );
  const pending = due.filter((r) => !completedIds.has(r.id));
  const fulfilled = due.length - pending.length;
  const repetitions = {};
  for (const row of rows) {
    const text = String(row.objection || "").trim();
    if (!text || text.toLowerCase() === "none") continue;
    const key = /think.*about/i.test(text)
      ? "think about it"
      : text.toLowerCase().replace(/[’']/g, "");
    const item = (repetitions[key] ||= { title: text, count: 0 });
    item.count++;
  }
  const repeated = Object.values(repetitions).sort(
    (a, b) => b.count - a.count || a.title.localeCompare(b.title),
  )[0];
  const missingDiscovery = reviews.filter((r) => r.discovery === false).length;
  const missingValue = reviews.filter((r) => r.showValue === false).length;
  const missingClose = reviews.filter((r) => r.askedSale === false).length;
  let result;
  const choose = (
    bottleneck,
    severity,
    title,
    explanation,
    evidence,
    recommendation,
    nextAction,
    recommendedPractice = null,
  ) => ({
    bottleneck,
    severity,
    title,
    explanation,
    evidence,
    recommendation,
    nextAction,
    recommendedPractice,
  });

  if (pending.length >= 3 && fulfilled / due.length < 0.5) {
    result = choose(
      "FOLLOW_UP",
      "high",
      "Follow-ups need attention.",
      "Agreed next steps are due, but fewer than half have been completed.",
      [
        `${pending.length} due or overdue follow-ups`,
        `${fulfilled} of ${due.length} due commitments completed`,
      ],
      "Complete one due follow-up before another new visit.",
      action("COMPLETE ONE FOLLOW-UP", "/more/followups"),
    );
  } else if (
    visits.length >= 5 &&
    (ownersAbsent / visits.length >= 0.5 ||
      (observedAccess.length >= 5 && reached / observedAccess.length < 0.4))
  ) {
    result = choose(
      "DECISION_MAKER_ACCESS",
      "high",
      "Reach the decision maker.",
      "Access is the clearest gap; these visits do not yet support judging your pitch.",
      [
        `${stats.visits} visits`,
        `${reached} decision makers in ${observedAccess.length} visits with access recorded`,
        `${ownersAbsent} owner-absent outcomes`,
      ],
      "Ask when the decision maker is available before pitching.",
      action("FIND THE DECISION MAKER", "/live"),
      practice(
        "PREPARE YOUR APPROACH",
        "/coach/boost",
        "Rehearse a permission-based opening.",
      ),
    );
  } else if (rows.length === 0) {
    result = choose(
      "ACTIVITY",
      "info",
      "Start with your first visit.",
      "No sales activity is recorded in this period.",
      ["0 recorded activities"],
      "Visit one prospect and record the outcome.",
      action("START MY SALES DAY", "/live"),
    );
  } else if (realConversations < 5) {
    result = choose(
      "INSUFFICIENT_DATA",
      "info",
      "Not enough data yet.",
      "Complete 5 real conversations and I’ll identify where your sales process may be leaking.",
      [
        `${realConversations} of 5 real conversations`,
        `${stats.visits} visits`,
      ],
      "Reach one decision maker and ask two discovery questions.",
      action("GO TO NEXT PROSPECT", "/live"),
    );
  } else if (repeated?.count >= 3) {
    result = choose(
      "OBJECTION_HANDLING",
      "high",
      "The same objection is recurring.",
      "A repeated concern is worth practicing before another pitch. It does not prove the cause of lost sales.",
      [`${repeated.count} conversations: “${repeated.title}”`],
      "Clarify this concern before responding on the next visit.",
      action(
        "PRACTICE THIS OBJECTION",
        "/coach/objections?objection=" + encodeURIComponent(repeated.title),
      ),
      practice(
        "PRACTICE THIS OBJECTION",
        "/coach/objections?objection=" + encodeURIComponent(repeated.title),
        "Rehearse a response to the repeated objection.",
      ),
    );
  } else if (
    missingDiscovery >= 2 &&
    missingDiscovery / reviews.length >= 0.5
  ) {
    result = choose(
      "DISCOVERY",
      "medium",
      "Ask before you pitch.",
      "Your meeting reviews point to skipped discovery.",
      [
        `${missingDiscovery} of ${reviews.length} reviewed meetings skipped discovery`,
      ],
      "Ask at least two discovery questions before offering a demo.",
      action("PRACTICE DISCOVERY", discovery.to),
      discovery,
    );
  } else if (
    stats.decisionMakers >= 5 &&
    stats.demos / stats.decisionMakers < 0.4
  ) {
    result = choose(
      "DEMO",
      "medium",
      "Move qualified conversations to a demo.",
      "Recorded decision-maker conversations are reaching demonstrations infrequently. Check need and fit before offering one.",
      [
        `${stats.decisionMakers} decision-maker conversations`,
        `${stats.demos} demos (${percent(stats.demos, stats.decisionMakers)}% activity ratio)`,
      ],
      "Identify one clear problem, then offer a relevant demonstration.",
      action("REVIEW DEMO FLOW", "/coach/products"),
      practice(
        "REVIEW DEMO FLOW",
        "/coach/products",
        "Rehearse a demo tied to a stated problem.",
      ),
    );
  } else if (stats.demos >= 3 && stats.sales / stats.demos < 0.2) {
    if (missingValue >= 2 && missingValue / reviews.length >= 0.5) {
      result = choose(
        "VALUE",
        "high",
        "Connect the demo to the customer’s problem.",
        "Your reviews report that value was not demonstrated clearly.",
        [
          `${stats.demos} demos`,
          `${stats.sales} sales`,
          `${missingValue} reviews without clear value`,
        ],
        "State the agreed problem and show the relevant benefit before asking for commitment.",
        action("PRACTICE VALUE", "/practice?mode=pitch"),
        practice(
          "PRACTICE VALUE",
          "/practice?mode=pitch",
          "Practice a problem-to-benefit pitch.",
        ),
      );
    } else {
      result = choose(
        "CLOSING",
        "high",
        "Closing is the likely bottleneck.",
        "Demonstrations are happening, but recorded sales are low. Test the closing step; fit, price and timing may also explain the gap.",
        [
          `${stats.demos} demos`,
          `${stats.sales} sales`,
          ...(missingClose
            ? [`${missingClose} reviews without an explicit close`]
            : []),
        ],
        "Ask directly for a pressure-free next step with the next qualified prospect.",
        action(closing.label, closing.to),
        closing,
      );
    }
  } else if (
    pending.length &&
    (stats.visits >= targets.visits || stats.followUps < targets.followUps)
  ) {
    result = choose(
      "FOLLOW_UP",
      "medium",
      "Complete the next agreed follow-up.",
      "A due commitment remains open.",
      [`${pending.length} due or overdue follow-ups`],
      "Complete one due follow-up.",
      action("COMPLETE ONE FOLLOW-UP", "/more/followups"),
    );
  } else {
    const left = Math.max(0, targets.visits - stats.visits);
    result = choose(
      "ACTIVITY",
      "info",
      left ? `You have ${left} visits left.` : "Review your remaining targets.",
      "No clear skill bottleneck meets the rule thresholds in this period.",
      [
        `${realConversations} real conversations`,
        `${stats.visits} / ${targets.visits} visits`,
      ],
      left
        ? "Visit the next prospect and record the outcome."
        : "Review the scoreboard and choose an unfinished target.",
      action(
        left ? "GO TO NEXT PROSPECT" : "REVIEW DAILY TARGETS",
        left ? "/live" : "/more/goals",
      ),
    );
  }
  const instruction =
    result.bottleneck === "CLOSING"
      ? "Ask directly for the sale when fit is confirmed."
      : result.bottleneck === "DECISION_MAKER_ACCESS"
        ? "Find the decision maker."
        : result.bottleneck === "FOLLOW_UP"
          ? "Complete one due follow-up."
          : ["DISCOVERY", "DEMO", "INSUFFICIENT_DATA"].includes(
                result.bottleneck,
              )
            ? "Ask at least 2 discovery questions."
            : result.recommendation;
  const mission = {
    title:
      result.bottleneck === "FOLLOW_UP"
        ? "Complete one follow-up."
        : stats.visits < targets.visits
          ? `Visit prospect ${stats.visits + 1} of ${targets.visits}.`
          : "Visit target reached. Choose your next action.",
    instruction,
    nextAction: action("GO TO NEXT PROSPECT", "/live"),
  };
  if (result.bottleneck === "FOLLOW_UP")
    mission.followUpAction = action("OPEN DUE FOLLOW-UPS", "/more/followups");
  return {
    ...result,
    recommendation: wording(personality, result.recommendation),
    mission,
    stats,
    targets,
    period,
    realConversations,
    pendingFollowUps: pending.length,
    method: "offline-rules",
    detected: !["ACTIVITY", "INSUFFICIENT_DATA"].includes(result.bottleneck),
  };
}
