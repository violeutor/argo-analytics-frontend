'use client';

// TopNav (S85) — extrahiert aus main.tsx (vorher: PageContent-Header, nur auf
// der "/"-Route sichtbar). Rendert jetzt in layout.tsx, also auf jeder Route
// inkl. Company-Detail-Seite — das war der eigentliche Zweck des Umbaus
// (NOTIFICATION-BELL-MISSING-01: Bell soll überall gleich aussehen, nicht nur
// auf der Research-Root).
//
// Tab-Navigation ist jetzt URL-getrieben (?tab=research|watchlist|explore)
// statt lokaler State — sonst hätte diese Komponente auf der Company-Detail-
// Seite keinen Zugriff auf main.tsx' navTab-State. Klick auf einen Tab
// navigiert immer nach "/", auch wenn man z.B. auf einer Company-Detail-Seite
// steht. Aktiver Tab wird nur hervorgehoben, wenn pathname === "/".
//
// Eigener <style>-Block inkl. :root{...ROOT_VARS} + FONT_IMPORT: diese
// Komponente kann auf jeder Route zuerst mounten, kann sich also nicht darauf
// verlassen, dass main.tsx (nur auf "/") die CSS-Custom-Properties schon
// definiert hat. Doppelte :root-Definition mit main.tsx ist harmlos (identische
// Werte, keine Kollision), aber bewusst in Kauf genommen statt eine dritte
// Datei nur für globale CSS-Vars anzulegen.

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ROOT_VARS, FONT_IMPORT } from '@/lib/tokens';
import { useAuth } from '@/lib/AuthProvider';
import { useNotifications } from '@/lib/NotificationsProvider';

type NavTab = 'research' | 'watchlist' | 'explore';

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const { notifications, seenIds, unreadCount, forceRefreshNotifications, markAllRead, markOneRead } = useNotifications();

  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Vor dem ersten Auth-Check (session === undefined) und wenn ausgeloggt
  // (session === null): keine Nav — deckt sich mit dem bisherigen Verhalten
  // (Header erschien nie auf Landing/Onboarding, nur innerhalb der App).
  if (!session) return null;

  const activeTab: NavTab | null = pathname === '/'
    ? ((searchParams?.get('tab') as NavTab) ?? 'research')
    : null;

  const goTab = (tab: NavTab) => router.push(`/?tab=${tab}`);

  const catLabels: Record<string, string> = {
    funding: 'Finanzierung', partnership: 'Partnerschaft', ipo_progress: 'IPO',
    market_growth: 'Marktwachstum', patent: 'Patent/IP', investor_entry: 'Investor',
    regulatory: 'Regulatorik', negative_earnings: 'Earnings',
    supply_chain: 'Lieferkette', insider_selling: 'Insider-Verkauf',
    insider_buying: 'Insider-Kauf', customer_concentration: 'Kundenkonzentration',
    filing: 'Transparenz', ownership_entry: 'Ownership', general_news: 'News',
  };

  return (
    <>
      <style>{`
        ${FONT_IMPORT}
        *{box-sizing:border-box;margin:0;padding:0}
        :root{${ROOT_VARS} --violet:#A78BFA;--rose:#F472B6;--indigo:#818CF8;--teal-g:#2DD4BF;}
        body{background:var(--bg);color:var(--t1);font-family:var(--font-b);font-size:14px;min-height:100vh}

        /* ── Nav (Redesign S59, extrahiert S85) ── */
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
      `}</style>

      <nav>
        <div className="nav-logo" onClick={() => goTab('research')}>
          <div className="nav-logo-icon">A</div>
          <div>
            <div className="nav-logo-text">Argo Analytics</div>
            <div className="nav-logo-sub">Investment Intelligence</div>
          </div>
        </div>

        <div className="nav-tabs">
          <button
            className={`nav-tab${activeTab === 'research' ? ' active' : ''}`}
            onClick={() => goTab('research')}
          >
            Research
          </button>
          <button
            className={`nav-tab${activeTab === 'watchlist' ? ' active' : ''}`}
            onClick={() => goTab('watchlist')}
          >
            Watchlist
          </button>
          <button
            className={`nav-tab${activeTab === 'explore' ? ' active' : ''}`}
            onClick={() => goTab('explore')}
          >
            Explore
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifySelf: 'end' }}>
          {/* Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setNotifOpen(o => !o)}
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

            {notifOpen && (
              <>
                <div onClick={() => setNotifOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 190 }} />
                <div style={{
                  position: 'absolute', top: 42, right: 0, width: 360,
                  background: 'var(--bg-card)', border: '1px solid var(--border-md)',
                  borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  zIndex: 200, overflow: 'hidden',
                }} onClick={e => e.stopPropagation()}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>
                      Signals · Watchlist
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        onClick={forceRefreshNotifications}
                        title="Jetzt aktualisieren"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--t3)', padding: 0, lineHeight: 1 }}
                      >
                        ⟳
                      </button>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--teal)', padding: 0 }}
                        >
                          Alle gelesen
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', fontSize: 12, color: 'var(--t3)' }}>
                        Keine neuen Signals
                      </div>
                    ) : (
                      notifications.slice(0, 20).map(n => {
                        const seen = seenIds.has(n.id);
                        const dotCol = n.direction === 'positive' ? 'var(--teal)'
                                     : n.direction === 'negative' ? 'var(--red)'
                                     : 'var(--t3)';
                        const catLabel = n.signal_category ? (catLabels[n.signal_category] ?? n.signal_category) : null;
                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              markOneRead(n.id);
                              setNotifOpen(false);
                              router.push(`/company/${encodeURIComponent(n.company_name)}?from=signal&back=/`);
                            }}
                            style={{
                              padding: '9px 14px', borderBottom: '1px solid var(--border)',
                              background: seen ? 'transparent' : 'rgba(0,212,160,0.03)',
                              cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start',
                            }}
                          >
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotCol, marginTop: 5, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', marginBottom: 2 }}>
                                {n.company_name}
                                {!seen && (
                                  <span style={{ marginLeft: 6, background: 'var(--teal)', color: '#0D1117', borderRadius: 99, fontSize: 9, fontWeight: 700, padding: '1px 5px' }}>NEU</span>
                                )}
                                {catLabel && (
                                  <span style={{ marginLeft: 6, background: 'var(--bg-hover)', color: 'var(--t3)', borderRadius: 99, fontSize: 9, fontWeight: 600, padding: '1px 5px' }}>{catLabel}</span>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                    <div style={{ padding: '8px 14px', textAlign: 'center', fontSize: 11, color: 'var(--t3)', borderTop: '1px solid var(--border)' }}>
                      + {notifications.length - 20} weitere · Watchlist öffnen
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* User-Avatar — Anmelden-Button-Zweig entfällt: durch den frühen
              !session-Return oben ist session hier immer gesetzt. Im
              main.tsx-Original war dieser Zweig bereits faktisch tot
              (PageContent mountete ohnehin nur bei vorhandener Session). */}
          <div style={{ position: 'relative' }}>
            <div className="nav-user-av" title="Konto" onClick={() => setUserMenuOpen(o => !o)}>
              {(session.user?.email?.[0] ?? 'U').toUpperCase()}
            </div>
            {userMenuOpen && (
              <>
                <div onClick={() => setUserMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 190 }} />
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
                    style={{ padding: '11px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--t2)', transition: 'background .1s, color .1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--t1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--t2)'; }}
                  >
                    Abmelden
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
