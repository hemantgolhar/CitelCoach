import test from "node:test";
import assert from "node:assert/strict";
import "fake-indexeddb/auto";
import { metrics, streaks, calculate, dayKey } from "../src/utils/metrics.js";
import {
  backup,
  restore,
  clear,
  put,
  all,
  validateBackup,
  atomic,
} from "../src/db/database.js";
test("scheduled follow-ups are not completed activity; follow-up sales do not add another visit", () => {
  const m = metrics([
    { kind: "meeting", outcome: "FOLLOW-UP", decisionMaker: true, demo: true },
    { kind: "followup", outcome: "SOLD", value: 2500 },
  ]);
  assert.deepEqual(m, {
    visits: 1,
    decisionMakers: 1,
    demos: 1,
    followUps: 1,
    sales: 1,
    revenue: 2500,
  });
});
test("streaks allow today to be unfinished and never require sales", () => {
  const rows = [];
  for (const day of ["2026-09-01", "2026-09-02"])
    for (let i = 0; i < 5; i++)
      rows.push({ kind: "meeting", day, outcome: "REJECTED" });
  assert.deepEqual(streaks(rows, 5, new Date("2026-09-03T12:00:00")), {
    current: 2,
    best: 2,
  });
  assert.deepEqual(streaks(rows, 5, new Date("2026-09-04T12:00:00")), {
    current: 0,
    best: 2,
  });
});
test("goal calculator rounds funnel requirements and rejects invalid rates", () => {
  assert.deepEqual(calculate(100000, 5000, 20, 50, 50, 20), {
    sales: 20,
    demos: 100,
    decisionMakers: 200,
    visits: 400,
    days: 20,
  });
  assert.equal(calculate(10000, 1000, 0, 50, 50, 20), null);
  assert.equal(calculate(10000, 1000, 101, 50, 50, 20), null);
});
test("backup restore merge is idempotent and invalid replacement preserves data", async () => {
  await clear();
  await put("successEvidence", {
    id: "win",
    text: "First conversation",
    updatedAt: "2026-09-01",
  });
  const exported = await backup();
  assert.equal(exported.data.successEvidence.length, 1);
  await restore(exported, false);
  await restore(exported, false);
  assert.equal((await all("successEvidence")).length, 1);
  await assert.rejects(restore({ app: "Other" }, true));
  assert.equal((await all("successEvidence")).length, 1);
  await put("successEvidence", { id: "extra", text: "Second" });
  await restore(exported, true);
  assert.equal((await all("successEvidence")).length, 1);
});
test("atomic writes roll back on an invalid record", async () => {
  await clear();
  await assert.rejects(
    atomic([
      ["xpHistory", { id: "xp", amount: 10 }],
      ["meetings", { outcome: "SOLD" }],
    ]),
  );
  assert.equal((await all("xpHistory")).length, 0);
});
test("backup requires all stores and valid record IDs", () => {
  assert.throws(() =>
    validateBackup({ app: "CitelCoach", version: 1, data: {} }),
  );
});
test("legacy backup missing decision-maker target restores without losing other data", async () => {
  await clear();
  await put("successEvidence", { id: "preserved", text: "Keep my progress" });
  const b = await backup();
  b.data.dailyGoals.push({
    id: "2026-09-03",
    visits: 10,
    demos: 3,
    followUps: 2,
    sales: 1,
    revenue: 5000,
  });
  await restore(b, false);
  assert.equal((await all("dailyGoals"))[0].decisionMakers, 5);
  assert.equal((await all("successEvidence"))[0].text, "Keep my progress");
});
