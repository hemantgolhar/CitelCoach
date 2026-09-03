import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  products,
  objections,
  blockers,
  resets,
  frameworks,
  coachText,
} from "../data/content";
import {
  Card,
  PageHead,
  Action,
  Select,
  Accordion,
  SaveButton,
  Field,
} from "../components/UI";
import { useStore } from "../hooks/useStore";
import PhilosophyAdvice from "../components/PhilosophyAdvice";
import BookWisdom from "./BookWisdom";
import { ProductMastery } from "./SalesMastery";
import {
  diagnoseObjection,
  objectionBranches,
} from "../services/salesMasteryEngine";
export default function Coach() {
  const location = useLocation(),
    navigate = useNavigate(),
    { data, save } = useStore();
  const mode = location.pathname.split("/")[2] || "products";
  const query = new URLSearchParams(location.search);
  const focus = query.get("focus");
  const visibleFrameworks =
    focus === "closing"
      ? frameworks.filter((f) => f.name.endsWith("Close"))
      : focus === "discovery"
        ? frameworks.filter((f) =>
            [
              "SPIN Selling",
              "Consultative Selling",
              "Open-ended questions",
            ].includes(f.name),
          )
        : frameworks;
  const [pid, setPid] = useState(products[0].id),
    [oid, setOid] = useState("0"),
    [block, setBlock] = useState(null),
    [customer, setCustomer] = useState("Business owner"),
    [step, setStep] = useState(0),
    [elapsed, setElapsed] = useState(0);
  const [clarified, setClarified] = useState("Not clarified");
  const p = products.find((p) => p.id === pid),
    o = objections.find((o) => o.id === oid),
    style =
      data.settings.find((s) => s.id === "preferences")?.personality ||
      "Supportive";
  const diagnosis = diagnoseObjection(o.title, clarified);
  useEffect(() => setClarified("Not clarified"), [oid]);
  useEffect(() => {
    setStep(0);
    setElapsed(0);
  }, [mode]);
  useEffect(() => {
    const requested = new URLSearchParams(location.search).get("objection");
    const match = objections.find(
      (item) => item.title.toLowerCase() === requested?.toLowerCase(),
    );
    if (match) setOid(match.id);
  }, [location.search]);
  useEffect(() => {
    if (mode !== "boost") return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [mode]);
  return (
    <>
      <PageHead
        eyebrow="CLARITY BEFORE CONFIDENCE"
        title={
          mode === "motivate"
            ? "Make your next move."
            : mode === "boost"
              ? "Walk in ready."
              : mode === "reset"
                ? "One no. A new start."
                : "Your pocket sales coach."
        }
        description="Practical guidance. Real questions. One clear next action."
      />
      <div className="tabs">
        {[
          ["products", "Product coach"],
          ["objections", "Objection coach"],
          ["frameworks", "Frameworks"],
          ["wisdom", "Book Wisdom"],
          ["motivate", "Motivate me"],
          ["boost", "Meeting boost"],
          ["reset", "Rejection reset"],
        ].map(([id, t]) => (
          <Link
            key={id}
            className={mode === id ? "active" : ""}
            to={"/coach/" + id}
          >
            {t}
          </Link>
        ))}
      </div>
      {mode === "products" && (
        <>
          <Select
            label="Choose your product"
            value={pid}
            onChange={setPid}
            options={products.map((p) => ({ value: p.id, label: p.name }))}
          />
          <Card className="feature-card">
            <span className="eyebrow">PRODUCT PLAYBOOK</span>
            <h2>{p.name}</h2>
            <p>{p.benefits[0]}.</p>
            <p className="fine">
              Coaching drafts: confirm actual features, compatibility, prices
              and support before promising them.
            </p>
            <Action to={"/practice?mode=pitch&product=" + p.id}>
              Practice this product
            </Action>
          </Card>
          <ProductMastery product={pid} />
          <div className="two-col">
            {[
              ["Who to target", p.target],
              ["Problems to identify", p.problems],
              ["Best opening", p.opening],
              ["Discovery questions", p.questions],
              ["Value proposition", p.benefits],
              ["30-second pitch", p.pitch],
              ["60-second pitch", p.longPitch],
              ["Demo flow", p.demo],
              [
                "Objection handling",
                p.objections.map((x, i) => x + ": " + p.responses[i]),
              ],
              ["Closing questions", p.closing],
              ["Follow-up strategy", p.followUp],
            ].map(([t, c]) => (
              <Card key={t}>
                <Accordion title={t}>
                  {Array.isArray(c) ? (
                    <ul>
                      {c.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{c}</p>
                  )}
                </Accordion>
              </Card>
            ))}
          </div>
        </>
      )}
      {mode === "objections" && (
        <>
          <Select
            label="What did the customer say?"
            value={oid}
            onChange={setOid}
            options={objections.map((o) => ({ value: o.id, label: o.title }))}
          />
          <Card>
            <span className="eyebrow">CUSTOMER SAYS</span>
            <h2>“{o.title}”</h2>
            <div className="two-col">
              {[
                ["What it may mean", diagnosis.mayMean],
                ["Avoid saying", o.avoid],
                ["What to find out", diagnosis.findOut],
                ["Question to ask", diagnosis.question],
                ["Possible response", diagnosis.response],
                ["Next legitimate step", diagnosis.nextStep],
              ].map(([t, c]) => (
                <div key={t}>
                  <h3>{t}</h3>
                  <p>{c}</p>
                </div>
              ))}
            </div>
            <Select
              label="After listening, what did you find?"
              value={clarified}
              onChange={setClarified}
              options={objectionBranches}
            />
            <h3>More examples to consider after listening</h3>
            {o.branches.map((b) => (
              <Accordion title={b.title} key={b.title}>
                <p>{b.text}</p>
              </Accordion>
            ))}
            <Action to="/practice?mode=battle">Practice now</Action>
          </Card>
        </>
      )}
      {mode === "frameworks" && (
        <div className="two-col">
          {focus && (
            <p className="practice-focus">
              {focus === "closing"
                ? "Practice these 5 closing scenarios: read the situation, say your response, then try the exercise. Confirm interest and respect a no."
                : "Rehearse two discovery questions before the next visit."}{" "}
              <Link to="/coach/frameworks">View all frameworks</Link>
            </p>
          )}
          {visibleFrameworks.map((f) => (
            <Card key={f.name}>
              <Accordion title={f.name}>
                <p>{f.what}</p>
                <h4>When to use</h4>
                <p>{f.when}</p>
                <blockquote>{f.example}</blockquote>
                <h4>Mistake to avoid</h4>
                <p>{f.mistake}</p>
                <h4>Practice exercise</h4>
                <p>{f.exercise}</p>
                <Action to="/live">Try it in the field</Action>
              </Accordion>
            </Card>
          ))}
        </div>
      )}
      {mode === "wisdom" && <BookWisdom />}
      {mode === "motivate" && (
        <>
          <Card className="feature-card">
            <span className="eyebrow">THE FIVE-MINUTE RESET</span>
            <h2>What is stopping you right now?</h2>
            <div className="choice-grid">
              {blockers.map((b, i) => (
                <button
                  className={block === i ? "selected" : ""}
                  key={b}
                  onClick={() => setBlock(i)}
                >
                  {b}
                </button>
              ))}
            </div>
          </Card>
          {block !== null && (
            <Card className="response">
              <PhilosophyAdvice
                context="motivate"
                blocker={blockers[block]}
                heading="Your next step"
              />
            </Card>
          )}
        </>
      )}
      {mode === "boost" && (
        <Card className="flow-card">
          <div className="two-col">
            <Select
              label="Product"
              value={pid}
              onChange={setPid}
              options={products.map((p) => ({ value: p.id, label: p.name }))}
            />
            <Field label="Customer type">
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
              />
            </Field>
          </div>
          <span className="eyebrow">
            60–90 SECOND PREPARATION · {elapsed}s elapsed · STEP {step + 1} / 7
          </span>
          <h2>
            {
              [
                "Breathe slowly.",
                "Stand comfortably.",
                "Visualize your entry.",
                "Keep your opening simple.",
                "Lead with curiosity.",
                "Listen to understand.",
                "Set your closing intention.",
              ][step]
            }
          </h2>
          <p className="large-copy">
            {
              [
                "Take three comfortable breaths. Relax your jaw and shoulders.",
                "Find a balanced posture. Keep your hands relaxed and your pace unhurried.",
                `Picture a calm, respectful greeting with the ${customer.toLowerCase()}. You can handle either answer.`,
                p.opening,
                p.questions[0],
                "Pause after your question. Let them finish before deciding what to say.",
                p.closing[0],
              ][step]
            }
          </p>
          <small>
            Spend about 10 seconds on each step. Continue when you feel ready.
          </small>
          <div className="button-row">
            {step > 0 && (
              <button
                className="secondary"
                onClick={() => setStep((s) => s - 1)}
              >
                Back
              </button>
            )}
            {step < 6 ? (
              <button className="button" onClick={() => setStep((s) => s + 1)}>
                Next step →
              </button>
            ) : null}
          </div>
          {step === 6 && (
            <PhilosophyAdvice
              context="pre-meeting"
              showEvidence={false}
              onAction={() =>
                save("mindsetSessions", {
                  title: "Pre-meeting boost",
                  product: p.name,
                  customer,
                  elapsed,
                })
              }
            />
          )}
        </Card>
      )}
      {mode === "reset" && (
        <Card>
          <Select
            label="What happened?"
            value={oid}
            onChange={setOid}
            options={[
              ...objections.map((o) => ({ value: o.id, label: o.title })),
              { value: "other", label: "Other" },
            ]}
          />
          <h2>Let the last conversation end.</h2>
          <p>
            {coachText(
              style,
              "A rejection is an outcome, not your identity. Take a breath and release the pressure.",
            )}
          </p>
          <Accordion title="Sales lesson & better response">
            <p>{o?.meaning || "Fit or timing may not have matched."}</p>
            <p>
              {o?.response ||
                "Thank them for their time. Ask for feedback only if welcome."}
            </p>
          </Accordion>
          <PhilosophyAdvice
            context="rejection"
            objection={o?.title || "Other"}
            showEvidence={false}
          />
        </Card>
      )}
    </>
  );
}
