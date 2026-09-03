import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { StoreProvider } from "./hooks/useStore";
import App from "./App";
import AgentTools from "./components/AgentTools";
import SalesDayTracker from "./components/SalesDayTracker";
import "./styles.css";
class ErrorBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <main className="fatal">
        <h1>Something did not load correctly.</h1>
        <p>Your saved data has not been cleared.</p>
        <button onClick={() => location.reload()}>Reload CitelCoach</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <StoreProvider>
          <AgentTools />
          <SalesDayTracker />
          <App />
        </StoreProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
