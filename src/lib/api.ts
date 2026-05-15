import type {
  Company,
  Buyer,
  AnalyzeResponse,
  MarketData,
  SearchResult,
  InvestmentOpportunity,
  DealRating,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const YAHOO_PROXY = "/api/market"; // Next.js API route (avoids CORS)

// ── Backend ───────────────────────────────────────────────────────────────────

export async function fetchCompanies(params?: {
  limit?: number;
  source?: string;
}): Promise<Company[]> {
  const url = new URL(`${API_BASE}/api/v1/companies`);
  if (params?.limit) url.searchParams.set("limit", String(params.limit));
  if (params?.source) url.searchParams.set("source", params.source);
  const res = await fetch(url.toString(), { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`companies fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchBuyers(): Promise<Buyer[]> {
  const res = await fetch(`${API_BASE}/api/v1/buyers`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`buyers fetch failed: ${res.status}`);
  return res.json();
}

export async function runAnalyze(payload: {
  company_name: string;
  buyer_name: string;
  tam_usd_bn: number;
  buyer_market_cap_usd_bn: number;
  buyer_cash_usd_bn?: number;
  buyer_debt_ebitda?: number;
  target_funding_usd_mn?: number;
  target_stage?: string;
}): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE}/api/v1/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`analyze failed: ${res.status}`);
  return res.json();
}

// ── Yahoo Finance (via proxy route) ──────────────────────────────────────────

export async function fetchMarketData(
  ticker: string
): Promise<MarketData | null> {
  try {
    const res = await fetch(
      `${YAHOO_PROXY}?ticker=${encodeURIComponent(ticker)}`,
      { next: { revalidate: 900 } } // 15 min cache
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Search orchestration ──────────────────────────────────────────────────────

const IPO_PROBABILITY: Record<string, number> = {
  Hoch: 0.75,
  "Mittel-hoch": 0.55,
  Mittel: 0.35,
  Niedrig: 0.1,
  "IPO erfolgt": 1.0,
};

const RATING_ORDER: Record<DealRating, number> = {
  "A · No-Brainer": 1,
  "B · Solide": 2,
  "C · Abwägen": 3,
  "D · Uninteressant": 4,
};

export async function searchCompany(query: string): Promise<SearchResult | null> {
  const companies = await fetchCompanies({ limit: 500 });
  const q = query.trim().toLowerCase();

  // Match by name or ticker fragment
  const company = companies.find(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.proxy_ticker?.toLowerCase().includes(q)
  );
  if (!company) return null;

  const buyers = await fetchBuyers();

  // Determine if publicly listed
  const isListed =
    company.investment_path === "IPO-direkt" ||
    company.ipo_potential === "IPO erfolgt";

  const publicTicker = isListed ? company.proxy_ticker : null;

  // Market data for listed company
  const marketData = publicTicker
    ? await fetchMarketData(publicTicker.split(" ")[0])
    : null;

  // IPO probability
  const ipoProbability =
    IPO_PROBABILITY[company.ipo_potential ?? ""] ?? null;

  // Build investment opportunities
  const opportunities: InvestmentOpportunity[] = [];

  // 1. Direct IPO / public listing
  if (isListed && company.proxy_ticker) {
    opportunities.push({
      rank: 1,
      path: "IPO-direkt",
      title: company.proxy_ticker,
      description: "Direktinvestment — Titel ist börsennotiert",
      rating: null,
      deal_success_score: null,
      srr: null,
      mfr: null,
      tech_readiness: null,
      market_data: marketData,
      notes: "Kein M&A-Risiko einzupreisen — direkter Marktzugang.",
    });
  }

  // 2. Upcoming IPO
  if (!isListed && (company.ipo_potential === "Hoch" || company.ipo_potential === "Mittel-hoch")) {
    opportunities.push({
      rank: 2,
      path: "IPO-direkt",
      title: company.proxy_ticker ?? "IPO ausstehend",
      description: `IPO-Wahrscheinlichkeit: ${Math.round((ipoProbability ?? 0) * 100)}%`,
      rating: null,
      deal_success_score: null,
      srr: null,
      mfr: null,
      tech_readiness: null,
      market_data: null,
      notes: company.funding_last_round ?? "",
    });
  }

  // 3. Buyer proxies — run analyze for each relevant buyer
  if (company.investment_path === "Käufer-Proxy" && company.proxy_ticker) {
    const proxyTickers = company.proxy_ticker.split("/").map((t) => t.trim());

    for (const proxyTicker of proxyTickers) {
      const tickerSymbol = proxyTicker.split("·")[0].trim();
      const buyer = buyers.find((b) => b.ticker === tickerSymbol);
      if (!buyer || !buyer.market_cap_usd_bn) continue;

      // Run scoring
      let analysis: AnalyzeResponse | null = null;
      try {
        analysis = await runAnalyze({
          company_name: company.name,
          buyer_name: buyer.name,
          tam_usd_bn: 100, // fallback — real TAM from scraper in Phase 2
          buyer_market_cap_usd_bn: buyer.market_cap_usd_bn,
          buyer_cash_usd_bn: buyer.market_cap_usd_bn * 0.05,
          buyer_debt_ebitda: 1.5,
          target_funding_usd_mn: company.funding_total_usd_mn ?? 50,
          target_stage: "series_b",
        });
      } catch {
        // continue without score
      }

      const buyerMarketData = buyer.ticker
        ? await fetchMarketData(buyer.ticker)
        : null;

      opportunities.push({
        rank: 3,
        path: "Käufer-Proxy",
        title: proxyTicker,
        description: `${buyer.name} als strategischer Käufer`,
        rating: analysis?.scores.rating ?? null,
        deal_success_score: analysis?.scores.deal_success_score ?? null,
        srr: analysis?.scores.srr.value ?? null,
        mfr: analysis?.scores.mfr.value ?? null,
        tech_readiness: analysis?.scores.tech_readiness.value ?? null,
        market_data: buyerMarketData,
        notes: analysis?.scores.srr.category ?? "",
      });
    }
  }

  // 4. ETF / Enabler proxies
  if (
    company.investment_path === "ETF-Proxy" ||
    company.investment_path === "Enabler"
  ) {
    const md = company.proxy_ticker
      ? await fetchMarketData(company.proxy_ticker.split("·")[0].trim())
      : null;
    opportunities.push({
      rank: 4,
      path: company.investment_path,
      title: company.proxy_ticker ?? "—",
      description:
        company.investment_path === "ETF-Proxy"
          ? "Thematischer ETF — indirektes Exposure"
          : "Enabler — Profiteur entlang der Supply Chain",
      rating: null,
      deal_success_score: null,
      srr: null,
      mfr: null,
      tech_readiness: null,
      market_data: md,
      notes: "",
    });
  }

  // Sort by rating, then by deal_success_score desc
  opportunities.sort((a, b) => {
    const ra = a.rating ? RATING_ORDER[a.rating] : 99;
    const rb = b.rating ? RATING_ORDER[b.rating] : 99;
    if (ra !== rb) return ra - rb;
    return (b.deal_success_score ?? 0) - (a.deal_success_score ?? 0);
  });

  // Re-rank after sort
  opportunities.forEach((o, i) => (o.rank = i + 1));

  return {
    company,
    investment_opportunities: opportunities,
    analysis: null, // set by caller if needed
    ipo_probability: ipoProbability,
    is_publicly_listed: isListed,
    public_ticker: publicTicker,
    market_data: marketData,
  };
}

// ── New unified search endpoint ───────────────────────────────────────────────

export interface SupplyChainItem {
  ticker: string;
  name: string;
  exchange?: string;
  role: string;
  relevance: number;
}

export interface BuyerScore {
  buyer_name: string;
  ticker: string | null;
  exchange: string | null;
  market_cap_usd_bn: number | null;
  srr_value: number;
  srr_category: string;
  mfr_value: number;
  mfr_signal: string;
  tech_readiness: number;
  deal_success_score: number;
  rating: string;
  execution_warning: boolean;
}

export interface TAMResult {
  tam_usd_bn: number;
  source: string;
  confidence: string;
  method: string;
}

export interface FullSearchResponse {
  company_name: string;
  category: string | null;
  potential: string | null;
  risk: string | null;
  ipo_potential: string | null;
  investment_path: string | null;
  proxy_ticker: string | null;
  funding_total_usd_mn: number | null;
  funding_last_round: string | null;
  last_signal: string | null;
  last_signal_date: string | null;
  source: string | null;
  description: string | null;
  tam: TAMResult;
  supply_chain: {
    upstream: SupplyChainItem[];
    downstream: SupplyChainItem[];
    etfs: { ticker: string; name: string; relevance: number }[];
  };
  buyer_scores: BuyerScore[];
  is_known: boolean;
  enriched: boolean;
  warnings: string[];
}

export async function searchCompanyFull(query: string): Promise<FullSearchResponse> {
  const res = await fetch(`${API_BASE}/api/v1/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`search failed: ${res.status}`);
  return res.json();
}
