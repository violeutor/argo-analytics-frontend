'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ROOT_VARS, FONT_IMPORT } from '@/lib/tokens';
import MarketingLanding from '@/components/MarketingLanding';
import LoginOnboarding from '@/components/LoginOnboarding';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Company {
  id?: string; // WATCHLIST-01: Supabase company_id für watchlistIds-Filter
  name: string;
  category: string;
  industry?: string;
  ipo_potential?: string;
  ipo_status?: string;
  investment_path: string;
  proxy?: string;
  rating?: string;
  funding?: string;
  last_signal?: string;
  source?: string;
  // Legacy (nicht mehr angezeigt, bleibt für Rückwärtskompatibilität)
  potential?: string;
  risk?: string;
}

interface Buyer {
  name: string;
  ticker: string;
  exchange: string;
  market_cap?: number;
}

interface Notification {
  id: string;
  company_name: string;
  event_type: string;
  raw_title: string;
  direction: string;   // 'positive' | 'negative' | 'neutral'
  relevance_score: number;
  event_date: string;
  source_url?: string;
  signal_category?: string;
}

// DISAMBIG-03: Entity-Resolution-Response (Backend /api/v1/resolve, Wikidata-first)
interface ResolveCandidate {
  wikidata_id: string;
  name: string;
  legal_name?: string | null;
  display_name?: string | null;
  is_listed: boolean;
  is_subsidiary?: boolean;
  parent_name?: string | null;
  ticker?: string | null;
  exchange_label?: string | null;
  display_exchange?: string | null;
  headquarters?: string | null;
  founded_year?: string | null;
  // DISAMBIG-03 Lifecycle
  lifecycle_status?: string;
  consolidated_into?: string | null;     // Anzeigename der überlebenden Einheit
  consolidated_into_id?: string | null;  // Wikidata-QID
  dissolved_year?: number | null;
}

interface ResolveResponse {
  query: string;
  show_modal: boolean;
  resolved_name?: string | null;
  resolved_is_listed?: boolean | null;
  resolved_wikidata_id?: string | null;
  resolved_ticker?: string | null;
  resolved_exchange?: string | null;
  resolved_isin?: string | null;
  resolved_composite_figi?: string | null;
  // DISAMBIG-03 Lifecycle
  resolved_lifecycle_status?: string | null;
  resolved_consolidated_into?: string | null;
  resolved_consolidated_into_id?: string | null;
  resolved_dissolved_year?: number | null;
  // REGION-CLASS-01: Wikidata P159 (headquarters) — für region-Ableitung im Backend-Insert
  resolved_headquarters?: string | null;
  candidates: ResolveCandidate[];
  reason: string;
}







// ─── Constants ───────────────────────────────────────────────────────────────

const BACKEND_PROXY = '/api/backend';



const PATH_COLOR: Record<string, string> = {
  'IPO': 'var(--blue)',
  'Käufer-Proxy': 'var(--teal)',
  'ETF-Proxy': 'var(--amber)',
  'Enabler': 'var(--purple)',
  'Beobachten': 'var(--t2)',
  'Archiv': 'var(--red)',
};

// ─── API helpers ─────────────────────────────────────────────────────────────

async function fetchCompanies(): Promise<Company[]> {
  // limit=500 — Backend erlaubt le=500. Hebt den 100er-Default auf, damit
  // Nav-Zähler, Suche und Watchlist-Filter den vollen Pool sehen.
  // (Pool > 500 → serverseitige Suche/Pagination nötig, Phase 2.)
  const res = await fetch(`${BACKEND_PROXY}/api/v1/companies?limit=500`);
  if (!res.ok) return [];
  return res.json();
}

async function fetchNotifications(): Promise<Notification[]> {
  // Session 55: Keine Namensliste mehr — Backend liefert global die neuesten
  // Signals über alle Companies. Behebt 50er-alphabetisch-Cap + URL-Bombe.
  try {
    const params = new URLSearchParams();
    params.set('days', '7');
    params.set('min_score', '0.5');
    const res = await fetch(`${BACKEND_PROXY}/api/v1/notifications?${params}`);
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

const NOTIFICATION_LS_KEY = 'argo_notif_seen_v1';

function getSeenIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(NOTIFICATION_LS_KEY) || '[]')); }
  catch { return new Set(); }
}

function markSeen(ids: string[]): void {
  try {
    const seen = getSeenIds();
    ids.forEach(id => seen.add(id));
    localStorage.setItem(NOTIFICATION_LS_KEY, JSON.stringify(Array.from(seen)));
  } catch {}
}



const RATING_LABEL: Record<string, string> = {
  A: 'A · No-Brainer',
  B: 'B · Solide',
  C: 'C · Abwägen',
  D: 'D · Uninteressant',
};

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


// ─── Subtab components ───────────────────────────────────────────────────────





// ─── Result State ────────────────────────────────────────────────────────────

type SubTab = 'uberblick' | 'ownership' | 'fundamentals' | 'investitionspfad';

// ─── Hero / Search State ─────────────────────────────────────────────────────

