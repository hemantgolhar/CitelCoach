import { useStore } from "./useStore";
import { analyzeSales } from "../services/coachEngine";
import { selectPhilosophy } from "../services/philosophyEngine";
import { applyCoachPersonality } from "../services/coachPersonality";
import { normalizePhilosophy } from "../data/philosophies";
import { dayKey } from "../utils/metrics";
import { recommendAdaptive } from "../services/adaptivePhilosophy";
import { firstActionTimes } from "../services/behaviorMetrics";
import { behaviorSignals, detectFrog } from "../services/practicalBehavior";

export function usePhilosophy(options = {}) {
  const { data } = useStore();
  const today = dayKey();
  const prefs = data.settings.find((s) => s.id === "preferences") || {};
  const analysis =
    options.analysis ||
    analyzeSales({
      activities: data.salesActivities,
      meetings: data.meetings,
      goals: data.dailyGoals.find((g) => g.id === today),
      date: today,
    });
  const philosophy = normalizePhilosophy(
    options.philosophy || prefs.philosophy,
  );
  const base = recommendAdaptive({
    options: {
      ...options,
      analysis,
      philosophy,
      successEvidence: data.successEvidence,
      behavior: {
        ...behaviorSignals(data),
        repeatedDelay: firstActionTimes(data.salesActivities, data.settings)
          .repeatedDelay,
        frog: detectFrog(data),
      },
    },
    history: data.mindsetSessions,
    experiments: data.salesExperiments,
    repeatedDelay: firstActionTimes(data.salesActivities, data.settings)
      .repeatedDelay,
  });
  return {
    analysis,
    advice: applyCoachPersonality(base, prefs.personality),
    philosophy,
    personality: prefs.personality || "Supportive",
  };
}
