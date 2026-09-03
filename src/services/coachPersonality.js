// Tone is a final formatting step; it must never select a principle or action.
export function coachWording(personality, recommendation) {
  switch (String(personality).toUpperCase().replaceAll("_", " ")) {
    case "TOUGH":
      return `Make this your next move: ${recommendation}`;
    case "ANALYTICAL":
      return `Test the indicated step: ${recommendation}`;
    case "SALES MANAGER":
      return `Execution priority: ${recommendation}`;
    default:
      return `Focus on one step: ${recommendation}`;
  }
}
export function applyCoachPersonality(advice, personality = "Supportive") {
  return {
    ...advice,
    personality,
    spokenInsight: coachWording(personality, advice.insight),
  };
}
