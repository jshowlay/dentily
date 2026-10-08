"use client";

import { cn } from "@/lib/utils";

type SearchSubmitProgressProps = {
  steps: string[];
  activeIndex: number;
  variant?: "default" | "territory";
};

export function SearchSubmitProgress({
  steps,
  activeIndex,
  variant = "default",
}: SearchSubmitProgressProps) {
  if (steps.length === 0) return null;

  const isTerritory = variant === "territory";

  return (
    <div
      className={cn(
        isTerritory ? "ds-search-progress" : "rounded-lg border border-slate-200 bg-slate-50/90 p-4"
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <p className={cn(isTerritory ? "ds-search-progress-title" : "text-sm font-medium text-slate-800")}>
        {steps[Math.min(activeIndex, steps.length - 1)]}
      </p>
      <ol className={cn(isTerritory ? "ds-search-progress-steps" : "mt-3 space-y-1.5")}>
        {steps.map((label, i) => {
          const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          return (
            <li
              key={label}
              className={cn(
                isTerritory ? "ds-search-progress-step" : "flex items-center gap-2 text-xs",
                isTerritory && `is-${state}`,
                !isTerritory &&
                  (state === "done"
                    ? "text-slate-500"
                    : state === "active"
                      ? "font-medium text-emerald-800"
                      : "text-slate-400")
              )}
            >
              <span className={isTerritory ? "ds-search-progress-dot" : "inline-block h-1.5 w-1.5 rounded-full bg-current"} aria-hidden />
              <span>{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
