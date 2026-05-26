"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ValueDriverEntry {
  type: string; ticker: string; name: string; exchange?: string;
  role: string; relevance: number;
  dependency_level?: string; market_position?: string; partnership_likely?: boolean;
  exposure_level?: string; grows_independently?: string; existing_relationship?: boolean;
  context?: string;
  price?: number; market_cap_bn?: number; currency?: string; yahoo_symbol?: string;
}
interface ETFEntry { ticker: string; name: string; relevance: number; }
interface ValueDriversData {
  status: string; company_name: string;
  enablers: ValueDriverEntry[]; contributors: ValueDriverEntry[]; etfs: ETFEntry[];
  enriched_at?: string;
}
interface OwnershipItem { name: string; type: string; role?: string; notes?: string }
interface MarketSegment { name: string; share_pct: number; note?: string }
interface RegionalBreakdown { region: string; share_pct: number }
interface MarketData {
  status?: string;
  tam_2035_usd_bn?: number;
  cagr_pct?: number;
  tam_segments?: MarketSegment[];
  growth_drivers?: string[];
  regional_breakdown?: RegionalBreakdown[];
  regional_sources?: string[];
  sam_usd_bn?: number;
  sam_confidence?: string;
  sam_note?: string;
  sam_geo_factor?: number;
  sam_tech_filter?: number;
  competition_score?: string;
  competition_note?: string;
  market_cycle?: string;
  market_cycle_note?: string;
  enriched_at?: string;
}
interface OwnershipEntryPipeline {
  name: string;
  type?: string;
  role?: string;
  share_pct?: number;
  source?: string;
  as_of_date?: string;
  notes?: string;
}
interface CapTableScore {
  score: number;
  label: string;
  note: string;
}
interface OwnershipData {
  status: string;              // ready | manual | pending | running | error
  region?: string;             // US | DE
  source_used?: string;        // edgar | openregister | manual | none
  entries: OwnershipEntryPipeline[];
  cap_table?: CapTableScore;
  enriched_at?: string;
}

interface FundingRoundItem {
  date?: string; type?: string; amount_usd_mn?: number;
  lead_investor?: string; co_investors?: string[];
  source?: string; notes?: string;
}
interface SignalItem {
  id?: string;
  event_type: string;
  event_date: string;
  summary: string;
  source: string;
  source_url?: string;
  severity: "high" | "medium" | "low";
  raw_title?: string;
  is_read?: boolean;
  direction?: "positive" | "negative" | "neutral";
  signal_category?: string;
  relevance_score?: number;    // 0.0–1.0 aus Claude-NER confidence
  source_domain?: string;      // z.B. 'techcrunch.com'
  funding_amount_usd_mn?: number;  // B-05: extrahierter Betrag
}
interface SignalsData {
  status: "ready" | "empty";
  company_name: string;
  signals: SignalItem[];
  count: number;
}

interface PeerCompany {
  id: string; name: string; category?: string; industry?: string;
  region?: string; headquarters?: string; founding_year?: number;
  headcount?: number; funding_total_usd_mn?: number; funding_stage?: string;
  funding_last_round?: string; ipo_status?: string; ipo_potential?: string;
  investment_path?: string; revenue_usd_mn?: number; description?: string;
  website?: string; ticker?: string; exchange?: string; stage_normalized?: string;
  positioning_note?: string;   // R-10: Claude-generiert, relativ zu Subject Company
}
interface PeerBenchmark {
  metric: string; company_value?: string; peer_median?: string;
  unit?: string; note?: string;
}
interface PeersResponse {
  status: "ready" | "generating" | "empty";
  company_name: string;
  peers: PeerCompany[];
  benchmark: PeerBenchmark[];
  generated_at?: string;
  from_cache: boolean;
}

interface FundamentalsData {
  is_listed: boolean; ticker?: string; exchange?: string;
  price?: number; market_cap_bn?: number; pe_ratio?: number;
  revenue_bn?: number; ebitda_bn?: number; debt_ebitda?: number;
  week_52_high?: number; week_52_low?: number; currency?: string;
  gross_margin_pct?: number; operating_margin_pct?: number; profit_margin_pct?: number;
  revenue_growth_pct?: number; earnings_growth_pct?: number;
  free_cashflow_bn?: number; operating_cashflow_bn?: number;
  ev_revenue?: number; ev_ebitda?: number; enterprise_value_bn?: number;
  // BA-Bridge (private DE)
  ba_found?: boolean; ba_revenue_mn?: number; ba_ebitda_mn?: number;
  ba_ebit_eur_mn?: number; ba_net_income_eur_mn?: number;
  ba_equity_mn?: number; ba_total_assets_mn?: number; ba_employees?: number;
  ba_legal_form?: string; ba_registered_at?: string;
  ba_last_report_year?: string; ba_source_url?: string;
  // Beta (YH-06)
  beta_1y?: number; beta_3y?: number; volatility_30d?: number;
  beta_source?: string;           // 'market' | 'damodaran'
  beta_benchmark?: string;        // '^GDAXI', '^GSPC', 'Damodaran · Power'
  beta_benchmark_is_fallback?: boolean;
  beta_calculated_at?: string;    // ISO 8601
  beta_data_quality?: string;     // 'full' | 'partial'
  // FD-01 Routing (FD-04 Herkunfts-Badge)
  fundamentals_source?: string;           // 'yahoo' | 'ba_bridge' | 'edgar' | 'none'
  fundamentals_source_secondary?: string;
  fundamentals_quality_flag?: string;     // 'partial' | 'no_data'
  extraction_confidence?: string;         // BA-09: 'full' | 'partial' | 'balance_only' | 'not_found'
}
interface TechReadinessDetail {
  overall: number; inputs_provided: boolean;
  factors: Record<string, number>; factor_weights: Record<string, number>;
  confidence?: string; // listed | auto_low | auto_medium | auto_high | user
}
interface ScoringDetail {
  buyer_name: string; ticker?: string;
  srr_value: number; srr_category: string;
  mfr_value: number; mfr_signal: string;
  tech_readiness: TechReadinessDetail;
  deal_success_score: number; rating: string; execution_warning: boolean;
}
interface SupplyItem { ticker: string; name: string; exchange?: string; role: string; relevance: number }
interface CompanyDetail {
  name: string; category?: string; core_technology?: string;
  website?: string; intro: string; industry?: string; risk?: string;
  founded?: string; headquarters?: string; employee_count?: string;
  product_description?: string; description?: string; technology_tags: string[];
  tam_usd_bn: number; tam_source: string; tam_confidence: string;
  ipo_status?: string; ipo_potential?: string; ipo_probability_pct?: number;
  investment_path?: string; proxy_ticker?: string;
  proxy_beta_1y?: number; proxy_beta_benchmark?: string; proxy_beta_source?: string;
  funding_total_usd_mn?: number; funding_last_round?: string; funding_stage?: string;
  funding_rounds: FundingRoundItem[];
  ownership: OwnershipItem[]; fundamentals: FundamentalsData;
  scorings: ScoringDetail[];
  supply_chain_upstream: SupplyItem[]; supply_chain_downstream: SupplyItem[];
  supply_chain_etfs: { ticker: string; name: string; relevance: number }[];
  last_signal?: string; last_signal_date?: string;
  market_data?: MarketData;
  scores?: CompanyScores;
  is_known: boolean; warnings: string[];
}

interface CompanyScores {
  financial_score?: number;
  strategic_score?: number;
  market_score?: number;
  risk_score?: number;
  ownership_score?: number;
  value_driver_score?: number;
  ipo_score?: number;
  ma_score?: number;
  etf_score?: number;
  enabler_score?: number;
  composite_score?: number;
  compound_risk_score?: number;  // SC-10: gewichteter 6D-Compound Risk
  hero_path?: string;       // 'ipo' | 'm_and_a' | 'etf' | 'enabler'
  hero_score?: number;
  hero_path_label?: string; // 'IPO' | 'M&A' | 'ETF-Proxy' | 'Enabler'
  rating?: string;          // 'A' | 'B' | 'C' | 'D'
  confidence?: string;
  computed_at?: string;
}

// ── Design tokens (Mockup v2) ─────────────────────────────────────────────────

const C = {
  // Hintergrundfarben aufgehellt
  bg: "#181B20", bgCard: "#1F2328", bgHover: "#272C33",
  border: "rgba(255,255,255,0.08)", borderMd: "rgba(255,255,255,0.13)",
  teal: "#00D4A0", tealDim: "rgba(0,212,160,0.08)", tealBorder: "rgba(0,212,160,0.20)",
  blue: "#3B6EF0", blueDim: "rgba(59,110,240,0.10)",
  amber: "#F0A500", amberDim: "rgba(240,165,0,0.10)",
  red: "#F04545", redDim: "rgba(240,69,69,0.10)",
  purple: "#9B6EF0", purpleDim: "rgba(155,110,240,0.10)",
  // t2 + t3 heller — Labels und Überschriften besser lesbar
  t1: "#F0F0EE", t2: "#B0B2B0", t3: "#6A6C6A",
  // Kein DM Mono mehr — DM Sans durchgängig
  mono: "'DM Sans',sans-serif",
  display: "'Plus Jakarta Sans',sans-serif",
  body: "'DM Sans',sans-serif",
  rSm: "6px", rMd: "10px", rLg: "14px",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n?: number | null, d = 2, pre = "") =>
  n == null ? "—" : `${pre}${n.toFixed(d)}`;
const fmtBn = (n?: number | null) =>
  n == null ? "—" : n >= 1 ? `$${n.toFixed(1)}B` : `$${(n * 1000).toFixed(0)}M`;
const fmtM = (n?: number | null) =>
  n == null ? "—" : n >= 1000 ? `$${(n / 1000).toFixed(1)}B` : `$${n}M`;
const ratingColor = (r: string) =>
  r.startsWith("A") ? C.teal : r.startsWith("B") ? C.blue : r.startsWith("C") ? C.amber : C.red;
const mfrColor = (s: string) =>
  s === "Feasible" ? C.teal : s === "Watch" ? C.amber : C.red;
const confColor = (c: string) =>
  c === "high" ? C.teal : c === "medium" ? C.amber : C.red;
const PATH_COLORS: Record<string, string> = {
  "IPO": C.teal, "IPO-direkt": C.teal, "Käufer-Proxy": C.blue,
  "ETF-Proxy": C.amber, "Enabler": C.purple, "Beobachten": C.t3, "Archiv": C.red,
};
const initials = (n: string) => n.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

// ── Components ────────────────────────────────────────────────────────────────

function Badge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", fontSize: 11, fontWeight: 500,
      padding: "3px 10px", borderRadius: 99, fontFamily: C.mono, letterSpacing: ".02em",
      color, background: bg, border: `1px solid ${border}`,
    }}>{label}</span>
  );
}

function SLabel({ text }: { text: string }) {
  return <div style={{ fontSize: 11, color: C.t2, fontFamily: C.body, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 12 }}>{text}</div>;
}

// FD-04 — Herkunfts-Badge je Datenblock
function SourceBadge({ source }: { source?: string }) {
  if (!source || source === "none") return null;
  const map: Record<string, { label: string; color: string }> = {
    yahoo:     { label: "Yahoo Finance", color: C.blue },
    ba_bridge: { label: "Bundesanzeiger", color: C.teal },
    edgar:     { label: "SEC EDGAR", color: C.purple },
  };
  const s = map[source];
  if (!s) return null;
  return (
    <span style={{
      fontSize: 10, padding: "2px 8px", borderRadius: 99, fontFamily: C.mono,
      color: s.color, background: s.color + "14", border: `1px solid ${s.color}33`,
    }}>{s.label}</span>
  );
}

// YH-06 — Beta-Badge mit Tooltip-Daten
function BetaBadge({ fd }: { fd: FundamentalsData }) {
  const [hover, setHover] = useState(false);
  if (fd.beta_1y == null) return <span style={{ color: C.t3, fontFamily: C.mono, fontSize: 13 }}>—</span>;

  const standDate = fd.beta_calculated_at
    ? new Date(fd.beta_calculated_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
    : null;
  const isDamodaran = fd.beta_source === "damodaran";
  const isPartial   = fd.beta_data_quality === "partial";
  const isFallback  = fd.beta_benchmark_is_fallback;
  const color       = isPartial || isFallback ? C.amber : C.t1;

  return (
    <div style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 600, color, cursor: "default", borderBottom: `1px dashed ${C.t3}` }}>
        β {fd.beta_1y.toFixed(2)}
        {(isPartial || isFallback) && <span style={{ color: C.amber, marginLeft: 4 }}>⚠</span>}
      </span>
      {hover && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: 0, zIndex: 200,
          background: C.bgCard, border: `1px solid ${C.borderMd}`, borderRadius: C.rMd,
          padding: "10px 14px", minWidth: 220, boxShadow: "0 4px 20px rgba(0,0,0,.5)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.t1, marginBottom: 8, fontFamily: C.mono }}>
            β {fd.beta_1y.toFixed(3)} {standDate ? `· Stand ${standDate}` : ""}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {[
              { k: "Benchmark", v: fd.beta_benchmark ?? "—" },
              { k: "Quelle", v: isDamodaran ? "Damodaran (Branchen-Beta)" : "yfinance" },
              { k: "Berechnung", v: isDamodaran ? "Unlevered Beta (NYU)" : "252 Handelstage" },
              ...(fd.beta_3y != null ? [{ k: "Beta 3Y", v: fd.beta_3y.toFixed(3) }] : []),
              ...(fd.volatility_30d != null ? [{ k: "Volatilität 30d", v: `${(fd.volatility_30d * 100).toFixed(1)}%` }] : []),
            ].map(row => (
              <div key={row.k} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <span style={{ fontSize: 10, color: C.t3 }}>{row.k}</span>
                <span style={{ fontSize: 10, color: C.t2, fontFamily: C.mono }}>{row.v}</span>
              </div>
            ))}
            {isFallback && (
              <div style={{ marginTop: 6, fontSize: 10, color: C.amber, borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>
                ⚠ Kein lokaler Index verfügbar · S&P 500 als Fallback
              </div>
            )}
            {isPartial && (
              <div style={{ marginTop: 4, fontSize: 10, color: C.amber }}>
                ⚠ Weniger als 200 Handelstage — Beta eingeschränkt aussagekräftig
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: C.rLg, padding: "18px 20px", ...style }}>
      {children}
    </div>
  );
}

function FundTile({ label, val, sub, color }: { label: string; val: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: C.rMd, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, fontFamily: C.display, color: color ?? C.t1, lineHeight: 1 }}>{val}</div>
      {sub && <div style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function InfoRow({ k, v, vColor }: { k: string; v: string; vColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, color: C.t2 }}>{k}</span>
      <span style={{ fontSize: 13, color: vColor ?? C.t1, fontWeight: 500 }}>{v}</span>
    </div>
  );
}

function FundingTimeline({ rounds }: { rounds: FundingRoundItem[] }) {
  if (!rounds || rounds.length === 0) return null;
  const STAGE_LABEL: Record<string, string> = {
    seed: "Seed", pre_seed: "Pre-Seed", series_a: "Series A", series_b: "Series B",
    series_c: "Series C", series_d: "Series D", series_d_plus: "Series D+",
    growth: "Growth", ipo: "IPO", debt: "Debt", grant: "Grant",
  };
  const normalizeType = (t?: string) => t ? (STAGE_LABEL[t.toLowerCase()] ?? STAGE_LABEL[t] ?? t) : "—";
  const dotColor = (t?: string) => {
    const n = normalizeType(t);
    return n === "IPO" ? C.teal : n.includes("C") || n.includes("D") || n === "Growth" ? C.teal : n.includes("B") ? C.blue : C.t3;
  };
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: C.rLg, padding: "18px 20px" }}>
      <SLabel text="Funding History" />
      {rounds.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0", borderBottom: i < rounds.length - 1 ? `1px solid ${C.border}` : "none" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor(r.type), flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: C.t1, fontWeight: 500, minWidth: 80 }}>{normalizeType(r.type)}</div>
          <div style={{ fontFamily: C.mono, fontSize: 12, color: C.teal, minWidth: 80 }}>{r.amount_usd_mn ? fmtM(r.amount_usd_mn) : "—"}</div>
          {r.lead_investor && <div style={{ fontSize: 11, color: C.t2, flex: 1 }}>{r.lead_investor}</div>}
          <div style={{ fontSize: 11, color: C.t3, fontFamily: C.mono, marginLeft: "auto" }}>{r.date ? r.date.slice(0, 7) : "—"}</div>
        </div>
      ))}
    </div>
  );
}

// ── KPI Timeline Modal ────────────────────────────────────────────────────────

interface KpiPoint { fiscal_year: number; value: number; currency?: string | null; source?: string; }

const KPI_META: Record<string, { label: string; format: (v: number, currency?: string | null) => string }> = {
  // Basis-Metriken — währungsneutral, currency-Feld bestimmt € oder $
  revenue_mn:      { label: "Umsatz",           format: (v, c) => `${c === "USD" ? "$" : "€"}${v.toFixed(1)}M`  },
  ebitda_mn:       { label: "EBITDA",            format: (v, c) => `${c === "USD" ? "$" : "€"}${v.toFixed(1)}M`  },
  ebit_mn:         { label: "EBIT",              format: (v, c) => `${c === "USD" ? "$" : "€"}${v.toFixed(1)}M`  },
  net_income_mn:   { label: "Jahresüberschuss",  format: (v, c) => `${c === "USD" ? "$" : "€"}${v.toFixed(1)}M`  },
  equity_mn:       { label: "Eigenkapital",      format: (v, c) => `${c === "USD" ? "$" : "€"}${v.toFixed(1)}M`  },
  total_assets_mn: { label: "Bilanzsumme",       format: (v, c) => `${c === "USD" ? "$" : "€"}${v.toFixed(1)}M`  },
  headcount:       { label: "Mitarbeiter",       format: (v)    => v.toLocaleString("de-DE")                      },
  // Derived Metriken (berechnet in kpi_timeseries.py — währungsunabhängig)
  ebitda_margin_pct:   { label: "EBITDA-Marge",      format: v => `${v.toFixed(1)}%`                             },
  equity_ratio_pct:    { label: "Eigenkapitalquote", format: v => `${v.toFixed(1)}%`                             },
  revenue_per_fte_k:   { label: "Revenue / Kopf",    format: (v, c) => `${c?.startsWith("USD") ? "$" : "€"}${v.toFixed(0)}k` },
  revenue_cagr_pct:    { label: "Umsatz-CAGR",       format: v => `${v.toFixed(1)}%/J`                           },
};

