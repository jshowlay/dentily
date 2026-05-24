import Link from "next/link";
import { BuyLeadPackButton } from "@/components/buy-lead-pack-button";
import { HOW_TO_USE_PACK_STEPS, SITE } from "@/lib/site-config";

type Props = {
  searchId: number;
  nicheLabel: string;
  location: string;
  status: string;
  recordCount: number;
  highPriorityCount: number;
  averageScore: number | null;
  canExport: boolean;
  isPaid: boolean;
};

export function ResultsSidebar({
  searchId,
  nicheLabel,
  location,
  status,
  recordCount,
  highPriorityCount,
  averageScore,
  canExport,
  isPaid,
}: Props) {
  const statusLabel = status.replace(/_/g, " ");
  const statusOk = status === "completed" || status === "success";

  return (
    <aside className="dr-sidebar">
      <div className="dr-summary">
        <p className="dr-sidebar-label">Pack summary</p>
        <div className="dr-summary-row">
          <span>Location</span>
          <span>{location}</span>
        </div>
        <div className="dr-summary-row">
          <span>Niche</span>
          <span>{nicheLabel}</span>
        </div>
        <div className="dr-summary-row">
          <span>Status</span>
          <span className={statusOk ? "is-ok" : undefined}>
            {statusOk ? "✓ " : ""}
            {statusLabel}
          </span>
        </div>
        <div className="dr-summary-row">
          <span>Records</span>
          <span>{recordCount}</span>
        </div>
        <div className="dr-summary-row">
          <span>High priority</span>
          <span>{highPriorityCount}</span>
        </div>
        <div className="dr-summary-row">
          <span>Avg score</span>
          <span>{averageScore ?? "—"}</span>
        </div>
      </div>

      {canExport && isPaid ? (
        <a href={`/api/search/${searchId}/export`} download className="dr-download-cta">
          Download CSV
        </a>
      ) : canExport && !isPaid ? (
        <div className="dr-unlock-card">
          <p className="dr-unlock-eyebrow">Unlock full export</p>
          <p className="dr-unlock-price">{SITE.leadPackPriceLabel}</p>
          <p className="dr-unlock-billing">One-time · instant CSV download</p>
          <ul className="dr-unlock-features">
            <li>
              <span aria-hidden>✓</span> All {recordCount} practices + scores
            </li>
            <li>
              <span aria-hidden>✓</span> Full contact paths per lead
            </li>
            <li>
              <span aria-hidden>✓</span> Ready-to-send outreach drafts
            </li>
            <li>
              <span aria-hidden>✓</span> Est. opportunity range per row
            </li>
            <li>
              <span aria-hidden>✓</span> CSV download, start today
            </li>
          </ul>
          <BuyLeadPackButton
            searchId={searchId}
            label="Unlock opportunity pack →"
            nativeButton
            className="dr-unlock-cta"
          />
          <Link href={`/pricing?searchId=${searchId}`} className="dr-pricing-link">
            View pricing details
          </Link>
        </div>
      ) : null}

      <div className="dr-legend">
        <p className="dr-sidebar-label">How scores work</p>
        <div className="dr-legend-row">
          <span className="dr-legend-dot is-high" aria-hidden />
          <span>High — score 60+ · clear outreach angle</span>
        </div>
        <div className="dr-legend-row">
          <span className="dr-legend-dot is-mid" aria-hidden />
          <span>Medium — score 45–59 · worth a pass</span>
        </div>
        <div className="dr-legend-row">
          <span className="dr-legend-dot is-low" aria-hidden />
          <span>Low — under 45 · deprioritise</span>
        </div>
        <p className="dr-legend-note">
          When fewer than five practices reach High on score alone, we label the next-best scorers as High so your
          list always has a clear starting point.
        </p>
      </div>

      <div>
        <p className="dr-sidebar-label">How to use this pack</p>
        <ol className="dr-howto-steps">
          {HOW_TO_USE_PACK_STEPS.map((step, i) => (
            <li key={step} className="dr-howto-step">
              <span className="dr-howto-num" aria-hidden>
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
