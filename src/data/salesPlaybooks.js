import { products } from "./content.js";
const spin = {
  aura: [
    "How do you share contact details after meeting someone?",
    "When does exchanging or finding those details become awkward?",
    "What happens to a promising connection when the details are lost?",
    "Would a simpler way to share a verified profile help your follow-through?",
  ],
  reviews: [
    "How do you invite customers to leave honest reviews?",
    "Where do willing customers get stuck before posting?",
    "When feedback is missing, how does that affect what new customers can learn about you?",
    "Would a shorter path to the correct review page be useful?",
  ],
  menu: [
    "How do guests access your menu today?",
    "What becomes difficult when an item or price changes?",
    "How do outdated menu details affect your staff and guests?",
    "Would easier access to current menu information solve part of that problem?",
  ],
  pos: [
    "How do you handle billing and daily closing today?",
    "Where do you repeat manual work or correct errors?",
    "What does that rework affect during a busy shift?",
    "What improvement would make a different checkout workflow worth evaluating?",
  ],
  flow: [
    "Who handles your repetitive workflow and how often?",
    "Which handoff tends to need reminders or manual correction?",
    "What happens when that handoff is delayed?",
    "Would improving that one handoff justify a small supervised evaluation?",
  ],
};
export const qualificationQuestions = {
  problem: "What specific business problem would you want to solve?",
  impact: "What does that problem affect in your day-to-day work?",
  decisionMaker: "Who can approve this and who else should be involved?",
  budget: "What budget or investment constraints should we work within?",
  timing: "When would evaluating this be useful, if at all?",
  nextStep: "What would be a useful next step, with whom and when?",
};
const insights = {
  aura: "Sharing a card and making it easy to find the right details later are different steps.",
  reviews:
    "Asking for feedback and helping someone reach the right review page are different steps.",
  menu: "Making a menu available and keeping the information current are separate tasks.",
  pos: "A checkout can finish while reconciliation work remains for later.",
  flow: "A task can be quick on its own while its repeated handoffs still create work.",
};
export const salesPlaybooks = products.map((p) => ({
  ...p,
  idealCustomer: p.target,
  spin: Object.fromEntries(
    ["SITUATION", "PROBLEM", "IMPLICATION", "NEED"].map((key, i) => [
      key,
      spin[p.id][i],
    ]),
  ),
  qualification: qualificationQuestions,
  insight: insights[p.id],
  demoStrategy: `First confirm the need. ${p.demo.join(" → ")}. Ask the customer whether this addresses their stated problem.`,
  valuePropositions: p.benefits,
  badFit: [
    "Customer reports no relevant problem or priority.",
    "Required capability or compatibility cannot be verified.",
    "The customer declines further contact; respect that decision.",
  ],
  verification:
    "VERIFY PRODUCT CLAIM: confirm current capabilities, compatibility, price, integrations, support and any proposed offer before promising them.",
  closingQuestions: [
    ...p.closing,
    "What should we resolve before you can decide?",
  ],
  followUpStrategy: `Send only the requested information about ${p.name}, with permission. Agree on the question to resolve and a date; record the purpose.`,
}));
export const playbookFor = (id) =>
  salesPlaybooks.find((p) => p.id === id || p.name === id) || salesPlaybooks[0];
export const masteryLessons = [
  [
    "Prospecting",
    "PROSPECTING",
    "Disciplined prospecting",
    "Build a sample of real conversations before diagnosing skill.",
    "Which five suitable prospects can I approach respectfully?",
    "Plan five attempts and record each result.",
    "Complete five prospecting attempts.",
  ],
  [
    "Approach",
    "APPROACH",
    "Consultative",
    "Ask permission and establish relevance before pitching.",
    "Is now a suitable time for one question about your current process?",
    "Rehearse a brief permission-based opening.",
    "Open one conversation with permission.",
  ],
  [
    "Discovery",
    "DISCOVERY",
    "SPIN",
    "Use one situation question, then explore the problem and its impact.",
    "Where does that process cause extra work?",
    "Rehearse a problem question and listen before adding an implication question.",
    "Identify one explicit problem before demonstrating.",
  ],
  [
    "Qualification",
    "QUALIFICATION",
    "Sandler-inspired qualification",
    "Clarify problem, impact, authority, budget, timing and next step.",
    "Who else would need to evaluate this with you?",
    "Ask a decision-process question without assuming authority.",
    "Record known answers and leave unknowns unknown.",
  ],
  [
    "Presentation",
    "PRESENTATION",
    "Consultative",
    "Understand, diagnose, then recommend only a relevant verified capability.",
    "You mentioned this problem; may I show the relevant part?",
    "Practice a short recommendation tied to the customer’s words.",
    "Confirm need before showing a demo.",
  ],
  [
    "Value",
    "VALUE",
    "Challenger-inspired",
    "Offer a truthful perspective as a hypothesis, then check whether it fits.",
    "Could the handoff be more difficult than the task itself?",
    "Explain one possible process gap without invented numbers.",
    "Ask the customer to assess the relevance.",
  ],
  [
    "Objections",
    "OBJECTION",
    "LAER",
    "Listen, acknowledge, explore, then respond to the clarified concern.",
    "What are you comparing the investment with?",
    "Practice asking a clarifying question before defending price.",
    "Record what the objection meant after listening.",
  ],
  [
    "Negotiation",
    "NEGOTIATION",
    "Ethical negotiation",
    "Understand constraints; discuss only approved exchanges.",
    "What would need to change for this to make business sense?",
    "Mirror a key phrase, tentatively label the concern, then summarize it.",
    "Confirm a constraint before discussing an approved offer.",
  ],
  [
    "Closing",
    "CLOSING",
    "Ethical closing",
    "Choose a legitimate commitment that matches readiness.",
    "Would you like to proceed, or is there a concern to resolve first?",
    "Compare a direct close with a next-step invitation.",
    "Ask for the next suitable commitment without pressure.",
  ],
  [
    "Follow-Up",
    "FOLLOW_UP",
    "Purposeful follow-up",
    "Give every follow-up a specific objective.",
    "Which question should we resolve when we speak again?",
    "Practice a follow-up tied to an unresolved question.",
    "Agree a purpose, person and date.",
  ],
].map(([name, stage, framework, learn, example, practice, challenge]) => ({
  name,
  stage,
  framework,
  learn,
  example,
  practice,
  challenge,
}));
