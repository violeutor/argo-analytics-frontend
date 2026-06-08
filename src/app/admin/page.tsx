'use client';

// =============================================================================
// /admin — Argo Admin Dashboard
//
// Tabs:
//   1 · Access Requests — Lead-Pipeline + Aktivierungs-Flow (ACTIVATE-01)
//   2 · User Health     — Onboarding-Status aller aktivierten User
//   3 · Testing         — Tägliche Test-Routine (aktualisiert S61)
//
// Auth: Backend-seitig via is_admin in user_profiles. Frontend zeigt 403-Screen
// wenn der eingeloggte User kein Admin ist — kein separater Env-Var nötig.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const BACKEND_PROXY = '/api/backend';

// ── Types ─────────────────────────────────────────────────────────────────────
type RequestStatus = 'new' | 'contacted' | 'activated' | 'rejected' | 'spam';
type ActiveTab     = 'requests' | 'users' | 'testing';

interface AccessRequest {
  id: string;
  full_name: string;
  company_name: string;
  email: string;
  customer_type: string;
  message: string | null;
  status: RequestStatus;
  linked_user_id: string | null;
  created_at: string;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  customer_type: string | null;
  subscription_tier: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  is_admin: boolean;
}

// ── Testing-Routine (aktualisiert S61: BA-Bridge entfernt, Auth/Admin neu) ────
const TEST_SECTIONS = [
  {
    id: 'cron',
    title: '1 · Cron Health',
    meta: '~3 min',
    badge: 'crit' as const,
    items: [
      { id: 'c2', label: 'Signal Engine 04:00 UTC gelaufen?',         cmd: "Render → Argo Backend → Logs → 'Signal Engine'",    expect: 'Erwarte: SE-01 … SE-17 completed' },
      { id: 'c3', label: 'EDGAR KPI Cron 05:15 UTC: Rows geschrieben?', cmd: "Render → Argo Backend → Logs → 'edgar_kpi'",      expect: "Erwarte: 'KPI-03: N Rows upserted'" },
      { id: 'c4', label: 'Scoring Cron 06:00 UTC: Scores aktualisiert?', cmd: "Render → Argo Backend → Logs → 'Scoring Cron'", expect: "Erwarte: 'Scoring Cron: N Companies gescort'" },
    ],
  },
  {
    id: 'beta',
    title: '2 · Beta & Market Data',
    meta: '~3 min',
    badge: 'warn' as const,
    items: [
      { id: 'b1', label: 'BAYN.DE: beta_1y sichtbar? (backend-native, kein Bridge)',  cmd: "Argo → 'Bayer' → Tab 8 → Beta-Tile",         expect: 'Erwarte: beta_1y befüllt, benchmark GDAXI oder SPY' },
      { id: 'b2', label: 'LNZA: beta_1y sichtbar?',                                   cmd: "Argo → 'LanzaTech' → Tab 8 → Beta-Tile",    expect: 'Erwarte: beta_1y befüllt, benchmark SPY' },
      { id: 'b3', label: 'Private Company: Damodaran-Fallback in sector_beta Tile?',  cmd: "Argo → DE GmbH → Tab 8 → sector_beta Tile", expect: 'Erwarte: damodaran_beta + Sektor-Label sichtbar' },
    ],
  },
  {
    id: 'fundamentals',
    title: '3 · Fundamentals & EDGAR',
    meta: '~4 min',
    badge: 'warn' as const,
    items: [
      { id: 'y1',  label: 'LNZA: Revenue + EBITDA in Tab 3 sichtbar?',              cmd: "Argo → 'LanzaTech' → Tab 3 Fundamentals",        expect: 'Erwarte: revenue_usd_mn, ebitda_usd_mn befüllt' },
      { id: 'y2',  label: 'Enapter: Ticker .DE/.F Fallback korrekt?',               cmd: "Argo → 'Enapter' → Tab 3 Fundamentals",          expect: 'Erwarte: Marktpreis sichtbar — falls leer: .F Fallback debuggen' },
      { id: 'e1',  label: 'LanzaTech: ≥18 KPI-Rows, Verlauf Button aktiv?',         cmd: "Argo → 'LanzaTech' → Tab 3 → ↗ Verlauf Button", expect: 'Erwarte: Verlauf Button klickbar, ≥2 Datenpunkte im Chart' },
      { id: 'e2',  label: 'Neues listed US Unternehmen: EDGAR KPI on-demand?',       cmd: "Argo → z.B. 'Solugen' → Tab 3",                 expect: 'Erwarte: EDGAR KPI-Block erscheint wenn 10-K vorhanden' },
    ],
  },
  {
    id: 'ownership',
    title: '4 · BaFin + Ownership',
    meta: '~3 min',
    badge: 'warn' as const,
    items: [
      { id: 'baf1', label: 'Listed DE: BaFin ownership_entries vorhanden?', cmd: "Argo → 'Enapter' → Tab 3 Ownership",    expect: "Erwarte: ≥1 Entry mit source='bafin_stimmrechte'" },
      { id: 'baf2', label: 'Listed US: EDGAR SC 13G/13D Entries?',          cmd: "Argo → 'LanzaTech' → Tab 3 Ownership", expect: "Erwarte: source='edgar_sc13g' oder 'yahoo_institutional'" },
    ],
  },
  {
    id: 'signals',
    title: '5 · Signal Engine',
    meta: '~2 min',
    badge: 'warn' as const,
    items: [
      { id: 'sig1', label: 'Neue Signals generiert? (SE-01–SE-17)',           cmd: "Argo → beliebige Company → Tab 9 Signal History",  expect: 'Erwarte: ≥1 Signal mit event_date = heute' },
      { id: 'sig2', label: 'SE-17 source_count > 1 bei einem Event?',         cmd: 'Tab 9 → Signal mit source_count Badge prüfen',    expect: 'Erwarte: source_count Badge sichtbar wenn ≥2 Quellen dasselbe Event meldeten' },
    ],
  },
  {
    id: 'auth',
    title: '6 · Auth & Onboarding',
    meta: '~4 min',
    badge: 'crit' as const,
    items: [
      { id: 'auth1', label: 'Ausgeloggt: Marketing-Landing sichtbar, kein App-Zugang?', cmd: 'Opera (nicht eingeloggt) → App-URL aufrufen',     expect: 'Erwarte: Marketing-Landing, kein Research/Explore sichtbar' },
      { id: 'auth2', label: 'Login-Flow: ob1 → ob2 → ob3 → complete vollständig?',      cmd: 'Opera → Einloggen → Onboarding-Flow durchlaufen', expect: 'Erwarte: 5-View-Flow abgeschlossen, danach App sichtbar' },
      { id: 'auth3', label: 'Returning User: Onboarding wird übersprungen?',             cmd: 'Opera → Nochmals einloggen',                     expect: 'Erwarte: onboarding_completed_at gesetzt → direkt in App' },
      { id: 'auth4', label: 'Non-Admin: /admin zeigt 403-Screen?',                       cmd: 'Opera (normaler User) → /admin aufrufen',        expect: "Erwarte: '🔒 Kein Zugang' Screen" },
    ],
  },
  {
    id: 'smoke',
    title: '7 · One-Click Smoke Test',
    meta: '~3 min',
    badge: 'crit' as const,
    items: [
      { id: 'o1', label: 'Bekannte Company: Scores + alle Tabs laden?',  cmd: "Argo → 'Climeworks' → alle Tabs durchklicken",  expect: 'Erwarte: kein 500, kein leerer Tab, Composite Score > 0' },
      { id: 'o2', label: 'Unbekannte Company: One-Click-Flow läuft?',    cmd: 'Argo → Name eingeben der nicht in DB ist',      expect: 'Erwarte: Enrichment startet, 202 → polling → Ergebnis' },
      { id: 'o3', label: 'Watchlist: Stern-Toggle + Tab befüllt?',       cmd: 'Argo → Company → Stern → Watchlist-Tab',        expect: 'Erwarte: Company in Watchlist-Tab sichtbar nach Toggle' },
      { id: 'o4', label: 'Explore: personalisierter Feed geladen?',      cmd: 'Argo → Explore-Tab (eingeloggt)',               expect: 'Erwarte: ≥1 Company entsprechend Industrie-Präferenzen' },
    ],
  },
];

