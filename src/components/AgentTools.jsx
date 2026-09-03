import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import { metrics, dayKey } from "../utils/metrics";
export default function AgentTools() {
  const { data } = useStore(),
    latest = useRef(data),
    navigate = useNavigate();
  latest.current = data;
  useEffect(() => {
    if (!document.modelContext?.registerTool) return;
    const lifecycle = new AbortController();
    const tools = [
      {
        name: "read_sales_progress",
        title: "Read sales progress",
        description:
          "Read today’s locally saved activity totals. Does not change data.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute(input) {
          if (!input || Object.keys(input).length)
            throw Error("Expected an empty object.");
          return {
            day: dayKey(),
            ...metrics(
              latest.current.salesActivities.filter((a) => a.day === dayKey()),
            ),
          };
        },
      },
      {
        name: "start_sales_meeting",
        title: "Open Live Sales",
        description:
          "Navigate to Live Sales to begin recording a meeting. Does not save a visit or award XP.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        async execute(input) {
          if (!input || Object.keys(input).length)
            throw Error("Expected an empty object.");
          navigate("/live");
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
          return { status: "form_opened", saved: false };
        },
      },
    ];
    for (const tool of tools) {
      try {
        Promise.resolve(
          document.modelContext.registerTool(tool, {
            signal: lifecycle.signal,
          }),
        ).catch(() => {});
      } catch {}
    }
    return () => lifecycle.abort();
  }, [navigate]);
  return null;
}
