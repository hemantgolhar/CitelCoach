import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "../hooks/useStore";
import { activeFocus } from "../services/focusBlocks";
import SalesMasteryLibrary from "./SalesMastery";
import { products, objections } from "../data/content";
import { Card, PageHead, Select, SaveButton, Action } from "../components/UI";
export default function Practice() {
  const [params, setParams] = useSearchParams(),
    selectedMode = params.get("mode") || "battle";
  const { data, save } = useStore();
  const focused = activeFocus(data),
    mode =
      focused?.focusType === "Pitch practice"
        ? "pitch"
        : focused?.focusType === "Objection practice"
          ? "battle"
          : selectedMode;
  const [pid, setPid] = useState(params.get("product") || products[0].id),
    [format, setFormat] = useState("30-second pitch"),
    [round, setRound] = useState(0),
    [revealed, setRevealed] = useState(false),
    [ratings, setRatings] = useState([]),
    [saving, setSaving] = useState(false),
    [notice, setNotice] = useState(""),
    [queue, setQueue] = useState(() =>
      [...objections].sort(() => Math.random() - 0.5).slice(0, 10),
    );
  const p = products.find((p) => p.id === pid) || products[0],
    o = queue[round],
    formats = [
      "15-second pitch",
      "30-second pitch",
      "60-second pitch",
      "Cold approach",
      "Restaurant-owner pitch",
      "Salon-owner pitch",
      "Clinic-owner pitch",
      "Retail-owner pitch",
    ];
  const pitch =
    format === "15-second pitch"
      ? `${p.benefits[0]}. ${p.opening}`
      : format === "60-second pitch"
        ? p.longPitch
        : format === "Cold approach"
          ? `Hi, is now a suitable time for a quick question? ${p.opening}`
          : format === "30-second pitch"
            ? p.pitch
            : `For your ${format.split("-")[0].toLowerCase()}, start with the current workflow: ${p.questions[0]} ${p.pitch}`;
  async function rate(r) {
    setSaving(true);
    try {
      const record = await save(
        "objectionPractice",
        { title: "Objection practice", objection: o.title, rating: r },
        10,
      );
      await save("practiceSessions", {
        id: record.id,
        type: "objection",
        rating: r,
      });
      await save("skillScores", {
        id: "objection:" + o.id,
        skill: "Objection Handling",
        score: r * 50,
      });
      setRatings((a) => [...a, { objection: o.title, rating: r }]);
      setRound((n) => n + 1);
      setRevealed(false);
    } catch (e) {
      setNotice(e.message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <PageHead
        eyebrow="REPETITION BUILDS CONFIDENCE"
        title="Your practice ground."
        description="A few focused minutes now. A stronger conversation next."
      />
      {!focused && (
        <div className="tabs">
          <button
            className={mode === "mastery" ? "active" : ""}
            onClick={() => setParams({ mode: "mastery" })}
          >
            Sales Mastery
          </button>
          <button
            className={mode === "battle" ? "active" : ""}
            onClick={() => setParams({ mode: "battle" })}
          >
            Objection battle
          </button>
          <button
            className={mode === "pitch" ? "active" : ""}
            onClick={() => setParams({ mode: "pitch" })}
          >
            Pitch trainer
          </button>
        </div>
      )}
      {mode === "mastery" ? (
        <SalesMasteryLibrary key={params.get("stage")} />
      ) : mode === "battle" ? (
        round < 10 ? (
          <Card className="battle">
            <span className="eyebrow">
              OBJECTION {round + 1} / 10{" "}
              <span className="tag">
                {ratings
                  .slice()
                  .reverse()
                  .findIndex((r) => r.rating !== 2) === -1
                  ? ratings.length
                  : ratings
                      .slice()
                      .reverse()
                      .findIndex((r) => r.rating !== 2)}{" "}
                streak
              </span>
            </span>
            <div className="bar">
              <i style={{ width: round * 10 + "%" }} />
            </div>
            <h2>“{o.title}”</h2>
            <p>Say your response out loud. Stay curious and keep it human.</p>
            {revealed ? (
              <>
                <blockquote>{o.response}</blockquote>
                <p>{o.question}</p>
                <div className="button-row">
                  {[
                    ["Nailed It", 2],
                    ["Okay", 1],
                    ["Struggled", 0],
                  ].map(([t, r]) => (
                    <button
                      className={r === 2 ? "button" : "secondary"}
                      disabled={saving}
                      key={t}
                      onClick={() => rate(r)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <small>Self-rated practice · +10 XP for showing up</small>
              </>
            ) : (
              <button className="button" onClick={() => setRevealed(true)}>
                Reveal recommended answer
              </button>
            )}
          </Card>
        ) : (
          <Card className="battle">
            <span className="eyebrow">BATTLE COMPLETE</span>
            <h2>{ratings.reduce((a, r) => a + r.rating, 0) * 5}%</h2>
            <p>Your self-rated practice score</p>
            <h3>Recommended practice</h3>
            {ratings.filter((r) => r.rating < 2).length ? (
              ratings
                .filter((r) => r.rating < 2)
                .map((r) => (
                  <p key={r.objection}>
                    {r.objection} — clarify the concern before responding.
                  </p>
                ))
            ) : (
              <p>Strong round. Try these responses in a real conversation.</p>
            )}
            <div className="button-row">
              <button
                className="secondary"
                onClick={() => {
                  setQueue(
                    [...objections]
                      .sort(() => Math.random() - 0.5)
                      .slice(0, 10),
                  );
                  setRound(0);
                  setRatings([]);
                }}
              >
                New battle
              </button>
              <Action to="/live">Start selling</Action>
            </div>
          </Card>
        )
      ) : (
        <Card>
          <div className="two-col">
            <Select
              label="Product"
              value={pid}
              onChange={setPid}
              options={products.map((p) => ({ value: p.id, label: p.name }))}
            />
            <Select
              label="Practice format"
              value={format}
              onChange={setFormat}
              options={formats}
            />
          </div>
          <span className="eyebrow">MODEL PITCH · ADAPT TO YOUR OWN VOICE</span>
          <blockquote className="pitch">{pitch}</blockquote>
          <p>
            Time labels are practice targets; adapt your delivery to the
            listener and verify product claims.
          </p>
          <div className="button-row">
            {["Practiced", "Confident", "Needs Work"].map((r) => (
              <SaveButton
                key={r}
                onClick={async () => {
                  const record = await save(
                    "pitchPractice",
                    {
                      title: "Pitch practice",
                      product: p.name,
                      format,
                      rating: r,
                    },
                    10,
                  );
                  await save("practiceSessions", {
                    id: record.id,
                    type: "pitch",
                    rating: r,
                  });
                  setNotice("Practice saved. +10 XP.");
                }}
              >
                {r}
              </SaveButton>
            ))}
          </div>
          <p className="fine">
            {data.pitchPractice.filter((s) => s.product === p.name).length}{" "}
            sessions with this product
          </p>
        </Card>
      )}
      {notice && <p role="status">{notice}</p>}
    </>
  );
}
