'use client';

// =============================================================================
// LoginOnboarding — Login + First-Login Onboarding Flow (LOGIN-MODAL-01)
// Port von argo_auth_onboarding_v1.html nach Next.js
//
// Rendert als vollständige Seite (kein Modal) — Gate in page.tsx schaltet
// zwischen MarketingLanding, LoginOnboarding und PageContent um.
//
// Flow:
//   'login' → supabase.signIn → 'ob1' → 'ob2' → 'ob3' → 'complete' → onComplete()
//   Returning users (onboarding_completed_at != null): 'login' → onComplete() direkt.
//
// ONBOARD-WIRE-01 (pending): Backend-Writes in handleFinish:
//   PUT  /api/v1/user-profile  (job_title, customer_type, onboarding_completed_at=NOW())
//   POST /api/v1/user-preferences  (multi-row sector_keys)
//   → Die Backend-Endpunkte existieren noch nicht; try/catch → fail-open.
// =============================================================================

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const BACKEND_PROXY = '/api/backend';

type Step = 'login' | 'ob1' | 'ob2' | 'ob3' | 'complete';

// ─── Taxonomy ────────────────────────────────────────────────────────────────
// Deckungsgleich mit user_industry_preferences CHECK-Constraint + taxonomy.py
const SECTORS = [
  { key: 'climate_tech',         name: 'Climate Tech',           col: '#10B981' },
  { key: 'energy_transition',    name: 'Energy Transition',      col: '#F59E0B' },
  { key: 'mobility',             name: 'Mobility',               col: '#3B82F6' },
  { key: 'health_tech',          name: 'Health Tech',            col: '#F472B6' },
  { key: 'biotech_pharma',       name: 'Biotech & Pharma',       col: '#A78BFA' },
  { key: 'fintech',              name: 'Fintech',                col: '#00C2D1' },
  { key: 'enterprise_software',  name: 'Enterprise Software',    col: '#3B82F6' },
  { key: 'deep_tech',            name: 'Deep Tech',              col: '#818CF8' },
  { key: 'consumer_tech',        name: 'Consumer Tech',          col: '#F472B6' },
  { key: 'industrial_tech',      name: 'Industrial Tech',        col: '#F59E0B' },
  { key: 'food_agritech',        name: 'Food & AgriTech',        col: '#10B981' },
  { key: 'space_defense',        name: 'Space & Defense',        col: '#818CF8' },
  { key: 'media_entertainment',  name: 'Media & Entertainment',  col: '#F472B6' },
  { key: 'real_estate_proptech', name: 'Real Estate & PropTech', col: '#2DD4BF' },
] as const;

type SectorKey = typeof SECTORS[number]['key'];

// Illustrative Beispiel-Companies für Live-Preview (Step 3)
const SAMPLES: Record<string, [string, number][]> = {
  climate_tech:         [['Fervo Energy', 8.1], ['Climeworks', 7.4]],
  energy_transition:    [['Northvolt', 7.9], ['Form Energy', 7.2]],
  mobility:             [['Einride', 7.0], ['Rivian', 6.6]],
  health_tech:          [['Doctolib', 7.8], ['Tempus AI', 7.3]],
  biotech_pharma:       [['BioNTech', 8.0], ['Recursion', 6.9]],
  fintech:              [['Adyen', 8.3], ['Ramp', 7.7]],
  enterprise_software:  [['Snowflake', 8.2], ['Datadog', 7.9]],
  deep_tech:            [['PsiQuantum', 7.1], ['SandboxAQ', 6.8]],
  consumer_tech:        [['Figma', 8.0], ['Notion', 7.5]],
  industrial_tech:      [['Markforged', 6.7], ['Bright Machines', 6.4]],
  food_agritech:        [['Apeel', 6.9], ['Infarm', 6.2]],
  space_defense:        [['Anduril', 8.4], ['Helsing', 7.8]],
  media_entertainment:  [['Epic Games', 7.6], ['Jellysmack', 6.5]],
  real_estate_proptech: [['Pacaso', 6.8], ['Habyt', 6.3]],
};

