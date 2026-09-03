import { useEffect } from "react";
import { useStore } from "../hooks/useStore";
import { recordSalesDayOpen } from "../services/behaviorMetrics";
export default function SalesDayTracker() {
  const { refresh } = useStore();
  useEffect(() => {
    let live = true;
    const track = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        if ((await recordSalesDayOpen()) && live) await refresh();
      } catch {
        /* No inferred opening time if local storage fails. */
      }
    };
    track();
    document.addEventListener("visibilitychange", track);
    const timer = setInterval(track, 60000);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", track);
    };
  }, []);
  return null;
}