function KpiTimelineModal({
  metric, points, onClose,
}: { metric: string; points: KpiPoint[]; onClose: () => void }) {
  const meta   = KPI_META[metric] ?? { label: metric, format: (v: number) => String(v) };
  const sorted = [...points].sort((a, b) => a.fiscal_year - b.fiscal_year);

  // SVG dimensions
  const W = 420, H = 160;
  const PAD = { t: 16, r: 16, b: 32, l: 58 };
  const iW  = W - PAD.l - PAD.r;
  const iH  = H - PAD.t - PAD.b;

  const vals = sorted.map(p => p.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const rng  = maxV - minV || 1;

  const xS = (i: number) => PAD.l + (i / (sorted.length - 1 || 1)) * iW;
  const yS = (v: number) => PAD.t + iH - ((v - minV) / rng) * iH;

  const pathD = sorted.map((p, i) =>
    `${i === 0 ? "M" : "L"} ${xS(i).toFixed(1)} ${yS(p.value).toFixed(1)}`
  ).join(" ");
  const areaD = `${pathD} L ${xS(sorted.length - 1).toFixed(1)} ${(PAD.t + iH).toFixed(1)} L ${PAD.l.toFixed(1)} ${(PAD.t + iH).toFixed(1)} Z`;

  const yTicks = [0, 0.5, 1].map(pct => ({
    y: PAD.t + iH - pct * iH,
    val: minV + pct * rng,
  }));

  const growth = sorted.length >= 2
    ? ((sorted[sorted.length - 1].value - sorted[0].value) / Math.abs(sorted[0].value || 1)) * 100
    : null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex",
               alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        style={{ background: C.bgCard, border: `1px solid ${C.borderMd}`, borderRadius: C.rLg,
                 padding: "24px 28px", width: 500, maxWidth: "92vw",
                 boxShadow: "0 24px 80px rgba(0,0,0,0.65)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: C.display, fontSize: 16, fontWeight: 700, color: C.t1 }}>
              {meta.label} · Verlauf
            </div>
            <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, marginTop: 3 }}>
              {sorted[0]?.source === "edgar_xbrl" ? "SEC EDGAR XBRL" : "Bundesanzeiger"} · {sorted.length} Datenpunkte · kpi_timeseries
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: C.rSm,
                     color: C.t3, fontSize: 16, padding: "3px 9px", cursor: "pointer", lineHeight: 1 }}
          >×</button>
        </div>

        {/* Growth badges */}
        {growth !== null && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            <span style={{
              padding: "4px 12px", borderRadius: 99, fontSize: 11, fontFamily: C.mono, fontWeight: 600,
              color: growth >= 0 ? C.teal : C.red,
              background: (growth >= 0 ? C.teal : C.red) + "18",
              border: `1px solid ${(growth >= 0 ? C.teal : C.red)}33`,
            }}>
              {growth >= 0 ? "↑" : "↓"} {Math.abs(growth).toFixed(1)}% · {sorted[0].fiscal_year}→{sorted[sorted.length - 1].fiscal_year}
            </span>
            <span style={{
              padding: "4px 12px", borderRadius: 99, fontSize: 11, fontFamily: C.mono,
              color: C.t2, background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
            }}>
              Aktuell: {meta.format(sorted[sorted.length - 1].value, sorted[sorted.length - 1].currency)} ({sorted[sorted.length - 1].fiscal_year})
            </span>
          </div>
        )}

        {/* SVG Line Chart */}
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: C.rMd, border: `1px solid ${C.border}`,
                      overflow: "hidden", marginBottom: 14 }}>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
            <defs>
              <linearGradient id={`kg_${metric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={C.teal} stopOpacity="0.28" />
                <stop offset="100%" stopColor={C.teal} stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Y-grid + labels */}
            {yTicks.map((t, i) => (
              <g key={i}>
                <line x1={PAD.l} y1={t.y} x2={W - PAD.r} y2={t.y}
                  stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <text x={PAD.l - 5} y={t.y + 4} textAnchor="end"
                  fill="rgba(255,255,255,0.28)" fontSize="9" fontFamily="DM Sans,sans-serif">
                  {metric === "headcount"
                    ? Math.round(t.val).toLocaleString("de-DE")
                    : `${t.val.toFixed(0)}M`}
                </text>
              </g>
            ))}

            {/* Area + Line */}
            {sorted.length > 1 && <>
              <path d={areaD} fill={`url(#kg_${metric})`} />
              <path d={pathD} fill="none" stroke={C.teal} strokeWidth="2.5"
                strokeLinejoin="round" strokeLinecap="round" />
            </>}

            {/* Points + X labels */}
            {sorted.map((p, i) => (
              <g key={i}>
                <circle cx={xS(i)} cy={yS(p.value)} r="3.5" fill={C.teal} />
                <circle cx={xS(i)} cy={yS(p.value)} r="8" fill={C.teal} fillOpacity="0.12" />
                <text x={xS(i)} y={H - 6} textAnchor="middle"
                  fill="rgba(255,255,255,0.35)" fontSize="9" fontFamily="DM Sans,sans-serif">
                  {p.fiscal_year}
                </text>
              </g>
            ))}
          </svg>
        </div>

        {/* Data table */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {sorted.map((p, i) => {
            const prev  = i > 0 ? sorted[i - 1].value : null;
            const delta = prev != null ? ((p.value - prev) / Math.abs(prev || 1)) * 100 : null;
            return (
              <div key={i} style={{ flex: 1, minWidth: 80, padding: "8px 10px", borderRadius: C.rSm,
                background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, textAlign: "center" }}>
                <div style={{ fontSize: 9, color: C.t3, fontFamily: C.mono, marginBottom: 3 }}>{p.fiscal_year}</div>
                <div style={{ fontSize: 13, fontWeight: 600, fontFamily: C.display, color: C.t1 }}>
                  {meta.format(p.value, p.currency)}
                </div>
                {delta !== null && (
                  <div style={{ fontSize: 9, fontFamily: C.mono, marginTop: 2,
                    color: delta >= 0 ? C.teal : C.red }}>
                    {delta >= 0 ? "↑" : "↓"}{Math.abs(delta).toFixed(1)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ScoringCard({ s, rank, showTR = true }: { s: ScoringDetail; rank: number; showTR?: boolean }) {
  const [open, setOpen] = useState(rank === 1);
  const rc = ratingColor(s.rating);
  const mc = mfrColor(s.mfr_signal);

  const trConfidenceLabel = (conf?: string) => {
    if (conf === "user")        return "✓ User-Input";
    if (conf === "auto_high")   return "Auto · High";
    if (conf === "auto_medium") return "Auto · Medium";
    if (conf === "auto_low")    return "Auto · Low";
    return "Auto";
  };
  const trConfidenceColor = (conf?: string) => {
    if (conf === "user")        return C.teal;
    if (conf === "auto_high")   return C.teal;
    if (conf === "auto_medium") return C.amber;
    return C.red;
  };

  const scoreTiles = [
    {
      label: "SRR — Strategic Relevance",
      val: `${s.srr_value.toFixed(2)}×`,
      desc: s.srr_category,
      color: C.teal,
      pct: Math.min(s.srr_value / 2, 1),
    },
    {
      label: "MFR — M&A Feasibility",
      val: `${s.mfr_value.toFixed(2)}×`,
      desc: `${s.mfr_signal === "Feasible" ? "🟢" : s.mfr_signal === "Watch" ? "🟡" : "🔴"} ${s.mfr_signal}`,
      color: mc,
      pct: s.mfr_value < 0.15 ? 0.9 : s.mfr_value < 0.5 ? 0.55 : 0.2,
    },
    ...(showTR ? [{
      label: "Tech Readiness",
      val: s.tech_readiness.overall.toFixed(2),
      desc: trConfidenceLabel(s.tech_readiness.confidence),
      color: trConfidenceColor(s.tech_readiness.confidence),
      pct: s.tech_readiness.overall,
    }] : []),
  ];

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${open ? C.borderMd : C.border}`, borderRadius: C.rLg, marginBottom: 10, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", cursor: "pointer" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: C.mono, fontSize: 14, fontWeight: 500, color: C.t1, display: "flex", alignItems: "center", gap: 8 }}>
            {s.ticker ? `Käufer-Proxy · ${s.ticker}` : s.buyer_name}
            {s.execution_warning && <span style={{ color: C.amber, fontSize: 11 }}>⚠</span>}
          </div>
          <div style={{ fontSize: 11, color: C.t2, marginTop: 3 }}>{s.buyer_name} · {s.srr_category}</div>
        </div>
        <span style={{ fontSize: 12, padding: "5px 14px", borderRadius: 99, fontFamily: C.mono, fontWeight: 600, color: rc, background: rc + "18", border: `1px solid ${rc}33` }}>{s.rating}</span>
      </div>
      {open && (
        <div style={{ padding: "0 20px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${scoreTiles.length},1fr)`, gap: 10, marginBottom: 12 }}>
            {scoreTiles.map(tile => (
              <div key={tile.label} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`, borderRadius: C.rMd, padding: "14px 16px" }}>
                <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{tile.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: C.display, color: tile.color }}>{tile.val}</div>
                <div style={{ fontSize: 11, color: C.t2, marginTop: 4 }}>{tile.desc}</div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, marginTop: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${tile.pct * 100}%`, background: tile.color, borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: rc + "0A", border: `1px solid ${rc}33`, borderRadius: C.rMd, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, color: C.t2, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".06em" }}>Gesamturteil</span>
            <span style={{ fontFamily: C.display, fontSize: 15, fontWeight: 700, color: rc }}>{s.rating}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function SupplyRow({ item, color }: { item: SupplyItem; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontFamily: C.mono, fontSize: 12, color, minWidth: 80 }}>{item.ticker}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: C.t1 }}>{item.name}</div>
        <div style={{ fontSize: 10, color: C.t3 }}>{item.role}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 60, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${item.relevance * 100}%`, background: color, borderRadius: 99 }} />
        </div>
        <span style={{ fontSize: 11, color: C.t2, fontFamily: C.mono }}>{Math.round(item.relevance * 100)}%</span>
      </div>
    </div>
  );
}

function Placeholder({ title, sub }: { title: string; sub: string }) {
  return (
    <Card>
      <SLabel text={title} />
      <div style={{ padding: "40px 0", textAlign: "center", color: C.t3, fontFamily: C.mono, fontSize: 12 }}>{sub}</div>
    </Card>
  );
}

// SC-10 — Tab-interner Score-Header mit Hover-Tooltip
function TabScoreBar({ label, score, tooltip }: { label: string; score?: number; tooltip: string }) {
  const [hover, setHover] = useState(false);
  if (score == null) return null;
  const color = score >= 7 ? C.teal : score >= 4 ? C.amber : C.red;
  return (
    <div
      style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, marginBottom: 14, cursor: "default", alignSelf: "flex-start" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</span>
      <span style={{
        fontSize: 12, fontWeight: 700, fontFamily: C.mono,
        color, background: color + "18", border: `1px solid ${color}33`,
        borderRadius: 99, padding: "2px 10px",
      }}>
        {score.toFixed(1)}
      </span>
      <span style={{ fontSize: 10, color: C.t3, opacity: 0.5 }}>ⓘ</span>
      {hover && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 200,
          background: C.bgCard, border: `1px solid ${C.borderMd}`, borderRadius: C.rMd,
          padding: "10px 14px", width: 240, boxShadow: "0 4px 20px rgba(0,0,0,.5)",
          fontSize: 11, color: C.t2, lineHeight: 1.6, pointerEvents: "none",
        }}>
          {tooltip}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const API_BASE = "/api/backend";
const TABS = ["Überblick", "Markt", "Ownership", "Fundamentals", "Potenziale & Risiken", "Peer Review", "Value Drivers", "Scoring & Investmentprofil", "Investitionspfade", "Signal History"];

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPage = searchParams?.get("from") ?? "watchlist";
  const name = decodeURIComponent((params?.name ?? "") as string);

  const [data, setData] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [starred, setStarred] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json"|"csv"|"pdf">("json");
  const [exportTabs, setExportTabs] = useState<Record<string,boolean>>({
    overview: true, market: true, ownership: true, fundamentals: true,
    assessments: true, peers: true, value_drivers: true, scoring: true,
    paths: true, signals: true,
  });

  // UX-01: Tab-Status Tracking — "ready" | "pending"
  const TAB_KEYS = ["overview","market","ownership","fundamentals","assessments","peers","value_drivers","scoring","paths","signals"] as const;
  type TabKey = typeof TAB_KEYS[number];
  const [tabReady, setTabReady] = useState<Record<TabKey, boolean>>({
    overview: false, market: false, ownership: false, fundamentals: false,
    assessments: false, peers: false, value_drivers: false, scoring: false,
    paths: false, signals: false,
  });
  const statusPollRef = useRef<number | null>(null);

  // Watchlist
  useEffect(() => {
    if (!name) return;
    const wl: string[] = JSON.parse(localStorage.getItem("argo_watchlist") ?? "[]");
    setStarred(wl.includes(name));
  }, [name]);

  // ── Zentraler Fetch-Orchestrator ─────────────────────────────────────────────
  // Alle DB-persistierten Daten werden parallel beim Load geholt.
  // Polling nur für Daten die aktiv berechnet werden (Market Enrichment, Value Drivers).
  const [ownershipData, setOwnershipData]       = useState<OwnershipData | null>(null);
  const [ownershipLoading, setOwnershipLoading] = useState(false);
  const [sigFilter, setSigFilter]               = useState<string>("all");
  const [signalsData, setSignalsData]           = useState<SignalsData | null>(null);
  const [signalsLoading, setSignalsLoading]     = useState(false);
  const [peersData, setPeersData]               = useState<PeersResponse | null>(null);
  const [peersLoading, setPeersLoading]         = useState(false);
  const [assessmentsData, setAssessmentsData]   = useState<any | null>(null);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
  const [valueDriversData, setValueDriversData] = useState<ValueDriversData | null>(null);
  const [kpiData, setKpiData]                   = useState<Record<string, KpiPoint[]> | null>(null);
  const [kpiModalMetric, setKpiModalMetric]     = useState<string | null>(null);

  const _f = (path: string) =>
    fetch(`${API_BASE}/api/v1/company/${encodeURIComponent(name)}${path}`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null);

  useEffect(() => {
    if (!name) return;

    // 1) Basis-Fetch (blocking — alles andere hängt davon ab)
    fetch(`${API_BASE}/api/v1/company/${encodeURIComponent(name)}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(d => {
        setData(d);

        // 2) Alle weiteren Endpoints parallel — kein lazy loading mehr
        setOwnershipLoading(true);
        setSignalsLoading(true);
        setPeersLoading(true);
        setAssessmentsLoading(true);

        Promise.allSettled([
          _f("/ownership").then(od  => od  && setOwnershipData(od)),
          _f("/signals").then(sd    => sd  && setSignalsData(sd)),
          _f("/peers").then(pd      => pd  && setPeersData(pd)),
          _f("/assessments").then(ad => {
            if (ad) setAssessmentsData(ad);
            else setAssessmentsData({ _error: "failed" });
          }),
          _f("/value-drivers").then(vd => vd && setValueDriversData(vd)),
          _f("/kpi-timeseries").then(kd => setKpiData(kd?.metrics ?? {})),
        ]).finally(() => {
          setOwnershipLoading(false);
          setSignalsLoading(false);
          setPeersLoading(false);
          setAssessmentsLoading(false);
        });
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [name]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Polling: nur für async-berechnete Daten ──────────────────────────────────
  // Market Enrichment: läuft async im Backend, kann 10–60s dauern
  useEffect(() => {
    if (!name || loading) return;
    const isReady = (md?: MarketData | null) =>
      md?.status === "ready" || (md?.sam_usd_bn != null && md?.enriched_at != null);
    if (isReady(data?.market_data)) return;

    let attempts = 0;
    const MAX = 8;
    const poll = () => {
      if (attempts++ >= MAX) return;
      _f("/market").then((md: MarketData | null) => {
        if (!md) return;
        setData(prev => prev ? { ...prev, market_data: md } : prev);
        if (!isReady(md) && attempts < MAX)
          timer = window.setTimeout(poll, 8000);
      });
    };
    let timer = window.setTimeout(poll, 4000);
    return () => window.clearTimeout(timer);
  }, [name, loading, data?.market_data?.sam_usd_bn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Value Drivers: Supply-Chain-Berechnung läuft async
  useEffect(() => {
    if (!name || loading) return;
    if (valueDriversData?.status === "ready" || valueDriversData?.status === "empty") return;

    let attempts = 0;
    const MAX = 5;
    const poll = () => {
      if (attempts++ >= MAX) return;
      _f("/value-drivers").then((vd: ValueDriversData | null) => {
        if (!vd) return;
        setValueDriversData(vd);
        if (vd.status !== "ready" && vd.status !== "empty" && attempts < MAX)
          vdTimer = window.setTimeout(poll, 8000);
      });
    };
    let vdTimer = window.setTimeout(poll, 3000);
    return () => window.clearTimeout(vdTimer);
  }, [name, loading, valueDriversData?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // UX-01: Tab-Dots — direkt aus State abgeleitet, kein separater Status-Endpoint nötig
  useEffect(() => {
    setTabReady({
      overview:      !!(data?.description && data?.market_data),
      market:        !!(data?.market_data?.sam_usd_bn),
      ownership:     !!(ownershipData && ownershipData.status !== "empty"),
      fundamentals:  !!(kpiData && Object.keys(kpiData).length > 0),
      assessments:   !!(assessmentsData && !assessmentsData._error),
      peers:         !!(peersData?.peers?.length),
      value_drivers: !!(valueDriversData?.status === "ready"),
      scoring:       !!(data?.scores),
      paths:         !!(data?.scores),
      signals:       !!(signalsData?.signals?.length),
    });
  }, [data, ownershipData, signalsData, peersData, assessmentsData, valueDriversData, kpiData]);

  // ── Export-Logik ─────────────────────────────────────────────────────────────
  const EXPORT_TAB_LABELS: Record<string, string> = {
    overview:      "Überblick",
    market:        "Markt",
    ownership:     "Ownership",
    fundamentals:  "Fundamentals",
    assessments:   "Potenziale & Risiken",
    peers:         "Peer Review",
    value_drivers: "Value Drivers",
    scoring:       "Scoring",
    paths:         "Investitionspfade",
    signals:       "Signal History",
  };

  const EXPORT_TAB_FIELDS: Record<string, string> = {
    overview:      "Name, Kategorie, Sektor, TAM, CAGR, Beschreibung, Tags",
    market:        "SAM, Wettbewerb, Marktzyklus, Wachstumstreiber",
    ownership:     "Investoren, Anteile, Funding-Runden",
    fundamentals:  "KPI-Zeitreihen (Revenue, EBITDA), Valuation",
    assessments:   "6D Scores, Opportunity & Risk Notes",
    peers:         "Wettbewerber, Positionierungsnotizen",
    value_drivers: "Enablers, Contributors, Buyers",
    scoring:       "Composite Score, Sub-Scores, Rating",
    paths:         "Investitionspfade, Hero Path, Path Scores",
    signals:       "Events, Datum, Quelle, Kategorie",
  };

  const buildExportPayload = () => {
    const payload: Record<string, any> = { company: data?.name, exported_at: new Date().toISOString() };
    if (exportTabs.overview && data) payload.overview = {
      name: data.name, category: data.company_category, industry: data.company_industry,
      founding_year: data.founding_year, headquarters: data.headquarters,
      headcount: data.headcount, description: data.description || data.intro,
      tags: data.technology_tags,
      tam_2035_usd_bn: data.market_data?.tam_2035_usd_bn,
      cagr_pct: data.market_data?.cagr_pct,
    };
    if (exportTabs.market && data?.market_data) payload.market = data.market_data;
    if (exportTabs.ownership) payload.ownership = {
      entries: ownershipData?.entries ?? [],
      funding_rounds: data?.funding_rounds ?? [],
    };
    if (exportTabs.fundamentals) payload.fundamentals = {
      kpi_timeseries: kpiData ?? {},
      funding_total: data?.funding_total,
      est_valuation: data?.est_valuation_usd_mn,
    };
    if (exportTabs.assessments && assessmentsData) payload.assessments = assessmentsData;
    if (exportTabs.peers && peersData) payload.peers = peersData;
    if (exportTabs.value_drivers && valueDriversData) payload.value_drivers = valueDriversData;
    if (exportTabs.scoring && data?.scores) payload.scoring = data.scores;
    if (exportTabs.paths && data?.scores) payload.paths = {
      hero_path: data.scores.hero_path,
      hero_path_label: data.scores.hero_path_label,
      hero_score: data.scores.hero_score,
    };
    if (exportTabs.signals && signalsData) payload.signals = signalsData.signals;
    return payload;
  };

  const doExport = () => {
    const payload = buildExportPayload();
    const slug = (data?.name ?? "export").toLowerCase().replace(/[^a-z0-9]+/g, "_");

    if (exportFormat === "json") {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${slug}_argo.json`; a.click();
      URL.revokeObjectURL(url);

    } else if (exportFormat === "csv") {
      const rows: string[][] = [["Tab", "Feld", "Wert"]];
      const add = (tab: string, key: string, val: any) => {
        if (val == null) return;
        const v = typeof val === "object" ? JSON.stringify(val) : String(val);
        rows.push([tab, key, v.replace(/"/g, '""')]);
      };
      if (payload.overview) Object.entries(payload.overview).forEach(([k,v]) => add("Überblick", k, v));
      if (payload.market) Object.entries(payload.market).forEach(([k,v]) => add("Markt", k, v));
      if (payload.scoring) Object.entries(payload.scoring).forEach(([k,v]) => add("Scoring", k, v));
      if (payload.signals) (payload.signals as any[]).forEach((s,i) =>
        Object.entries(s).forEach(([k,v]) => add(`Signal ${i+1}`, k, v)));
      if (payload.ownership?.entries) (payload.ownership.entries as any[]).forEach((e,i) =>
        Object.entries(e).forEach(([k,v]) => add(`Ownership ${i+1}`, k, v)));
      const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("
");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${slug}_argo.csv`; a.click();
      URL.revokeObjectURL(url);

    } else if (exportFormat === "pdf") {
      // Print-CSS-basiertes PDF — kein externe Library nötig
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(`<!DOCTYPE html><html><head>
        <meta charset="UTF-8"><title>${data?.name} · Argo Analytics</title>
        <style>
          body { font-family: -apple-system, sans-serif; font-size: 12px; color: #111; margin: 40px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          h2 { font-size: 14px; margin: 24px 0 8px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; color: #333; }
          .meta { color: #666; font-size: 11px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          td, th { border: 1px solid #e0e0e0; padding: 5px 8px; text-align: left; font-size: 11px; }
          th { background: #f5f5f5; font-weight: 600; }
          pre { background: #f8f8f8; padding: 8px; border-radius: 4px; font-size: 10px; white-space: pre-wrap; word-break: break-all; }
          @media print { body { margin: 20px; } }
        </style></head><body>`);
      win.document.write(`<h1>${data?.name}</h1>`);
      win.document.write(`<div class="meta">Argo Analytics Export · ${new Date().toLocaleDateString("de-DE")} · ${Object.keys(exportTabs).filter(k => exportTabs[k]).map(k => EXPORT_TAB_LABELS[k]).join(", ")}</div>`);

      const renderTable = (obj: Record<string, any>) => {
        let html = "<table><tr><th>Feld</th><th>Wert</th></tr>";
        for (const [k,v] of Object.entries(obj)) {
          if (v == null) continue;
          const val = typeof v === "object" ? `<pre>${JSON.stringify(v, null, 2)}</pre>` : String(v);
          html += `<tr><td>${k}</td><td>${val}</td></tr>`;
        }
        return html + "</table>";
      };

      if (payload.overview) { win.document.write(`<h2>Überblick</h2>${renderTable(payload.overview)}`); }
      if (payload.market)   { win.document.write(`<h2>Markt</h2>${renderTable(payload.market)}`); }
      if (payload.scoring)  { win.document.write(`<h2>Scoring</h2>${renderTable(payload.scoring)}`); }
      if (payload.assessments?.dimensions) {
        win.document.write("<h2>Potenziale & Risiken</h2><table><tr><th>Dimension</th><th>Opportunity</th><th>Risiko</th></tr>");
        (payload.assessments.dimensions as any[]).forEach((d: any) => {
          win.document.write(`<tr><td>${d.label ?? d.id}</td><td>${d.opportunity_note ?? "—"}</td><td>${d.risk_note ?? "—"}</td></tr>`);
        });
        win.document.write("</table>");
      }
      if (payload.signals?.length) {
        win.document.write("<h2>Signal History</h2><table><tr><th>Datum</th><th>Typ</th><th>Zusammenfassung</th></tr>");
        (payload.signals as any[]).slice(0, 20).forEach((s: any) => {
          win.document.write(`<tr><td>${s.event_date ?? "—"}</td><td>${s.event_type ?? "—"}</td><td>${s.summary ?? s.raw_title ?? "—"}</td></tr>`);
        });
        win.document.write("</table>");
      }
      win.document.write("</body></html>");
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 400);
    }
    setShowExport(false);
  };

  // ── Export Modal ──────────────────────────────────────────────────────────────
  const ExportModal = showExport ? (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={() => setShowExport(false)}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: 28, width: 520, maxHeight: "85vh", overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 20,
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.t1 }}>Export · {data?.name}</div>
          <button onClick={() => setShowExport(false)} style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        {/* Format */}
        <div>
          <div style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Format</div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["json","csv","pdf"] as const).map(f => (
              <button key={f} onClick={() => setExportFormat(f)} style={{
                flex: 1, padding: "8px 0", borderRadius: 6, fontSize: 12, fontWeight: 600,
                cursor: "pointer", fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".04em",
                border: exportFormat === f ? `1px solid ${C.teal}` : `1px solid ${C.border}`,
                background: exportFormat === f ? C.teal + "18" : "transparent",
                color: exportFormat === f ? C.teal : C.t2,
                transition: "all .15s",
              }}>
                {f === "json" ? "JSON" : f === "csv" ? "CSV" : "PDF"}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 6 }}>
            {exportFormat === "json" && "Vollständige Datenstruktur — ideal für Weiterverarbeitung"}
            {exportFormat === "csv" && "Flache Tabelle — ideal für Excel"}
            {exportFormat === "pdf" && "Printoptimierter Report — ideal für Präsentationen & Deal Memos"}
          </div>
        </div>

        {/* Tab-Selektion */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: C.t3, textTransform: "uppercase", letterSpacing: ".06em" }}>Inhalte</div>
            <button onClick={() => {
              const allOn = Object.values(exportTabs).every(Boolean);
              setExportTabs(Object.fromEntries(Object.keys(exportTabs).map(k => [k, !allOn])) as any);
            }} style={{ background: "none", border: "none", color: C.teal, fontSize: 11, cursor: "pointer", fontFamily: C.body }}>
              {Object.values(exportTabs).every(Boolean) ? "Alle abwählen" : "Alle auswählen"}
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {Object.keys(exportTabs).map(key => (
              <label key={key} style={{
                display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px",
                borderRadius: 6, cursor: "pointer",
                background: exportTabs[key] ? C.teal + "0A" : "transparent",
                border: `1px solid ${exportTabs[key] ? C.teal + "30" : "transparent"}`,
                transition: "all .1s",
              }}>
                <input type="checkbox" checked={exportTabs[key]} onChange={e =>
                  setExportTabs(prev => ({ ...prev, [key]: e.target.checked }))
                } style={{ marginTop: 2, accentColor: C.teal }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.t1 }}>{EXPORT_TAB_LABELS[key]}</div>
                  <div style={{ fontSize: 11, color: C.t3, marginTop: 1 }}>{EXPORT_TAB_FIELDS[key]}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Export-Button */}
        <button onClick={doExport} style={{
          background: C.teal, border: "none", borderRadius: 8, color: "#000",
          fontSize: 13, fontWeight: 700, padding: "11px 0", cursor: "pointer",
          fontFamily: C.body, transition: "opacity .15s",
          opacity: Object.values(exportTabs).some(Boolean) ? 1 : 0.4,
        }}
          disabled={!Object.values(exportTabs).some(Boolean)}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          ↓ {exportFormat.toUpperCase()} exportieren
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.t1, fontFamily: C.body, fontSize: 15 }}>
      {ExportModal}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: rgba(0,212,160,0.2); }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        button { font-family: inherit; }
      `}</style>

      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: 52, borderBottom: `1px solid ${C.border}`,
        background: "rgba(13,15,18,0.97)", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => router.push("/")}>
          <div style={{ width: 28, height: 28, background: C.teal, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: C.display, fontWeight: 700, fontSize: 13, color: C.bg }}>A</div>
          <div>
            <div style={{ fontFamily: C.display, fontWeight: 600, fontSize: 15, color: C.t1 }}>Argo Analytics</div>
            <div style={{ fontSize: 10, color: C.t3, letterSpacing: ".04em" }}>Investment Intelligence</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.t3 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.teal }} />
          Live · Research
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "1.5rem 2.5rem 4rem" }}>

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            {[120, 60, 180].map((h, i) => (
              <div key={i} style={{ height: h, background: C.bgCard, borderRadius: C.rLg, border: `1px solid ${C.border}`, opacity: 0.5 }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{ padding: "16px 20px", background: C.redDim, border: `1px solid ${C.red}33`, borderRadius: C.rMd, color: C.red, marginTop: 16 }}>
            Unternehmen nicht gefunden: {error}
          </div>
        )}

        {data && !loading && (<>

          {/* Back + breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <button onClick={() => fromPage === "research" ? router.back() : router.push("/")} style={{ background: "none", border: `1px solid ${C.borderMd}`, borderRadius: C.rSm, color: C.t2, fontSize: 12, padding: "5px 12px", cursor: "pointer" }}>
              ← Zurück
            </button>
            <span style={{ fontSize: 11, color: C.t3 }}>ANALYSE · {data.name.toUpperCase()}</span>
          </div>

          {/* Company Header */}
          <div style={{ background: C.bgCard, border: `1px solid ${C.borderMd}`, borderRadius: C.rLg, padding: "20px 24px", marginBottom: 16 }}>

            {/* Row 1: Name + Public/Private + Star + Rating */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: C.display, fontSize: 22, fontWeight: 700, color: C.t1 }}>{data.name}</span>
                <span style={{
                  fontSize: 11, padding: "2px 10px", borderRadius: 99, fontWeight: 500,
                  color: data.ipo_status === "listed" ? C.teal : C.t2,
                  background: data.ipo_status === "listed" ? C.tealDim : "rgba(255,255,255,0.05)",
                  border: `1px solid ${data.ipo_status === "listed" ? C.tealBorder : C.border}`,
                }}>
                  {data.ipo_status === "listed" ? "Public" : "Private"}
                </span>
                <button
                  onClick={() => {
                    const key = "argo_watchlist";
                    const wl: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
                    const idx = wl.indexOf(data.name);
                    if (idx >= 0) wl.splice(idx, 1); else wl.push(data.name);
                    localStorage.setItem(key, JSON.stringify(wl));
                    setStarred(idx < 0);
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: starred ? C.amber : C.t3, padding: "2px 4px", transition: "color .15s", lineHeight: 1 }}
                  title={starred ? "Aus Watchlist entfernen" : "Zur Watchlist hinzufügen"}
                >
                  {starred ? "★" : "☆"}
                </button>
                <button
                  onClick={() => setShowExport(true)}
                  style={{ background: "none", border: `1px solid ${C.border}`, cursor: "pointer",
                    fontSize: 12, color: C.t2, padding: "4px 12px", borderRadius: 6,
                    transition: "all .15s", fontFamily: C.body, fontWeight: 500,
                    display: "flex", alignItems: "center", gap: 5 }}
                  title="Daten exportieren"
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.teal; (e.currentTarget as HTMLButtonElement).style.color = C.teal; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.t2; }}
                >
                  ↓ Export
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {(data.scores?.rating ?? data.scorings[0]?.rating) && (() => {
                  const rating   = data.scores?.rating ?? data.scorings[0]?.rating ?? "";
                  const heroLbl  = data.scores?.hero_path_label;
                  const heroScr  = data.scores?.hero_score;
                  const heroPath = data.scores?.hero_path;
                  const rc = ratingColor(rating);
                  // Pfad-Farbe je hero_path
                  const HERO_PATH_COLOR: Record<string, string> = {
                    ipo: C.teal, m_and_a: C.blue, etf: C.amber, enabler: C.purple,
                  };
                  const hc = HERO_PATH_COLOR[heroPath ?? ""] ?? C.t2;
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {heroLbl && heroScr != null && (
                        <span style={{
                          fontSize: 11, padding: "3px 10px", borderRadius: 99,
                          fontFamily: C.mono, fontWeight: 600, letterSpacing: ".02em",
                          color: hc, background: hc + "18", border: `1px solid ${hc}33`,
                          display: "inline-flex", alignItems: "center", gap: 5,
                        }}>
                          {heroLbl}
                          <span style={{ opacity: 0.5 }}>·</span>
                          {heroScr.toFixed(1)}
                        </span>
                      )}
                      <span style={{ fontSize: 12, padding: "5px 14px", borderRadius: 99, fontWeight: 600, color: rc, background: rc + "18", border: `1px solid ${rc}33` }}>
                        {rating}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Row 2: Ticker+Exchange (public) OR Technologie+Series (private) */}
            <div style={{ fontSize: 12, color: C.t2, marginBottom: 14, fontFamily: data.ipo_status === "listed" ? C.mono : C.body }}>
              {data.ipo_status === "listed"
                ? (() => {
                    // BUG-15: Ticker-Format normalisieren — "SIE·XETRA" → "SIE · Xetra"
                    // Yahoo-Suffix (.F, .DE, .L, .PA etc.) strippen — nur reinen Ticker zeigen
                    const rawTicker = data.fundamentals?.ticker?.split("·")[0]?.trim() ?? data.fundamentals?.ticker;
                    const ticker = rawTicker?.replace(/\.[A-Z]{1,2}$/i, "") ?? rawTicker;
                    const exchange = data.fundamentals?.exchange ?? data.fundamentals?.ticker?.split("·")[1]?.trim();
                    return [ticker, exchange].filter(Boolean).join(" · ") || data.proxy_ticker || "—";
                  })()
                : (() => {
                    // BUG-18: funding_stage Normalisierung — "series_c" → "Series C"
                    const stageMap: Record<string, string> = {
                      seed: "Seed", series_a: "Series A", series_b: "Series B",
                      series_c: "Series C", series_d: "Series D", series_d_plus: "Series D+",
                      pre_seed: "Pre-Seed", growth: "Growth", public: "Public",
                    };
                    const rawStage = data.funding_stage ?? "";
                    const stage = stageMap[rawStage] ?? rawStage;
                    return [data.core_technology ?? data.product_description, stage].filter(Boolean).join(" · ") || "—";
                  })()
              }
            </div>

            {/* Row 3: Badges */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {data.ipo_potential && data.ipo_status !== "listed" && (
                <Badge
                  label={`Potenzial: ${data.ipo_potential}`}
                  color={data.ipo_potential === "Hoch" ? C.teal : C.amber}
                  bg={data.ipo_potential === "Hoch" ? C.tealDim : C.amberDim}
                  border={data.ipo_potential === "Hoch" ? C.tealBorder : C.amber + "33"} />
              )}
              {data.ipo_potential && (
                <Badge
                  label={`Risiko: ${data.risk ?? "—"}`}
                  color={C.t2} bg="rgba(255,255,255,0.05)" border={C.border} />
              )}
              {data.ipo_status !== "listed" && data.ipo_potential && (
                <Badge
                  label={`IPO: ${data.ipo_potential}`}
                  color={C.blue} bg={C.blueDim} border={C.blue + "33"} />
              )}
              {data.investment_path && (
                <Badge
                  label={`Exposure: ${data.investment_path}`}
                  color={PATH_COLORS[data.investment_path] ?? C.t2}
                  bg={(PATH_COLORS[data.investment_path] ?? C.t2) + "18"}
                  border={(PATH_COLORS[data.investment_path] ?? C.t2) + "33"} />
              )}
            </div>

            {/* Row 4: Meta-Grid — Public vs. Private */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              {(data.ipo_status === "listed" ? [
                { label: "Marktcap", val: fmtBn(data.fundamentals?.market_cap_bn), color: C.t1 },
                { label: "Kurs", val: data.fundamentals?.price != null ? `${data.fundamentals.currency === "EUR" ? "€" : "$"}${data.fundamentals.price.toFixed(2)}` : "—", color: C.t1 },
                { label: "Sektor", val: data.industry ?? "—" },
                { label: "Kategorie", val: data.category ?? "—" },
                { label: "Exposure", val: data.investment_path ?? "—", color: PATH_COLORS[data.investment_path ?? ""] ?? C.t1 },
              ] : [
                { label: "Funding Total", val: fmtM(data.funding_total_usd_mn) },
                { label: "Letzte Runde", val: data.funding_last_round?.split(";")[0] ?? "—" },
                { label: "Sektor", val: data.industry ?? "—" },
                { label: "Kategorie", val: data.category ?? "—" },
                { label: "Exposure", val: data.investment_path ?? "—", color: PATH_COLORS[data.investment_path ?? ""] ?? C.t1 },
              ]).map(m => (
                <div key={m.label} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ fontSize: 10, color: C.t2, textTransform: "uppercase", letterSpacing: ".06em" }}>{m.label}</div>
                  <div style={{ fontSize: 13, color: (m as any).color ?? C.t1, fontWeight: 500 }}>{m.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Last signal */}
          {data.last_signal && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, padding: "8px 14px", background: C.amberDim, border: `1px solid ${C.amber}22`, borderRadius: C.rMd, fontSize: 12 }}>
              <span style={{ color: C.amber, fontSize: 10 }}>◆</span>
              <span style={{ color: C.t3, fontWeight: 400, fontFamily: C.mono }}>{data.last_signal_date}</span>
              <span style={{ color: C.t2 }}>{data.last_signal}</span>
            </div>
          )}

          {/* Tab Nav — UX-01: Dot-Indikator wenn Tab pending */}
          <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
            {TABS.map((tab, i) => {
              const key = TAB_KEYS[i];
              const isReady = tabReady[key];
              const isActive = activeTab === i;
              return (
                <button key={tab} onClick={() => setActiveTab(i)} style={{
                  padding: "9px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                  border: "none", background: "none", whiteSpace: "nowrap",
                  color: isActive ? C.teal : C.t2,
                  borderBottom: isActive ? `2px solid ${C.teal}` : "2px solid transparent",
                  marginBottom: -1, transition: "all .15s", fontFamily: C.body,
                  position: "relative", display: "flex", alignItems: "center", gap: 6,
                }}>
                  {tab}
                  {!isReady && (
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                      background: C.amber, opacity: 0.7,
                      animation: "pulse 2s infinite",
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab 0: Überblick */}
          {activeTab === 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
              {/* Linke Spalte: Intro */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(data.description || data.intro) && (
                  <Card>
                    <SLabel text="Einordnung" />
                    <div style={{ fontSize: 13, lineHeight: 1.7, color: C.t1 }}>
                      {data.description || data.intro}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 10, color: C.t3, fontFamily: C.mono }}>
                      ↳ Generated by Claude · Argo Analytics Intelligence Layer
                    </div>
                  </Card>
                )}
              </div>
              {/* Rechte Spalte: Unternehmen + Markt */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Card>
                  <SLabel text="Unternehmen" />
                  <InfoRow k="Gegründet" v={data.founded ?? "—"} />
                  <InfoRow k="Hauptsitz" v={data.headquarters ?? "—"} />
                  <InfoRow k="Mitarbeiter" v={data.employee_count ?? "—"} />
                  <InfoRow k="Sektor" v={data.industry ?? "—"} />
                  <InfoRow k="Kategorie" v={data.category ?? "—"} />
                  <div style={{ padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <span style={{ fontSize: 12, color: C.t2, flexShrink: 0 }}>Technologie</span>
                      <div style={{ textAlign: "right" }}>
                        {data.technology_tags.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "flex-end" }}>
                            {data.technology_tags.map(tag => (
                              <Badge key={tag} label={tag} color={C.teal} bg={C.tealDim} border={C.tealBorder} />
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: C.t1, fontWeight: 500 }}>
                            {data.core_technology ?? data.product_description ?? "—"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {data.website && <InfoRow k="Website" v={data.website} vColor={C.teal} />}
                </Card>
              </div>
            </div>
          )}

          {/* Tab 1: Markt */}
          {activeTab === 1 && (() => {
            const md = data.market_data;
            const cycleColor = (c?: string) =>
              c === "growth" ? C.teal : c === "early" ? C.blue : c === "consolidation" ? C.amber : c === "mature" ? C.purple : C.t2;
            const compColor = (c?: string) =>
              c === "low" ? C.teal : c === "medium" ? C.amber : c === "high" ? C.red : C.t3;
            const compDisplay = (c?: string) =>
              !c || c === "unknown" ? "—" : c.charAt(0).toUpperCase() + c.slice(1);
            const confColor2 = (c?: string) =>
              c === "high" ? C.teal : c === "medium" ? C.amber : C.red;
            // proxy_beta: aus Haupt-Response, Fallback auf market_data (DQ-04)
            const proxyBeta = data.proxy_beta_1y ?? null;
            const proxyBetaBench = data.proxy_beta_benchmark?.replace("Damodaran · ", "") ?? data.proxy_ticker ?? undefined;

            if (!md) return (
              <Card>
                <SLabel text="Marktdaten" />
                <div style={{ padding: "32px 0", textAlign: "center", color: C.t3, fontFamily: C.mono, fontSize: 12 }}>
                  Marktdaten werden im Hintergrund angereichert — bitte in ~30s neu laden.
                </div>
              </Card>
            );

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <TabScoreBar
                  label="Market Score"
                  score={data.scores?.market_score}
                  tooltip="TAM-Größe · CAGR · Wettbewerbsintensität · Marktzyklus. Je höher, desto attraktiver das Marktumfeld für diesen Sektor."
                />
                {/* Row 1: TAM · SAM · CAGR · Zyklus · Proxy Beta */}
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${proxyBeta != null ? 5 : 4},1fr)`, gap: 10 }}>
                  <FundTile
                    label="TAM 2035"
                    val={md.tam_2035_usd_bn != null ? `$${md.tam_2035_usd_bn.toFixed(0)}B` : fmtBn(data.tam_usd_bn)}
                    sub={data.tam_source}
                    color={confColor(data.tam_confidence)}
                  />
                  <FundTile
                    label="SAM (geschätzt)"
                    val={md.sam_usd_bn != null ? `$${md.sam_usd_bn.toFixed(0)}B` : "—"}
                    sub={md.sam_confidence ? `Konfidenz: ${md.sam_confidence}` : undefined}
                    color={confColor2(md.sam_confidence)}
                  />
                  <FundTile
                    label="CAGR"
                    val={md.cagr_pct != null ? `${md.cagr_pct.toFixed(1)}%` : "—"}
                    sub="p.a. bis 2035"
                    color={md.cagr_pct != null ? C.teal : C.t3}
                  />
                  <FundTile
                    label="Marktzyklus"
                    val={md.market_cycle ? md.market_cycle.charAt(0).toUpperCase() + md.market_cycle.slice(1) : "—"}
                    sub={md.market_cycle_note?.split("—")[0]?.trim()}
                    color={cycleColor(md.market_cycle)}
                  />
                  {proxyBeta != null && (
                    <FundTile
                      label="Market Beta ⓘ"
                      val={`β ${proxyBeta.toFixed(2)}`}
                      sub={proxyBetaBench}
                      color={proxyBeta >= 1.5 ? C.red : proxyBeta >= 1.0 ? C.amber : C.teal}
                    />
                  )}
                </div>

                {/* Row 2: Segmente + Wachstumstreiber */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

                  {/* Segmente */}
                  <Card>
                    <SLabel text="Marktsegmente" />
                    {md.tam_segments && md.tam_segments.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {md.tam_segments.map((seg, i) => (
                          <div key={i}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 12, color: C.t1 }}>{seg.name}</span>
                              <span style={{ fontSize: 12, fontFamily: C.mono, color: C.teal }}>{seg.share_pct.toFixed(0)}%</span>
                            </div>
                            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${seg.share_pct}%`, background: `rgba(0,212,160,${0.3 + (seg.share_pct / 200)})`, borderRadius: 99, transition: "width .4s ease" }} />
                            </div>
                            {seg.note && <div style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>{seg.note}</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: C.t3, fontStyle: "italic" }}>Segmentdaten werden angereichert.</div>
                    )}
                  </Card>

                  {/* Wachstumstreiber */}
                  <Card>
                    <SLabel text="Wachstumstreiber" />
                    {md.growth_drivers && md.growth_drivers.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {md.growth_drivers.map((d, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "6px 0", borderBottom: i < md.growth_drivers!.length - 1 ? `1px solid ${C.border}` : "none" }}>
                            <div style={{ width: 20, height: 20, borderRadius: 5, background: C.tealDim, border: `1px solid ${C.tealBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9, fontFamily: C.mono, color: C.teal, fontWeight: 700 }}>
                              {i + 1}
                            </div>
                            <span style={{ fontSize: 12, color: C.t1, lineHeight: 1.5 }}>{d}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: C.t3, fontStyle: "italic" }}>Wachstumstreiber werden angereichert.</div>
                    )}
                  </Card>
                </div>

                {/* Row 3: Marktpositionierung + Wettbewerb */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

                  {/* Marktpositionierung aus Peer Review */}
                  <Card>
                    <SLabel text="Marktpositionierung" />
                    {md.competition_note ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.6 }}>
                          {md.competition_note}
                        </div>
                        {md.market_cycle && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                            <span style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".06em" }}>Marktzyklus</span>
                            <span style={{ fontSize: 11, color: C.teal, fontWeight: 600, textTransform: "capitalize" }}>{md.market_cycle}</span>
                          </div>
                        )}
                        {md.market_cycle_note && (
                          <div style={{ fontSize: 11, color: C.t3, lineHeight: 1.5 }}>{md.market_cycle_note}</div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: C.t3, fontStyle: "italic" }}>
                        Marktpositionierung wird aus Peer-Daten angereichert.
                      </div>
                    )}
                  </Card>

                  {/* Wettbewerb + SAM-Detail */}
                  <Card>
                    <SLabel text="Wettbewerb & SAM" />
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {/* Competition */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: C.rMd, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                          <span style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".06em" }}>Wettbewerb</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: compColor(md.competition_score), fontFamily: C.display }}>
                            {compDisplay(md.competition_score)}
                          </span>
                        </div>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: compColor(md.competition_score), flexShrink: 0 }} />
                      </div>
                      {md.competition_note && (
                        <div style={{ fontSize: 11, color: C.t2, lineHeight: 1.55 }}>{md.competition_note}</div>
                      )}
                      {/* SAM detail */}
                      {md.sam_note && (
                        <div style={{ marginTop: 4, padding: "8px 12px", borderRadius: C.rMd, background: C.tealDim, border: `1px solid ${C.tealBorder}`, fontSize: 11, color: C.t2, lineHeight: 1.55 }}>
                          {/* Alte DB-Rows: Gleichungs-Präfix rausfiltern */}
                          {md.sam_note.replace(/^SAM\s*=\s*[^×]+×[^=]+=\s*\$[\d.]+B\.?\s*/i, "")}
                        </div>
                      )}
                      {(md.sam_geo_factor != null || md.sam_tech_filter != null) && (
                        <div style={{ display: "flex", gap: 8 }}>
                          {md.sam_geo_factor != null && (
                            <div style={{ flex: 1, padding: "6px 10px", borderRadius: C.rSm, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                              <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono }}>Geo-Faktor</div>
                              <div style={{ fontSize: 13, color: C.t1, fontWeight: 600 }}>{(md.sam_geo_factor * 100).toFixed(0)}%</div>
                            </div>
                          )}
                          {md.sam_tech_filter != null && (
                            <div style={{ flex: 1, padding: "6px 10px", borderRadius: C.rSm, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                              <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono }}>Tech-Filter</div>
                              <div style={{ fontSize: 13, color: C.t1, fontWeight: 600 }}>{(md.sam_tech_filter * 100).toFixed(0)}%</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Enriched-at */}
                {md.enriched_at && (
                  <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textAlign: "right" }}>
                    Marktdaten: {new Date(md.enriched_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Tab 2: Ownership */}
          {activeTab === 2 && (() => {
            const typeColor = (t?: string) =>
              t === "vc" ? C.teal : t === "pe" ? C.blue : t === "corporate" ? C.amber :
              t === "government" ? C.purple : C.t2;
            const sourceLabel = (s?: string) =>
              s === "edgar_form_d" ? "EDGAR Form D" :
              s === "edgar_sc_13g" || s === "edgar_sc_13d" ? "EDGAR 13G/13D" :
              s === "openregister_de" ? "OpenRegister DE" :
              s === "manual" ? "Kuratiert" : s ?? "—";

            // Einträge: Pipeline-Daten bevorzugen, curated als Fallback
            const pipelineEntries = ownershipData?.entries ?? [];
            const curatedEntries  = data.ownership ?? [];
            const showPipeline    = pipelineEntries.length > 0;

            // BUG-30: Funding Investors immer mergen (Lead + Co-Investoren aus funding_rounds)
            // Ergänzt pipeline/curated Einträge — deduped by name
            const fundingEntries: OwnershipItem[] = (() => {
              const base = showPipeline ? pipelineEntries : curatedEntries;
              const existingNames = new Set(base.map((o: any) => o.name.toLowerCase()));
              const result: OwnershipItem[] = [];
              for (const r of data.funding_rounds ?? []) {
                if (r.lead_investor && !existingNames.has(r.lead_investor.toLowerCase())) {
                  existingNames.add(r.lead_investor.toLowerCase());
                  result.push({ name: r.lead_investor, type: "VC/Investor", role: "Lead Investor", notes: `${r.type ?? "Funding"} ${r.date?.slice(0, 4) ?? ""}`.trim() });
                }
                for (const co of r.co_investors ?? []) {
                  if (co && !existingNames.has(co.toLowerCase())) {
                    existingNames.add(co.toLowerCase());
                    result.push({ name: co, type: "VC/Investor", role: "Co-Investor", notes: "Funding History" });
                  }
                }
              }
              return result;
            })();

            const baseEntries = showPipeline ? pipelineEntries : curatedEntries.filter((o: any) => o.name !== "Not publicly disclosed");
            const entries     = [...baseEntries, ...fundingEntries];
            const cap         = ownershipData?.cap_table;
            const isPending   = ownershipLoading || (ownershipData?.status === "pending" || ownershipData?.status === "running");

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <TabScoreBar
                  label="Ownership Score"
                  score={data.scores?.ownership_score}
                  tooltip="Investorenqualität (Tier 1–3) · Diversifikation · Transparenz der Cap Table-Daten. Bewertet Stabilität und Governance-Qualität der Eigentümerstruktur."
                />
                {/* Cap Table Score + Meta */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                  <FundTile
                    label="Cap Table Score"
                    val={cap ? `${(cap.score * 100).toFixed(0)}` : "—"}
                    sub={cap?.label}
                    color={cap ? (cap.score >= 0.7 ? C.red : cap.score >= 0.4 ? C.amber : C.teal) : C.t3}
                  />
                  <FundTile
                    label="Investoren"
                    val={String(entries.length || "—")}
                    sub={ownershipData?.region ? `Region: ${ownershipData.region}` : undefined}
                  />
                  <FundTile
                    label="Datenquelle"
                    val={ownershipData?.source_used
                      ? ownershipData.source_used === "edgar" ? "EDGAR"
                        : ownershipData.source_used === "openregister" ? "OpenRegister"
                        : ownershipData.source_used === "manual" ? "Kuratiert"
                        : "—"
                      : showPipeline ? "Pipeline" : curatedEntries.length > 0 ? "Kuratiert" : "—"}
                    sub={cap?.note?.split("—")[0]?.trim()}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

                  {/* Investorenliste */}
                  <Card>
                    <SLabel text={showPipeline ? "Investoren & Gesellschafter" : "Investoren & Gesellschafter"} />
                    {isPending && entries.length === 0 ? (
                      <div style={{ padding: "28px 0", textAlign: "center", color: C.t3, fontFamily: C.mono, fontSize: 12 }}>
                        Ownership-Daten werden angereichert…
                      </div>
                    ) : entries.length === 0 ? (
                      <div style={{ fontSize: 12, color: C.t3, fontStyle: "italic", paddingTop: 8 }}>
                        Keine öffentlichen Ownership-Daten verfügbar.
                      </div>
                    ) : (
                      entries.map((o, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < entries.length - 1 ? `1px solid ${C.border}` : "none" }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: C.rSm, flexShrink: 0,
                            background: typeColor("type" in o ? (o as OwnershipEntryPipeline).type : undefined) + "18",
                            border: `1px solid ${typeColor("type" in o ? (o as OwnershipEntryPipeline).type : undefined)}33`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 600, color: typeColor("type" in o ? (o as OwnershipEntryPipeline).type : undefined), fontFamily: C.mono,
                          }}>
                            {o.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: C.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.name}</div>
                            <div style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>
                              {o.type ?? ""}
                              {"notes" in o && (o as OwnershipEntryPipeline).notes ? ` · ${(o as OwnershipEntryPipeline).notes}` : ""}
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                            {o.role && <span style={{ fontSize: 11, fontFamily: C.mono, color: C.teal }}>{o.role}</span>}
                            {"share_pct" in o && (o as OwnershipEntryPipeline).share_pct != null && (
                              <span style={{ fontSize: 10, fontFamily: C.mono, color: C.t2 }}>{((o as OwnershipEntryPipeline).share_pct!).toFixed(1)}%</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </Card>

                  {/* Kapitalstruktur + Cap Table Detail */}
                  <Card>
                    <SLabel text="Kapitalstruktur" />
                    {cap ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {/* Score Bar */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: C.t2 }}>Komplexität</span>
                            <span style={{ fontSize: 12, fontFamily: C.mono, fontWeight: 600,
                              color: cap.score >= 0.7 ? C.red : cap.score >= 0.4 ? C.amber : C.teal,
                            }}>{cap.label}</span>
                          </div>
                          <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 99, transition: "width .4s ease",
                              width: `${cap.score * 100}%`,
                              background: cap.score >= 0.7 ? C.red : cap.score >= 0.4 ? C.amber : C.teal,
                            }} />
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: C.t2, lineHeight: 1.55 }}>{cap.note}</div>
                        {/* Quellen-Badges */}
                        {showPipeline && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                            {Array.from(new Set(pipelineEntries.map(e => e.source).filter((s): s is string => Boolean(s)))).map(src => (
                              <span key={src} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, fontFamily: C.mono,
                                background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, color: C.t3,
                              }}>{sourceLabel(src)}</span>
                            ))}
                          </div>
                        )}
                        {ownershipData?.enriched_at && (
                          <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, marginTop: 4 }}>
                            Stand: {new Date(ownershipData.enriched_at).toLocaleDateString("de-DE")}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: C.t3, fontStyle: "italic", paddingTop: 8 }}>
                        {isPending
                          ? "Kapitalstruktur wird angereichert…"
                          : "Wird via OpenRegister.de (DE) und EDGAR (US) angereichert."}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            );
          })()}

          {/* Tab 3: Fundamentals */}
          {activeTab === 3 && (() => {
            const f = data.fundamentals;
            const cur = f.currency === "EUR" ? "€" : "$";
            const fmtPct = (v?: number | null) => v != null ? `${v.toFixed(1)}%` : "—";
            const fmtX   = (v?: number | null) => v != null ? `${v.toFixed(1)}×` : "—";
            const growthColor = (v?: number | null) =>
              v == null ? C.t3 : v > 0 ? C.teal : C.red;
            const marginColor = (v?: number | null) =>
              v == null ? C.t3 : v >= 20 ? C.teal : v >= 0 ? C.amber : C.red;
            const cfColor = (v?: number | null) =>
              v == null ? C.t3 : v > 0 ? C.teal : C.red;

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <TabScoreBar
                  label="Financial Score"
                  score={data.scores?.financial_score}
                  tooltip="Funding-Stage-Proxy · Multiples-Basis · BA-Bridge / EDGAR-Fundamentals. Für private Companies stark von der Datenverfügbarkeit abhängig."
                />
                {f.is_listed ? (<>

                  {/* Row 1: Preis + Marktstruktur */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
                    <FundTile label="Kurs" val={f.price != null ? `${cur}${f.price.toFixed(2)}` : "—"} color={C.t1} />
                    <FundTile label="Marktcap" val={fmtBn(f.market_cap_bn)} color={C.t1} />
                    <FundTile label="Enterprise Value" val={fmtBn(f.enterprise_value_bn)} />
                    <FundTile label="52W High" val={f.week_52_high != null ? `${cur}${f.week_52_high.toFixed(0)}` : "—"} />
                    <FundTile label="52W Low"  val={f.week_52_low  != null ? `${cur}${f.week_52_low.toFixed(0)}`  : "—"} />
                  </div>

                  {/* Row 2: P&L */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                    <FundTile label="Revenue" val={fmtBn(f.revenue_bn)} sub={f.revenue_growth_pct != null ? `YoY ${f.revenue_growth_pct > 0 ? "+" : ""}${f.revenue_growth_pct.toFixed(1)}%` : undefined} color={C.t1} />
                    <FundTile label="EBITDA"  val={fmtBn(f.ebitda_bn)} />
                    <FundTile label="KGV (P/E)" val={fmt(f.pe_ratio, 1)} />
                    <FundTile label="Debt/EBITDA" val={f.debt_ebitda ? `${f.debt_ebitda.toFixed(1)}×` : "—"} color={f.debt_ebitda && f.debt_ebitda > 3 ? C.amber : C.t1} />
                  </div>

                  {/* Row 3: Margen + Growth + Cashflow */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>

                    <Card>
                      <SLabel text="Margen" />
                      <InfoRow k="Bruttomarge"    v={fmtPct(f.gross_margin_pct)}     vColor={marginColor(f.gross_margin_pct)} />
                      <InfoRow k="EBIT-Marge"     v={fmtPct(f.operating_margin_pct)} vColor={marginColor(f.operating_margin_pct)} />
                      <InfoRow k="Nettomarge"     v={fmtPct(f.profit_margin_pct)}    vColor={marginColor(f.profit_margin_pct)} />
                    </Card>

                    <Card>
                      <SLabel text="Wachstum" />
                      <InfoRow k="Revenue Growth" v={f.revenue_growth_pct != null ? `${f.revenue_growth_pct > 0 ? "+" : ""}${f.revenue_growth_pct.toFixed(1)}%` : "—"} vColor={growthColor(f.revenue_growth_pct)} />
                      <InfoRow k="Earnings Growth" v={f.earnings_growth_pct != null ? `${f.earnings_growth_pct > 0 ? "+" : ""}${f.earnings_growth_pct.toFixed(1)}%` : "—"} vColor={growthColor(f.earnings_growth_pct)} />
                    </Card>

                    <Card>
                      <SLabel text="Cashflow" />
                      <InfoRow k="Free Cashflow"      v={fmtBn(f.free_cashflow_bn)}      vColor={cfColor(f.free_cashflow_bn)} />
                      <InfoRow k="Operating Cashflow" v={fmtBn(f.operating_cashflow_bn)} vColor={cfColor(f.operating_cashflow_bn)} />
                    </Card>
                  </div>

                  {/* Row 4: Multiples */}
                  <Card>
                    <SLabel text="Bewertungs-Multiples" />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                      {[
                        { label: "EV / Revenue", val: fmtX(f.ev_revenue), note: "niedriger = günstiger" },
                        { label: "EV / EBITDA",  val: fmtX(f.ev_ebitda),  note: "Branchenmedian ~10–15×" },
                        { label: "P/E Ratio",    val: fmt(f.pe_ratio, 1), note: "Kurs / Gewinn je Aktie" },
                      ].map(m => (
                        <div key={m.label} style={{ padding: "12px 14px", borderRadius: C.rMd, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{m.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: C.display, color: C.t1 }}>{m.val}</div>
                          <div style={{ fontSize: 10, color: C.t3, marginTop: 3 }}>{m.note}</div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Row 5: Beta — listed (market) */}
                  <Card>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <SLabel text="Risiko & Volatilität" />
                      <SourceBadge source={f.fundamentals_source} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                      <div style={{ padding: "12px 14px", borderRadius: C.rMd, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Beta 1Y</div>
                        <BetaBadge fd={f} />
                      </div>
                      <div style={{ padding: "12px 14px", borderRadius: C.rMd, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Beta 3Y</div>
                        <span style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 600, color: C.t1 }}>
                          {f.beta_3y != null ? `β ${f.beta_3y.toFixed(2)}` : "—"}
                        </span>
                      </div>
                      <div style={{ padding: "12px 14px", borderRadius: C.rMd, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                        <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Volatilität 30d</div>
                        <span style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 600, color: C.t1 }}>
                          {f.volatility_30d != null ? `${(f.volatility_30d * 100).toFixed(1)}%` : "—"}
                        </span>
                      </div>
                    </div>
                    {f.fundamentals_quality_flag === "partial" && (
                      <div style={{ marginTop: 10, fontSize: 10, color: C.amber, padding: "6px 10px", background: C.amberDim, borderRadius: C.rSm }}>
                        ⚠ Marktdaten eingeschränkt — kleinere Börse, Yahoo Finance lückenhaft
                      </div>
                    )}
                  </Card>

                  {/* EDGAR / BA KPI-Zeitreihen — listed Companies (US: EDGAR XBRL, DE: BA) */}
                  {kpiData && Object.keys(kpiData).length > 0 && (() => {
                    const LISTED_METRICS = [
                      "revenue_mn", "ebitda_mn", "ebit_mn", "net_income_mn",
                      "equity_mn", "total_assets_mn",
                    ];
                    const DERIVED_METRICS = [
                      "ebitda_margin_pct", "equity_ratio_pct", "revenue_cagr_pct",
                    ];
                    const hasTrend = (m: string) => (kpiData[m]?.length ?? 0) >= 2;
                    const hasAny   = [...LISTED_METRICS, ...DERIVED_METRICS].some(m => kpiData[m]?.length);
                    if (!hasAny) return null;

                    // Quelle aus erstem verfügbaren Datenpunkt ableiten
                    const firstMetric = LISTED_METRICS.find(m => kpiData[m]?.length);
                    const kpiSource   = firstMetric
                      ? (kpiData[firstMetric][0]?.source === "edgar_xbrl" ? "SEC EDGAR XBRL" : "Bundesanzeiger")
                      : "KPI-Pipeline";
                    const kpiCurrency = firstMetric ? (kpiData[firstMetric][0]?.currency ?? null) : null;
                    const cur         = kpiCurrency === "USD" ? "$" : "€";
                    const latestYear  = firstMetric
                      ? Math.max(...kpiData[firstMetric].map(p => p.fiscal_year))
                      : null;

                    const TrendBtn = ({ metric }: { metric: string }) =>
                      hasTrend(metric) ? (
                        <button
                          onClick={() => setKpiModalMetric(metric)}
                          style={{
                            marginTop: 6, background: "none", border: `1px solid ${C.teal}44`,
                            borderRadius: 99, color: C.teal, fontSize: 9, padding: "2px 8px",
                            cursor: "pointer", fontFamily: C.mono, display: "flex",
                            alignItems: "center", gap: 3, letterSpacing: ".03em",
                          }}
                        >↗ Verlauf</button>
                      ) : null;

                    const latestVal = (metric: string): number | null => {
                      const rows = kpiData[metric];
                      if (!rows?.length) return null;
                      return [...rows].sort((a, b) => b.fiscal_year - a.fiscal_year)[0].value;
                    };

                    const fmtMn = (v: number | null) =>
                      v != null ? `${cur}${v.toFixed(1)}M` : "—";
                    const fmtPct = (v: number | null) =>
                      v != null ? `${v.toFixed(1)}%` : "—";

                    return (
                      <Card>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <SLabel text={`KPI-Zeitreihen · ${kpiSource}`} />
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {latestYear && (
                              <span style={{ fontSize: 9, color: C.t3, fontFamily: C.mono,
                                padding: "2px 8px", border: `1px solid ${C.border}`, borderRadius: 99 }}>
                                FY{latestYear}
                              </span>
                            )}
                            <SourceBadge source={kpiSource === "SEC EDGAR XBRL" ? "edgar" : "ba_bridge"} />
                          </div>
                        </div>

                        {/* Zeile 1: Kern-KPIs */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 10 }}>
                          {LISTED_METRICS.filter(m => kpiData[m]?.length).map(metric => (
                            <div key={metric} style={{
                              background: C.bgCard, border: `1px solid ${C.border}`,
                              borderRadius: C.rMd, padding: "14px 16px", display: "flex", flexDirection: "column",
                            }}>
                              <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono,
                                textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>
                                {KPI_META[metric]?.label ?? metric}
                              </div>
                              <div style={{ fontSize: 18, fontWeight: 600, fontFamily: C.display, color: C.t1, lineHeight: 1 }}>
                                {fmtMn(latestVal(metric))}
                              </div>
                              <TrendBtn metric={metric} />
                            </div>
                          ))}
                        </div>

                        {/* Zeile 2: Derived Metriken */}
                        {DERIVED_METRICS.some(m => kpiData[m]?.length) && (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                            {DERIVED_METRICS.filter(m => kpiData[m]?.length).map(metric => (
                              <div key={metric} style={{
                                background: C.bgCard, border: `1px solid ${C.border}`,
                                borderRadius: C.rMd, padding: "14px 16px", display: "flex", flexDirection: "column",
                              }}>
                                <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono,
                                  textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>
                                  {KPI_META[metric]?.label ?? metric}
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 600, fontFamily: C.display, color: C.t1, lineHeight: 1 }}>
                                  {fmtPct(latestVal(metric))}
                                </div>
                                <TrendBtn metric={metric} />
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ marginTop: 10, fontSize: 10, color: C.t3, fontFamily: C.mono }}>
                          Historische Zeitreihen · kpi_timeseries · ↗ Verlauf zeigt Chart
                        </div>
                      </Card>
                    );
                  })()}

                </>) : (
                  /* Private Company */
                  <>
                    {/* FD-02 — Keine Finanzdaten */}
                    {f.fundamentals_source === "none" && (
                      <Card>
                        <div style={{ padding: "24px 0", textAlign: "center", color: C.t3, fontSize: 12, fontFamily: C.mono }}>
                          Keine Finanzdaten öffentlich verfügbar für diese Company.
                        </div>
                      </Card>
                    )}

                    {/* DQ-05: Est. Valuation — für private Companies ohne BA-Daten */}
                    {!f.ba_found && f.fundamentals_source !== "none" && data.funding_total_usd_mn != null && (
                      <Card>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <SLabel text="Finanzielle Einschätzung" />
                          <span style={{ fontSize: 9, color: C.t3, fontFamily: C.mono, padding: "2px 8px", border: `1px solid ${C.border}`, borderRadius: 99 }}>
                            Schätzung · keine Primärdaten
                          </span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                          {/* Est. Pre-Money aus Funding × Stage-Multiple */}
                          {(() => {
                            const _MULT: Record<string, number> = {
                              pre_seed: 5.0, seed: 4.0, series_a: 3.5,
                              series_b: 2.5, series_c: 2.0, series_d: 1.5,
                              series_d_plus: 1.3, growth: 1.2,
                            };
                            const mult = _MULT[data.funding_stage ?? ""] ?? 2.0;
                            const estVal = data.funding_total_usd_mn! * mult;
                            return (
                              <FundTile
                                label="Est. Valuation"
                                val={estVal >= 1000 ? `~$${(estVal / 1000).toFixed(1)}B` : `~$${estVal.toFixed(0)}M`}
                                sub={`${mult}× Funding Total`}
                                color={C.amber}
                              />
                            );
                          })()}
                          <FundTile
                            label="Funding Total"
                            val={fmtM(data.funding_total_usd_mn)}
                            sub="Investiert gesamt"
                            color={C.t1}
                          />
                          <FundTile
                            label="IPO-Wahrsch."
                            val={data.ipo_probability_pct != null ? `${data.ipo_probability_pct}%` : "—"}
                            sub={data.ipo_potential ?? undefined}
                            color={data.ipo_probability_pct != null && data.ipo_probability_pct >= 50 ? C.teal : C.t2}
                          />
                        </div>
                        <div style={{ marginTop: 10, fontSize: 10, color: C.t3, lineHeight: 1.5 }}>
                          Valuation-Schätzung basiert auf Funding-Total × Stage-Multiplikator (VC-Faustregel).
                          Keine verifizierten Finanzdaten verfügbar — BA-Bridge oder EDGAR nicht anwendbar.
                        </div>
                      </Card>
                    )}

                    {/* BA-Bridge Daten (private DE) */}
                    {f.ba_found && (
                      <Card>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <SLabel text="Bundesanzeiger · Finanzkennzahlen" />
                          <SourceBadge source="ba_bridge" />
                        </div>

                        {/* Inline helper — Trend-Button neben einem Tile */}
                        {(() => {
                          const hasTrend = (metric: string) =>
                            (kpiData?.[metric]?.length ?? 0) >= 2;
                          const TrendBtn = ({ metric }: { metric: string }) =>
                            hasTrend(metric) ? (
                              <button
                                onClick={() => setKpiModalMetric(metric)}
                                style={{
                                  marginTop: 6, background: "none", border: `1px solid ${C.teal}44`,
                                  borderRadius: 99, color: C.teal, fontSize: 9, padding: "2px 8px",
                                  cursor: "pointer", fontFamily: C.mono, display: "flex",
                                  alignItems: "center", gap: 3, letterSpacing: ".03em",
                                }}
                              >
                                ↗ Verlauf
                              </button>
                            ) : null;

                          return (
                            <>
                              {/* Zeile 1: Kernkennzahlen */}
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 10 }}>
                                {[
                                  { label: "Umsatz",      metric: "revenue_mn",      val: f.ba_revenue_mn      != null ? `€${f.ba_revenue_mn.toFixed(1)}M`      : "—", color: C.t1 as string | undefined },
                                  { label: "Eigenkapital", metric: "equity_mn",       val: f.ba_equity_mn       != null ? `€${f.ba_equity_mn.toFixed(1)}M`       : "—", color: undefined },
                                  { label: "Bilanzsumme", metric: "total_assets_mn",  val: f.ba_total_assets_mn != null ? `€${f.ba_total_assets_mn.toFixed(1)}M` : "—", color: undefined },
                                  { label: "Mitarbeiter", metric: "headcount",            val: f.ba_employees       != null ? f.ba_employees.toLocaleString("de-DE") : "—", color: undefined },
                                ].map(({ label, metric, val, color }) => (
                                  <div key={metric} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: C.rMd, padding: "14px 16px", display: "flex", flexDirection: "column" }}>
                                    <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{label}</div>
                                    <div style={{ fontSize: 18, fontWeight: 600, fontFamily: C.display, color: color ?? C.t1, lineHeight: 1 }}>{val}</div>
                                    <TrendBtn metric={metric} />
                                  </div>
                                ))}
                              </div>

                              {/* Zeile 2: GuV-Kennzahlen (nur wenn vorhanden) */}
                              {(f.ba_ebitda_mn != null || f.ba_ebit_eur_mn != null || f.ba_net_income_eur_mn != null) && (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                                  {[
                                    { label: "EBITDA",            metric: "ebitda_mn",     val: f.ba_ebitda_mn       != null ? `€${f.ba_ebitda_mn.toFixed(1)}M`       : "—" },
                                    { label: "EBIT",              metric: "ebit_mn",       val: f.ba_ebit_eur_mn     != null ? `€${f.ba_ebit_eur_mn.toFixed(1)}M`     : "—" },
                                    { label: "Jahresüberschuss",  metric: "net_income_mn", val: f.ba_net_income_eur_mn != null ? `€${f.ba_net_income_eur_mn.toFixed(1)}M` : "—" },
                                  ].map(({ label, metric, val }) => (
                                    <div key={metric} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: C.rMd, padding: "14px 16px", display: "flex", flexDirection: "column" }}>
                                      <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{label}</div>
                                      <div style={{ fontSize: 18, fontWeight: 600, fontFamily: C.display, color: C.t1, lineHeight: 1 }}>{val}</div>
                                      <TrendBtn metric={metric} />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          );
                        })()}
                        {f.ba_last_report_year && (
                          <div style={{ marginTop: 8, fontSize: 10, color: C.t3, fontFamily: C.mono, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span>Letzter Jahresabschluss: {f.ba_last_report_year}</span>
                            {f.extraction_confidence && (() => {
                              const confMap: Record<string, { label: string; color: string }> = {
                                full:         { label: "GuV vollständig", color: C.teal  },
                                partial:      { label: "GuV teilweise",   color: C.amber },
                                balance_only: { label: "Nur Bilanz",      color: C.amber },
                                not_found:    { label: "Keine Daten",     color: C.red   },
                              };
                              const conf = confMap[f.extraction_confidence!];
                              if (!conf) return null;
                              return (
                                <span style={{
                                  fontSize: 9, padding: "1px 7px", borderRadius: 99, fontFamily: C.mono,
                                  color: conf.color, background: conf.color + "18",
                                  border: `1px solid ${conf.color}33`,
                                }}>
                                  {conf.label}
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </Card>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                      <FundTile label="Funding Total" val={fmtM(data.funding_total_usd_mn)} color={C.t1} />
                      <FundTile label="Letzte Runde"  val={data.funding_last_round?.split(";")[0] ?? "—"} />
                      <FundTile label="Stage"         val={({ seed:"Seed", series_a:"Series A", series_b:"Series B", series_c:"Series C", series_d:"Series D", series_d_plus:"Series D+", pre_seed:"Pre-Seed", growth:"Growth", public:"Public" } as Record<string,string>)[data.funding_stage ?? ""] ?? data.funding_stage ?? "—"} />
                      <FundTile label="IPO-Potenzial" val={data.ipo_potential ?? "—"} color={data.ipo_potential === "Hoch" ? C.teal : C.t2} />
                    </div>

                    {/* Beta — private (Damodaran) */}
                    {f.beta_1y != null && (
                      <Card>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <SLabel text="Risiko · Branchen-Beta" />
                          <span style={{ fontSize: 10, color: C.t3, fontFamily: C.mono }}>Damodaran · NYU</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
                          <div style={{ padding: "12px 14px", borderRadius: C.rMd, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Unlevered Beta</div>
                            <BetaBadge fd={f} />
                          </div>
                          <div style={{ padding: "12px 14px", borderRadius: C.rMd, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Sektor</div>
                            <span style={{ fontSize: 11, color: C.t2 }}>{f.beta_benchmark?.replace("Damodaran · ", "") ?? "—"}</span>
                          </div>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 10, color: C.t3, fontFamily: C.mono }}>
                          Industriestandard für Private-Company-Bewertung (VC/PE/M&A)
                        </div>
                      </Card>
                    )}
                  </>
                )}
                <FundingTimeline rounds={data.funding_rounds} />
              </div>
            );
          })()}

          {/* Tab 4: Potenziale & Risiken */}
          {activeTab === 4 && (() => {
            const signals   = signalsData?.signals ?? [];
            const dims      = assessmentsData?.dimensions ?? [];

            // Signals aufteilen
            const potSignals     = signals.filter((s: SignalItem) => s.direction === "positive");
            const riskSignals    = signals.filter((s: SignalItem) => s.direction === "negative" && s.source !== "internal_absence");
            const absenceSignals = signals.filter((s: SignalItem) => s.direction === "negative" && s.source === "internal_absence");

            // Composite Score — algorithmisch aus Dimensions (BUG-31 Fix)
            // Nicht mehr Claude composite_opportunity/risk, sondern Mittelwert der algorithmischen Scores
            const oppScores = dims.filter((d: any) => d.opportunity_score != null).map((d: any) => Number(d.opportunity_score));
            const rskScores = dims.filter((d: any) => d.risk_score        != null).map((d: any) => Number(d.risk_score));
            const oppAvg    = oppScores.length > 0 ? oppScores.reduce((a: number, b: number) => a + b, 0) / oppScores.length : null;
            const rskAvg    = rskScores.length > 0 ? rskScores.reduce((a: number, b: number) => a + b, 0) / rskScores.length : null;

            // SC-10 compound_risk_score bevorzugen wenn verfügbar
            const compoundRisk = data.scores?.compound_risk_score ?? rskAvg;

            const signalDrift = signals.length > 0
              ? Math.max(-1, Math.min(1,
                  (potSignals.length - riskSignals.length - absenceSignals.length * 0.5) / Math.max(signals.length, 1)
                ))
              : 0;
            const signalDrift10 = signalDrift * 10;

            // Formel: oppAvg - rskAvg×0.5 + signalDrift×0.15 + 2.0 (Offset für neutrale Mitte ~5)
            const hasComposite = oppAvg !== null && compoundRisk !== null;
            const compositeRaw = hasComposite
              ? (oppAvg! - compoundRisk! * 0.5 + signalDrift10 * 0.15 + 2.0)
              : null;
            const composite = compositeRaw !== null
              ? Math.max(0, Math.min(10, compositeRaw))
              : null;

            const oppScore10  = oppAvg;
            const riskScore10 = compoundRisk;

            const scoreColor = composite === null ? C.t3
              : composite >= 7.0 ? C.teal
              : composite >= 5.0 ? C.blue
              : composite >= 3.5 ? C.amber
              : C.red;
            const scoreLabel = composite === null ? "—"
              : composite >= 7.0 ? "Stark"
              : composite >= 5.0 ? "Solide"
              : composite >= 3.5 ? "Gemischt"
              : "Kritisch";

            // Signal-Kategorien für Dimension-Mapping
            const catLabel: Record<string, string> = {
              funding: "Finanzierung", partnership: "Partnerschaft", ipo_progress: "IPO",
              market_growth: "Marktwachstum", patent: "Patent/IP", investor_entry: "Investor",
              regulatory: "Regulatorik", regulatory_positive: "Regulatorik +",
              regulatory_intervention: "Regulatorik ⚠", policy_support: "Policy +",
              policy_risk: "Policy ⚠", subsidy: "Förderung",
              negative_earnings: "Earnings", supply_chain: "Lieferkette",
              insider_selling: "Insider-Verkauf", customer_concentration: "Kundenkonzentration",
              filing: "Transparenz", ownership_entry: "Ownership", general_news: "News",
              headcount_growth: "Headcount +", tech_milestone: "Tech-Meilenstein",
            };

            // Signals nach signal_category gruppieren für Dimension
            const sigsByCategory = (cats: string[]) =>
              signals.filter((s: SignalItem) => cats.includes(s.signal_category ?? "")).slice(0, 3);

            const DIM_CONFIG = [
              { id: "market",     oppCats: ["market_growth", "new_customer", "new_partnership"], rskCats: ["market_decline", "competitive_pressure"] },
              { id: "financials", oppCats: ["funding_round", "revenue_growth"],                  rskCats: ["negative_earnings", "high_burn", "debt_increase"] },
              { id: "strategy",   oppCats: ["new_partnership", "expansion", "acquisition"],      rskCats: ["leadership_change", "strategy_pivot"] },
              { id: "political",  oppCats: ["regulatory_positive", "subsidy", "policy_support"], rskCats: ["regulatory_intervention", "policy_risk", "sanctions"] },
              { id: "technology", oppCats: ["patent", "new_product", "tech_milestone"],          rskCats: ["ip_risk", "tech_obsolescence"] },
              { id: "operations", oppCats: ["headcount_growth", "revenue_per_fte"],              rskCats: ["supply_chain", "customer_concentration", "filing"] },
            ];

            const ScoreBadge = ({ score, side }: { score: number; side: "opp" | "rsk" }) => {
              const color = side === "opp"
                ? (score >= 7 ? C.teal : score >= 4 ? C.amber : C.t3)
                : (score >= 7 ? C.red  : score >= 4 ? C.amber : C.teal);
              return (
                <div style={{
                  fontFamily: C.mono, fontSize: 18, fontWeight: 700, color,
                  minWidth: 32, textAlign: "center", lineHeight: 1,
                }}>
                  {score.toFixed(1)}
                </div>
              );
            };

            const MiniSignal = ({ s, accent }: { s: SignalItem; accent: string }) => (
              <div style={{
                fontSize: 10, color: C.t2, borderLeft: `2px solid ${accent}55`,
                paddingLeft: 7, marginTop: 5, lineHeight: 1.4,
              }}>
                <span style={{ color: accent, fontFamily: C.mono, fontSize: 9, marginRight: 4 }}>
                  {catLabel[s.signal_category ?? ""] ?? s.signal_category}
                </span>
                {s.summary?.split(":").slice(1).join(":").trim() || s.summary}
              </div>
            );

            const DimRow = ({ dim }: { dim: typeof DIM_CONFIG[0] }) => {
              const assessed = dims.find((d: any) => d.id === dim.id);
              const oppSigs  = sigsByCategory(dim.oppCats);
              const rskSigs  = sigsByCategory(dim.rskCats);
              const oppScore = assessed?.opportunity_score ?? null;
              const rskScore = assessed?.risk_score ?? null;
              const label    = assessed?.label ?? dim.id;
              const conf     = assessed?.data_confidence ?? "low";

              const confColor = conf === "high" ? C.teal : conf === "medium" ? C.amber : C.t3;
              const confLabel = conf === "high" ? "H" : conf === "medium" ? "M" : "L";

              // BUG-05: Farbe der Dimensionsüberschrift folgt dem Score
              const oppHeaderColor = oppScore !== null
                ? (oppScore >= 7 ? C.teal : oppScore >= 4 ? C.amber : C.t3)
                : C.teal;
              const rskHeaderColor = rskScore !== null
                ? (rskScore >= 7 ? C.red : rskScore >= 4 ? C.amber : C.teal)
                : C.red;

              return (
                <div style={{
                  display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
                  gap: 0, borderBottom: `1px solid ${C.border}`,
                }}>
                  {/* Links: Potenzial */}
                  <div style={{ padding: "14px 16px", borderRight: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      {oppScore !== null && <ScoreBadge score={oppScore} side="opp" />}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: oppHeaderColor, fontFamily: C.mono, letterSpacing: ".05em" }}>
                            {label.toUpperCase()}
                          </div>
                          <span title={`Datenkonfidenz: ${conf} · Quellen: ${(assessed?.opportunity_sources ?? []).join(", ")}`} style={{
                            fontSize: 8, fontWeight: 700, color: confColor, fontFamily: C.mono,
                            padding: "1px 4px", borderRadius: 3,
                            background: confColor + "15", border: `1px solid ${confColor}30`,
                            cursor: "help",
                          }}>{confLabel}</span>
                        </div>
                        <div style={{ fontSize: 9, color: C.t3, fontFamily: C.mono }}>POTENZIAL</div>
                      </div>
                    </div>
                    {assessed?.opportunity_note
                      ? <div style={{ fontSize: 11, color: C.t2, lineHeight: 1.5 }}>{assessed.opportunity_note}</div>
                      : <div style={{ fontSize: 11, color: C.t3, fontStyle: "italic" }}>Wird generiert…</div>
                    }
                    {oppSigs.map((s: SignalItem, i: number) => <MiniSignal key={i} s={s} accent={C.teal} />)}
                  </div>

                  {/* Rechts: Risiko */}
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      {rskScore !== null && <ScoreBadge score={rskScore} side="rsk" />}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: rskHeaderColor, fontFamily: C.mono, letterSpacing: ".05em" }}>
                            {label.toUpperCase()}
                          </div>
                          <span title={`Datenkonfidenz: ${conf} · Quellen: ${(assessed?.risk_sources ?? []).join(", ")}`} style={{
                            fontSize: 8, fontWeight: 700, color: confColor, fontFamily: C.mono,
                            padding: "1px 4px", borderRadius: 3,
                            background: confColor + "15", border: `1px solid ${confColor}30`,
                            cursor: "help",
                          }}>{confLabel}</span>
                        </div>
                        <div style={{ fontSize: 9, color: C.t3, fontFamily: C.mono }}>RISIKO</div>
                      </div>
                    </div>
                    {assessed?.risk_note
                      ? <div style={{ fontSize: 11, color: C.t2, lineHeight: 1.5 }}>{assessed.risk_note}</div>
                      : <div style={{ fontSize: 11, color: C.t3, fontStyle: "italic" }}>Wird generiert…</div>
                    }
                    {rskSigs.map((s: SignalItem, i: number) => <MiniSignal key={i} s={s} accent={C.red} />)}
                  </div>
                </div>
              );
            };

            return (
              <div>
                {/* TabScoreBar — SC-10 Compound Risk Score */}
                <TabScoreBar
                  label="Compound Risk Score"
                  score={data.scores?.compound_risk_score}
                  tooltip="SC-10: Algorithmischer Compound Risk aus 6 Dimensionen (Market, Financials, Strategy, Political, Technology, Operations). Confidence-gewichtet — Dimensionen ohne Datenbasis dämpfen den Score statt ihn aufzublasen."
                />

                {/* Hero Score — Composite */}
                <Card style={{ marginBottom: 16, textAlign: "center" }}>
                  {/* Haupt-Score mit Tooltip */}
                  <div style={{ position: "relative", display: "inline-block" }}
                    onMouseEnter={e => {
                      const tip = (e.currentTarget as HTMLElement).querySelector(".score-tooltip") as HTMLElement;
                      if (tip) tip.style.opacity = "1";
                    }}
                    onMouseLeave={e => {
                      const tip = (e.currentTarget as HTMLElement).querySelector(".score-tooltip") as HTMLElement;
                      if (tip) tip.style.opacity = "0";
                    }}
                  >
                    <div style={{ fontSize: 9, color: C.t3, fontFamily: C.mono, marginBottom: 6, letterSpacing: ".08em" }}>
                      COMPOSITE SCORE ⓘ
                    </div>
                    <div style={{ fontSize: 56, fontWeight: 700, color: scoreColor, lineHeight: 1, fontFamily: C.display }}>
                      {composite !== null ? composite.toFixed(1) : "—"}
                    </div>
                    <div style={{ fontSize: 12, color: scoreColor, marginTop: 6, fontFamily: C.mono, fontWeight: 600 }}>
                      {scoreLabel}
                    </div>

                    {/* Tooltip */}
                    <div className="score-tooltip" style={{
                      position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                      marginTop: 10, background: C.bgHover, border: `1px solid ${C.border}`,
                      borderRadius: 8, padding: "12px 16px", width: 240, zIndex: 50,
                      opacity: 0, transition: "opacity .15s", pointerEvents: "none",
                      textAlign: "left",
                    }}>
                      <div style={{ fontSize: 10, color: C.t2, fontFamily: C.mono, marginBottom: 8, fontWeight: 600 }}>
                        GEWICHTUNG
                      </div>
                      {[
                        { label: "Opportunität (Ø)", val: oppScore10?.toFixed(1) ?? "—", weight: "Ø Dims", color: C.teal },
                        { label: "Risiko 6D (SC-10)", val: riskScore10?.toFixed(1) ?? "—", weight: "−0.5×", color: C.red },
                        { label: "Signal-Drift", val: (signalDrift10 >= 0 ? "+" : "") + signalDrift10.toFixed(1), weight: "+0.15×", color: signalDrift >= 0 ? C.teal : C.amber },
                      ].map(row => (
                        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div>
                            <span style={{ fontSize: 10, color: C.t2 }}>{row.label}</span>
                            <span style={{ fontSize: 9, color: C.t3, fontFamily: C.mono, marginLeft: 6 }}>{row.weight}</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: row.color, fontFamily: C.mono }}>{row.val}</span>
                        </div>
                      ))}
                      <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 8, paddingTop: 8, fontSize: 9, color: C.t3, lineHeight: 1.5 }}>
                        Claude Assessment + Signal-Engine.<br />Keine Anlageberatung.
                      </div>
                    </div>
                  </div>

                  {/* Teilwert-Chips */}
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                    {[
                      { label: "OPP", val: oppScore10?.toFixed(1) ?? "—", color: C.teal, bg: `${C.teal}18` },
                      { label: "RISK", val: riskScore10?.toFixed(1) ?? "—", color: C.red, bg: `${C.red}18` },
                      { label: "DRIFT", val: signalDrift10 !== 0 ? (signalDrift10 >= 0 ? "+" : "") + signalDrift10.toFixed(1) : "0.0", color: signalDrift >= 0 ? C.teal : C.amber, bg: `${C.amber}12` },
                      { label: "SIGNALS", val: `${potSignals.length}↑ ${riskSignals.length}↓`, color: C.t2, bg: `${C.border}` },
                    ].map(chip => (
                      <div key={chip.label} style={{
                        background: chip.bg, border: `1px solid ${chip.color}33`,
                        borderRadius: 99, padding: "4px 12px",
                        display: "flex", alignItems: "center", gap: 6,
                      }}>
                        <span style={{ fontSize: 9, color: C.t3, fontFamily: C.mono }}>{chip.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: chip.color, fontFamily: C.mono }}>{chip.val}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 9, color: C.t3, marginTop: 12, fontFamily: C.mono }}>
                    {assessmentsData?.source === "cache" ? "Assessment aus Cache" : "Assessment generiert"} · Algorithmische Scores · {assessmentsData?.model?.replace("claude-", "Claude ") ?? "—"} Narrativ · {signals.length} Signals
                  </div>
                </Card>

                {/* Assessment Loading / Error */}
                {assessmentsLoading && (
                  <Card style={{ textAlign: "center", padding: 32 }}>
                    <div style={{ fontSize: 12, color: C.teal, fontFamily: C.mono, marginBottom: 8 }}>
                      ◎ Scores werden berechnet…
                    </div>
                    <div style={{ fontSize: 11, color: C.t3 }}>
                      Algorithmische Scores für 6 Dimensionen · Claude generiert Kontext-Narrativ.
                    </div>
                  </Card>
                )}
                {!assessmentsLoading && assessmentsData?._error && (
                  <Card style={{ textAlign: "center", padding: 24 }}>
                    <div style={{ fontSize: 11, color: C.amber, fontFamily: C.mono, marginBottom: 6 }}>
                      {assessmentsData._error === "overloaded"
                        ? "⚠ Claude momentan ausgelastet — bitte Tab neu laden."
                        : "⚠ Assessment konnte nicht generiert werden."}
                    </div>
                    <div style={{ fontSize: 10, color: C.t3 }}>Signals und Scoring bleiben verfügbar.</div>
                  </Card>
                )}

                {/* 6-Dimensionen Grid */}
                {!assessmentsLoading && (
                  <Card style={{ padding: 0, overflow: "hidden" }}>
                    {/* Header */}
                    <div style={{
                      display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
                      borderBottom: `1px solid ${C.border}`,
                    }}>
                      <div style={{ padding: "10px 16px", fontSize: 9, color: C.teal, fontFamily: C.mono, fontWeight: 600, letterSpacing: ".08em", borderRight: `1px solid ${C.border}` }}>
                        ▲ POTENZIALE
                      </div>
                      <div style={{ padding: "10px 16px", fontSize: 9, color: C.red, fontFamily: C.mono, fontWeight: 600, letterSpacing: ".08em" }}>
                        ▼ RISIKEN
                      </div>
                    </div>
                    {DIM_CONFIG.map(dim => <DimRow key={dim.id} dim={dim} />)}
                  </Card>
                )}

                <div style={{ marginTop: 12, fontSize: 9, color: C.t3, fontFamily: C.mono, textAlign: "center" }}>
                  Algorithmische Scores · Claude Narrativ · Keine Anlageberatung · Stand: {new Date().toLocaleDateString("de-DE")}
                  <span style={{ marginLeft: 8, color: C.t3 }}>· H=high · M=medium · L=low Konfidenz</span>
                </div>
              </div>
            );
          })()}

          {/* Tab 5: Peer Review */}
          {activeTab === 5 && (() => {
            const peers = peersData?.peers ?? [];
            const benchmark = peersData?.benchmark ?? [];

            const stageOrder: Record<string, number> = {
              "Pre-Seed": 0, "Seed": 1, "Series A": 2, "Series B": 3,
              "Series C": 4, "Series D": 5, "Series D+": 6, "Growth": 7, "Public": 8,
            };
            const stageColor = (s?: string | null) =>
              !s ? C.t3 : stageOrder[s] >= 6 ? C.teal : stageOrder[s] >= 3 ? C.blue : C.amber;

            const regionFlag = (r?: string | null) =>
              r === "US" ? "🇺🇸" : r === "DE" ? "🇩🇪" : r === "EU" ? "🇪🇺" : r === "UK" ? "🇬🇧" : "🌐";

            return (
              <div>
                {/* Loading */}
                {peersLoading && (
                  <div style={{ textAlign: "center", color: C.t3, fontSize: 12, padding: 48 }}>
                    Peer-Analyse wird generiert…
                  </div>
                )}

                {/* Kein Ergebnis */}
                {!peersLoading && peers.length === 0 && (
                  <div style={{ textAlign: "center", color: C.t3, fontSize: 12, padding: 48 }}>
                    Keine Peer-Daten verfügbar.
                  </div>
                )}

                {!peersLoading && peers.length > 0 && (
                  <>
                    <TabScoreBar
                      label="Strategic Score"
                      score={data.scores?.strategic_score}
                      tooltip="SRR × TechReadiness × Käufer-Universum. Misst strategische Attraktivität für M&A, Partnerschaften und Peer-Positionierung."
                    />
                    {/* Cache-Badge */}
                    {peersData?.from_cache && (
                      <div style={{ fontSize: 9, color: C.t3, fontFamily: C.mono, marginBottom: 10, textAlign: "right" }}>
                        Cached · {peersData.generated_at?.slice(0, 10)}
                      </div>
                    )}

                    {/* Block 1: Peer-Karten */}
                    <Card style={{ marginBottom: 12, padding: 0, overflow: "hidden" }}>
                      <div style={{ padding: "14px 20px 6px", borderBottom: `1px solid ${C.border}` }}>
                        <SLabel text={`Wettbewerber (${peers.length})`} />
                      </div>
                      {peers.map((p, idx) => {
                        const pathColor = PATH_COLORS[p.investment_path ?? ""] ?? C.t3;
                        const isListed  = p.ipo_status === "listed";
                        return (
                          <div key={p.id} style={{
                            padding: "16px 20px",
                            borderBottom: idx < peers.length - 1 ? `1px solid ${C.border}` : "none",
                          }}>
                            {/* Row 1: Name + Ticker + Funding */}
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: C.t1, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <span>{regionFlag(p.region)} {p.name}</span>
                                  {p.ticker && (
                                    <span style={{ fontSize: 10, color: C.teal, fontFamily: C.mono, background: C.tealDim, border: `1px solid ${C.tealBorder}`, borderRadius: 4, padding: "1px 6px" }}>
                                      {p.ticker}{p.exchange ? ` · ${p.exchange}` : ""}
                                    </span>
                                  )}
                                </div>
                                {/* Badges Row */}
                                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>
                                  {p.stage_normalized && (
                                    <span style={{
                                      fontSize: 10, fontFamily: C.mono, borderRadius: 4, padding: "2px 7px",
                                      color: stageColor(p.stage_normalized),
                                      background: stageColor(p.stage_normalized) + "18",
                                      border: `1px solid ${stageColor(p.stage_normalized)}33`,
                                    }}>
                                      {p.stage_normalized}
                                    </span>
                                  )}
                                  {isListed && (
                                    <span style={{ fontSize: 10, fontFamily: C.mono, borderRadius: 4, padding: "2px 7px", color: C.teal, background: C.tealDim, border: `1px solid ${C.tealBorder}` }}>
                                      Public
                                    </span>
                                  )}
                                  {p.investment_path && p.investment_path !== "Beobachten" && (
                                    <span style={{ fontSize: 10, fontFamily: C.mono, borderRadius: 4, padding: "2px 7px", color: pathColor, background: pathColor + "18", border: `1px solid ${pathColor}33` }}>
                                      {p.investment_path}
                                    </span>
                                  )}
                                  {p.headquarters && (
                                    <span style={{ fontSize: 10, color: C.t3, display: "flex", alignItems: "center", gap: 3 }}>
                                      <span>📍</span>{p.headquarters}
                                    </span>
                                  )}
                                  {p.founding_year && (
                                    <span style={{ fontSize: 10, color: C.t3, fontFamily: C.mono }}>
                                      Gegr. {p.founding_year}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Funding + Headcount */}
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div style={{ fontSize: 13, color: C.teal, fontFamily: C.mono, fontWeight: 600 }}>
                                  {p.funding_total_usd_mn
                                    ? p.funding_total_usd_mn >= 1000
                                      ? `$${(p.funding_total_usd_mn / 1000).toFixed(1)}B`
                                      : `$${p.funding_total_usd_mn.toFixed(0)}M`
                                    : "—"}
                                </div>
                                {p.headcount && (
                                  <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>
                                    {p.headcount.toLocaleString("de-DE")} MA
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Positioning Note — prominente Hauptaussage */}
                            {p.positioning_note && (
                              <div style={{
                                padding: "9px 12px", marginBottom: 8,
                                background: "rgba(0,212,160,0.06)",
                                border: `1px solid ${C.tealBorder}`,
                                borderLeft: `3px solid ${C.teal}`,
                                borderRadius: `0 ${C.rSm} ${C.rSm} 0`,
                                fontSize: 12, color: C.t1, lineHeight: 1.55,
                              }}>
                                {p.positioning_note}
                              </div>
                            )}

                            {/* Description als Kontext-Ergänzung */}
                            {p.description && (
                              <div style={{ fontSize: 11, color: C.t2, lineHeight: 1.5, marginBottom: 6 }}>
                                {p.description.slice(0, 180)}{p.description.length > 180 ? "…" : ""}
                              </div>
                            )}

                            {/* Website Link */}
                            {p.website && (
                              <a
                                href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                                target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 10, color: C.teal, fontFamily: C.mono, textDecoration: "none", opacity: 0.7 }}
                              >
                                {p.website.replace(/^https?:\/\//, "")} →
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </Card>

                    {/* Block 2: Benchmark */}
                    {benchmark.length > 0 && (
                      <Card style={{ marginBottom: 12 }}>
                        <SLabel text="Benchmark vs. Peer-Median" />
                        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                          {/* Header */}
                          <div style={{
                            display: "grid", gridTemplateColumns: "1fr 110px 110px",
                            gap: 8, padding: "0 0 6px",
                            borderBottom: `1px solid ${C.border}`,
                          }}>
                            {["Metrik", data.name, "Peer-Median"].map(h => (
                              <div key={h} style={{ fontSize: 9, color: C.t3, fontFamily: C.mono, fontWeight: 600 }}>
                                {h}
                              </div>
                            ))}
                          </div>
                          {benchmark.map((b, i) => (
                            <div key={i} style={{
                              display: "grid", gridTemplateColumns: "1fr 110px 110px",
                              gap: 8, padding: "8px 0",
                              borderBottom: i < benchmark.length - 1 ? `1px solid ${C.border}` : "none",
                              alignItems: "center",
                            }}>
                              <div>
                                <div style={{ fontSize: 11, color: C.t1 }}>{b.metric}</div>
                                {b.note && <div style={{ fontSize: 9, color: C.t3, marginTop: 1 }}>{b.note}</div>}
                              </div>
                              <div style={{ fontSize: 12, color: C.teal, fontFamily: C.mono }}>
                                {b.company_value ?? "—"}
                              </div>
                              <div style={{ fontSize: 12, color: C.t2, fontFamily: C.mono }}>
                                {b.peer_median ?? "—"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {/* Block 3: Comparable Transactions Placeholder */}
                    <Card>
                      <SLabel text="Comparable Transactions" />
                      <div style={{
                        border: `1px dashed ${C.border}`, borderRadius: 6,
                        padding: 16, textAlign: "center",
                      }}>
                        <div style={{ fontSize: 11, color: C.t3 }}>
                          Comparable Transactions — Phase 3
                        </div>
                        <div style={{ fontSize: 9, color: C.t3, fontFamily: C.mono, marginTop: 4 }}>
                          Ähnliche abgeschlossene M&A-Deals · EV/Revenue · EV/EBITDA Multiples
                        </div>
                      </div>
                    </Card>

                    {/* Disclaimer */}
                    <div style={{ marginTop: 12, fontSize: 9, color: C.t3, fontFamily: C.mono, textAlign: "center" }}>
                      Peers generiert via Claude · Keine Anlageberatung · Stand: {peersData?.generated_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Tab 6: Value Drivers */}
          {activeTab === 6 && (() => {
            const vd = valueDriversData;

            const depColor = (d?: string) =>
              d === "critical" ? C.red : d === "high" ? C.amber : d === "medium" ? C.teal : C.t3;
            const depLabel = (d?: string) =>
              d === "critical" ? "Kritisch" : d === "high" ? "Hoch" : d === "medium" ? "Mittel" : d === "commodity" ? "Commodity" : "—";
            const mktLabel = (m?: string) =>
              m === "dominant" ? "Dominant" : m === "contested" ? "Contested" : m === "fragmented" ? "Fragmented" : "—";
            const mktColor = (m?: string) =>
              m === "dominant" ? C.teal : m === "contested" ? C.amber : C.t3;
            const expColor = (e?: string) =>
              e === "high" ? C.teal : e === "medium" ? C.amber : C.t3;
            const expLabel = (e?: string) =>
              e === "high" ? "Hoch" : e === "medium" ? "Mittel" : e === "low" ? "Gering" : "—";
            const giLabel = (g?: string) =>
              g === "true" ? "Ja" : g === "false" ? "Nein" : g === "partial" ? "Teilweise" : "—";
            const giColor = (g?: string) =>
              g === "true" ? C.teal : g === "false" ? C.red : C.amber;
            const fmtPrice = (p?: number, cur?: string) =>
              p != null ? `${cur === "EUR" ? "€" : "$"}${p.toFixed(2)}` : null;

            const isPending = !vd || vd.status === "pending";

            if (isPending) return (
              <Card>
                <SLabel text="Value Drivers" />
                <div style={{ padding: "32px 0", textAlign: "center", color: C.t3, fontFamily: C.mono, fontSize: 12 }}>
                  Enabler & Contributors werden angereichert…
                </div>
              </Card>
            );

            if (vd.status === "empty") return (
              <Card>
                <SLabel text="Value Drivers" />
                <div style={{ padding: "32px 0", textAlign: "center", color: C.t3, fontFamily: C.mono, fontSize: 12 }}>
                  Kein Supply Chain Mapping für diese Company verfügbar.
                </div>
              </Card>
            );

            const renderEntry = (entry: ValueDriverEntry, isEnabler: boolean) => {
              const accent = isEnabler ? C.blue : C.teal;
              const accentDim = isEnabler ? C.blueDim : C.tealDim;
              return (
                <div key={entry.ticker} style={{
                  padding: "14px 16px", borderRadius: C.rMd,
                  background: "rgba(255,255,255,0.025)",
                  border: `1px solid ${C.border}`,
                  display: "flex", flexDirection: "column", gap: 10,
                }}>

                  {/* Row 1: Ticker + Name + Kurs */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 700, color: accent }}>
                        {entry.ticker}
                      </span>
                      {entry.exchange && (
                        <span style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, padding: "1px 6px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }}>
                          {entry.exchange}
                        </span>
                      )}
                      {(entry.partnership_likely || entry.existing_relationship) && (
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: C.tealDim, border: `1px solid ${C.tealBorder}`, color: C.teal, fontFamily: C.mono }}>
                          {isEnabler ? "Partnership likely" : "Rel. bekannt"}
                        </span>
                      )}
                    </div>
                    {entry.price != null && (
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontFamily: C.mono, fontSize: 14, fontWeight: 600, color: C.t1 }}>
                          {fmtPrice(entry.price, entry.currency)}
                        </div>
                        {entry.market_cap_bn != null && (
                          <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono }}>
                            Mcap {fmtBn(entry.market_cap_bn)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Row 2: Name + Rolle als Bullets */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ fontSize: 13, color: C.t1, fontWeight: 500 }}>{entry.name}</div>
                    {entry.context
                      ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          {/* Rolle als erster Bullet */}
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                            <span style={{ color: C.t3, fontSize: 11, lineHeight: "18px", flexShrink: 0 }}>·</span>
                            <span style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>{entry.role}</span>
                          </div>
                          {/* Context als zweiter Bullet */}
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                            <span style={{ color: accent, fontSize: 11, lineHeight: "18px", flexShrink: 0 }}>·</span>
                            <span style={{ fontSize: 12, color: C.t1, lineHeight: 1.5 }}>{entry.context}</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                          <span style={{ color: C.t3, fontSize: 11, lineHeight: "18px", flexShrink: 0 }}>·</span>
                          <span style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>{entry.role}</span>
                        </div>
                      )
                    }
                  </div>

                  {/* Row 3: Signal-Chips + Relevance */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                    {isEnabler ? (<>
                      <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 99, fontFamily: C.mono,
                        color: depColor(entry.dependency_level), background: depColor(entry.dependency_level) + "18",
                        border: `1px solid ${depColor(entry.dependency_level)}33`,
                      }}>
                        {depLabel(entry.dependency_level)}
                      </span>
                      <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 99, fontFamily: C.mono,
                        color: mktColor(entry.market_position), background: mktColor(entry.market_position) + "18",
                        border: `1px solid ${mktColor(entry.market_position)}33`,
                      }}>
                        {mktLabel(entry.market_position)}
                      </span>
                    </>) : (<>
                      <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 99, fontFamily: C.mono,
                        color: expColor(entry.exposure_level), background: expColor(entry.exposure_level) + "18",
                        border: `1px solid ${expColor(entry.exposure_level)}33`,
                      }}>
                        Exposure {expLabel(entry.exposure_level)}
                      </span>
                      <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 99, fontFamily: C.mono,
                        color: giColor(entry.grows_independently), background: giColor(entry.grows_independently) + "18",
                        border: `1px solid ${giColor(entry.grows_independently)}33`,
                      }}>
                        Unabh. {giLabel(entry.grows_independently)}
                      </span>
                    </>)}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto" }}>
                      <div style={{ width: 44, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${entry.relevance * 100}%`, background: accent, borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 10, color: C.t3, fontFamily: C.mono }}>{Math.round(entry.relevance * 100)}%</span>
                    </div>
                  </div>

                </div>
              );
            };

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <TabScoreBar
                  label="Value Driver Score"
                  score={data.scores?.value_driver_score}
                  tooltip="Abhängigkeitsgrad der Enabler · Marktposition (Leader/Dominant/Contested) · TechReadiness. Misst die Stärke der Value Chain um diese Company."
                />
                {/* 2-Spalten Grid: Enabler links, Contributors rechts */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

                  {/* Enabler */}
                  <Card>
                    <SLabel text={`Enabler · Tech-Voraussetzungen (${vd.enablers.length})`} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {vd.enablers.length > 0
                        ? vd.enablers.map(e => renderEntry(e, true))
                        : <div style={{ fontSize: 12, color: C.t3, fontStyle: "italic" }}>Keine Enabler identifiziert.</div>
                      }
                    </div>
                  </Card>

                  {/* Contributors */}
                  <Card>
                    <SLabel text={`Contributors · Supply-Chain-Profiteure (${vd.contributors.length})`} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {vd.contributors.length > 0
                        ? vd.contributors.map(e => renderEntry(e, false))
                        : <div style={{ fontSize: 12, color: C.t3, fontStyle: "italic" }}>Keine Contributors identifiziert.</div>
                      }
                    </div>
                  </Card>
                </div>

                {/* ETFs */}
                {vd.etfs.length > 0 && (
                  <Card>
                    <SLabel text="Thematische ETFs" />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {vd.etfs.map(etf => (
                        <div key={etf.ticker} style={{
                          padding: "6px 14px", borderRadius: C.rMd,
                          background: C.purpleDim, border: `1px solid ${C.purple}33`,
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: C.purple }}>{etf.ticker}</span>
                          <span style={{ fontSize: 11, color: C.t2 }}>{etf.name}</span>
                          <div style={{ width: 30, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${etf.relevance * 100}%`, background: C.purple, borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 10, color: C.t3, fontFamily: C.mono }}>{Math.round(etf.relevance * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {vd.enriched_at && (
                  <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textAlign: "right" }}>
                    Angereichert: {new Date(vd.enriched_at).toLocaleDateString("de-DE")}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Tab 7: Exposure Types */}
          {activeTab === 7 && (() => {
            const sc = data.scores;

            if (!sc) return (
              <Card>
                <SLabel text="Scoring & Investmentprofil" />
                <div style={{ padding: "32px 0", textAlign: "center", color: C.t3, fontFamily: C.mono, fontSize: 12 }}>
                  Scores werden berechnet — bitte kurz warten und Seite neu laden.
                </div>
              </Card>
            );

            // Sub-Score-Dimensionen in Radar-Reihenfolge (oben → im Uhrzeigersinn)
            // SC-10: compound_risk_score bevorzugen wenn verfügbar (algorithmisch, 6D)
            const hasCompoundRisk = sc.compound_risk_score != null;
            const SUB_SCORES = [
              { key: "market_score",        label: "Market",    color: C.teal   },
              { key: "strategic_score",     label: "Strategic", color: C.blue   },
              { key: "financial_score",     label: "Financial", color: C.purple },
              { key: hasCompoundRisk ? "compound_risk_score" : "risk_score",
                                            label: hasCompoundRisk ? "Risk 6D" : "Risk",
                                                                color: C.red    },
              { key: "ownership_score",     label: "Ownership", color: C.amber  },
              { key: "value_driver_score",  label: "Val.Driver",color: C.teal   },
            ];

            const PATH_SCORES = [
              { key: "ipo_score",     heroKey: "ipo",     label: "IPO",       color: C.teal   },
              { key: "ma_score", heroKey: "m_and_a", label: "M&A",       color: C.blue   },
              { key: "etf_score",     heroKey: "etf",     label: "ETF-Proxy", color: C.amber  },
              { key: "enabler_score", heroKey: "enabler", label: "Enabler",   color: C.purple },
            ].filter(p => !(p.heroKey === "ipo" && data.ipo_status === "listed"));

            const scVal = (key: keyof CompanyScores) =>
              (sc[key] as number | undefined) ?? 0;
            const scoreColor = (v?: number) =>
              v == null ? C.t3 : v >= 7 ? C.teal : v >= 4 ? C.amber : C.red;

            // Fervo-Fix: listed Company kann keinen IPO-Hero haben — nächstbesten Pfad ableiten
            const effectiveHero = (() => {
              if (!data.fundamentals.is_listed || sc.hero_path !== "ipo") {
                return { path: sc.hero_path, label: sc.hero_path_label, score: sc.hero_score };
              }
              const alts = [
                { path: "m_and_a", label: "M&A",       score: sc.ma_score },
                { path: "etf",     label: "ETF-Proxy", score: sc.etf_score     },
                { path: "enabler", label: "Enabler",   score: sc.enabler_score },
              ].filter(a => a.score != null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
              return alts[0] ?? { path: sc.hero_path, label: sc.hero_path_label, score: sc.hero_score };
            })();

            const heroScore   = effectiveHero.score;
            const heroLabel   = effectiveHero.label ?? effectiveHero.path ?? "—";
            const heroRating  = sc.rating ?? "—";
            const composite   = sc.composite_score;

            // ── Radar SVG ──────────────────────────────────────────────────
            const W = 280, H = 280, cx = 140, cy = 140, R = 92;
            const N = 6;
            const aOff = -Math.PI / 2; // start top

            const getP = (i: number, r: number) => ({
              x: cx + r * Math.cos(aOff + (2 * Math.PI * i) / N),
              y: cy + r * Math.sin(aOff + (2 * Math.PI * i) / N),
            });

            const gridPoly = (level: number) => {
              const r = (level / 10) * R;
              return Array.from({ length: N }, (_, i) => {
                const p = getP(i, r);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              }).join(" ");
            };

            const dataPoly = SUB_SCORES.map((s, i) => {
              const v = Math.min(scVal(s.key as keyof CompanyScores), 10);
              const r = (v / 10) * R;
              const p = getP(i, r);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            }).join(" ");

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* ── Row 1: Hero Path + Composite ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

                  {/* Hero Path Card */}
                  <Card>
                    <SLabel text="Hero Investitionspfad" />
                    <div style={{ textAlign: "center", padding: "10px 0 6px" }}>
                      <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, letterSpacing: ".08em", marginBottom: 8 }}>
                        STÄRKSTER PFAD
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: scoreColor(heroScore), fontFamily: C.display, lineHeight: 1 }}>
                        {heroLabel}
                      </div>
                      {heroScore != null && (
                        <div style={{ fontSize: 36, fontWeight: 700, color: scoreColor(heroScore), fontFamily: C.mono, marginTop: 6 }}>
                          {heroScore.toFixed(1)}
                          <span style={{ fontSize: 14, color: C.t3, fontWeight: 400 }}>/10</span>
                        </div>
                      )}
                      <div style={{ marginTop: 12 }}>
                        <span style={{
                          fontSize: 13, padding: "5px 20px", borderRadius: 99, fontWeight: 700,
                          color: ratingColor(heroRating),
                          background: ratingColor(heroRating) + "18",
                          border: `1px solid ${ratingColor(heroRating)}33`,
                          fontFamily: C.mono,
                        }}>
                          {heroRating}
                        </span>
                      </div>
                    </div>
                    {sc.computed_at && (
                      <div style={{ marginTop: 14, fontSize: 9, color: C.t3, fontFamily: C.mono, textAlign: "center" }}>
                        Berechnet: {new Date(sc.computed_at).toLocaleDateString("de-DE")}
                        {sc.confidence && <span> · Konfidenz: {sc.confidence}</span>}
                      </div>
                    )}
                  </Card>

                  {/* Composite + Sub-Score Bars */}
                  <Card>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <SLabel text="Composite Score" />
                      <span style={{ fontSize: 26, fontWeight: 700, fontFamily: C.mono, color: scoreColor(composite) }}>
                        {composite != null ? composite.toFixed(1) : "—"}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {SUB_SCORES.map(s => {
                        const v = scVal(s.key as keyof CompanyScores);
                        const isRisk = s.key === "risk_score";
                        const barColor = isRisk
                          ? (v >= 7 ? C.red : v >= 4 ? C.amber : C.teal)
                          : scoreColor(v);
                        return (
                          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, minWidth: 80 }}>
                              {s.label}{isRisk && " ↓"}
                            </span>
                            <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${(v / 10) * 100}%`, background: barColor, borderRadius: 99, transition: "width .4s ease" }} />
                            </div>
                            <span style={{ fontSize: 11, fontFamily: C.mono, color: barColor, minWidth: 30, textAlign: "right" }}>
                              {v > 0 ? v.toFixed(1) : "—"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>

                {/* ── Row 2: Radar + Path Scores ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

                  {/* Radar Chart */}
                  <Card>
                    <SLabel text="Score-Profil · 6 Dimensionen" />
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
                        {/* Grid polygons */}
                        {[2, 4, 6, 8, 10].map(lvl => (
                          <polygon
                            key={lvl}
                            points={gridPoly(lvl)}
                            fill="none"
                            stroke="rgba(255,255,255,0.06)"
                            strokeWidth={lvl === 10 ? 1.5 : 1}
                          />
                        ))}
                        {/* Axis lines */}
                        {Array.from({ length: N }, (_, i) => {
                          const p = getP(i, R);
                          return <line key={i} x1={cx} y1={cy} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />;
                        })}
                        {/* Data polygon */}
                        <polygon points={dataPoly} fill={`${C.teal}20`} stroke={C.teal} strokeWidth={1.5} />
                        {/* Data dots */}
                        {SUB_SCORES.map((s, i) => {
                          const v = Math.min(scVal(s.key as keyof CompanyScores), 10);
                          const r = (v / 10) * R;
                          const p = getP(i, r);
                          return <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={4} fill={s.color} stroke={C.bg} strokeWidth={1.5} />;
                        })}
                        {/* Labels */}
                        {SUB_SCORES.map((s, i) => {
                          const lp = getP(i, R + 20);
                          const scoreV = scVal(s.key as keyof CompanyScores);
                          // Adjust anchor for left/right sides
                          const angle = aOff + (2 * Math.PI * i) / N;
                          const anchor = Math.cos(angle) < -0.3 ? "end" : Math.cos(angle) > 0.3 ? "start" : "middle";
                          return (
                            <g key={i}>
                              <text
                                x={lp.x.toFixed(1)} y={lp.y.toFixed(1)}
                                textAnchor={anchor}
                                dominantBaseline="middle"
                                fill={s.color} fontSize={9}
                                fontFamily="DM Sans, sans-serif" fontWeight={600}
                              >
                                {s.label}
                              </text>
                              {scoreV > 0 && (
                                <text
                                  x={lp.x.toFixed(1)} y={(lp.y + 11).toFixed(1)}
                                  textAnchor={anchor}
                                  dominantBaseline="middle"
                                  fill={scoreColor(scoreV)} fontSize={8}
                                  fontFamily="DM Sans, sans-serif"
                                >
                                  {scoreV.toFixed(1)}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </Card>

                  {/* Path Score Vergleich */}
                  <Card>
                    <SLabel text="Investitionspfade · Score-Vergleich" />
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {PATH_SCORES.map(p => {
                        const v = sc[p.key as keyof CompanyScores] as number | undefined;
                        const isHero = sc.hero_path === p.heroKey && !(data.fundamentals.is_listed && p.heroKey === "ipo")
                                    || effectiveHero.path === p.heroKey && data.fundamentals.is_listed;
                        return (
                          <div key={p.key} style={{
                            padding: "12px 14px", borderRadius: C.rMd,
                            background: isHero ? p.color + "12" : "rgba(255,255,255,0.025)",
                            border: `1px solid ${isHero ? p.color + "44" : C.border}`,
                          }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: isHero ? p.color : C.t1, fontFamily: C.display }}>
                                  {p.label}
                                </span>
                                {isHero && (
                                  <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 99, fontFamily: C.mono, color: p.color, background: p.color + "18", border: `1px solid ${p.color}33` }}>
                                    HERO
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: 20, fontWeight: 700, fontFamily: C.mono, color: scoreColor(v) }}>
                                {v != null ? v.toFixed(1) : "—"}
                              </span>
                            </div>
                            <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${((v ?? 0) / 10) * 100}%`, background: scoreColor(v), borderRadius: 99, transition: "width .4s ease" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>

                {/* ── Row 3: Segmentspezifisches Investmentprofil ── */}
                <Card>
                  <SLabel text="Segmentspezifisches Investmentprofil" />
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
                    {([
                      // VC Funds / IPO — nur wenn noch nicht listed
                      ...(data.ipo_status !== "listed" ? [{
                        segment: "VC Funds",
                        scoreKey: "ipo_score" as keyof CompanyScores,
                        focus: "IPO-Readiness · TechReadiness · Time-to-Market",
                        note: () => {
                          const v = sc.ipo_score ?? 0;
                          return v >= 7 ? "Hohes IPO-Potenzial — relevant für Pre-IPO-Runden und Secondary-Märkte."
                            : v >= 4 ? "Moderates IPO-Potenzial — Stage und TechReadiness prüfen."
                            : "Geringes IPO-Potenzial — M&A- oder Enabler-Pfad wahrscheinlicher.";
                        },
                        color: C.teal,
                      }] : []),
                      {
                        segment: "M&A-Boutiquen",
                        scoreKey: "ma_score" as keyof CompanyScores,
                        focus: "SRR × MFR × TechReadiness · Käufer-Universum",
                        note: () => {
                          const v = sc.ma_score ?? 0;
                          return v >= 7 ? "Attraktives M&A-Target — Feasibility-Fenster und Käufer-Fit prüfen."
                            : v >= 4 ? "Bedingt M&A-relevant — Stage und Buyer-Matching beachten."
                            : "Geringe M&A-Eignung — zu früh, zu teuer oder kein Käufer identifiziert.";
                        },
                        color: C.blue,
                      },
                      {
                        segment: "PE Funds",
                        scoreKey: "financial_score" as keyof CompanyScores,
                        focus: "Financial Score · Ownership-Transparenz · Buy-and-Build",
                        note: () => {
                          const v = sc.financial_score ?? 0;
                          return v >= 7 ? "Solide Finanz-Basis — für PE-Einstieg und Buy-and-Build prüfen."
                            : v >= 4 ? "Begrenzte Finanztransparenz — private Company, BA-Bridge prüfen."
                            : "Finanzdaten nicht öffentlich — Stage zu früh für klassisches PE.";
                        },
                        color: C.purple,
                      },
                      {
                        segment: "Asset Manager",
                        scoreKey: "etf_score" as keyof CompanyScores,
                        focus: "ETF-Exposure · Listed Proxies · Korrelation",
                        note: () => {
                          const v = sc.etf_score ?? 0;
                          return v >= 7 ? "Starke ETF-Exposure — im Themen-ETF oder Käufer-Proxy investierbar."
                            : v >= 4 ? "Indirekte Exposure via Käufer-Proxy — Marktdaten in Tab 2 prüfen."
                            : "Kein direkter ETF-Zugang — Enabler-Pfad oder Watch-Liste empfohlen.";
                        },
                        color: C.amber,
                      },
                    ]).map(prof => {
                      const v = sc[prof.scoreKey] as number | undefined;
                      return (
                        <div key={prof.segment} style={{
                          padding: "14px 16px", borderRadius: C.rMd,
                          background: "rgba(255,255,255,0.025)", border: `1px solid ${C.border}`,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: prof.color, fontFamily: C.display }}>{prof.segment}</span>
                            <span style={{ fontSize: 18, fontWeight: 700, fontFamily: C.mono, color: scoreColor(v) }}>
                              {v != null ? v.toFixed(1) : "—"}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, marginBottom: 8 }}>{prof.focus}</div>
                          <div style={{ fontSize: 11, color: C.t2, lineHeight: 1.55 }}>{prof.note()}</div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Disclaimer */}
                <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textAlign: "center", lineHeight: 1.7 }}>
                  Scores basieren auf öffentlichen Daten · Automatisch berechnet via Argo Score Engine · Keine Anlageberatung.
                  {sc.computed_at && (
                    <span> · Stand: {new Date(sc.computed_at).toLocaleDateString("de-DE")}</span>
                  )}
                </div>

              </div>
            );
          })()}

          {/* Tab 8: Investitionspfade */}
          {activeTab === 8 && (() => {
            const sc       = data.scores;
            const isListed = data.fundamentals.is_listed;
            const vdReady  = valueDriversData?.status === "ready";
            const enablers     = vdReady ? valueDriversData!.enablers.filter(e => e.price != null) : [];
            const contributors = vdReady ? valueDriversData!.contributors.filter(e => e.price != null) : [];
            const etfs         = vdReady ? valueDriversData!.etfs : [];

            const scoreColor = (v?: number) =>
              v == null ? C.t3 : v >= 7 ? C.teal : v >= 4 ? C.amber : C.red;

            const ALL_PATHS = [
              {
                key:         "ipo",
                score:       sc?.ipo_score,
                label:       "IPO · Direktinvestment",
                color:       C.teal,
                condition:   isListed
                  ? "Direkter Kauf über Börse — sofortige Liquidität"
                  : "Attraktiv wenn: IPO-Potential hoch · TechReadiness ≥ 0.7 · Stage Series B+",
                description: isListed
                  ? "Company ist bereits börsennotiert."
                  : "Pre-IPO via Sekundärmarkt oder Abwarten des Börsengangs.",
              },
              {
                key:         "m_and_a",
                score:       sc?.ma_score,
                label:       "M&A · Käufer-Proxy",
                color:       C.blue,
                condition:   "Attraktiv wenn: SRR Transformational · MFR Feasible · Strategischer Käufer identifiziert",
                description: "Indirektes Engagement — profitiert wenn M&A-Deal eintritt.",
              },
              {
                key:         "etf",
                score:       sc?.etf_score,
                label:       "ETF-Proxy · Thematisch",
                color:       C.amber,
                condition:   "Attraktiv wenn: Sektor in Themen-ETF abgebildet · Diversifiziertes Marktengagement",
                description: "Breite Sektor-Exposition ohne Einzelwert-Risiko.",
              },
              {
                key:         "enabler",
                score:       sc?.enabler_score,
                label:       "Enabler · Value Chain",
                color:       C.purple,
                condition:   "Attraktiv wenn: Kritische Abhängigkeit von börsennotierten Enablerern · Hoher Dependency-Score",
                description: "Investition in Schlüssel-Enabler der Value Chain.",
              },
            ]
              .filter(p => !(p.key === "ipo" && isListed))
              .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

            const heroPath = sc?.hero_path;
            const sigs     = signalsData?.signals ?? [];
            const posSigs  = sigs.filter(s => s.direction === "positive").slice(0, 2);
            const negSigs  = sigs.filter(s => s.direction === "negative" && s.source !== "internal_absence").slice(0, 1);

            const STAGE_MAP: Record<string, string> = {
              seed: "Seed", series_a: "Series A", series_b: "Series B",
              series_c: "Series C", series_d: "Series D", series_d_plus: "Series D+",
              pre_seed: "Pre-Seed", growth: "Growth", public: "Public",
            };

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                {/* ── Hero Banner ── */}
                {isListed ? (
                  <div style={{
                    padding: "16px 20px",
                    background: `${C.teal}08`,
                    border: `1px solid ${C.tealBorder}`,
                    borderLeft: `4px solid ${C.teal}`,
                    borderRadius: C.rLg,
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                  }}>
                    <div>
                      <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, letterSpacing: ".08em", marginBottom: 6 }}>
                        DIREKTINVESTMENT · BÖRSENNOTIERT
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.teal, fontFamily: C.display }}>
                        {data.fundamentals.ticker ?? data.name} · {data.fundamentals.exchange ?? "—"}
                      </div>
                      <div style={{ fontSize: 12, color: C.t2, marginTop: 4 }}>
                        Direkter Kauf über Börse möglich — sofortige Liquidität.
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {data.fundamentals.price != null && (
                        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: C.mono, color: C.t1 }}>
                          {data.fundamentals.currency === "EUR" ? "€" : "$"}{data.fundamentals.price.toFixed(2)}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: C.t3, fontFamily: C.mono }}>
                        Mcap {fmtBn(data.fundamentals.market_cap_bn)}
                      </div>
                    </div>
                  </div>
                ) : sc?.hero_path_label ? (
                  <div style={{
                    padding: "16px 20px",
                    background: `${scoreColor(sc.hero_score)}08`,
                    border: `1px solid ${scoreColor(sc.hero_score)}33`,
                    borderLeft: `4px solid ${scoreColor(sc.hero_score)}`,
                    borderRadius: C.rLg,
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                  }}>
                    <div>
                      <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, letterSpacing: ".08em", marginBottom: 6 }}>
                        STÄRKSTER INVESTITIONSPFAD
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor(sc.hero_score), fontFamily: C.display }}>
                        {sc.hero_path_label}
                      </div>
                      <div style={{ fontSize: 12, color: C.t2, marginTop: 4 }}>
                        {ALL_PATHS.find(p => p.key === heroPath)?.description ?? ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 32, fontWeight: 700, fontFamily: C.mono, color: scoreColor(sc.hero_score) }}>
                        {sc.hero_score?.toFixed(1)}<span style={{ fontSize: 14, color: C.t3, fontWeight: 400 }}>/10</span>
                      </div>
                      <span style={{
                        fontSize: 12, padding: "3px 12px", borderRadius: 99, fontWeight: 700,
                        color: ratingColor(sc.rating ?? ""), background: ratingColor(sc.rating ?? "") + "18",
                        border: `1px solid ${ratingColor(sc.rating ?? "")}33`, fontFamily: C.mono,
                        display: "inline-block", marginTop: 6,
                      }}>
                        {sc.rating}
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* ── Signal-Kontext ── */}
                {(posSigs.length > 0 || negSigs.length > 0) && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {posSigs.map((s, i) => (
                      <div key={i} style={{
                        flex: 1, minWidth: 180, padding: "7px 12px",
                        background: `${C.teal}06`, border: `1px solid ${C.teal}20`,
                        borderLeft: `3px solid ${C.teal}`, borderRadius: `0 ${C.rSm} ${C.rSm} 0`,
                        fontSize: 11, color: C.t2, lineHeight: 1.45,
                      }}>
                        <span style={{ color: C.teal, fontFamily: C.mono, fontSize: 9, display: "block", marginBottom: 2 }}>↑ SIGNAL</span>
                        {s.summary.length > 90 ? s.summary.slice(0, 90) + "…" : s.summary}
                      </div>
                    ))}
                    {negSigs.map((s, i) => (
                      <div key={i} style={{
                        flex: 1, minWidth: 180, padding: "7px 12px",
                        background: `${C.red}05`, border: `1px solid ${C.red}15`,
                        borderLeft: `3px solid ${C.red}44`, borderRadius: `0 ${C.rSm} ${C.rSm} 0`,
                        fontSize: 11, color: C.t2, lineHeight: 1.45,
                      }}>
                        <span style={{ color: C.red, fontFamily: C.mono, fontSize: 9, display: "block", marginBottom: 2 }}>↓ SIGNAL</span>
                        {s.summary.length > 90 ? s.summary.slice(0, 90) + "…" : s.summary}
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Pfad-Karten — ranked by score ── */}
                {ALL_PATHS.map((path, rank) => {
                  const isHero = path.key === heroPath && !isListed;
                  const pc     = path.color;

                  return (
                    <div key={path.key} style={{
                      border:       `1px solid ${isHero ? pc + "44" : C.border}`,
                      borderRadius: C.rLg,
                      overflow:     "hidden",
                      background:   isHero ? pc + "06" : C.bgCard,
                    }}>
                      {/* Card Header */}
                      <div style={{ padding: "13px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.border}` }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: isHero ? pc : C.t1, fontFamily: C.display }}>
                              {path.label}
                            </span>
                            {isHero && (
                              <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 99, fontFamily: C.mono, color: pc, background: pc + "18", border: `1px solid ${pc}33`, fontWeight: 700 }}>
                                HERO
                              </span>
                            )}
                            <span style={{ fontSize: 9, color: C.t3, fontFamily: C.mono }}>#{rank + 1}</span>
                          </div>
                          <div style={{ fontSize: 11, color: C.t3, marginTop: 3, lineHeight: 1.4 }}>
                            {path.condition}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: C.mono, color: scoreColor(path.score) }}>
                            {path.score != null ? path.score.toFixed(1) : "—"}
                          </div>
                          <div style={{ width: 56, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", marginTop: 4, marginLeft: "auto" }}>
                            <div style={{ height: "100%", width: `${((path.score ?? 0) / 10) * 100}%`, background: scoreColor(path.score), borderRadius: 99 }} />
                          </div>
                        </div>
                      </div>

                      {/* Instruments */}
                      <div style={{ padding: "14px 20px" }}>

                        {path.key === "ipo" && (
                          <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.6 }}>
                            {data.ipo_potential === "Hoch"
                              ? `IPO-Potential: Hoch — Sekundärmarkt oder Pre-IPO-Runden evaluieren. Stage: ${STAGE_MAP[data.funding_stage ?? ""] ?? data.funding_stage ?? "—"}.`
                              : `IPO-Potential: ${data.ipo_potential ?? "—"} — Zeitpunkt beobachten, Stage ${STAGE_MAP[data.funding_stage ?? ""] ?? "—"}.`
                            }
                          </div>
                        )}

                        {path.key === "m_and_a" && (
                          data.scorings.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                              {data.scorings.slice(0, 4).map(s => (
                                <div key={s.buyer_name} style={{
                                  display: "flex", alignItems: "center", gap: 12,
                                  padding: "9px 14px", borderRadius: C.rMd,
                                  background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`,
                                }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: C.t1 }}>{s.buyer_name}</div>
                                    <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, marginTop: 1 }}>
                                      SRR {s.srr_value.toFixed(2)}× · MFR {s.mfr_value.toFixed(2)}× · {s.mfr_signal}
                                    </div>
                                  </div>
                                  {s.ticker && (
                                    <span style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: C.blue }}>{s.ticker}</span>
                                  )}
                                  <span style={{
                                    fontSize: 11, padding: "2px 10px", borderRadius: 99, fontWeight: 600,
                                    color: ratingColor(s.rating), background: ratingColor(s.rating) + "18",
                                    border: `1px solid ${ratingColor(s.rating)}33`, fontFamily: C.mono,
                                  }}>
                                    {s.rating}
                                  </span>
                                </div>
                              ))}
                              {data.scorings.length > 4 && (
                                <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, paddingLeft: 4 }}>
                                  +{data.scorings.length - 4} weitere — Details in Tab Scoring & Investmentprofil
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: C.t3 }}>Kein strategischer Käufer mit Scoring identifiziert.</div>
                          )
                        )}

                        {path.key === "etf" && (
                          etfs.length > 0 ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {etfs.map(etf => (
                                <div key={etf.ticker} style={{
                                  padding: "8px 14px", borderRadius: C.rMd,
                                  background: C.purpleDim, border: `1px solid ${C.purple}33`,
                                  display: "flex", alignItems: "center", gap: 10,
                                }}>
                                  <span style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: C.purple }}>{etf.ticker}</span>
                                  <span style={{ fontSize: 11, color: C.t2 }}>{etf.name}</span>
                                  <div style={{ width: 30, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                                    <div style={{ height: "100%", width: `${etf.relevance * 100}%`, background: C.purple, borderRadius: 99 }} />
                                  </div>
                                  <span style={{ fontSize: 10, color: C.t3, fontFamily: C.mono }}>{Math.round(etf.relevance * 100)}%</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: C.t3 }}>
                              {vdReady ? "Kein direkter ETF-Treffer identifiziert." : "ETF-Daten werden geladen…"}
                            </div>
                          )
                        )}

                        {path.key === "enabler" && (
                          (enablers.length > 0 || contributors.length > 0) ? (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                              {[...enablers, ...contributors]
                                .sort((a, b) => b.relevance - a.relevance)
                                .slice(0, 6)
                                .map(e => {
                                  const ac = e.type === "enabler" ? C.blue : C.teal;
                                  return (
                                    <div key={e.ticker} style={{
                                      padding: "10px 12px", borderRadius: C.rMd,
                                      background: "rgba(255,255,255,0.025)", border: `1px solid ${C.border}`,
                                      display: "flex", alignItems: "center", gap: 10,
                                    }}>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: ac }}>{e.ticker}</div>
                                        <div style={{ fontSize: 10, color: C.t3, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</div>
                                      </div>
                                      {e.price != null && (
                                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                                          <div style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 600, color: C.t1 }}>
                                            {e.currency === "EUR" ? "€" : "$"}{e.price.toFixed(2)}
                                          </div>
                                          <div style={{ fontSize: 9, color: C.t3, fontFamily: C.mono }}>{Math.round(e.relevance * 100)}%</div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: C.t3 }}>
                              {vdReady ? "Keine börsennotierten Enabler verfügbar." : "Value Chain wird geladen…"}
                            </div>
                          )
                        )}

                      </div>
                    </div>
                  );
                })}

                <div style={{ fontSize: 9, color: C.t3, fontFamily: C.mono, textAlign: "center", marginTop: 4 }}>
                  Rangfolge nach Argo Score Engine · Keine Anlageberatung
                </div>

              </div>
            );
          })()}

          {activeTab === 9 && (() => {
            const EVENT_LABELS: Record<string, string> = {
              ipo_status_change: "IPO",
              funding_round:     "Funding",
              m_and_a_event:     "M&A",
              earnings:          "Earnings",
              ownership_change:  "Ownership",
              kpi_breakout:      "KPI",
              news:              "News",
            };
            const EVENT_COLORS: Record<string, string> = {
              ipo_status_change: C.teal,
              funding_round:     C.blue,
              m_and_a_event:     C.purple,
              earnings:          C.amber,
              ownership_change:  C.amber,
              kpi_breakout:      C.teal,
              news:              C.t3,
            };
            const SOURCE_LABELS: Record<string, string> = {
              edgar:            "SEC EDGAR",
              google_news:      "Google News",
              techcrunch:       "TechCrunch",
              internal:         "Argo Intern",
              internal_absence: "Argo Intern",
            };

            const dirColor = (d?: string) =>
              d === "positive" ? C.teal : d === "negative" ? C.red : C.t3;
            const dirLabel = (d?: string) =>
              d === "positive" ? "↑" : d === "negative" ? "↓" : "→";
            const sevDot = (s: string) =>
              s === "high" ? C.red : s === "medium" ? C.amber : C.teal;
            const sevLabel = (s: string) =>
              s === "high" ? "HIGH" : s === "medium" ? "MED" : "LOW";

            const signals = signalsData?.signals ?? [];

            // Filter-Optionen: event_type + direction
            const [dirFilter, setDirFilter] = [sigFilter.startsWith("dir:") ? sigFilter.slice(4) : "", (v: string) => setSigFilter(v ? `dir:${v}` : "all")];
            const activeTypeFilter = sigFilter.startsWith("dir:") ? "all" : sigFilter;
            const filterTypes = ["all", ...Array.from(new Set(signals.map(s => s.event_type)))];

            const filtered = signals.filter(s => {
              const typeOk   = activeTypeFilter === "all" || s.event_type === activeTypeFilter;
              const dirOk    = !dirFilter || s.direction === dirFilter;
              return typeOk && dirOk;
            });

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Filter-Chips Zeile 1: Event-Type */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {filterTypes.map(ft => (
                    <button
                      key={ft}
                      onClick={() => setSigFilter(ft)}
                      style={{
                        padding: "5px 14px", borderRadius: 99, fontSize: 11,
                        fontFamily: C.mono, fontWeight: 500, cursor: "pointer",
                        border: `1px solid ${activeTypeFilter === ft ? C.teal : C.border}`,
                        background: activeTypeFilter === ft ? C.tealDim : "transparent",
                        color: activeTypeFilter === ft ? C.teal : C.t2,
                        transition: "all .15s",
                      }}
                    >
                      {ft === "all" ? "Alle" : (EVENT_LABELS[ft] ?? ft)}
                      {ft !== "all" && (
                        <span style={{ marginLeft: 6, color: C.t3 }}>
                          {signals.filter(s => s.event_type === ft).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Filter-Chips Zeile 2: Direction */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".06em" }}>Richtung</span>
                  {(["", "positive", "negative", "neutral"] as const).map(d => (
                    <button
                      key={d || "all"}
                      onClick={() => setDirFilter(d)}
                      style={{
                        padding: "4px 12px", borderRadius: 99, fontSize: 10,
                        fontFamily: C.mono, cursor: "pointer",
                        border: `1px solid ${dirFilter === d ? dirColor(d || undefined) : C.border}`,
                        background: dirFilter === d ? (dirColor(d || undefined) + "15") : "transparent",
                        color: dirFilter === d ? dirColor(d || undefined) : C.t3,
                        transition: "all .15s",
                      }}
                    >
                      {d === "" ? "Alle" : d === "positive" ? "↑ Potenzial" : d === "negative" ? "↓ Risiko" : "→ Neutral"}
                      {d !== "" && (
                        <span style={{ marginLeft: 5, opacity: 0.6 }}>
                          {signals.filter(s => s.direction === d).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Signal-Timeline */}
                <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: C.rLg, padding: "18px 20px" }}>
                  <SLabel text={`Signal History · ${filtered.length} Events`} />

                  {signalsLoading && (
                    <div style={{ padding: "24px 0", textAlign: "center", color: C.t3, fontSize: 12, fontFamily: C.mono }}>
                      Lade Signals…
                    </div>
                  )}

                  {!signalsLoading && filtered.length === 0 && (
                    <div style={{ padding: "24px 0", textAlign: "center" }}>
                      <div style={{ color: C.t2, fontSize: 13, marginBottom: 6 }}>
                        {signals.length === 0
                          ? "Noch keine Signals vorhanden."
                          : `Keine Events für gewählte Filter.`}
                      </div>
                      {signals.length === 0 && (
                        <div style={{ color: C.t3, fontSize: 11, fontFamily: C.mono }}>
                          Signal-Engine läuft täglich 06:00 UTC — erste Signale erscheinen nach dem nächsten Cron-Run.
                        </div>
                      )}
                    </div>
                  )}

                  {filtered.map((sig, i) => (
                    <div
                      key={sig.id ?? i}
                      style={{
                        display: "flex", gap: 14, padding: "12px 0",
                        borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none",
                        borderLeft: sig.severity === "high" ? `3px solid ${C.red}` :
                                    sig.direction === "positive" ? `3px solid ${C.teal}` :
                                    sig.direction === "negative" ? `3px solid ${C.red}22` : "none",
                        paddingLeft: sig.severity === "high" || sig.direction ? 12 : 0,
                      }}
                    >
                      {/* Severity Dot + Label */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 36, paddingTop: 2 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: sevDot(sig.severity) }} />
                        <span style={{ fontSize: 9, color: sevDot(sig.severity), fontFamily: C.mono, fontWeight: 600 }}>
                          {sevLabel(sig.severity)}
                        </span>
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                          {/* Datum */}
                          <span style={{ fontSize: 11, color: C.t3, fontFamily: C.mono }}>
                            {sig.event_date}
                          </span>
                          {/* Event-Type Badge */}
                          <span style={{
                            fontSize: 10, padding: "2px 8px", borderRadius: 99, fontFamily: C.mono,
                            color: EVENT_COLORS[sig.event_type] ?? C.t2,
                            background: (EVENT_COLORS[sig.event_type] ?? C.t2) + "18",
                            border: `1px solid ${(EVENT_COLORS[sig.event_type] ?? C.t2)}33`,
                          }}>
                            {EVENT_LABELS[sig.event_type] ?? sig.event_type}
                          </span>
                          {/* Direction Badge — neu Session 10 */}
                          {sig.direction && sig.direction !== "neutral" && (
                            <span style={{
                              fontSize: 10, padding: "2px 8px", borderRadius: 99, fontFamily: C.mono,
                              color: dirColor(sig.direction),
                              background: dirColor(sig.direction) + "15",
                              border: `1px solid ${dirColor(sig.direction)}33`,
                              fontWeight: 600,
                            }}>
                              {dirLabel(sig.direction)} {sig.direction === "positive" ? "Potenzial" : "Risiko"}
                            </span>
                          )}
                          {/* Source + Domain */}
                          <span style={{ fontSize: 10, color: C.t3, fontFamily: C.mono }}>
                            {SOURCE_LABELS[sig.source] ?? sig.source}
                            {sig.source_domain && sig.source !== "edgar" && (
                              <span style={{ opacity: 0.6 }}> · {sig.source_domain}</span>
                            )}
                          </span>
                          {/* Relevance Score */}
                          {sig.relevance_score != null && (
                            <span style={{
                              fontSize: 9, color: C.t3, fontFamily: C.mono,
                              padding: "1px 6px", borderRadius: 4,
                              background: "rgba(255,255,255,0.04)",
                              border: `1px solid ${C.border}`,
                            }}>
                              {Math.round(sig.relevance_score * 100)}% conf
                            </span>
                          )}
                        </div>

                        {/* Summary */}
                        <div style={{ fontSize: 13, color: C.t1, lineHeight: 1.5, marginBottom: 4 }}>
                          {sig.summary}
                        </div>

                        {/* Funding Amount wenn vorhanden — B-05 */}
                        {sig.funding_amount_usd_mn != null && (
                          <div style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "3px 9px", borderRadius: 99, marginBottom: 4,
                            background: C.blueDim, border: `1px solid ${C.blue}33`,
                            fontSize: 11, color: C.blue, fontFamily: C.mono, fontWeight: 600,
                          }}>
                            💰 {sig.funding_amount_usd_mn >= 1000
                              ? `$${(sig.funding_amount_usd_mn / 1000).toFixed(1)}B`
                              : `$${sig.funding_amount_usd_mn}M`}
                          </div>
                        )}

                        {/* Source Link */}
                        {sig.source_url && (
                          <a
                            href={sig.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 11, color: C.teal, fontFamily: C.mono, textDecoration: "none", display: "block" }}
                          >
                            Quelle → {sig.source_domain ?? (sig.source_url.length > 55 ? sig.source_url.slice(0, 55) + "…" : sig.source_url)}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Funding History — immer anzeigen */}
                <FundingTimeline rounds={data.funding_rounds} />
              </div>
            );
          })()}

          {/* KPI Timeline Modal */}
          {kpiModalMetric && kpiData?.[kpiModalMetric] && (
            <KpiTimelineModal
              metric={kpiModalMetric}
              points={kpiData[kpiModalMetric]}
              onClose={() => setKpiModalMetric(null)}
            />
          )}

          {/* Warnings */}
          {data.warnings.length > 0 && (
            <div style={{ marginTop: 16 }}>
              {data.warnings.map((w, i) => (
                <div key={i} style={{ padding: "8px 14px", marginBottom: 6, background: C.amberDim, border: `1px solid ${C.amber}22`, borderRadius: C.rSm, fontSize: 11, color: C.amber }}>⚠ {w}</div>
              ))}
            </div>
          )}

        </>)}
      </div>
    </div>
  );
}
