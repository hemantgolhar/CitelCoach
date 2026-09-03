import { openDB } from "idb";
import { normalizeGoals } from "../utils/metrics.js";
import {
  SALES_STAGES,
  FOLLOW_UP_PURPOSES,
  OBSERVATIONS,
  OBJECTION_TYPES,
  objectionBranches,
} from "../services/salesMasteryEngine.js";
export const stores = [
  "settings",
  "dailyGoals",
  "dailyStats",
  "salesActivities",
  "meetings",
  "practiceSessions",
  "skillScores",
  "xpHistory",
  "mindsetSessions",
  "successEvidence",
  "objectionPractice",
  "pitchPractice",
  "dailyDebriefs",
  "visionBoard",
  "salesExperiments",
];
let promise;
export const db = () =>
  (promise ??= openDB("citelcoach", 1, {
    upgrade(d) {
      stores.forEach((s) => d.createObjectStore(s, { keyPath: "id" }));
    },
  }));
export const all = async (s) => (await db()).getAll(s);
export const put = async (s, value) => {
  const now = new Date().toISOString();
  const row = {
    ...value,
    id: value.id || crypto.randomUUID(),
    createdAt: value.createdAt || now,
    updatedAt: now,
  };
  await (await db()).put(s, row);
  return row;
};
export async function backup() {
  const d = await db();
  const tx = d.transaction(stores);
  const data = {};
  for (const s of stores) data[s] = await tx.objectStore(s).getAll();
  await tx.done;
  return {
    app: "CitelCoach",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}
export function validateBackup(b) {
  if (b?.app !== "CitelCoach" || b.version !== 1 || !b.data)
    throw Error("Choose a valid CitelCoach version 1 backup.");
  const fail = (s) => {
    throw Error("Invalid record in " + s);
  };
  for (const s of stores) {
    if (!Array.isArray(b.data[s])) throw Error("Missing data: " + s);
    const ids = new Set();
    for (const r of b.data[s]) {
      if (
        !r ||
        typeof r !== "object" ||
        typeof r.id !== "string" ||
        !r.id ||
        ids.has(r.id)
      )
        fail(s);
      ids.add(r.id);
      for (const key of [
        "title",
        "text",
        "notes",
        "reason",
        "product",
        "customer",
        "day",
        "outcome",
        "objection",
        "action",
        "image",
        "updatedAt",
        "createdAt",
        "followUpDate",
        "failure",
        "type",
        "thought",
        "response",
        "recommendation",
        "lesson",
        "win",
        "mistake",
      ])
        if (r[key] != null && typeof r[key] !== "string") fail(s);
      if (s === "xpHistory" && (!Number.isFinite(r.amount) || r.amount < 0))
        fail(s);
      if (
        s === "settings" &&
        ["minimumConfig", "minimumDay"].includes(r.type)
      ) {
        if (
          !r.goals ||
          ["visits", "decisionMakers", "demos", "followUps"].some(
            (k) =>
              !Number.isInteger(r.goals[k]) ||
              r.goals[k] < 0 ||
              r.goals[k] > 1000,
          ) ||
          r.goals.visits + r.goals.followUps < 1
        )
          fail(s);
        if (
          r.type === "minimumDay" &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(r.day || "") ||
            r.id !== "minimum-day:" + r.day)
        )
          fail(s);
      }
      if (
        s === "settings" &&
        r.type === "habitStack" &&
        (typeof r.cue !== "string" ||
          !r.cue.trim() ||
          typeof r.enabled !== "boolean" ||
          !Array.isArray(r.steps) ||
          !r.steps.length ||
          r.steps.some((x) => typeof x !== "string" || !x.trim()))
      )
        fail(s);
      if (s === "salesExperiments" && r.type === "focusBlock") {
        if (
          ![
            "Prospecting",
            "Follow-ups",
            "Pitch practice",
            "Objection practice",
            "Sales review",
          ].includes(r.focusType) ||
          ![25, 45, 60, 90].includes(r.duration) ||
          !Number.isInteger(r.planned) ||
          r.planned < 1 ||
          r.planned > 1000 ||
          !Number.isFinite(Date.parse(r.startedAt)) ||
          !Array.isArray(r.baselineIds) ||
          r.baselineIds.some((x) => typeof x !== "string")
        )
          fail(s);
        if (
          r.endedAt &&
          (!Number.isFinite(Date.parse(r.endedAt)) ||
            Date.parse(r.endedAt) < Date.parse(r.startedAt) ||
            !Number.isInteger(r.completed) ||
            r.completed < 0 ||
            !Number.isFinite(r.actualMinutes) ||
            r.actualMinutes < 0 ||
            !Number.isInteger(r.distractions) ||
            r.distractions < 0 ||
            typeof r.outcome !== "string" ||
            typeof r.notes !== "string" ||
            !Array.isArray(r.activityIds))
        )
          fail(s);
      }
      if (
        s === "salesActivities" &&
        (!["meeting", "followup", "call"].includes(r.kind) ||
          !["SOLD", "FOLLOW-UP", "REJECTED", "OWNER ABSENT"].includes(
            r.outcome,
          ) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(r.day) ||
          (r.value != null && (!Number.isFinite(r.value) || r.value < 0)))
      )
        fail(s);
      if (r.observations != null) {
        if (typeof r.observations !== "object" || Array.isArray(r.observations))
          fail(s);
        for (const k of ["approvedTrade", "objectionText"])
          if (
            r.observations[k] != null &&
            typeof r.observations[k] !== "string"
          )
            fail(s);
        if (
          r.observations.benefitsConfirmed != null &&
          (!Number.isFinite(r.observations.benefitsConfirmed) ||
            r.observations.benefitsConfirmed < 0 ||
            r.observations.benefitsConfirmed > 20)
        )
          fail(s);
        if (
          r.observations.verifiedOptions != null &&
          (!Array.isArray(r.observations.verifiedOptions) ||
            r.observations.verifiedOptions.length > 2 ||
            r.observations.verifiedOptions.some((v) => typeof v !== "string"))
        )
          fail(s);
        for (const k of [
          ...Object.keys(OBSERVATIONS),
          "demo",
          "interested",
          "notReady",
          "consentNextStep",
        ])
          if (
            r.observations[k] != null &&
            typeof r.observations[k] !== "boolean"
          )
            fail(s);
        if (
          r.observations.stage != null &&
          !SALES_STAGES.includes(r.observations.stage)
        )
          fail(s);
        if (
          r.observations.objectionType != null &&
          !OBJECTION_TYPES.includes(r.observations.objectionType)
        )
          fail(s);
        if (
          r.observations.objectionBranch != null &&
          !objectionBranches.includes(r.observations.objectionBranch)
        )
          fail(s);
      }
      if (
        r.followUpPurpose != null &&
        !FOLLOW_UP_PURPOSES.includes(r.followUpPurpose)
      )
        fail(s);
      if (
        r.conversationStage != null &&
        !SALES_STAGES.includes(r.conversationStage)
      )
        fail(s);
      if (r.channel != null && !["Visit", "Call"].includes(r.channel)) fail(s);
      if (
        s === "mindsetSessions" &&
        r.domain === "sales" &&
        (r.type !== "principle" ||
          typeof r.framework !== "string" ||
          !SALES_STAGES.includes(r.stage))
      )
        fail(s);
      if (
        s === "settings" &&
        r.type === "salesConversation" &&
        (!Number.isInteger(r.index) ||
          r.index < 0 ||
          r.index > 7 ||
          typeof r.product !== "string" ||
          !SALES_STAGES.includes(r.stage) ||
          !r.observations)
      )
        fail(s);
      if (
        s === "salesExperiments" &&
        r.type === "masteryAutopsy" &&
        (!SALES_STAGES.includes(r.stage) ||
          !r.answers ||
          typeof r.answers !== "object" ||
          Object.values(r.answers).some((v) => typeof v !== "boolean"))
      )
        fail(s);
      if (
        s === "practiceSessions" &&
        r.type === "salesRoleplay" &&
        (!Array.isArray(r.results) ||
          r.results.some(
            (x) => !SALES_STAGES.includes(x.stage) || ![0, 1].includes(x.score),
          ) ||
          !Number.isInteger(r.score) ||
          r.score < 0)
      )
        fail(s);
      if (
        s === "practiceSessions" &&
        r.type === "salesMasteryPractice" &&
        (!SALES_STAGES.includes(r.stage) ||
          typeof r.framework !== "string" ||
          typeof r.completed !== "boolean")
      )
        fail(s);
      if (
        s === "dailyGoals" &&
        [
          "visits",
          "decisionMakers",
          "demos",
          "followUps",
          "sales",
          "revenue",
        ].some((k) =>
          k === "decisionMakers" && r[k] == null
            ? false
            : !Number.isFinite(r[k]) || r[k] < 0,
        )
      )
        fail(s);
      if (s === "objectionPractice" && ![0, 1, 2].includes(r.rating)) fail(s);
      if (
        s === "mindsetSessions" &&
        r.type === "principle" &&
        ((r.usefulness != null &&
          !["Very useful", "Useful", "Neutral", "Not useful"].includes(
            r.usefulness,
          )) ||
          (r.outcome != null &&
            ![
              "Completed visit",
              "Reached decision maker",
              "Got demo",
              "Follow-up created",
              "Sale",
              "Rejected",
              "No meaningful result",
            ].includes(r.outcome)))
      )
        fail(s);
      if (
        s === "settings" &&
        r.type === "salesDay" &&
        (!Number.isFinite(Date.parse(r.startedAt)) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(r.day || ""))
      )
        fail(s);
      if (
        s === "salesExperiments" &&
        r.type === "coachingExperiment" &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(r.startDay || "") ||
          !/^\d{4}-\d{2}-\d{2}$/.test(r.endDay || "") ||
          !Number.isFinite(Date.parse(r.startedAt)) ||
          !r.baseline ||
          [
            "visits",
            "decisionMakers",
            "demos",
            "followUps",
            "sales",
            "revenue",
          ].some((k) => !Number.isFinite(r.baseline[k]) || r.baseline[k] < 0))
      )
        fail(s);
      if (s === "mindsetSessions" && r.type === "principle") {
        if (
          typeof r.completed !== "boolean" ||
          !r.advice ||
          typeof r.advice.insight !== "string" ||
          typeof r.action !== "string" ||
          typeof r.principle !== "string" ||
          !Array.isArray(r.advice.evidence) ||
          r.advice.evidence.some((e) => typeof e !== "string") ||
          typeof r.shownAt !== "string" ||
          !Array.isArray(r.activityIdsAtShown) ||
          !r.actionPath?.startsWith("/") ||
          r.actionPath.startsWith("//")
        )
          fail(s);
      }
      if (s === "dailyDebriefs" && r.tomorrowPlan != null) {
        const plan = r.tomorrowPlan;
        if (
          plan.version !== 1 ||
          typeof plan.forDate !== "string" ||
          typeof plan.basedOnDate !== "string" ||
          !Array.isArray(plan.evidence) ||
          plan.evidence.some((e) => typeof e !== "string") ||
          !plan.advice ||
          typeof plan.advice.action !== "string" ||
          typeof plan.advice.actionPath !== "string" ||
          !plan.advice.actionPath.startsWith("/") ||
          plan.advice.actionPath.startsWith("//")
        )
          fail(s);
      }
      if (
        s === "pitchPractice" &&
        !["Practiced", "Confident", "Needs Work"].includes(r.rating)
      )
        fail(s);
      if (
        s === "settings" &&
        r.id === "identity" &&
        (!Array.isArray(r.statements) ||
          r.statements.some(
            (x) =>
              !x || typeof x.text !== "string" || typeof x.action !== "string",
          ))
      )
        fail(s);
      if (
        s === "settings" &&
        r.id === "ritual" &&
        (!Array.isArray(r.items) || r.items.some((x) => typeof x !== "string"))
      )
        fail(s);
      if (
        s === "settings" &&
        r.id === "preferences" &&
        ((r.streakMinimum != null &&
          (!Number.isInteger(r.streakMinimum) || r.streakMinimum < 1)) ||
          (r.theme != null && !["dark", "light"].includes(r.theme)))
      )
        fail(s);
      if (
        r.checked != null &&
        (!Array.isArray(r.checked) ||
          r.checked.some((x) => typeof x !== "string"))
      )
        fail(s);
      if (
        s === "salesExperiments" &&
        r.type === "sprint" &&
        (!r.goals ||
          ["visits", "decisionMakers", "demos"].some(
            (k) => !Number.isFinite(r.goals[k]) || r.goals[k] < 1,
          ) ||
          !Number.isFinite(Date.parse(r.startedAt)) ||
          !Number.isFinite(Date.parse(r.endsAt)))
      )
        fail(s);
      if (
        s === "visionBoard" &&
        r.image &&
        !/^data:image\/(png|jpeg|webp);base64,/.test(r.image)
      )
        fail(s);
    }
  }
  return b;
}
export async function restore(b, replace) {
  validateBackup(b);
  const d = await db();
  const tx = d.transaction(stores, "readwrite");
  try {
    for (const s of stores) {
      const store = tx.objectStore(s);
      if (replace) await store.clear();
      for (const row of b.data[s]) {
        const old = replace ? null : await store.get(row.id);
        if (!old || String(row.updatedAt) > String(old.updatedAt))
          await store.put(s === "dailyGoals" ? normalizeGoals(row) : row);
      }
    }
    await tx.done;
  } catch (error) {
    try {
      tx.abort();
    } catch {}
    await tx.done.catch(() => {});
    throw error;
  }
}
export async function clear() {
  const tx = (await db()).transaction(stores, "readwrite");
  await Promise.all(stores.map((s) => tx.objectStore(s).clear()));
  await tx.done;
}
export async function atomic(rows) {
  const names = [...new Set(rows.map((r) => r[0]))];
  const tx = (await db()).transaction(names, "readwrite");
  try {
    for (const [s, row] of rows) await tx.objectStore(s).put(row);
    await tx.done;
  } catch (error) {
    try {
      tx.abort();
    } catch {}
    await tx.done.catch(() => {});
    throw error;
  }
}
