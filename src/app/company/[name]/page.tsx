"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OwnershipItem { name: string; type: string; role?: string; notes?: string }
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
}
interface TechReadinessDetail {
  overall: number; inputs_provided: boolean;
  factors: Record<string, number>; factor_weights: Record<string, number>;
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
  founding_year?: number; headquarters?: string; headcount?: string;
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

function ScoringCard({ s, rank }: { s: ScoringDetail; rank: number }) {
  const [open, setOpen] = useState(rank === 1);
  const rc = ratingColor(s.rating);
  const mc = mfrColor(s.mfr_signal);
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 12 }}>
            {[
              { label: "SRR — Strategic Relevance", val: `${s.srr_value.toFixed(2)}×`, desc: s.srr_category, color: C.teal, pct: Math.min(s.srr_value / 2, 1) },
              { label: "MFR — M&A Feasibility", val: `${s.mfr_value.toFixed(2)}×`, desc: `${s.mfr_signal === "Feasible" ? "🟢" : s.mfr_signal === "Watch" ? "🟡" : "🔴"} ${s.mfr_signal}`, color: mc, pct: s.mfr_value < 0.15 ? 0.9 : s.mfr_value < 0.5 ? 0.55 : 0.2 },
              { label: "Tech Readiness", val: s.tech_readiness.overall.toFixed(2), desc: s.tech_readiness.inputs_provided ? "Inputs provided" : "Neutral fallback", color: C.blue, pct: s.tech_readiness.overall },
            ].map(tile => (
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

  useEffect(() => {
    if (!name) return;
    fetch(`${API_BASE}/api/v1/company/${encodeURIComponent(name)}`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [name]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.t1, fontFamily: C.body, fontSize: 14 }}>
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
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 2rem 4rem" }}>

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

            {/* Row 1: Name + Public/Private + Rating */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: C.display, fontSize: 20, fontWeight: 700, color: C.t1 }}>{data.name}</span>
                <span style={{
                  fontSize: 11, padding: "2px 10px", borderRadius: 99, fontWeight: 500,
                  color: data.ipo_status === "listed" ? C.teal : C.t2,
                  background: data.ipo_status === "listed" ? C.tealDim : "rgba(255,255,255,0.05)",
                  border: `1px solid ${data.ipo_status === "listed" ? C.tealBorder : C.border}`,
                }}>
                  {data.ipo_status === "listed" ? "Public" : "Private"}
                </span>
              </div>
              {data.scorings[0] && (
                <span style={{ fontSize: 12, padding: "5px 14px", borderRadius: 99, fontWeight: 600, color: ratingColor(data.scorings[0].rating), background: ratingColor(data.scorings[0].rating) + "18", border: `1px solid ${ratingColor(data.scorings[0].rating)}33` }}>
                  {data.scorings[0].rating}
                </span>
              )}
            </div>

            {/* Row 2: Ticker+Index (public) OR Technologie+Series (private) */}
            <div style={{ fontSize: 12, color: C.t2, marginBottom: 14 }}>
              {data.ipo_status === "listed"
                ? [data.proxy_ticker].filter(Boolean).join(" · ") || "—"
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

            {/* Row 4: Meta-Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              {[
                { label: "Funding Total", val: fmtM(data.funding_total_usd_mn) },
                { label: "Letzte Runde", val: data.funding_last_round?.split(";")[0] ?? "—" },
                { label: "Sektor", val: data.industry ?? "—" },
                { label: "Kategorie", val: data.category ?? "—" },
                { label: "Attraktivster Exposure", val: data.investment_path ?? "—", color: PATH_COLORS[data.investment_path ?? ""] ?? C.t2 },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontSize: 10, color: C.t3, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 3 }}>{m.label}</div>
                  <div style={{ fontSize: 12, color: (m as any).color ?? C.t1, fontWeight: 500 }}>{m.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Intro */}
          {data.intro && (
            <div style={{ borderLeft: `3px solid ${C.teal}`, paddingLeft: 14, marginBottom: 16, fontSize: 13, lineHeight: 1.7, color: C.t1 }}>
              {data.intro}
              <div style={{ marginTop: 6, fontSize: 10, color: C.t3 }}>↳ Generated by Claude · Argo Analytics Intelligence Layer</div>
            </div>
          )}

          {/* Last signal */}
          {data.last_signal && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, padding: "8px 14px", background: C.amberDim, border: `1px solid ${C.amber}22`, borderRadius: C.rMd, fontSize: 12 }}>
              <span style={{ color: C.amber, fontSize: 10 }}>◆</span>
              <span style={{ color: C.amber, fontWeight: 600, fontFamily: C.mono }}>{data.last_signal_date}</span>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Card>
                  <SLabel text="Unternehmen" />
                  {data.founding_year && <InfoRow k="Gegründet" v={String(data.founding_year)} />}
                  {data.headquarters && <InfoRow k="Hauptsitz" v={data.headquarters} />}
                  {data.headcount && <InfoRow k="Mitarbeiter" v={data.headcount} />}
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
          {activeTab === 1 && <Placeholder title="Markt" sub="TAM-Breakdown · Wachstumstreiber · Wettbewerbslandschaft — Phase 2" />}

          {/* Tab 2: Ownership */}
          {activeTab === 2 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Card>
                <SLabel text="Bekannte Investoren" />
                {data.ownership.map((o, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < data.ownership.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ width: 28, height: 28, borderRadius: C.rSm, flexShrink: 0, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: C.t2, fontFamily: C.mono }}>
                      {o.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: C.t1 }}>{o.name}</div>
                      <div style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>{o.type}{o.notes ? ` · ${o.notes}` : ""}</div>
                    </div>
                    {o.role && <span style={{ fontSize: 11, fontFamily: C.mono, color: C.teal }}>{o.role}</span>}
                  </div>
                ))}
              </Card>
              <Card>
                <SLabel text="Kapitalstruktur (geschätzt)" />
                <div style={{ fontSize: 12, color: C.t3, fontStyle: "italic", paddingTop: 8 }}>
                  Wird via North Data (DE) und EDGAR (US) angereichert — Phase 3
                </div>
              </Card>
            </div>
          )}

          {/* Tab 3: Fundamentals */}
          {activeTab === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.fundamentals.is_listed ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                  <FundTile label="Kurs" val={fmt(data.fundamentals.price, 2, data.fundamentals.currency === "EUR" ? "€" : "$")} color={C.t1} />
                  <FundTile label="Marktcap" val={fmtBn(data.fundamentals.market_cap_bn)} color={C.t1} />
                  <FundTile label="KGV" val={fmt(data.fundamentals.pe_ratio, 1)} />
                  <FundTile label="Revenue" val={fmtBn(data.fundamentals.revenue_bn)} />
                  <FundTile label="EBITDA" val={fmtBn(data.fundamentals.ebitda_bn)} />
                  <FundTile label="Debt/EBITDA" val={data.fundamentals.debt_ebitda ? `${data.fundamentals.debt_ebitda.toFixed(1)}×` : "—"} color={data.fundamentals.debt_ebitda && data.fundamentals.debt_ebitda > 3 ? C.amber : C.t1} />
                  <FundTile label="52W High" val={fmt(data.fundamentals.week_52_high, 0, "$")} />
                  <FundTile label="52W Low" val={fmt(data.fundamentals.week_52_low, 0, "$")} />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                  <FundTile label="Funding Total" val={fmtM(data.funding_total_usd_mn)} color={C.t1} />
                  <FundTile label="Letzte Runde" val={data.funding_last_round?.split(";")[0] ?? "—"} />
                  <FundTile label="Stage" val={data.funding_stage ?? "—"} />
                  <FundTile label="IPO-Potenzial" val={data.ipo_potential ?? "—"} color={data.ipo_potential === "Hoch" ? C.teal : C.t2} />
                </div>
              )}
              <FundingTimeline rounds={data.funding_rounds} />
            </div>
          )}

          {/* Tab 4: Potenziale & Risiken */}
          {activeTab === 4 && <Placeholder title="Potenziale & Risiken" sub="2×n Grid · Chancen links · Risiken rechts · Composite Score — Phase 2" />}

          {/* Tab 5: Peer Review */}
          {activeTab === 5 && <Placeholder title="Peer Review" sub="Wettbewerber-Benchmarking · Comparable Transactions — Phase 2" />}

          {/* Tab 6: Value Drivers */}
          {activeTab === 6 && <Placeholder title="Value Drivers" sub="Enabler · Contributors im 2×n Grid — Phase 1" />}

          {/* Tab 7: Exposure Types */}
          {activeTab === 7 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.scorings.map((s, i) => <ScoringCard key={s.buyer_name} s={s} rank={i + 1} />)}
              {(data.supply_chain_upstream.length > 0 || data.supply_chain_downstream.length > 0) && (
                <Card>
                  <SLabel text="Supply Chain Contributors" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    {data.supply_chain_upstream.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>Upstream</div>
                        {data.supply_chain_upstream.slice(0, 6).map(item => <SupplyRow key={item.ticker} item={item} color={C.blue} />)}
                      </div>
                    )}
                    {data.supply_chain_downstream.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>Downstream</div>
                        {data.supply_chain_downstream.slice(0, 6).map(item => <SupplyRow key={item.ticker} item={item} color={C.teal} />)}
                      </div>
                    )}
                  </div>
                  {data.supply_chain_etfs.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 10, color: C.t3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 8 }}>ETF Exposure</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {data.supply_chain_etfs.map(etf => (
                          <div key={etf.ticker} style={{ padding: "6px 12px", borderRadius: C.rMd, background: C.purpleDim, border: `1px solid ${C.purple}33`, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: C.purple }}>{etf.ticker}</span>
                            <span style={{ fontSize: 11, color: C.t2 }}>{etf.name}</span>
                            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.t3 }}>{Math.round(etf.relevance * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
