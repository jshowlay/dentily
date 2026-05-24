"use client";

import Link from "next/link";
import { Fragment, useMemo, useRef, useState } from "react";
import { BuyLeadPackButton } from "@/components/buy-lead-pack-button";
import { ResultsSidebar } from "@/components/results/results-sidebar";
import {
  cityFromAddress,
  cityLabelFromLocation,
  countByPriority,
  distinctSignalTypes,
  filterLeads,
  leadRowKey,
  parseOutreachPreview,
  priorityClass,
  scoreBadgeClass,
  signalIcon,
  signalLabel,
  sortLeads,
  type PriorityFilter,
  type SortMode,
} from "@/components/results/results-utils";
import { describeScoreFactors } from "@/lib/lead-score-factors";
import { computeBestContactMethod } from "@/lib/contact-labels";
import type { Lead } from "@/lib/types";
import { SITE } from "@/lib/site-config";
import "@/app/results-page.css";

export type ResultsPageViewProps = {
  searchId: number;
  nicheLabel: string;
  location: string;
  status: string;
  errorMessage?: string | null;
  recordCount: number;
  highPriorityCount: number;
  averageScore: number | null;
  canExport: boolean;
  isPaid: boolean;
  leads: Lead[];
};

function CopyDraftButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" className="dr-copy-btn" onClick={copy}>
      {copied ? "Copied!" : "⎘ Copy draft"}
    </button>
  );
}