function HeroState({
  companies,
  onSelect,
  notifications = [],
}: {
  companies: Company[];
  onSelect: (c: Company) => void;
  notifications?: Notification[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Company[]>([]);
  const [popular, setPopular] = useState<{ name: string; count: number }[]>([]);
  // DISAMBIG-01 / R25: Entity-Resolution-Modal im Cold-Path
  const [disambig, setDisambig] = useState<{
    candidates: ResolveCandidate[];
  } | null>(null);
  const [resolving, setResolving] = useState(false);

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

  const matchesQuery = (c: Company, q: string) => {
    const ql = q.toLowerCase();
    return (
      c.name.toLowerCase().includes(ql) ||
      (c.proxy ?? '').toLowerCase().includes(ql)
    );
  };

  const handleInput = (v: string) => {
    setQuery(v);
    if (v.length < 2) { setSuggestions([]); return; }
    setSuggestions(companies.filter((c) => matchesQuery(c, v)).slice(0, 6));
  };

  const handleSelect = (c: Company) => {
    const raw = localStorage.getItem('argo_access_counts');
    const counts: Record<string, number> = raw ? JSON.parse(raw) : {};
    counts[c.name] = (counts[c.name] ?? 0) + 1;
    localStorage.setItem('argo_access_counts', JSON.stringify(counts));
    onSelect(c);
  };

  // Navigiert zur Result-Seite. Kanonischer Name + optional ISIN/Ticker/Exchange + is_listed aus /resolve.
  const goToCompany = (
    companyName: string,
    isin?: string | null,
    ticker?: string | null,
    exchange?: string | null,
    compositeFigi?: string | null,
    isListed?: boolean | null,
    lifecycleStatus?: string | null,
    consolidatedIntoId?: string | null,
    consolidatedIntoName?: string | null,
    dissolvedYear?: number | null,
    hq?: string | null,
  ) => {
    const isinParam = isin ? `&isin=${encodeURIComponent(isin)}` : '';
    const tickerParam = ticker ? `&ticker=${encodeURIComponent(ticker)}` : '';
    const exchangeParam = exchange ? `&exchange=${encodeURIComponent(exchange)}` : '';
    const compositeFigiParam = compositeFigi ? `&composite_figi=${encodeURIComponent(compositeFigi)}` : '';
    // DISAMBIG-03: is_listed nur weitergeben wenn explizit bekannt (true/false).
    // null/undefined → Param weglassen, Backend-Heuristik entscheidet.
    const isListedParam = (isListed === true || isListed === false) ? `&is_listed=${isListed}` : '';
    // DISAMBIG-03 Lifecycle: nur bei nicht-aktiven Entitäten mitgeben (active = DB-Default).
    const lifecycleParam = (lifecycleStatus && lifecycleStatus !== 'active') ? `&lifecycle_status=${encodeURIComponent(lifecycleStatus)}` : '';
    const consolIdParam  = consolidatedIntoId   ? `&consolidated_into_id=${encodeURIComponent(consolidatedIntoId)}`     : '';
    const consolNmParam  = consolidatedIntoName ? `&consolidated_into_name=${encodeURIComponent(consolidatedIntoName)}` : '';
    const dissolvedParam = dissolvedYear        ? `&dissolved_year=${dissolvedYear}`                                     : '';
    // REGION-CLASS-01: headquarters für sofortige region-Ableitung im Cold-Path-Insert.
    const hqParam = hq ? `&headquarters=${encodeURIComponent(hq)}` : '';
    router.push(`/company/${encodeURIComponent(companyName)}?from=research&back=/?tab=research${isinParam}${tickerParam}${exchangeParam}${compositeFigiParam}${isListedParam}${lifecycleParam}${consolIdParam}${consolNmParam}${dissolvedParam}${hqParam}`);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    const q = query.trim();
    // Warm-Path: lokaler DB-Spiegel-Treffer → direkt, KEIN GLEIF-Call (R1-Schutz).
    const match =
      companies.find((c) => c.name.toLowerCase() === q.toLowerCase()) ??
      companies.find((c) => matchesQuery(c, q));
    if (match) {
      handleSelect(match);
      return;
    }

    // Cold-Path: Entity-Resolution vor dem Anlegen. Klärt erst, WAS gesucht ist.
    setResolving(true);
    try {
      const res = await fetch(`${BACKEND_PROXY}/api/v1/resolve/${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(`resolve ${res.status}`);
      const r: ResolveResponse = await res.json();
      if (r.show_modal && r.candidates.length > 0) {
        // Mehrere Treffer → Auswahl-Modal.
        setDisambig({ candidates: r.candidates });
      } else {
        // Eindeutig oder kein Treffer → direkt weiter.
        goToCompany(r.resolved_name || q, r.resolved_isin, r.resolved_ticker, r.resolved_exchange, r.resolved_composite_figi, r.resolved_is_listed, r.resolved_lifecycle_status, r.resolved_consolidated_into_id, r.resolved_consolidated_into, r.resolved_dissolved_year, r.resolved_headquarters);
      }
    } catch {
      // Resolver/Netz-Fehler darf One-Click nicht brechen → bestehender Flow.
      goToCompany(q, null);
    } finally {
      setResolving(false);
    }
  };

  // Modal-Auswahl: User hat eine Entität gewählt.
  // Name = display_name (Legal Name aus Wikidata P1448), Fallback User-Input.
  // Ticker/Exchange aus Wikidata, is_listed direkt aus P414 → kein Backend-Guess.
  const handleDisambigPick = (c: ResolveCandidate) => {
    const navName = c.display_name || c.legal_name || query.trim();
    const tickerParam = c.ticker ? `&ticker=${encodeURIComponent(c.ticker)}` : '';
    const venue = c.display_exchange || null;
    const exchangeParam = venue ? `&exchange=${encodeURIComponent(venue)}` : '';
    // DISAMBIG-03: is_listed + Lifecycle direkt aus User-Wahl (Wikidata).
    // Der Kern: User wählt "Bayer CropScience GmbH" → is_listed=false, lifecycle=acquired.
    const isListedParam  = `&is_listed=${c.is_listed}`;
    const lifecycleParam = (c.lifecycle_status && c.lifecycle_status !== 'active') ? `&lifecycle_status=${encodeURIComponent(c.lifecycle_status)}` : '';
    const consolIdParam  = c.consolidated_into_id ? `&consolidated_into_id=${encodeURIComponent(c.consolidated_into_id)}`   : '';
    const consolNmParam  = c.consolidated_into    ? `&consolidated_into_name=${encodeURIComponent(c.consolidated_into)}`    : '';
    const dissolvedParam = c.dissolved_year       ? `&dissolved_year=${c.dissolved_year}`                                   : '';
    // REGION-CLASS-01: headquarters aus Wikidata-Kandidat für sofortige region-Ableitung.
    const hqParam = c.headquarters ? `&headquarters=${encodeURIComponent(c.headquarters)}` : '';
    router.push(`/company/${encodeURIComponent(navName)}?from=research&back=/?tab=research${tickerParam}${exchangeParam}${isListedParam}${lifecycleParam}${consolIdParam}${consolNmParam}${dissolvedParam}${hqParam}`);
    setDisambig(null);
  };

  const SECTORS = [
    {name:'Climate Tech', cc:'var(--emerald)'}, {name:'Fintech', cc:'var(--teal)'},
    {name:'Enterprise Software', cc:'var(--blue)'}, {name:'Biotech & Pharma', cc:'var(--purple)'},
    {name:'Space & Defense', cc:'var(--indigo)'}, {name:'Energy Transition', cc:'var(--amber)'},
    {name:'Health Tech', cc:'var(--rose)'}, {name:'Deep Tech', cc:'var(--teal-g)'},
  ];

  return (
    <div className="r-page">
      <div className="bg-grid" />
      <div className="r-wrap">

        {/* ── Hero Row: Suche links + Zuletzt rechts ── */}
        <div className="r-hero-row">
          <div className="r-search-block">
            <div className="r-eyebrow">// Private Market Intelligence · Public Market Edge</div>
            <h1 className="r-h1">Sieh, wer profitiert —<br/><span>bevor es der Markt tut.</span></h1>
            <div style={{ position: 'relative' }}>
              <div className="r-search-wrap">
                <input
                  type="text"
                  placeholder="Unternehmen oder Ticker… (z.B. CarbonCure, NEE, BAYN)"
                  value={query}
                  onChange={(e) => handleInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button className="btn-primary" onClick={handleSearch} disabled={resolving}>
                  {resolving ? 'Prüfe…' : 'Analysieren →'}
                </button>
              </div>
              {suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6,
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 12, zIndex: 50, overflow: 'hidden',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  {suggestions.map((c) => (
                    <div
                      key={c.name}
                      onClick={() => handleSelect(c)}
                      style={{
                        padding: '10px 16px', cursor: 'pointer', fontSize: 13,
                        borderBottom: '1px solid var(--border)', display: 'flex',
                        alignItems: 'center', justifyContent: 'space-between',
                        transition: 'background .1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{c.name}</span>
                      <span style={{ color: 'var(--t3)', fontSize: 11, fontFamily: 'var(--font-m)' }}>{c.category}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Zuletzt aufgerufen — jetzt oben rechts neben Suche */}
          <div className="card">
            <div className="sec-h">Zuletzt aufgerufen</div>
            {popular.map((p, i) => {
              const company = companies.find(c => c.name === p.name);
              const dotColors = ['var(--emerald)','var(--teal)','var(--blue)','var(--purple)','var(--amber)'];
              return (
                <div key={p.name} className="trend-row" onClick={() => company && onSelect(company)}>
                  <span className="trend-dot" style={{ background: dotColors[i % dotColors.length] }} />
                  <div className="trend-nm">
                    <div className="trend-n">{p.name}</div>
                    <div className="trend-s">{company?.industry || company?.category || '—'}</div>
                  </div>
                  <div className="trend-sc">{company?.rating || '—'}</div>
                </div>
              );
            })}
            {popular.length === 0 && (
              <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>
                Noch keine Aufrufe
              </div>
            )}
          </div>
        </div>

        {/* ── Stat Strip ── */}
        <div className="stat-strip">
          <div className="stat">
            <div className="stat-lbl">Companies tracked</div>
            <div className="stat-val">{companies.length}</div>
            <div className="stat-delta">live · rolling refresh</div>
          </div>
          <div className="stat">
            <div className="stat-lbl">Sektoren live</div>
            <div className="stat-val cyan">14</div>
            <div className="stat-delta">Taxonomy v1.0</div>
          </div>
          <div className="stat">
            <div className="stat-lbl">Signals · geladen</div>
            <div className="stat-val amber">{notifications.length}</div>
            <div className="stat-delta">Market Events</div>
          </div>
          <div className="stat">
            <div className="stat-lbl">Top-Picks (≥ A)</div>
            <div className="stat-val emerald">
              {companies.filter(c => c.rating?.startsWith('A') || c.rating === 'STRONG').length}
            </div>
            <div className="stat-delta">höchste Rating-Klasse</div>
          </div>
        </div>

        {/* ── Live Signals (voll breit) ── */}
        <div className="card" style={{ marginBottom: 48 }}>
          <div className="sec-h">
            Live Signals <span className="count">// was sich heute bewegt</span>
            <span className="more" onClick={() => router.push('/?tab=watchlist')}>Alle →</span>
          </div>
          {notifications.slice(0, 6).map((n) => (
            <div key={n.id} className="signal-row">
              <div className={`sig-ic ${n.direction === 'positive' ? 'pos' : n.direction === 'negative' ? 'neg' : 'neu'}`}>
                {n.direction === 'positive' ? '▲' : n.direction === 'negative' ? '▼' : '●'}
              </div>
              <div className="sig-body">
                <div className="sig-co">{n.company_name}</div>
                <div className="sig-ev">{n.raw_title}</div>
              </div>
              <div className="sig-meta">{n.event_date}</div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>
              Signals werden geladen…
            </div>
          )}
        </div>

        {/* ── Sektor-Grid ── */}
        <div className="sec-h" style={{ marginBottom: 16 }}>
          Sektoren erkunden
          <span className="count">// 14 live · Taxonomy v1.0</span>
          <span className="more" onClick={() => router.push('/?tab=explore')}>Explore öffnen →</span>
        </div>
        <div className="sec-grid-board">
          {SECTORS.map((s) => {
            const key0 = s.name.toLowerCase().split(' ')[0];
            const cnt = companies.filter(c =>
              c.industry?.toLowerCase().includes(key0) ||
              c.category?.toLowerCase().includes(key0)
            ).length;
            return (
              <div key={s.name} className="sec-cell"
                style={{'--cc': s.cc} as React.CSSProperties}
                onClick={() => router.push('/?tab=explore')}>
                <div className="sec-top">
                  <span className="sec-dot" />
                  <span className="sec-arrow">→</span>
                </div>
                <h4 className="sec-h4">{s.name}</h4>
                <div className="sec-cnt"><b>{cnt || '—'}</b> Companies</div>
              </div>
            );
          })}
        </div>

      </div>

      {/* ── Disambig-Modal (bleibt position:fixed) ── */}
      {disambig && (() => {
        const renderRow = (c: ResolveCandidate) => (
          <div
            key={c.wikidata_id || c.name}
            onClick={() => handleDisambigPick(c)}
            style={{
              padding: '11px 14px', cursor: 'pointer',
              border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, transition: 'background .1s, border-color .1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.borderColor = 'var(--border-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ color: 'var(--t1)', fontWeight: 500, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.display_name || c.legal_name || c.name}
              </div>
              <div style={{ color: 'var(--t3)', fontSize: 11, marginTop: 2 }}>
                {c.is_subsidiary && c.parent_name
                  ? `Tochter von ${c.parent_name}`
                  : [c.ticker, c.display_exchange, c.headquarters].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>
            {(() => {
              const LC: Record<string, { label: string; color: string; bg: string }> = {
                acquired: { label: 'Aufgegangen', color: 'var(--amber, #F59E0B)', bg: 'rgba(240,165,0,0.10)' },
                delisted: { label: 'Delisted',    color: 'var(--t3)',             bg: 'var(--bg-hover)' },
                defunct:  { label: 'Aufgelöst',   color: 'var(--red, #EF4444)',   bg: 'rgba(240,69,69,0.10)' },
              };
              const lc = c.lifecycle_status && c.lifecycle_status !== 'active' ? LC[c.lifecycle_status] : null;
              const label  = c.is_listed ? 'Börsennotiert' : (lc?.label ?? 'Privat');
              const color  = c.is_listed ? 'var(--accent, #5aa0ff)' : (lc?.color ?? 'var(--t3)');
              const bg     = c.is_listed ? 'var(--accent-soft, rgba(80,160,255,0.12))' : (lc?.bg ?? 'var(--bg-hover)');
              const border = c.is_listed ? 'var(--accent, #5aa0ff)' : (lc?.color ?? 'var(--border)');
              return (
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 'var(--r-sm)', whiteSpace: 'nowrap',
                  background: bg, color, border: `1px solid ${border}`,
                }}>
                  {label}
                </span>
              );
            })()}
          </div>
        );
        return (
          <div
            onClick={() => setDisambig(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.55)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border-md)',
                borderRadius: 'var(--r-lg)', maxWidth: 480, width: '100%',
                padding: '20px 22px', boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                maxHeight: '80vh', overflowY: 'auto',
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 }}>
                Welches Unternehmen meinst du?
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 16 }}>
                Mehrere Treffer für „{query.trim()}". Bitte präzisieren.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {disambig.candidates.map(renderRow)}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--t3)', marginTop: 12, padding: '8px 10px', background: 'var(--bg-hover)', borderRadius: 'var(--r-md)', lineHeight: 1.5 }}>
                Gesuchte Tochter nicht dabei? Vollständige Firmierung eingeben (z.&nbsp;B. „Bayer CropScience GmbH").
              </div>
              <div
                onClick={() => { setDisambig(null); goToCompany(query.trim(), null); }}
                style={{ marginTop: 14, fontSize: 12, color: 'var(--t3)', cursor: 'pointer', textAlign: 'center', padding: '6px' }}
              >
                Keine davon — trotzdem mit „{query.trim()}" suchen
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
// ─── Auth ─────────────────────────────────────────────────────────────────────

function LoginModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    setLoading(true); setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-md)',
        borderRadius: 14, padding: '28px 32px', width: 360,
        boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: 'var(--font-d)', fontWeight: 700, fontSize: 18, color: 'var(--t1)', marginBottom: 6 }}>
          Anmelden
        </div>
        <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 22 }}>
          Argo Analytics · Investment Intelligence
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email" placeholder="E-Mail" value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{
              background: 'var(--bg)', border: '1px solid var(--border-md)',
              borderRadius: 8, padding: '9px 12px', color: 'var(--t1)',
              fontSize: 13, fontFamily: 'var(--font-b)', outline: 'none',
            }}
          />
          <input
            type="password" placeholder="Passwort" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{
              background: 'var(--bg)', border: '1px solid var(--border-md)',
              borderRadius: 8, padding: '9px 12px', color: 'var(--t1)',
              fontSize: 13, fontFamily: 'var(--font-b)', outline: 'none',
            }}
          />
          {error && (
            <div style={{ fontSize: 12, color: 'var(--red)', padding: '6px 10px', background: 'var(--red-bg)', borderRadius: 6 }}>
              {error}
            </div>
          )}
          <button
            onClick={handleSubmit} disabled={loading}
            className="btn-primary"
            style={{ marginTop: 4, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Anmelden…' : 'Anmelden'}
          </button>
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
  const [filterPfad, setFilterPfad] = useState('');
  const [filterRate, setFilterRate] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterIpoStatus, setFilterIpoStatus] = useState('');
  const [search, setSearch] = useState('');

  const industries  = Array.from(new Set(companies.map((c) => c.industry).filter(Boolean))).sort() as string[];
  const categories  = Array.from(new Set(companies.map((c) => c.category).filter(Boolean))).sort() as string[];

  const filtered = companies.filter((c) => {
    if (filterPfad && c.investment_path !== filterPfad) return false;
    if (filterRate && c.rating !== filterRate) return false;
    if (filterIndustry && c.industry !== filterIndustry) return false;
    if (filterCategory && c.category !== filterCategory) return false;
    if (filterIpoStatus) {
      const status = (c.ipo_status ?? '').toLowerCase();
      if (filterIpoStatus === 'listed' && status !== 'listed') return false;
      if (filterIpoStatus === 'private' && status === 'listed') return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!c.name.toLowerCase().includes(q) &&
          !c.category.toLowerCase().includes(q) &&
          !(c.industry ?? '').toLowerCase().includes(q) &&
          !(c.proxy ?? '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Export
  const doExport = (fmt: 'csv' | 'json') => {
    const slug = `argo_watchlist_${new Date().toISOString().slice(0,10)}`;
    if (fmt === 'json') {
      const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${slug}.json`; a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['Name','Sektor','Kategorie','Wertung','Inv.-Pfad','Proxy','IPO-Potenzial','Funding','Letztes Signal'];
      const rows = filtered.map(c => [
        c.name, c.industry ?? '', c.category ?? '', c.rating ?? '',
        c.investment_path ?? '', c.proxy ?? '', c.ipo_potential ?? '',
        c.funding?.split(';')[0]?.trim() ?? '', c.last_signal ?? '',
      ]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${slug}.csv`; a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="watchlist-wrap">
      <div className="wl-header">
        <div className="wl-title">
          <span style={{ width: 3, height: 18, background: 'var(--teal)', borderRadius: 2, display: 'inline-block' }} />
          Watchlist <span className="wl-count">({filtered.length})</span>
        </div>
      </div>

      <div className="filter-bar">
        <label>Sektor</label>
        <select value={filterIndustry} onChange={(e) => setFilterIndustry(e.target.value)}>
          <option value="">Alle</option>
          {industries.map((ind) => <option key={ind}>{ind}</option>)}
        </select>
        <label>Kategorie</label>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">Alle</option>
          {categories.map((cat) => <option key={cat}>{cat}</option>)}
        </select>
        <label>Status</label>
        <select value={filterIpoStatus} onChange={(e) => setFilterIpoStatus(e.target.value)}>
          <option value="">Alle</option>
          <option value="listed">Public</option>
          <option value="private">Private</option>
        </select>
        <label>Pfad</label>
        <select value={filterPfad} onChange={(e) => setFilterPfad(e.target.value)}>
          <option value="">Alle</option>
          <option>Käufer-Proxy</option><option>IPO</option><option>ETF-Proxy</option>
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
        <input
          type="text"
          placeholder="Suche…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 160 }}
        />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={() => doExport('csv')} className="btn-export" title={`${filtered.length} Companies als CSV`}>
            ↓ CSV
          </button>
          <button onClick={() => doExport('json')} className="btn-export" title={`${filtered.length} Companies als JSON`}>
            ↓ JSON
          </button>
        </div>
      </div>

      <div className="tbl-wrap">
        <div className="tbl-scroll">
          <table>
            <thead>
              <tr>
                <th data-tip="Unternehmensname">Unternehmen</th>
                <th data-tip="Industriesektor">Sektor</th>
                <th data-tip="Technologie-Cluster">Kategorie</th>
                <th data-tip="Gesamtwertung nach Argo Score Engine">Wertung</th>
                <th data-tip="Empfohlener Investitionsansatz">Inv.-Pfad</th>
                <th data-tip="Börsennotierter Proxy-Titel">Proxy</th>
                <th data-tip="Wahrscheinlichkeit eines Börsengangs">IPO-Potenzial</th>
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
                  <td className="td-muted">{c.industry ?? '—'}</td>
                  <td className="td-muted">{c.category}</td>
                  <td><RatingBadge rating={c.rating ?? '—'} /></td>
                  <td><PathBadge path={c.investment_path} /></td>
                  <td className="td-mono">{c.proxy ?? '—'}</td>
                  <td><IpoBadge val={c.ipo_potential ?? '—'} /></td>
                  <td className="td-muted" style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.funding?.split(';')[0]?.trim() ?? '—'}
                  </td>
                  <td className="td-muted">{c.last_signal ?? '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--t3)', fontSize: 13 }}>
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

type NavTab = 'research' | 'watchlist' | 'explore';

function PageContent() {
  const router = useRouter();
  const searchParamsMain = useSearchParams();
  const [navTab, setNavTab] = useState<NavTab>(
    (searchParamsMain?.get("tab") as NavTab) ?? "research"
  );
  const [companies, setCompanies] = useState<Company[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // AUTH-01: Supabase session
  const [session, setSession] = useState<any>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  // WATCHLIST-01: company_ids aus Backend-Watchlist
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  // EXPLORE-01: personalisierter Feed
  const [exploreData, setExploreData] = useState<{
    companies: any[]; customer_type: string; sector_keys: string[]; total: number;
  } | null>(null);
  const [exploreLoading, setExploreLoading] = useState(false);

  useEffect(() => {
    fetchCompanies().then(setCompanies);
    setSeenIds(getSeenIds());
    // AUTH-01: aktuelle Session laden + Listener
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) setWatchlistIds(new Set());
      setExploreData(null); // bei Login/Logout Feed neu laden (personalisiert)
    });
    return () => subscription.unsubscribe();
  }, []);

  // Watchlist-IDs beim Tab-Wechsel laden (lazy — nur wenn Tab geöffnet wird)
  useEffect(() => {
    if (navTab !== 'watchlist') return;
    const headers: HeadersInit = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
    fetch(`${BACKEND_PROXY}/api/v1/watchlist`, { headers })
      .then(r => r.ok ? r.json() : { company_ids: [] })
      .then(d => setWatchlistIds(new Set(d.company_ids ?? [])))
      .catch(() => setWatchlistIds(new Set()));
  }, [navTab, session]);

  // EXPLORE-01: Feed beim Tab-Wechsel laden (lazy)
  useEffect(() => {
    if (navTab !== 'explore') return;
    if (exploreData) return; // bereits geladen (wird bei Session-Wechsel via onAuthStateChange genullt)
    setExploreLoading(true);
    const headers: HeadersInit = session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
    fetch(`${BACKEND_PROXY}/api/v1/explore`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setExploreData(d); })
      .catch(() => {})
      .finally(() => setExploreLoading(false));
  }, [navTab, exploreData, session]);

  // ── Notification Refresh-Logik ───────────────────────────────────────────────
  // Strategie: visibilitychange (min 15min Cooldown) + 30min Interval
  const notifLastFetch = useRef<number>(0);
  const NOTIF_COOLDOWN = 15 * 60 * 1000;   // 15 Minuten
  const NOTIF_INTERVAL = 30 * 60 * 1000;   // 30 Minuten

  const refreshNotifications = useCallback(() => {
    const now = Date.now();
    if (now - notifLastFetch.current < NOTIF_COOLDOWN) return;
    notifLastFetch.current = now;
    fetchNotifications().then(setNotifications);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialer Load beim Mount — Notifications sind global, nicht companies-abhängig
  useEffect(() => {
    notifLastFetch.current = 0;   // erstes Laden immer
    refreshNotifications();
  }, [refreshNotifications]);

  // visibilitychange — Refresh wenn Tab wieder aktiv wird
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshNotifications();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshNotifications]);

  // 30-Minuten-Interval als Backstop
  useEffect(() => {
    const id = window.setInterval(() => refreshNotifications(), NOTIF_INTERVAL);
    return () => window.clearInterval(id);
  }, [refreshNotifications]); // eslint-disable-line react-hooks/exhaustive-deps

  const unreadCount = notifications.filter(n => !seenIds.has(n.id)).length;

  const handleOpenNotif = () => setNotifOpen(o => !o);

  const handleRefreshNotif = () => {
    notifLastFetch.current = 0;   // Cooldown überspringen
    refreshNotifications();
  };

  const handleMarkAllRead = () => {
    const ids = notifications.map(n => n.id);
    markSeen(ids);
    setSeenIds(getSeenIds());
  };

  const handleSelectCompany = useCallback((company: Company) => {
    router.push(`/company/${encodeURIComponent(company.name)}?from=watchlist&back=/`);
  }, [router]);

  const handleSelectFromWatchlist = (c: Company) => {
    handleSelectCompany(c);
  };

  return (
    <>
      {/* ── Global Styles ── */}
      <style>{`
        ${FONT_IMPORT}
        *{box-sizing:border-box;margin:0;padding:0}
        :root{${ROOT_VARS} --violet:#A78BFA;--rose:#F472B6;--indigo:#818CF8;--teal-g:#2DD4BF;}
        body{background:var(--bg);color:var(--t1);font-family:var(--font-b);font-size:14px;min-height:100vh}

        /* ── Nav (Redesign S59) ── */
        nav{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 2rem;height:64px;border-bottom:1px solid var(--border);background:rgba(13,17,23,0.85);backdrop-filter:blur(14px);position:sticky;top:0;z-index:100}
        .nav-logo{display:flex;align-items:center;gap:10px;cursor:pointer}
        .nav-logo-icon{width:30px;height:30px;background:linear-gradient(135deg,var(--teal),var(--blue));border-radius:7px;display:flex;align-items:center;justify-content:center;font-family:var(--font-d);font-weight:900;font-size:14px;color:#0D1117;box-shadow:0 0 14px rgba(0,194,209,0.28)}
        .nav-logo-text{font-family:var(--font-d);font-weight:800;font-size:17px;letter-spacing:-0.02em;color:var(--t1)}
        .nav-logo-sub{font-size:10px;color:var(--t3);font-family:var(--font-m);letter-spacing:.05em;margin-top:3px;text-transform:uppercase}
        .nav-tabs{display:flex;justify-self:center}
        .nav-tab{padding:0 14px;height:64px;border:none;background:none;font-size:14px;font-weight:600;color:var(--t2);cursor:pointer;transition:color .2s;font-family:var(--font-b);letter-spacing:normal;text-transform:none;position:relative}
        .nav-tab.active{color:var(--t1)}
        .nav-tab.active::after{content:'';position:absolute;left:14px;right:14px;bottom:0;height:2px;background:var(--teal);box-shadow:0 0 10px var(--teal)}
        .nav-tab:not(.active):hover{color:var(--t1)}
        .nav-user-av{width:30px;height:30px;border-radius:50%;background:var(--bg-hover);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;color:var(--teal);font-family:var(--font-m);cursor:pointer}
        .nav-bell{width:36px;height:36px;border-radius:9px;background:var(--bg-card);border:1px solid var(--border);color:var(--t2);cursor:pointer;display:flex;align-items:center;justify-content:center;position:relative;transition:all .2s}
        .nav-bell:hover{border-color:var(--border-md);color:var(--t1)}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}

        /* ── Background Grid ── */
        .bg-grid{position:fixed;inset:0;z-index:0;pointer-events:none;background-image:linear-gradient(rgba(0,194,209,0.045) 1px,transparent 1px),linear-gradient(90deg,rgba(0,194,209,0.045) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse 110% 85% at 50% 0%,#000 55%,transparent 100%)}

        /* ── Pages ── */
        .page{padding:0 2rem 4rem;position:relative;z-index:1}
        .r-page{position:relative;z-index:1;padding-bottom:4rem}
        .r-wrap{max-width:1160px;margin:0 auto;padding:0 2rem;position:relative;z-index:1}

        /* ── Research: Search Block ── */
        .r-search-block{padding:0}
        .r-hero-row{display:grid;grid-template-columns:1.55fr 1fr;gap:32px;align-items:start;padding:calc(3rem + 10px) 0 2.25rem}
        .r-hero-row .card{margin-top:6px}
        .r-eyebrow{font-family:var(--font-m);font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--teal);margin-bottom:14px;opacity:.9}
        .r-h1{font-family:var(--font-d);font-weight:800;font-size:clamp(28px,4vw,46px);letter-spacing:-.03em;line-height:1.06;margin-bottom:70px;color:var(--t1)}
        .r-h1 span{color:var(--teal)}
        .r-search-wrap{display:flex;gap:12px;align-items:center}
        .r-search-wrap input{flex:1;background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:18px 22px;color:var(--t1);font-family:var(--font-b);font-size:16px;outline:none;transition:border-color .2s,box-shadow .2s}
        .r-search-wrap input:focus{border-color:var(--teal);box-shadow:0 0 0 3px rgba(0,194,209,0.08)}
        .r-search-wrap input::placeholder{color:var(--t3)}
        .r-search-wrap .btn-primary{background:var(--teal);color:var(--bg);border:none;border-radius:14px;padding:18px 28px;font-family:var(--font-b);font-weight:700;font-size:15px;cursor:pointer;white-space:nowrap;transition:all .2s}
        .r-search-wrap .btn-primary:hover{background:#1ad0de;box-shadow:0 0 22px rgba(0,194,209,0.4)}
        .r-search-wrap .btn-primary:disabled{opacity:.5;cursor:not-allowed}

        /* ── Legacy Hero (noch für qa-chips etc.) ── */
        .hero{max-width:640px;margin:0 auto;padding:3.5rem 0 2rem;text-align:center}
        .hero-eyebrow{font-size:11px;color:var(--teal);letter-spacing:.1em;text-transform:uppercase;margin-bottom:1rem;opacity:.8}
        .hero h1{font-family:var(--font-d);font-size:40px;font-weight:700;line-height:1.15;letter-spacing:-.02em;color:var(--t1);margin-bottom:.75rem}
        .hero h1 span{color:var(--teal)}
        .hero-sub{font-size:15px;color:var(--t2);line-height:1.65;max-width:460px;margin:0 auto 1.75rem}
        .search-wrap{display:flex;gap:10px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:6px 6px 6px 14px;align-items:center}
        .search-wrap input{flex:1;background:none;border:none;outline:none;color:var(--t1);font-family:var(--font-b);font-size:14px}
        .search-wrap input::placeholder{color:var(--t3)}
        .btn-primary{background:var(--teal);color:#0D1117;font-family:var(--font-d);font-weight:600;font-size:13px;padding:9px 20px;border-radius:var(--r-md);border:none;cursor:pointer;white-space:nowrap}
        .qa-section{margin-top:.5rem}
        .qa-label{font-size:10px;color:var(--t3);letter-spacing:.07em;text-transform:uppercase;margin-bottom:.5rem;text-align:center}
        .qa-chips{display:flex;align-items:center;gap:6px;justify-content:center;flex-wrap:wrap}
        .qa-chip{background:var(--bg-card);border:1px solid var(--border);border-radius:99px;padding:5px 14px;font-size:12px;color:var(--t2);cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:5px}
        .qa-chip:hover{border-color:var(--teal);color:var(--teal)}
        .qa-chip-count{font-size:10px;color:var(--t3);background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:99px}

        /* ── Stat Strip ── */
        .stat-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:40px}
        .stat{background:var(--bg-card);border:1px solid var(--border);border-radius:13px;padding:18px 20px}
        .stat-lbl{font-family:var(--font-m);font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--t3);margin-bottom:9px}
        .stat-val{font-family:var(--font-d);font-weight:800;font-size:28px;letter-spacing:-.02em;line-height:1}
        .stat-val.cyan{color:var(--teal)}.stat-val.amber{color:var(--amber)}.stat-val.emerald{color:var(--emerald)}
        .stat-delta{font-family:var(--font-m);font-size:11px;margin-top:8px;color:var(--t3)}
        .stat-delta.up{color:var(--emerald)}

        /* ── R-Grid: 2 Spalten ── */
        .r-grid{display:grid;grid-template-columns:1.5fr 1fr;gap:24px;align-items:start;margin-bottom:48px}
        .card{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:22px}
        .sec-h{font-family:var(--font-d);font-weight:700;font-size:16px;letter-spacing:-.01em;display:flex;align-items:center;gap:10px;margin-bottom:16px}
        .sec-h .count{font-family:var(--font-m);font-size:11px;color:var(--t3);font-weight:400}
        .sec-h .more{margin-left:auto;font-family:var(--font-b);font-size:12px;color:var(--t2);cursor:pointer;font-weight:600;transition:color .15s}
        .sec-h .more:hover{color:var(--teal)}
        .signal-row{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)}
        .signal-row:last-child{border-bottom:none}
        .sig-ic{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;margin-top:1px}
        .sig-ic.pos{background:rgba(16,185,129,0.12);color:var(--emerald)}
        .sig-ic.neg{background:rgba(239,68,68,0.12);color:var(--red)}
        .sig-ic.neu{background:rgba(139,148,158,0.12);color:var(--t2)}
        .sig-body{flex:1;min-width:0}
        .sig-co{font-weight:600;font-size:13px;color:var(--t1)}
        .sig-ev{font-size:12px;color:var(--t2);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .sig-meta{font-family:var(--font-m);font-size:10px;color:var(--t3);white-space:nowrap;padding-top:2px}
        .trend-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);cursor:pointer;transition:background .1s}
        .trend-row:last-child{border-bottom:none}
        .trend-row:hover .trend-n{color:var(--teal)}
        .trend-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0}
        .trend-nm{flex:1;min-width:0}
        .trend-n{font-size:13px;font-weight:600;color:var(--t1);transition:color .15s}
        .trend-s{font-size:11px;color:var(--t3);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .trend-sc{font-family:var(--font-m);font-size:11px;color:var(--t2)}

        /* ── Sektor-Grid ── */
        .sec-grid-board{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:16px;overflow:hidden;margin-bottom:48px}
        .sec-cell{background:var(--bg);padding:22px;cursor:pointer;transition:background .22s;position:relative}
        .sec-cell:hover{background:var(--bg-hover)}
        .sec-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
        .sec-dot{width:10px;height:10px;border-radius:50%;background:var(--cc);box-shadow:0 0 10px var(--cc)}
        .sec-arrow{color:var(--t3);font-size:13px;transition:transform .2s,color .2s}
        .sec-cell:hover .sec-arrow{color:var(--cc);transform:translateX(3px)}
        .sec-h4{font-family:var(--font-d);font-weight:700;font-size:15px;letter-spacing:-.01em;margin-bottom:6px;color:var(--t1)}
        .sec-cnt{font-family:var(--font-m);font-size:11.5px;color:var(--t3)}
        .sec-cnt b{color:var(--t2);font-weight:600}

        /* ── Explore Cards ── */
        .ex-card-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:48px}
        .ex-card{background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:20px;cursor:pointer;transition:border-color .2s,box-shadow .2s;position:relative;overflow:hidden}
        .ex-card:hover{border-color:var(--cc,var(--border-md))}
        .ex-card.primary{grid-column:span 3;display:grid;grid-template-columns:1fr auto;align-items:center;gap:24px;background:linear-gradient(120deg,#15212b 0%,var(--bg-card) 60%);border-color:rgba(0,194,209,0.32)}
        .ex-card.primary:hover{box-shadow:0 0 40px rgba(0,194,209,0.12)}
        .ex-card.primary::after{content:'';position:absolute;top:-70px;right:-40px;width:280px;height:280px;background:radial-gradient(circle,rgba(0,194,209,0.16),transparent 70%);pointer-events:none}
        .toppick{font-family:var(--font-m);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--teal);margin-bottom:10px}
        .ex-name{font-family:var(--font-d);font-weight:800;font-size:22px;letter-spacing:-.02em;color:var(--t1);margin-bottom:4px}
        .ex-name-sm{font-family:var(--font-d);font-weight:700;font-size:16px;letter-spacing:-.01em;color:var(--t1)}
        .ex-cat{font-size:13px;color:var(--t2);display:flex;align-items:center;gap:6px}
        .ex-cat-dot{width:6px;height:6px;border-radius:50%;background:var(--cc,var(--teal));display:inline-block}
        .ex-score-box{text-align:center;min-width:70px}
        .ex-score-v{font-family:var(--font-d);font-weight:900;font-size:32px;letter-spacing:-.02em;color:var(--teal)}
        .ex-score-v-sm{font-family:var(--font-d);font-weight:800;font-size:22px;color:var(--t1)}
        .ex-score-l{font-family:var(--font-m);font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em;margin-top:2px}
        .ex-card-foot{display:flex;align-items:center;gap:8px;margin-top:14px;flex-wrap:wrap}
        .ex-rating{font-family:var(--font-m);font-size:10px;font-weight:700;padding:3px 8px;border-radius:6px}
        .ex-rating.strong{background:rgba(0,194,209,0.12);color:var(--teal);border:1px solid rgba(0,194,209,0.25)}
        .ex-rating.watch{background:rgba(245,158,11,0.12);color:var(--amber);border:1px solid rgba(245,158,11,0.25)}
        .ex-path{font-size:11px;color:var(--t2);background:var(--bg-hover);padding:3px 8px;border-radius:6px}
        .ex-signal{font-family:var(--font-m);font-size:11px;color:var(--t3)}
        .ex-head{margin-bottom:28px}
        .ex-head h2{font-family:var(--font-d);font-weight:800;font-size:22px;letter-spacing:-.02em;margin-bottom:6px}
        .ex-lead{font-size:13px;color:var(--t2);line-height:1.6}
        .ex-mandate{color:var(--teal)}

        /* Result */
        .result-wrap{max-width:900px;margin:0 auto;padding-top:1.5rem}
        .result-topbar{display:flex;align-items:center;gap:10px;margin-bottom:1.25rem}
        .btn-back{background:none;border:1px solid var(--border);border-radius:var(--r-sm);color:var(--t2);font-size:12px;padding:5px 12px;cursor:pointer;font-family:var(--font-b)}
        .btn-back:hover{border-color:var(--teal);color:var(--teal)}
        .result-breadcrumb{font-size:11px;color:var(--t3)}
        .company-header-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.25rem 1.5rem;margin-bottom:1rem}
        .hero{max-width:640px;margin:0 auto;padding:3.5rem 0 2rem;text-align:center}
        .hero-eyebrow{font-size:11px;color:var(--teal);letter-spacing:.1em;text-transform:uppercase;margin-bottom:1rem;opacity:.8}
        .hero h1{font-family:var(--font-d);font-size:40px;font-weight:700;line-height:1.15;letter-spacing:-.02em;color:var(--t1);margin-bottom:.75rem}
        .hero h1 span{color:var(--teal)}
        .hero-sub{font-size:15px;color:var(--t2);line-height:1.65;max-width:460px;margin:0 auto 1.75rem}
        /* Search Bar aufgehellt */
        .search-wrap{display:flex;gap:10px;background:var(--bg-card);border:1px solid var(--border-md);border-radius:var(--r-lg);padding:6px 6px 6px 14px;align-items:center}
        .search-wrap input{flex:1;background:none;border:none;outline:none;color:var(--t1);font-family:var(--font-b);font-size:14px}
        .search-wrap input::placeholder{color:var(--t3)}
        .btn-primary{background:var(--teal);color:#0D1117;font-family:var(--font-d);font-weight:600;font-size:13px;padding:9px 20px;border-radius:var(--r-md);border:none;cursor:pointer;white-space:nowrap}
        .qa-section{margin-top:.5rem}
        .qa-label{font-size:10px;color:var(--t3);letter-spacing:.07em;text-transform:uppercase;margin-bottom:.5rem;text-align:center}
        /* Chips aufgehellt */
        .qa-chips{display:flex;align-items:center;gap:6px;justify-content:center;flex-wrap:wrap}
        .qa-chip{background:var(--bg-card);border:1px solid var(--border-md);border-radius:99px;padding:5px 14px;font-size:12px;color:var(--t2);cursor:pointer;transition:all .15s;display:flex;align-items:center;gap:5px}
        .qa-chip:hover{border-color:var(--teal);color:var(--teal)}
        .qa-chip-count{font-size:10px;color:var(--t3);background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:99px}

        /* Result */
        .result-wrap{max-width:900px;margin:0 auto;padding-top:1.5rem}
        .result-topbar{display:flex;align-items:center;gap:10px;margin-bottom:1.25rem}
        .btn-back{background:none;border:1px solid var(--border-md);border-radius:var(--r-sm);color:var(--t2);font-size:12px;padding:5px 12px;cursor:pointer;font-family:var(--font-b)}
        .btn-back:hover{border-color:var(--teal);color:var(--teal)}
        .result-breadcrumb{font-size:11px;color:var(--t3)}

        /* Company Header Card */
        .company-header-card{background:var(--bg-card);border:1px solid var(--border-md);border-radius:var(--r-lg);padding:1.25rem 1.5rem;margin-bottom:1rem}
        .ch-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:.875rem}
        .ch-left{display:flex;align-items:flex-start;gap:12px}
        .ch-icon{width:40px;height:40px;border-radius:var(--r-md);background:var(--teal-bg);border:1px solid rgba(0,212,160,0.2);display:flex;align-items:center;justify-content:center;font-family:var(--font-d);font-weight:700;font-size:14px;color:var(--teal);flex-shrink:0}
        .ch-name{font-family:var(--font-d);font-size:18px;font-weight:700;color:var(--t1);display:flex;align-items:center;gap:8px}
        .ch-ticker{font-size:12px;color:var(--teal);background:var(--teal-bg);border:1px solid rgba(0,212,160,0.2);padding:2px 8px;border-radius:99px}
        .ch-cat{font-size:12px;color:var(--t2);margin-top:3px}
        .ch-right{display:flex;align-items:center;gap:10px}
        .star-btn{background:none;border:none;cursor:pointer;font-size:20px;color:var(--t3);padding:4px;transition:color .15s}
        .star-btn.active,.star-btn:hover{color:var(--amber)}
        .ch-badges{display:flex;gap:6px;flex-wrap:wrap}
        .ch-meta{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)}
        /* Meta-Labels heller — analog zu Spaltenüberschriften */
        .meta-item .meta-label{font-size:10px;color:var(--t2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:3px}
        .meta-item .meta-val{font-size:13px;color:var(--t1);font-weight:500}

        /* Subtabs — größer und besser lesbar */
        .subtabs{display:flex;gap:0;margin-bottom:1.25rem;border-bottom:1px solid var(--border)}
        .subtab{padding:9px 20px;font-size:13px;font-weight:500;color:var(--t2);cursor:pointer;border:none;background:none;border-bottom:2px solid transparent;transition:all .15s;font-family:var(--font-b);margin-bottom:-1px}
        .subtab.active{color:var(--teal);border-bottom-color:var(--teal)}
        .subtab:hover{color:var(--t1)}

        /* Info cards — Überschriften heller, Schriftgrößen größer */
        .info-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.1rem 1.25rem}
        .info-card-title{font-size:11px;color:var(--t2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.625rem;font-weight:600}
        .info-row{display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border)}
        .info-row:last-child{border-bottom:none}
        .info-key{font-size:13px;color:var(--t2)}
        .info-val{font-size:13px;color:var(--t1);font-weight:500;text-align:right}
        .news-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.1rem 1.25rem}
        .news-item{padding:8px 0;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:3px}
        .news-item:last-child{border-bottom:none}
        .news-date{font-size:11px;color:var(--t3)}
        .news-title{font-size:13px;color:var(--t1)}
        .news-src{font-size:11px;color:var(--teal)}

        /* Ownership */
        .ownership-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .own-card{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.1rem 1.25rem}
        .own-title{font-size:11px;color:var(--t2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.75rem;font-weight:600}

        /* Fundamentals */
        .fund-tile{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-md);padding:.875rem 1rem}
        .fund-tile-label{font-size:11px;color:var(--t2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;font-weight:600}
        .fund-tile-val{font-size:18px;font-weight:600;font-family:var(--font-d);color:var(--t1)}
        .fund-tile-sub{font-size:11px;color:var(--t3);margin-top:2px}
        .funding-timeline{background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.1rem 1.25rem}
        .tl-title{font-size:11px;color:var(--t2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:.875rem;font-weight:600}
        .tl-row{display:flex;align-items:center;gap:12px;padding:7px 0;border-bottom:1px solid var(--border)}
        .tl-row:last-child{border-bottom:none}
        .tl-dot{width:8px;height:8px;border-radius:50%;background:var(--teal);flex-shrink:0}
        .tl-round{font-size:13px;color:var(--t1);font-weight:500;min-width:80px}
        .tl-amount{font-size:13px;color:var(--teal);min-width:80px;font-weight:500}
        .tl-date{font-size:12px;color:var(--t3);margin-left:auto}

        /* Investitionspfad */
        .pfad-card{background:var(--bg-card);border:1px solid var(--border-md);border-radius:var(--r-lg);padding:1.25rem;margin-bottom:.875rem}
        .pfad-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}
        .pfad-title{font-size:14px;font-weight:500;color:var(--t1)}
        .scoring-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:1rem}
        .score-tile{background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:var(--r-md);padding:.875rem 1rem}
        .score-tile-label{font-size:11px;color:var(--t2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;font-weight:600}
        .score-tile-val{font-size:22px;font-weight:700;font-family:var(--font-d)}
        .score-tile-desc{font-size:12px;color:var(--t2);margin-top:4px}
        .verdict{background:rgba(0,212,160,0.06);border:1px solid rgba(0,212,160,0.2);border-radius:var(--r-md);padding:.875rem 1.1rem;display:flex;align-items:center;justify-content:space-between}
        .verdict-label{font-size:11px;color:var(--t2);text-transform:uppercase;letter-spacing:.06em}
        .verdict-val{font-family:var(--font-d);font-size:14px;font-weight:700}

        /* Watchlist */
        .btn-export{background:none;border:1px solid var(--border);border-radius:5px;color:var(--t2);font-size:11px;font-weight:600;padding:4px 10px;cursor:pointer;font-family:inherit;letter-spacing:.03em;transition:all .15s}
        .btn-export:hover{border-color:var(--teal);color:var(--teal)}
        .watchlist-wrap{padding-top:1.5rem;width:100%;background:var(--bg)}
        .wl-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}
        .wl-title{font-family:var(--font-d);font-size:16px;font-weight:600;color:var(--t1);display:flex;align-items:center;gap:8px}
        .wl-count{font-size:12px;color:var(--t3)}
        .filter-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:1rem;padding:.625rem 1rem;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-md)}
        .filter-bar label{font-size:11px;color:var(--t2);text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;font-weight:500}
        .filter-bar select{background:var(--bg-hover);border:1px solid var(--border-md);border-radius:var(--r-sm);color:var(--t1);font-size:12px;padding:3px 7px;height:28px;font-family:var(--font-b);outline:none}
        .filter-bar input{background:var(--bg-hover);border:1px solid var(--border-md);border-radius:var(--r-sm);color:var(--t1);font-size:12px;padding:3px 10px;height:28px;font-family:var(--font-b);outline:none;flex:1;min-width:120px}
        .filter-bar input::placeholder{color:var(--t3)}
        .tbl-wrap{border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;width:100%}
        .tbl-scroll{overflow-x:auto;width:100%}
        table{width:100%;border-collapse:collapse;font-size:13px}
        /* Spaltenüberschriften: heller (t2 statt t3), größer, kein Mono */
        thead th{background:var(--bg-card);font-family:var(--font-b);font-size:11px;font-weight:600;color:var(--t2);text-align:left;padding:9px 12px;border-bottom:1px solid var(--border-md);white-space:nowrap;text-transform:uppercase;letter-spacing:.06em;position:relative;cursor:default}
        thead th[data-tip]:hover::after{content:attr(data-tip);position:absolute;top:100%;left:0;background:var(--bg-hover);color:var(--t2);font-size:11px;padding:5px 9px;border-radius:var(--r-sm);white-space:nowrap;z-index:50;border:1px solid var(--border-md);pointer-events:none;font-family:var(--font-b);text-transform:none;letter-spacing:0;margin-top:2px}
        tbody tr{background:var(--bg-card);border-bottom:1px solid var(--border);transition:background .1s}
        tbody tr:last-child{border-bottom:none}
        tbody tr:hover{background:var(--bg-hover)}
        tbody td{padding:8px 12px;vertical-align:middle}
        /* Unternehmensname: normal weight, größer */
        .td-name{font-weight:500;font-size:13px;white-space:nowrap;color:var(--t1);cursor:pointer}
        .td-name:hover{color:var(--teal)}
        /* Kategorie/Industrie: größer als vorher */
        .td-muted{color:var(--t2);font-size:13px}
        /* Proxy-Spalte: kein Mono mehr */
        .td-mono{font-size:13px;color:var(--t2)}
      `}</style>

      {/* ── Nav ── */}
      <nav>
        <div className="nav-logo" onClick={() => setNavTab('research')}>
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
          <button
            className={`nav-tab${navTab === 'explore' ? ' active' : ''}`}
            onClick={() => setNavTab('explore')}
          >
            Explore
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifySelf: 'end' }}>
          {/* Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={handleOpenNotif}
              className="nav-bell"
              title="Notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -5, right: -5,
                  minWidth: 17, height: 17, padding: '0 4px',
                  background: 'var(--red)', color: '#fff',
                  borderRadius: 9, fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-m)',
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Panel */}
            {notifOpen && (
              <div style={{
                position: 'absolute', top: 42, right: 0, width: 360,
                background: 'var(--bg-card)', border: '1px solid var(--border-md)',
                borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                zIndex: 200, overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>
                    Signals · Watchlist
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={handleRefreshNotif}
                      title="Jetzt aktualisieren"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, color: 'var(--t3)', padding: 0, lineHeight: 1,
                      }}
                    >
                      ⟳
                    </button>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 11, color: 'var(--teal)', padding: 0,
                        }}
                      >
                        Alle gelesen
                      </button>
                    )}
                  </div>
                </div>

                {/* List */}
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{
                      padding: '2rem', textAlign: 'center',
                      fontSize: 12, color: 'var(--t3)',
                    }}>
                      Keine neuen Signals
                    </div>
                  ) : (
                    notifications.slice(0, 20).map(n => {
                      const seen   = seenIds.has(n.id);
                      const dotCol = n.direction === 'positive' ? 'var(--teal)'
                                   : n.direction === 'negative' ? 'var(--red)'
                                   : 'var(--t3)';
                      // NOTIF-01: Signal-Kategorie als lesbares Label
                      const catLabels: Record<string, string> = {
                        funding: 'Finanzierung', partnership: 'Partnerschaft', ipo_progress: 'IPO',
                        market_growth: 'Marktwachstum', patent: 'Patent/IP', investor_entry: 'Investor',
                        regulatory: 'Regulatorik', negative_earnings: 'Earnings',
                        supply_chain: 'Lieferkette', insider_selling: 'Insider-Verkauf',
                        insider_buying: 'Insider-Kauf', customer_concentration: 'Kundenkonzentration',
                        filing: 'Transparenz', ownership_entry: 'Ownership', general_news: 'News',
                      };
                      const catLabel = n.signal_category ? (catLabels[n.signal_category] ?? n.signal_category) : null;
                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            markSeen([n.id]);
                            setSeenIds(getSeenIds());
                            setNotifOpen(false);
                            setNavTab('research');
                            router.push(`/company/${encodeURIComponent(n.company_name)}?from=signal&back=/`);
                          }}
                          style={{
                            padding: '9px 14px',
                            borderBottom: '1px solid var(--border)',
                            background: seen ? 'transparent' : 'rgba(0,212,160,0.03)',
                            cursor: 'pointer',
                            display: 'flex', gap: 10, alignItems: 'flex-start',
                          }}
                        >
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: dotCol, marginTop: 5, flexShrink: 0,
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 11, fontWeight: 600, color: 'var(--t2)',
                              marginBottom: 2,
                            }}>
                              {n.company_name}
                              {!seen && (
                                <span style={{
                                  marginLeft: 6, background: 'var(--teal)',
                                  color: '#0D1117', borderRadius: 99,
                                  fontSize: 9, fontWeight: 700, padding: '1px 5px',
                                }}>NEU</span>
                              )}
                              {catLabel && (
                                <span style={{
                                  marginLeft: 6, background: 'var(--bg-hover)',
                                  color: 'var(--t3)', borderRadius: 99,
                                  fontSize: 9, fontWeight: 600, padding: '1px 5px',
                                }}>{catLabel}</span>
                              )}
                            </div>
                            <div style={{
                              fontSize: 12, color: 'var(--t1)',
                              overflow: 'hidden', textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {n.raw_title}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>
                              {n.event_date} · {n.event_type.replace(/_/g, ' ')}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {notifications.length > 20 && (
                  <div style={{
                    padding: '8px 14px', textAlign: 'center',
                    fontSize: 11, color: 'var(--t3)', borderTop: '1px solid var(--border)',
                  }}>
                    + {notifications.length - 20} weitere · Watchlist öffnen
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User: Avatar (eingeloggt) oder Anmelden-Button */}
          {session ? (
            <div style={{ position: 'relative' }}>
              <div
                className="nav-user-av"
                title="Konto"
                onClick={() => setUserMenuOpen(o => !o)}
              >
                {(session.user?.email?.[0] ?? 'U').toUpperCase()}
              </div>
              {userMenuOpen && (
                <>
                  {/* Klick-außerhalb-Schließer */}
                  <div
                    onClick={() => setUserMenuOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 190 }}
                  />
                  <div style={{
                    position: 'absolute', top: 42, right: 0, width: 240, zIndex: 200,
                    background: 'var(--bg-card)', border: '1px solid var(--border-md)',
                    borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden',
                  }}>
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--font-m)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>
                        Angemeldet als
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {session.user?.email}
                      </div>
                    </div>
                    <div
                      onClick={() => { setUserMenuOpen(false); supabase.auth.signOut(); }}
                      style={{
                        padding: '11px 14px', cursor: 'pointer', fontSize: 13,
                        color: 'var(--t2)', transition: 'background .1s, color .1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--t1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)'; }}
                    >
                      Abmelden
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              style={{
                background: 'var(--teal)', color: 'var(--bg)',
                border: 'none', borderRadius: 8, padding: '7px 16px',
                fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-b)',
                cursor: 'pointer', transition: 'all .2s',
              }}
            >
              Anmelden
            </button>
          )}
        </div>
      </nav>

      {/* ── Research Page ── */}
      {navTab === 'research' && (
        <HeroState companies={companies} onSelect={handleSelectCompany} notifications={notifications} />
      )}

      {/* ── Watchlist Page ── */}
      {navTab === 'watchlist' && (
        <div className="r-page">
          <div className="bg-grid" />
          <div className="page" style={{ position: 'relative', zIndex: 1 }}>
            <WatchlistPage
            companies={companies.filter(c => c.id && watchlistIds.has(c.id))}
            onSelectCompany={handleSelectFromWatchlist}
          />
          </div>
        </div>
      )}
      {/* ── Explore Page ── */}
      {navTab === 'explore' && (
        <div className="r-page">
          <div className="bg-grid" />
          <div className="r-wrap" style={{ paddingTop: '2.5rem' }}>
            {exploreLoading ? (
              <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--t3)', fontSize: 13 }}>
                Feed wird geladen…
              </div>
            ) : !exploreData || exploreData.companies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '6rem 0' }}>
                <div style={{ fontSize: 15, color: 'var(--t1)', marginBottom: 8 }}>Keine Empfehlungen</div>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                  {!session
                    ? 'Bitte anmelden um personalisierte Empfehlungen zu sehen.'
                    : 'Industrie-Präferenzen noch nicht gesetzt.'}
                </div>
              </div>
            ) : (
              <>
                {/* Ex-Head */}
                <div className="ex-head">
                  <h2>Dein Explore-Tab</h2>
                  <p className="ex-lead">
                    Folgende Unternehmen könnten für dich interessant sein
                    {exploreData.customer_type && (
                      <span className="ex-mandate"> — gewichtet auf dein Mandat ({exploreData.customer_type}).</span>
                    )}
                  </p>
                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--t3)', fontFamily: 'var(--font-m)' }}>
                    {exploreData.total} Companies · {exploreData.sector_keys?.join(', ')}
                  </div>
                </div>

                {/* Card Grid */}
                <div className="ex-card-grid">
                  {exploreData.companies.map((c: any, i: number) => {
                    const isPrimary = i === 0;
                    const accentColors = ['var(--teal)','var(--emerald)','var(--indigo)','var(--teal)','var(--emerald)','var(--violet)'];
                    const cc = accentColors[i % accentColors.length];
                    const ratingClass = c.rating?.startsWith('A') || c.rating === 'STRONG' ? 'strong' : 'watch';
                    const navPath = `/company/${encodeURIComponent(c.name)}?from=explore&back=/?tab=explore`;

                    if (isPrimary) return (
                      <div key={c.id ?? c.name} className="ex-card primary"
                        style={{'--cc': 'var(--teal)'} as React.CSSProperties}
                        onClick={() => router.push(navPath)}>
                        <div className="pickbody">
                          <div className="toppick">// Top Pick · höchster Score in deinen Sektoren</div>
                          <div className="ex-name">{c.name}</div>
                          <div className="ex-cat">
                            <span className="ex-cat-dot" />
                            {[c.industry, c.headquarters].filter(Boolean).join(' · ')}
                          </div>
                          <div className="ex-card-foot">
                            {c.rating && <span className={`ex-rating ${ratingClass}`}>{c.rating}</span>}
                            {c.investment_path && <span className="ex-path">{c.investment_path}</span>}
                            {c.composite_score != null && (
                              <span className="ex-signal">Score {Number(c.composite_score).toFixed(1)}</span>
                            )}
                          </div>
                        </div>
                        <div className="ex-score-box">
                          <div className="ex-score-v">
                            {c.composite_score != null ? Number(c.composite_score).toFixed(1) : '—'}
                          </div>
                          <div className="ex-score-l">Argo Score</div>
                        </div>
                      </div>
                    );

                    return (
                      <div key={c.id ?? c.name} className="ex-card"
                        style={{'--cc': cc} as React.CSSProperties}
                        onClick={() => router.push(navPath)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                            <div className="ex-name-sm">{c.name}</div>
                            <div className="ex-cat" style={{ marginTop: 4 }}>
                              <span className="ex-cat-dot" />
                              {[c.industry, c.headquarters].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                          <div className="ex-score-box">
                            <div className="ex-score-v-sm">
                              {c.composite_score != null ? Number(c.composite_score).toFixed(1) : '—'}
                            </div>
                            <div className="ex-score-l">Score</div>
                          </div>
                        </div>
                        <div className="ex-card-foot">
                          {c.rating && <span className={`ex-rating ${ratingClass}`}>{c.rating}</span>}
                          {c.investment_path && <span className="ex-path">{c.investment_path}</span>}
                          {c.last_signal && <span className="ex-signal">{c.last_signal}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* AUTH-01: Login Modal */}
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </>
  );
}

// ─── Gate (LANDING-01 + LOGIN-MODAL-01) ──────────────────────────────────────
// Ausgeloggt → öffentliche MarketingLanding (Request Access + Login).
// Login-Button → LoginOnboarding als vollständige Seite (kein Modal).
// Nach Login + Onboarding → PageContent. Kein Overlay übereinander.
function Gate() {
  const [session, setSession] = useState<any>(undefined); // undefined = Auth-Check läuft
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) setShowLogin(false); // Logout → zurück auf Landing
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null; // kurzer Auth-Check (lokal, schnell)

  // showLogin bleibt aktiv auch wenn Supabase-Session gesetzt wird —
  // LoginOnboarding läuft Onboarding-Steps NACH dem Login durch, bevor die App öffnet.
  if (showLogin) return (
    <LoginOnboarding
      onBack={() => setShowLogin(false)}
      onComplete={() => setShowLogin(false)}
    />
  );
  if (!session) return <MarketingLanding onLogin={() => setShowLogin(true)} />;
  return <PageContent />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Gate />
    </Suspense>
  );
}
