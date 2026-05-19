"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
interface FundamentalsData {
  is_listed: boolean; ticker?: string; exchange?: string;
  price?: number; market_cap_bn?: number; pe_ratio?: number;
  revenue_bn?: number; ebitda_bn?: number; debt_ebitda?: number;
  week_52_high?: number; week_52_low?: number; currency?: string;
  gross_margin_pct?: number; operating_margin_pct?: number; profit_margin_pct?: number;
  revenue_growth_pct?: number; earnings_growth_pct?: number;
  free_cashflow_bn?: number; operating_cashflow_bn?: number;
  ev_revenue?: number; ev_ebitda?: number; enterprise_value_bn?: number;
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
  const dotColor = (t?: string) =>
    t === "IPO" ? C.teal : t?.includes("C") || t?.includes("D") ? C.teal : t?.includes("B") ? C.blue : C.t3;
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: C.rLg, padding: "18px 20px" }}>
      <SLabel text="Funding History" />
      {rounds.map((r, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0", borderBottom: i < rounds.length - 1 ? `1px solid ${C.border}` : "none" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor(r.type), flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: C.t1, fontWeight: 500, minWidth: 80 }}>{r.type ?? "—"}</div>
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
            <button onClick={() => router.back()} style={{ background: "none", border: `1px solid ${C.borderMd}`, borderRadius: C.rSm, color: C.t2, fontSize: 12, padding: "5px 12px", cursor: "pointer" }}>
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
                ? [data.fundamentals?.ticker, data.fundamentals?.exchange].filter(Boolean).join(" · ") || data.proxy_ticker || "—"
                : [data.core_technology ?? data.product_description, data.funding_stage].filter(Boolean).join(" · ") || "—"
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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

                </>) : (
                  /* Private Company */
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                    <FundTile label="Funding Total" val={fmtM(data.funding_total_usd_mn)} color={C.t1} />
                    <FundTile label="Letzte Runde"  val={data.funding_last_round?.split(";")[0] ?? "—"} />
                    <FundTile label="Stage"         val={data.funding_stage ?? "—"} />
                    <FundTile label="IPO-Potenzial" val={data.ipo_potential ?? "—"} color={data.ipo_potential === "Hoch" ? C.teal : C.t2} />
                  </div>
                )}
                <FundingTimeline rounds={data.funding_rounds} />
              </div>
            );
          })()}

          {/* Tab 4: Potenziale & Risiken */}
          {activeTab === 4 && <Placeholder title="Potenziale & Risiken" sub="2×n Grid · Chancen links · Risiken rechts · Composite Score — Phase 2" />}

          {/* Tab 5: Peer Review */}
          {activeTab === 5 && <Placeholder title="Peer Review" sub="Wettbewerber-Benchmarking · Comparable Transactions — Phase 2" />}

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
          {activeTab === 8 && <Placeholder title="Signal History" sub="KPI-Verläufe · Bewertungs-Verläufe · M&A-Events — Phase 4 (Signal-Engine)" />}

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
