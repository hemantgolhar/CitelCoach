import React, { useEffect, useState } from "react";
import { useStore } from "../hooks/useStore";
import { backup, restore, validateBackup, clear } from "../db/database";
import { Card, Field, Select, SaveButton } from "../components/UI";
import { philosophies, normalizePhilosophy } from "../data/philosophies";
export default function Settings() {
  const { data, save, refresh } = useStore(),
    pref = data.settings.find((s) => s.id === "preferences") || {},
    [style, setStyle] = useState(pref.personality || "Supportive"),
    [philosophy, setPhilosophy] = useState(
      normalizePhilosophy(pref.philosophy),
    ),
    [minimum, setMinimum] = useState(pref.streakMinimum || 5),
    [theme, setTheme] = useState(localStorage.getItem("theme") || "dark"),
    [pending, setPending] = useState(null),
    [importMode, setImportMode] = useState("merge"),
    [notice, setNotice] = useState(""),
    [install, setInstall] = useState(null);
  useEffect(() => {
    setStyle(pref.personality || "Supportive");
    setPhilosophy(normalizePhilosophy(pref.philosophy));
    setMinimum(pref.streakMinimum || 5);
    if (pref.theme) {
      setTheme(pref.theme);
      localStorage.setItem("theme", pref.theme);
      document.documentElement.dataset.theme = pref.theme;
    }
  }, [pref.updatedAt]);
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstall(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  return (
    <div className="settings-panel">
      <Card>
        <h2>Make it your coach.</h2>
        <Select
          label="Coach personality"
          value={style}
          onChange={setStyle}
          options={["Supportive", "Tough", "Analytical", "Sales Manager"]}
        />
        <p className="fine">Personality = how your coach talks.</p>
        <Select
          label="Coaching philosophy"
          value={philosophy}
          onChange={setPhilosophy}
          options={philosophies.map((p) => ({ value: p.id, label: p.name }))}
        />
        <p className="fine">
          Philosophy = how your coach approaches problems. CitelCoach Method
          selects one relevant principle at a time.
        </p>
        <Select
          label="Appearance"
          value={theme}
          onChange={(v) => {
            setTheme(v);
            localStorage.setItem("theme", v);
            document.documentElement.dataset.theme = v;
          }}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
          ]}
        />
        <Field label="Minimum visits for an activity streak">
          <input
            type="number"
            min="1"
            value={minimum}
            onChange={(e) => setMinimum(e.target.value)}
          />
        </Field>
        <p className="fine">
          A sale is never required. Changing this minimum recalculates streaks
          across your saved activity.
        </p>
        <SaveButton
          onClick={async () => {
            if (!Number.isInteger(+minimum) || +minimum < 1)
              throw Error("Use a whole number of at least one.");
            await save("settings", {
              ...pref,
              id: "preferences",
              personality: style,
              philosophy,
              streakMinimum: +minimum,
              theme,
            });
            setNotice("Preferences saved.");
          }}
        >
          Save preferences
        </SaveButton>
      </Card>
      <Card>
        <h2>Install & use offline</h2>
        <p>
          Install CitelCoach from your browser’s menu using “Install app” or
          “Add to Home screen”. Open it once online and allow caching to finish.
          Your data stays in this browser on this device.
        </p>
        {install && (
          <button
            className="button"
            onClick={async () => {
              await install.prompt();
              setInstall(null);
            }}
          >
            Install CitelCoach
          </button>
        )}
        <p className="fine">
          Mobile installation requires an HTTPS address. The desktop localhost
          preview is for development. Clearing browser data removes local
          records; keep a backup.
        </p>
        <button
          className="secondary"
          onClick={async () => {
            try {
              const ok = await navigator.storage?.persist?.();
              setNotice(
                ok
                  ? "Persistent storage enabled."
                  : "Your browser manages storage automatically. Keep regular JSON backups.",
              );
            } catch {
              setNotice(
                "Persistent storage is unavailable. Keep regular JSON backups.",
              );
            }
          }}
        >
          Request persistent device storage
        </button>
      </Card>
      <Card>
        <h2>Backup & restore</h2>
        <p>
          A JSON backup includes all your activity, settings, practice history
          and vision-board images. Save it somewhere you control.
        </p>
        <SaveButton
          onClick={async () => {
            const result = await backup();
            const blob = new Blob([JSON.stringify(result, null, 2)], {
                type: "application/json",
              }),
              url = URL.createObjectURL(blob),
              a = document.createElement("a");
            a.href = url;
            a.download =
              "citelcoach-backup-" +
              new Date().toISOString().slice(0, 10) +
              ".json";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setNotice("Backup exported.");
          }}
        >
          Export JSON backup
        </SaveButton>
        <div className="divider" />
        <Field label="Import JSON backup">
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              setPending(null);
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                if (f.size > 50 * 1024 * 1024)
                  throw Error("Backup must be smaller than 50 MB.");
                const parsed = validateBackup(JSON.parse(await f.text()));
                setPending(parsed);
                setNotice("Backup validated. Choose merge or replace.");
              } catch (err) {
                setNotice(err.message);
              }
            }}
          />
        </Field>
        <Select
          label="Restore method"
          value={importMode}
          onChange={setImportMode}
          options={[
            {
              value: "merge",
              label: "Merge — keep records, use newer matching IDs",
            },
            {
              value: "replace",
              label: "Replace — delete current data and restore backup",
            },
          ]}
        />
        {pending && (
          <p>
            {Object.values(pending.data).reduce((n, a) => n + a.length, 0)}{" "}
            records · exported {pending.exportedAt || "date unknown"}
          </p>
        )}
        <SaveButton
          disabled={!pending}
          onClick={async () => {
            if (
              importMode === "replace" &&
              !window.confirm(
                "Replace all local CitelCoach data with this backup? Export a backup first if needed.",
              )
            )
              return;
            await restore(pending, importMode === "replace");
            const restoredTheme = pending.data.settings.find(
              (s) => s.id === "preferences",
            )?.theme;
            if (importMode === "replace" && restoredTheme) {
              localStorage.setItem("theme", restoredTheme);
              document.documentElement.dataset.theme = restoredTheme;
              setTheme(restoredTheme);
            }
            await refresh();
            setPending(null);
            setNotice("Backup restored successfully.");
          }}
        >
          Import backup
        </SaveButton>
      </Card>
      <Card>
        <h2>Clear all data</h2>
        <p>
          This removes every CitelCoach record from this browser. Export a
          backup first if you want to keep your progress.
        </p>
        <button
          className="danger"
          onClick={async () => {
            if (
              !window.confirm(
                "Permanently clear all local CitelCoach data? This cannot be undone without a backup.",
              )
            )
              return;
            try {
              await clear();
              localStorage.removeItem("theme");
              document.documentElement.dataset.theme = "dark";
              setTheme("dark");
              setStyle("Supportive");
              setMinimum(5);
              await refresh();
              setNotice("All local data cleared.");
            } catch (e) {
              setNotice(e.message);
            }
          }}
        >
          Clear all data
        </button>
      </Card>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
    </div>
  );
}
