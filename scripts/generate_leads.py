#!/usr/bin/env python3
"""
Offline CSV repair for Dentily-style lead exports.

The live pipeline (scoring, Marcus outreach, export columns) lives in TypeScript:
  lib/lead-pipeline-config.ts, lib/dentist-scoring.ts, lib/marcus-outreach.ts, lib/lead-pack-export.ts

This script is for teams who only have a CSV artifact. It:
  - normalizes addresses and adds/updates "Cluster Notes" for shared addresses
  - deduplicates repeated sentences in "Outreach"
  - fills "Reachability Score" (0-3) and "Voicemail Script" when those columns exist but are empty

Keep numeric/heuristic policy aligned with the TypeScript modules when you change either side.

Usage:
  python3 scripts/generate_leads.py [input.csv]
Default input: fixtures/dentily-austin-dental-leads-92.csv
Output: dentily-austin-dental-leads-fixed.csv (never overwrites argv input)
"""

from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

from enrichment.apollo_stub import enrich_with_apollo

# Mirror lib/lead-pipeline-config.ts (persona strings only; scoring lives in TS).
CONFIG = {
    "sender_first": "Marcus",
    "sender_last": "Ellery",
    "business": "Ellery Practice Growth",
}


def normalize_address_key(address: str) -> str:
    if not address or not str(address).strip():
        return ""
    a = str(address).lower()
    a = re.sub(r",?\s*(suite|ste|unit|#|apt|bldg|building)\.?\s*[a-z0-9-]+", "", a, flags=re.I)
    a = re.sub(r"[^a-z0-9]+", " ", a)
    return re.sub(r"\s+", " ", a).strip()


def dedupe_sentences(text: str) -> str:
    if not text:
        return ""
    t = text.replace("\u2014", ".").replace("\u2013", ".")
    parts = re.split(r"(?<=[.!?])\s+", t.strip())
    seen: set[str] = set()
    out: list[str] = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        key = re.sub(r"\s+", " ", p.lower())
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
    return " ".join(out)


def reachability_score(row: dict[str, str]) -> int:
    n = 0
    if (row.get("Primary Email") or "").strip():
        n += 1
    if (row.get("Contact Form URL") or "").strip():
        n += 1
    if (row.get("Phone") or "").strip():
        n += 1
    return min(3, n)


def voicemail_script(name: str) -> str:
    n = (name or "there").strip()
    who = f"{CONFIG['sender_first']} {CONFIG['sender_last']} from {CONFIG['business']}"
    return (
        f"Hi {n}, this is {who}. I work with a handful of dental practices on new patient acquisition. "
        "If you have thirty seconds, I had one specific observation about how you show up locally. "
        "Callback is fine whenever works. Thanks."
    )


def apply_clusters(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    key_to_indices: dict[str, list[int]] = {}
    for i, row in enumerate(rows):
        k = normalize_address_key(row.get("Address", ""))
        if not k:
            continue
        key_to_indices.setdefault(k, []).append(i)
    notes: dict[int, str] = {}
    demote: set[int] = set()
    for idxs in key_to_indices.values():
        if len(idxs) < 2:
            continue
        for i in idxs:
            others = "; ".join(rows[j].get("Name", "") for j in idxs if j != i and rows[j].get("Name"))
            notes[i] = f"Shared address with: {others}"
        ranked = sorted(
            idxs,
            key=lambda j: (-float(rows[j].get("Score") or 0), rows[j].get("Name", "")),
        )
        for loser in ranked[1:]:
            demote.add(loser)
    out = []
    for i, row in enumerate(rows):
        r = dict(row)
        enrich_with_apollo(
            r.get("Name", "") or "",
            r.get("Website", "") or "",
            "",
        )
        if i in notes:
            r["Cluster Notes"] = notes[i]
        if i in demote:
            r["Priority"] = "Low"
            try:
                sc = float(r.get("Score") or 0)
                r["Score"] = str(min(int(sc), 40))
            except ValueError:
                r["Score"] = "40"
        if "Reachability Score" in r and not str(r.get("Reachability Score", "")).strip():
            r["Reachability Score"] = str(reachability_score(r))
        if "Voicemail Script" in r and not str(r.get("Voicemail Script", "")).strip():
            phone_only = (r.get("Best Contact Method") or "").lower().startswith("phone")
            if phone_only:
                r["Voicemail Script"] = voicemail_script(r.get("Name", ""))
        draft_key = "Outreach Draft (customize before sending)"
        if draft_key in r and r.get(draft_key):
            r[draft_key] = dedupe_sentences(r[draft_key])
        elif "Outreach" in r and r.get("Outreach"):
            r["Outreach"] = dedupe_sentences(r["Outreach"])
        out.append(r)
    return out


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    default_in = root / "fixtures" / "dentily-austin-dental-leads-92.csv"
    in_path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_in
    out_path = root / "dentily-austin-dental-leads-fixed.csv"
    if not in_path.exists():
        raise SystemExit(f"Input not found: {in_path}")

    with in_path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        if not fieldnames:
            raise SystemExit("CSV has no header")
        rows = list(reader)

    extra = ["Reachability Score", "Cluster Notes", "Voicemail Script"]
    fn = list(fieldnames)
    for c in extra:
        if c not in fn:
            fn.append(c)
    for r in rows:
        for c in fn:
            r.setdefault(c, "")

    fixed = apply_clusters(rows)

    with out_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fn, extrasaction="ignore")
        w.writeheader()
        w.writerows(fixed)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
