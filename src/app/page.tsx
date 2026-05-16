"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchCompanies, searchCompanyFull } from "@/lib/api";
import type { FullSearchResponse, BuyerScore, SupplyChainItem } from "@/lib/api";
import type { Company, DealRating, MFRSignal, SRRCategory, SearchResult } from "@/types";

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg: "#09090B",
  bgCard: "#111113",
  bgHover: "#18181B",
  border: "rgba(255,255,255,0.07)",
  borderMd: "rgba(255,255,255,0.12)",
  teal: "#00D4A0",
  tealDim: "rgba(0,212,160,0.12)",
  tealBorder: "rgba(0,212,160,0.25)",
  amber: "#F0A500",
  amberDim: "rgba(240,165,0,0.1)",
  red: "#F04545",
  redDim: "rgba(240,69,69,0.1)",
  blue: "#5B9CF6",
  blueDim: "rgba(91,156,246,0.12)",
  text1: "#FAFAF9",
  text2: "#A1A1AA",
  text3: "#52525B",
  mono: "'DM Mono', 'Fira Code', 'Courier New', monospace",
  display: "'Syne', 'Space Grotesk', system-ui, sans-serif",
  body: "'DM Sans', system-ui, sans-serif",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, decimals = 2, prefix = "") {
  if (n === null || n === undefined) return "—";
  return `${prefix}${n.toFixed(decimals)}`;
}

