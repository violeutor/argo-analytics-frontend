"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OwnershipItem { name: string; type: string; notes?: string }
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
  website?: string; intro: string; industry?: string;
  product_description?: string; technology_tags: string[];
  tam_usd_bn: number; tam_source: string; tam_confidence: string;
  ipo_potential?: string; ipo_probability_pct?: number;
  investment_path?: string; proxy_ticker?: string;
  funding_total_usd_mn?: number; funding_last_round?: string; funding_stage?: string;
  ownership: OwnershipItem[]; fundamentals: FundamentalsData;
  scorings: ScoringDetail[];
  supply_chain_upstream: SupplyItem[]; supply_chain_downstream: SupplyItem[];
  supply_chain_etfs: { ticker: string; name: string; relevance: number }[];
  last_signal?: string; last_signal_date?: string;
  is_known: boolean; warnings: string[];
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg: "#09090B", bgCard: "#111113", bgSection: "#0D0D0F",
  border: "rgba(255,255,255,0.07)", borderMd: "rgba(255,255,255,0.12)",
  teal: "#00D4A0", tealDim: "rgba(0,212,160,0.10)", tealBorder: "rgba(0,212,160,0.22)",
  amber: "#F0A500", amberDim: "rgba(240,165,0,0.09)",
  red: "#F04545", redDim: "rgba(240,69,69,0.09)",
  blue: "#5B9CF6", blueDim: "rgba(91,156,246,0.10)",
  purple: "#C084FC", purpleDim: "rgba(192,132,252,0.10)",
  text1: "#FAFAF9", text2: "#A1A1AA", text3: "#52525B",
  mono: "'DM Mono','Fira Code',monospace",
  display: "'Syne','Space Grotesk',system-ui,sans-serif",
  body: "'DM Sans',system-ui,sans-serif",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n?: number | null, d = 2, pre = "") =>
  n == null ? "—" : `${pre}${n.toFixed(d)}`;

const fmtBn = (n?: number | null) =>
  n == null ? "—" : n >= 1 ? `$${n.toFixed(1)}B` : `$${(n * 1000).toFixed(0)}M`;

const ratingColor = (r: string) => {
  if (r.startsWith("A")) return C.teal;
  if (r.startsWith("B")) return C.blue;
  if (r.startsWith("C")) return C.amber;
  return C.red;
};

const ratingBg = (r: string) => {
  if (r.startsWith("A")) return C.tealDim;
  if (r.startsWith("B")) return C.blueDim;
  if (r.startsWith("C")) return C.amberDim;
  return C.redDim;
};

const mfrColor = (s: string) =>
  s === "Feasible" ? C.teal : s === "Watch" ? C.amber : C.red;

const srrColor = (c: string) =>
  c.includes("++") ? C.teal : c === "Transformational" ? C.blue :
  c === "High Strategic" ? C.amber : C.text3;

const confColor = (c: string) =>
  c === "high" ? C.teal : c === "medium" ? C.amber : C.red;

const TR_LABELS: Record<string, string> = {
  tech_stack_fit: "Tech Stack Fit",
  integration_capacity: "Integration Capacity",
  gtm_fit: "GTM Fit",
  capital_deployment_velocity: "Capital Deployment Velocity",
  rd_intensity: "R&D Intensity",
  regulatory_readiness: "Regulatory Readiness",
  strategic_coherence: "Strategic Coherence",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <div style={{ width: 3, height: 18, background: C.teal, borderRadius: 2, flexShrink: 0 }} />
      <div>
        <div style={{ fontFamily: C.display, fontSize: 11, fontWeight: 700, color: C.text1, textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.bgCard, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "18px 20px", ...style,
    }}>
      {children}
    </div>
  );
}

