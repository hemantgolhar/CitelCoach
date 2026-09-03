import { playbookFor } from "../data/salesPlaybooks.js";
export const customerPersonalities = [
  "Friendly",
  "Busy",
  "Skeptical",
  "Price-sensitive",
  "Interested",
  "Indifferent",
  "Existing-solution",
  "Owner-not-present",
];
export const difficulties = ["Easy", "Normal", "Hard", "Expert"];
const openings = {
  Friendly: "Happy to talk. What would you like to know?",
  Busy: "I have very little time.",
  Skeptical: "Why should I believe that this helps?",
  "Price-sensitive": "I am concerned about the cost.",
  Interested: "It looks interesting. Tell me more.",
  Indifferent: "I do not see a reason to change.",
  "Existing-solution": "We already use something else.",
  "Owner-not-present": "The owner is not here.",
};
const rounds = [
  [
    "DISCOVERY",
    "The current process usually works.",
    "Ask where the current process becomes difficult.",
    "Explain every feature immediately.",
    "Insist every business needs it.",
    "A problem question tests fit without inventing a need.",
  ],
  [
    "RAPPORT",
    "The handoff is frustrating, but I may not want to change.",
    "Summarize the frustration and ask whether you understood.",
    "Interrupt with a benefit list.",
    "Tell them their current process is wrong.",
    "Listening includes checking your understanding.",
  ],
  [
    "QUALIFICATION",
    "My partner also needs to evaluate this.",
    "Ask how both people evaluate and approve a change.",
    "Treat the partner as an obstacle to bypass.",
    "Ask for payment before involving the partner.",
    "Respect the actual decision process.",
  ],
  [
    "OBJECTION",
    "That seems expensive.",
    "Clarify whether the concern is budget, comparison or value.",
    "Offer an unapproved discount.",
    "Claim a fake deadline for the price.",
    "Diagnose the concern before responding.",
  ],
  [
    "VALUE",
    "What would this change for us?",
    "Connect one verified capability to their stated need and check relevance.",
    "Promise guaranteed revenue.",
    "Claim it solves every workflow.",
    "Use the customer’s priorities and verified facts.",
  ],
  [
    "CLOSING",
    "I need to think before deciding.",
    "Ask what is unresolved and agree a welcome next step.",
    "Push them to sign immediately.",
    "Assume silence means agreement.",
    "A useful commitment respects readiness and consent.",
  ],
];
export function roleplayRound({
  product = "aura",
  personality = "Friendly",
  difficulty = "Normal",
  round = 0,
} = {}) {
  const row = rounds[Math.min(Math.max(round, 0), rounds.length - 1)],
    level = Math.max(0, difficulties.indexOf(difficulty));
  const personalityPrompt =
    personality === "Owner-not-present" && round === 0
      ? "The owner is away; I cannot decide."
      : openings[personality] || openings.Friendly;
  const stage =
    personality === "Owner-not-present" && round === 0
      ? "DECISION_MAKER_ACCESS"
      : row[0];
  const right =
    stage === "DECISION_MAKER_ACCESS"
      ? "Ask who decides and when a conversation would be welcome."
      : row[2];
  const options = [
    { id: "listen", text: right, score: 1 },
    { id: "pressure", text: row[3], score: 0 },
    { id: "assume", text: row[4], score: 0 },
  ];
  // Position varies predictably; scoring depends on behavior, never aggression or speed.
  const shift = (round + level) % 3;
  return {
    stage,
    prompt: `${playbookFor(product).name}: ${round === 0 ? personalityPrompt + " " : ""}${row[1]}${level >= 2 ? " I am not ready to commit; explain why your next question is useful." : ""}${level === 3 ? " My requirements may not fit your product." : ""}`,
    options: [...options.slice(shift), ...options.slice(0, shift)],
    tip: row[5],
    hint: level === 0 ? row[5] : null,
    requiresReason: level >= 2,
    rounds: rounds.length,
  };
}
export function evaluateRoleplay(round, choice, reason = "") {
  const option = round.options.find((o) => o.id === choice);
  if (!option) throw Error("Choose a response.");
  if (round.requiresReason && !reason.trim())
    throw Error("Explain why that response is useful.");
  return {
    score: option.score,
    stage: round.stage,
    feedback: option.score
      ? round.tip
      : "Revisit the listening-first option. " + round.tip,
    reason: reason.trim(),
  };
}
