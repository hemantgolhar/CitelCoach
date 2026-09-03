import React, { useEffect, useState } from "react";
import { useStore } from "../hooks/useStore";
import { dayKey, metrics, labels, bottleneck } from "../utils/metrics";
import { mindset, sessions, rituals, objections } from "../data/content";
import PhilosophyAdvice from "../components/PhilosophyAdvice";
import { HabitCues } from "./BehaviorTools";
import { usePhilosophy } from "../hooks/usePhilosophy";
import { planTomorrow, morningFromPlan } from "../services/philosophyEngine";
import { applyCoachPersonality } from "../services/coachPersonality";
import {
  Card,
  Field,
  Select,
  Check,
  SaveButton,
  Action,
  Empty,
} from "../components/UI";
export default function Mindset({ mode }) {
  return mode === "identity" ? (
    <Identity />
  ) : mode === "thoughts" ? (
    <Thoughts />
  ) : mode === "evidence" ? (
    <Evidence />
  ) : mode === "morning" ? (
    <Morning />
  ) : mode === "evening" ? (
    <Evening />
  ) : mode === "rejections" ? (
    <Rejections />
  ) : mode === "vision" ? (
    <Vision />
  ) : (
    <Studio guided={mode === "guided"} />
  );
}
const scripts = {
  "Sales Confidence":
    "Sit comfortably and let your shoulders soften. Breathe at a natural pace. Picture yourself greeting one owner calmly. You do not need every answer; you can listen, clarify and follow up honestly. Rehearse: “How are you handling this today?” Imagine hearing either yes or no without rushing. When ready, notice the room and choose your next conversation.",
  "Fear of Rejection":
    "Settle into a comfortable position. Let one slow breath mark the end of your last interaction. A customer’s decision is about their situation, needs and priorities. It is not a measure of your worth. Imagine asking permission, listening respectfully, and accepting their answer. You can tolerate uncertainty. Return your attention to the room and choose one respectful approach.",
  Focus:
    "Let your attention rest on one comfortable breath. Notice distractions without needing to solve them. Choose one task: ask a useful question. Picture listening to the full answer. If your mind wanders, gently return to the next step. Open your eyes if they were closed. Write your single priority and begin.",
  "Taking Action":
    "Sit or stand comfortably. Let the next breath be a fresh start. You do not need to finish the whole day now. Imagine taking one small step toward a nearby business. Rehearse a brief greeting and a permission question. Notice that action can come before confidence. Return to your surroundings and take that first step.",
  "Calm Before Meeting":
    "Pause somewhere safe and still. Relax your hands and breathe comfortably. Picture entering at an unhurried pace. You will ask, listen, and respond to what is actually said. You do not have to control the outcome. Rehearse your opening once. When ready, bring your attention back and enter respectfully.",
  "Positive Self-Talk":
    "Notice the tone of your inner voice. Try speaking to yourself as you would to a colleague who is learning. “I can improve one part of this conversation.” Let that sentence settle without forcing belief. Recall one real example of effort. Return to the room and practice a useful question once.",
  "Rejection Recovery":
    "Allow yourself a brief pause. A disappointing conversation can feel uncomfortable, and it can also be finished. Take a comfortable breath. Separate the event from the story you tell about yourself. Keep one useful lesson and let the rest wait. Notice your surroundings. Choose the next prospect when you are ready.",
  "Evening Reset":
    "Settle into a comfortable place. Let the workday pause. Recall one action you took, one thing you learned, and one moment you handled well. You can leave unfinished problems for a written plan tomorrow. Release your shoulders. Return to the room and write one realistic next step before resting.",
};
const practicePrompts = {
  Visualization: [
    "Imagine a calm opening, a useful question and a respectful response to either answer.",
    "Rehearse your opening, then visit one business.",
  ],
  Affirmations: [
    "I can start a useful conversation even when I feel uncertain.",
    "Ask one owner an open-ended question.",
  ],
  Gratitude: [
    "Write one thing that supported your effort today.",
    "Thank someone sincerely, then choose your next sales action.",
  ],
  "Future-self exercise": [
    "Imagine a more consistent version of yourself. What repeatable habit do you notice?",
    "Practice that habit for five minutes today.",
  ],
  "Goal scripting": [
    "Write a realistic day in terms of actions you control.",
    "Schedule your first three visits.",
  ],
  "Identity statements": [
    "Choose a statement that describes an action you can demonstrate.",
    "Show that identity in the next conversation.",
  ],
  "Vision board": [
    "Choose an image or phrase that represents a meaningful goal.",
    "Connect it to a measurable action this week.",
  ],
  "Success visualization": [
    "Rehearse the process of listening, demonstrating value and asking for a next step.",
    "Use a trial-close question today.",
  ],
  "Mental rehearsal": [
    "Imagine hearing a common objection and calmly asking a clarifying question.",
    "Practice one objection response out loud.",
  ],
};
function Studio({ guided }) {
  const { save } = useStore(),
    [selected, setSelected] = useState(guided ? sessions[0] : mindset[0]),
    [note, setNote] = useState(""),
    [notice, setNotice] = useState(""),
    [speaking, setSpeaking] = useState(false);
  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
    },
    [],
  );
  useEffect(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, [selected]);
  const prompt = practicePrompts[selected] || practicePrompts.Visualization;
  return (
    <Card>
      <Select
        label={guided ? "Guided self-suggestion session" : "Mindset practice"}
        value={selected}
        onChange={setSelected}
        options={guided ? sessions : mindset}
      />
      <h2>{selected}</h2>
      <p>
        {guided
          ? "A self-directed script for confidence and focus. Use it while safely seated or standing still."
          : "These are exercises in attention, goal clarity and action. Thoughts do not guarantee sales or money."}
      </p>
      <blockquote>{guided ? scripts[selected] : prompt[0]}</blockquote>
      {guided ? (
        <>
          <p className="fine">
            Optional voice uses your browser. Offline speech depends on
            installed device voices; the complete script always works offline.
          </p>
          <div className="button-row">
            <button
              className="secondary"
              disabled={!("speechSynthesis" in window)}
              onClick={() => {
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(scripts[selected]);
                u.rate = 0.88;
                u.onend = () => setSpeaking(false);
                u.onerror = () => {
                  setSpeaking(false);
                  setNotice(
                    "Voice is unavailable. You can read the full script above.",
                  );
                };
                window.speechSynthesis.speak(u);
                setSpeaking(true);
              }}
            >
              Read aloud
            </button>
            <button
              className="secondary"
              disabled={!speaking}
              onClick={() => {
                window.speechSynthesis.cancel();
                setSpeaking(false);
              }}
            >
              Stop
            </button>
          </div>
        </>
      ) : (
        <p>
          <strong>Your next action:</strong> {prompt[1]}
        </p>
      )}
      <Field label="My next action / reflection">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="button-row">
        <SaveButton
          onClick={async () => {
            await save("mindsetSessions", {
              title: selected,
              type: guided ? "guided" : "mindset",
              note,
            });
            setNotice("Session completed and saved.");
          }}
        >
          Complete session
        </SaveButton>
        <Action to={selected === "Vision board" ? "/more/vision" : "/live"}>
          {selected === "Vision board"
            ? "Build your vision board"
            : "Take action"}
        </Action>
      </div>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
    </Card>
  );
}
function Identity() {
  const { data, save } = useStore(),
    [statement, setStatement] = useState(""),
    [action, setAction] = useState("");
  const current = data.settings.find((s) => s.id === "identity");
  const rows = current?.statements || [
    {
      text: "I am consistent.",
      action: "Visit the first business on my route.",
      selected: true,
    },
    {
      text: "I ask good questions.",
      action: "Ask how the owner handles this today.",
      selected: true,
    },
    {
      text: "I ask for the sale confidently.",
      action: "Invite a clear next step without pressure.",
      selected: true,
    },
  ];
  return (
    <Card>
      <h2>Prove your identity with action.</h2>
      {rows.map((r, i) => (
        <div key={i}>
          <Check
            label={r.text}
            checked={r.selected}
            onChange={(v) =>
              save("settings", {
                id: "identity",
                statements: rows.map((x, n) =>
                  n === i ? { ...x, selected: v } : x,
                ),
              })
            }
          />
          <p>{r.action}</p>
        </div>
      ))}
      <Field label="My identity statement">
        <input
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="I approach prospects even when I feel nervous."
        />
      </Field>
      <Field label="Real-world action">
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Ask one permission-based opening question."
        />
      </Field>
      <SaveButton
        onClick={async () => {
          if (!statement.trim() || !action.trim())
            throw Error("Add both a statement and a real-world action.");
          await save("settings", {
            id: "identity",
            statements: [
              ...rows,
              { text: statement.trim(), action: action.trim(), selected: true },
            ],
          });
          setStatement("");
          setAction("");
        }}
      >
        Add identity statement
      </SaveButton>
    </Card>
  );
}
const thoughts = [
  "Nobody is buying.",
  "I am bad at sales.",
  "Today is going badly.",
  "I don't want another rejection.",
  "This product is difficult to sell.",
];
function Thoughts() {
  const { save } = useStore(),
    [text, setText] = useState(thoughts[0]),
    [shown, setShown] = useState(false);
  const response = /nobody|buying/i.test(text)
    ? [
        "That conclusion may be based on too few conversations.",
        "Speak to three more decision makers before judging the day.",
      ]
    : /bad at|difficult/i.test(text)
      ? [
          "One difficult skill or product does not define your ability.",
          "Practice one opening and ask one problem question.",
        ]
      : /reject/i.test(text)
        ? [
            "Wanting to avoid discomfort is understandable. A respectful no is survivable.",
            "Ask permission for one short conversation.",
          ]
        : /today|day/i.test(text)
          ? [
              "A difficult start does not decide the next conversation.",
              "Choose one controllable action for the next ten minutes.",
            ]
          : [
              "Treat this as a thought to examine, not a proven fact. What evidence supports it, and what evidence does not?",
              "Choose one small action that can give you better information.",
            ];
  return (
    <Card>
      <h2>A thought is not a forecast.</h2>
      <Select
        label="Start with an example"
        value={thoughts.includes(text) ? text : ""}
        onChange={(v) => {
          setText(v);
          setShown(false);
        }}
        options={[{ value: "", label: "Custom thought" }, ...thoughts]}
      />
      <Field label="What am I telling myself?">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setShown(false);
          }}
        />
      </Field>
      <SaveButton
        onClick={async () => {
          if (!text.trim()) throw Error("Enter a thought first.");
          await save("mindsetSessions", {
            title: "Thought converter",
            thought: text,
            response: response[0],
            action: response[1],
          });
          setShown(true);
        }}
      >
        Find a more useful thought
      </SaveButton>
      {shown && (
        <>
          <blockquote>{response[0]}</blockquote>
          <p>{response[1]}</p>
          <Action to="/live">DO IT NOW</Action>
        </>
      )}
    </Card>
  );
}
function Evidence() {
  const { data, save } = useStore(),
    [category, setCategory] = useState("Sales win"),
    [text, setText] = useState("");
  return (
    <>
      <Card>
        <h2>Keep the evidence.</h2>
        <Select
          label="What went well?"
          value={category}
          onChange={setCategory}
          options={[
            "Sales win",
            "Good conversation",
            "Positive feedback",
            "Objection handled",
            "Difficult customer handled",
            "Personal breakthrough",
          ]}
        />
        <Field label="What happened?">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Be specific. What did you do that helped?"
          />
        </Field>
        <SaveButton
          onClick={async () => {
            if (!text.trim()) throw Error("Write down your evidence first.");
            await save("successEvidence", { category, text: text.trim() });
            setText("");
          }}
        >
          Save evidence
        </SaveButton>
      </Card>
      {data.successEvidence.length ? (
        data.successEvidence
          .slice()
          .reverse()
          .map((e) => (
            <Card key={e.id}>
              <span className="eyebrow">
                {e.category} · {e.day}
              </span>
              <p>{e.text}</p>
            </Card>
          ))
      ) : (
        <Card>
          <Empty>
            Your wins can be small. Start with one good conversation.
          </Empty>
        </Card>
      )}
    </>
  );
}
function Morning() {
  const focus = usePhilosophy({ context: "morning" });
  const { data, save } = useStore(),
    config = data.settings.find((s) => s.id === "ritual"),
    items = config?.items || rituals,
    current = data.mindsetSessions.find((s) => s.id === "morning:" + dayKey()),
    [checked, setChecked] = useState(current?.checked || []),
    [edit, setEdit] = useState(false),
    [newItem, setNewItem] = useState(""),
    identity = data.settings.find((s) => s.id === "identity")?.statements || [
      {
        text: "I am consistent.",
        action: "Start my first visit.",
        selected: true,
      },
    ];
  const previousPlan = data.dailyDebriefs.find(
    (d) => d.tomorrowPlan?.forDate === dayKey(),
  )?.tomorrowPlan;
  const carried = morningFromPlan(previousPlan, {
    date: dayKey(),
    philosophy: focus.philosophy,
    stats: focus.analysis.stats,
  });
  const urgentBehavior =
    [
      "STARTING_DELAY",
      "MISSED_DAY",
      "PRACTICE_WITHOUT_ACTION",
      "SCATTERED_ACTIVITY",
      "LOW_PRACTICE_QUALITY",
    ].includes(focus.advice.problem) ||
    focus.advice.philosophy === "eat-that-frog";
  const advice =
    carried && !urgentBehavior
      ? applyCoachPersonality(carried, focus.personality)
      : focus.advice;
  async function toggle(item, v) {
    const next = v ? [...checked, item] : checked.filter((x) => x !== item);
    setChecked(next);
    await save("mindsetSessions", {
      id: "morning:" + dayKey(),
      title: "Morning ritual",
      checked: next,
      complete: items.every((x) => next.includes(x)),
    });
  }
  return (
    <Card>
      <PhilosophyAdvice advice={advice} heading="Today’s principle" />
      <HabitCues />
      <div className="section-title">
        <h2>
          {checked.filter((x) => items.includes(x)).length} / {items.length}{" "}
          morning actions
        </h2>
        <button className="secondary" onClick={() => setEdit(!edit)}>
          {edit ? "Done editing" : "Configure"}
        </button>
      </div>
      {items.map((item) => (
        <div key={item} className="activity">
          <Check
            label={item}
            checked={checked.includes(item)}
            onChange={(v) => toggle(item, v)}
          />
          {edit && (
            <button
              className="secondary"
              onClick={() =>
                save("settings", {
                  id: "ritual",
                  items: items.filter((x) => x !== item),
                })
              }
            >
              Remove
            </button>
          )}
        </div>
      ))}
      {edit && (
        <>
          <Field label="Add a ritual step">
            <input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
            />
          </Field>
          <SaveButton
            onClick={async () => {
              if (!newItem.trim() || items.includes(newItem.trim()))
                throw Error("Enter a unique step.");
              await save("settings", {
                id: "ritual",
                items: [...items, newItem.trim()],
              });
              setNewItem("");
            }}
          >
            Add step
          </SaveButton>
        </>
      )}
      <h3>Today’s identity</h3>
      {identity
        .filter((i) => i.selected)
        .map((i) => (
          <blockquote key={i.text}>
            {i.text}
            <p>{i.action}</p>
          </blockquote>
        ))}
      <div className="button-row">
        <Action secondary to="/practice?mode=pitch">
          Practice pitch
        </Action>
        <Action to="/live">Start first sales action</Action>
      </div>
    </Card>
  );
}
function Evening() {
  const focus = usePhilosophy({ context: "evening" });
  const { data, save } = useStore(),
    actual = metrics(data.salesActivities.filter((a) => a.day === dayKey())),
    existing = data.dailyDebriefs.find((d) => d.id === dayKey()),
    [values, setValues] = useState(existing?.reported || actual),
    [form, setForm] = useState(
      existing || {
        objection: objections[0].title,
        win: "",
        mistake: "",
        lesson: "",
      },
    ),
    [notice, setNotice] = useState("");
  const tomorrow = planTomorrow({
    analysis: focus.analysis,
    philosophy: focus.philosophy,
  });
  return (
    <Card>
      <h2>Close today. Prepare tomorrow.</h2>
      <p>
        These are reflection totals, prefilled from activity. Editing them does
        not add visits, sales or XP.
      </p>
      <div className="number-grid">
        {Object.entries(labels).map(([k, l]) => (
          <Field key={k} label={l}>
            <input
              type="number"
              min="0"
              value={values[k]}
              onChange={(e) => setValues({ ...values, [k]: e.target.value })}
            />
          </Field>
        ))}
      </div>
      <Select
        label="Main objection"
        value={form.objection}
        onChange={(v) => setForm({ ...form, objection: v })}
        options={["None", ...objections.map((o) => o.title)]}
      />
      {[
        ["win", "Biggest win"],
        ["mistake", "Biggest mistake"],
        ["lesson", "Lesson"],
      ].map(([k, l]) => (
        <Field label={l} key={k}>
          <textarea
            value={form[k]}
            onChange={(e) => setForm({ ...form, [k]: e.target.value })}
          />
        </Field>
      ))}
      <SaveButton
        onClick={async () => {
          if (
            Object.values(values).some(
              (v) => v === "" || !Number.isFinite(+v) || +v < 0,
            )
          )
            throw Error("Use non-negative totals.");
          const reported = Object.fromEntries(
            Object.entries(values).map(([k, v]) => [k, +v]),
          );
          await save("dailyDebriefs", {
            ...form,
            id: dayKey(),
            reported,
            recommendation: bottleneck(reported),
            actualStats: { ...focus.analysis.stats },
            todaysLesson: tomorrow.lesson,
            tomorrowPlan: tomorrow,
          });
          setNotice(bottleneck(reported));
        }}
      >
        Save evening debrief
      </SaveButton>
      <h3>Today’s lesson · recorded activity</h3>
      <p>{tomorrow.lesson}</p>
      <PhilosophyAdvice
        advice={applyCoachPersonality(tomorrow.advice, focus.personality)}
        heading="Tomorrow’s principle"
      />
      <p className="fine">{tomorrow.visualization}</p>
      <p className="fine">
        Save the debrief to carry this principle into the morning of{" "}
        {tomorrow.forDate}. Edited reflection totals do not change this
        diagnosis.
      </p>
      {notice && (
        <>
          <h3>Tomorrow’s focus</h3>
          <p>{notice}</p>
        </>
      )}
      <h3>Previous debriefs</h3>
      {data.dailyDebriefs
        .slice(-5)
        .reverse()
        .map((d) => (
          <details key={d.id}>
            <summary>{d.day}</summary>
            <p>{d.lesson}</p>
            <p>{d.recommendation}</p>
          </details>
        ))}
    </Card>
  );
}
function Rejections() {
  const { data, save } = useStore(),
    pref = data.settings.find((s) => s.id === "preferences") || {},
    [target, setTarget] = useState(pref.noTarget || 10),
    count = data.salesActivities.filter(
      (a) => a.day === dayKey() && a.outcome === "REJECTED",
    ).length;
  return (
    <Card>
      <span className="eyebrow">COLLECT EXPERIENCE, NOT PRESSURE</span>
      <h2 className="metric">
        {count} / {pref.noTarget || 10} NOs collected
      </h2>
      <p>
        Rejection means you are actively prospecting. Respect each no; you never
        need to pursue a rejection for its own sake.
      </p>
      <Field label="Today’s NO target">
        <input
          type="number"
          min="1"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
      </Field>
      <SaveButton
        onClick={() => {
          if (!Number.isInteger(+target) || +target < 1)
            throw Error("Enter a whole-number target of at least one.");
          return save("settings", {
            ...pref,
            id: "preferences",
            noTarget: +target,
          });
        }}
      >
        Save target
      </SaveButton>
      <p className="fine">
        Counted automatically from rejected sales activities.
      </p>
      <Action to="/live">NEXT PROSPECT</Action>
    </Card>
  );
}
function Vision() {
  const { data, save } = useStore(),
    [title, setTitle] = useState(""),
    [action, setAction] = useState(""),
    [image, setImage] = useState(null),
    [error, setError] = useState("");
  return (
    <>
      <Card>
        <h2>A goal you can act on.</h2>
        <Field label="Meaningful goal">
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="This week’s action">
          <input value={action} onChange={(e) => setAction(e.target.value)} />
        </Field>
        <Field label="Image (optional, JPG / PNG / WebP, up to 3 MB)">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setError("");
              setImage(null);
              if (!f) return;
              if (
                !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
                f.size > 3 * 1024 * 1024
              ) {
                setError("Choose a JPG, PNG or WebP under 3 MB.");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => setImage(reader.result);
              reader.onerror = () => setError("Could not read that image.");
              reader.readAsDataURL(f);
            }}
          />
        </Field>
        {error && <p className="error">{error}</p>}
        <SaveButton
          onClick={async () => {
            if (!title.trim() || !action.trim())
              throw Error("Connect a goal to a specific action.");
            await save("visionBoard", { title, action, image });
            setTitle("");
            setAction("");
            setImage(null);
          }}
        >
          Add to vision board
        </SaveButton>
      </Card>
      <div className="vision-grid">
        {data.visionBoard.map((v) => (
          <Card key={v.id}>
            {v.image && <img src={v.image} alt={v.title} />}
            <h3>{v.title}</h3>
            <p>{v.action}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
