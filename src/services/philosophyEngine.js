import { analyzeSales } from "./coachEngine.js";
import {
  philosophyById,
  principleById,
  normalizePhilosophy,
} from "../data/philosophies.js";

export function classifyContext(context = "home", blocker = "") {
  if (context === "rejection") return "REJECTION";
  if (context === "pre-meeting") return "PRE_MEETING";
  if (context === "goals") return "GOAL_CONFUSION";
  const text = blocker.toLowerCase();
  if (/overthink/.test(text)) return "OVERTHINKING";
  if (/procrastinat|lazy/.test(text)) return "PROCRASTINATION";
  if (/tired|energy/.test(text)) return "LOW_ENERGY";
  if (/got rejected/.test(text)) return "REJECTION";
  if (/fear|confidence|can't|cannot|won't|bad at|approach people/.test(text))
    return "FEAR";
  if (/goal|plan/.test(text)) return "GOAL_CONFUSION";
  return context === "morning"
    ? "MORNING"
    : context === "evening"
      ? "EVENING"
      : null;
}
const skillProblem = (b) =>
  [
    "DECISION_MAKER_ACCESS",
    "DISCOVERY",
    "DEMO",
    "VALUE",
    "OBJECTION_HANDLING",
    "CLOSING",
    "FOLLOW_UP",
  ].includes(b);
function salesPrinciple(b) {
  return (
    {
      DECISION_MAKER_ACCESS: "DECISION_PROCESS",
      DISCOVERY: "DISCOVERY",
      DEMO: "DISCOVERY",
      VALUE: "VALUE",
      OBJECTION_HANDLING: "OBJECTIONS",
      CLOSING: "CLOSING",
      FOLLOW_UP: "FOLLOW_UP",
    }[b] || "CUSTOMER_PROBLEM"
  );
}

/** Deterministic selection only. Personality is deliberately not an input.
 * Explicit feelings/context describe the intervention; sales diagnostics are retained separately.
 * principle is an optional explicit Book Wisdom exercise selection, never random mixing.
 */
