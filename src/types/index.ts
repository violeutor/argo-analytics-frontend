// ── Enums ─────────────────────────────────────────────────────────────────────

export type SRRCategory =
  | "Low Strategic"
  | "High Strategic"
  | "Transformational"
  | "Transformational++";

export type MFRSignal = "Feasible" | "Watch" | "Overstretch";
export type CapSegment = "low" | "mid" | "high";
export type DealRating = "A · No-Brainer" | "B · Solide" | "C · Abwägen" | "D · Uninteressant";
export type DealQuadrant =
  | "HighPotential_LowRisk"
  | "HighPotential_HighRisk"
  | "LowPotential_LowRisk"
  | "LowPotential_HighRisk";

export type InvestmentPath =
  | "IPO-direkt"
  | "Käufer-Proxy"
  | "ETF-Proxy"
  | "Enabler"
  | "Beobachten"
  | "Archiv";

export type CompanySource = "bestand" | "woche1" | "woche2" | "manual";

// ── Scoring ───────────────────────────────────────────────────────────────────

export interface SRRResult {
  value: number;
  category: SRRCategory;
  cap_segment: CapSegment;
  execution_warning: boolean;
}

export interface MFRResult {
  value: number;
  signal: MFRSignal;
}

export interface TechReadinessResult {
  value: number;
  factor_scores: {
    tech_stack_fit: number;
    gtm_fit: number;
    integration_capacity: number;
    rd_intensity: number;
    capital_deployment_velocity: number;
    regulatory_readiness: number;
    strategic_coherence: number;
  };
}

export interface ScoreResult {
  srr: SRRResult;
  mfr: MFRResult;
  tech_readiness: TechReadinessResult;
  deal_success_score: number;
  rating: DealRating;
  quadrant: DealQuadrant;
}

export interface AnalyzeResponse {
  deal_id: string | null;
  company_name: string;
  buyer_name: string;
  scores: ScoreResult;
  executive_summary: string;
  warnings: string[];
}

// ── Company (from DB / Matrix) ────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  category: string | null;
  potential: string | null;
  risk: string | null;
  ipo_potential: string | null;
  investment_path: InvestmentPath | null;
  proxy_ticker: string | null;
  funding_total_usd_mn: number | null;
  funding_last_round: string | null;
  last_signal: string | null;
  last_signal_date: string | null;
  source: CompanySource | null;
}

export interface Buyer {
  id: string;
  name: string;
  ticker: string | null;
  exchange: string | null;
  market_cap_usd_bn: number | null;
  sector: string | null;
}

// ── Yahoo Finance / Market Data ───────────────────────────────────────────────

export interface MarketData {
  ticker: string;
  name: string;
  price: number | null;
  market_cap_bn: number | null;
  pe_ratio: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  revenue_bn: number | null;
  ebitda_bn: number | null;
  debt_ebitda: number | null;
  is_listed: boolean;
  exchange: string | null;
  currency: string | null;
  last_updated: string;
}

// ── Investment Path (rendered) ────────────────────────────────────────────────

export interface InvestmentOpportunity {
  rank: number;
  path: InvestmentPath;
  title: string;             // e.g. "CRH · NYSE"
  description: string;
  rating: DealRating | null;
  deal_success_score: number | null;
  srr: number | null;
  mfr: number | null;
  tech_readiness: number | null;
  market_data: MarketData | null;
  notes: string;
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchResult {
  company: Company;
  investment_opportunities: InvestmentOpportunity[];
  analysis: AnalyzeResponse | null;
  ipo_probability: number | null;   // 0–1, derived from ipo_potential + stage
  is_publicly_listed: boolean;
  public_ticker: string | null;
  market_data: MarketData | null;
}

// ── Watchlist ─────────────────────────────────────────────────────────────────

export interface WatchlistFilters {
  potential?: string;
  ipo_potential?: string;
  investment_path?: InvestmentPath;
  rating?: string;
  source?: CompanySource;
  search?: string;
}
