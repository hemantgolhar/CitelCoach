import { selectPhilosophy } from "./philosophyEngine.js";
import {
  aggregateEffectiveness,
  rankGroups,
  adviceProblem,
} from "./adviceEffectiveness.js";

export function appropriateCandidates(base) {
  const problem = base.problem;
  const pairs =
    problem === "FEAR"
      ? [
          ["subconscious", "MENTAL_REHEARSAL"],
          ["limitless", "MINDSET"],
          ["grow-rich", "PERSISTENCE"],
        ]
      : problem === "REJECTION"
        ? [
            ["grow-rich", "PERSISTENCE"],
            ["limitless", "MINDSET"],
            ["sales-psychology", "OBJECTIONS"],
          ]
        : [
              "PROCRASTINATION",
              "OVERTHINKING",
              "MORNING",
              "STARTING_DELAY",
            ].includes(problem)
          ? [
              ["grow-rich", "DECISION"],
              ["limitless", "MOTIVATION"],
            ]
          : problem === "PRE_MEETING"
            ? [
                ["subconscious", "MENTAL_REHEARSAL"],
                ["grow-rich", "DESIRE"],
              ]
            : base.bottleneck === "FOLLOW_UP"
              ? [
                  ["grow-rich", "ORGANIZED_PLANNING"],
                  ["sales-psychology", "FOLLOW_UP"],
                ]
              : [
                    "CLOSING",
                    "DISCOVERY",
                    "DEMO",
                    "VALUE",
                    "OBJECTION_HANDLING",
                    "DECISION_MAKER_ACCESS",
                  ].includes(base.bottleneck)
                ? [
                    [
                      "sales-psychology",
                      {
                        CLOSING: "CLOSING",
                        DISCOVERY: "DISCOVERY",
                        DEMO: "DISCOVERY",
                        VALUE: "VALUE",
                        OBJECTION_HANDLING: "OBJECTIONS",
                        DECISION_MAKER_ACCESS: "DECISION_PROCESS",
                      }[base.bottleneck],
                    ],
                    ["limitless", "METHOD"],
                  ]
                : [];
  const extra = [];
  if (
    [
      "PROCRASTINATION",
      "OVERTHINKING",
      "MORNING",
      "STARTING_DELAY",
      "ACTIVITY",
      "INSUFFICIENT_DATA",
    ].includes(problem)
  )
    extra.push(
      ["atomic-habits", "REDUCE_FRICTION"],
      ["eat-that-frog", "EXECUTION"],
    );
  if (base.principle === "NEVER_MISS_TWICE")
    extra.push(["atomic-habits", "NEVER_MISS_TWICE"]);
  if (problem === "PRACTICE_WITHOUT_ACTION")
    extra.push(
      ["eat-that-frog", "EXECUTION"],
      ["atomic-habits", "REDUCE_FRICTION"],
    );
  if (base.philosophy === "deep-work")
    extra.push(["deep-work", base.principle], ["limitless", "METHOD"]);
  if (base.bottleneck === "FOLLOW_UP" || base.philosophy === "eat-that-frog")
    extra.push(["eat-that-frog", "HIGHEST_VALUE"]);
  return [...pairs, ...extra].map(([philosophy, principle]) => ({
    philosophy,
    principle,
    key: philosophy + ":" + principle,
  }));
}
export function chooseHistorical(base, history) {
  // Use prior days only: displaying advice cannot change the choice during this day.
  const relevant = history.filter(
    (r) =>
      r.type === "principle" &&
      r.domain !== "sales" &&
      r.day < base.date &&
      r.context === base.context &&
      adviceProblem(r) === base.problem,
  );
  const allowed = appropriateCandidates(base);
  const groups = rankGroups(
    aggregateEffectiveness(relevant).filter(
      (g) => g.meaningful && allowed.some((c) => c.key === g.key),
    ),
  );
  if (!groups.length) return null;
  let selected = groups[0],
    diverse = false;
  const recent = [...relevant]
    .sort((a, b) => String(b.shownAt).localeCompare(String(a.shownAt)))
    .slice(0, 2);
  if (
    recent.length === 2 &&
    recent.every((r) => `${r.philosophy}:${r.principle}` === selected.key)
  ) {
    const alternative = groups.find(
      (g) =>
        g.key !== selected.key &&
        selected.completionRate - g.completionRate <= 0.15,
    );
    if (alternative) {
      selected = alternative;
      diverse = true;
    }
  }
  return {
    ...selected,
    explanation: `Using ${selected.principle.replaceAll("_", " ")} because you completed ${selected.completed} of ${selected.shown} similar actions.${diverse ? " A similarly followed alternative adds variety after two repeated recommendations." : ""}`,
    diverse,
  };
}
export function recommendAdaptive({
  options,
  history = [],
  experiments = [],
  repeatedDelay = false,
}) {
  let base = selectPhilosophy(options);
  if (base.selectedPhilosophy !== "citelcoach" || options.context === "book")
    return base;
  if (
    repeatedDelay &&
    !options.behavior &&
    options.context === "home" &&
    ["ACTIVITY", "INSUFFICIENT_DATA"].includes(base.bottleneck)
  ) {
    base = {
      ...selectPhilosophy({
        ...options,
        context: "morning",
        philosophy: "grow-rich",
      }),
      selectedPhilosophy: "citelcoach",
      context: "home",
      problem: "STARTING_DELAY",
      insight:
        "On at least three observed days this week, the first recorded activity came more than 20 minutes after opening the app. Starting is worth focusing on.",
      action:
        "Aim to record your first prospect within 10 minutes of opening your sales day, when practical.",
    };
  }
  const experiment = experiments.find(
    (e) =>
      e.type === "coachingExperiment" &&
      e.startDay <= base.date &&
      e.endDay >= base.date &&
      !e.stoppedAt &&
      base.problem === "PROCRASTINATION",
  );
  if (experiment) {
    return {
      ...selectPhilosophy({ ...options, philosophy: "grow-rich" }),
      selectedPhilosophy: "citelcoach",
      experimentId: experiment.id,
      adaptationReason:
        "Using Decision for your active 7-day procrastination experiment.",
    };
  }
  const choice = chooseHistorical(base, history);
  if (!choice) return base;
  const candidate = selectPhilosophy({
    ...options,
    context: base.problem === "STARTING_DELAY" ? "morning" : options.context,
    philosophy: choice.philosophy,
  });
  if (candidate.principle !== choice.principle) return base;
  return {
    ...candidate,
    selectedPhilosophy: "citelcoach",
    context: base.context,
    problem: base.problem,
    adaptationReason: choice.explanation,
  };
}
