'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Company {
  name: string;
  category: string;
  industry?: string;
  potential: string;
  risk: string;
  ipo_potential: string;
  ipo_status?: string;
  investment_path: string;
  proxy?: string;
  rating?: string;
  funding?: string;
  last_signal?: string;
  source?: string;
}

interface Buyer {
  name: string;
  ticker: string;
  exchange: string;
  market_cap?: number;
}

interface AnalysisResult {
  company: Company;
  buyers: BuyerResult[];
}

interface BuyerResult {
  buyer: Buyer;
  srr: number;
  srr_category: string;
  mfr: number;
  mfr_signal: string;
  tech_readiness: number;
  rating: string;
  deal_success_score: number;
}

interface MarketData {
  price?: number;
  market_cap?: number;
  pe_ratio?: number;
  week_52_high?: number;
  week_52_low?: number;
  revenue?: number;
  ebitda?: number;
  exchange?: string;
  currency?: string;
}

interface FundamentalsDetail {
  is_listed: boolean;
  ticker?: string;
  exchange?: string;
  price?: number;
  market_cap_bn?: number;
  pe_ratio?: number;
  revenue_bn?: number;
  ebitda_bn?: number;
  week_52_high?: number;
  week_52_low?: number;
  currency?: string;
  ba_found?: boolean;
  ba_revenue_mn?: number;
  ba_equity_mn?: number;
  ba_employees?: number;
}

interface FundingRound {
  round_name: string;
  amount_mn?: number;
  date?: string;
}

interface CompanyDetail {
  ipo_status?: string;
  ipo_probability_pct?: number;
  funding_last_round?: string;
  funding_rounds?: FundingRound[];
  fundamentals?: FundamentalsDetail;
  description?: string;
  wikipedia_url?: string;
  headquarters?: string;
  employee_count?: string;
  founded?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BACKEND_PROXY = '/api/backend';

const RATING_COLOR: Record<string, string> = {
  A: 'var(--teal)',
  B: 'var(--blue)',
  C: 'var(--amber)',
  D: 'var(--red)',
};

const RATING_LABEL: Record<string, string> = {
  A: 'A · No-Brainer',
  B: 'B · Solide',
  C: 'C · Abwägen',
  D: 'D · Uninteressant',
};

const PATH_COLOR: Record<string, string> = {
  'IPO-direkt': 'var(--blue)',
  'Käufer-Proxy': 'var(--teal)',
  'ETF-Proxy': 'var(--amber)',
  'Enabler': 'var(--purple)',
  'Beobachten': 'var(--t2)',
  'Archiv': 'var(--red)',
};

// ─── API helpers ─────────────────────────────────────────────────────────────

async function fetchCompanies(): Promise<Company[]> {
  const res = await fetch(`${BACKEND_PROXY}/api/v1/companies`);
  if (!res.ok) return [];
  return res.json();
}

async function fetchMarketData(ticker: string): Promise<MarketData | null> {
  try {
    const res = await fetch(`/api/market?ticker=${ticker}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Badge({
  children,
  color = 'gray',
  large = false,
}: {
  children: React.ReactNode;
  color?: 'teal' | 'blue' | 'amber' | 'red' | 'purple' | 'gray';
  large?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    teal: { background: 'var(--teal-bg)', color: 'var(--teal)', border: '1px solid rgba(0,212,160,0.2)' },
    blue: { background: 'var(--blue-bg)', color: 'var(--blue)', border: '1px solid rgba(59,110,240,0.2)' },
    amber: { background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid rgba(240,165,0,0.2)' },
    red: { background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(240,69,69,0.2)' },
    purple: { background: 'var(--purple-bg)', color: 'var(--purple)', border: '1px solid rgba(155,110,240,0.2)' },
    gray: { background: 'rgba(255,255,255,0.05)', color: 'var(--t2)', border: '1px solid var(--border)' },
  };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: large ? 12 : 11,
        fontWeight: 500,
        padding: large ? '5px 14px' : '3px 10px',
        borderRadius: 99,
        fontFamily: 'var(--font-m)',
        letterSpacing: '.02em',
        ...styles[color],
      }}
    >
      {children}
    </span>
  );
}

function RatingBadge({ rating, large = false }: { rating: string; large?: boolean }) {
  const map: Record<string, 'teal' | 'blue' | 'amber' | 'red' | 'gray'> = {
    A: 'teal', B: 'blue', C: 'amber', D: 'red',
  };
  if (!rating || rating === '—') return <Badge color="gray" large={large}>—</Badge>;
  return <Badge color={map[rating] ?? 'gray'} large={large}>{RATING_LABEL[rating] ?? rating}</Badge>;
}

function PathBadge({ path }: { path: string }) {
  const map: Record<string, 'teal' | 'blue' | 'amber' | 'purple' | 'gray' | 'red'> = {
    'IPO-direkt': 'blue',
    'IPO': 'blue',
    'Käufer-Proxy': 'teal',
    'ETF-Proxy': 'amber',
    'Enabler': 'purple',
    'Beobachten': 'gray',
    'Archiv': 'red',
  };
  return <Badge color={map[path] ?? 'gray'}>{path}</Badge>;
}

function PotentialBadge({ val }: { val: string }) {
  if (val === 'Hoch') return <Badge color="teal">Hoch</Badge>;
  if (val === 'Mittel-hoch') return <Badge color="amber">Mittel-hoch</Badge>;
  return <Badge color="gray">{val}</Badge>;
}

function IpoBadge({ val }: { val: string }) {
  if (val === 'Hoch') return <Badge color="teal">Hoch</Badge>;
  if (val === 'Mittel-hoch') return <Badge color="amber">Mittel-hoch</Badge>;
  if (val === 'IPO erfolgt') return <Badge color="blue">IPO erfolgt</Badge>;
  if (val === 'Niedrig') return <Badge color="gray">Niedrig</Badge>;
  return <Badge color="gray">{val}</Badge>;
}

function ScoreBar({ value, color = 'var(--teal)' }: { value: number; color?: string }) {
  return (
    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(value * 100, 100)}%`, borderRadius: 99, background: color }} />
    </div>
  );
}

