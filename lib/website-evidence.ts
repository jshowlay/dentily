const BOOKING_RE =
  /\b(zocdoc|localmed|nexhealth|patient\.?\s*pop|flexbook|book\s+online|schedule\s+(an?\s+)?appointment|request\s+appointment|online\s+booking|book\s+now|schedule\s+now|patient\s+portal)\b/i;

const COPYRIGHT_RE = /(?:©|copyright)\s*(?:©)?\s*(20\d{2})/gi;

export type WebsiteAudit = {
  httpsOk: boolean | null;
  hasOnlineBooking: boolean | null;
  copyrightYear: number | null;
  staleCopyright: boolean;
  mobilePerformanceScore: number | null;
  slowMobile: boolean;
  fetchError: string | null;
};

function parseWebsiteUrl(website: string): URL | null {
  const raw = website.trim();
  if (!raw) return null;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

/** Always probe https://host (follow redirects). Listing may still show http://. */
export async function probeHttpsWorks(website: string | null | undefined, timeoutMs = 8000): Promise<boolean | null> {
  const parsed = parseWebsiteUrl(website ?? "");
  if (!parsed) return null;

  const httpsRoot = `https://${parsed.host}/`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  async function tryFetch(method: "HEAD" | "GET"): Promise<boolean | null> {
    try {
      const res = await fetch(httpsRoot, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "DentilyLeadScoring/1.0 (+https://dentily.co)",
        },
      });
      const finalUrl = res.url ?? httpsRoot;
      if (!finalUrl.startsWith("https:")) return false;
      if (res.ok || (res.status >= 300 && res.status < 400)) return true;
      if (res.status === 404 || res.status === 403) return true;
      if (res.status >= 500) return null;
      if (method === "HEAD" && res.status >= 400) return null;
      return null;
    } catch {
      return null;
    }
  }

  try {
    let ok = await tryFetch("HEAD");
    if (ok === null) ok = await tryFetch("GET");
    return ok;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeFetchUrl(website: string, preferHttps: boolean): string {
  const parsed = parseWebsiteUrl(website);
  if (!parsed) return website;
  if (preferHttps) {
    return `https://${parsed.host}${parsed.pathname === "/" ? "/" : parsed.pathname}${parsed.search}`;
  }
  return parsed.href;
}

export async function fetchHomepageHtml(
  url: string,
  timeoutMs = 8000,
  preferHttps = true
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(normalizeFetchUrl(url, preferHttps), {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "DentilyLeadScoring/1.0 (+https://dentily.co)",
      },
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 500_000);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function analyzeHomepageHtml(html: string | null, nowYear: number): Pick<
  WebsiteAudit,
  "hasOnlineBooking" | "copyrightYear" | "staleCopyright"
> {
  if (!html) {
    return { hasOnlineBooking: null, copyrightYear: null, staleCopyright: false };
  }
  const hasOnlineBooking = BOOKING_RE.test(html);
  let copyrightYear: number | null = null;
  const copyRe = new RegExp(COPYRIGHT_RE.source, COPYRIGHT_RE.flags);
  let match: RegExpExecArray | null;
  while ((match = copyRe.exec(html)) !== null) {
    const y = Number(match[1]);
    if (Number.isFinite(y) && (copyrightYear === null || y > copyrightYear)) {
      copyrightYear = y;
    }
  }
  const staleCopyright =
    copyrightYear !== null && copyrightYear < nowYear - 1;
  return { hasOnlineBooking, copyrightYear, staleCopyright };
}

const MOBILE_PERF_SLOW_MAX = 49;
const PSI_DELAY_MS = 450;

export async function fetchMobilePageSpeedScore(websiteUrl: string): Promise<number | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) return null;

  const target = encodeURIComponent(normalizeFetchUrl(websiteUrl, true));
  const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${target}&strategy=mobile&category=performance&key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      lighthouseResult?: { categories?: { performance?: { score?: number | null } } };
    };
    const score = json.lighthouseResult?.categories?.performance?.score;
    if (score === null || score === undefined || !Number.isFinite(score)) return null;
    return Math.round(score * 100);
  } catch {
    return null;
  } finally {
    await new Promise((r) => setTimeout(r, PSI_DELAY_MS));
  }
}

export async function auditWebsite(website: string | null | undefined, opts?: {
  runPageSpeed?: boolean;
  nowYear?: number;
}): Promise<WebsiteAudit> {
  const nowYear = opts?.nowYear ?? new Date().getFullYear();
  const raw = (website ?? "").trim();
  if (!raw) {
    return {
      httpsOk: null,
      hasOnlineBooking: null,
      copyrightYear: null,
      staleCopyright: false,
      mobilePerformanceScore: null,
      slowMobile: false,
      fetchError: null,
    };
  }

  const httpsOk = await probeHttpsWorks(raw);
  const html = await fetchHomepageHtml(raw, 8000, httpsOk !== false);
  const page = analyzeHomepageHtml(html, nowYear);
  let mobilePerformanceScore: number | null = null;
  if (opts?.runPageSpeed) {
    mobilePerformanceScore = await fetchMobilePageSpeedScore(raw);
  }
  const slowMobile =
    mobilePerformanceScore !== null && mobilePerformanceScore <= MOBILE_PERF_SLOW_MAX;

  return {
    httpsOk,
    hasOnlineBooking: page.hasOnlineBooking,
    copyrightYear: page.copyrightYear,
    staleCopyright: page.staleCopyright,
    mobilePerformanceScore,
    slowMobile,
    fetchError: html === null ? "homepage_fetch_failed" : null,
  };
}

export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx;
      idx += 1;
      out[i] = await fn(items[i]!);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return out;
}
