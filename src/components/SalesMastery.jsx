import React, { useEffect, useState } from "react";
import { useStore } from "../hooks/useStore";
import {
  salesMastery,
  helpNow,
  assistOptions,
  OBSERVATIONS,
  objectionBranches,
  diagnoseObjection,
  qualificationScore,
  dealQuality,
  SALES_STAGES,
} from "../services/salesMasteryEngine";
import {
  masteryAdviceId,
  recordMasteryShown,
} from "../services/salesMasteryTracking";
import { completePrinciple } from "../services/principleHistory";
import { Action, Select, Field, SaveButton } from "./UI";
export function ObservationFields({ value, onChange }) {
  const q = qualificationScore(value),
    d = dealQuality(value);
  return (
    <details>
      <summary>
        Known conversation facts · {q.label} {q.score}/100 · {d.label}
      </summary>
      <p>{q.note} Unknown answers remain unknown.</p>
      <Select
        label="Conversation stage"
        value={value.stage || "DISCOVERY"}
        onChange={(stage) => onChange({ ...value, stage })}
        options={SALES_STAGES.map((s) => ({
          value: s,
          label: s.replaceAll("_", " "),
        }))}
      />
      {Object.entries(OBSERVATIONS).map(([key, label]) => (
        <Select
          key={key}
          label={label}
          value={
            value[key] === true
              ? "yes"
              : value[key] === false
                ? "no"
                : "unknown"
          }
          onChange={(v) => {
            const next = { ...value };
            if (v === "unknown") delete next[key];
            else next[key] = v === "yes";
            onChange(next);
          }}
          options={[
            { value: "unknown", label: "Not established" },
            { value: "yes", label: "Yes — observed / customer confirmed" },
            { value: "no", label: "No" },
          ]}
        />
      ))}
      <Field label="Number of benefits the customer confirmed">
        <input
          type="number"
          min="0"
          max="20"
          value={value.benefitsConfirmed || 0}
          onChange={(e) =>
            onChange({
              ...value,
              benefitsConfirmed: Math.max(
                0,
                Math.min(20, Number(e.target.value)),
              ),
            })
          }
        />
      </Field>
      <Field label="Approved trade (only if confirmed available)">
        <input
          value={value.approvedTrade || ""}
          onChange={(e) =>
            onChange({ ...value, approvedTrade: e.target.value })
          }
          placeholder="Otherwise leave blank"
        />
      </Field>
      <Field label="Two verified options (one per line, optional)">
        <textarea
          value={(value.verifiedOptions || []).join("\n")}
          onChange={(e) =>
            onChange({
              ...value,
              verifiedOptions: e.target.value.split("\n").slice(0, 2),
            })
          }
        />
      </Field>
    </details>
  );
}
export function MasteryAdvice({
  analysis,
  result: provided,
  context = "home-sales",
  conversationId = "",
  compact = false,
  onRecommendation,
}) {
  const { data, refresh } = useStore();
  const personality =
    data.settings.find((r) => r.id === "preferences")?.personality ||
    "Supportive";
  const result = provided || salesMastery({ data, analysis, personality });
  const id = masteryAdviceId(result, context, conversationId),
    record = data.mindsetSessions.find((r) => r.id === id);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (!record)
      recordMasteryShown(result, context, data.salesActivities, conversationId)
        .then(() => {
          if (active) return refresh();
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    onRecommendation?.(id, result);
    return () => {
      active = false;
    };
  }, [id, !!record]);
  return (
    <section className="mastery-advice" aria-label="Sales Mastery advice">
      <span className="eyebrow">
        {result.stage.replaceAll("_", " ")} ·{" "}
        {result.framework.replaceAll("_", " ")}
      </span>
      <p>{result.response}</p>
      <p>
        <strong>ASK:</strong> {result.nextQuestion}
      </p>
      {!compact && <p>{result.coachTip}</p>}
      <p>
        <strong>{compact ? "THEN" : "ACTION"}:</strong> {result.action}
      </p>
      {!compact && <Action to={result.actionRoute}>TRY NEXT ACTION</Action>}
      <SaveButton
        disabled={record?.completed}
        onClick={async () => {
          await recordMasteryShown(
            result,
            context,
            data.salesActivities,
            conversationId,
          );
          await completePrinciple(id, { activities: data.salesActivities });
          await refresh();
        }}
      >
        {record?.completed ? "Action completed ✓" : "Mark action completed"}
      </SaveButton>
      {!compact && (
        <small>
          Completion is your report. A result is recorded separately; this does
          not create sales activity.
        </small>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
export function SalesAssist({
  product,
  conversation,
  onChange,
  onRecommendation,
  conversationId,
}) {
  const { data } = useStore();
  const [option, setOption] = useState(""),
    [said, setSaid] = useState(""),
    [branch, setBranch] = useState("Not clarified");
  const personality = data.settings.find(
    (r) => r.id === "preferences",
  )?.personality;
  const c = {
    ...conversation,
    objection: option === "Customer objected" ? said || undefined : undefined,
    objectionBranch: branch,
  };
  const result = option
    ? helpNow(option, { product, conversation: c, data, personality })
    : null;
  return (
    <details className="sales-assist">
      <summary>HELP ME NOW</summary>
      <Select
        label="What is happening?"
        value={option}
        onChange={(v) => {
          setOption(v);
          setBranch("Not clarified");
          const words = {
            "Customer says think about it": "I'll think about it",
            "Customer wants WhatsApp details": "Send details on WhatsApp",
            "Customer is silent": "silent",
          }[v];
          if (words)
            onChange({
              ...conversation,
              objectionText: words,
              objectionType: diagnoseObjection(words).type,
            });
        }}
        options={[
          { value: "", label: "Choose the help you need" },
          ...assistOptions,
        ]}
      />
      {option === "Customer objected" && (
        <Field label="What they said">
          <input
            value={said}
            onChange={(e) => {
              setSaid(e.target.value);
              onChange({
                ...conversation,
                objectionText: e.target.value,
                objectionType: diagnoseObjection(e.target.value).type,
              });
            }}
            placeholder="Customer’s own words"
          />
        </Field>
      )}
      {result && (
        <>
          <MasteryAdvice
            result={result}
            compact
            context={"live:" + option + ":" + branch}
            conversationId={conversationId}
            onRecommendation={onRecommendation}
          />
          {result.framework === "LAER" && (
            <Select
              label="After listening, what did you find?"
              value={branch}
              onChange={(v) => {
                setBranch(v);
                onChange({
                  ...conversation,
                  objectionDiagnosed: v !== "Not clarified",
                  objectionType: result.problem,
                  objectionBranch: v,
                });
              }}
              options={objectionBranches}
            />
          )}
        </>
      )}
    </details>
  );
}
