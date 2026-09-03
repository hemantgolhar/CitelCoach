import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronRight } from "lucide-react";
export const Card = ({ children, className = "" }) => (
  <section className={"card " + className}>{children}</section>
);
export const PageHead = ({
  eyebrow = "YOUR PERSONAL SALES COACH",
  title,
  description,
  children,
}) => (
  <header className="page-head">
    <div>
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {children}
  </header>
);
export const Action = ({ to, children, secondary = false }) => (
  <Link className={"button " + (secondary ? "secondary" : "")} to={to}>
    {children}
    <ArrowUpRight size={18} />
  </Link>
);
export const Field = ({ label, children }) => (
  <label className="field">
    <span>{label}</span>
    {children}
  </label>
);
export const Select = ({ label, value, onChange, options }) => (
  <Field label={label}>
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option
          key={typeof o === "string" ? o : o.value}
          value={typeof o === "string" ? o : o.value}
        >
          {typeof o === "string" ? o : o.label}
        </option>
      ))}
    </select>
  </Field>
);
export const Accordion = ({ title, children }) => (
  <details>
    <summary>
      {title}
      <ChevronRight size={16} />
    </summary>
    <div className="detail-content">{children}</div>
  </details>
);
export const Empty = ({ children = "Your next action starts the story." }) => (
  <p className="empty">{children}</p>
);
export const Check = ({ label, checked, onChange }) => (
  <label className="check">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span>{label}</span>
  </label>
);
export function SaveButton({ onClick, children = "Save", disabled = false }) {
  const [busy, setBusy] = React.useState(false),
    [error, setError] = React.useState("");
  return (
    <>
      <button
        className="button"
        disabled={disabled || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await onClick();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Saving…" : children}
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </>
  );
}