// ── Constants ─────────────────────────────────────────────────────────────────
const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  vc:            'VC-Fund',
  pe:            'PE-Fund',
  ma_agency:     'M&A-Boutique',
  corporate:     'Corporate Dev',
  family_office: 'Family Office',
  other:         'Sonstiges',
};

const STATUS_STYLE: Record<RequestStatus, { label: string; bg: string; color: string }> = {
  new:       { label: 'Neu',         bg: 'rgba(0,194,209,0.12)',  color: '#00C2D1' },
  contacted: { label: 'Kontaktiert', bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  activated: { label: 'Aktiviert',   bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
  rejected:  { label: 'Abgelehnt',   bg: 'rgba(239,68,68,0.12)',  color: '#EF4444' },
  spam:      { label: 'Spam',        bg: 'rgba(90,101,115,0.2)',  color: '#5A6573' },
};

const BADGE_COLORS = {
  crit: { bg: 'rgba(239,68,68,0.12)',   color: '#EF4444', border: 'rgba(239,68,68,0.3)',   label: 'kritisch' },
  warn: { bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B', border: 'rgba(245,158,11,0.3)',  label: 'täglich'  },
  ok:   { bg: 'rgba(16,185,129,0.12)', color: '#10B981', border: 'rgba(16,185,129,0.3)',  label: 'stabil'   },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();

  const [activeTab, setActiveTab]       = useState<ActiveTab>('requests');
  const [session, setSession]           = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [forbidden, setForbidden]       = useState(false);
  const [requests, setRequests]         = useState<AccessRequest[]>([]);
  const [users, setUsers]               = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [activating, setActivating]     = useState<string | null>(null);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);
  const [checked, setChecked]           = useState<Record<string, boolean>>({});

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Session ────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null) router.push('/');
  }, [session, router]);

  // ── Fetch Access Requests ──────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_PROXY}/api/v1/admin/access-requests`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.status === 403) { setForbidden(true); setLoading(false); return; }
      if (res.status === 401) { router.push('/'); return; }
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch {
      showToast('Fehler beim Laden der Anfragen.', false);
    } finally {
      setLoading(false);
    }
  }, [session, router]);

  // ── Fetch Users ────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    if (!session?.access_token) return;
    setLoadingUsers(true);
    try {
      const res = await fetch(`${BACKEND_PROXY}/api/v1/admin/users`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoadingUsers(false);
    }
  }, [session]);

  useEffect(() => { if (session) fetchRequests(); }, [session, fetchRequests]);
  useEffect(() => { if (session && activeTab === 'users') fetchUsers(); }, [session, activeTab, fetchUsers]);

  // ── Activate ───────────────────────────────────────────────────────────────
  const handleActivate = async (req: AccessRequest) => {
    if (activating) return;
    setActivating(req.id);
    try {
      const res = await fetch(`${BACKEND_PROXY}/api/v1/admin/activate/${req.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✓ Invite verschickt an ${req.email}`, true);
        setRequests(prev =>
          prev.map(r => r.id === req.id ? { ...r, status: 'activated', linked_user_id: data.user_id } : r)
        );
      } else {
        showToast(data.detail || 'Aktivierung fehlgeschlagen.', false);
      }
    } catch {
      showToast('Netzwerkfehler.', false);
    } finally {
      setActivating(null);
    }
  };

  // ── Checklist helpers ──────────────────────────────────────────────────────
  const toggleCheck = (id: string) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const totalItems  = TEST_SECTIONS.reduce((sum, s) => sum + s.items.length, 0);
  const doneCount   = Object.values(checked).filter(Boolean).length;

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (session === undefined || session === null) return null;

  if (forbidden) return (
    <div style={S.center}>
      <div style={S.card}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{ fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Kein Zugang</div>
        <div style={{ fontSize: 13, color: 'var(--t3, #5A6573)' }}>Dieser Bereich ist Admin-exklusiv.</div>
        <button style={{ ...S.btnGhost, marginTop: 20 }} onClick={() => router.push('/')}>← Zurück zur App</button>
      </div>
    </div>
  );

  const counts = {
    new:       requests.filter(r => r.status === 'new').length,
    activated: requests.filter(r => r.status === 'activated').length,
    total:     requests.length,
  };

  // ── Tab: Access Requests ───────────────────────────────────────────────────
  const renderRequests = () => (
    <>
      <div style={S.tableWrap}>
        {loading ? (
          <div style={S.empty}>Lade…</div>
        ) : requests.length === 0 ? (
          <div style={S.empty}>Noch keine Anfragen eingegangen.</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>{['Datum','Name','Firma','E-Mail','Typ','Nachricht','Status',''].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {requests.map(req => {
                const st = STATUS_STYLE[req.status] ?? STATUS_STYLE.new;
                const isActivating = activating === req.id;
                const canActivate  = req.status === 'new' || req.status === 'contacted';
                const dateStr = req.created_at
                  ? new Date(req.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
                  : '—';
                return (
                  <tr key={req.id} style={S.tr}>
                    <td style={{ ...S.td, ...S.mono, color: 'var(--t3)', whiteSpace: 'nowrap' }}>{dateStr}</td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{req.full_name}</td>
                    <td style={{ ...S.td, color: 'var(--t2)' }}>{req.company_name}</td>
                    <td style={{ ...S.td, ...S.mono, fontSize: 12 }}>{req.email}</td>
                    <td style={{ ...S.td, ...S.mono, fontSize: 11, color: 'var(--teal)' }}>
                      {CUSTOMER_TYPE_LABEL[req.customer_type] ?? req.customer_type}
                    </td>
                    <td style={{ ...S.td, maxWidth: 260, color: 'var(--t3)', fontSize: 12 }}>
                      {req.message
                        ? <span title={req.message}>{req.message.length > 80 ? req.message.slice(0, 80) + '…' : req.message}</span>
                        : <span style={{ fontStyle: 'italic' }}>—</span>}
                    </td>
                    <td style={S.td}>
                      <span style={{ ...S.badge, background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td style={S.td}>
                      {canActivate ? (
                        <button style={{ ...S.btnActivate, opacity: isActivating ? 0.6 : 1 }} disabled={!!activating} onClick={() => handleActivate(req)}>
                          {isActivating ? 'Sende…' : 'Aktivieren →'}
                        </button>
                      ) : req.status === 'activated' ? (
                        <span style={{ ...S.mono, fontSize: 11, color: '#10B981' }}>✓ {req.linked_user_id?.slice(0, 8)}…</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <div style={S.footer}>
        <span style={S.mono}>
          Neuer Admin: <code>UPDATE user_profiles SET is_admin = TRUE WHERE email = '...';</code>
          &nbsp;· Render-Env-Var: <code>APP_URL</code>
        </span>
      </div>
    </>
  );

  // ── Tab: User Health ───────────────────────────────────────────────────────
  const renderUsers = () => (
    <div style={S.tableWrap}>
      {loadingUsers ? (
        <div style={S.empty}>Lade…</div>
      ) : users.length === 0 ? (
        <div style={S.empty}>Noch keine aktivierten User.</div>
      ) : (
        <table style={S.table}>
          <thead>
            <tr>{['Name','Firma','E-Mail','Typ','Tier','Onboarding','Aktiviert am',''].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {users.map(u => {
              const onboarded = !!u.onboarding_completed_at;
              const obDate    = onboarded
                ? new Date(u.onboarding_completed_at!).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
                : null;
              const createdDate = u.created_at
                ? new Date(u.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
                : '—';
              return (
                <tr key={u.id} style={S.tr}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{u.full_name || '—'}</td>
                  <td style={{ ...S.td, color: 'var(--t2)' }}>{u.company_name || '—'}</td>
                  <td style={{ ...S.td, ...S.mono, fontSize: 12 }}>{u.email || '—'}</td>
                  <td style={{ ...S.td, ...S.mono, fontSize: 11, color: 'var(--teal)' }}>
                    {CUSTOMER_TYPE_LABEL[u.customer_type ?? ''] ?? u.customer_type ?? '—'}
                  </td>
                  <td style={S.td}>
                    <span style={{
                      ...S.badge,
                      background: u.subscription_tier === 'pro' ? 'rgba(16,185,129,0.12)' : 'rgba(90,101,115,0.2)',
                      color:      u.subscription_tier === 'pro' ? '#10B981'               : '#5A6573',
                    }}>
                      {u.subscription_tier ?? '—'}
                    </span>
                  </td>
                  <td style={S.td}>
                    {onboarded
                      ? <span style={{ ...S.mono, fontSize: 11, color: '#10B981' }}>✓ {obDate}</span>
                      : <span style={{ ...S.mono, fontSize: 11, color: '#F59E0B' }}>⏳ ausstehend</span>}
                  </td>
                  <td style={{ ...S.td, ...S.mono, color: 'var(--t3)', fontSize: 11 }}>{createdDate}</td>
                  <td style={S.td}>
                    {u.is_admin && <span style={{ ...S.badge, background: 'rgba(59,130,246,0.12)', color: '#3B82F6' }}>Admin</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  // ── Tab: Daily Testing ─────────────────────────────────────────────────────
  const renderTesting = () => (
    <div style={{ padding: '24px 32px' }}>
      {/* Meta bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' as const }}>
        <span style={{ ...S.mono, fontSize: 11, color: 'var(--t3)' }}>
          Beste Zeit:&nbsp;
          <b style={{ color: 'var(--t2)' }}>nach 08:30 CEST</b> / <b style={{ color: 'var(--t2)' }}>07:30 CET</b>
          &nbsp;· alle Crons ~06:15 UTC done · Dauer: ~22 min
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...S.mono, fontSize: 11, color: 'var(--t2)' }}>
            <b style={{ color: 'var(--teal)' }}>{doneCount}</b> / {totalItems} erledigt
          </span>
          <button style={S.btnGhost} onClick={() => setChecked({})}>↺ Reset</button>
        </div>
      </div>

      {/* Sections */}
      {TEST_SECTIONS.map(sec => {
        const bc      = BADGE_COLORS[sec.badge];
        const secDone = sec.items.filter(i => checked[i.id]).length;
        return (
          <div key={sec.id} style={{ ...S.testSection, marginBottom: 10 }}>
            <div style={S.testSecHead}>
              <span style={S.testSecTitle}>{sec.title}</span>
              <span style={{ ...S.mono, fontSize: 11, color: 'var(--t3)', marginLeft: 8 }}>{sec.meta}</span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ ...S.mono, fontSize: 10, color: 'var(--t3)' }}>{secDone}/{sec.items.length}</span>
                <span style={{ ...S.badge, background: bc.bg, color: bc.color, border: `1px solid ${bc.border}`, fontSize: 10 }}>
                  {bc.label}
                </span>
              </span>
            </div>
            {sec.items.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  ...S.testItem,
                  opacity: checked[item.id] ? 0.45 : 1,
                  borderBottom: idx < sec.items.length - 1 ? '1px solid var(--border, #262C36)' : 'none',
                }}
              >
                <input
                  type="checkbox"
                  id={`cb-${item.id}`}
                  checked={!!checked[item.id]}
                  onChange={() => toggleCheck(item.id)}
                  style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2, accentColor: '#00C2D1', cursor: 'pointer' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <label
                    htmlFor={`cb-${item.id}`}
                    style={{ ...S.testLabel, textDecoration: checked[item.id] ? 'line-through' : 'none', cursor: 'pointer' }}
                  >
                    {item.label}
                  </label>
                  <div
                    style={S.testCmd}
                    onClick={() => navigator.clipboard?.writeText(item.cmd)}
                    title="Klicken zum Kopieren"
                  >
                    <span style={{ color: 'var(--teal)', marginRight: 5 }}>$</span>{item.cmd}
                  </div>
                  <div style={S.testExpect}>{item.expect}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  const TAB_LABELS: Record<ActiveTab, string> = {
    requests: counts.new > 0 ? `Access Requests (${counts.new})` : 'Access Requests',
    users:    'User Health',
    testing:  'Testing',
  };

  return (
    <div style={S.root}>

      {/* Toast */}
      {toast && (
        <div style={{ ...S.toast, background: toast.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', borderColor: toast.ok ? '#10B981' : '#EF4444', color: toast.ok ? '#10B981' : '#EF4444' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.eyebrow}>// Argo Admin</div>
          <div style={S.title}>
            {activeTab === 'requests' ? 'Access Requests' : activeTab === 'users' ? 'User Health' : 'Daily Testing'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {activeTab === 'requests' && <>
            <div style={S.stat}><b style={{ color: 'var(--teal)' }}>{counts.new}</b> offen</div>
            <div style={S.stat}><b style={{ color: '#10B981' }}>{counts.activated}</b> aktiviert</div>
            <div style={S.stat}><b>{counts.total}</b> gesamt</div>
            <button style={S.btnGhost} onClick={fetchRequests}>⟳</button>
          </>}
          {activeTab === 'users' && <>
            <div style={S.stat}><b style={{ color: '#10B981' }}>{users.filter(u => !!u.onboarding_completed_at).length}</b> onboarded</div>
            <div style={S.stat}><b>{users.length}</b> total</div>
            <button style={S.btnGhost} onClick={fetchUsers}>⟳</button>
          </>}
          {activeTab === 'testing' && (
            <div style={S.stat}><b style={{ color: 'var(--teal)' }}>{doneCount}</b> / {totalItems}</div>
          )}
          <button style={S.btnGhost} onClick={() => router.push('/')}>← App</button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={S.tabNav}>
        {(['requests', 'users', 'testing'] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            style={{ ...S.tabBtn, ...(activeTab === tab ? S.tabBtnActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'requests' && renderRequests()}
      {activeTab === 'users'    && renderUsers()}
      {activeTab === 'testing'  && renderTesting()}

    </div>
  );
}

// ── Inline Styles ─────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    background: 'var(--bg, #0D1117)',
    color: 'var(--t1, #E6EDF3)',
    fontFamily: 'Manrope, sans-serif',
    padding: '0 0 60px',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '28px 32px 24px',
    borderBottom: '1px solid var(--border, #262C36)',
    background: 'rgba(13,17,23,0.8)',
    position: 'sticky', top: 0, zIndex: 10,
    backdropFilter: 'blur(12px)',
  },
  eyebrow: {
    fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--teal, #00C2D1)', marginBottom: 6,
  },
  title: {
    fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em',
  },
  stat: {
    fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, color: 'var(--t3, #5A6573)',
    padding: '4px 10px', background: 'var(--bg-card, #161B22)',
    border: '1px solid var(--border, #262C36)', borderRadius: 8,
  },
  btnGhost: {
    background: 'transparent', border: '1px solid var(--border, #262C36)',
    borderRadius: 8, color: 'var(--t2, #8B949E)', fontFamily: 'Manrope, sans-serif',
    fontWeight: 600, fontSize: 13, padding: '7px 14px', cursor: 'pointer',
  },
  btnActivate: {
    background: 'var(--teal, #00C2D1)', color: '#0D1117',
    border: 'none', borderRadius: 8, fontFamily: 'Manrope, sans-serif',
    fontWeight: 700, fontSize: 12.5, padding: '6px 14px', cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabNav: {
    display: 'flex', gap: 4, padding: '10px 32px',
    borderBottom: '1px solid var(--border, #262C36)',
    background: 'var(--bg, #0D1117)',
  },
  tabBtn: {
    background: 'transparent', border: '1px solid transparent',
    borderRadius: 8, color: 'var(--t3, #5A6573)', fontFamily: 'Manrope, sans-serif',
    fontWeight: 600, fontSize: 13, padding: '7px 16px', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabBtnActive: {
    background: 'var(--bg-card, #161B22)', border: '1px solid var(--border, #262C36)',
    color: 'var(--t1, #E6EDF3)',
  },
  tableWrap: {
    margin: '28px 32px 0',
    border: '1px solid var(--border, #262C36)',
    borderRadius: 12, overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '10px 14px', textAlign: 'left',
    fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--t3, #5A6573)',
    background: 'var(--bg-card, #161B22)', borderBottom: '1px solid var(--border, #262C36)',
    fontWeight: 600,
  },
  tr:    { borderBottom: '1px solid var(--border, #262C36)', background: 'var(--bg-card, #161B22)' },
  td:    { padding: '12px 14px', verticalAlign: 'middle' },
  mono:  { fontFamily: 'IBM Plex Mono, monospace' },
  badge: {
    display: 'inline-block', padding: '3px 9px', borderRadius: 100,
    fontSize: 11, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.03em',
  },
  empty: {
    padding: '48px', textAlign: 'center', color: 'var(--t3, #5A6573)',
    fontFamily: 'IBM Plex Mono, monospace', fontSize: 13,
    background: 'var(--bg-card, #161B22)',
  },
  center: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg, #0D1117)',
  },
  card: {
    background: 'var(--bg-card, #161B22)', border: '1px solid var(--border, #262C36)',
    borderRadius: 16, padding: '40px 48px', textAlign: 'center', maxWidth: 380,
  },
  toast: {
    position: 'fixed', top: 20, right: 24, zIndex: 1000,
    padding: '12px 20px', borderRadius: 10, fontSize: 13,
    fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600,
    border: '1px solid', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  footer: {
    margin: '24px 32px 0', fontSize: 12, color: 'var(--t3, #5A6573)',
  },
  // Testing tab
  testSection: {
    border: '1px solid var(--border, #262C36)',
    borderRadius: 10, overflow: 'hidden',
  },
  testSecHead: {
    display: 'flex', alignItems: 'center',
    padding: '10px 16px',
    background: 'var(--bg-card, #161B22)',
    borderBottom: '1px solid var(--border, #262C36)',
  },
  testSecTitle: {
    fontFamily: 'Archivo, sans-serif', fontWeight: 700, fontSize: 13,
  },
  testItem: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: '10px 16px',
    background: 'var(--bg-card, #161B22)',
    transition: 'opacity 0.15s',
  },
  testLabel: {
    fontSize: 12.5, lineHeight: '1.4', color: 'var(--t1, #E6EDF3)',
  },
  testCmd: {
    marginTop: 5, display: 'inline-block',
    fontSize: 11, color: 'var(--t2, #8B949E)',
    background: 'var(--bg, #0D1117)', border: '1px solid var(--border, #262C36)',
    borderRadius: 5, padding: '4px 10px',
    fontFamily: 'IBM Plex Mono, monospace', cursor: 'pointer',
  },
  testExpect: {
    marginTop: 3, fontSize: 11, color: 'var(--t3, #5A6573)',
    fontFamily: 'IBM Plex Mono, monospace',
  },
};
