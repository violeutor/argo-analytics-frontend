'use client';

// =============================================================================
// /admin — Argo Admin Dashboard (ACTIVATE-01)
//
// Zeigt alle access_requests. "Aktivieren"-Button pro Zeile → ruft
// POST /api/v1/admin/activate/{id} auf → Supabase Invite + user_profiles.
//
// Auth: Backend-seitig via is_admin in user_profiles. Frontend zeigt 403-Screen
// wenn der eingeloggte User kein Admin ist — kein separater Env-Var nötig.
//
// Status-Flow: new → contacted → activated | rejected | spam
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const BACKEND_PROXY = '/api/backend';

type RequestStatus = 'new' | 'contacted' | 'activated' | 'rejected' | 'spam';

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

const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  vc:            'VC-Fund',
  pe:            'PE-Fund',
  ma_agency:     'M&A-Boutique',
  corporate:     'Corporate Dev',
  family_office: 'Family Office',
  other:         'Sonstiges',
};

const STATUS_STYLE: Record<RequestStatus, { label: string; bg: string; color: string }> = {
  new:       { label: 'Neu',        bg: 'rgba(0,194,209,0.12)',  color: '#00C2D1' },
  contacted: { label: 'Kontaktiert', bg: 'rgba(59,130,246,0.12)', color: '#3B82F6' },
  activated: { label: 'Aktiviert',  bg: 'rgba(16,185,129,0.12)', color: '#10B981' },
  rejected:  { label: 'Abgelehnt', bg: 'rgba(239,68,68,0.12)',  color: '#EF4444' },
  spam:      { label: 'Spam',       bg: 'rgba(90,101,115,0.2)',  color: '#5A6573' },
};

export default function AdminPage() {
  const router = useRouter();
  const [session, setSession]     = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [requests, setRequests]   = useState<AccessRequest[]>([]);
  const [activating, setActivating] = useState<string | null>(null); // request_id
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

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

  // ── Fetch Requests ─────────────────────────────────────────────────────────
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

  useEffect(() => { if (session) fetchRequests(); }, [session, fetchRequests]);

  // Redirect if not logged in
  useEffect(() => {
    if (session === null) router.push('/');
  }, [session, router]);

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

  // ── Render: Guards ─────────────────────────────────────────────────────────
  if (session === undefined || (session === null)) return null;

  if (forbidden) return (
    <div style={S.center}>
      <div style={S.card}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{ fontFamily: 'var(--font-d)', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
          Kein Zugang
        </div>
        <div style={{ fontSize: 13, color: 'var(--t3)' }}>
          Dieser Bereich ist Admin-exklusiv.
        </div>
        <button style={S.btnGhost} onClick={() => router.push('/')}>← Zurück zur App</button>
      </div>
    </div>
  );

  // ── Render: Dashboard ──────────────────────────────────────────────────────
  const counts = {
    new:       requests.filter(r => r.status === 'new').length,
    activated: requests.filter(r => r.status === 'activated').length,
    total:     requests.length,
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
          <div style={S.title}>Access Requests</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={S.stat}><b style={{ color: 'var(--teal)' }}>{counts.new}</b> offen</div>
          <div style={S.stat}><b style={{ color: '#10B981' }}>{counts.activated}</b> aktiviert</div>
          <div style={S.stat}><b>{counts.total}</b> gesamt</div>
          <button style={S.btnGhost} onClick={fetchRequests}>⟳ Aktualisieren</button>
          <button style={S.btnGhost} onClick={() => router.push('/')}>← App</button>
        </div>
      </div>

      {/* Table */}
      <div style={S.tableWrap}>
        {loading ? (
          <div style={S.empty}>Lade…</div>
        ) : requests.length === 0 ? (
          <div style={S.empty}>Noch keine Anfragen eingegangen.</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                {['Datum', 'Name', 'Firma', 'E-Mail', 'Typ', 'Nachricht', 'Status', ''].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
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
                        : <span style={{ color: 'var(--t3)', fontStyle: 'italic' }}>—</span>}
                    </td>
                    <td style={S.td}>
                      <span style={{ ...S.badge, background: st.bg, color: st.color }}>{st.label}</span>
                    </td>
                    <td style={S.td}>
                      {canActivate ? (
                        <button
                          style={{ ...S.btnActivate, opacity: isActivating ? 0.6 : 1 }}
                          disabled={!!activating}
                          onClick={() => handleActivate(req)}
                        >
                          {isActivating ? 'Sende…' : 'Aktivieren →'}
                        </button>
                      ) : req.status === 'activated' ? (
                        <span style={{ ...S.mono, fontSize: 11, color: '#10B981' }}>
                          ✓ {req.linked_user_id?.slice(0, 8)}…
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* SQL Reminder */}
      <div style={S.footer}>
        <span style={S.mono}>
          Neuer Admin: <code>UPDATE user_profiles SET is_admin = TRUE WHERE email = '...';</code>
          &nbsp;· Neuer Render-Env-Var: <code>APP_URL</code>
        </span>
      </div>
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
  tableWrap: {
    margin: '28px 32px 0',
    border: '1px solid var(--border, #262C36)',
    borderRadius: 12, overflow: 'hidden',
  },
  table: {
    width: '100%', borderCollapse: 'collapse', fontSize: 13,
  },
  th: {
    padding: '10px 14px', textAlign: 'left',
    fontFamily: 'IBM Plex Mono, monospace', fontSize: 10.5, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--t3, #5A6573)',
    background: 'var(--bg-card, #161B22)', borderBottom: '1px solid var(--border, #262C36)',
    fontWeight: 600,
  },
  tr: {
    borderBottom: '1px solid var(--border, #262C36)',
    background: 'var(--bg-card, #161B22)',
  },
  td: {
    padding: '12px 14px', verticalAlign: 'middle',
  },
  mono: { fontFamily: 'IBM Plex Mono, monospace' },
  badge: {
    display: 'inline-block', padding: '3px 9px', borderRadius: 100,
    fontSize: 11, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace',
    letterSpacing: '0.03em',
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
};