// ─── Subtab components ───────────────────────────────────────────────────────

function SubOverblick({ company }: { company: Company }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div className="info-card">
          <div className="info-card-title">Unternehmen</div>
<div className="info-row"><span className="info-key">Industrie</span><span className="info-val">{company.industry ?? '—'}</span></div>
<div className="info-row"><span className="info-key">Kategorie</span><span className="info-val">{company.category}</span></div>
         </div>
          <div className="info-row"><span className="info-key">Status</span><span className="info-val" style={{ color: company.ipo_status === 'listed' ? 'var(--blue)' : 'var(--teal)' }}>{company.ipo_status === 'listed' ? 'Börsennotiert · Aktiv' : 'Privat · Aktiv'}</span></div>
          <div className="info-row"><span className="info-key">Pfad</span><span className="info-val">{company.investment_path}</span></div>
          <div className="info-row"><span className="info-key">Quelle</span><span className="info-val" style={{ fontFamily: 'var(--font-m)', fontSize: 11 }}>{company.source ?? 'Bestand'}</span></div>
        </div>
        <div className="info-card">
          <div className="info-card-title">Markt & Positionierung</div>
          <div className="info-row"><span className="info-key">Potenzial</span><span className="info-val">{company.potential}</span></div>
          <div className="info-row"><span className="info-key">Risiko</span><span className="info-val">{company.risk}</span></div>
          <div className="info-row"><span className="info-key">IPO-Potenzial</span><span className="info-val">{company.ipo_potential}</span></div>
          <div className="info-row"><span className="info-key">Proxy</span><span className="info-val" style={{ fontFamily: 'var(--font-m)', fontSize: 11 }}>{company.proxy ?? '—'}</span></div>
          <div className="info-row"><span className="info-key">Funding</span><span className="info-val">{company.funding ?? '—'}</span></div>
        </div>
      </div>
      <div className="news-card">
        <div className="info-card-title">Letzte Entwicklungen</div>
        {company.last_signal && company.last_signal !== '—' ? (
          <div className="news-item">
            <div className="news-title">{company.last_signal}</div>
            <div className="news-src">Morning Briefing</div>
          </div>
        ) : (
          <div style={{ padding: '8px 0', opacity: 0.4, fontSize: 12, color: 'var(--t2)' }}>
            Keine aktuellen Signale — Briefing-Integration aktiv
          </div>
        )}
      </div>
    </div>
  );
}

function SubOwnership() {
  return (
    <div className="ownership-grid">
      <div className="own-card">
        <div className="own-title">Bekannte Investoren</div>
        <div style={{ padding: '16px 0', opacity: 0.4, fontSize: 12, color: 'var(--t2)' }}>
          Crunchbase-Enrichment · Daten werden automatisch ergänzt
        </div>
      </div>
      <div className="own-card">
        <div className="own-title">Kapitalstruktur (geschätzt)</div>
        <div style={{ padding: '16px 0', opacity: 0.4, fontSize: 12, color: 'var(--t2)' }}>
          Schätzung auf Basis bekannter Runden — folgt
        </div>
      </div>
    </div>
  );
}

