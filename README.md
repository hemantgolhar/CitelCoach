# CitelCoach

Your Personal Sales Coach — a personal, offline-first React PWA. No account, backend, cloud database or AI API is used. All coaching content ships with the app.

## Run locally

Requires Node.js 20.19+ or a current supported LTS version and npm.

```powershell
cd "C:\Users\Ujwala Bhange\Documents\ChatGPT\CitelCoach"
npm install
npm run dev
```

Open the local address printed by Vite, normally http://localhost:5173.

## Build and preview the offline app

```powershell
npm run build
npm run preview
```

The production files are in `dist/`. Preview normally runs at http://localhost:4173. The service worker is enabled in production, not in the development server. Open the production app online once and allow its resources to cache before using it offline.

For Android installation, serve `dist/` from an HTTPS static host with SPA fallback to `index.html`, open it in Chrome and choose **Install app** / **Add to Home screen**. A plain HTTP LAN address is not a secure context for PWA installation. No backend is required to host static files. This project has not been published to a remote host.

## What is included

- Dashboard, six daily targets, XP history, five levels, visit-based streaks and daily technique.
- Live sales logging: sold, follow-up, rejected, owner absent; completed follow-ups linked to their originating meeting.
- Five product playbooks; sixteen branching objection scenarios; fifteen ethical sales frameworks.
- Ten-round objection battles with self-ratings, pitch variants, practice records and skill indicators.
- Motivation resets, seven-step meeting preparation, rejection recovery, timed sales sprints.
- Meeting reviews, lost-deal autopsies, conversion guidance, revenue-to-activity calculator.
- Mindset exercises, eight guided scripts, optional browser speech, identities, thought reframing, rejection counter, evidence bank, configurable morning ritual, evening debriefs and image-based vision board.
- Dark/light appearance, four coach personalities, JSON export, validated transactional replace/merge import, confirmed data deletion.
- Installable PWA manifest, local icons and Workbox precaching. Optional feature-detected browser agent tools for reading today's progress and opening Live Sales.

## Files and architecture

```text
src/
  main.jsx                 Entry point and error boundary
  App.jsx                  Shared layout and routing
  styles.css               Responsive dark/light interface
  components/UI.jsx        Reusable accessible controls
  components/AgentTools.jsx Optional browser agent actions
  data/content.js          Product, objection and coaching library
  db/database.js           IndexedDB, transactions, backup validation
  hooks/useStore.jsx       Shared data state and activity/XP recording
  utils/metrics.js         Aggregations, streaks and goal calculations
  pages/Home.jsx           Home dashboard
  pages/Coach.jsx          Products, objections, motivation, preparation
  pages/Practice.jsx       Pitch and objection practice
  pages/Live.jsx           Field sales logging
  pages/Progress.jsx       Analytics and skill indicators
  pages/More.jsx           Toolkit navigation
  pages/Planning.jsx       Goals, sprints, reviews, follow-ups, calculator
  pages/Mindset.jsx        Guided sessions, rituals and reflection
  pages/Settings.jsx       Preferences, installation and backups
public/                    Installable icons
tests/core.test.js          Data integrity and calculation tests
vite.config.js             Vite and PWA configuration
```

## Data rules

- IndexedDB stores: settings, dailyGoals, dailyStats, salesActivities, meetings, practiceSessions, skillScores, xpHistory, mindsetSessions, successEvidence, objectionPractice, pitchPractice, dailyDebriefs, visionBoard, salesExperiments.
- LocalStorage is used only for the appearance preference. Backups include the saved appearance preference in IndexedDB.
- Visits +10 XP, decision-maker conversations +15, demos +25, completed follow-ups +15, pitch/objection repetitions +10, successful sprints +30, sales +50, all daily goals reached +40 once per day.
- Scheduling a follow-up does not count as completing one. A completed follow-up does not count as a fresh visit.
- Meeting reviews and evening reflection totals do not duplicate activity or award sales XP.
- Level thresholds: 0, 500, 1,000, 1,500 and 2,000 XP. The streak defaults to five prospect visits per local calendar day; no sale is required.
- Merge uses record IDs and updated timestamps, retaining the newer matching record. Reimporting the same backup does not duplicate records or XP. Replacement is validated before any records are deleted and performed in one transaction.
- Browser origins have separate storage. The development and production-preview ports do not share records. Export/import can transfer them.