export function selectPhilosophy({
  analysis = analyzeSales(),
  philosophy = "citelcoach",
  context = "home",
  blocker = "",
  objection = "",
  successEvidence = [],
  principle: requestedPrinciple,
  behavior = {},
} = {}) {
  const selectedPhilosophy = normalizePhilosophy(philosophy);
  const trigger = classifyContext(context, blocker);
  const bottleneck = analysis.bottleneck;
  let chosen = selectedPhilosophy,
    principle;
  if (chosen === "citelcoach") {
    if (
      context !== "pre-meeting" &&
      !["FEAR", "REJECTION"].includes(trigger) &&
      (behavior.frog?.priority >= 85 || behavior.practiceWithoutAction)
    ) {
      chosen = "eat-that-frog";
      principle = behavior.practiceWithoutAction
        ? "EXECUTION"
        : "HIGHEST_VALUE";
    } else if (
      behavior.repeatedDelay &&
      ["home", "morning"].includes(context)
    ) {
      chosen = "atomic-habits";
      principle = "REDUCE_FRICTION";
    } else if (behavior.missedDay || trigger === "LOW_ENERGY") {
      chosen = "atomic-habits";
      principle = "NEVER_MISS_TWICE";
    } else if (behavior.scattered || behavior.lowQuality) {
      chosen = "deep-work";
      principle = behavior.lowQuality ? "DELIBERATE_PRACTICE" : "SINGLE_TASK";
    } else if (behavior.repeatedProcrastination || behavior.inconsistent) {
      chosen = "atomic-habits";
      principle = "REDUCE_FRICTION";
    } else if (trigger === "PRE_MEETING" || trigger === "FEAR") {
      chosen = "subconscious";
      principle = "MENTAL_REHEARSAL";
    } else if (["PROCRASTINATION", "LOW_ENERGY"].includes(trigger)) {
      chosen = "limitless";
      principle = "MOTIVATION";
    } else if (trigger === "REJECTION") {
      chosen = "grow-rich";
      principle = "PERSISTENCE";
    } else if (trigger === "GOAL_CONFUSION" || bottleneck === "FOLLOW_UP") {
      chosen = "grow-rich";
      principle = "ORGANIZED_PLANNING";
    } else if (trigger === "OVERTHINKING") {
      chosen = "grow-rich";
      principle = "DECISION";
    } else if (skillProblem(bottleneck)) {
      chosen = "sales-psychology";
      principle = salesPrinciple(bottleneck);
    } else if (trigger === "EVENING") {
      chosen = "subconscious";
      principle = "VISUALIZATION";
    } else {
      chosen = "grow-rich";
      principle =
        trigger === "MORNING" || analysis.stats.visits === 0
          ? "DECISION"
          : "PERSISTENCE";
    }
  } else if (chosen === "atomic-habits") {
    principle =
      behavior.missedDay || trigger === "LOW_ENERGY"
        ? "NEVER_MISS_TWICE"
        : "REDUCE_FRICTION";
  } else if (chosen === "eat-that-frog") {
    principle = behavior.practiceWithoutAction ? "EXECUTION" : "HIGHEST_VALUE";
  } else if (chosen === "deep-work") {
    principle = behavior.lowQuality ? "DELIBERATE_PRACTICE" : "SINGLE_TASK";
  } else if (chosen === "limitless") {
    principle = ["FEAR", "REJECTION"].includes(trigger)
      ? "MINDSET"
      : ["PROCRASTINATION", "OVERTHINKING", "LOW_ENERGY", "MORNING"].includes(
            trigger,
          )
        ? "MOTIVATION"
        : skillProblem(bottleneck)
          ? "METHOD"
          : "MOTIVATION";
  } else if (chosen === "grow-rich") {
    principle =
      trigger === "REJECTION" || trigger === "FEAR"
        ? "PERSISTENCE"
        : trigger === "GOAL_CONFUSION" || bottleneck === "FOLLOW_UP"
          ? "ORGANIZED_PLANNING"
          : ["OVERTHINKING", "PROCRASTINATION", "MORNING"].includes(trigger)
            ? "DECISION"
            : skillProblem(bottleneck)
              ? "SPECIALIZED_KNOWLEDGE"
              : trigger === "EVENING"
                ? "ORGANIZED_PLANNING"
                : "DESIRE";
  } else if (chosen === "subconscious") {
    principle = ["PRE_MEETING", "FEAR"].includes(trigger)
      ? "MENTAL_REHEARSAL"
      : trigger === "EVENING"
        ? "VISUALIZATION"
        : trigger === "MORNING"
          ? "IDENTITY"
          : trigger === "REJECTION"
            ? "SELF_TALK"
            : skillProblem(bottleneck)
              ? "MENTAL_REHEARSAL"
              : "SELF_TALK";
  } else {
    principle =
      trigger === "REJECTION" || trigger === "FEAR"
        ? "OBJECTIONS"
        : salesPrinciple(bottleneck);
  }
  if (
    context === "book" &&
    requestedPrinciple &&
    principleById(chosen, requestedPrinciple)
  )
    principle = requestedPrinciple;
  const entry = principleById(chosen, principle);
  const m = analysis.stats;
  let insight = entry.overview,
    exercise = entry.exercise,
    action = entry.action,
    actionPath = entry.path,
    actionLabel = "DO IT NOW",
    duration = 60;
  const evidence = [...analysis.evidence];
  if (["atomic-habits", "eat-that-frog", "deep-work"].includes(chosen)) {
    evidence.push(...(behavior.evidence || []));
    if (behavior.missedDay)
      evidence.push("Yesterday had an unmet saved activity target.");
    if (behavior.repeatedDelay)
      evidence.push(
        "First recorded action was over 20 minutes after opening on at least three observed days.",
      );
    if (behavior.scattered)
      evidence.push(
        "At least two completed focus blocks reported three or more distractions this week.",
      );
    if (behavior.lowQuality)
      evidence.push(
        "At least three practice records; 60% or more were rated as needing work.",
      );
    if (behavior.repeatedProcrastination)
      evidence.push(
        "At least three procrastination recommendations remain incomplete this week.",
      );
    if (chosen === "eat-that-frog" && behavior.frog && context !== "book") {
      action = behavior.frog.task;
      actionPath = behavior.frog.actionRoute;
      evidence.push(behavior.frog.reason);
    }
    if (principle === "REDUCE_FRICTION") actionLabel = "DO ONE VISIT";
    if (principle === "NEVER_MISS_TWICE") actionLabel = "START MINIMUM DAY";
  }
  if (blocker) evidence.push(`You selected: ${blocker}`);
  if (objection) evidence.push(`Reported objection: ${objection}`);
  if (principle === "MINDSET") {
    insight =
      "A prediction about the next conversation is not yet evidence about its outcome.";
    const win = successEvidence
      .filter((e) => typeof e.text === "string" && e.text.trim())
      .at(-1);
    if (win) evidence.push(`Your saved evidence: ${win.text}`);
    action = `Have ${Math.max(1, Math.min(3, 5 - analysis.realConversations))} more real conversations before judging the market.`;
  }
  if (principle === "MOTIVATION") {
    insight =
      "Make the next action small enough to begin with the energy you have.";
    action = "Approach ONE business.";
    actionLabel = "DO ONE VISIT";
    if (trigger === "LOW_ENERGY") {
      exercise =
        "Pause somewhere safe, take water or a short rest if needed, then choose one manageable visit.";
      duration = 300;
    }
  }
  if (principle === "DECISION") {
    insight =
      "Choose a reasonable opening and give yourself a short deadline to begin.";
    action = "Enter the next suitable business within five minutes.";
    actionLabel = "DO ONE VISIT";
    duration = 300;
  }
  if (principle === "PERSISTENCE") {
    insight =
      "One rejection is one data point, not a verdict. Keep the lesson and respect the customer’s choice.";
    action = `Complete prospect #${m.visits + 1} and record what happened.`;
    actionLabel = "NEXT PROSPECT";
  }
  if (principle === "ORGANIZED_PLANNING") {
    if (bottleneck === "FOLLOW_UP" && trigger !== "GOAL_CONFUSION") {
      action = "Complete one due follow-up before adding a new commitment.";
      actionPath = "/more/followups";
      exercise = "Pick one due follow-up and review the agreed next step.";
      actionLabel = "OPEN FOLLOW-UPS";
    } else {
      action =
        "Use your revenue goal and realistic conversion inputs to plan daily activity.";
      actionPath = "/more/calculator";
      actionLabel = "OPEN GOAL CALCULATOR";
      evidence.push(
        `Daily targets: ${analysis.targets.visits} visits, ${analysis.targets.decisionMakers} decision makers, ${analysis.targets.demos} demos, ${analysis.targets.sales} sales`,
      );
    }
  }
  if (principle === "DESIRE" || principle === "GOAL_CLARITY") {
    evidence.push(
      `Daily revenue target: ₹${analysis.targets.revenue}; visits target: ${analysis.targets.visits}`,
    );
    actionLabel = "CONNECT GOAL TO ACTION";
  }
  if (principle === "MENTAL_REHEARSAL") {
    duration = 75;
    actionLabel =
      trigger === "PRE_MEETING" ? "ENTER NOW" : "TRY THE NEXT CONVERSATION";
  }
  if (principle === "IDENTITY") {
    actionLabel = "CHOOSE STATEMENT & ACTION";
  }
  if (principle === "VISUALIZATION") {
    actionLabel = "PLAN TOMORROW";
  }
  // Preserve a supported funnel action for Home and other process-focused advice.
  // Do not bury a closing or access problem under generic visualization.
  const processContext =
    !trigger || trigger === "EVENING" || trigger === "MORNING";
  if (
    context !== "book" &&
    skillProblem(bottleneck) &&
    processContext &&
    principle !== "ORGANIZED_PLANNING" &&
    !["atomic-habits", "eat-that-frog", "deep-work"].includes(chosen)
  ) {
    actionPath = analysis.nextAction.to;
    actionLabel = analysis.nextAction.label;
    action =
      analysis.recommendedPractice?.instruction || analysis.mission.instruction;
    if (chosen === "sales-psychology" && bottleneck === "DEMO") {
      actionPath = "/coach/frameworks?focus=discovery";
      actionLabel = "PRACTICE DISCOVERY";
      action =
        "Practice two discovery questions before offering another demonstration.";
    }
    if (principle === "METHOD") {
      insight =
        "Activity is happening. The recorded gap points to a method worth testing.";
      exercise =
        analysis.recommendedPractice?.instruction ||
        analysis.mission.instruction;
      duration = 120;
    }
    if (principle === "MENTAL_REHEARSAL") {
      exercise = `Rehearse the next step calmly: ${action}`;
    }
  }
  if (
    chosen === "sales-psychology" &&
    ["FEAR", "REJECTION"].includes(trigger)
  ) {
    insight =
      "A no can reflect fit, timing, budget or preference. Ask one welcome clarifying question, then accept the answer.";
    action = "Move to the next prospect and test for a real customer need.";
    actionPath = "/live";
    actionLabel = "NEXT PROSPECT";
  }
  if (context === "pre-meeting") {
    action = "Enter the business calmly and ask your first discovery question.";
    actionPath = "/live";
    actionLabel = "ENTER NOW";
  }
  if (context === "book") {
    action = entry.action;
    actionPath = entry.path;
    actionLabel = actionPath === "/live" ? "TRY IN THE FIELD" : "PRACTICE NOW";
  }
  return {
    version: 1,
    selectedPhilosophy,
    philosophy: chosen,
    principle,
    principleLabel: entry.label,
    problem:
      chosen === "deep-work"
        ? behavior.lowQuality
          ? "LOW_PRACTICE_QUALITY"
          : "SCATTERED_ACTIVITY"
        : principle === "NEVER_MISS_TWICE"
          ? trigger || "MISSED_DAY"
          : behavior.practiceWithoutAction && chosen === "eat-that-frog"
            ? "PRACTICE_WITHOUT_ACTION"
            : behavior.repeatedDelay && principle === "REDUCE_FRICTION"
              ? "STARTING_DELAY"
              : trigger || bottleneck,
    bottleneck,
    insight,
    evidence,
    exercise,
    action,
    actionLabel,
    actionPath,
    duration,
    sourceLabel: philosophyById(chosen).sourceLabel,
    context,
    contextDetail: blocker || objection,
    stats: { ...m },
    date: analysis.period.date,
  };
}