function SubFundamentals({ company, detail }: { company: Company; detail?: CompanyDetail | null }) {
  const isListed = company.ipo_status === 'listed' || company.investment_path === 'IPO';
  const fd = detail?.fundamentals;

  return (
    <div>
      {/* Market Data — only for listed companies */}
      {isListed && fd?.is_listed && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(59,110,240,0.2)', borderRadius: 'var(--r-lg)', padding: '1rem 1.25rem', marginBottom: 12 }}>
          <div className="info-card-title" style={{ color: 'var(--blue)', marginBottom: 8 }}>● Marktdaten · {fd.ticker} · {fd.exchange}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <div className="fund-tile">
              <div className="fund-tile-label">Kurs</div>
              <div className="fund-tile-val" style={{ color: 'var(--blue)' }}>{fd.price ? `${fd.currency ?? '$'}${fd.price.toFixed(2)}` : '—'}</div>
              <div className="fund-tile-sub">Aktuell</div>
            </div>
            <div className="fund-tile">
              <div className="fund-tile-label">Market Cap</div>
              <div className="fund-tile-val" style={{ fontSize: 16 }}>{fd.market_cap_bn ? `$${fd.market_cap_bn.toFixed(1)}B` : '—'}</div>
              <div className="fund-tile-sub">Mrd. USD</div>
            </div>
            <div className="fund-tile">
              <div className="fund-tile-label">52W High</div>
              <div className="fund-tile-val" style={{ fontSize: 16 }}>{fd.week_52_high ? `${fd.week_52_high.toFixed(2)}` : '—'}</div>
              <div className="fund-tile-sub">52W Low: {fd.week_52_low?.toFixed(2) ?? '—'}</div>
            </div>
            <div className="fund-tile">
              <div className="fund-tile-label">Revenue</div>
              <div className="fund-tile-val" style={{ fontSize: 16 }}>{fd.revenue_bn ? `$${fd.revenue_bn.toFixed(2)}B` : '—'}</div>
              <div className="fund-tile-sub">EBITDA: {fd.ebitda_bn ? `$${fd.ebitda_bn.toFixed(2)}B` : '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Funding Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
        <div className="fund-tile">
          <div className="fund-tile-label">Funding Total</div>
          <div className="fund-tile-val">{company.funding?.split(';')[0]?.trim() ?? '—'}</div>
          <div className="fund-tile-sub">Gesamt über alle Runden</div>
        </div>
        <div className="fund-tile">
          <div className="fund-tile-label">Letzte Runde</div>
          <div className="fund-tile-val" style={{ fontSize: 14 }}>{detail?.funding_last_round?.split('(')[0]?.trim() ?? '—'}</div>
          <div className="fund-tile-sub">Aus Funding-Stand</div>
        </div>
        <div className="fund-tile">
          <div className="fund-tile-label">Est. Valuation</div>
          <div className="fund-tile-val" style={{ color: 'var(--teal)', fontSize: 14 }}>—</div>
          <div className="fund-tile-sub">5× Multiplikator</div>
        </div>
        <div className="fund-tile">
          <div className="fund-tile-label">IPO-Status</div>
          <div className="fund-tile-val" style={{ color: isListed ? 'var(--blue)' : 'var(--t2)', fontSize: 14 }}>
            {isListed ? 'Listed' : company.ipo_potential ?? '—'}
          </div>
          <div className="fund-tile-sub">{detail?.ipo_probability_pct ? `${detail.ipo_probability_pct}% Wahrscheinlichkeit` : ''}</div>
        </div>
      </div>

      {/* Funding Timeline */}
      <div className="funding-timeline">
        <div className="tl-title">Funding-Timeline</div>
        {detail?.funding_rounds && detail.funding_rounds.length > 0 ? (
          detail.funding_rounds.map((r, i) => (
            <div key={i} className="tl-row">
              <div className="tl-dot" />
              <div className="tl-round">{r.round_name}</div>
              <div className="tl-amount">{r.amount_mn ? `$${r.amount_mn.toFixed(0)}M` : '—'}</div>
              <div className="tl-date">{r.date ?? '—'}</div>
            </div>
          ))
        ) : (
          <div style={{ padding: '16px 0', opacity: 0.4, fontSize: 12, color: 'var(--t2)' }}>
            Vollständige Timeline folgt — Crunchbase-Enrichment aktiv
          </div>
        )}
      </div>
    </div>
  );
}

function SubInvestitionspfad({ company, buyers }: { company: Company; buyers: BuyerResult[] }) {
  const ratingColorMap: Record<string, string> = {
    A: 'var(--teal)', B: 'var(--blue)', C: 'var(--amber)', D: 'var(--red)',
  };

  if (company.investment_path === 'Beobachten' || company.investment_path === 'Archiv') {
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
        padding: '2rem', textAlign: 'center', color: 'var(--t2)', fontSize: 13,
      }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>◎</div>
        <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--t1)' }}>{company.investment_path}</div>
        <div>Kein klarer Kapitalmarktpfad erkennbar — auf Signal warten</div>
      </div>
    );
  }

  if (buyers.length === 0) {
    return (
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
        padding: '2rem', textAlign: 'center', color: 'var(--t2)', fontSize: 13,
      }}>
        Scoring-Daten werden geladen…
      </div>
    );
  }

  return (
    <div>
      {buyers.map((b, i) => {
        const ratingColor = ratingColorMap[b.rating] ?? 'var(--t2)';
        const srrPct = Math.min((Math.log(1 + b.srr) / Math.log(11)) * 100, 100);
        const mfrPct = b.mfr_signal === 'feasible' ? 90 : b.mfr_signal === 'watch' ? 60 : 30;
        const borderColor = b.rating === 'A' ? 'rgba(0,212,160,0.2)' : b.rating === 'B' ? 'rgba(59,110,240,0.2)' : 'var(--border-md)';

        return (
          <div key={i} className="pfad-card" style={{ borderColor }}>
            <div className="pfad-header">
              <div>
                <div className="pfad-title">
                  {company.investment_path} · {b.buyer.ticker} · {b.buyer.exchange}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 3 }}>
                  {b.buyer.name} · Marktcap: {b.buyer.market_cap ? `$${(b.buyer.market_cap / 1e9).toFixed(0)} Mrd.` : '—'}
                </div>
              </div>
              <RatingBadge rating={b.rating} large />
            </div>

            <div className="scoring-grid">
              <div className="score-tile">
                <div className="score-tile-label">SRR — Strategic Relevance</div>
                <div className="score-tile-val" style={{ color: 'var(--teal)' }}>{b.srr.toFixed(2)}×</div>
                <div className="score-tile-desc">{b.srr_category}</div>
                <ScoreBar value={srrPct / 100} color="var(--teal)" />
              </div>
              <div className="score-tile">
                <div className="score-tile-label">MFR — M&A Feasibility</div>
                <div className="score-tile-val" style={{ color: b.mfr_signal === 'feasible' ? 'var(--teal)' : b.mfr_signal === 'watch' ? 'var(--amber)' : 'var(--red)' }}>
                  {b.mfr < 0.01 ? '<0.01×' : `${b.mfr.toFixed(2)}×`}
                </div>
                <div className="score-tile-desc">
                  {b.mfr_signal === 'feasible' ? '🟢 Feasible' : b.mfr_signal === 'watch' ? '🟡 Watch' : '🔴 Overstretch'}
                </div>
                <ScoreBar value={mfrPct / 100} color={b.mfr_signal === 'feasible' ? 'var(--teal)' : b.mfr_signal === 'watch' ? 'var(--amber)' : 'var(--red)'} />
              </div>
              <div className="score-tile">
                <div className="score-tile-label">Tech Readiness</div>
                <div className="score-tile-val" style={{ color: 'var(--blue)' }}>{b.tech_readiness.toFixed(2)}</div>
                <div className="score-tile-desc">{b.tech_readiness >= 0.7 ? 'Stark' : b.tech_readiness >= 0.5 ? 'Solide' : 'Früh'}</div>
                <ScoreBar value={b.tech_readiness} color="var(--blue)" />
              </div>
            </div>

            <div className="verdict" style={{
              background: `${ratingColor}0F`,
              borderColor: `${ratingColor}33`,
            }}>
              <span className="verdict-label">Gesamturteil</span>
              <span className="verdict-val" style={{ color: ratingColor }}>
                {RATING_LABEL[b.rating] ?? b.rating} — {b.srr_category} · {b.mfr_signal === 'feasible' ? 'Feasible' : b.mfr_signal === 'watch' ? 'Watch' : 'Overstretch'} · TR {b.tech_readiness.toFixed(2)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Result State ────────────────────────────────────────────────────────────

type SubTab = 'uberblick' | 'ownership' | 'fundamentals' | 'investitionspfad';

function ResultState({
  company,
  buyers,
  onBack,
}: {
  company: Company;
  buyers: BuyerResult[];
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<SubTab>('uberblick');
  const [starred, setStarred] = useState(false);
  const [detail, setDetail] = useState<CompanyDetail | null>(null);

  useEffect(() => {
    fetch(`${BACKEND_PROXY}/api/v1/company/${encodeURIComponent(company.name)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setDetail(d))
      .catch(() => {});
  }, [company.name]);

  const initials = company.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const ratingColor = company.rating && company.rating !== '—'
    ? RATING_COLOR[company.rating] ?? 'var(--t2)'
    : 'var(--t2)';

  return (
    <div className="result-wrap">
      {/* Topbar */}
      <div className="result-topbar">
        <button className="btn-back" onClick={onBack}>← Zurück</button>
        <span className="result-breadcrumb">ANALYSE · {company.name.toUpperCase()}</span>
      </div>

      {/* Company Header Card */}
      <div className="company-header-card">
        <div className="ch-top">
          <div className="ch-left">
            <div className="ch-icon">{initials}</div>
            <div>
              <div className="ch-name">
                {company.name}
                <span className="ch-ticker">
                  {company.ipo_status === 'listed' || company.investment_path === 'IPO' ? (company.proxy ?? 'Börsennotiert') : 'Private'}
                </span>
              </div>
              <div className="ch-cat">
                {company.category} · {company.investment_path}
                {company.funding ? ` · ${company.funding.split(';')[0].split('(')[0].trim()}` : ''}
              </div>
            </div>
          </div>
          <div className="ch-right">
            <button
              className={`star-btn${starred ? ' active' : ''}`}
              onClick={() => setStarred(!starred)}
              title="Zur Watchlist hinzufügen"
            >
              {starred ? '★' : '☆'}
            </button>
            {company.rating && company.rating !== '—' && (
              <RatingBadge rating={company.rating} large />
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="ch-badges">
          <Badge color="teal">Potenzial: {company.potential}</Badge>
          <Badge color="gray">Risiko: {company.risk}</Badge>
          {company.ipo_status === 'listed' ? <Badge color="blue">● Börsennotiert</Badge> : <Badge color="gray">IPO: {company.ipo_potential}</Badge>}
          <Badge color="gray">{company.investment_path}</Badge>
          {company.proxy && company.proxy !== '—' && (
            <Badge color="amber">Proxy: {company.proxy}</Badge>
          )}
        </div>

        {/* Meta Grid */}
        <div className="ch-meta">
          <div className="meta-item">
            <div className="meta-label">Funding Total</div>
            <div className="meta-val">{company.funding?.split(';')[0]?.split('Gesamt:')[0]?.trim() ?? '—'}</div>
          </div>
          <div className="meta-item">
            <div className="meta-label">Letzte Runde</div>
            <div className="meta-val">—</div>
          </div>
          <div className="meta-item">
 	 <div className="meta-label">Industrie</div>
 	 <div className="meta-val">{company.industry ?? '—'}</div>
	</div>
	<div className="meta-item">
  	<div className="meta-label">Kategorie</div>
  	<div className="meta-val">{company.category}</div>
          </div>
          <div className="meta-item">
            <div className="meta-label">L. Signal</div>
            <div className="meta-val" style={{ color: company.last_signal && company.last_signal !== '—' ? 'var(--t1)' : 'var(--t3)' }}>
              {company.last_signal ?? '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Subtabs */}
      <div className="subtabs">
        {(['uberblick', 'ownership', 'fundamentals', 'investitionspfad'] as SubTab[]).map((tab) => (
          <button
            key={tab}
            className={`subtab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'uberblick' ? 'Überblick'
              : tab === 'ownership' ? 'Ownership'
              : tab === 'fundamentals' ? 'Fundamentals'
              : 'Investitionspfad'}
          </button>
        ))}
      </div>

      {/* Subpages */}
      {activeTab === 'uberblick' && <SubOverblick company={company} />}
      {activeTab === 'ownership' && <SubOwnership />}
      {activeTab === 'fundamentals' && <SubFundamentals company={company} detail={detail} />}
      {activeTab === 'investitionspfad' && <SubInvestitionspfad company={company} buyers={buyers} />}
    </div>
  );
}

// ─── Hero / Search State ─────────────────────────────────────────────────────

function HeroState({
  companies,
  onSelect,
}: {
  companies: Company[];
  onSelect: (c: Company) => void;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Company[]>([]);
  const [popular, setPopular] = useState<{ name: string; count: number }[]>([]);

  useEffect(() => {
    // Build popular from localStorage
    const raw = localStorage.getItem('argo_access_counts');
    const counts: Record<string, number> = raw ? JSON.parse(raw) : {};
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
    setPopular(sorted.length ? sorted : [
      { name: 'CarbonCure', count: 24 },
      { name: 'VoltaGrid', count: 18 },
      { name: 'Fervo Energy', count: 15 },
      { name: 'Brimstone', count: 12 },
      { name: 'Factorial Energy', count: 9 },
    ]);
  }, []);

  const handleInput = (v: string) => {
    setQuery(v);
    if (v.length < 2) { setSuggestions([]); return; }
    setSuggestions(
      companies.filter((c) => c.name.toLowerCase().includes(v.toLowerCase())).slice(0, 6)
    );
  };

  const handleSelect = (c: Company) => {
    const raw = localStorage.getItem('argo_access_counts');
    const counts: Record<string, number> = raw ? JSON.parse(raw) : {};
    counts[c.name] = (counts[c.name] ?? 0) + 1;
    localStorage.setItem('argo_access_counts', JSON.stringify(counts));
    onSelect(c);
  };

  const handleSearch = () => {
    const match = companies.find((c) => c.name.toLowerCase() === query.toLowerCase())
      ?? companies.find((c) => c.name.toLowerCase().includes(query.toLowerCase()));
    if (match) handleSelect(match);
  };

  return (
    <div className="hero">
      <div className="hero-eyebrow">Private Market Intelligence · Public Market Edge</div>
      <h1>Sieh, wer profitiert —<br /><span>bevor es der Markt tut.</span></h1>
      <p className="hero-sub">
        Argo identifiziert Gewinner branchenübergreifend —
        für Investoren, die früher als der Konsens positioniert sein wollen.
      </p>
      <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto 1.25rem' }}>
        <div className="search-wrap">
          <input
            type="text"
            placeholder="Unternehmen oder Ticker… (z.B. CarbonCure, NEE, FRVO)"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="btn-primary" onClick={handleSearch}>Analysieren →</button>
        </div>
        {suggestions.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
            background: 'var(--bg-card)', border: '1px solid var(--border-md)',
            borderRadius: 'var(--r-md)', zIndex: 50, overflow: 'hidden',
          }}>
            {suggestions.map((c) => (
              <div
                key={c.name}
                onClick={() => handleSelect(c)}
                style={{
                  padding: '8px 14px', cursor: 'pointer', fontSize: 13,
                  borderBottom: '1px solid var(--border)', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between',
                  transition: 'background .1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: 'var(--t1)', fontWeight: 500 }}>{c.name}</span>
                <span style={{ color: 'var(--t3)', fontSize: 11, fontFamily: 'var(--font-m)' }}>{c.category}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="qa-section">
        <div className="qa-label">Häufig aufgerufen</div>
        <div className="qa-chips">
          {popular.map((p) => {
            const company = companies.find((c) => c.name === p.name);
            return (
              <span
                key={p.name}
                className="qa-chip"
                onClick={() => company && handleSelect(company)}
              >
                {p.name}
                <span className="qa-chip-count">{p.count}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Watchlist ───────────────────────────────────────────────────────────────

function WatchlistPage({
  companies,
  onSelectCompany,
}: {
  companies: Company[];
  onSelectCompany: (c: Company) => void;
}) {
  const [filterPot, setFilterPot] = useState('');
  const [filterPfad, setFilterPfad] = useState('');
  const [filterRate, setFilterRate] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [search, setSearch] = useState('');

  const industries = Array.from(new Set(companies.map((c) => c.industry).filter(Boolean))) as string[];

  const filtered = companies.filter((c) => {
    if (filterPot && c.potential !== filterPot) return false;
    if (filterPfad && c.investment_path !== filterPfad) return false;
    if (filterRate && c.rating !== filterRate) return false;
    if (filterIndustry && c.industry !== filterIndustry) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.category.toLowerCase().includes(q) && !(c.proxy ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="watchlist-wrap">
      <div className="wl-header">
        <div className="wl-title">
          <span style={{ width: 3, height: 18, background: 'var(--teal)', borderRadius: 2, display: 'inline-block' }} />
          Watchlist <span className="wl-count">({filtered.length})</span>
        </div>
      </div>

      <div className="filter-bar">
        <label>Potenzial</label>
        <select value={filterPot} onChange={(e) => setFilterPot(e.target.value)}>
          <option value="">Alle</option>
          <option>Hoch</option><option>Mittel-hoch</option><option>Mittel</option>
        </select>
        <label>Pfad</label>
        <select value={filterPfad} onChange={(e) => setFilterPfad(e.target.value)}>
          <option value="">Alle</option>
          <option>Käufer-Proxy</option><option>IPO-direkt</option><option>ETF-Proxy</option>
          <option>Enabler</option><option>Beobachten</option><option>Archiv</option>
        </select>
        <label>Wertung</label>
        <select value={filterRate} onChange={(e) => setFilterRate(e.target.value)}>
          <option value="">Alle</option>
          <option value="A">A · No-Brainer</option>
          <option value="B">B · Solide</option>
          <option value="C">C · Abwägen</option>
          <option value="D">D · Uninteressant</option>
        </select>
        <label>Industrie</label>
        <select value={filterIndustry} onChange={(e) => setFilterIndustry(e.target.value)}>
          <option value="">Alle</option>
          {industries.map((ind) => <option key={ind}>{ind}</option>)}
        </select>
        <input
          type="text"
          placeholder="Suche Unternehmen, Proxy…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="tbl-wrap">
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th data-tip="Unternehmensname">Unternehmen</th>
                <th data-tip="Technologie-Cluster">Kategorie</th>
                <th data-tip="Industriesektor">Industrie</th>
                <th data-tip="Eingeschätztes Marktpotenzial">Potenzial</th>
                <th data-tip="Technologisches und regulatorisches Risiko">Risiko</th>
                <th data-tip="Wahrscheinlichkeit eines Börsengangs">IPO-Potenzial</th>
                <th data-tip="Empfohlener Investitionsansatz">Inv.-Pfad</th>
                <th data-tip="Börsennotierter Proxy-Titel">Proxy</th>
                <th data-tip="Gesamtwertung nach SRR × MFR × TechReadiness">Wertung</th>
                <th data-tip="Gesamtes Fundraising">Funding</th>
                <th data-tip="Letztes Signal aus Morning Briefing">L. Signal</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.name}>
                  <td
                    className="td-name"
                    onClick={() => onSelectCompany(c)}
                  >
                    {c.name}
                  </td>
                  <td className="td-muted">{c.category}</td>
                  <td className="td-muted">{c.industry ?? '—'}</td>
                  <td><PotentialBadge val={c.potential} /></td>
                  <td><Badge color={c.risk === 'Hoch' ? 'red' : 'gray'}>{c.risk}</Badge></td>
                  <td><IpoBadge val={c.ipo_potential} /></td>
                  <td><PathBadge path={c.investment_path} /></td>
                  <td className="td-mono">{c.proxy ?? '—'}</td>
                  <td><RatingBadge rating={c.rating ?? '—'} /></td>
                  <td className="td-muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.funding?.split(';')[0]?.trim() ?? '—'}
                  </td>
                  <td className="td-muted">{c.last_signal ?? '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--t3)', fontSize: 13 }}>
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

// ─── Root Page ────────────────────────────────────────────────────────────────

type NavTab = 'research' | 'watchlist';

export default function Page() {
  const [navTab, setNavTab] = useState<NavTab>('research');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [analysisResult, setAnalysisResult] = useState<BuyerResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCompanies().then(setCompanies);
  }, []);

  const handleSelectCompany = useCallback(async (company: Company) => {
    setSelectedCompany(company);
    setNavTab('research');
    setAnalysisResult([]);
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_PROXY}/api/v1/company/${encodeURIComponent(company.name)}`);
      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data.buyers ?? []);
      }
    } catch {
      // Graceful — show empty buyer list
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBack = () => setSelectedCompany(null);

  const handleSelectFromWatchlist = (c: Company) => {
    handleSelectCompany(c);
    setNavTab('research');
  };

  return (
    <>
      {/* ── Global Styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=DM+Sans:wght@400;500&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        :root{
          --bg:#0D0F12;--bg-card:#13161B;--bg-hover:#1A1E24;
          --border:rgba(255,255,255,0.06);--border-md:rgba(255,255,255,0.10);
          --teal:#00D4A0;--teal-dim:#00A07A;--teal-bg:rgba(0,212,160,0.08);
          --blue:#3B6EF0;--blue-bg:rgba(59,110,240,0.10);
          --amber:#F0A500;--amber-bg:rgba(240,165,0,0.10);
          --red:#F04545;--red-bg:rgba(240,69,69,0.10);
          --purple:#9B6EF0;--purple-bg:rgba(155,110,240,0.10);
          --t1:#F0F0EE;--t2:#9A9B99;--t3:#4A4C4A;
          --font-d:'Plus Jakarta Sans',sans-serif;
          --font-b:'DM Sans',sans-serif;
          --font-m:'DM Mono',monospace;
          --r-sm:6px;--r-md:10px;--r-lg:14px;
        }
        body{background:var(--bg);color:var(--t1);font-family:var(--font-b);font-size:14px;min-height:100vh}

        /* Nav */
        nav{display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:52px;border-bottom:1px solid var(--border);background:rgba(13,15,18,0.97);position:sticky;top:0;z-index:100}
        .nav-logo{display:flex;align-items:center;gap:10px;cursor:pointer}
        .nav-logo-icon{width:28px;height:28px;background:var(--teal);border-radius:7px;display:flex;align-items:center;justify-content:center;font-family:var(--font-d);font-weight:700;font-size:13px;color:#0D0F12}
        .nav-logo-text{font-family:var(--font-d);font-weight:600;font-size:15px;color:var(--t1)}
        .nav-logo-sub{font-size:10px;color:var(--t3);font-family:var(--font-m);letter-spacing:.04em;margin-top:1px}
        .nav-tabs{display:flex;gap:2px;background:rgba(255,255,255,0.04);padding:3px;border-radius:var(--r-md);border:1px solid var(--border)}
        .nav-tab{padding:5px 16px;border-radius:7px;font-size:12px;font-weight:500;color:var(--t2);cursor:pointer;transition:all .15s;letter-spacing:.04em;text-transform:uppercase;border:none;background:none}
        .nav-tab.active{background:var(--bg-card);color:var(--t1);border:1px solid var(--border-md)}
        .nav-status{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--t3);font-family:var(--font-m)}
        .status-dot{width:6px;height:6px;border-radius:50%;background:var(--teal);animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}

        /* Pages */
        .page{padding:0 2rem 4rem}

        /* Hero */
        .hero{max-width:640px;margin:0 auto;padding:3.5rem 0 2rem;text-align:center}
        .hero-eyebrow{font-size:11px;font-family:var(--font-m);color:var(--teal);letter-spacing:.1em;text-transform:uppercase;margin-bottom:1rem;opacity:.8}
        .hero h1{font-family:var(--font-d);font-size:40px;font-weight:700;line-height:1.15;letter-spacing:-.02em;color:var(--t1);margin-bottom:.75rem}
        .hero h1 span{color:var(--teal)}
        .hero-sub{font-size:15px;color:var(--t2);line-height:1.65;max-width:460px;margin:0 auto 1.75rem}
        .search-wrap{display:flex;gap:10px;background:var(--bg-card);border:1px solid var(--border-md);border-radius:var(--r-lg);padding:6px 6px 6px 14px;align-items:center}
        .search-wrap input{flex:1;background:none;border:none;outline:none;color:var(--t1);font-family:var(--font-b);font-size:14px}
        .search-wrap input::placeholder{color:var(--t3)}
        .btn-primary{background:var(--teal);color:#0D0F12;font-family:var(--font-d);font-weight:600;font-size:13px;padding:9px 20px;border-radius:var(--r-md);border:none;cursor:pointer;white-space:nowrap}
        .qa-section{margin-top:.5rem}
        .qa-label{font-size:10px;color:var(--t3);font-family:var(--font-m);letter-spacing:.07em;text-transform:uppercase;margin-bottom:.5rem;text-align:center}
        .qa-chips{display:flex;align-items:center;gap:6px;justify-content:center;flex-wrap:wrap}
        .qa-chip{background:var(--bg-card);border:1px solid var(--border-md);border-radius:99px;padding:4px 12px;font-size:11px;color:var(--t2);cursor:pointer;transition:all .15s;font-family:var(--font-m);display:flex;align-items:center;gap:5px}
        .qa-chip:hover{border-color:var(--teal);color:var(--teal)}
        .qa-chip-count{font-size:10px;color:var(--t3);background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:99px}

        /* Result */
        .result-wrap{max-width:900px;margin:0 auto;padding-top:1.5rem}
        .result-topbar{display:flex;align-items:center;gap:10px;margin-bottom:1.25rem}
        .btn-back{background:none;border:1px solid var(--border-md);border-radius:var(--r-sm);color:var(--t2);font-size:12px;padding:5px 12px;cursor:pointer;font-family:var(--font-b)}
        .btn-back:hover{border-color:var(--teal);color:var(--teal)}
        .result-breadcrumb{font-size:11px;color:var(--t3);font-family:var(--font-m)}

        /* Company Header Card */
        .company-header-card{background:var(--bg-card);border:1px solid var(--border-md);border-radius:var(--r-lg);padding:1.25rem 1.5rem;margin-bottom:1rem}
        .ch-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:.875rem}
        .ch-left{display:flex;align-items:flex-start;gap:12px}
        .ch-icon{width:40px;height:40px;border-radius:var(--r-md);background:var(--teal-bg);border:1px solid rgba(0,212,160,0.2);display:flex;align-items:center;justify-content:center;font-family:var(--font-d);font-weight:700;font-size:14px;color:var(--teal);flex-shrink:0}
        .ch-name{font-family:var(--font-d);font-size:18px;font-weight:700;color:var(--t1);display:flex;align-items:center;gap:8px}
        .ch-ticker{font-family:var(--font-m);font-size:12px;color:var(--teal);background:var(--teal-bg);border:1px solid rgba(0,212,160,0.2);padding:2px 8px;border-radius:99px}
        .ch-cat{font-size:12px;color:var(--t2);margin-top:3px;font-family:var(--font-m)}
        .ch-right{display:flex;align-items:center;gap:10px}
        .star-btn{background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3);padding:4px;transition:color .15s}
        .star-btn.active,.star-btn:hover{color:var(--amber)}
        .ch-badges{display:flex;gap:6px;flex-wrap:wrap}
        .ch-meta{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)}
        .meta-item .meta-label{font-size:10px;color:var(--t3);font-family:var(--font-m);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}
        .meta-item .meta-val{font-size:12px;color:var(--t1);font-weight:500}

        /* Subtabs */
        .subtabs{display:flex;gap:0;margin-bottom:1.25rem;border-bottom:1px solid var(--border)}
        .subtab{padding:8px 18px;font-size:12px;font-weight:500;color:var(--t2);cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;transition:all .15s;font-family:var(--font-b);margin-bottom:-1px}
        .subtab.active{color:var(--teal);border-bottom-color:var(--teal)}
        .subtab:hover{color:var(--t1)}

        /* Info cards (Überblick) */
        .info-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.1rem 1.25rem}
        .info-card-title{font-size:10px;color:var(--t3);font-family:var(--font-m);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.625rem}
        .info-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border)}
        .info-row:last-child{border-bottom:none}
        .info-key{font-size:12px;color:var(--t2)}
        .info-val{font-size:12px;color:var(--t1);font-weight:500;text-align:right;font-family:var(--font-m)}
        .news-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.1rem 1.25rem}
        .news-item{padding:8px 0;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:3px}
        .news-item:last-child{border-bottom:none}
        .news-date{font-size:10px;color:var(--t3);font-family:var(--font-m)}
        .news-title{font-size:12px;color:var(--t1)}
        .news-src{font-size:10px;color:var(--teal)}

        /* Ownership */
        .ownership-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .own-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.1rem 1.25rem}
        .own-title{font-size:10px;color:var(--t3);font-family:var(--font-m);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.75rem}

        /* Fundamentals */
        .fund-tile{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-md);padding:.875rem 1rem}
        .fund-tile-label{font-size:10px;color:var(--t3);font-family:var(--font-m);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
        .fund-tile-val{font-size:18px;font-weight:600;font-family:var(--font-d);color:var(--t1)}
        .fund-tile-sub{font-size:10px;color:var(--t3);margin-top:2px}
        .funding-timeline{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.1rem 1.25rem}
        .tl-title{font-size:10px;color:var(--t3);font-family:var(--font-m);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.875rem}
        .tl-row{display:flex;align-items:center;gap:12px;padding:7px 0;border-bottom:1px solid var(--border)}
        .tl-row:last-child{border-bottom:none}
        .tl-dot{width:8px;height:8px;border-radius:50%;background:var(--teal);flex-shrink:0}
        .tl-round{font-size:12px;color:var(--t1);font-weight:500;min-width:80px}
        .tl-amount{font-family:var(--font-m);font-size:12px;color:var(--teal);min-width:80px}
        .tl-date{font-size:11px;color:var(--t3);font-family:var(--font-m);margin-left:auto}

        /* Investitionspfad */
        .pfad-card{background:var(--bg-card);border:1px solid var(--border-md);border-radius:var(--r-lg);padding:1.25rem;margin-bottom:.875rem}
        .pfad-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}
        .pfad-title{font-family:var(--font-m);font-size:14px;font-weight:500;color:var(--t1)}
        .scoring-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:1rem}
        .score-tile{background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--r-md);padding:.875rem 1rem}
        .score-tile-label{font-size:10px;color:var(--t3);font-family:var(--font-m);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
        .score-tile-val{font-size:22px;font-weight:700;font-family:var(--font-d)}
        .score-tile-desc{font-size:11px;color:var(--t2);margin-top:4px}
        .verdict{background:rgba(0,212,160,0.06);border:1px solid rgba(0,212,160,0.2);border-radius:var(--r-md);padding:.875rem 1.1rem;display:flex;align-items:center;justify-content:space-between}
        .verdict-label{font-size:11px;color:var(--t2);font-family:var(--font-m);text-transform:uppercase;letter-spacing:.06em}
        .verdict-val{font-family:var(--font-d);font-size:14px;font-weight:700}

        /* Watchlist */
        .watchlist-wrap{padding-top:1.5rem;width:100%}
        .wl-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}
        .wl-title{font-family:var(--font-d);font-size:16px;font-weight:600;color:var(--t1);display:flex;align-items:center;gap:8px}
        .wl-count{font-size:12px;color:var(--t3);font-family:var(--font-m)}
        .filter-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:1rem;padding:.625rem 1rem;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-md)}
        .filter-bar label{font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;font-family:var(--font-m);white-space:nowrap}
        .filter-bar select{background:var(--bg);border:1px solid var(--border-md);border-radius:var(--r-sm);color:var(--t1);font-size:11px;padding:3px 7px;height:26px;font-family:var(--font-b);outline:none}
        .filter-bar input{background:var(--bg);border:1px solid var(--border-md);border-radius:var(--r-sm);color:var(--t1);font-size:11px;padding:3px 10px;height:26px;font-family:var(--font-b);outline:none;flex:1;min-width:120px}
        .filter-bar input::placeholder{color:var(--t3)}
        .tbl-wrap{border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;width:100%}
        .tbl-scroll{overflow-x:auto;width:100%}
        table{width:100%;border-collapse:collapse;font-size:12px}
        thead th{background:#0F1215;font-family:var(--font-m);font-size:10px;font-weight:500;color:var(--t3);text-align:left;padding:8px 12px;border-bottom:1px solid var(--border);white-space:nowrap;text-transform:uppercase;letter-spacing:.06em;position:relative;cursor:default}
        thead th[data-tip]:hover::after{content:attr(data-tip);position:absolute;top:100%;left:0;background:#1F2530;color:var(--t2);font-size:10px;padding:5px 9px;border-radius:var(--r-sm);white-space:nowrap;z-index:50;border:1px solid var(--border-md);pointer-events:none;font-family:var(--font-b);text-transform:none;letter-spacing:0;margin-top:2px}
        tbody tr{border-bottom:1px solid var(--border);transition:background .1s}
        tbody tr:last-child{border-bottom:none}
        tbody tr:hover{background:var(--bg-hover)}
        tbody td{padding:7px 12px;vertical-align:middle}
        .td-name{font-weight:600;font-size:12px;white-space:nowrap;color:var(--t1);cursor:pointer}
        .td-name:hover{color:var(--teal)}
        .td-muted{color:var(--t2);font-size:11px}
        .td-mono{font-family:var(--font-m);font-size:11px;color:var(--t2)}
      `}</style>

      {/* ── Nav ── */}
      <nav>
        <div className="nav-logo" onClick={() => { setSelectedCompany(null); setNavTab('research'); }}>
          <div className="nav-logo-icon">A</div>
          <div>
            <div className="nav-logo-text">Argo Analytics</div>
            <div className="nav-logo-sub">Investment Intelligence</div>
          </div>
        </div>
        <div className="nav-tabs">
          <button
            className={`nav-tab${navTab === 'research' ? ' active' : ''}`}
            onClick={() => setNavTab('research')}
          >
            Research
          </button>
          <button
            className={`nav-tab${navTab === 'watchlist' ? ' active' : ''}`}
            onClick={() => setNavTab('watchlist')}
          >
            Watchlist
          </button>
        </div>
        <div className="nav-status">
          <div className="status-dot" />
          Live · {companies.length} Companies
        </div>
      </nav>

      {/* ── Research Page ── */}
      {navTab === 'research' && (
        <div className="page">
          {!selectedCompany ? (
            <HeroState companies={companies} onSelect={handleSelectCompany} />
          ) : (
            <ResultState
              company={selectedCompany}
              buyers={analysisResult}
              onBack={handleBack}
            />
          )}
        </div>
      )}

      {/* ── Watchlist Page ── */}
      {navTab === 'watchlist' && (
        <div className="page">
          <WatchlistPage
            companies={companies}
            onSelectCompany={handleSelectFromWatchlist}
          />
        </div>
      )}
    </>
  );
}
