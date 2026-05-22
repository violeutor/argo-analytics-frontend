"use client";

import { useEffect, useState } from "react";
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
  product_description?: string; technology_tags: string[];
  tam_usd_bn: number; tam_source: string; tam_confidence: string;
  ipo_status?: string; ipo_potential?: string; ipo_probability_pct?: number;
  investment_path?: string; proxy_ticker?: string;
  funding_total_usd_mn?: number; funding_last_round?: string; funding_stage?: string;
  funding_rounds: FundingRoundItem[];
  ownership: OwnershipItem[]; fundamentals: FundamentalsData;
  scorings: ScoringDetail[];
  supply_chain_upstream: SupplyItem[]; supply_chain_downstream: SupplyItem[];
  supply_chain_etfs: { ticker: string; name: string; relevance: number }[];
  last_signal?: string; last_signal_date?: string;
  market_data?: MarketData;
  is_known: boolean; warnings: string[];
}

// ── Design tokens (Mockup v2) ─────────────────────────────────────────────────

const C = {
  bg: "#0D0F12", bgCard: "#13161B", bgHover: "#1A1E24",
  border: "rgba(255,255,255,0.06)", borderMd: "rgba(255,255,255,0.10)",
  teal: "#00D4A0", tealDim: "rgba(0,212,160,0.08)", tealBorder: "rgba(0,212,160,0.20)",
  blue: "#3B6EF0", blueDim: "rgba(59,110,240,0.10)",
  amber: "#F0A500", amberDim: "rgba(240,165,0,0.10)",
  red: "#F04545", redDim: "rgba(240,69,69,0.10)",
  purple: "#9B6EF0", purpleDim: "rgba(155,110,240,0.10)",
  t1: "#F0F0EE", t2: "#9A9B99", t3: "#4A4C4A",
  mono: "'DM Mono',monospace",
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
  return <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 12 }}>{text}</div>;
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
      <span style={{ fontSize: 12, color: C.t2 }}>{k}</span>
      <span style={{ fontSize: 12, color: vColor ?? C.t1, fontWeight: 500, fontFamily: C.mono }}>{v}</span>
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

// ── Main ──────────────────────────────────────────────────────────────────────

