# Sales Mastery Engine — implementation report

Completed September 3, 2026. The existing app was extended in place. No new general self-help philosophy, database version, dependency or external service was introduced.

## 1. Files created

- `src/services/salesMasteryEngine.js` — conversation stages, qualification, deal quality, framework selection, objections, negotiation, closing, follow-ups, micro-commitments, instant help and autopsy rules.
- `src/services/salesMasteryTracking.js` — framework history integration, pipeline counts and separate field/practice/outcome signals.
- `src/services/salesRoleplay.js` — offline scenarios, customer personalities, difficulty and structured response assessment.
- `src/data/salesPlaybooks.js` — five product playbooks and ten concise mastery lessons.
- `src/components/SalesMastery.jsx` — short advice, Live Sales help and explicit observation fields.
- `src/pages/SalesMastery.jsx` — practice library, roleplay, product playbooks, conversation coach, autopsy and progress/history views.
- `tests/salesMastery.test.js` — 36 new tests.
- `SALES-MASTERY-REPORT.md` — this report.

## 2. Files changed

- `src/App.jsx` — remount Live Sales when its selected follow-up or conversation changes.
- `src/db/database.js` — validate new optional records and fields; accept calls alongside meetings and follow-ups.
- `src/hooks/useStore.jsx` — apply the normal prospecting reward to calls.
- `src/services/principleHistory.js` — retain sales domain, framework, stage and conversation identifiers in existing advice records.
- `src/services/adaptivePhilosophy.js` — keep sales-method history separate from general philosophy adaptation.
- `src/services/coachingReview.js` — keep philosophy review aggregation separate from sales-framework history.
- `src/services/focusBlocks.js` — count calls as prospecting work without treating them as visits.
- `src/services/behaviorMetrics.js` — include recorded calls in first-action timing.
- `src/pages/Home.jsx` — sales intervention first; mindset and behavior support remain available separately.
- `src/pages/Coach.jsx` — upgraded product playbooks and branching objection diagnosis.
- `src/pages/Practice.jsx` — Sales Mastery tab alongside the existing pitch and objection practice.
- `src/pages/More.jsx` — guided Conversation Coach.
- `src/pages/Planning.jsx` — purposeful follow-ups, conversation observations and early-stopping autopsy.
- `src/pages/Live.jsx` — Help Me Now, channel, observed facts, qualification/deal quality and recommendation/result links.
- `src/pages/Progress.jsx` — real-behavior mastery signals; old practice self-ratings are explicitly labeled.
- `src/pages/BookWisdom.jsx` — philosophy history stays separate from sales-method records.
- `src/pages/CoachingPatterns.jsx` — philosophy pattern reports remain separate from sales-framework results.

Production assets, the service worker and offline precache in `dist` were regenerated.

## 3. Sales frameworks implemented

- Nineteen standardized conversation stages.
- SPIN-style situation, problem, implication and need questions, with a limit on repeated situation questions.
- Consultative understand–diagnose–recommend routing. Unknown or insufficient need blocks presentation/closing advice and returns to discovery.
- Sandler-inspired qualification coverage: problem, impact, decision maker, budget, timing and next step. Scores describe recorded answers, not purchase probability.
- Challenger-inspired truthful process perspectives when discovery has not established a perceived problem.
- Disciplined prospecting: five attempts when the pipeline lacks conversations, with links to Focus Blocks, Minimum Day, Today’s Frog and the existing calculator.
- LAER: listening and exploration before responding, eleven tentative objection classifications and branches based on the clarified constraint.
- Ethical negotiation: active listening, mirroring, tentative labeling, summarizing, open questions and only verified approved exchanges.
- Six ethical closes: trial, summary, direct, alternative, next-step and consent-based assumptive next step.
- Micro-commitments and eight purpose-specific follow-up objectives.

Selling methodology is a separate engine from general mindset philosophy. Coach personality changes the coaching phrasing, not the selected selling method or question.

## 4. Product playbook upgrades

Aura Smart Business Card, Google Review Card, Smart Menu, Citeltech POS and Citelflow.ai each have product-specific SPIN questions, qualification questions, relevant value and demo guidance, objection diagnosis, closing questions, follow-up strategy and bad-fit indicators. Existing product content remains available.

Unknown capabilities, compatibility, prices, integrations, support and offers are explicitly marked `VERIFY PRODUCT CLAIM`. No performance statistics or new capabilities were invented.

## 5. Live Sales and practice integrations

- HELP ME NOW contains all eight requested situations and returns a short response, question and action.
- A clarified objection changes the response; its meaning is not assumed from the first statement.
- Conversation facts remain optional and unknown until explicitly recorded.
- Visit and Call channels are distinct. Calls count as prospecting attempts and focus work, not visits or minimum-day visit credit.
- Follow-ups store a specific purpose and show the next objective in the pending list.
- Guided Conversation Coach supports product/customer selection, eight steps, saved local drafts and transfer to Live Sales for the actual result. Advancing a screen does not log a visit or prove a customer need.
- Deal Autopsy asks one question at a time and stops at the first missing step, with matching practice and a field challenge.
- Sales Mastery in Practice contains ten concise Learn / Example / Practice / Field Challenge sections.
- Offline roleplay supports eight customer personalities and four difficulty settings. Easy includes a hint; Hard/Expert require a self-review rationale and introduce additional constraints. Choice scoring rewards listening and qualification. Written reasoning is saved, not automatically graded.

## 6. Tracking and storage

The database remains version 1 with the same stores.

- Sales activities may include `kind: call`, `channel`, `observations`, `conversationId`, `conversationStage`, `framework`, `masteryAdviceId`, qualification/deal-quality snapshots and `followUpPurpose`.
- Observations include problem, impact, authority, need, value, budget, timing, next step, discovery, objection diagnosis/handling, negotiation and appropriate commitment behavior. Optional readiness, verified options, approved trade and customer objection text support the relevant branches.
- Existing `mindsetSessions` advice records retain `type: principle` for compatibility and add `domain: sales`, `framework`, `stage` and `conversationId`. Existing idempotent exposure, completion and optional outcome-feedback functions are reused.
- Guided drafts use `settings` with type `salesConversation`; autopsies use `salesExperiments` with type `masteryAutopsy`; mastery practice and roleplay use `practiceSessions`.
- Framework outcomes are visible in Progress. Completion is self-report; outcomes and linked activity remain separate. Historical observations describe association, not causation.
- Practice alone never produces a field-skill percentage. Field percentages require explicit observations; legacy self-ratings remain visibly separate.
- Backup validation supports these additions and preserves legacy records. No migration or clearing of existing data was performed.

## 7. Tests

All **110 tests passed**: the previous 74 plus 36 new tests covering stage detection, product SPIN sets, discovery safeguards, qualification, Challenger, prospecting, eleven objection types, LAER branches, negotiation, six closes, micro-commitments, follow-ups, deal quality, early stopping, personality/philosophy separation, practice-versus-field scoring, calls, focus integration, roleplay, history persistence and backup compatibility.

Browser checks on the separate local preview origin verified short Live Sales help, branch changes after clarification, guided progress saving, autopsy stopping at Discovery after two answers, and the matching practice destination. Preview records were labeled as test conversation notes; no actual sales activity was created by these UI checks.

## 8. Build

Final `npm run build` passed. The PWA service worker and offline precache were generated successfully. The application continues to work without a remote coaching service.