## Verification

```powershell
npm test
npm run build
```

Tests cover activity counting, streak continuity, calculator validation, backup round trips and merge idempotency, rejected replacement safety, and transactional rollback.

## Adaptive Home coaching

Home now leads with the sales-day scoreboard and Start/Continue Selling, then Next Mission, an evidence-based Coach card, secondary help tools, and historical stats. Decision makers are included alongside visits, demos, follow-ups, sales and revenue.

`src/services/coachEngine.js` is a pure offline service. `analyzeSales` accepts activity, reviews, goals, personality and a local calendar date; `selectPeriod` supports inclusive 1-, 7- and 30-day windows for future historical views. Only today's window is shown on Home. No AI service or machine learning is used.

Rules are evaluated in this order:

- Three or more due commitments with fewer than half completed: follow-up priority. Future appointments are excluded; linked completions clear the original commitment.
- At least five visits with half owner-absent, or under 40% decision-maker access across at least five explicitly recorded access outcomes: decision-maker access.
- No activity: start the day. Fewer than five real conversations: insufficient evidence for a skill diagnosis. Owner-absent outcomes do not count as real conversations.
- The same objection at least three times: practice that objection.
- At least two reviews skipping discovery, representing half the reviews: discovery practice.
- At least five decision-maker conversations and under 40% demos: review discovery and demonstration flow.
- At least three demos and under 20% sales: value when supported by repeated review evidence; otherwise closing as a hypothesis to test.
- Otherwise, act on due follow-ups or remaining visit targets. Meeting the visit target does not generate “prospect 11 of 10.”

Every result includes its evidence, recommendation, severity, next action and relevant practice. Personality changes wording while keeping the recommended action and evidence identical. Recommendations are hypotheses from activity ratios, not proven causes. Missing historical decision-maker flags are not treated as explicit failed access.

Database name, version and stores remain unchanged. Older daily goals receive missing defaults in memory; import accepts a missing decision-maker target and fills it on restore. Explicit zero targets and existing records are preserved. Tests include these compatibility cases.

## Coaching philosophy and Book Wisdom

The existing sales diagnosis engine remains responsible for bottlenecks. `philosophyEngine.js` selects one original behavioral principle; `coachPersonality.js` applies tone afterward without changing the principle, evidence or action. No external API, author impersonation, copied book text or guaranteed-outcome claims are used.

Available philosophies: CitelCoach Method (default), Limitless-inspired, Think and Grow Rich-inspired, Subconscious Mind-inspired, and Sales Psychology. Missing or unknown saved philosophy values safely use the default. Book Wisdom is inside Coach; browsing a philosophy does not change the saved setting. Individual principles include an overview, when to use them, an original exercise and a practice action.

Integrated surfaces: Home Coach, Motivate Me, Rejection Reset, post-rejection Live Sales, the final Pre-meeting Boost step, morning ritual and evening debrief. Identity Builder continues to save constructive statements tied to behaviors. Goal-related planning links to the existing Goal Calculator.

New additive storage fields, with no database version or store changes:

- `settings/preferences.philosophy`: the independent philosophy selection.
- `mindsetSessions` records with `type: "principle"`: date, selected and primary philosophy, principle, reason, context, action, rendered advice/evidence/personality, shown timestamp, activity IDs and stats when shown, completion boolean and timestamp, self-report marker, activity snapshot at completion, and optional outcome note.
- `dailyDebriefs`: `actualStats`, `todaysLesson`, and `tomorrowPlan` (target date, evidence date, lesson, one recommended principle/action, and a short visualization). Diagnosis uses logged activity, not edited reflection totals.