function fmtBn(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}T`;
  if (n >= 1) return `$${n.toFixed(1)}B`;
  return `$${(n * 1000).toFixed(0)}M`;
}

function ratingColor(r: DealRating | null) {
  if (!r) return C.text3;
  if (r.startsWith("A")) return C.teal;
  if (r.startsWith("B")) return C.blue;
  if (r.startsWith("C")) return C.amber;
  return C.red;
}

function ratingBg(r: DealRating | null) {
  if (!r) return "transparent";
  if (r.startsWith("A")) return C.tealDim;
  if (r.startsWith("B")) return C.blueDim;
  if (r.startsWith("C")) return C.amberDim;
  return C.redDim;
}

function mfrColor(s: MFRSignal | string | null) {
  if (s === "Feasible") return C.teal;
  if (s === "Watch") return C.amber;
  if (s === "Overstretch") return C.red;
  return C.text3;
}

function srrColor(c: SRRCategory | string | null) {
  if (!c) return C.text3;
  if (c.includes("++")) return C.teal;
  if (c === "Transformational") return C.blue;
  if (c === "High Strategic") return C.amber;
  return C.text3;
}

function potentialColor(p: string | null) {
  if (p === "Hoch") return C.teal;
  if (p === "Mittel-hoch") return C.amber;
  return C.text2;
}

function ipoProb(prob: number | null) {
  if (prob === null) return { label: "—", color: C.text3 };
  const pct = Math.round(prob * 100);
  if (prob >= 0.7) return { label: `${pct}%`, color: C.teal };
  if (prob >= 0.4) return { label: `${pct}%`, color: C.amber };
  return { label: `${pct}%`, color: C.text2 };
}

// ── Gauge bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden", marginTop: 4 }}>
      <div style={{
        height: "100%",
        width: `${Math.min(value * 100, 100)}%`,
        background: color,
        borderRadius: 2,
        transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
      }} />
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────

function Badge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 600,
      fontFamily: C.mono,
      color,
      background: bg,
      border: `1px solid ${border}`,
      letterSpacing: "0.04em",
    }}>{label}</span>
  );
}

function RatingBadge({ rating }: { rating: DealRating | null }) {
  if (!rating) return <span style={{ color: C.text3, fontFamily: C.mono, fontSize: 12 }}>—</span>;
  return (
    <Badge
      label={rating}
      color={ratingColor(rating)}
      bg={ratingBg(rating)}
      border={ratingColor(rating) + "44"}
    />
  );
}

// ── Metric tile ───────────────────────────────────────────────────────────────

function MetricTile({
  label,
  value,
  sub,
  color,
  bar,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  bar?: number;
}) {
  return (
    <div style={{
      background: C.bgCard,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: "12px 14px",
    }}>
      <div style={{ fontSize: 10, color: C.text3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: C.mono, color: color ?? C.text1, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.text2, marginTop: 3 }}>{sub}</div>}
      {bar !== undefined && <ScoreBar value={bar} color={color ?? C.teal} />}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHead({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{ width: 3, height: 16, background: C.teal, borderRadius: 2 }} />
      <span style={{ fontFamily: C.display, fontSize: 13, fontWeight: 600, color: C.text1, textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {title}
      </span>
      {count !== undefined && (
        <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text3 }}>({count})</span>
      )}
    </div>
  );
}

// ── Company Card ─────────────────────────────────────────────────────────────

function CompanyCard({ result }: { result: SearchResult }) {
  const { company, ipo_probability, is_publicly_listed, public_ticker, market_data } = result;
  const { label: ipoLabel, color: ipoColor } = ipoProb(ipo_probability);

  return (
    <div style={{
      background: C.bgCard,
      border: `1px solid ${C.borderMd}`,
      borderRadius: 12,
      padding: "20px 22px",
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: C.display, fontSize: 22, fontWeight: 700, color: C.text1, letterSpacing: "-0.02em" }}>
            {company.name}
          </div>
          <div style={{ fontSize: 12, color: C.text2, marginTop: 4, fontFamily: C.body }}>
            {company.category}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          {is_publicly_listed && public_ticker && (
            <Badge label={public_ticker} color={C.teal} bg={C.tealDim} border={C.tealBorder} />
          )}
          <Badge
            label={company.investment_path ?? "—"}
            color={C.text2}
            bg="transparent"
            border={C.border}
          />
        </div>
      </div>

      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginBottom: 16 }}>
        <MetricTile
          label="Potenzial"
          value={company.potential ?? "—"}
          color={potentialColor(company.potential)}
        />
        <MetricTile
          label="Risiko"
          value={company.risk ?? "—"}
          color={company.risk === "Hoch" ? C.red : C.text2}
        />
        <MetricTile
          label="IPO-Potenzial"
          value={company.ipo_potential ?? "—"}
          sub={`Wahrscheinlichkeit: ${ipoLabel}`}
          color={ipoColor}
        />
        <MetricTile
          label="Funding (gesamt)"
          value={company.funding_total_usd_mn ? `$${company.funding_total_usd_mn >= 1000 ? (company.funding_total_usd_mn / 1000).toFixed(1) + "B" : company.funding_total_usd_mn + "M"}` : "—"}
          color={C.text1}
        />
        {market_data && (
          <>
            <MetricTile label="Kurs" value={fmt(market_data.price, 2, "$")} color={C.text1} />
            <MetricTile label="Marktcap" value={fmtBn(market_data.market_cap_bn)} color={C.text1} />
            <MetricTile label="KGV" value={fmt(market_data.pe_ratio, 1)} color={C.text2} />
            <MetricTile label="52W Range" value={`${fmt(market_data.week_52_low, 0, "$")} – ${fmt(market_data.week_52_high, 0, "$")}`} color={C.text2} />
          </>
        )}
      </div>

      {/* Last signal */}
      {company.last_signal && (
        <div style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          padding: "8px 12px",
          background: C.amberDim,
          border: `1px solid ${C.amber}22`,
          borderRadius: 6,
          fontSize: 12,
        }}>
          <span style={{ color: C.amber, fontSize: 10 }}>◆</span>
          <span style={{ color: C.amber, fontWeight: 600, fontFamily: C.mono }}>
            {company.last_signal_date}
          </span>
          <span style={{ color: C.text2 }}>{company.last_signal}</span>
        </div>
      )}
    </div>
  );
}

// ── Investment Opportunity Card ───────────────────────────────────────────────

function OpportunityCard({ opp, rank }: { opp: InvestmentOpportunity; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const md = opp.market_data;

  const pathColors: Record<string, string> = {
    "IPO-direkt": C.teal,
    "Käufer-Proxy": C.blue,
    "ETF-Proxy": C.amber,
    Enabler: "#C084FC",
    Beobachten: C.text3,
    Archiv: C.red,
  };
  const pathColor = pathColors[opp.path] ?? C.text2;

  return (
    <div style={{
      background: C.bgCard,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      marginBottom: 10,
      overflow: "hidden",
      transition: "border-color 0.15s",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = C.borderMd)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
    >
      {/* Main row */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Rank */}
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: rank === 1 ? C.tealDim : "transparent",
          border: `1px solid ${rank === 1 ? C.teal : C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: C.mono, fontSize: 11, fontWeight: 700,
          color: rank === 1 ? C.teal : C.text3,
          flexShrink: 0,
        }}>{rank}</div>

        {/* Path badge */}
        <Badge label={opp.path} color={pathColor} bg="transparent" border={pathColor + "44"} />

        {/* Title */}
        <span style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 600, color: C.text1, flex: 1 }}>
          {opp.title}
        </span>

        {/* Rating */}
        {opp.rating && <RatingBadge rating={opp.rating} />}

        {/* Price */}
        {md?.price && (
          <span style={{ fontFamily: C.mono, fontSize: 13, color: C.text2 }}>
            {fmt(md.price, 2, "$")}
          </span>
        )}

        {/* Expand chevron */}
        <span style={{ color: C.text3, fontSize: 12, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>▾</span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 16px" }}>
          {/* Scoring row */}
          {(opp.srr !== null || opp.mfr !== null || opp.tech_readiness !== null) && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 14 }}>
              {opp.srr !== null && (
                <MetricTile
                  label="SRR"
                  value={`${fmt(opp.srr, 2)}x`}
                  sub="Strategic Relevance"
                  color={srrColor(opp.notes)}
                  bar={Math.min(opp.srr / 5, 1)}
                />
              )}
              {opp.mfr !== null && (
                <MetricTile
                  label="MFR"
                  value={fmt(opp.mfr, 3)}
                  sub={opp.mfr < 0.15 ? "Feasible" : opp.mfr < 0.5 ? "Watch" : "Overstretch"}
                  color={opp.mfr < 0.15 ? C.teal : opp.mfr < 0.5 ? C.amber : C.red}
                  bar={Math.max(0, 1 - opp.mfr / 0.5)}
                />
              )}
              {opp.tech_readiness !== null && (
                <MetricTile
                  label="Tech Readiness"
                  value={fmt(opp.tech_readiness, 2)}
                  sub="/1.00"
                  color={opp.tech_readiness >= 0.7 ? C.teal : opp.tech_readiness >= 0.5 ? C.amber : C.red}
                  bar={opp.tech_readiness}
                />
              )}
              {opp.deal_success_score !== null && (
                <MetricTile
                  label="Deal Success Score"
                  value={fmt(opp.deal_success_score, 3)}
                  sub="SRR × MFR × TR"
                  color={opp.deal_success_score >= 0.4 ? C.teal : opp.deal_success_score >= 0.2 ? C.amber : C.red}
                  bar={opp.deal_success_score}
                />
              )}
            </div>
          )}

          {/* Market data */}
          {md && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginBottom: 14 }}>
              <MetricTile label="Marktcap" value={fmtBn(md.market_cap_bn)} />
              {md.pe_ratio && <MetricTile label="KGV" value={fmt(md.pe_ratio, 1)} />}
              {md.revenue_bn && <MetricTile label="Revenue" value={fmtBn(md.revenue_bn)} />}
              {md.ebitda_bn && <MetricTile label="EBITDA" value={fmtBn(md.ebitda_bn)} />}
              {md.debt_ebitda && <MetricTile label="Debt/EBITDA" value={fmt(md.debt_ebitda, 1) + "x"} />}
              {md.week_52_high && md.week_52_low && (
                <MetricTile label="52W Range" value={`${fmt(md.week_52_low, 0, "$")}–${fmt(md.week_52_high, 0, "$")}`} />
              )}
            </div>
          )}

          {/* Notes */}
          {(opp.description || opp.notes) && (
            <div style={{ fontSize: 12, color: C.text2, fontFamily: C.body, lineHeight: 1.6 }}>
              {opp.description && <div>{opp.description}</div>}
              {opp.notes && opp.notes !== opp.description && (
                <div style={{ marginTop: 4, color: srrColor(opp.notes), fontFamily: C.mono, fontSize: 11 }}>
                  {opp.notes}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Watchlist Table ───────────────────────────────────────────────────────────

const PATH_COLORS: Record<string, string> = {
  "IPO-direkt": C.teal,
  "Käufer-Proxy": C.blue,
  "ETF-Proxy": C.amber,
  Enabler: "#C084FC",
  Beobachten: C.text3,
  Archiv: C.red,
};

function WatchlistView({ companies }: { companies: Company[] }) {
  const [filters, setFilters] = useState({
    potential: "",
    investment_path: "",
    source: "",
    search: "",
  });

  const filtered = companies.filter((c) => {
    if (filters.potential && c.potential !== filters.potential) return false;
    if (filters.investment_path && c.investment_path !== filters.investment_path) return false;
    if (filters.source && c.source !== filters.source) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.category?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const sel = (id: string, value: string) =>
    setFilters((f) => ({ ...f, [id]: value }));

  return (
    <div>
      <SectionHead title="Watchlist" count={filtered.length} />

      {/* Filter bar */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 8,
        padding: "10px 14px",
        background: C.bgCard,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        marginBottom: 12,
        alignItems: "center",
      }}>
        {[
          { id: "potential", label: "Potenzial", opts: ["Hoch", "Mittel-hoch", "Mittel"] },
          { id: "investment_path", label: "Pfad", opts: ["IPO-direkt", "Käufer-Proxy", "ETF-Proxy", "Enabler", "Beobachten", "Archiv"] },
          { id: "source", label: "Quelle", opts: ["bestand", "woche1", "woche2", "manual"] },
        ].map(({ id, label, opts }) => (
          <div key={id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: C.text3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
            <select
              value={(filters as Record<string, string>)[id]}
              onChange={(e) => sel(id, e.target.value)}
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                color: C.text1,
                fontSize: 12,
                padding: "3px 8px",
                fontFamily: C.body,
                height: 28,
                cursor: "pointer",
              }}
            >
              <option value="">Alle</option>
              {opts.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <input
          type="text"
          placeholder="Suche…"
          value={filters.search}
          onChange={(e) => sel("search", e.target.value)}
          style={{
            background: C.bg, border: `1px solid ${C.border}`,
            borderRadius: 4, color: C.text1, fontSize: 12,
            padding: "3px 10px", fontFamily: C.body, height: 28,
            outline: "none", flex: 1, minWidth: 120,
          }}
        />
        <button
          onClick={() => setFilters({ potential: "", investment_path: "", source: "", search: "" })}
          style={{
            background: "transparent", border: `1px solid ${C.border}`,
            borderRadius: 4, color: C.text2, fontSize: 11,
            padding: "3px 10px", cursor: "pointer", fontFamily: C.body, height: 28,
          }}
        >Reset</button>
      </div>

      {/* Table */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#0D0D0F" }}>
                {["Unternehmen", "Kategorie", "Kerntechnologie", "Potenzial", "Risiko", "IPO-Potenzial", "Inv.-Pfad", "Proxy-Ticker", "Funding-Stand", "Letzte Entwicklung", ""].map((h) => (
                  <th key={h} style={{
                    padding: "8px 12px", textAlign: "left",
                    fontFamily: C.mono, fontSize: 10, fontWeight: 600,
                    color: C.text3, textTransform: "uppercase", letterSpacing: "0.07em",
                    borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.bgHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "9px 12px", fontWeight: 600, color: C.text1, whiteSpace: "nowrap" }}>
                    {c.name}
                    {(c.source === "woche1" || c.source === "woche2") && (
                      <span style={{
                        marginLeft: 6, fontSize: 9, fontFamily: C.mono, fontWeight: 700,
                        padding: "1px 5px", borderRadius: 3,
                        background: c.source === "woche1" ? C.tealDim : C.amberDim,
                        color: c.source === "woche1" ? C.teal : C.amber,
                        border: `1px solid ${c.source === "woche1" ? C.teal + "33" : C.amber + "33"}`,
                      }}>
                        {c.source === "woche1" ? "W1" : "W2"}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "9px 12px", color: C.text2, maxWidth: 160 }}>{c.category}</td>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{ color: potentialColor(c.potential), fontFamily: C.mono, fontWeight: 600, fontSize: 11 }}>
                      {c.potential ?? "—"}
                    </span>
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{ color: c.risk === "Hoch" ? C.red : C.text2, fontFamily: C.mono, fontSize: 11 }}>
                      {c.risk ?? "—"}
                    </span>
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <span style={{ color: c.ipo_potential === "Hoch" ? C.teal : C.text2, fontFamily: C.mono, fontSize: 11 }}>
                      {c.ipo_potential ?? "—"}
                    </span>
                  </td>
                  <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                    {c.investment_path && (
                      <span style={{
                        fontFamily: C.mono, fontSize: 10, fontWeight: 600,
                        color: PATH_COLORS[c.investment_path] ?? C.text2,
                        padding: "2px 6px", borderRadius: 3,
                        background: (PATH_COLORS[c.investment_path] ?? C.text2) + "18",
                        border: `1px solid ${(PATH_COLORS[c.investment_path] ?? C.text2)}33`,
                      }}>
                        {c.investment_path}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "9px 12px", fontFamily: C.mono, fontSize: 11, color: C.teal }}>
                    {c.proxy_ticker ?? "—"}
                  </td>
                  <td style={{ padding: "9px 12px", color: C.text2, fontSize: 11, whiteSpace: "nowrap" }}>
                    {c.funding_last_round ?? "—"}
                  </td>
                  <td style={{ padding: "9px 12px", color: C.amber, fontSize: 11, maxWidth: 180 }}>
                    {c.last_signal ? (
                      <span title={c.last_signal}>
                        {c.last_signal.length > 50 ? c.last_signal.slice(0, 50) + "…" : c.last_signal}
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ padding: "9px 12px" }}>
                    <button
                      onClick={() => window.location.href = `/company/${encodeURIComponent(c.name)}`}
                      style={{
                        background: "transparent", border: `1px solid ${C.border}`,
                        borderRadius: 4, color: C.text3, fontSize: 10,
                        padding: "3px 8px", cursor: "pointer",
                        fontFamily: C.mono, whiteSpace: "nowrap",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.color = C.teal; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text3; }}
                    >Detail →</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ padding: "2rem", textAlign: "center", color: C.text3, fontFamily: C.body }}>
                    Keine Einträge für die gewählten Filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Buyer Score Card ─────────────────────────────────────────────────────────

function BuyerScoreCard({ bs, rank }: { bs: BuyerScore; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const rc = ratingColor(bs.rating as DealRating);

  return (
    <div style={{
      background: C.bgCard, border: `1px solid ${C.border}`,
      borderRadius: 10, marginBottom: 8, overflow: "hidden",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = C.borderMd)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}>
        <div style={{
          width: 26, height: 26, borderRadius: "50%",
          background: rank === 1 ? C.tealDim : "transparent",
          border: `1px solid ${rank === 1 ? C.teal : C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: C.mono, fontSize: 11, fontWeight: 700,
          color: rank === 1 ? C.teal : C.text3, flexShrink: 0,
        }}>{rank}</div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: C.text1 }}>{bs.buyer_name}</div>
          <div style={{ fontSize: 11, color: C.text2, fontFamily: C.mono }}>
            {bs.ticker && <span style={{ color: C.teal }}>{bs.ticker}</span>}
            {bs.exchange && <span style={{ color: C.text3 }}> · {bs.exchange}</span>}
            {bs.market_cap_usd_bn && <span style={{ color: C.text3 }}> · ${bs.market_cap_usd_bn}B Marktcap</span>}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontFamily: C.mono, fontSize: 11, fontWeight: 700,
            color: rc, background: ratingBg(bs.rating as DealRating),
            padding: "2px 8px", borderRadius: 4,
            border: `1px solid ${rc}44`,
          }}>{bs.rating}</span>
          <span style={{ fontFamily: C.mono, fontSize: 12, color: C.text2 }}>
            {bs.deal_success_score.toFixed(3)}
          </span>
          {bs.execution_warning && (
            <span style={{ color: C.amber, fontSize: 11 }} title="Execution Warning">⚠</span>
          )}
          <span style={{ color: C.text3, fontSize: 12, transform: expanded ? "rotate(180deg)" : "none", transition: "0.2s" }}>▾</span>
        </div>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 8 }}>
            <MetricTile
              label="SRR"
              value={`${bs.srr_value.toFixed(2)}x`}
              sub={bs.srr_category}
              color={bs.srr_category.includes("++") ? C.teal : bs.srr_category === "Transformational" ? C.blue : bs.srr_category === "High Strategic" ? C.amber : C.text3}
              bar={Math.min(bs.srr_value / 5, 1)}
            />
            <MetricTile
              label="MFR"
              value={bs.mfr_value.toFixed(3)}
              sub={bs.mfr_signal}
              color={bs.mfr_signal === "Feasible" ? C.teal : bs.mfr_signal === "Watch" ? C.amber : C.red}
              bar={Math.max(0, 1 - bs.mfr_value / 0.5)}
            />
            <MetricTile
              label="Tech Readiness"
              value={bs.tech_readiness.toFixed(2)}
              sub="/1.00 (Neutralwert)"
              color={bs.tech_readiness >= 0.7 ? C.teal : bs.tech_readiness >= 0.5 ? C.amber : C.red}
              bar={bs.tech_readiness}
            />
            <MetricTile
              label="Deal Success Score"
              value={bs.deal_success_score.toFixed(3)}
              sub="SRR_norm × MFR_norm × TR"
              color={bs.deal_success_score >= 0.3 ? C.teal : bs.deal_success_score >= 0.15 ? C.amber : C.red}
              bar={bs.deal_success_score}
            />
          </div>
          {bs.execution_warning && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: C.amberDim, border: `1px solid ${C.amber}33`, borderRadius: 6, fontSize: 11, color: C.amber }}>
              ⚠ Execution Warning: Low-Cap-Buyer mit hohem SRR — Finanzierbarkeit separat validieren.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Supply Chain Section ──────────────────────────────────────────────────────

function SupplyChainSection({
  title, items, color,
}: { title: string; items: SupplyChainItem[]; color: string }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, color: C.text3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
        {title}
      </div>
      {items.slice(0, 5).map((item) => (
        <div key={item.ticker} style={{
          display: "flex", alignItems: "center", gap: 10,
          paddingBottom: 8, marginBottom: 8,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color, minWidth: 48 }}>
            {item.ticker}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: C.text1, fontWeight: 500 }}>{item.name}</div>
            <div style={{ fontSize: 11, color: C.text2 }}>{item.role}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 40, height: 3, background: C.border, borderRadius: 2 }}>
              <div style={{ width: `${Math.round(item.relevance * 100)}%`, height: "100%", background: color, borderRadius: 2 }} />
            </div>
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>
              {Math.round(item.relevance * 100)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FullSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"search" | "watchlist">("search");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load companies on mount
  useEffect(() => {
    fetchCompanies({ limit: 500 }).then(setCompanies).catch(console.error);
  }, []);

  // Autocomplete
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    const q = query.toLowerCase();
    setSuggestions(
      companies.filter((c) =>
        c.name.toLowerCase().includes(q) || c.proxy_ticker?.toLowerCase().includes(q)
      ).slice(0, 6)
    );
  }, [query, companies]);

  const handleSearch = useCallback(async (name: string) => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowSuggestions(false);
    try {
      const r = await searchCompanyFull(name);
      if (!r) { setError(`Kein Unternehmen gefunden für "${name}"`); } 
      else setResult(r);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch(query);
    if (e.key === "Escape") setShowSuggestions(false);
  };

  const selectSuggestion = (name: string) => {
    setQuery(name);
    setShowSuggestions(false);
    handleSearch(name);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      color: C.text1,
      fontFamily: C.body,
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: ${C.teal}33; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        select option { background: #111113; color: #FAFAF9; }
      `}</style>

      {/* Top bar */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 52,
        position: "sticky",
        top: 0,
        background: C.bg + "EE",
        backdropFilter: "blur(12px)",
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: C.teal,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontFamily: C.mono, fontSize: 13, fontWeight: 700, color: "#000" }}>A</span>
          </div>
          <span style={{ fontFamily: C.display, fontSize: 15, fontWeight: 700, letterSpacing: "-0.01em" }}>
            Argo Analytics
          </span>
          <span style={{
            fontFamily: C.mono, fontSize: 9, fontWeight: 600,
            padding: "2px 6px", borderRadius: 3,
            background: C.tealDim, color: C.teal,
            border: `1px solid ${C.tealBorder}`,
            letterSpacing: "0.06em",
          }}>BETA</span>
        </div>

        {/* Tab nav */}
        <div style={{ display: "flex", gap: 2 }}>
          {(["search", "watchlist"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: "transparent",
                border: "none",
                padding: "6px 14px",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: C.mono,
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: activeTab === tab ? C.text1 : C.text3,
                background: activeTab === tab ? C.bgCard : "transparent",
                transition: "all 0.15s",
              } as React.CSSProperties}
            >
              {tab === "search" ? "Research" : "Watchlist"}
            </button>
          ))}
        </div>

        {/* Status */}
        <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>
          {companies.length > 0
            ? <><span style={{ color: C.teal }}>●</span> {companies.length} Unternehmen geladen</>
            : <span style={{ color: C.amber }}>● Verbinde…</span>
          }
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px" }}>

        {activeTab === "search" && (
          <>
            {/* Hero */}
            <div style={{ marginBottom: 28 }}>
              <div style={{
                fontFamily: C.display,
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                marginBottom: 8,
              }}>
                Climate Tech<br />
                <span style={{ color: C.teal }}>Investment Intelligence</span>
              </div>
              <div style={{ fontSize: 13, color: C.text2, maxWidth: 480, lineHeight: 1.6 }}>
                Gib einen Unternehmensnamen oder Ticker ein. Argo berechnet Investitionspfade,
                SRR × MFR × TechReadiness und zeigt, mit welchen Finanzinstrumenten
                du von einer Entwicklung profitieren kannst.
              </div>
            </div>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 28 }}>
              <div style={{
                display: "flex",
                gap: 8,
                background: C.bgCard,
                border: `1.5px solid ${C.borderMd}`,
                borderRadius: 10,
                padding: "4px 4px 4px 16px",
                alignItems: "center",
                transition: "border-color 0.15s",
              }}>
                <span style={{ color: C.text3, fontSize: 16 }}>⌕</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
                  onKeyDown={handleKey}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Unternehmen oder Ticker suchen… (z.B. CarbonCure, CRH, FRVO)"
                  style={{
                    flex: 1, background: "transparent", border: "none",
                    color: C.text1, fontSize: 14, outline: "none",
                    fontFamily: C.body,
                  }}
                />
                <button
                  onClick={() => handleSearch(query)}
                  disabled={loading || !query.trim()}
                  style={{
                    background: loading ? C.tealDim : C.teal,
                    border: "none",
                    borderRadius: 7,
                    color: loading ? C.teal : "#000",
                    fontFamily: C.mono,
                    fontWeight: 700,
                    fontSize: 12,
                    padding: "9px 18px",
                    cursor: loading || !query.trim() ? "not-allowed" : "pointer",
                    letterSpacing: "0.05em",
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {loading ? "Analyse läuft…" : "Analysieren →"}
                </button>
              </div>

              {/* Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0, right: 0,
                  background: C.bgCard,
                  border: `1px solid ${C.borderMd}`,
                  borderRadius: 8,
                  overflow: "hidden",
                  zIndex: 50,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}>
                  {suggestions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => selectSuggestion(s.name)}
                      style={{
                        padding: "10px 16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        borderBottom: `1px solid ${C.border}`,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = C.bgHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: C.text1 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: C.text2 }}>{s.category}</div>
                      </div>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                        {s.proxy_ticker && (
                          <Badge label={s.proxy_ticker} color={C.teal} bg={C.tealDim} border={C.tealBorder} />
                        )}
                        {s.investment_path && (
                          <Badge
                            label={s.investment_path}
                            color={PATH_COLORS[s.investment_path] ?? C.text2}
                            bg="transparent"
                            border={C.border}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: "12px 16px",
                background: C.redDim,
                border: `1px solid ${C.red}33`,
                borderRadius: 8,
                color: C.red,
                fontSize: 13,
                marginBottom: 20,
              }}>{error}</div>
            )}

            {/* Loading skeleton */}
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{
                    height: i === 1 ? 120 : 60,
                    background: C.bgCard,
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    animation: "pulse 1.5s ease-in-out infinite",
                    opacity: 0.6 - i * 0.1,
                  }} />
                ))}
                <style>{`@keyframes pulse { 0%,100%{opacity:0.6} 50%{opacity:0.3} }`}</style>
              </div>
            )}

            {/* Results */}
            {result && !loading && (
              <div>
                {/* ── Compact result row + Detail link ── */}
                <div style={{
                  background: C.bgCard, border: `1px solid ${C.borderMd}`,
                  borderRadius: 10, padding: "14px 18px", marginBottom: 12,
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: C.display, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>
                      {result.company_name}
                    </div>
                    <div style={{ fontSize: 12, color: C.text2, marginTop: 2, display: "flex", gap: 10, alignItems: "center" }}>
                      <span>{result.category}</span>
                      {result.investment_path && <>
                        <span style={{ color: C.text3 }}>·</span>
                        <span style={{ color: result.investment_path === "IPO-direkt" ? C.teal : result.investment_path === "Käufer-Proxy" ? C.blue : C.text2 }}>{result.investment_path}</span>
                      </>}
                      {result.proxy_ticker && <>
                        <span style={{ color: C.text3 }}>·</span>
                        <span style={{ fontFamily: C.mono, color: C.teal, fontSize: 11 }}>{result.proxy_ticker}</span>
                      </>}
                      {result.ipo_potential && <>
                        <span style={{ color: C.text3 }}>·</span>
                        <span>IPO {result.ipo_potential}</span>
                      </>}
                    </div>
                  </div>
                  {result.buyer_scores?.[0] && (
                    <span style={{
                      fontFamily: C.mono, fontSize: 10, fontWeight: 700,
                      padding: "2px 8px", borderRadius: 4,
                      color: result.buyer_scores[0].rating.startsWith("A") ? C.teal : result.buyer_scores[0].rating.startsWith("B") ? C.blue : C.amber,
                      background: result.buyer_scores[0].rating.startsWith("A") ? C.tealDim : result.buyer_scores[0].rating.startsWith("B") ? C.blueDim : C.amberDim,
                      border: `1px solid ${result.buyer_scores[0].rating.startsWith("A") ? C.teal : result.buyer_scores[0].rating.startsWith("B") ? C.blue : C.amber}44`,
                    }}>{result.buyer_scores[0].rating}</span>
                  )}
                  <button
                    onClick={() => window.location.href = `/company/${encodeURIComponent(result.company_name)}`}
                    style={{
                      background: C.teal, border: "none", borderRadius: 6,
                      color: "#000", fontFamily: C.mono, fontWeight: 700,
                      fontSize: 11, padding: "7px 14px", cursor: "pointer",
                      letterSpacing: "0.04em", whiteSpace: "nowrap",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                  >
                    Detail →
                  </button>
                </div>

                {/* ── Company overview card ── */}
                <div style={{
                  background: C.bgCard, border: `1px solid ${C.borderMd}`,
                  borderRadius: 12, padding: "20px 22px", marginBottom: 16,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: C.display, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>
                        {result.company_name}
                        {!result.is_known && (
                          <span style={{
                            marginLeft: 10, fontSize: 10, fontFamily: C.mono, fontWeight: 600,
                            padding: "2px 8px", borderRadius: 4,
                            background: C.amberDim, color: C.amber,
                            border: `1px solid ${C.amber}33`,
                          }}>NEU ANGEREICHERT</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>{result.category}</div>
                      {result.description && (
                        <div style={{ fontSize: 12, color: C.text2, marginTop: 8, lineHeight: 1.6, maxWidth: 560 }}>
                          {result.description}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                      {result.proxy_ticker && (
                        <Badge label={result.proxy_ticker} color={C.teal} bg={C.tealDim} border={C.tealBorder} />
                      )}
                      {result.investment_path && (
                        <Badge label={result.investment_path} color={C.text2} bg="transparent" border={C.border} />
                      )}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginBottom: result.last_signal ? 12 : 0 }}>
                    <MetricTile label="Potenzial" value={result.potential ?? "—"} color={result.potential === "Hoch" ? C.teal : result.potential === "Mittel-hoch" ? C.amber : C.text2} />
                    <MetricTile label="Risiko" value={result.risk ?? "—"} color={result.risk === "Hoch" ? C.red : C.text2} />
                    <MetricTile label="IPO-Potenzial" value={result.ipo_potential ?? "—"} color={result.ipo_potential === "Hoch" ? C.teal : C.text2} />
                    <MetricTile label="Funding" value={result.funding_total_usd_mn ? `$${result.funding_total_usd_mn >= 1000 ? (result.funding_total_usd_mn/1000).toFixed(1)+"B" : result.funding_total_usd_mn+"M"}` : "—"} color={C.text1} />
                    <MetricTile label="TAM 2035" value={`$${result.tam.tam_usd_bn}B`} sub={result.tam.confidence === "high" ? "✓ verifiziert" : result.tam.confidence === "medium" ? "~ Schätzung" : "⚠ Fallback"} color={result.tam.confidence === "high" ? C.teal : result.tam.confidence === "medium" ? C.amber : C.red} />
                  </div>
                  {result.last_signal && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", background: C.amberDim, border: `1px solid ${C.amber}22`, borderRadius: 6, fontSize: 12 }}>
                      <span style={{ color: C.amber, fontSize: 10 }}>◆</span>
                      <span style={{ color: C.amber, fontWeight: 600, fontFamily: C.mono }}>{result.last_signal_date}</span>
                      <span style={{ color: C.text2 }}>{result.last_signal}</span>
                    </div>
                  )}
                </div>

                {/* ── Buyer Scores ── */}
                {result.buyer_scores.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <SectionHead title="Potenzielle Käufer · M&A Scoring" count={result.buyer_scores.length} />
                    <div style={{ fontSize: 12, color: C.text2, marginBottom: 12 }}>
                      SRR × MFR × TechReadiness — geordnet nach DealSuccessScore
                    </div>
                    {result.buyer_scores.map((bs: BuyerScore, i: number) => (
                      <BuyerScoreCard key={bs.buyer_name} bs={bs} rank={i + 1} />
                    ))}
                  </div>
                )}

                {/* ── Supply Chain ── */}
                {(result.supply_chain.upstream.length > 0 || result.supply_chain.downstream.length > 0 || result.supply_chain.etfs.length > 0) && (
                  <div style={{ marginBottom: 24 }}>
                    <SectionHead title="Supply Chain Contributors" />
                    <div style={{ fontSize: 12, color: C.text2, marginBottom: 12 }}>
                      Börsennotierte Profiteure entlang der Wertschöpfungskette
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {result.supply_chain.upstream.length > 0 && (
                        <SupplyChainSection title="Upstream" items={result.supply_chain.upstream} color={C.blue} />
                      )}
                      {result.supply_chain.downstream.length > 0 && (
                        <SupplyChainSection title="Downstream" items={result.supply_chain.downstream} color={C.teal} />
                      )}
                    </div>
                    {result.supply_chain.etfs.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 10, color: C.text3, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>ETF Exposure</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {result.supply_chain.etfs.map((etf: { ticker: string; name: string; relevance: number }) => (
                            <div key={etf.ticker} style={{
                              padding: "6px 12px", borderRadius: 6,
                              background: "rgba(160,100,220,0.1)",
                              border: "1px solid rgba(160,100,220,0.25)",
                              display: "flex", alignItems: "center", gap: 8,
                            }}>
                              <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: "#C084FC" }}>{etf.ticker}</span>
                              <span style={{ fontSize: 11, color: C.text2 }}>{etf.name}</span>
                              <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text3 }}>{Math.round(etf.relevance * 100)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Warnings ── */}
                {result.warnings.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {result.warnings.map((w: string, i: number) => (
                      <div key={i} style={{
                        padding: "8px 12px", marginBottom: 6,
                        background: C.amberDim, border: `1px solid ${C.amber}22`,
                        borderRadius: 6, fontSize: 11, color: C.amber, fontFamily: C.body,
                      }}>⚠ {w}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {!result && !loading && !error && (
              <div style={{ marginTop: 48, textAlign: "center" }}>
                <div style={{ fontFamily: C.mono, fontSize: 12, color: C.text3, marginBottom: 20 }}>
                  ── QUICK ACCESS ──
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {["CarbonCure", "Brimstone", "VoltaGrid", "Fervo Energy", "Factorial Energy", "Syzygy Plasmonics"].map((name) => (
                    <button
                      key={name}
                      onClick={() => { setQuery(name); handleSearch(name); }}
                      style={{
                        background: C.bgCard,
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        color: C.text2,
                        fontSize: 12,
                        fontFamily: C.mono,
                        padding: "6px 14px",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.color = C.teal; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text2; }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "watchlist" && (
          <WatchlistView companies={companies} />
        )}
      </div>
    </div>
  );
}
