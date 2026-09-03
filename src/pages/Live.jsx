import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { products, objections } from "../data/content";
import { useStore } from "../hooks/useStore";
import { dayKey, defaults } from "../utils/metrics";
import PhilosophyAdvice from "../components/PhilosophyAdvice";
import { activeFocus } from "../services/focusBlocks";
import { SalesAssist, ObservationFields } from "../components/SalesMastery";
import {
  FOLLOW_UP_PURPOSES,
  classifyFollowUp,
  qualificationScore,
  dealQuality,
  SALES_STAGES,
} from "../services/salesMasteryEngine";
import { playbookFor } from "../data/salesPlaybooks";
import {
  Card,
  PageHead,
  Select,
  Field,
  Check,
  SaveButton,
  Action,
} from "../components/UI";
export default function Live() {
  const { data, meeting } = useStore(),
    [params] = useSearchParams();
  const followId = params.get("followup"),
    source = data.salesActivities.find((a) => a.id === followId);
  const focused = activeFocus(data);
  const draft = data.settings.find(
    (r) =>
      r.id === params.get("conversation") && r.type === "salesConversation",
  );
  const [facts, setFacts] = useState(draft?.observations || {}),
    [channel, setChannel] = useState("Visit"),
    [followPurpose, setFollowPurpose] = useState(
      source?.followUpPurpose || "General follow-up",
    ),
    [recommendation, setRecommendation] = useState(
      draft?.lastAdviceId
        ? {
            id: draft.lastAdviceId,
            framework: draft.framework,
            stage: draft.stage,
          }
        : null,
    ),
    [conversationId, setConversationId] = useState(
      draft?.id || crypto.randomUUID(),
    );
  const [pid, setPid] = useState(
      source?.product ||
        (draft ? playbookFor(draft.product).name : products[0].name),
    ),
    [outcome, setOutcome] = useState(""),
    [notes, setNotes] = useState(""),
    [value, setValue] = useState(""),
    [date, setDate] = useState(""),
    [priority, setPriority] = useState("Normal"),
    [reason, setReason] = useState(""),
    [objection, setObjection] = useState("0"),
    [dm, setDm] = useState(draft?.observations?.decisionMaker === true),
    [demo, setDemo] = useState(draft?.observations?.demo === true),
    [needs, setNeeds] = useState(true),
    [saved, setSaved] = useState(null);
  const visits = data.salesActivities.filter(
      (a) => a.day === dayKey() && a.kind === "meeting",
    ).length,
    goals = data.dailyGoals.find((g) => g.id === dayKey()) || defaults;
  function reset() {
    setOutcome("");
    setNotes("");
    setValue("");
    setDate("");
    setPriority("Normal");
    setReason("");
    setDm(false);
    setDemo(false);
    setSaved(null);
    setFacts({});
    setRecommendation(null);
    setConversationId(crypto.randomUUID());
    setFollowPurpose("General follow-up");
  }
  async function submit() {
    if (outcome === "SOLD" && (!Number.isFinite(+value) || +value <= 0))
      throw Error("Enter a sale value greater than zero.");
    if (
      (outcome === "FOLLOW-UP" || (outcome === "OWNER ABSENT" && needs)) &&
      !date
    )
      throw Error("Choose a follow-up date.");
    if (outcome === "FOLLOW-UP" && !reason.trim())
      throw Error("Add the reason for the follow-up.");
    const row = await meeting({
      product: pid,
      outcome,
      notes,
      value: outcome === "SOLD" ? +value : 0,
      followUpDate:
        outcome === "FOLLOW-UP" || (outcome === "OWNER ABSENT" && needs)
          ? date
          : null,
      reason,
      followUpPurpose:
        followPurpose === "General follow-up"
          ? classifyFollowUp(reason)
          : followPurpose,
      observations: {
        ...facts,
        decisionMaker: outcome === "OWNER ABSENT" ? false : dm,
      },
      conversationId,
      conversationStage:
        outcome === "SOLD"
          ? "WON"
          : outcome === "REJECTED"
            ? "LOST"
            : facts.stage || recommendation?.stage || "FOLLOW_UP",
      framework: recommendation?.framework || null,
      masteryAdviceId: recommendation?.id || null,
      qualification: qualificationScore({ ...facts, decisionMaker: dm }),
      dealQuality: dealQuality({ ...facts, decisionMaker: dm }),
      channel,
      scheduledPriority: priority,
      objection:
        facts.objectionText ||
        (outcome === "REJECTED"
          ? objections.find((o) => o.id === objection).title
          : null),
      decisionMaker: outcome === "OWNER ABSENT" ? false : dm,
      demo: outcome === "OWNER ABSENT" ? false : demo,
      kind:
        source && !saved ? "followup" : channel === "Call" ? "call" : "meeting",
      followUpOf: source?.id || null,
    });
    setSaved(row);
  }
  return (
    <>
      <PageHead
        eyebrow="FIELD MODE · KEEP IT SIMPLE"
        title={source ? "Complete your follow-up." : `Prospect #${visits + 1}`}
        description="Be present. Get curious. Help them decide."
      />
      {saved ? (
        <Card className="flow-card">
          <span className="eyebrow">ACTIVITY SAVED ✓</span>
          <h2>
            {outcome === "SOLD"
              ? "A win worth remembering."
              : outcome === "REJECTED"
                ? "Take 20 seconds. Start fresh."
                : "Good work showing up."}
          </h2>
          {outcome === "REJECTED" && !focused ? (
            <>
              <p>
                Take three comfortable breaths. The conversation is over; keep
                one useful lesson.
              </p>
              <blockquote>
                {objections.find((o) => o.id === objection).response}
              </blockquote>
              <PhilosophyAdvice
                context="rejection"
                objection={objections.find((o) => o.id === objection).title}
                showEvidence={false}
                onAction={async () => reset()}
              />
            </>
          ) : (
            <p>Your activity and XP are saved on this device.</p>
          )}
          <div className="button-row">
            {source ? (
              <Action to="/more/followups">Back to follow-ups</Action>
            ) : outcome !== "REJECTED" || focused ? (
              <button className="button" onClick={reset}>
                NEXT PROSPECT ↗
              </button>
            ) : null}
            {!focused && (
              <Action secondary to={"/more/review?meeting=" + saved.id}>
                Review this meeting
              </Action>
            )}
          </div>
        </Card>
      ) : (
        <>
          <Card className="live-card">
            <div className="two-col">
              <Select
                label="Product"
                value={pid}
                onChange={setPid}
                options={products.map((p) => p.name)}
              />
              <div className="mission-small">
                <span className="eyebrow">TODAY’S MISSION</span>
                <h3>
                  {visits} / {goals.visits} visits · one conversation at a time
                </h3>
              </div>
            </div>
            <div className="sales-steps">
              {[
                "Find decision maker",
                "Ask questions",
                "Demo",
                "Ask for sale",
              ].map((x, i) => (
                <div key={x}>
                  <span>0{i + 1}</span>
                  <strong>{x}</strong>
                </div>
              ))}
            </div>
            <Select
              label="Activity channel"
              value={channel}
              onChange={setChannel}
              options={["Visit", "Call"]}
            />
            <SalesAssist
              key={conversationId + pid}
              product={pid}
              conversation={facts}
              onChange={setFacts}
              conversationId={conversationId}
              onRecommendation={(id, result) =>
                setRecommendation({
                  id,
                  framework: result.framework,
                  stage: result.stage,
                })
              }
            />
            <ObservationFields
              value={facts}
              onChange={(v) => {
                setFacts(v);
                if (typeof v.decisionMaker === "boolean")
                  setDm(v.decisionMaker);
              }}
            />
            {!focused && (
              <Action to={"/more/conversation?product=" + playbookFor(pid).id}>
                Guided conversation
              </Action>
            )}
            <h3>How did the meeting go?</h3>
            <div className="outcomes">
              {[
                ["SOLD", "✓"],
                ["FOLLOW-UP", "↗"],
                ["REJECTED", "↻"],
                ["OWNER ABSENT", "◷"],
              ].map(([o, icon]) => (
                <button
                  key={o}
                  className={outcome === o ? "selected" : ""}
                  onClick={() => setOutcome(o)}
                >
                  <span>{icon}</span>
                  {o}
                </button>
              ))}
            </div>
          </Card>
          {outcome && (
            <Card>
              <h2>
                {outcome === "SOLD"
                  ? "Record your sale"
                  : outcome === "FOLLOW-UP"
                    ? "Set a real next step"
                    : outcome === "REJECTED"
                      ? "Learn from the no"
                      : "Find the right time"}
              </h2>
              {outcome !== "OWNER ABSENT" && (
                <div className="button-row">
                  <Check
                    label="Spoke with decision maker"
                    checked={dm}
                    onChange={(v) => {
                      setDm(v);
                      setFacts({ ...facts, decisionMaker: v });
                      if (!v) setDemo(false);
                    }}
                  />
                  <Check
                    label="Showed a demo to decision maker"
                    checked={demo}
                    onChange={(v) => {
                      setDemo(v);
                      setFacts({
                        ...facts,
                        demo: v,
                        ...(v ? { decisionMaker: true } : {}),
                      });
                      if (v) setDm(true);
                    }}
                  />
                </div>
              )}
              {outcome === "SOLD" && (
                <Field label="Sale value (₹)">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </Field>
              )}
              {outcome === "REJECTED" && (
                <Select
                  label="Main objection"
                  value={objection}
                  onChange={(v) => {
                    setObjection(v);
                    setFacts({
                      ...facts,
                      objectionText:
                        objections.find((o) => o.id === v)?.title || "",
                    });
                  }}
                  options={objections.map((o) => ({
                    value: o.id,
                    label: o.title,
                  }))}
                />
              )}{" "}
              {outcome === "OWNER ABSENT" && (
                <Check
                  label="Follow-up required"
                  checked={needs}
                  onChange={setNeeds}
                />
              )}{" "}
              {(outcome === "FOLLOW-UP" ||
                (outcome === "OWNER ABSENT" && needs)) && (
                <>
                  <Field label="Follow-up date">
                    <input
                      type="date"
                      min={dayKey()}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </Field>
                  <Field label="Reason / agreed next step">
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </Field>
                  <Select
                    label="Follow-up purpose"
                    value={followPurpose}
                    onChange={setFollowPurpose}
                    options={FOLLOW_UP_PURPOSES}
                  />
                  <Select
                    label="Scheduled priority"
                    value={priority}
                    onChange={setPriority}
                    options={["Normal", "High"]}
                  />
                </>
              )}
              <Field label="Notes (optional)">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Business name, what mattered, next step…"
                />
              </Field>
              <SaveButton onClick={submit}>
                Save {source ? "follow-up" : "meeting"}
              </SaveButton>
            </Card>
          )}
        </>
      )}
    </>
  );
}