const API_BASE = "/api/backend";
const TABS = ["Überblick", "Markt", "Ownership", "Fundamentals", "Potenziale & Risiken", "Peer Review", "Value Drivers", "Exposure Types", "Signal History"];

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

  useEffect(() => {
    if (!name) return;
    const wl: string[] = JSON.parse(localStorage.getItem("argo_watchlist") ?? "[]");
    setStarred(wl.includes(name));
  }, [name]);

  useEffect(() => {
    if (!name) return;
    fetch(`${API_BASE}/api/v1/company/${encodeURIComponent(name)}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [name]);

  // Market-Data Polling: wenn market_data fehlt oder unvollständig →
  // /market-Endpunkt alle 8s pollen (max 5 Versuche) bis status = "ready"
  useEffect(() => {
    if (!name || loading) return;
    const isReady = (md?: MarketData | null) =>
      md?.status === "ready" || (md?.sam_usd_bn != null && md?.enriched_at != null);
    if (isReady(data?.market_data)) return;

    let attempts = 0;
    const MAX = 5;
    const INTERVAL = 8000;

    const poll = () => {
      if (attempts >= MAX) return;
      attempts++;
      fetch(`${API_BASE}/api/v1/company/${encodeURIComponent(name)}/market`)
        .then(r => r.ok ? r.json() : null)
        .then((md: MarketData | null) => {
          if (!md) return;
          setData(prev => prev ? { ...prev, market_data: md } : prev);
          if (!isReady(md) && attempts < MAX) {
            timer = window.setTimeout(poll, INTERVAL);
          }
        })
        .catch(() => { /* silent — polling läuft weiter */ });
    };

    let timer = window.setTimeout(poll, 3000); // erster Poll nach 3s
    return () => window.clearTimeout(timer);
  }, [name, loading, data?.market_data?.sam_usd_bn]);

  // Ownership Polling — analog zu Market
  const [ownershipData, setOwnershipData] = useState<OwnershipData | null>(null);
  const [ownershipLoading, setOwnershipLoading] = useState(false);

  useEffect(() => {
    if (!name || loading) return;
    const isReady = (od?: OwnershipData | null) =>
      od?.status === "ready" || od?.status === "manual";
    if (isReady(ownershipData)) return;

    setOwnershipLoading(true);
    let attempts = 0;
    const MAX = 5;
    const INTERVAL = 8000;

    const poll = () => {
      if (attempts >= MAX) { setOwnershipLoading(false); return; }
      attempts++;
      fetch(`${API_BASE}/api/v1/company/${encodeURIComponent(name)}/ownership`)
        .then(r => r.ok ? r.json() : null)
        .then((od: OwnershipData | null) => {
          if (!od) return;
          setOwnershipData(od);
          if (isReady(od)) {
            setOwnershipLoading(false);
          } else if (attempts < MAX) {
            ownershipTimer = window.setTimeout(poll, INTERVAL);
          } else {
            setOwnershipLoading(false);
          }
        })
        .catch(() => { setOwnershipLoading(false); });
    };

    let ownershipTimer = window.setTimeout(poll, 1000);
    return () => window.clearTimeout(ownershipTimer);
  }, [name, loading, ownershipData?.entries?.length]);

  // Signals — einmaliger Fetch beim ersten Tab-4- oder Tab-9-Besuch
  const [sigFilter, setSigFilter] = useState<string>("all");
  const [signalsData, setSignalsData] = useState<SignalsData | null>(null);
  const [signalsLoading, setSignalsLoading] = useState(false);

  useEffect(() => {
    if (!name || loading || (activeTab !== 4 && activeTab !== 8)) return;
    if (signalsData) return; // bereits geladen
    console.log("[Argo] fetchSignals →", name, "activeTab=", activeTab);
    setSignalsLoading(true);
    fetch(`${API_BASE}/api/v1/company/${encodeURIComponent(name)}/signals`)
      .then(r => { console.log("[Argo] signals status=", r.status); return r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`); })
      .then((sd: SignalsData) => { console.log("[Argo] signals count=", sd?.signals?.length); setSignalsData(sd); })
      .catch((e) => { console.error("[Argo] signals error:", e); })
      .finally(() => setSignalsLoading(false));
  }, [name, loading, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Peers — einmaliger Fetch beim ersten Tab-5-Besuch (Claude generiert on-demand)
  const [peersData, setPeersData] = useState<PeersResponse | null>(null);
  const [peersLoading, setPeersLoading] = useState(false);

  useEffect(() => {
    if (!name || loading || activeTab !== 5) return;
    if (peersData) return;
    console.log("[Argo] fetchPeers →", name, "activeTab=", activeTab);
    setPeersLoading(true);
    fetch(`${API_BASE}/api/v1/company/${encodeURIComponent(name)}/peers`)
      .then(r => { console.log("[Argo] peers status=", r.status); return r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`); })
      .then((pd: PeersResponse) => { console.log("[Argo] peers count=", pd?.peers?.length); setPeersData(pd); })
      .catch((e) => { console.error("[Argo] peers error:", e); })
      .finally(() => setPeersLoading(false));
  }, [name, loading, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps


  // Assessments — on-demand Claude-Call beim ersten Tab-4-Besuch
  const [assessmentsData, setAssessmentsData] = useState<any | null>(null);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);

  useEffect(() => {
    if (!name || loading || activeTab !== 4) return;
    if (assessmentsData) return;
    console.log("[Argo] fetchAssessments →", name);
    setAssessmentsLoading(true);
    fetch(`${API_BASE}/api/v1/company/${encodeURIComponent(name)}/assessments`)
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then((d: any) => { console.log("[Argo] assessments source=", d?.source); setAssessmentsData(d); })
      .catch((e) => { console.error("[Argo] assessments error:", e); })
      .finally(() => setAssessmentsLoading(false));
  }, [name, loading, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Value Drivers Polling — analog zu Market + Ownership
  const [valueDriversData, setValueDriversData] = useState<ValueDriversData | null>(null);

  useEffect(() => {
    if (!name || loading) return;
    if (valueDriversData?.status === "ready" || valueDriversData?.status === "empty") return;

    let attempts = 0;
    const MAX = 5;

    const poll = () => {
      if (attempts >= MAX) return;
      attempts++;
      fetch(`${API_BASE}/api/v1/company/${encodeURIComponent(name)}/value-drivers`)
        .then(r => r.ok ? r.json() : null)
        .then((vd: ValueDriversData | null) => {
          if (!vd) return;
          setValueDriversData(vd);
          if (vd.status !== "ready" && vd.status !== "empty" && attempts < MAX) {
            vdTimer = window.setTimeout(poll, 8000);
          }
        })
        .catch(() => {});
    };

    let vdTimer = window.setTimeout(poll, 2000);
    return () => window.clearTimeout(vdTimer);
  }, [name, loading, valueDriversData?.status]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.t1, fontFamily: C.body, fontSize: 15 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400;500&display=swap');
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
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {data.scorings[0] && (
                  <span style={{ fontSize: 12, padding: "5px 14px", borderRadius: 99, fontWeight: 600, color: ratingColor(data.scorings[0].rating), background: ratingColor(data.scorings[0].rating) + "18", border: `1px solid ${ratingColor(data.scorings[0].rating)}33` }}>
                    {data.scorings[0].rating}
                  </span>
                )}
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

          {/* Tab Nav */}
          <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `1px solid ${C.border}`, overflowX: "auto" }}>
            {TABS.map((tab, i) => (
              <button key={tab} onClick={() => setActiveTab(i)} style={{
                padding: "8px 18px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                border: "none", background: "none", whiteSpace: "nowrap",
                color: activeTab === i ? C.teal : C.t2,
                borderBottom: activeTab === i ? `2px solid ${C.teal}` : "2px solid transparent",
                marginBottom: -1, transition: "all .15s", fontFamily: C.body,
              }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Tab 0: Überblick */}
          {activeTab === 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
              {/* Linke Spalte: Intro */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {data.intro && (
                  <Card>
                    <SLabel text="Einordnung" />
                    <div style={{ fontSize: 14, lineHeight: 1.8, color: C.t1 }}>{data.intro}</div>
                    <div style={{ marginTop: 10, fontSize: 10, color: C.t3, fontFamily: C.mono }}>↳ Generated by Claude · Argo Analytics Intelligence Layer</div>
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
                <Card>
                  <SLabel text="Markt & Positionierung" />
                  <InfoRow k="Sektor" v={data.industry ?? "—"} />
                  <InfoRow k="TAM 2035" v={`$${data.tam_usd_bn}B`} vColor={confColor(data.tam_confidence)} />
                  <InfoRow k="TAM-Quelle" v={data.tam_source} />
                  <InfoRow k="Konfidenz" v={data.tam_confidence} vColor={confColor(data.tam_confidence)} />
                  <InfoRow k="Funding Total" v={fmtM(data.funding_total_usd_mn)} />
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
            const confColor2 = (c?: string) =>
              c === "high" ? C.teal : c === "medium" ? C.amber : C.red;

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

                {/* Row 1: TAM · SAM · CAGR · Zyklus */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
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

                {/* Row 3: Regionale Verteilung + Wettbewerb */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

                  {/* Regionale Verteilung */}
                  <Card>
                    <SLabel text="Regionale Verteilung" />
                    {md.regional_breakdown && md.regional_breakdown.length > 0 ? (
                      <>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {md.regional_breakdown.slice(0, 6).map((r, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 11, fontFamily: C.mono, color: C.t2, minWidth: 28 }}>{r.region}</span>
                              <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${r.share_pct}%`, background: C.blue, borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: 11, fontFamily: C.mono, color: C.t2, minWidth: 36, textAlign: "right" }}>{r.share_pct.toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                        {md.regional_sources && (
                          <div style={{ marginTop: 10, fontSize: 10, color: C.t3, fontFamily: C.mono }}>
                            Quelle: {md.regional_sources.join(", ")}
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: C.t3, fontStyle: "italic" }}>Regionale Daten werden angereichert.</div>
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
                            {md.competition_score ? md.competition_score.charAt(0).toUpperCase() + md.competition_score.slice(1) : "—"}
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
            const entries         = showPipeline ? pipelineEntries : curatedEntries;
            const cap             = ownershipData?.cap_table;
            const isPending       = ownershipLoading || (ownershipData?.status === "pending" || ownershipData?.status === "running");

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

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
                    <SLabel text={showPipeline ? "Investoren & Gesellschafter" : "Bekannte Investoren"} />
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

                    {/* BA-Bridge Daten (private DE) */}
                    {f.ba_found && (
                      <Card>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                          <SLabel text="Bundesanzeiger · Finanzkennzahlen" />
                          <SourceBadge source="ba_bridge" />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                          <FundTile label="Umsatz" val={f.ba_revenue_mn != null ? `€${f.ba_revenue_mn.toFixed(1)}M` : "—"} color={C.t1} />
                          <FundTile label="Eigenkapital" val={f.ba_equity_mn != null ? `€${f.ba_equity_mn.toFixed(1)}M` : "—"} />
                          <FundTile label="Bilanzsumme" val={f.ba_total_assets_mn != null ? `€${f.ba_total_assets_mn.toFixed(1)}M` : "—"} />
                          <FundTile label="Mitarbeiter" val={f.ba_employees != null ? f.ba_employees.toLocaleString("de-DE") : "—"} />
                        </div>
                        {f.ba_last_report_year && (
                          <div style={{ marginTop: 8, fontSize: 10, color: C.t3, fontFamily: C.mono }}>
                            Letzter Jahresabschluss: {f.ba_last_report_year}
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
            const compOpp   = assessmentsData?.composite_opportunity;
            const compRisk  = assessmentsData?.composite_risk;

            // Signal-Score Hero (Signal-Engine basiert)
            const potSignals     = signals.filter((s: SignalItem) => s.direction === "positive");
            const riskSignals    = signals.filter((s: SignalItem) => s.direction === "negative" && s.source !== "internal_absence");
            const absenceSignals = signals.filter((s: SignalItem) => s.direction === "negative" && s.source === "internal_absence");
            const rawScore = Math.max(0, Math.min(100,
              50 + (potSignals.length * 10) - (riskSignals.length * 8) - (absenceSignals.length * 3)
            ));
            const scoreColor = rawScore >= 65 ? C.teal : rawScore >= 40 ? C.amber : C.red;
            const scoreLabel = rawScore >= 65 ? "Positiv" : rawScore >= 40 ? "Gemischt" : "Kritisch";

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

              return (
                <div style={{
                  display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
                  gap: 0, borderBottom: `1px solid ${C.border}`,
                }}>
                  {/* Links: Potenzial */}
                  <div style={{ padding: "14px 16px", borderRight: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      {oppScore !== null && <ScoreBadge score={oppScore} side="opp" />}
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: C.teal, fontFamily: C.mono, letterSpacing: ".05em" }}>
                          {label.toUpperCase()}
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
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: C.red, fontFamily: C.mono, letterSpacing: ".05em" }}>
                          {label.toUpperCase()}
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
                {/* Hero Score */}
                <Card style={{ marginBottom: 16, textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", gap: 48, alignItems: "center" }}>
                    {/* Signal Score */}
                    <div>
                      <div style={{ fontSize: 9, color: C.t3, fontFamily: C.mono, marginBottom: 4 }}>SIGNAL-SCORE</div>
                      <div style={{ fontSize: 42, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{rawScore}</div>
                      <div style={{ fontSize: 11, color: scoreColor, marginTop: 3, fontFamily: C.mono }}>{scoreLabel}</div>
                    </div>
                    {/* Composite Opportunity */}
                    {compOpp != null && (
                      <div>
                        <div style={{ fontSize: 9, color: C.t3, fontFamily: C.mono, marginBottom: 4 }}>OPP. SCORE</div>
                        <div style={{ fontSize: 42, fontWeight: 700, color: C.teal, lineHeight: 1 }}>{Number(compOpp).toFixed(1)}</div>
                        <div style={{ fontSize: 9, color: C.t3, fontFamily: C.mono, marginTop: 3 }}>/ 10</div>
                      </div>
                    )}
                    {/* Composite Risk */}
                    {compRisk != null && (
                      <div>
                        <div style={{ fontSize: 9, color: C.t3, fontFamily: C.mono, marginBottom: 4 }}>RISK SCORE</div>
                        <div style={{ fontSize: 42, fontWeight: 700, color: C.red, lineHeight: 1 }}>{Number(compRisk).toFixed(1)}</div>
                        <div style={{ fontSize: 9, color: C.t3, fontFamily: C.mono, marginTop: 3 }}>/ 10</div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 12 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.teal }}>{potSignals.length}</div>
                      <div style={{ fontSize: 9, color: C.t3, fontFamily: C.mono }}>POTENZIALE</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.red }}>{riskSignals.length}</div>
                      <div style={{ fontSize: 9, color: C.t3, fontFamily: C.mono }}>RISIKEN</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.amber }}>{absenceSignals.length}</div>
                      <div style={{ fontSize: 9, color: C.t3, fontFamily: C.mono }}>DATENLÜCKEN</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: C.t3, marginTop: 10, fontFamily: C.mono }}>
                    Signal-Engine · {signals.length} Signals · Assessment: {assessmentsData ? `${assessmentsData.source} · ${assessmentsData.model?.replace("claude-", "Claude ")}` : "lädt…"}
                  </div>
                </Card>

                {/* Assessment Loading */}
                {assessmentsLoading && (
                  <Card style={{ textAlign: "center", padding: 32 }}>
                    <div style={{ fontSize: 12, color: C.teal, fontFamily: C.mono, marginBottom: 8 }}>
                      ◎ Assessment wird generiert…
                    </div>
                    <div style={{ fontSize: 11, color: C.t3 }}>
                      Claude analysiert Markt, Finanzen, Strategie, Political Environment, Technologie und operative Stärke.
                    </div>
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
                  Automatisch generiert · Keine Anlageberatung · Stand: {new Date().toLocaleDateString("de-DE")}
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
                    {/* Cache-Badge */}
                    {peersData?.from_cache && (
                      <div style={{ fontSize: 9, color: C.t3, fontFamily: C.mono, marginBottom: 10, textAlign: "right" }}>
                        Cached · {peersData.generated_at?.slice(0, 10)}
                      </div>
                    )}

                    {/* Block 1: Peer-Gruppe */}
                    <Card style={{ marginBottom: 12 }}>
                      <SLabel text={`Wettbewerber (${peers.length})`} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {peers.map(p => (
                          <div key={p.id} style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 80px 80px 90px",
                            alignItems: "center", gap: 8,
                            padding: "8px 0",
                            borderBottom: `1px solid ${C.border}`,
                          }}>
                            {/* Name + Beschreibung */}
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: C.t1 }}>
                                {regionFlag(p.region)} {p.name}
                                {p.ticker && (
                                  <span style={{ fontSize: 9, color: C.teal, fontFamily: C.mono, marginLeft: 6 }}>
                                    {p.ticker}
                                  </span>
                                )}
                              </div>
                              {p.description && (
                                <div style={{ fontSize: 10, color: C.t3, marginTop: 2, lineHeight: 1.4 }}>
                                  {p.description.slice(0, 100)}{p.description.length > 100 ? "…" : ""}
                                </div>
                              )}
                            </div>
                            {/* Stage */}
                            <div style={{
                              fontSize: 9, fontFamily: C.mono,
                              color: stageColor(p.stage_normalized),
                              background: stageColor(p.stage_normalized) + "18",
                              borderRadius: 3, padding: "2px 6px", textAlign: "center",
                            }}>
                              {p.stage_normalized ?? "—"}
                            </div>
                            {/* Funding */}
                            <div style={{ fontSize: 11, color: C.teal, fontFamily: C.mono, textAlign: "right" }}>
                              {p.funding_total_usd_mn
                                ? p.funding_total_usd_mn >= 1000
                                  ? `$${(p.funding_total_usd_mn / 1000).toFixed(1)}B`
                                  : `$${p.funding_total_usd_mn.toFixed(0)}M`
                                : "—"}
                            </div>
                            {/* Headcount */}
                            <div style={{ fontSize: 11, color: C.t2, textAlign: "right" }}>
                              {p.headcount ? `${p.headcount.toLocaleString()} MA` : "—"}
                            </div>
                          </div>
                        ))}
                      </div>
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
          {activeTab === 7 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Abschnitt 1: Direkt / Käufer-Proxy Scoring */}
              <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 4 }}>
                Käufer-Proxies · M&A Feasibility Scoring
              </div>
              {data.scorings.map((s, i) => (
                <ScoringCard
                  key={s.buyer_name}
                  s={s}
                  rank={i + 1}
                  showTR={!data.fundamentals.is_listed}
                />
              ))}

              {/* Abschnitt 2: Value Chain — 2-Spalten Grid */}
              {valueDriversData?.status === "ready" && (
                (() => {
                  const enablers     = valueDriversData.enablers.filter(e => e.price != null);
                  const contributors = valueDriversData.contributors.filter(e => e.price != null);
                  if (enablers.length === 0 && contributors.length === 0) return null;

                  const VCRow = ({ entry }: { entry: ValueDriverEntry }) => {
                    const isEnabler = entry.type === "enabler";
                    const accent = isEnabler ? C.blue : C.teal;
                    return (
                      <div style={{
                        display: "flex", flexDirection: "column", gap: 6,
                        padding: "10px 12px", borderRadius: C.rMd,
                        background: "rgba(255,255,255,0.025)", border: `1px solid ${C.border}`,
                      }}>
                        {/* Ticker + Kurs */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontFamily: C.mono, fontSize: 14, fontWeight: 700, color: accent }}>
                            {entry.ticker}
                          </span>
                          {entry.price != null && (
                            <span style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 600, color: C.t1 }}>
                              {entry.currency === "EUR" ? "€" : "$"}{entry.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {/* Name + Mcap */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, color: C.t1 }}>{entry.name}</span>
                          {entry.market_cap_bn != null && (
                            <span style={{ fontSize: 10, color: C.t3, fontFamily: C.mono }}>{fmtBn(entry.market_cap_bn)}</span>
                          )}
                        </div>
                        {/* Bullets */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ color: C.t3, fontSize: 11, lineHeight: "17px", flexShrink: 0 }}>·</span>
                            <span style={{ fontSize: 11, color: C.t2, lineHeight: 1.5 }}>{entry.role}</span>
                          </div>
                          {entry.context && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <span style={{ color: accent, fontSize: 11, lineHeight: "17px", flexShrink: 0 }}>·</span>
                              <span style={{ fontSize: 11, color: C.t1, lineHeight: 1.5 }}>{entry.context}</span>
                            </div>
                          )}
                        </div>
                        {/* Relevance */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${entry.relevance * 100}%`, background: accent, borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: 10, color: C.t3, fontFamily: C.mono }}>{Math.round(entry.relevance * 100)}%</span>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <Card style={{ marginTop: 8 }}>
                      <SLabel text="Value Chain · Investierbare Enabler & Contributors" />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {/* Enabler Spalte */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {enablers.length > 0 && (
                            <div style={{ fontSize: 10, color: C.blue, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>
                              Enabler
                            </div>
                          )}
                          {enablers.sort((a, b) => b.relevance - a.relevance).map(e => <VCRow key={e.ticker} entry={e} />)}
                        </div>
                        {/* Contributors Spalte */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {contributors.length > 0 && (
                            <div style={{ fontSize: 10, color: C.teal, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 2 }}>
                              Contributors
                            </div>
                          )}
                          {contributors.sort((a, b) => b.relevance - a.relevance).map(e => <VCRow key={e.ticker} entry={e} />)}
                        </div>
                      </div>
                    </Card>
                  );
                })()
              )}

              {/* Abschnitt 3: ETF-Proxies */}
              {valueDriversData?.status === "ready" && valueDriversData.etfs.length > 0 && (
                <Card>
                  <SLabel text="ETF-Proxies · Thematische Exposure" />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {valueDriversData.etfs.map(etf => (
                      <div key={etf.ticker} style={{
                        padding: "6px 14px", borderRadius: C.rMd,
                        background: C.purpleDim, border: `1px solid ${C.purple}33`,
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: C.purple }}>{etf.ticker}</span>
                        <span style={{ fontSize: 11, color: C.t2 }}>{etf.name}</span>
                        <span style={{ fontSize: 10, color: C.t3, fontFamily: C.mono }}>{Math.round(etf.relevance * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Tab 8: Signal History */}
          {activeTab === 8 && (() => {
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
              edgar:       "SEC EDGAR",
              google_news: "Google News",
              techcrunch:  "TechCrunch",
              internal:    "Argo Intern",
            };

            const sevDot = (s: string) =>
              s === "high" ? C.red : s === "medium" ? C.amber : C.teal;
            const sevLabel = (s: string) =>
              s === "high" ? "HIGH" : s === "medium" ? "MED" : "LOW";

            const signals = signalsData?.signals ?? [];
            const filterTypes = ["all", ...Array.from(new Set(signals.map(s => s.event_type)))];
            const filtered = sigFilter === "all"
              ? signals
              : signals.filter(s => s.event_type === sigFilter);

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Filter-Chips */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {filterTypes.map(ft => (
                    <button
                      key={ft}
                      onClick={() => setSigFilter(ft)}
                      style={{
                        padding: "5px 14px", borderRadius: 99, fontSize: 11,
                        fontFamily: C.mono, fontWeight: 500, cursor: "pointer",
                        border: `1px solid ${sigFilter === ft ? C.teal : C.border}`,
                        background: sigFilter === ft ? C.tealDim : "transparent",
                        color: sigFilter === ft ? C.teal : C.t2,
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
                          : `Keine Events für Filter "${sigFilter === "all" ? "Alle" : EVENT_LABELS[sigFilter] ?? sigFilter}".`}
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
                        borderLeft: sig.severity === "high" ? `3px solid ${C.red}` : "none",
                        paddingLeft: sig.severity === "high" ? 12 : 0,
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
                          {/* Source Badge */}
                          <span style={{ fontSize: 10, color: C.t3, fontFamily: C.mono }}>
                            {SOURCE_LABELS[sig.source] ?? sig.source}
                          </span>
                        </div>

                        {/* Summary */}
                        <div style={{ fontSize: 13, color: C.t1, lineHeight: 1.5, marginBottom: 4 }}>
                          {sig.summary}
                        </div>

                        {/* Source Link */}
                        {sig.source_url && (
                          <a
                            href={sig.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 11, color: C.teal, fontFamily: C.mono, textDecoration: "none" }}
                          >
                            Quelle → {sig.source_url.length > 60 ? sig.source_url.slice(0, 60) + "…" : sig.source_url}
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
