# Practical philosophy extension

Completed September 3, 2026. Existing application extended in place.

## Files created

- src/data/practicalPhilosophies.js — three catalogs with original behavioral exercises.
- src/services/practicalBehavior.js — evidence signals, frog detector, minimum-day completion and streaks, weekly observations.
- src/services/focusBlocks.js — persistent focus sessions, relevant activity attribution, idempotent completion reward.
- src/pages/BehaviorTools.jsx — focus blocks, minimum days, habit stacks, frog page and compact Home suggestion.
- tests/practicalBehavior.test.js — 14 additional tests.
- PRACTICAL-PHILOSOPHIES.md — this report.

## Files changed

- src/data/philosophies.js
- src/services/philosophyEngine.js
- src/services/adaptivePhilosophy.js
- src/services/behaviorMetrics.js
- src/services/coachingReview.js
- src/hooks/usePhilosophy.js
- src/db/database.js
- src/App.jsx
- src/styles.css
- src/pages/More.jsx
- src/pages/Home.jsx
- src/pages/Mindset.jsx
- src/pages/Progress.jsx
- src/pages/Practice.jsx
- src/pages/Live.jsx
- src/pages/CoachingPatterns.jsx

Production files in dist were regenerated. Book Wisdom and Settings consume the existing catalog dynamically and therefore include the additions without page-specific changes.

## Philosophies and routing

- Atomic Habits-inspired: identity, cue, obvious, attractive, easy, satisfying, reduce friction, habit stacking, small improvements and never miss twice.
- Eat That Frog-inspired: highest-value work, prioritization, avoidance, early starts, breaking tasks down and execution.
- Deep Work-inspired: distraction-free work, defined sessions, single-tasking, deliberate practice, concentration, shutdown and review.

Combined coaching uses measured starting delays, missed saved targets, repeated incomplete procrastination advice, inconsistent activity, overdue commitments, practice without field activity, repeated reported distractions and low practice ratings. Manual philosophy preferences remain authoritative. Relevant historical follow-through can override the default once existing sample thresholds are met; existing experiments remain supported.

The frog detector ranks oldest overdue commitments first, then high-priority scheduled work, practice without field action, repeatedly incomplete recommendations, supported funnel bottlenecks, observed first-action delays and unmet visit goals. Reasons and estimated effort are visible. High scheduled priority can be recorded in Live Sales.

## Behavior features

- More contains Today’s Frog, Focus Sales Block, Minimum Sales Day and Habit Stacks.
- Focus sessions support 25, 45, 60 and 90 minutes and five focus types. Unrelated navigation is hidden during a block. Saved sessions survive reload. Ending records planned versus completed activity, elapsed time, distractions, result and lesson.
- Starting a timer earns no XP. Meeting the recorded activity target earns 10 XP once; existing activity rewards remain intact. Partial sessions save without bonus XP.
- Habit stacks can be created, edited, enabled and disabled and appear in Morning Ritual.
- Minimum days snapshot configurable targets when started. Only real logged activity can complete them and contribute to the sales-day streak. Changing defaults does not alter already started days.
- Home shows at most one additional relevant card.
- Weekly Review includes observed consistency, repeatedly incomplete activity, best focus block, average first-action time and minimum-day usage. A repeat association between successful follow-up blocks and activity can support the single weekly recommendation; it is not described as causal.

## Storage

No database version or store migration. Habit stacks and minimum configurations/day snapshots use settings. Focus blocks use salesExperiments. Existing philosophy exposure and outcome history remain in mindsetSessions. Backup validation accepts and checks new records; legacy backups remain compatible. No background notification or phone/app monitoring was added.

## Verification

- All 74 tests passed, including the previous 60 and 14 new tests.
- Final npm run build passed; PWA service worker and offline precache generated successfully.
- Browser verification: focus setup, pitch-only controls, hidden unrelated navigation, return-to-review, partial completion and navigation restoration.
- Browser check used a separate local preview origin (localhost:5175), recording one explicitly labeled verification block with no practice activity or XP.
