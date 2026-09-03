import React, { useEffect, useState } from "react";
import { useStore } from "../hooks/useStore";
import { pendingFeedback } from "../services/adviceEffectiveness";
import AdviceFeedback from "./AdviceFeedback";
import { Card } from "./UI";
export default function AdviceFollowup() {
  const { data } = useStore();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const record = pendingFeedback(data.mindsetSessions, now);
  return record ? (
    <Card>
      <details>
        <summary>What happened after your action? · Optional</summary>
        <AdviceFeedback key={record.id} record={record} dismissible />
      </details>
    </Card>
  ) : null;
}
