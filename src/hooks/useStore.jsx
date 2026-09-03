import React, { createContext, useContext, useEffect, useState } from "react";
import { all, put, atomic, stores } from "../db/database";
import { dayKey, metrics, defaults, normalizeGoals } from "../utils/metrics";
const Context = createContext();
export function StoreProvider({ children }) {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  async function refresh() {
    const rows = await Promise.all(stores.map(all));
    setData(
      Object.fromEntries(
        stores.map((s, i) => [
          s,
          s === "dailyGoals" ? rows[i].map(normalizeGoals) : rows[i],
        ]),
      ),
    );
  }
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);
  async function save(s, row, xp = 0) {
    const now = new Date().toISOString(),
      record = {
        ...row,
        id: row.id || crypto.randomUUID(),
        day: row.day || dayKey(),
        createdAt: row.createdAt || now,
        updatedAt: now,
      };
    const writes = [[s, record]];
    if (xp)
      writes.push([
        "xpHistory",
        {
          id: s + ":" + record.id,
          amount: xp,
          reason: row.title || s,
          day: dayKey(),
          createdAt: now,
          updatedAt: now,
        },
      ]);
    await atomic(writes);
    await refresh();
    return record;
  }
  async function meeting(row) {
    const now = new Date().toISOString(),
      id = crypto.randomUUID();
    const record = {
      ...row,
      id,
      kind: row.kind || "meeting",
      day: dayKey(),
      createdAt: now,
      updatedAt: now,
    };
    const xp =
      (record.kind === "followup" ? 15 : 10) +
      (row.decisionMaker ? 15 : 0) +
      (row.demo ? 25 : 0) +
      (row.outcome === "SOLD" ? 50 : 0);
    const activity = [...data.salesActivities, record],
      today = metrics(activity.filter((a) => a.day === dayKey())),
      goal = data.dailyGoals.find((g) => g.id === dayKey()) || defaults;
    const writes = [
      ["salesActivities", record],
      ["meetings", record],
      [
        "dailyStats",
        { id: dayKey(), ...today, createdAt: now, updatedAt: now },
      ],
      [
        "xpHistory",
        {
          id: "meeting:" + id,
          amount: xp,
          reason: row.outcome,
          day: dayKey(),
          createdAt: now,
          updatedAt: now,
        },
      ],
    ];
    if (
      Object.keys(defaults).every((k) => today[k] >= goal[k]) &&
      !data.xpHistory.some((x) => x.id === "goal:" + dayKey())
    )
      writes.push([
        "xpHistory",
        {
          id: "goal:" + dayKey(),
          amount: 40,
          reason: "Daily targets complete",
          day: dayKey(),
          createdAt: now,
          updatedAt: now,
        },
      ]);
    await atomic(writes);
    await refresh();
    return record;
  }
  if (error)
    return (
      <main className="fatal">
        <h1>Local storage is unavailable</h1>
        <p>{error}</p>
        <p>Enable browser storage and reload CitelCoach.</p>
      </main>
    );
  if (!data)
    return <main className="fatal">Opening your coaching workspace…</main>;
  return (
    <Context.Provider value={{ data, save, meeting, refresh }}>
      {children}
    </Context.Provider>
  );
}
export const useStore = () => useContext(Context);
