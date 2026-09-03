import { analyzeSales, selectPeriod } from "./coachEngine.js";
import { dayKey } from "../utils/metrics.js";
import { coachWording } from "./coachPersonality.js";
import { playbookFor, qualificationQuestions } from "../data/salesPlaybooks.js";
export const SALES_STAGES = Object.freeze([
  "PROSPECTING",
  "APPROACH",
  "DECISION_MAKER_ACCESS",
  "RAPPORT",
  "DISCOVERY",
  "PROBLEM",
  "IMPLICATION",
  "NEED",
  "QUALIFICATION",
  "PRESENTATION",
  "DEMO",
  "VALUE",
  "PRICE",
  "OBJECTION",
  "NEGOTIATION",
  "CLOSING",
  "FOLLOW_UP",
  "WON",
  "LOST",
]);
export const OBJECTION_TYPES = [
  "PRICE",
  "VALUE",
  "NEED",
  "TRUST",
  "TIMING",
  "AUTHORITY",
  "COMPETITOR",
  "RISK",
  "INFORMATION",
  "STALL",
  "UNKNOWN",
];
export const FOLLOW_UP_PURPOSES = [
  "Information requested",
  "Decision pending",
  "Partner approval",
  "Budget timing",
  "Demo pending",
  "Trial pending",
  "No response",
  "General follow-up",
];
export const OBSERVATIONS = {
  problem: "Specific problem identified",
  impact: "Impact described",
  decisionMaker: "Decision maker reached",
  need: "Need acknowledged",
  value: "Value understood",
  budget: "Budget discussed",
  timing: "Timing known",
  nextStep: "Next step agreed",
  discovery: "Discovery questions answered",
  objectionDiagnosed: "Objection clarified",
  objectionHandled: "Concern addressed",
  negotiated: "Constraints discussed",
  askedSale: "Asked for an appropriate commitment",
  interested: "Customer expressed interest",
  notReady: "Customer said they are not ready",
  consentNextStep: "Customer already agreed to this next step",
};
export function qualificationScore(answers = {}) {
  const keys = [
    "problem",
    "impact",
    "decisionMaker",
    "budget",
    "timing",
    "nextStep",
  ];
  const known = keys.filter((k) => typeof answers[k] === "boolean").length;
  const score = Math.round(
    (keys.filter((k) => answers[k] === true).length / keys.length) * 100,
  );
  return {
    score,
    known,
    total: keys.length,
    label:
      score >= 84
        ? "Strong"
        : score >= 67
          ? "Qualified"
          : score >= 34
            ? "Possible"
            : "Weak",
    note: "Checklist coverage from your recorded answers; not purchase probability.",
  };
}
export function dealQuality(answers = {}) {
  const keys = [
    "problem",
    "decisionMaker",
    "need",
    "value",
    "budget",
    "timing",
    "nextStep",
  ];
  const count = keys.filter((k) => answers[k] === true).length;
  return {
    score: Math.round((count / 7) * 100),
    known: keys.filter((k) => typeof answers[k] === "boolean").length,
    label:
      count >= 6
        ? "STRONG"
        : count >= 5
          ? "QUALIFIED"
          : count >= 3
            ? "DEVELOPING"
            : "EARLY",
  };
}
export function discoveryReady(c = {}) {
  return c.problem === true && c.need === true && c.discovery !== false;
}
export function detectConversationStage(c = {}, analysis = analyzeSales()) {
  if (c.outcome === "SOLD") return "WON";
  if (c.outcome === "REJECTED" && c.finished) return "LOST";
  if (c.decisionMaker === false) return "DECISION_MAKER_ACCESS";
  if (c.discovery === false || c.problem === false) return "DISCOVERY";
  if (c.objection) return "OBJECTION";
  if (SALES_STAGES.includes(c.stage)) return c.stage;
  return (
    {
      ACTIVITY: "PROSPECTING",
      INSUFFICIENT_DATA: "PROSPECTING",
      OBJECTION_HANDLING: "OBJECTION",
      DECISION_MAKER_ACCESS: "DECISION_MAKER_ACCESS",
      DEMO: "DISCOVERY",
    }[analysis.bottleneck] || analysis.bottleneck
  );
}
export function spinQuestion(product, stage = "PROBLEM", situationAsked = 0) {
  const p = playbookFor(product);
  return (
    p.spin[stage === "SITUATION" && situationAsked >= 1 ? "PROBLEM" : stage] ||
    p.spin.PROBLEM
  );
}
export function classifyObjection(text = "") {
  const t = text.toLowerCase();
  const rules = [
    ["AUTHORITY", /owner|partner|boss|approval|authority/],
    ["INFORMATION", /whatsapp|details|information|send me/],
    ["COMPETITOR", /already|competitor|similar|another (tool|vendor)/],
    ["TIMING", /later|busy|not now|next (month|year)|timing/],
    ["TRUST", /trust|proof|believe|reliable/],
    ["RISK", /risk|secure|security|privacy|fail|refund/],
    ["NEED", /don't need|do not need|no need|not interested/],
    ["VALUE", /benefit|worth|value|useful/],
    ["PRICE", /expensive|price|cost|budget|afford|discount/],
    ["STALL", /think|silent|let.*know/],
  ];
  return rules.find(([, rx]) => rx.test(t))?.[0] || "UNKNOWN";
}
const objectionDetails = {
  PRICE: [
    "a budget limit, a comparison or unclear value",
    "When you say expensive, is the concern the investment itself, another option, or the value you would receive?",
  ],
  VALUE: [
    "the benefit is not connected to a priority",
    "What result would make this useful enough to consider?",
  ],
  NEED: [
    "the problem may not exist",
    "Is there anything in the current process you would want to improve?",
  ],
  TRUST: [
    "evidence or confidence is missing",
    "What would you need to verify before considering this?",
  ],
  TIMING: [
    "another priority or a genuine timing constraint",
    "What needs to happen before this becomes worth revisiting?",
  ],
  AUTHORITY: [
    "someone else must decide",
    "Who should be involved in evaluating this?",
  ],
  COMPETITOR: [
    "the current solution already works, or there is a comparison",
    "What works well with your current solution, and what would you change?",
  ],
  RISK: [
    "an unresolved operational or commercial risk",
    "Which risk would you want us to examine first?",
  ],
  INFORMATION: [
    "a specific information need or a wish to pause",
    "Which detail would be most useful, and may I send just that?",
  ],
  STALL: [
    "uncertainty about usefulness, price or timing",
    "Of course. What part would you like to think through: usefulness, price, or timing?",
  ],
  UNKNOWN: [
    "a concern that needs clarification",
    "Could you tell me a little more about your concern?",
  ],
};
export const objectionBranches = [
  "Not clarified",
  "Budget limit",
  "Comparing alternatives",
  "Value unclear",
  "Need absent",
  "Timing constraint",
  "Evidence needed",
  "Decision maker needed",
  "Information needed",
];
export function diagnoseObjection(text, answer = "Not clarified") {
  const type = classifyObjection(text),
    [meaning, question] = objectionDetails[type];
  const branches = {
    "Budget limit": [
      "Respect the budget limit. Discuss only a verified, approved option or agree to stop.",
      "Would revisiting when the budget changes be useful, or should we close this for now?",
    ],
    "Comparing alternatives": [
      "Compare verified capabilities against the customer’s criteria; do not disparage the alternative.",
      "Which criterion matters most in your comparison?",
    ],
    "Value unclear": [
      "Return to the stated problem and ask what a useful result would look like.",
      "What would need to improve for this investment to make sense?",
    ],
    "Need absent": [
      "Accept that there may be no fit. Do not manufacture a problem.",
      "Shall we leave it here?",
    ],
    "Timing constraint": [
      "Respect the constraint and ask permission for a specific later check-in.",
      "When would it be useful to revisit this?",
    ],
    "Evidence needed": [
      "Offer only evidence you can verify and acknowledge remaining uncertainty.",
      "What evidence would help you assess this?",
    ],
    "Decision maker needed": [
      "Invite the actual decision maker into a relevant next conversation.",
      "Can we include that person in a short discussion?",
    ],
    "Information needed": [
      "Confirm permission and send only the requested verified detail.",
      "When would you like to discuss any remaining question?",
    ],
  };
  const response = branches[answer];
  return {
    type,
    said: text,
    mayMean: `This may mean ${meaning}.`,
    findOut: "Listen for the constraint before choosing a response.",
    question,
    response:
      response?.[0] ||
      "Acknowledge the concern, ask the question, then listen. Do not pitch again before clarifying.",
    nextStep: response?.[1] || "Listen, then select the clarified concern.",
    branch: answer,
    steps: ["LISTEN", "ACKNOWLEDGE", "EXPLORE", "RESPOND"],
  };
}
export function negotiationGuidance(c = {}) {
  return {
    framework: "ETHICAL_NEGOTIATION",
    response:
      "It sounds as though the investment needs to fit a clear business constraint. Have I understood that correctly?",
    question: "What would you need to see for this to make business sense?",
    tip: "Mirror a key phrase, label tentatively, and summarize their answer before offering anything.",
    action: c.approvedTrade
      ? `Discuss only this confirmed approved option: ${c.approvedTrade}`
      : "Check whether a longer commitment, multiple units, a bundle or reduced scope is actually approved. Do not promise an unavailable offer.",
  };
}
export function selectClose(c = {}) {
  if (!discoveryReady(c))
    return {
      type: "DISCOVERY_FIRST",
      question: "What specific problem would you want this to solve?",
      action: "Ask two discovery questions before discussing a close.",
    };
  if (
    c.notReady ||
    c.decisionMaker !== true ||
    c.budget !== true ||
    c.timing !== true
  )
    return {
      type: "NEXT_STEP",
      question: "What is the next useful step, who should join, and when?",
      action: "Agree a legitimate next step rather than push for purchase.",
    };
  if (c.consentNextStep)
    return {
      type: "ASSUMPTIVE_NEXT_STEP",
      question:
        "You agreed to the next step; shall we confirm the details now?",
      action: "Confirm only the step already accepted.",
    };
  if (
    Array.isArray(c.verifiedOptions) &&
    c.verifiedOptions.length === 2 &&
    c.verifiedOptions.every((v) => typeof v === "string" && v.trim()) &&
    c.verifiedOptions[0].trim() !== c.verifiedOptions[1].trim()
  )
    return {
      type: "ALTERNATIVE",
      question: `Would ${c.verifiedOptions[0]} or ${c.verifiedOptions[1]} fit better, or would neither?`,
      action: "Offer only the two verified options and respect either answer.",
    };
  if (c.benefitsConfirmed >= 2)
    return {
      type: "SUMMARY",
      question:
        "We have confirmed the benefits you named. Is there anything unresolved before you decide?",
      action:
        "Summarize the customer’s confirmed benefits, then invite a decision.",
    };
  if (
    qualificationScore(c).score >= 84 &&
    c.value === true &&
    c.interested === true
  )
    return {
      type: "DIRECT",
      question:
        "Would you like to proceed, or is there something we should resolve first?",
      action: "Invite a clear decision without pressure.",
    };
  return {
    type: "TRIAL",
    question: "How well does this fit what you were looking for?",
    action: "Check interest before asking for a purchase.",
  };
}
export function microCommitment(c = {}) {
  if (!discoveryReady(c))
    return "May I ask two questions about the problem before suggesting anything?";
  if (c.decisionMaker !== true)
    return "Could we include the person who decides in our next conversation?";
  if (!c.demo)
    return "Would a short demonstration of the relevant part be useful?";
  if (!c.value)
    return "Which part should we clarify before deciding on a next step?";
  return selectClose(c).question;
}
export function classifyFollowUp(text = "") {
  return /partner|approval|owner/i.test(text)
    ? "Partner approval"
    : /budget|month|fund/i.test(text)
      ? "Budget timing"
      : /demo/i.test(text)
        ? "Demo pending"
        : /trial|test|evaluation/i.test(text)
          ? "Trial pending"
          : /details|information|whatsapp|send/i.test(text)
            ? "Information requested"
            : /no response|unanswered/i.test(text)
              ? "No response"
              : /decision|think/i.test(text)
                ? "Decision pending"
                : "General follow-up";
}
export function followUpObjective(purpose) {
  return (
    {
      "Information requested":
        "Answer the specific requested question with verified information.",
      "Decision pending":
        "Confirm the decision or identify the unresolved concern.",
      "Partner approval": "Reach the decision maker and include the partner.",
      "Budget timing": "Confirm when the budget can be reviewed.",
      "Demo pending": "Schedule a relevant demo with permission.",
      "Trial pending": "Review the agreed evaluation criteria and result.",
      "No response":
        "Ask whether further contact is welcome; respect no response and a clear no.",
      "General follow-up":
        "Agree the specific question, person and timing for the next step.",
    }[purpose] || "Clarify the purpose before contacting the customer."
  );
}
export function salesMastery({
  data = {},
  analysis,
  conversation = {},
  product = "aura",
  personality = "Supportive",
  date = dayKey(),
} = {}) {
  const a =
    analysis ||
    analyzeSales({
      activities: data.salesActivities || [],
      meetings: data.meetings || [],
      date,
    });
  const c = conversation,
    p = playbookFor(product),
    stage = detectConversationStage(c, a);
  let framework = "CONSULTATIVE",
    problem = stage,
    response = "Understand the situation before recommending a product.",
    question = spinQuestion(product, "PROBLEM"),
    action = "Ask two discovery questions.",
    actionRoute = "/live";
  if (stage === "WON" || stage === "LOST") {
    framework = "NEXT_STEP";
    response =
      stage === "WON"
        ? "Confirm the agreed details and fulfil your promises."
        : "Respect the decision and retain one useful lesson.";
    question =
      stage === "WON"
        ? "What needs to happen next for the agreed handover?"
        : "May I clarify one thing that would help me improve?";
    action = "Record the outcome and the agreed next step.";
  } else if (c.objection || stage === "OBJECTION" || stage === "PRICE") {
    const repeated = selectPeriod(data.salesActivities || [], a.period)
      .map((r) => r.objection)
      .filter((t) => t && t !== "None")
      .reduce((counts, t) => ({ ...counts, [t]: (counts[t] || 0) + 1 }), {});
    const observed = Object.entries(repeated).sort(
      (x, y) => y[1] - x[1],
    )[0]?.[0];
    const text =
      c.objection ||
      c.request ||
      observed ||
      (stage === "PRICE" ? "Price concern" : "Unclear concern");
    const d = diagnoseObjection(text, c.objectionBranch);
    framework = "LAER";
    problem = d.type;
    response = d.response;
    question = d.branch === "Not clarified" ? d.question : d.nextStep;
    action = "Listen and record the clarified concern before responding.";
  } else if (c.problem === false && c.discovery === true) {
    framework = "CHALLENGER";
    problem = "UNPERCEIVED_PROBLEM";
    response = p.insight + " This may or may not apply to your business.";
    question = p.spin.PROBLEM;
    action =
      "Test whether the perspective is relevant; accept that no problem may exist.";
  } else if (stage === "PROSPECTING") {
    framework = "PROSPECTING";
    response = "Your pipeline needs more conversations.";
    question = "Which five suitable prospects can you approach next?";
    action = "Complete 5 prospecting attempts and record the results.";
  } else if (stage === "DECISION_MAKER_ACCESS") {
    framework = "QUALIFICATION";
    question = qualificationQuestions.decisionMaker;
    response =
      "Find the decision process before presenting to someone who cannot decide.";
    action = "Agree a suitable conversation with the decision maker.";
  } else if (stage === "NEGOTIATION" && discoveryReady(c)) {
    const n = negotiationGuidance(c);
    framework = n.framework;
    response = n.response;
    question = n.question;
    action = n.action;
  } else if (
    [
      "CLOSING",
      "PRESENTATION",
      "DEMO",
      "VALUE",
      "NEGOTIATION",
      "QUALIFICATION",
    ].includes(stage) &&
    !discoveryReady(c)
  ) {
    framework = "CONSULTATIVE";
    problem = "INSUFFICIENT_DISCOVERY";
    response =
      "You may be trying to advance before establishing a problem. Confirm the need first.";
    question = p.spin.PROBLEM;
    action = "Ask two discovery questions before presenting or closing.";
  } else if (stage === "CLOSING") {
    const close = selectClose(c);
    framework = "CLOSE_" + close.type;
    response =
      "Use the customer’s established need and readiness to choose the next commitment.";
    question = close.question;
    action = close.action;
  } else if (stage === "FOLLOW_UP") {
    framework = "FOLLOW_UP";
    const purpose = c.followUpPurpose || classifyFollowUp(c.reason);
    response = followUpObjective(purpose);
    question =
      "Which unresolved question should we settle, and when would a conversation work?";
    action = response;
    actionRoute = "/more/followups";
  } else if (stage === "QUALIFICATION") {
    framework = "QUALIFICATION";
    const missing =
      Object.keys(qualificationQuestions).find((k) => c[k] !== true) ||
      "nextStep";
    question = qualificationQuestions[missing];
    response = "Clarify known answers and leave uncertainty visible.";
    action = "Record the customer’s answer without guessing.";
  } else if (["PRESENTATION", "DEMO", "VALUE"].includes(stage)) {
    response =
      "Link only a verified capability to the problem the customer described.";
    question = "Would seeing that specific part help you assess the fit?";
    action =
      "Show the relevant verified workflow, then ask what remains unclear.";
  } else if (["APPROACH", "RAPPORT"].includes(stage)) {
    question =
      "Is now a suitable time for one question about how you handle this today?";
    action = "Ask permission, then listen.";
  } else {
    framework = "SPIN";
    question = spinQuestion(
      product,
      ["PROBLEM", "IMPLICATION", "NEED"].includes(stage)
        ? stage
        : c.spinStep || "PROBLEM",
      c.situationAsked || 0,
    );
    response =
      "Use situation questions sparingly; explore the problem, impact and useful improvement.";
  }
  return {
    version: 1,
    domain: "sales",
    stage,
    framework,
    problem,
    bottleneck: a.bottleneck,
    product: p.id,
    response,
    nextQuestion: question,
    action,
    actionRoute,
    coachTip: coachWording(personality, action),
    personality,
    qualification: qualificationScore(c),
    dealQuality: dealQuality(c),
    microCommitment: microCommitment(c),
    evidence: a.evidence,
    date,
    stats: a.stats,
  };
}
export const assistOptions = [
  "What should I ask?",
  "Customer objected",
  "Customer wants price",
  "Customer says think about it",
  "Customer wants WhatsApp details",
  "Customer is interested",
  "Customer is silent",
  "I don't know how to close",
];
export function helpNow(option, opts = {}) {
  const c = { ...(opts.conversation || {}) };
  if (option === "Customer wants price") {
    return {
      ...salesMastery({ ...opts, conversation: { ...c, stage: "PRICE" } }),
      response: "Share only the current verified price and what it includes.",
      nextQuestion:
        "Would you like to compare that with the specific need we discussed?",
      action: "VERIFY PRODUCT CLAIM before quoting a price.",
    };
  }
  const objection = {
    "Customer says think about it": "I'll think about it",
    "Customer wants WhatsApp details": "Send details on WhatsApp",
    "Customer is silent": "silent",
    "Customer objected": c.objection || "Customer raised a concern",
  }[option];
  return salesMastery({
    ...opts,
    conversation: {
      ...c,
      ...(objection
        ? { objection, stage: "OBJECTION" }
        : {
            stage:
              option === "What should I ask?"
                ? c.stage || "DISCOVERY"
                : "CLOSING",
            ...(option === "Customer is interested"
              ? { interested: true }
              : {}),
          }),
    },
  });
}
export const autopsySteps = [
  [
    "decisionMaker",
    "Did you reach the decision maker?",
    "DECISION_MAKER_ACCESS",
  ],
  ["problem", "Did you identify a specific business problem?", "DISCOVERY"],
  ["need", "Did the customer acknowledge the need?", "NEED"],
  ["value", "Did the customer understand the relevant value?", "VALUE"],
  ["budget", "Did you discuss investment constraints?", "QUALIFICATION"],
  [
    "objectionHandled",
    "Were any raised concerns resolved, or were there none?",
    "OBJECTION",
  ],
  ["nextStep", "Was a legitimate next step agreed?", "CLOSING"],
];
export function autopsyStep(answers = {}) {
  for (const [key, question, stage] of autopsySteps) {
    if (answers[key] === false)
      return {
        done: true,
        stage,
        practice:
          stage === "DISCOVERY"
            ? "SPIN Problem Questions"
            : stage.replaceAll("_", " ") + " practice",
        challenge:
          stage === "DISCOVERY"
            ? "Identify one explicit problem before demonstrating the product."
            : "Clarify this step in the next suitable conversation.",
      };
    if (answers[key] !== true) return { done: false, key, question, stage };
  }
  return {
    done: true,
    stage: "FOLLOW_UP",
    practice: "Review fit and follow-through",
    challenge:
      "Keep the agreed next step; no single breakdown was established.",
  };
}