export function ResultsPageView(props: ResultsPageViewProps) {
  const {
    searchId,
    nicheLabel,
    location,
    status,
    errorMessage,
    recordCount,
    highPriorityCount,
    averageScore,
    canExport,
    isPaid,
    leads,
  } = props;

  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("score-desc");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const outreachRef = useRef<HTMLDivElement | null>(null);

  const counts = useMemo(() => countByPriority(leads), [leads]);
  const signalTypeCount = useMemo(() => distinctSignalTypes(leads), [leads]);

  const displayedLeads = useMemo(() => {
    const filtered = filterLeads(leads, priorityFilter);
    return sortLeads(filtered, sortMode);
  }, [leads, priorityFilter, sortMode]);

  const cityEm = cityLabelFromLocation(location);

  function toggleExpand(key: string, focusOutreach?: boolean) {
    if (expandedKey === key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(key);
    if (focusOutreach) {
      window.setTimeout(() => {
        outreachRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    }
  }

  return (
    <div className="dentily-results">
      <header className="dr-nav">
        <Link href="/" className="dr-logo">
          Dentily
        </Link>
        <div className="dr-nav-actions">
          <Link href="/search" className="dr-nav-link">
            ← New search
          </Link>
          {canExport && !isPaid ? (
            <BuyLeadPackButton
              searchId={searchId}
              label={`Unlock full pack — ${SITE.leadPackPriceLabel}`}
              nativeButton
              className="dr-nav-cta"
            />
          ) : canExport && isPaid ? (
            <a href={`/api/search/${searchId}/export`} download className="dr-nav-cta">
              Download CSV
            </a>
          ) : null}
        </div>
      </header>

      <div className="dr-layout">
        <div className="dr-main">
          <p className="dr-crumb">
            Search results · searchId {searchId}
          </p>
          <h1 className="dr-title dr-serif">
            Dentists in <em>{cityEm}</em>
          </h1>
          <p className="dr-subtitle">
            {recordCount} practices scored · sorted by priority and opportunity signal · B2B outreach only
          </p>

          {status === "failed" ? (
            <div className="dr-alert is-error" role="alert">
              This search failed{errorMessage ? `: ${errorMessage}` : "."}
            </div>
          ) : null}

          <div className="dr-stats">
            <div className="dr-stat">
              <div className="dr-stat-value">{recordCount}</div>
              <div className="dr-stat-label">Practices scored</div>
            </div>
            <div className="dr-stat">
              <div className="dr-stat-value">{highPriorityCount}</div>
              <div className="dr-stat-label">High priority</div>
            </div>
            <div className="dr-stat">
              <div className="dr-stat-value">{averageScore ?? "—"}</div>
              <div className="dr-stat-label">Avg score</div>
            </div>
            <div className="dr-stat">
              <div className="dr-stat-value">{signalTypeCount}</div>
              <div className="dr-stat-label">Signal types</div>
            </div>
          </div>

          {leads.length === 0 ? (
            <p className="dr-subtitle">No leads found for this search.</p>
          ) : (
            <>
              <div className="dr-toolbar">
                <div className="dr-pills-scroll">
                  <div className="dr-pills">
                    <button
                      type="button"
                      className={`dr-pill${priorityFilter === "all" ? " is-active" : ""}`}
                      onClick={() => setPriorityFilter("all")}
                    >
                      All ({counts.all})
                    </button>
                    <button
                      type="button"
                      className={`dr-pill${priorityFilter === "high" ? " is-active" : ""}`}
                      onClick={() => setPriorityFilter("high")}
                    >
                      High ({counts.high})
                    </button>
                    <button
                      type="button"
                      className={`dr-pill${priorityFilter === "medium" ? " is-active" : ""}`}
                      onClick={() => setPriorityFilter("medium")}
                    >
                      Medium ({counts.medium})
                    </button>
                    <button
                      type="button"
                      className={`dr-pill${priorityFilter === "low" ? " is-active" : ""}`}
                      onClick={() => setPriorityFilter("low")}
                    >
                      Low ({counts.low})
                    </button>
                  </div>
                </div>
                <span className="dr-toolbar-spacer" />
                <label className="dr-sort-label" htmlFor="dr-sort">
                  Sort by
                </label>
                <select
                  id="dr-sort"
                  className="dr-sort"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                >
                  <option value="score-desc">Score ↓</option>
                  <option value="priority">Priority</option>
                  <option value="reviews">Reviews</option>
                </select>
              </div>

              <div className="dr-table-wrap">
                <div className="dr-table-scroll">
                  <table className="dr-table">
                    <thead>
                      <tr>
                        <th>Practice</th>
                        <th>Score</th>
                        <th>Priority</th>
                        <th>Signal</th>
                        <th>Rating</th>
                        <th>Contact</th>
                        <th className="dr-col-actions">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedLeads.map((lead, index) => {
                        const key = leadRowKey(lead, index);
                        const isExpanded = expandedKey === key;
                        const pClass = priorityClass(lead.priority);
                        const contact = computeBestContactMethod({
                          primary_email: lead.primaryEmail,
                          contact_form_url: lead.contactFormUrl,
                          phone: lead.phone,
                        });
                        const factors = describeScoreFactors(lead);
                        const outreachParts = parseOutreachPreview(lead.outreach);
                        const priRaw = (lead.priority ?? "").trim();
                        const priLabel = priRaw
                          ? priRaw.charAt(0).toUpperCase() + priRaw.slice(1).toLowerCase()
                          : "—";

                        return (
                          <Fragment key={key}>
                            <tr
                              className="dr-row"
                              onClick={() => toggleExpand(key)}
                            >
                              <td>
                                <div className="dr-practice-name" title={lead.name}>
                                  {lead.name}
                                </div>
                                <div className="dr-practice-city">{cityFromAddress(lead.address) || location}</div>
                              </td>
                              <td>
                                <span className={`dr-score ${scoreBadgeClass(lead.score)}`}>
                                  {lead.score ?? "—"}
                                </span>
                              </td>
                              <td>
                                <span className={`dr-priority ${pClass}`}>
                                  <span className="dr-priority-dot" aria-hidden />
                                  {priLabel}
                                </span>
                              </td>
                              <td>
                                <span className="dr-signal">
                                  {signalIcon(lead.opportunityType)} {signalLabel(lead.opportunityType, lead.reason)}
                                </span>
                              </td>
                              <td>
                                <span className="dr-rating">
                                  {lead.rating ?? "—"}
                                  {lead.reviewCount != null ? (
                                    <span className="dr-rating-meta"> · {lead.reviewCount} reviews</span>
                                  ) : null}
                                </span>
                              </td>
                              <td>
                                <span className="dr-contact">{contact}</span>
                              </td>
                              <td className="dr-col-actions">
                                <div
                                  className="dr-actions"
                                  onClick={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className={`dr-action-btn${isExpanded ? " is-active" : ""}`}
                                    onClick={() => toggleExpand(key)}
                                  >
                                    Why this score?
                                  </button>
                                  <button
                                    type="button"
                                    className={`dr-action-btn${isExpanded ? " is-active" : ""}`}
                                    onClick={() => toggleExpand(key, true)}
                                  >
                                    Outreach ↗
                                  </button>
                                  {lead.mapsUrl ? (
                                    <a
                                      className="dr-maps-link"
                                      href={lead.mapsUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Maps ↗
                                    </a>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                            {isExpanded ? (
                              <tr key={`${key}-detail`} className="dr-detail">
                                <td colSpan={7}>
                                  <div className="dr-detail-grid">
                                    <div className="dr-detail-box">
                                      <p className="dr-detail-label">Score factors</p>
                                      <ul className="dr-factor-list">
                                        {factors.map((line) => (
                                          <li key={line}>{line}</li>
                                        ))}
                                      </ul>
                                    </div>
                                    <div className="dr-detail-box" ref={isExpanded ? outreachRef : undefined}>
                                      <p className="dr-detail-label">Outreach draft</p>
                                      <div className="dr-draft-quote" aria-hidden>
                                        &ldquo;
                                      </div>
                                      <div className="dr-draft">
                                        {outreachParts.map((seg, i) =>
                                          seg.type === "token" ? (
                                            <em key={i} className="dr-token">
                                              {seg.value}
                                            </em>
                                          ) : (
                                            <span key={i}>{seg.value}</span>
                                          )
                                        )}
                                      </div>
                                      {lead.outreach ? <CopyDraftButton value={lead.outreach} /> : null}
                                      {lead.mapsUrl ? (
                                        <a
                                          className="dr-maps-inline"
                                          href={lead.mapsUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          View on Maps ↗
                                        </a>
                                      ) : null}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        <ResultsSidebar
          searchId={searchId}
          nicheLabel={nicheLabel}
          location={location}
          status={status}
          recordCount={recordCount}
          highPriorityCount={highPriorityCount}
          averageScore={averageScore}
          canExport={canExport}
          isPaid={isPaid}
        />
      </div>
    </div>
  );
}
