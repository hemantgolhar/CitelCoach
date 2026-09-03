import React, { useEffect, useState } from "react";
import {
  NavLink,
  Route,
  Routes,
  useLocation,
  Navigate,
} from "react-router-dom";
import { useStore } from "./hooks/useStore";
import { activeFocus, focusRoutes } from "./services/focusBlocks";
import {
  House,
  BookOpen,
  Target,
  Navigation,
  ChartNoAxesCombined,
  Grid2X2,
  Zap,
  WifiOff,
  Settings,
  ArrowUpRight,
} from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import Home from "./pages/Home";
import Coach from "./pages/Coach";
import Practice from "./pages/Practice";
import Live from "./pages/Live";
import Progress from "./pages/Progress";
import More from "./pages/More";
const nav = [
  ["/", "Home", House],
  ["/coach", "Coach", BookOpen],
  ["/practice", "Practice", Target],
  ["/live", "Live Sales", Navigation],
  ["/progress", "Progress", ChartNoAxesCombined],
  ["/more", "More", Grid2X2],
];
export default function App() {
  const location = useLocation();
  const { data } = useStore(),
    focus = activeFocus(data);
  const allowed = focus && [
    focusRoutes[focus.focusType].split("?")[0],
    "/more/focus",
    ...(focus.focusType === "Follow-ups" ? ["/live"] : []),
  ];
  const [online, setOnline] = useState(navigator.onLine);
  const {
    needRefresh: [refresh],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    document.documentElement.dataset.theme =
      localStorage.getItem("theme") || "dark";
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);
  return (
    <div className={"app" + (focus ? " focus-shell" : "")}>
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <span className="brand-icon">
            <Zap fill="currentColor" size={23} />
          </span>
          <span>
            CitelCoach<small>YOUR PERSONAL SALES COACH</small>
          </span>
        </NavLink>
        <span className="nav-label">YOUR WORKSPACE</span>
        <nav>
          {nav.map(([to, title, Icon]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <Icon size={20} />
              {title}
              {title === "Live Sales" && <span className="live-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="small-card">
            <span className="eyebrow">ONE CONVERSATION AT A TIME</span>
            <p>
              Small actions.
              <br />
              Stronger salesperson.
            </p>
            <NavLink to="/live">
              Make your next move <ArrowUpRight size={16} />
            </NavLink>
          </div>
          <NavLink to="/more/settings" className="settings-link">
            <Settings size={18} /> Settings & backup
          </NavLink>
          <div className="profile">
            <span className="avatar">YOU</span>
            <div>
              Your personal workspace<small>Private. On your device.</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <div className="topbar">
          <span>
            Mindset <b>→</b> Practice <b>→</b> Action <b>→</b> Growth
          </span>
          <span className="status">
            {online ? <i /> : <WifiOff size={13} />}{" "}
            {online ? "Local-first workspace" : "Offline · ready to coach"}
          </span>
        </div>
        {refresh && (
          <div className="update">
            An app update is ready. Save your work first.{" "}
            <button onClick={() => updateServiceWorker(true)}>
              Update now
            </button>
          </div>
        )}
        <main>
          {focus && (
            <div className="focus-banner">
              <strong>{focus.focusType} · one focus</strong>
              <NavLink to="/more/focus">Return to block / finish</NavLink>
            </div>
          )}
          {focus && !allowed.includes(location.pathname) ? (
            <Navigate replace to="/more/focus" />
          ) : (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/coach/*" element={<Coach />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/live" element={<Live key={location.search} />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/more/*" element={<More />} />
              <Route
                path="*"
                element={
                  <div>
                    <h1>Page not found</h1>
                    <NavLink to="/">Back home</NavLink>
                  </div>
                }
              />
            </Routes>
          )}
        </main>
      </div>
      <nav className="mobile-nav">
        {nav.map(([to, title, Icon]) => (
          <NavLink key={to} to={to} end={to === "/"}>
            <Icon size={21} />
            <span>{title}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
