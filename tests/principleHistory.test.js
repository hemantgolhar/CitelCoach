import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { all, clear, backup, restore, put } from "../src/db/database.js";
import {
  recordAdviceShown,
  completePrinciple,
  savePrincipleOutcome,
  subsequentActivity,
} from "../src/services/principleHistory.js";
import { selectPhilosophy } from "../src/services/philosophyEngine.js";
import { analyzeSales } from "../src/services/coachEngine.js";
const date = "2026-09-03",
  now = "2026-09-03T09:00:00.000Z";
const advice = selectPhilosophy({
  analysis: analyzeSales({ date }),
  context: "home",
});
test("exposure is idempotent, starts incomplete, and awards no sales or XP", async () => {
  await clear();
  const records = await Promise.all([
    recordAdviceShown(advice, { now }),
    recordAdviceShown(advice, { now }),
  ]);
  assert.equal(records[0].id, records[1].id);
  assert.equal((await all("mindsetSessions")).length, 1);
  assert.equal(records[0].completed, false);
  assert.equal((await all("xpHistory")).length, 0);
  assert.equal((await all("salesActivities")).length, 0);
});
test("DONE is persistent self-report; rerender and repeated completion preserve timestamp", async () => {
  await clear();
  const shown = await recordAdviceShown(advice, { now });
  const time = "2026-09-03T09:05:00.000Z";
  const done = await completePrinciple(shown.id, { now: time });
  assert.equal(done.completed, true);
  assert.equal(done.completionSource, "self-report");
  assert.equal((await recordAdviceShown(advice, { now })).completed, true);
  assert.equal((await completePrinciple(shown.id)).completedAt, time);
  assert.equal((await all("xpHistory")).length, 0);
});
test("completion and later outcomes preserve observational activity association", async () => {
  await clear();
  const before = {
    id: "before",
    createdAt: "2026-09-03T08:59:00.000Z",
    day: date,
    kind: "meeting",
    outcome: "REJECTED",
  };
  const after = {
    id: "after",
    createdAt: "2026-09-03T09:04:00.000Z",
    day: date,
    kind: "meeting",
    outcome: "SOLD",
    value: 500,
  };
  const shown = await recordAdviceShown(advice, { activities: [before], now });
  assert.deepEqual(subsequentActivity(shown, [before, after]), [after]);
  const done = await completePrinciple(shown.id, {
    activities: [before, after],
    now: "2026-09-03T09:05:00.000Z",
  });
  assert.equal(done.statsAtCompletion.sales, 1);
  assert.deepEqual(done.activityIdsAtCompletion, ["after"]);
  await savePrincipleOutcome(
    shown.id,
    "Asked clearly; customer wanted a follow-up.",
  );
  assert.equal(
    (await all("mindsetSessions"))[0].outcomeNote,
    "Asked clearly; customer wanted a follow-up.",
  );
});
test("cannot complete unshown advice", async () => {
  await assert.rejects(completePrinciple("missing"), /not been recorded/);
});
test("backup round trip preserves old sessions and new completed principle history", async () => {
  await clear();
  await put("mindsetSessions", {
    id: "old",
    title: "Guided confidence",
    day: date,
  });
  await put("settings", { id: "preferences", personality: "Tough" });
  const shown = await recordAdviceShown(advice, { now });
  await completePrinciple(shown.id, { now });
  const exported = await backup();
  await clear();
  await restore(exported, true);
  await restore(exported, false);
  assert.equal((await all("mindsetSessions")).length, 2);
  assert.equal(
    (await all("mindsetSessions")).find((r) => r.id === shown.id).completed,
    true,
  );
  assert.equal((await all("settings"))[0].personality, "Tough");
});
