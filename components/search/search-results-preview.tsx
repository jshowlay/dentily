"use client";

import {
  SEARCH_PREVIEW_LOCKED_ROWS,
  SEARCH_PREVIEW_STATS,
  SEARCH_PREVIEW_VISIBLE_ROWS,
  type SearchPreviewRow,
} from "@/lib/search-sample-preview";
import { SITE } from "@/lib/site-config";

function cityLabelFromLocation(location: string): string | null {
  const trimmed = location.trim();
  if (!trimmed) return null;
  const first = trimmed.split(",")[0]?.trim();
  return first || trimmed;
}

function panelTitle(location: string): string {
  const city = cityLabelFromLocation(location);
  return city ? `Sample results — ${city}` : "Sample results";
}

function unlockCityLabel(location: string): string {
  return cityLabelFromLocation(location) ?? "your market";
}

function ScoreBadge({ score }: { score: number }) {
  const high = score >= 65;
  return (
    <span className={`ds-score-badge ${high ? "is-high" : "is-low"}`} aria-label={`Score ${score}`}>
      {score}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: SearchPreviewRow["priority"] }) {
  const isHigh = priority === "High";
  return (
    <span className={`ds-priority ${isHigh ? "is-high" : "is-medium"}`}>
      <span className="ds-priority-dot" aria-hidden />
      {priority}
    </span>
  );
}

function PreviewRow({ row, locked }: { row: SearchPreviewRow; locked?: boolean }) {
  return (
    <tr className={locked ? "sp-row-locked" : undefined}>
      <td>
        <div className="ds-practice-name">{row.name}</div>
        <div className="ds-practice-city">{row.city}</div>
      </td>
      <td>
        <ScoreBadge score={row.score} />
      </td>
      <td>
        <PriorityBadge priority={row.priority} />
      </td>
      <td>
        <span className="ds-signal">{row.opportunitySignal}</span>
      </td>
      <td>
        <span className="ds-contact">{row.contact}</span>
      </td>
    </tr>
  );
}

type Props = {
  location: string;
  unlockFormId: string;
};

export function SearchResultsPreview({ location, unlockFormId }: Props) {
  const city = unlockCityLabel(location);
  return (
  <>
    <div className="ds-preview-header">
      <h2>{panelTitle(location)}</h2>
      <span className="ds-preview-tag">Real practices · not mockups</span>
    </div>

    <div className="ds-stats">
      <div className="ds-stat-card">
        <div className="ds-stat-value">Up to {SEARCH_PREVIEW_STATS.total}</div>
        <div className="ds-stat-label">Practices scored</div>
      </div>
      <div className="ds-stat-card">
        <div className="ds-stat-value">{SEARCH_PREVIEW_STATS.highPriority}</div>
        <div className="ds-stat-label">High priority</div>
      </div>
      <div className="ds-stat-card">
        <div className="ds-stat-value">{SEARCH_PREVIEW_STATS.opportunityTypes}</div>
        <div className="ds-stat-label">Opportunity types</div>
      </div>
      <div className="ds-stat-card">
        <div className="ds-stat-value">{SEARCH_PREVIEW_STATS.price}</div>
        <div className="ds-stat-label">One-time unlock</div>
      </div>
    </div>

    <div className="ds-table-wrap" id="sample-preview">
      <div className="ds-table-scroll">
        <table className="ds-table">
          <thead>
            <tr>
              <th>Practice</th>
              <th>Score</th>
              <th>Priority</th>
              <th>Opportunity signal</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {SEARCH_PREVIEW_VISIBLE_ROWS.map((row) => (
              <PreviewRow key={row.name} row={row} />
            ))}
            {SEARCH_PREVIEW_LOCKED_ROWS.map((row) => (
              <PreviewRow key={row.name} row={row} locked />
            ))}
          </tbody>
        </table>
      </div>

      <div className="ds-unlock">
        <p>
          <strong>
            Unlock the full pack for {city}
          </strong>{" "}
          — up to {SEARCH_PREVIEW_STATS.total} scored practices with full contact paths, opportunity estimates, and
          outreach drafts. One-time{" "}
          {SITE.leadPackPriceLabel}.
        </p>
        <button type="submit" form={unlockFormId} className="ds-unlock-btn">
          Unlock full pack →
        </button>
      </div>
    </div>
  </>
  );
}