export function planTomorrow({
  analysis,
  philosophy = "citelcoach",
  date = analysis.period.date,
}) {
  const next = new Date(date + "T12:00:00");
  next.setDate(next.getDate() + 1);
  const forDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
  const advice = selectPhilosophy({ analysis, philosophy, context: "evening" });
  return {
    version: 1,
    forDate,
    basedOnDate: date,
    lesson: analysis.explanation,
    evidence: [...analysis.evidence],
    advice,
    visualization: `Imagine tomorrow’s first suitable conversation. Greet the owner, ask a useful question, listen fully, then practice this step: ${advice.action} Picture accepting either answer calmly.`,
  };
}
export function morningFromPlan(plan, { date, philosophy, stats }) {
  if (
    !plan?.advice ||
    plan.version !== 1 ||
    plan.forDate !== date ||
    plan.advice.selectedPhilosophy !== normalizePhilosophy(philosophy)
  )
    return null;
  const advice = {
    ...plan.advice,
    context: "morning",
    date,
    stats: { ...stats },
    evidence: [
      `Focus saved on ${plan.basedOnDate}; evidence below is from that day.`,
      ...plan.evidence,
    ],
  };
  if (
    advice.principle === "PERSISTENCE" ||
    advice.principle === "VISUALIZATION" ||
    advice.actionPath === "/more/evening"
  ) {
    advice.action = "Complete your first planned prospect visit today.";
    advice.actionPath = "/live";
    advice.actionLabel = "START FIRST VISIT";
  }
  return advice;
}