// ─── Mandate ─────────────────────────────────────────────────────────────────
const MANDATES = [
  { type: 'vc',            abbr: 'VC', title: 'VC-Fund',       desc: 'Deal Sourcing & Growth-Signale' },
  { type: 'pe',            abbr: 'PE', title: 'PE-Fund',        desc: 'Cashflow, Leverage, Buyout-Fit' },
  { type: 'ma_agency',     abbr: 'MA', title: 'M&A-Boutique',   desc: 'Targets, Comparables, Matching' },
  { type: 'corporate',     abbr: 'CD', title: 'Corporate Dev',  desc: 'Build-vs-Buy, Adjacencies' },
  { type: 'family_office', abbr: 'FO', title: 'Family Office',  desc: 'Exposure, Liquidität, Themen' },
  { type: 'other',         abbr: '·',  title: 'Sonstiges',      desc: 'Allgemeines Ranking' },
] as const;

type CustomerType = typeof MANDATES[number]['type'];

// ─── Component ───────────────────────────────────────────────────────────────
export default function LoginOnboarding({
  onBack,
  onComplete,
}: {
  onBack: () => void;     // Zurück zur MarketingLanding (ohne Login)
  onComplete: () => void; // Onboarding abgeschlossen → App öffnen
}) {
  const [step, setStep] = useState<Step>('login');

  // Login state
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Onboarding state
  const [role, setRole]                       = useState('');
  const [customerType, setCustomerType]       = useState<CustomerType>('vc');
  const [selectedSectors, setSelectedSectors] = useState<Set<SectorKey>>(new Set());
  const [profileData, setProfileData]         = useState<{ name: string; company: string } | null>(null);

  // ── Login ────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setLoginLoading(true);
    setLoginError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setLoginError(
        error.message === 'Invalid login credentials'
          ? 'E-Mail oder Passwort falsch.'
          : error.message,
      );
      setLoginLoading(false);
      return;
    }

    // ONBOARD-WIRE-01: Prüfe ob Onboarding bereits abgeschlossen.
    // Stub: GET /api/v1/user-profile — Route existiert noch nicht → catch → Onboarding zeigen.
    // Wenn Route deployed: onboarding_completed_at != null → returning user → onComplete() direkt.
    try {
      const token = data.session?.access_token;
      const r = await fetch(`${BACKEND_PROXY}/api/v1/user-profile`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (r.ok) {
        const p = await r.json();
        if (p.onboarding_completed_at) {
          // Returning user — Onboarding überspringen
          onComplete();
          return;
        }
        // Prefill aus user_profiles (best-effort)
        if (p.full_name || p.company_name) {
          setProfileData({ name: p.full_name ?? '', company: p.company_name ?? '' });
        }
        if (p.customer_type) setCustomerType(p.customer_type as CustomerType);
      }
    } catch {
      // Route nicht deployed → fail-open: Onboarding immer zeigen (First-Login-Annahme)
    }

    setLoginLoading(false);
    setStep('ob1');
  };

  // ── Sector toggle ────────────────────────────────────────────────────────
  const toggleSector = (key: SectorKey) => {
    setSelectedSectors(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ── Live Preview tiles ───────────────────────────────────────────────────
  const previewTiles = () => {
    if (selectedSectors.size === 0) return [];
    const tiles: { name: string; score: number; sec: typeof SECTORS[number] }[] = [];
    selectedSectors.forEach(k => {
      const sec = SECTORS.find(s => s.key === k)!;
      (SAMPLES[k] ?? []).forEach(([name, score]) => tiles.push({ name, score, sec }));
    });
    return tiles.sort((a, b) => b.score - a.score).slice(0, 5);
  };

  // ── Finish (Step 3 submit) — ONBOARD-WIRE-01 ─────────────────────────────
  const handleFinish = async () => {
    // Fail-open: Schreibfehler blockieren den User nicht — Onboarding trotzdem abschließen.
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      await Promise.all([
        fetch(`${BACKEND_PROXY}/api/v1/user-profile`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            job_title:                role.trim() || null,
            customer_type:            customerType,
            mark_onboarding_complete: true,
          }),
        }),
        fetch(`${BACKEND_PROXY}/api/v1/user-preferences`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ sector_keys: Array.from(selectedSectors) }),
        }),
      ]);
    } catch {
      // Fail-open: Netzwerkfehler oder Route nicht deployed → trotzdem weiter
    }
    setStep('complete');
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const stepNum = ({ ob1: 1, ob2: 2, ob3: 3, complete: 3 } as Record<string, number>)[step] ?? 0;
  const profileName    = profileData?.name    ?? '';
  const profileCompany = profileData?.company ?? '';
  const firstName      = profileName.split(' ')[0] || '';

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="lo-root">

      {/* Animated Background */}
      <div className="lo-bg" aria-hidden="true">
        <div className="lo-bg-grid" />
        <div className="lo-aurora lo-a1" />
        <div className="lo-aurora lo-a2" />
      </div>

      {/* ── VIEW: LOGIN ── */}
      {step === 'login' && (
        <div className="lo-login-wrap">
          <div className="lo-brand lo-brand-center">
            <span className="lo-glyph">A</span>Argo<span>Analytics</span>
          </div>
          <div className="lo-login-box">
            <h1>Willkommen zurück</h1>
            <p className="lo-lede">Melde dich an, um deine Märkte weiterzuverfolgen.</p>

            <div className="lo-field">
              <label>E-Mail</label>
              <input
                type="email" autoComplete="email" value={email}
                placeholder="partner@meridian-capital.com"
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div className="lo-field">
              <label>Passwort</label>
              <input
                type="password" autoComplete="current-password" value={password}
                placeholder="••••••••••"
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>

            {loginError && <div className="lo-err">{loginError}</div>}

            <button
              className="lo-btn lo-btn-primary lo-btn-full"
              type="button"
              disabled={loginLoading || !email.trim() || !password}
              onClick={handleLogin}
            >
              {loginLoading ? 'Anmelden…' : 'Anmelden →'}
            </button>

            <div className="lo-divider">ODER</div>

            <div className="lo-login-foot">
              <button className="lo-linkbtn" type="button" onClick={onBack}>
                ← Zurück
              </button>
              <span>
                Noch keinen Zugang?{' '}
                <button className="lo-linkbtn lo-linkbtn-teal" type="button" onClick={onBack}>
                  Request Access
                </button>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW: ONBOARDING (Steps 1–3) ── */}
      {(step === 'ob1' || step === 'ob2' || step === 'ob3') && (
        <div className="lo-ob">

          {/* Top Bar */}
          <div className="lo-ob-top">
            <div className="lo-brand">
              <span className="lo-glyph">A</span>Argo<span>Analytics</span>
            </div>
            <div className="lo-rail">
              {[1, 2, 3].map(n => (
                <span key={n} className={`lo-seg${stepNum >= n ? ' lo-seg-done' : ''}`} />
              ))}
              <span className="lo-rail-lbl">Schritt {stepNum} / 3</span>
            </div>
          </div>

          <div className="lo-ob-body">

            {/* ── Step 1: Identität ── */}
            {step === 'ob1' && (
              <div className="lo-step">
                <div className="lo-eyebrow">// Setup · Identität</div>
                <h2>
                  Willkommen bei Argo{firstName ? `, ${firstName}` : ''}.
                </h2>
                <p className="lo-ob-lede">
                  {profileName
                    ? 'Wir haben deine Eckdaten aus der Freischaltung übernommen. Stimmt das so?'
                    : 'Stell dich kurz vor — damit wir deinen Feed richtig zuschneiden können.'}
                </p>

                {(profileName || profileCompany) && (
                  <div className="lo-chips">
                    {profileName && (
                      <span className="lo-chip">
                        <span className="lo-chip-k">Name</span>
                        <span className="lo-chip-v">{profileName}</span>
                      </span>
                    )}
                    {profileCompany && (
                      <span className="lo-chip">
                        <span className="lo-chip-k">Firma</span>
                        <span className="lo-chip-v">{profileCompany}</span>
                      </span>
                    )}
                  </div>
                )}

                <div className="lo-field lo-field-narrow">
                  <label>Deine Rolle (optional)</label>
                  <input
                    type="text" value={role}
                    placeholder="z.B. Partner, Associate, Head of Corp Dev"
                    onChange={e => setRole(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && setStep('ob2')}
                  />
                </div>

                <div className="lo-actions">
                  <button className="lo-btn lo-btn-primary" type="button" onClick={() => setStep('ob2')}>
                    Weiter →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Mandat ── */}
            {step === 'ob2' && (
              <div className="lo-step">
                <div className="lo-eyebrow">// Setup · Dein Mandat</div>
                <h2>Aus welcher Perspektive schaust du auf Deals?</h2>
                <p className="lo-ob-lede">
                  Das bestimmt, wie Argo Unternehmen für dich gewichtet —
                  Wachstumssignale, Cashflow, Comparables oder Adjacencies.
                </p>

                <div className="lo-mandate-grid">
                  {MANDATES.map(m => (
                    <button
                      key={m.type}
                      type="button"
                      className={`lo-mandate${customerType === m.type ? ' lo-mandate-sel' : ''}`}
                      onClick={() => setCustomerType(m.type)}
                    >
                      <div className={`lo-mi${customerType === m.type ? ' lo-mi-sel' : ''}`}>
                        {m.abbr}
                      </div>
                      <h4>{m.title}</h4>
                      <p>{m.desc}</p>
                      {customerType === m.type && <span className="lo-tick">✓</span>}
                    </button>
                  ))}
                </div>

                <div className="lo-actions">
                  <button className="lo-btn lo-btn-ghost" type="button" onClick={() => setStep('ob1')}>
                    ← Zurück
                  </button>
                  <button className="lo-btn lo-btn-primary" type="button" onClick={() => setStep('ob3')}>
                    Weiter →
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Sektoren + Live Preview ── */}
            {step === 'ob3' && (
              <div className="lo-step lo-step-wide">
                <div className="lo-eyebrow">// Setup · Deine Sektoren</div>
                <h2>Welche Märkte willst du im Blick haben?</h2>
                <p className="lo-ob-lede">
                  Wähle die Sektoren, die zu deiner These passen. Dein Explore-Feed
                  orientiert sich daran — du kannst es jederzeit ändern.
                </p>

                <div className="lo-sec-layout">
                  {/* Sektor-Grid */}
                  <div className="lo-sector-grid">
                    {SECTORS.map(s => (
                      <button
                        key={s.key}
                        type="button"
                        className={`lo-sector${selectedSectors.has(s.key) ? ' lo-sector-sel' : ''}`}
                        style={{ '--scol': s.col } as React.CSSProperties}
                        onClick={() => toggleSector(s.key)}
                      >
                        <span className="lo-sdot" />
                        <span className="lo-snm">{s.name}</span>
                        <span className="lo-sck">{selectedSectors.has(s.key) ? '✓' : ''}</span>
                      </button>
                    ))}
                  </div>

                  {/* Live Preview */}
                  <div className="lo-preview">
                    <div className="lo-pv-bar">
                      <span className="lo-pv-pulse" />
                      argo://explore / live-preview
                    </div>
                    <div className="lo-pv-body">
                      {previewTiles().length === 0 ? (
                        <div className="lo-pv-empty">
                          Wähle Sektoren —<br />dein Explore-Feed baut sich live auf.
                        </div>
                      ) : (
                        previewTiles().map((t, i) => (
                          <div key={i} className="lo-pv-tile">
                            <span className="lo-pv-dot" style={{ background: t.sec.col }} />
                            <div className="lo-pv-main">
                              <div className="lo-pv-name">{t.name}</div>
                              <div className="lo-pv-sec">{t.sec.name}</div>
                            </div>
                            <div className="lo-pv-score">{t.score.toFixed(1)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* ONBOARD-SECTOR-GUIDANCE-01: Inline-Hinweis je Sektoranzahl */}
                {selectedSectors.size > 0 && (() => {
                  const n = selectedSectors.size;
                  const hint =
                    n <= 2 ? { col: '#F59E0B', text: 'Für einen fokussierten Feed empfehlen wir 3–5 Sektoren.' } :
                    n <= 5 ? { col: '#10B981', text: 'Gute Auswahl — fokussiert genug für starke Signale.' } :
                             { col: '#F59E0B', text: 'Mehr als 5 Sektoren können den Feed verwässern.' };
                  return (
                    <div className="lo-sec-hint">
                      <span className="lo-sec-hint-dot" style={{ background: hint.col }} />
                      {hint.text}
                    </div>
                  );
                })()}

                <div className="lo-actions">
                  <button className="lo-btn lo-btn-ghost" type="button" onClick={() => setStep('ob2')}>
                    ← Zurück
                  </button>
                  <button
                    className="lo-btn lo-btn-primary"
                    type="button"
                    disabled={selectedSectors.size === 0}
                    onClick={handleFinish}
                  >
                    Fertig &amp; Argo öffnen →
                  </button>
                  <span className="lo-ob-count">
                    <b>{selectedSectors.size}</b> ausgewählt
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VIEW: COMPLETE ── */}
      {step === 'complete' && (
        <div className="lo-complete-wrap">
          <div className="lo-complete">
            <div className="lo-check">✓</div>
            <h1>Dein Explore ist bereit.</h1>
            <p className="lo-complete-lede">
              Wir haben deinen Feed auf dein Mandat und deine Sektoren zugeschnitten. Los geht's.
            </p>

            <div className="lo-pills">
              {(() => {
                const m = MANDATES.find(m => m.type === customerType);
                return (
                  <span className="lo-pill">
                    <span className="lo-pill-dot" style={{ background: 'var(--lo-cyan)' }} />
                    {m?.title}
                  </span>
                );
              })()}
              {Array.from(selectedSectors).map(k => {
                const s = SECTORS.find(sec => sec.key === k)!;
                return (
                  <span key={k} className="lo-pill">
                    <span className="lo-pill-dot" style={{ background: s.col }} />
                    {s.name}
                  </span>
                );
              })}
            </div>

            <button
              className="lo-btn lo-btn-primary lo-btn-lg"
              type="button"
              onClick={onComplete}
            >
              Argo öffnen →
            </button>
          </div>
        </div>
      )}

      {/* ── Styles (scoped .lo-*) ── */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

        .lo-root {
          --lo-bg:    #0D1117;
          --lo-card:  #161B22;
          --lo-elev:  #1F242C;
          --lo-border:#262C36;
          --lo-cyan:  #00C2D1;
          --lo-blue:  #3B82F6;
          --lo-emerald:#10B981;
          --lo-vermillion:#EF4444;
          --lo-text:  #E6EDF3;
          --lo-dim:   #8B949E;
          --lo-mute:  #5A6573;
          position: relative;
          background: var(--lo-bg);
          color: var(--lo-text);
          font-family: 'Manrope', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }
        .lo-root * { margin: 0; padding: 0; box-sizing: border-box; }

        /* ── Animated Background ── */
        .lo-bg { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
        .lo-bg-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(0,194,209,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,194,209,0.03) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 30%, transparent 100%);
        }
        .lo-aurora { position: absolute; border-radius: 50%; filter: blur(90px); opacity: .5; }
        .lo-a1 { width:520px; height:520px; background:radial-gradient(circle,rgba(0,194,209,.22),transparent 70%); top:-160px; left:-120px; animation:loA1 22s ease-in-out infinite; }
        .lo-a2 { width:460px; height:460px; background:radial-gradient(circle,rgba(59,130,246,.18),transparent 70%); bottom:-180px; right:-120px; animation:loA2 26s ease-in-out infinite; }
        @keyframes loA1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(80px,60px)} }
        @keyframes loA2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-70px,-50px)} }
        @keyframes loIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        @keyframes loPop { from{transform:scale(.5);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes loPulse { 0%,100%{opacity:1} 50%{opacity:.35} }

        /* ── Brand ── */
        .lo-brand {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 11px;
          font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 20px; letter-spacing: -0.02em;
          color: var(--lo-text);
        }
        .lo-brand span { color: var(--lo-dim); font-weight: 500; }
        .lo-brand-center { justify-content: center; font-size: 23px; margin-bottom: 34px; }
        .lo-glyph {
          width: 30px; height: 30px; border-radius: 7px;
          background: linear-gradient(135deg, var(--lo-cyan), var(--lo-blue));
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; color: var(--lo-bg); font-weight: 900;
          box-shadow: 0 0 18px rgba(0,194,209,0.4); flex-shrink: 0;
        }

        /* ── Buttons ── */
        .lo-btn {
          font-family: 'Manrope', sans-serif; font-weight: 700; font-size: 14.5px;
          border: none; border-radius: 10px; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          transition: all .2s;
        }
        .lo-btn-primary { background: var(--lo-cyan); color: var(--lo-bg); padding: 13px 22px; }
        .lo-btn-primary:hover:not(:disabled) { background: #1ad0de; box-shadow: 0 0 24px rgba(0,194,209,.45); transform: translateY(-1px); }
        .lo-btn-primary:disabled { background: var(--lo-elev); color: var(--lo-mute); cursor: not-allowed; transform: none; box-shadow: none; }
        .lo-btn-ghost { background: transparent; color: var(--lo-dim); padding: 13px 18px; border: 1px solid var(--lo-border); }
        .lo-btn-ghost:hover { border-color: var(--lo-cyan); color: var(--lo-cyan); }
        .lo-btn-full { width: 100%; padding: 14px; }
        .lo-btn-lg { padding: 15px 32px; font-size: 15px; }

        .lo-linkbtn { background: none; border: none; cursor: pointer; font-family: 'Manrope', sans-serif; font-size: 13.5px; color: var(--lo-dim); transition: color .2s; }
        .lo-linkbtn:hover { color: var(--lo-text); }
        .lo-linkbtn-teal { color: var(--lo-cyan); font-weight: 600; }
        .lo-linkbtn-teal:hover { color: #1ad0de; }

        /* ── Fields ── */
        .lo-field { margin-bottom: 16px; }
        .lo-field label { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600; letter-spacing: 0.02em; color: var(--lo-dim); margin-bottom: 7px; }
        .lo-field input { width: 100%; background: var(--lo-bg); border: 1px solid var(--lo-border); border-radius: 10px; padding: 12px 14px; color: var(--lo-text); font-family: 'Manrope', sans-serif; font-size: 14.5px; outline: none; transition: border-color .2s; }
        .lo-field input:focus { border-color: var(--lo-cyan); }
        .lo-field-narrow { max-width: 380px; }
        .lo-err { background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); color: var(--lo-vermillion); border-radius: 9px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
        .lo-divider { display: flex; align-items: center; gap: 14px; margin: 24px 0; color: var(--lo-mute); font-size: 12px; font-family: 'IBM Plex Mono', monospace; }
        .lo-divider::before, .lo-divider::after { content: ''; flex: 1; height: 1px; background: var(--lo-border); }

        /* ── LOGIN VIEW ── */
        .lo-login-wrap { position: relative; z-index: 1; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px; animation: loIn .5s cubic-bezier(.2,.7,.2,1); }
        .lo-login-box { width: 100%; max-width: 400px; background: var(--lo-card); border: 1px solid var(--lo-border); border-radius: 18px; padding: 36px 34px; box-shadow: 0 40px 90px -40px rgba(0,0,0,.8); }
        .lo-login-box h1 { font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 26px; letter-spacing: -0.025em; margin-bottom: 6px; }
        .lo-lede { font-size: 14px; color: var(--lo-dim); margin-bottom: 26px; }
        .lo-login-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 18px; font-size: 13.5px; color: var(--lo-dim); gap: 12px; flex-wrap: wrap; }

        /* ── ONBOARDING SHELL ── */
        .lo-ob { position: relative; z-index: 1; min-height: 100vh; display: flex; flex-direction: column; animation: loIn .5s cubic-bezier(.2,.7,.2,1); }
        .lo-ob-top { display: flex; align-items: center; justify-content: space-between; padding: 22px 32px; border-bottom: 1px solid var(--lo-border); background: rgba(13,17,23,.7); backdrop-filter: blur(10px); }
        .lo-rail { display: flex; align-items: center; gap: 10px; }
        .lo-seg { width: 42px; height: 4px; border-radius: 2px; background: var(--lo-elev); transition: background .35s; }
        .lo-seg-done { background: var(--lo-cyan); }
        .lo-rail-lbl { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--lo-mute); margin-left: 6px; }
        .lo-ob-body { flex: 1; display: flex; align-items: flex-start; justify-content: center; padding: 54px 24px 90px; }
        .lo-step { width: 100%; max-width: 760px; animation: loIn .45s cubic-bezier(.2,.7,.2,1); }
        .lo-step-wide { max-width: 960px; }
        .lo-eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--lo-cyan); margin-bottom: 14px; }
        .lo-step h2 { font-family: 'Archivo', sans-serif; font-weight: 800; font-size: clamp(28px,4vw,40px); letter-spacing: -0.03em; line-height: 1.08; margin-bottom: 12px; }
        .lo-ob-lede { font-size: 16px; color: var(--lo-dim); max-width: 54ch; margin-bottom: 34px; }
        .lo-actions { display: flex; align-items: center; gap: 12px; margin-top: 38px; flex-wrap: wrap; }
        .lo-ob-count { margin-left: auto; font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: var(--lo-mute); }
        .lo-ob-count b { color: var(--lo-cyan); }

        /* Step 1 — Identity chips */
        .lo-chips { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
        .lo-chip { display: inline-flex; align-items: center; gap: 10px; background: var(--lo-card); border: 1px solid var(--lo-border); border-radius: 11px; padding: 11px 16px; font-size: 14px; }
        .lo-chip-k { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--lo-mute); text-transform: uppercase; letter-spacing: 0.05em; }
        .lo-chip-v { font-weight: 600; color: var(--lo-text); }

        /* Step 2 — Mandate grid */
        .lo-mandate-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
        .lo-mandate { text-align: left; background: var(--lo-card); border: 1px solid var(--lo-border); border-radius: 14px; padding: 20px; cursor: pointer; transition: all .2s; position: relative; }
        .lo-mandate:hover { border-color: rgba(0,194,209,.5); transform: translateY(-2px); }
        .lo-mandate-sel { border-color: var(--lo-cyan); background: linear-gradient(165deg, rgba(0,194,209,.08), var(--lo-card)); }
        .lo-mi { width: 38px; height: 38px; border-radius: 10px; background: var(--lo-elev); display: flex; align-items: center; justify-content: center; font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 15px; color: var(--lo-cyan); margin-bottom: 14px; transition: all .2s; }
        .lo-mi-sel { background: var(--lo-cyan); color: var(--lo-bg); }
        .lo-mandate h4 { font-family: 'Archivo', sans-serif; font-weight: 700; font-size: 16px; margin-bottom: 5px; color: var(--lo-text); }
        .lo-mandate p { font-size: 12.5px; color: var(--lo-dim); line-height: 1.4; }
        .lo-tick { position: absolute; top: 16px; right: 16px; width: 20px; height: 20px; border-radius: 50%; background: var(--lo-cyan); color: var(--lo-bg); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; }

        /* Step 3 — Sector grid */
        .lo-sec-layout { display: grid; grid-template-columns: 1.3fr 1fr; gap: 28px; align-items: start; }
        .lo-sector-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 10px; }
        .lo-sector { display: flex; align-items: center; gap: 11px; background: var(--lo-card); border: 1px solid var(--lo-border); border-radius: 11px; padding: 13px 14px; cursor: pointer; transition: all .18s; text-align: left; width: 100%; }
        .lo-sector:hover { border-color: var(--scol, var(--lo-cyan)); }
        .lo-sector-sel { border-color: var(--scol, var(--lo-cyan)); background: var(--lo-elev); }
        .lo-sdot { width: 11px; height: 11px; border-radius: 50%; background: var(--scol, var(--lo-cyan)); flex-shrink: 0; transition: box-shadow .2s; }
        .lo-sector-sel .lo-sdot { box-shadow: 0 0 10px var(--scol, var(--lo-cyan)); }
        .lo-snm { font-size: 13.5px; font-weight: 600; flex: 1; color: var(--lo-text); }
        .lo-sck { width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid var(--lo-border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: var(--lo-bg); flex-shrink: 0; transition: all .18s; }
        .lo-sector-sel .lo-sck { background: var(--scol, var(--lo-cyan)); border-color: var(--scol, var(--lo-cyan)); }

        /* Live Preview */
        .lo-preview { background: var(--lo-card); border: 1px solid var(--lo-border); border-radius: 16px; overflow: hidden; position: sticky; top: 24px; }
        .lo-pv-bar { padding: 11px 16px; border-bottom: 1px solid var(--lo-border); background: var(--lo-elev); font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: var(--lo-mute); display: flex; align-items: center; gap: 8px; }
        .lo-pv-pulse { width: 7px; height: 7px; border-radius: 50%; background: var(--lo-emerald); box-shadow: 0 0 8px var(--lo-emerald); animation: loPulse 2s infinite; flex-shrink: 0; }
        .lo-pv-body { padding: 16px; min-height: 240px; }
        .lo-pv-empty { color: var(--lo-mute); font-size: 13px; text-align: center; padding: 60px 20px; line-height: 1.6; }
        .lo-pv-tile { display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--lo-border); border-radius: 11px; margin-bottom: 9px; background: var(--lo-bg); animation: loIn .35s ease; }
        .lo-pv-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
        .lo-pv-main { flex: 1; min-width: 0; }
        .lo-pv-name { font-family: 'Archivo', sans-serif; font-weight: 700; font-size: 14px; color: var(--lo-text); }
        .lo-pv-sec { font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--lo-mute); text-transform: uppercase; letter-spacing: 0.03em; }
        .lo-pv-score { font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 17px; color: var(--lo-emerald); }

        /* ── COMPLETE VIEW ── */
        .lo-complete-wrap { position: relative; z-index: 1; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px 24px; text-align: center; animation: loIn .5s cubic-bezier(.2,.7,.2,1); }
        .lo-complete { max-width: 540px; }
        .lo-check { width: 66px; height: 66px; border-radius: 50%; margin: 0 auto 26px; background: rgba(16,185,129,.12); border: 1px solid rgba(16,185,129,.35); display: flex; align-items: center; justify-content: center; font-size: 32px; color: var(--lo-emerald); animation: loPop .5s cubic-bezier(.2,1.3,.4,1); }
        .lo-complete h1 { font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 36px; letter-spacing: -0.03em; margin-bottom: 14px; }
        .lo-complete-lede { font-size: 17px; color: var(--lo-dim); margin-bottom: 28px; line-height: 1.5; }
        .lo-pills { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 34px; }
        .lo-pill { font-family: 'IBM Plex Mono', monospace; font-size: 12px; padding: 7px 13px; border-radius: 100px; background: var(--lo-card); border: 1px solid var(--lo-border); display: inline-flex; align-items: center; gap: 7px; color: var(--lo-text); }
        .lo-pill-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

        /* Sector guidance hint */
        .lo-sec-hint { display: flex; align-items: center; gap: 8px; margin-top: 20px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--lo-dim); animation: loIn .25s ease; }
        .lo-sec-hint-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

        /* ── Responsive ── */
        @media (max-width: 780px) {
          .lo-mandate-grid { grid-template-columns: 1fr; }
          .lo-sec-layout { grid-template-columns: 1fr; }
          .lo-sector-grid { grid-template-columns: 1fr 1fr; }
          .lo-preview { position: static; }
          .lo-ob-top { padding: 16px 20px; }
          .lo-login-box { padding: 28px 24px; }
          .lo-complete h1 { font-size: 28px; }
        }
      `}</style>
    </div>
  );
}
