export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const defaults = {
  visits: 10,
  decisionMakers: 5,
  demos: 3,
  followUps: 3,
  sales: 1,
  revenue: 5000,
};
// Add defaults in memory; preserve explicit zero targets and saved records.
export function normalizeGoals(goals = {}) {
  return {
    ...goals,
    ...Object.fromEntries(
      Object.entries(defaults).map(([key, fallback]) => [
        key,
        Number.isFinite(goals[key]) && goals[key] >= 0 ? goals[key] : fallback,
      ]),
    ),
  };
}
export const labels = {
  visits: "Visits",
  decisionMakers: "Decision makers",
  demos: "Demos",
  followUps: "Follow-ups",
  sales: "Sales",
  revenue: "Revenue",
};
export function metrics(rows) {
  return rows.reduce(
    (a, r) => ({
      visits: a.visits + (r.kind === "meeting" ? 1 : 0),
      decisionMakers: a.decisionMakers + (r.decisionMaker ? 1 : 0),
      demos: a.demos + (r.demo ? 1 : 0),
      followUps: a.followUps + (r.kind === "followup" ? 1 : 0),
      sales: a.sales + (r.outcome === "SOLD" ? 1 : 0),
      revenue: a.revenue + (r.outcome === "SOLD" ? Number(r.value || 0) : 0),
    }),
    {
      visits: 0,
      decisionMakers: 0,
      demos: 0,
      followUps: 0,
      sales: 0,
      revenue: 0,
    },
  );
}
export const percent = (a, b) => (b ? Math.round((a / b) * 100) : 0);
export function streaks(rows, min = 5, now = new Date()) {
  const days = {};
  rows
    .filter((r) => r.kind === "meeting")
    .forEach((r) => (days[r.day] = (days[r.day] || 0) + 1));
  let best = 0,
    run = 0,
    last = null;
  Object.keys(days)
    .sort()
    .forEach((k) => {
      if (days[k] < min) return;
      const date = new Date(k + "T12:00:00");
      const prev = new Date(date);
      prev.setDate(prev.getDate() - 1);
      run = last === dayKey(prev) ? run + 1 : 1;
      best = Math.max(best, run);
      last = k;
    });
  let current = 0,
    d = new Date(now);
  if ((days[dayKey(d)] || 0) < min) d.setDate(d.getDate() - 1);
  while ((days[dayKey(d)] || 0) >= min) {
    current++;
    d.setDate(d.getDate() - 1);
  }
  return { current, best };
}
export function funnel(m, rows = []) {
  return [
    ["Visit → Decision maker", percent(m.decisionMakers, m.visits)],
    ["Decision maker → Demo", percent(m.demos, m.decisionMakers)],
    ["Demo → Sale", percent(m.sales, m.demos)],
    [
      "Follow-up → Sale",
      percent(
        rows.filter((r) => r.kind === "followup" && r.outcome === "SOLD")
          .length,
        m.followUps,
      ),
    ],
  ];
}
export function bottleneck(m) {
  if (!m.visits) return "Log your first five visits to start finding patterns.";
  if (m.decisionMakers / m.visits < 0.5)
    return "Improve decision-maker access. Ask when the owner is available before pitching.";
  if (m.demos / Math.max(1, m.decisionMakers) < 0.4)
    return "Improve opening and discovery. Find one clear problem before offering a demo.";
  if (m.sales / Math.max(1, m.demos) < 0.2)
    return "Focus on value, objections and closing. Ask for a clear, pressure-free next step.";
  return "Keep the process consistent. Repeat the opening that gets useful conversations.";
}
export function calculate(target, value, close, demo, access, days) {
  if (
    [target, value, close, demo, access, days].some(
      (v) => !Number.isFinite(+v) || +v <= 0,
    ) ||
    [close, demo, access].some((v) => v > 100)
  )
    return null;
  const sales = Math.ceil(target / value),
    demos = Math.ceil(sales / (close / 100)),
    decisionMakers = Math.ceil(demos / (demo / 100)),
    visits = Math.ceil(decisionMakers / (access / 100));
  return { sales, demos, decisionMakers, visits, days };
}
