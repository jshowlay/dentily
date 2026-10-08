"use client";

import { useEffect, useState } from "react";
import {
  buildSearchSubmitProgressSteps,
  SEARCH_SUBMIT_PROGRESS_STEP_MS,
} from "@/lib/search-submit-progress";

export function useSearchSubmitProgress(loading: boolean, location: string) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!loading) {
      setStepIndex(0);
      return;
    }
    setStepIndex(0);
    const steps = buildSearchSubmitProgressSteps(location);
    const id = window.setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }, SEARCH_SUBMIT_PROGRESS_STEP_MS);
    return () => window.clearInterval(id);
  }, [loading, location]);

  const steps = buildSearchSubmitProgressSteps(location);
  const message = steps[Math.min(stepIndex, steps.length - 1)] ?? steps[0] ?? "Building your pack…";

  return { steps, stepIndex, message };
}