Repeated rendering of identical advice does not create duplicate records or reset DONE. Opening a tool never marks advice complete. DONE is explicitly self-reported and awards no sales activity or XP. The Book Wisdom history shows recorded activity after an intervention and optional outcome notes; this is observational, not evidence of causation. Morning uses a matching saved plan only on its intended date and while the selected philosophy remains the same, labeling yesterday's evidence clearly.

`npm test` includes philosophy routing, every catalog exercise, tone separation, exposure/completion idempotency, outcome association, legacy defaults, backup round trips and the evening/morning handoff in addition to the existing sales tests.

## Action results and coaching patterns

Progress now includes **Your Coaching Patterns**, **Coaching That Works for You**, detailed action streaks, a last-seven-days review, and an optional seven-day Decision-for-procrastination experiment. Home retains one main streak and offers a collapsed optional outcome prompt at least ten minutes after DONE. Feedback is also editable in Book Wisdom history.

`adviceEffectiveness.js` aggregates shown/completed advice, positive self-reported outcomes and optional usefulness ratings by philosophy, principle, problem, bottleneck and action type. Completion uses all shown recommendations; outcome rates use only completed recommendations with an outcome report; ratings use only supplied ratings (Not useful = 1 through Very useful = 4). Missing feedback is unknown, not negative. Reported demos and sales are feedback counts, not extra transactions. Relevant outcomes distinguish, for example, a sale after closing advice from merely completing a visit.

Comparisons require at least five exposures across three distinct dates for each group and two eligible groups. Personal bests use the same gate within their relevant context. CitelCoach Method may prefer an appropriate principle once it meets that sample threshold. It ranks completion first, then relevant outcomes (at least three reports per compared group), then usefulness (at least three ratings per group). Evidence must match the current problem and context and come from prior dates. If the last two recommendations repeated the winner, another appropriate, sufficiently sampled principle within 15 percentage points of its completion rate may be used for variety. Manual philosophy selection is preserved.

Behavior timing uses local calendar days. The first visible app opening is stored once per day; the first actual activity afterward determines time to first action. If older activity predates opening or no opening was observed, delay is unknown. Three measured days in the last seven with a delay over twenty minutes support a starting-focused recommendation. Recovery ends at the next same-day prospect visit after rejection; overnight gaps and unobserved recoveries are excluded. Rest is not penalized with claims about ability. Sales Day, First-Action, Practice, Follow-Up and Recovery streaks use recorded completed behavior, never app openings or DONE alone. Cue/routine/reward guidance uses existing activity XP; it adds no automatic bonus or new philosophy.

Additive storage (same database version and stores):

- Principle records in `mindsetSessions`: optional top-level bottleneck/problem/action type, outcome, usefulness, notes, feedback/dismissal timestamps, same-completion-day activity snapshot and IDs after completion, observation window, and experiment ID. Existing shown/completed timestamps and snapshots remain intact.
- `settings`: `sales-day:YYYY-MM-DD` records containing the first observed visible opening timestamp.
- `salesExperiments`: `type: "coachingExperiment"` with start/end dates, target problem, existing principle, prior-seven-day baseline, and optional early-stop timestamp. The experiment is applied only to procrastination advice under CitelCoach Method. Tagged exposures and completion are counted, and activity is compared descriptively after seven days; incomplete or stopped periods are labeled.

Feedback never creates a sale, visit, XP or proof that the recommendation worked. Activity after advice is observational and may overlap other influences. Existing backups without these fields remain compatible.

## Practical limits

- Product messaging is editable coaching copy based on the supplied names, not verified product specifications. Confirm prices, capabilities, compatibility and support before making claims.
- Skill indicators use self-ratings and process checklists. Funnel percentages are activity ratios, not customer cohort attribution. Low data volume limits recommendations.
- Guided voice playback depends on installed browser/device voices; text scripts remain available offline. There is no audio recording or automated pitch scoring.
- Android installation and device-specific offline voice behavior still need a real-device check after HTTPS hosting. Local browser verification is not an Android install test.
- Follow-ups are an in-app list; V1 does not send background reminders. Browser data can be cleared or evicted; export backups regularly.
- No remote deployment or synchronization is included. Your data stays on the device unless you export it yourself.