function MetricTile({ label, value, sub, color, bar }: {
  label: string; value: string; sub?: string; color?: string; bar?: number;
}) {
  return (
    <div style={{ background: C.bgSection, border: `1px solid ${C.border}`, borderRadius: 7, padding: "10px 12px" }}>
      <div style={{ fontSize: 9, color: C.text3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: C.mono, color: color ?? C.text1, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: C.text2, marginTop: 3 }}>{sub}</div>}
      {bar != null && (
        <div style={{ height: 3, background: C.border, borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${Math.min(bar * 100, 100)}%`, background: color ?? C.teal, borderRadius: 2, transition: "width 0.5s" }} />
        </div>
      )}
    </div>
  );
}

function Badge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 4,
      fontSize: 10, fontWeight: 600, fontFamily: C.mono,
      color, background: bg, border: `1px solid ${border}`, letterSpacing: "0.04em",
    }}>{label}</span>
  );
}

// ── Scoring card ──────────────────────────────────────────────────────────────

function ScoringCard({ s, rank }: { s: ScoringDetail; rank: number }) {
  const [open, setOpen] = useState(rank === 1);
  const rc = ratingColor(s.rating);

  return (
    <div style={{
      border: `1px solid ${open ? C.borderMd : C.border}`,
      borderRadius: 8, marginBottom: 8, overflow: "hidden",
      background: open ? C.bgCard : "transparent",
      transition: "all 0.15s",
    }}>
      {/* Header row */}
      <div
        onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: "pointer" }}
      >
        <div style={{
          width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
          background: rank === 1 ? C.tealDim : "transparent",
          border: `1px solid ${rank === 1 ? C.teal : C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: C.mono, fontSize: 10, fontWeight: 700,
          color: rank === 1 ? C.teal : C.text3,
        }}>{rank}</div>

        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: C.text1 }}>{s.buyer_name}</span>
          {s.ticker && <span style={{ fontFamily: C.mono, fontSize: 11, color: C.teal, marginLeft: 8 }}>{s.ticker}</span>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontFamily: C.mono, fontSize: 10, fontWeight: 700,
            color: rc, background: ratingBg(s.rating),
            padding: "2px 8px", borderRadius: 4, border: `1px solid ${rc}44`,
          }}>{s.rating}</span>
          <span style={{ fontFamily: C.mono, fontSize: 12, color: C.text2 }}>
            {s.deal_success_score.toFixed(3)}
          </span>
          {s.execution_warning && <span style={{ color: C.amber, fontSize: 11 }} title="Execution Warning">⚠</span>}
          <span style={{ color: C.text3, fontSize: 11, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
        </div>
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "16px" }}>
          {/* Top metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 8, marginBottom: 16 }}>
            <MetricTile label="SRR" value={`${s.srr_value.toFixed(2)}x`} sub={s.srr_category}
              color={srrColor(s.srr_category)} bar={Math.min(s.srr_value / 5, 1)} />
            <MetricTile label="MFR" value={s.mfr_value.toFixed(3)} sub={s.mfr_signal}
              color={mfrColor(s.mfr_signal)} bar={Math.max(0, 1 - s.mfr_value / 0.5)} />
            <MetricTile label="Tech Readiness" value={s.tech_readiness.overall.toFixed(2)} sub="/1.00"
              color={s.tech_readiness.overall >= 0.7 ? C.teal : s.tech_readiness.overall >= 0.5 ? C.amber : C.red}
              bar={s.tech_readiness.overall} />
            <MetricTile label="Deal Success Score" value={s.deal_success_score.toFixed(3)} sub="SRR_norm × MFR_norm × TR"
              color={s.deal_success_score >= 0.3 ? C.teal : s.deal_success_score >= 0.15 ? C.amber : C.red}
              bar={s.deal_success_score} />
          </div>

          {/* TechReadiness 7-factor breakdown */}
          <div style={{ marginBottom: s.execution_warning ? 12 : 0 }}>
            <div style={{ fontSize: 10, color: C.text3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
              Tech Readiness — 7 Factors
              {!s.tech_readiness.inputs_provided && (
                <span style={{ color: C.amber, marginLeft: 8 }}>(neutral fallback 0.5)</span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(s.tech_readiness.factors).map(([key, val]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 160, fontSize: 11, color: C.text2, flexShrink: 0 }}>
                    {TR_LABELS[key] ?? key}
                    <span style={{ color: C.text3, fontFamily: C.mono, fontSize: 10, marginLeft: 4 }}>
                      ×{((s.tech_readiness.factor_weights[key] ?? 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${val * 100}%`,
                      background: val >= 0.7 ? C.teal : val >= 0.5 ? C.amber : C.red,
                      borderRadius: 2, transition: "width 0.4s",
                    }} />
                  </div>
                  <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text2, width: 32, textAlign: "right" }}>
                    {val.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {s.execution_warning && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: C.amberDim, border: `1px solid ${C.amber}33`, borderRadius: 6, fontSize: 11, color: C.amber }}>
              ⚠ Execution Warning: Low-Cap-Buyer mit hohem SRR — Finanzierbarkeit separat validieren.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Supply chain row ──────────────────────────────────────────────────────────

function SCRow({ item, color }: { item: SupplyItem; color: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 0", borderBottom: `1px solid ${C.border}`,
    }}>
      <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color, minWidth: 52 }}>{item.ticker}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: C.text1 }}>{item.name}</div>
        <div style={{ fontSize: 11, color: C.text2 }}>{item.role}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 48, height: 3, background: C.border, borderRadius: 2 }}>
          <div style={{ width: `${item.relevance * 100}%`, height: "100%", background: color, borderRadius: 2 }} />
        </div>
        <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>{Math.round(item.relevance * 100)}%</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const name = decodeURIComponent(params.name as string);

  const [data, setData] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) return;
    fetch(`${API_BASE}/api/v1/company/${encodeURIComponent(name)}`)
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [name]);

  const PATH_COLORS: Record<string, string> = {
    "IPO-direkt": C.teal, "Käufer-Proxy": C.blue,
    "ETF-Proxy": C.amber, "Enabler": C.purple,
    "Beobachten": C.text3, "Archiv": C.red,
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text1, fontFamily: C.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: rgba(0,212,160,0.2); }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
      `}</style>

      {/* Top bar */}
      <div style={{
        borderBottom: `1px solid ${C.border}`, padding: "0 24px",
        display: "flex", alignItems: "center", gap: 16, height: 52,
        position: "sticky", top: 0, zIndex: 100,
        background: C.bg + "EE", backdropFilter: "blur(12px)",
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "transparent", border: `1px solid ${C.border}`,
            borderRadius: 6, color: C.text2, fontSize: 12,
            padding: "5px 12px", cursor: "pointer", fontFamily: C.mono,
            display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.color = C.teal; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text2; }}
        >
          ← Zurück
        </button>
        <div style={{ width: 1, height: 20, background: C.border }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 5, background: C.teal, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: "#000" }}>A</span>
          </div>
          <span style={{ fontFamily: C.display, fontSize: 13, fontWeight: 700 }}>Argo Analytics</span>
        </div>
        {data && (
          <>
            <div style={{ width: 1, height: 20, background: C.border }} />
            <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>
              {data.name}
            </span>
          </>
        )}
      </div>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px" }}>

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[140, 80, 200, 120].map((h, i) => (
              <div key={i} style={{
                height: h, background: C.bgCard, borderRadius: 10,
                border: `1px solid ${C.border}`,
                animation: "pulse 1.5s ease-in-out infinite",
                opacity: 0.5 - i * 0.05,
              }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:0.5}50%{opacity:0.2} }`}</style>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: "16px 20px", background: C.redDim, border: `1px solid ${C.red}33`, borderRadius: 8, color: C.red }}>
            Unternehmen nicht gefunden: {error}
          </div>
        )}

        {data && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── Hero ── */}
            <Card>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: C.display, fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 6 }}>
                    {data.name}
                  </div>
                  <div style={{ fontSize: 13, color: C.text2 }}>{data.category}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                  {data.proxy_ticker && (
                    <Badge label={data.proxy_ticker} color={C.teal} bg={C.tealDim} border={C.tealBorder} />
                  )}
                  {data.investment_path && (
                    <Badge
                      label={data.investment_path}
                      color={PATH_COLORS[data.investment_path] ?? C.text2}
                      bg={(PATH_COLORS[data.investment_path] ?? C.text2) + "18"}
                      border={(PATH_COLORS[data.investment_path] ?? C.text2) + "33"}
                    />
                  )}
                  {data.ipo_probability_pct != null && (
                    <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>
                      IPO-Wahrscheinlichkeit{" "}
                      <span style={{ color: data.ipo_probability_pct >= 60 ? C.teal : data.ipo_probability_pct >= 35 ? C.amber : C.text2, fontWeight: 700 }}>
                        {data.ipo_probability_pct}%
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* AI Intro */}
              <div style={{
                borderLeft: `3px solid ${C.teal}`,
                paddingLeft: 14, marginBottom: 16,
                fontSize: 13, lineHeight: 1.7, color: C.text1,
                fontStyle: "normal",
              }}>
                {data.intro}
                <div style={{ marginTop: 6, fontSize: 10, color: C.text3, fontFamily: C.mono }}>
                  ↳ Generated by Claude · Argo Analytics Intelligence Layer
                </div>
              </div>

              {/* Key metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 8 }}>
                <MetricTile label="Potenzial" value={data.ipo_potential === "IPO erfolgt" ? "Listed" : data.category?.includes("Hoch") ? "Hoch" : "—"} color={C.teal} />
                <MetricTile label="IPO-Potenzial" value={data.ipo_potential ?? "—"}
                  color={data.ipo_potential === "Hoch" ? C.teal : data.ipo_potential === "Mittel-hoch" ? C.amber : C.text2} />
                <MetricTile label="TAM 2035"
                  value={`$${data.tam_usd_bn}B`}
                  sub={data.tam_confidence === "high" ? "✓ verifiziert" : data.tam_confidence === "medium" ? "~ Schätzung" : "⚠ Fallback"}
                  color={confColor(data.tam_confidence)} />
                <MetricTile label="Funding"
                  value={data.funding_total_usd_mn
                    ? data.funding_total_usd_mn >= 1000
                      ? `$${(data.funding_total_usd_mn / 1000).toFixed(1)}B`
                      : `$${data.funding_total_usd_mn}M`
                    : "—"}
                  color={C.text1} />
              </div>

              {/* Last signal */}
              {data.last_signal && (
                <div style={{
                  marginTop: 12, display: "flex", gap: 8, alignItems: "center",
                  padding: "8px 12px", background: C.amberDim,
                  border: `1px solid ${C.amber}22`, borderRadius: 6, fontSize: 12,
                }}>
                  <span style={{ color: C.amber, fontSize: 10 }}>◆</span>
                  <span style={{ color: C.amber, fontWeight: 600, fontFamily: C.mono }}>{data.last_signal_date}</span>
                  <span style={{ color: C.text2 }}>{data.last_signal}</span>
                </div>
              )}
            </Card>

            {/* ── Industry & Product ── */}
            <Card>
              <SectionHead title="Industry & Product" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: C.text3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Sector</div>
                  <div style={{ fontSize: 13, color: C.text1 }}>{data.industry ?? "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: C.text3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Core Technology</div>
                  <div style={{ fontSize: 13, color: C.text1 }}>{data.product_description ?? "—"}</div>
                </div>
              </div>

              {data.technology_tags.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 10, color: C.text3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Technology Tags</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {data.technology_tags.map(tag => (
                      <span key={tag} style={{
                        padding: "3px 10px", borderRadius: 4, fontSize: 11,
                        fontFamily: C.mono, fontWeight: 500,
                        background: C.tealDim, color: C.teal, border: `1px solid ${C.tealBorder}`,
                      }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* TAM source */}
              <div style={{ marginTop: 14, padding: "10px 12px", background: C.bgSection, borderRadius: 6, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: C.text2 }}>
                    TAM 2035: <span style={{ color: confColor(data.tam_confidence), fontWeight: 600 }}>${data.tam_usd_bn}B</span>
                  </span>
                  <span style={{ fontSize: 10, color: C.text3, fontFamily: C.mono }}>{data.tam_source}</span>
                </div>
              </div>
            </Card>

            {/* ── Ownership Structure ── */}
            <Card>
              <SectionHead title="Ownership Structure" sub="Known investors & strategic shareholders" />
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {data.ownership.map((o, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 0",
                    borderBottom: i < data.ownership.length - 1 ? `1px solid ${C.border}` : "none",
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                      background: o.type === "Corporate" ? C.blueDim : o.type === "Fund" ? C.tealDim : o.type === "Government" ? C.purpleDim : C.amberDim,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontFamily: C.mono, fontWeight: 700,
                      color: o.type === "Corporate" ? C.blue : o.type === "Fund" ? C.teal : o.type === "Government" ? C.purple : C.amber,
                    }}>
                      {o.type === "Corporate" ? "CO" : o.type === "Fund" ? "FD" : o.type === "Government" ? "GV" : o.type === "VC" ? "VC" : "—"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: C.text1, fontWeight: 500 }}>{o.name}</div>
                      {o.notes && <div style={{ fontSize: 11, color: C.text2 }}>{o.notes}</div>}
                    </div>
                    <Badge
                      label={o.type}
                      color={o.type === "Corporate" ? C.blue : o.type === "Fund" ? C.teal : o.type === "Government" ? C.purple : C.amber}
                      bg={(o.type === "Corporate" ? C.blue : o.type === "Fund" ? C.teal : C.amber) + "18"}
                      border={(o.type === "Corporate" ? C.blue : o.type === "Fund" ? C.teal : C.amber) + "33"}
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Fundamentals ── */}
            <Card>
              <SectionHead
                title="Fundamentals"
                sub={data.fundamentals.is_listed ? `${data.fundamentals.ticker} · ${data.fundamentals.exchange} · Live via Yahoo Finance` : "Private company — public market data not available"}
              />
              {data.fundamentals.is_listed ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px,1fr))", gap: 8 }}>
                  <MetricTile label="Kurs" value={fmt(data.fundamentals.price, 2, data.fundamentals.currency === "EUR" ? "€" : "$")} color={C.text1} />
                  <MetricTile label="Marktcap" value={fmtBn(data.fundamentals.market_cap_bn)} color={C.text1} />
                  <MetricTile label="KGV" value={fmt(data.fundamentals.pe_ratio, 1)} color={C.text2} />
                  <MetricTile label="Revenue" value={fmtBn(data.fundamentals.revenue_bn)} color={C.text2} />
                  <MetricTile label="EBITDA" value={fmtBn(data.fundamentals.ebitda_bn)} color={C.text2} />
                  <MetricTile label="Debt/EBITDA" value={data.fundamentals.debt_ebitda ? `${data.fundamentals.debt_ebitda.toFixed(1)}x` : "—"} color={data.fundamentals.debt_ebitda && data.fundamentals.debt_ebitda > 3 ? C.amber : C.text2} />
                  <MetricTile label="52W High" value={fmt(data.fundamentals.week_52_high, 0, "$")} color={C.text2} />
                  <MetricTile label="52W Low" value={fmt(data.fundamentals.week_52_low, 0, "$")} color={C.text2} />
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 8 }}>
                  <MetricTile label="Funding Total" value={data.funding_total_usd_mn ? `$${data.funding_total_usd_mn >= 1000 ? (data.funding_total_usd_mn / 1000).toFixed(1) + "B" : data.funding_total_usd_mn + "M"}` : "—"} color={C.text1} />
                  <MetricTile label="Stage" value={data.funding_stage ?? "—"} color={C.text2} />
                  <MetricTile label="Last Round" value={data.funding_last_round?.split(";")[0] ?? "—"} color={C.text2} />
                  <MetricTile label="IPO Potenzial" value={data.ipo_potential ?? "—"}
                    color={data.ipo_potential === "Hoch" ? C.teal : C.text2} />
                </div>
              )}
            </Card>

            {/* ── Scoring ── */}
            <Card>
              <SectionHead title="M&A Scoring — Alle Käufer" sub="SRR × MFR × TechReadiness · geordnet nach DealSuccessScore" />
              {data.scorings.map((s, i) => (
                <ScoringCard key={s.buyer_name} s={s} rank={i + 1} />
              ))}
            </Card>

            {/* ── Supply Chain ── */}
            {(data.supply_chain_upstream.length > 0 || data.supply_chain_downstream.length > 0) && (
              <Card>
                <SectionHead title="Supply Chain Contributors" sub="Börsennotierte Profiteure entlang der Wertschöpfungskette" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {data.supply_chain_upstream.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, color: C.text3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Upstream</div>
                      {data.supply_chain_upstream.slice(0, 6).map(item => (
                        <SCRow key={item.ticker} item={item} color={C.blue} />
                      ))}
                    </div>
                  )}
                  {data.supply_chain_downstream.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, color: C.text3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Downstream</div>
                      {data.supply_chain_downstream.slice(0, 6).map(item => (
                        <SCRow key={item.ticker} item={item} color={C.teal} />
                      ))}
                    </div>
                  )}
                </div>
                {data.supply_chain_etfs.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 10, color: C.text3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>ETF Exposure</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {data.supply_chain_etfs.map(etf => (
                        <div key={etf.ticker} style={{
                          padding: "6px 12px", borderRadius: 6,
                          background: C.purpleDim, border: `1px solid ${C.purple}33`,
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: C.purple }}>{etf.ticker}</span>
                          <span style={{ fontSize: 11, color: C.text2 }}>{etf.name}</span>
                          <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>{Math.round(etf.relevance * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* ── Warnings ── */}
            {data.warnings.length > 0 && (
              <div>
                {data.warnings.map((w, i) => (
                  <div key={i} style={{
                    padding: "8px 14px", marginBottom: 6,
                    background: C.amberDim, border: `1px solid ${C.amber}22`,
                    borderRadius: 6, fontSize: 11, color: C.amber,
                  }}>⚠ {w}</div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
