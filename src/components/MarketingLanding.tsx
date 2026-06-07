'use client';

// =============================================================================
// MarketingLanding — öffentliche Startseite (LANDING-01 + ACCESS-MODAL-01 + LANDING-I18N-01)
// Session 58 · Next.js-Portierung von argo_landing_v1.html
//
// - Wird nur für AUSGELOGGTE Besucher gerendert (Gate in page.tsx).
// - Eingeloggte sehen die App (PageContent) — unverändert.
// - Styles gescopt unter .ml-root → keine Kollision mit globalem App-CSS.
// - Request-Access-POST → /api/backend/api/v1/access-request (Path B).
//   Voll funktional sobald MAIN-ROUTER-01 (Router registriert) + MAIL-SETUP-01 stehen.
// - LANDING-SCREENSHOT-01: Hero-Terminal-Mock ist illustrativ (Fervo-Zahlen Fake) →
//   später durch echten Screenshot ersetzen.
// - onLogin() öffnet den bestehenden LoginModal (aus page.tsx).
// =============================================================================

import { useState } from 'react';

const BACKEND_PROXY = '/api/backend';

type Lang = 'de' | 'en';

// ─── i18n ────────────────────────────────────────────────────────────────────
const T = {
  de: {
    nav: { solutions: 'Lösungen', platform: 'Plattform', login: 'Login', access: 'Request Access', toggle: 'EN' },
    hero: {
      pill: 'GESCHLOSSENE BETA · NUR AUF EINLADUNG',
      titleA: 'Finance-Intelligence für die,', titleAccent: 'zuerst', titleB: 'die ', titleC: ' wissen müssen.',
      sub: 'Argo screent jedes Unternehmen weltweit — listed und private, US und Europa — in einem Klick. Markt-Exposure, Beta-Modellierung und Deal-Signale aus automatisierten Daten-Pipelines. Keine manuelle Pflege.',
      cta: 'Request Access →', login: 'Login', note: '// Aktuell für ausgewählte Fonds & Boutiquen',
    },
    term: {
      badge: 'RESOLVED', m1: 'TAM Segment', m2: 'Sector Beta', m3: 'Last Round', m4: 'Argo Score',
      signals: '// Live Signals',
      s1a: 'Funding momentum', s1b: '— Series E, +38% Bewertung YoY',
      s2a: 'Patent filing', s2b: '— 4 neue EPO-Einträge Q1',
      s3a: 'Headcount', s3b: '— +120 in 90 Tagen',
      s4a: 'Adjacency', s4b: '— 6 vergleichbare Targets im Sektor',
    },
    seg: {
      eyebrow: '// Lösungen nach Mandat',
      title: 'Ein Datenmodell. Drei Perspektiven auf denselben Deal.',
      lead: 'Dieselbe Pipeline, anders geschnitten — je nachdem, ob du Targets suchst, vergleichst oder strategisch einordnest.',
      vcTag: '// Phase 1 · Live', vcTitle: 'Für VC-Funds',
      vc: [
        ['Deal Sourcing', '— jedes Unternehmen weltweit in einem Klick, listed und private.'],
        ['Market Sizing', '— TAM-Segmente und Sektor-Beta automatisch angereichert.'],
        ['Frühe Signale', '— Funding-Momentum, Patente, Headcount, bevor es im Markt ankommt.'],
        ['Competitive Landscape', '— vergleichbare Targets im selben Sektor in Sekunden.'],
      ],
      maTag: '// Phase 2', maTitle: 'Für M&A-Boutiquen',
      ma: [
        ['Target Identification', '— kuratierte Long-Lists per Sektor und Region.'],
        ['Comparables', '— Peer-Sets mit Kennzahlen und Bewertung auf Knopfdruck.'],
        ['Buyer-Seller-Matching', '— strategische Käufer entlang von Adjacencies.'],
      ],
      cdTag: '// Phase 4', cdTitle: 'Für Corporate Development',
      cd: [
        ['Build-vs-Buy', '— Marktlücken und Übernahmekandidaten nebeneinander.'],
        ['Adjacency Mapping', '— angrenzende Märkte und Bedrohungen sichtbar machen.'],
        ['Competitive Intelligence', '— Wettbewerber laufend beobachtet, nicht einmal recherchiert.'],
      ],
      alsoA: 'Auch im Einsatz bei', alsoB: 'PE-Funds', alsoC: 'und', alsoD: 'Family Offices / Asset Managern',
      alsoE: '— dieselbe Engine, eigene Sicht.',
    },
    cap: {
      eyebrow: '// Plattform-Prinzipien',
      title: 'Datenarchitektur löst Datenlücken. Nie das UI.',
      lead: 'Jedes Feld zeigt seine Quelle und seine Berechnungsbasis. Was fehlt, wird berechnet — nicht von Hand gepflegt.',
      items: [
        ['One-Click Company Search', 'Nicht in der Datenbank? Wird automatisch angelegt und vollständig angereichert. Kein leeres Profil.'],
        ['Cross-Industry', 'Kein Sektor-Lock. 14 Sektoren, 75 Kategorien — von Climate Tech bis Space & Defense.'],
        ['Public + Private Markets', 'Listed und unlisted gleichwertig. EDGAR, Wikidata, BaFin, Damodaran — eine konsolidierte Sicht.'],
        ['Entity Resolution', 'Wikidata-first Auflösung mit Töchter-Erkennung. Der richtige Rechtsträger, nicht der ähnlichste Name.'],
        ['Beta & Market Exposure', '252-Tage-Markt-Beta plus Damodaran-Sektor-Referenz. Comparability über Branchen hinweg.'],
        ['Datentransparenz', 'Jede Zahl ist rückverfolgbar bis zur Quelle. Du weißt immer, worauf eine Einschätzung beruht.'],
      ],
    },
    ctaBand: {
      title: 'Zugang ist aktuell limitiert.',
      p: 'Argo ist in geschlossener Beta für ausgewählte Fonds und Boutiquen. Stell eine Anfrage — wir melden uns persönlich.',
      btn: 'Request Access →',
    },
    foot: 'M&A Screening & Market Exposure',
    modal: {
      eyebrow: '// Request Access', title: 'Zugang anfragen',
      lede: 'Argo ist in geschlossener Beta. Sag uns kurz, wer du bist — wir melden uns persönlich.',
      name: 'Name', company: 'Firma / Fund', email: 'E-Mail', role: 'Du bist…',
      choose: 'Bitte wählen', msg: 'Nachricht (optional)', msgPh: 'Worauf willst du Argo loslassen?',
      submit: 'Anfrage senden →', sending: 'Senden…',
      fine: 'Mit dem Absenden stimmst du zu, dass wir dich kontaktieren. Keine Weitergabe an Dritte.',
      errFields: 'Bitte die markierten Pflichtfelder ausfüllen.', errEmail: 'Bitte eine gültige E-Mail-Adresse eingeben.',
      errServer: 'Etwas ist schiefgelaufen. Bitte später erneut versuchen.',
      okTitle: 'Anfrage ist raus.', okText: 'Danke! Wir sehen sie uns an und melden uns in Kürze an deiner E-Mail-Adresse.',
      types: { vc: 'VC-Fund', pe: 'PE-Fund', ma_agency: 'M&A-Boutique / Advisory', corporate: 'Corporate / Corporate Development', family_office: 'Family Office', other: 'Sonstiges' },
    },
  },
  en: {
    nav: { solutions: 'Solutions', platform: 'Platform', login: 'Login', access: 'Request Access', toggle: 'DE' },
    hero: {
      pill: 'CLOSED BETA · INVITE ONLY',
      titleA: 'Finance intelligence for those', titleAccent: 'first', titleB: 'who need to know ', titleC: '.',
      sub: 'Argo screens any company worldwide — listed and private, US and Europe — in a single click. Market exposure, beta modelling and deal signals from automated data pipelines. No manual upkeep.',
      cta: 'Request Access →', login: 'Login', note: '// Currently for select funds & boutiques',
    },
    term: {
      badge: 'RESOLVED', m1: 'TAM Segment', m2: 'Sector Beta', m3: 'Last Round', m4: 'Argo Score',
      signals: '// Live Signals',
      s1a: 'Funding momentum', s1b: '— Series E, +38% valuation YoY',
      s2a: 'Patent filing', s2b: '— 4 new EPO filings in Q1',
      s3a: 'Headcount', s3b: '— +120 in 90 days',
      s4a: 'Adjacency', s4b: '— 6 comparable targets in the sector',
    },
    seg: {
      eyebrow: '// Solutions by mandate',
      title: 'One data model. Three lenses on the same deal.',
      lead: 'The same pipeline, cut differently — whether you source targets, compare them or place them strategically.',
      vcTag: '// Phase 1 · Live', vcTitle: 'For VC Funds',
      vc: [
        ['Deal Sourcing', '— any company worldwide in one click, listed and private.'],
        ['Market Sizing', '— TAM segments and sector beta enriched automatically.'],
        ['Early Signals', '— funding momentum, patents, headcount, before the market catches on.'],
        ['Competitive Landscape', '— comparable targets in the same sector in seconds.'],
      ],
      maTag: '// Phase 2', maTitle: 'For M&A Boutiques',
      ma: [
        ['Target Identification', '— curated long-lists by sector and region.'],
        ['Comparables', '— peer sets with metrics and valuation at the push of a button.'],
        ['Buyer-Seller Matching', '— strategic buyers along adjacencies.'],
      ],
      cdTag: '// Phase 4', cdTitle: 'For Corporate Development',
      cd: [
        ['Build-vs-Buy', '— market gaps and acquisition candidates side by side.'],
        ['Adjacency Mapping', '— surface neighbouring markets and threats.'],
        ['Competitive Intelligence', '— competitors monitored continuously, not researched once.'],
      ],
      alsoA: 'Also in use at', alsoB: 'PE funds', alsoC: 'and', alsoD: 'family offices / asset managers',
      alsoE: '— same engine, own view.',
    },
    cap: {
      eyebrow: '// Platform principles',
      title: 'Data architecture solves data gaps. Never the UI.',
      lead: 'Every field shows its source and how it was computed. What is missing gets calculated — not maintained by hand.',
      items: [
        ['One-Click Company Search', 'Not in the database? Created and fully enriched automatically. No empty profile.'],
        ['Cross-Industry', 'No sector lock. 14 sectors, 75 categories — from Climate Tech to Space & Defense.'],
        ['Public + Private Markets', 'Listed and unlisted on equal footing. EDGAR, Wikidata, BaFin, Damodaran — one consolidated view.'],
        ['Entity Resolution', 'Wikidata-first resolution with subsidiary detection. The right legal entity, not the closest name.'],
        ['Beta & Market Exposure', '252-day market beta plus Damodaran sector reference. Comparability across industries.'],
        ['Data Transparency', 'Every number is traceable to its source. You always know what an assessment rests on.'],
      ],
    },
    ctaBand: {
      title: 'Access is currently limited.',
      p: 'Argo is in closed beta for select funds and boutiques. Send a request — we will get back to you personally.',
      btn: 'Request Access →',
    },
    foot: 'M&A Screening & Market Exposure',
    modal: {
      eyebrow: '// Request Access', title: 'Request access',
      lede: 'Argo is in closed beta. Tell us briefly who you are — we will get back to you personally.',
      name: 'Name', company: 'Company / Fund', email: 'Email', role: 'You are…',
      choose: 'Please select', msg: 'Message (optional)', msgPh: 'What do you want to point Argo at?',
      submit: 'Send request →', sending: 'Sending…',
      fine: 'By submitting you agree to be contacted. No sharing with third parties.',
      errFields: 'Please fill in the highlighted required fields.', errEmail: 'Please enter a valid email address.',
      errServer: 'Something went wrong. Please try again later.',
      okTitle: 'Request sent.', okText: 'Thanks! We will review it and get back to you shortly via email.',
      types: { vc: 'VC Fund', pe: 'PE Fund', ma_agency: 'M&A Boutique / Advisory', corporate: 'Corporate / Corporate Development', family_office: 'Family Office', other: 'Other' },
    },
  },
} as const;

const CUSTOMER_TYPES = ['vc', 'pe', 'ma_agency', 'corporate', 'family_office', 'other'] as const;

// ─── Request-Access-Modal ──────────────────────────────────────────────────
function AccessModal({ lang, onClose }: { lang: Lang; onClose: () => void }) {
  const m = T[lang].modal;
  const [form, setForm] = useState({ name: '', company: '', email: '', type: '', msg: '', website: '' });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [errMsg, setErrMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    // Honeypot: gefüllt = Bot → still als Erfolg behandeln, nichts senden.
    if (form.website) { setDone(true); return; }

    const e: Record<string, boolean> = {};
    (['name', 'company', 'email', 'type'] as const).forEach(k => { if (!form[k].trim()) e[k] = true; });
    if (!e.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { e.email = true; setErrMsg(m.errEmail); }
    else if (Object.keys(e).length) setErrMsg(m.errFields);
    else setErrMsg('');
    setErrors(e);
    if (Object.keys(e).length) return;

    setSending(true);
    try {
      const res = await fetch(`${BACKEND_PROXY}/api/v1/access-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.name.trim(),
          company_name: form.company.trim(),
          email: form.email.trim(),
          customer_type: form.type,
          message: form.msg.trim() || null,
          website: form.website,
        }),
      });
      if (!res.ok) throw new Error('request failed');
      setDone(true);
    } catch {
      setErrMsg(m.errServer);
      setSending(false);
    }
  }

  return (
    <div className="ml-modal-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ml-modal" role="dialog" aria-modal="true">
        <button className="ml-modal-close" type="button" aria-label="×" onClick={onClose}>×</button>

        {!done ? (
          <>
            <div className="ml-modal-head">
              <div className="ml-m-eyebrow">{m.eyebrow}</div>
              <h3>{m.title}</h3>
              <p>{m.lede}</p>
            </div>
            <div className="ml-modal-body">
              <div className="ml-field">
                <label>{m.name} <span className="ml-req">*</span></label>
                <input type="text" autoComplete="name" className={errors.name ? 'ml-err' : ''}
                  value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="ml-field">
                <label>{m.company} <span className="ml-req">*</span></label>
                <input type="text" autoComplete="organization" className={errors.company ? 'ml-err' : ''}
                  value={form.company} onChange={e => set('company', e.target.value)} />
              </div>
              <div className="ml-field">
                <label>{m.email} <span className="ml-req">*</span></label>
                <input type="email" autoComplete="email" className={errors.email ? 'ml-err' : ''}
                  value={form.email} onChange={e => set('email', e.target.value)} />
              </div>
              <div className="ml-field">
                <label>{m.role} <span className="ml-req">*</span></label>
                <select className={errors.type ? 'ml-err' : ''} value={form.type}
                  onChange={e => set('type', e.target.value)}>
                  <option value="" disabled>{m.choose}</option>
                  {CUSTOMER_TYPES.map(ct => <option key={ct} value={ct}>{m.types[ct]}</option>)}
                </select>
              </div>
              <div className="ml-field">
                <label>{m.msg}</label>
                <textarea placeholder={m.msgPh} value={form.msg} onChange={e => set('msg', e.target.value)} />
              </div>
              {/* Honeypot: für Menschen unsichtbar */}
              <input type="text" className="ml-hp" tabIndex={-1} autoComplete="off" aria-hidden="true"
                value={form.website} onChange={e => set('website', e.target.value)} />

              <button className="ml-btn ml-btn-primary" type="button" disabled={sending} onClick={submit}>
                {sending ? m.sending : m.submit}
              </button>
              {errMsg && <div className="ml-form-error">{errMsg}</div>}
              <p className="ml-modal-fine">{m.fine}</p>
            </div>
          </>
        ) : (
          <div className="ml-modal-success">
            <div className="ml-check">✓</div>
            <h3>{m.okTitle}</h3>
            <p>{m.okText}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Landing ───────────────────────────────────────────────────────────────
export default function MarketingLanding({ onLogin }: { onLogin: () => void }) {
  const [lang, setLang] = useState<Lang>('de');
  const [accessOpen, setAccessOpen] = useState(false);
  const t = T[lang];

  const SEG_BULLETS = (items: readonly (readonly [string, string])[]) =>
    items.map(([b, rest], i) => (
      <li key={i}><span className="ml-chk">→</span><span><b>{b}</b> {rest}</span></li>
    ));

  return (
    <div className="ml-root">
      <div className="ml-bg-fx" aria-hidden="true"></div>

      {/* NAV */}
      <nav className="ml-nav">
        <div className="ml-wrap ml-nav-inner">
          <div className="ml-brand"><span className="ml-glyph">A</span>Argo<span>Analytics</span></div>
          <div className="ml-nav-right">
            <a href="#segments" className="ml-nav-link ml-hide-sm">{t.nav.solutions}</a>
            <a href="#capabilities" className="ml-nav-link ml-hide-sm">{t.nav.platform}</a>
            <button className="ml-lang" type="button" onClick={() => setLang(l => (l === 'de' ? 'en' : 'de'))}>{t.nav.toggle}</button>
            <button className="ml-nav-link ml-linkbtn" type="button" onClick={onLogin}>{t.nav.login}</button>
            <button className="ml-btn ml-btn-primary" type="button" onClick={() => setAccessOpen(true)}>{t.nav.access}</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="ml-hero">
        <div className="ml-wrap">
          <div className="ml-beta-pill"><span className="ml-dot"></span>{t.hero.pill}</div>
          <h1>{t.hero.titleA}<br />{t.hero.titleB}<span className="ml-accent">{t.hero.titleAccent}</span>{t.hero.titleC}</h1>
          <p className="ml-sub">{t.hero.sub}</p>
          <div className="ml-hero-cta">
            <button className="ml-btn ml-btn-primary" type="button" onClick={() => setAccessOpen(true)}>{t.hero.cta}</button>
            <button className="ml-btn ml-btn-ghost" type="button" onClick={onLogin}>{t.hero.login}</button>
            <span className="ml-note">{t.hero.note}</span>
          </div>

          {/* Terminal-Mock — illustrativ (LANDING-SCREENSHOT-01) */}
          <div className="ml-terminal">
            <div className="ml-term-bar">
              <span className="ml-tdot"></span><span className="ml-tdot"></span><span className="ml-tdot"></span>
              <span className="ml-tpath">argo://company / one-click-resolve / fervo-energy</span>
            </div>
            <div className="ml-term-body">
              <div>
                <div className="ml-co-head">
                  <div>
                    <div className="ml-co-name">Fervo Energy</div>
                    <div className="ml-co-ticker">PRIVATE · CLIMATE_TECH · US</div>
                  </div>
                  <span className="ml-badge ml-badge-listed">{t.term.badge}</span>
                </div>
                <div className="ml-metric-grid">
                  <div className="ml-metric"><div className="ml-lbl">{t.term.m1}</div><div className="ml-val ml-cyan">$48.2B</div><div className="ml-src">src: market-pipeline</div></div>
                  <div className="ml-metric"><div className="ml-lbl">{t.term.m2}</div><div className="ml-val ml-amber">1.34</div><div className="ml-src">src: Damodaran</div></div>
                  <div className="ml-metric"><div className="ml-lbl">{t.term.m3}</div><div className="ml-val">$244M</div><div className="ml-src">src: EDGAR Form D</div></div>
                  <div className="ml-metric"><div className="ml-lbl">{t.term.m4}</div><div className="ml-val ml-emerald">7.8</div><div className="ml-src">src: score-engine</div></div>
                </div>
              </div>
              <div className="ml-signal-list">
                <div className="ml-sh">{t.term.signals}</div>
                <div className="ml-signal"><span className="ml-ic" style={{ background: 'var(--ml-emerald)' }}></span><span className="ml-tx"><b>{t.term.s1a}</b> {t.term.s1b}</span></div>
                <div className="ml-signal"><span className="ml-ic" style={{ background: 'var(--ml-blue)' }}></span><span className="ml-tx"><b>{t.term.s2a}</b> {t.term.s2b}</span></div>
                <div className="ml-signal"><span className="ml-ic" style={{ background: 'var(--ml-amber)' }}></span><span className="ml-tx"><b>{t.term.s3a}</b> {t.term.s3b}</span></div>
                <div className="ml-signal"><span className="ml-ic" style={{ background: 'var(--ml-cyan)' }}></span><span className="ml-tx"><b>{t.term.s4a}</b> {t.term.s4b}</span></div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* SEGMENTS */}
      <section id="segments" className="ml-sec-pad">
        <div className="ml-wrap">
          <div className="ml-eyebrow">{t.seg.eyebrow}</div>
          <h2 className="ml-sec-title">{t.seg.title}</h2>
          <p className="ml-sec-lead">{t.seg.lead}</p>

          <div className="ml-seg-grid">
            <div className="ml-seg ml-primary">
              <div className="ml-seg-tag">{t.seg.vcTag}</div>
              <h3>{t.seg.vcTitle}</h3>
              <ul>{SEG_BULLETS(t.seg.vc)}</ul>
            </div>
            <div className="ml-seg">
              <div className="ml-seg-tag">{t.seg.maTag}</div>
              <h3>{t.seg.maTitle}</h3>
              <ul>{SEG_BULLETS(t.seg.ma)}</ul>
            </div>
            <div className="ml-seg">
              <div className="ml-seg-tag">{t.seg.cdTag}</div>
              <h3>{t.seg.cdTitle}</h3>
              <ul>{SEG_BULLETS(t.seg.cd)}</ul>
            </div>
          </div>
          <div className="ml-also">{t.seg.alsoA} <b>{t.seg.alsoB}</b> {t.seg.alsoC} <b>{t.seg.alsoD}</b> {t.seg.alsoE}</div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section id="capabilities" className="ml-cap-section ml-sec-pad">
        <div className="ml-wrap">
          <div className="ml-eyebrow">{t.cap.eyebrow}</div>
          <h2 className="ml-sec-title">{t.cap.title}</h2>
          <p className="ml-sec-lead">{t.cap.lead}</p>
          <div className="ml-cap-grid">
            {t.cap.items.map(([h, p], i) => (
              <div className="ml-cap" key={i}>
                <div className="ml-num">{String(i + 1).padStart(2, '0')}</div>
                <h4>{h}</h4><p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="ml-cta-band">
        <div className="ml-wrap">
          <h2>{t.ctaBand.title}</h2>
          <p>{t.ctaBand.p}</p>
          <button className="ml-btn ml-btn-primary" type="button" onClick={() => setAccessOpen(true)}>{t.ctaBand.btn}</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ml-footer">
        <div className="ml-wrap ml-foot-inner">
          <div className="ml-brand"><span className="ml-glyph">A</span>Argo<span>Analytics</span></div>
          <div className="ml-foot-meta">© 2026 Argo Analytics · {t.foot}</div>
        </div>
      </footer>

      {accessOpen && <AccessModal lang={lang} onClose={() => setAccessOpen(false)} />}

      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

        .ml-root {
          --ml-bg:#0D1117; --ml-card:#161B22; --ml-elev:#1F242C; --ml-border:#262C36;
          --ml-cyan:#00C2D1; --ml-blue:#3B82F6; --ml-emerald:#10B981; --ml-amber:#F59E0B; --ml-vermillion:#EF4444;
          --ml-text:#E6EDF3; --ml-dim:#8B949E; --ml-mute:#5A6573;
          position:relative; background:var(--ml-bg); color:var(--ml-text);
          font-family:'Manrope',sans-serif; line-height:1.6; min-height:100vh; overflow-x:hidden;
          -webkit-font-smoothing:antialiased;
        }
        .ml-root * { margin:0; padding:0; box-sizing:border-box; }
        .ml-bg-fx { position:fixed; inset:0; z-index:0; pointer-events:none;
          background-image:linear-gradient(rgba(0,194,209,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,194,209,0.025) 1px,transparent 1px);
          background-size:64px 64px; mask-image:radial-gradient(ellipse 80% 60% at 50% 0%,#000 40%,transparent 100%); }
        .ml-wrap { max-width:1240px; margin:0 auto; padding:0 32px; position:relative; z-index:1; }

        .ml-btn { font-family:'Manrope',sans-serif; font-weight:700; font-size:14px; border:none; border-radius:9px; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; justify-content:center; gap:8px; transition:all .2s; }
        .ml-btn-primary { background:var(--ml-cyan); color:var(--ml-bg); padding:11px 20px; }
        .ml-btn-primary:hover { background:#1ad0de; box-shadow:0 0 24px rgba(0,194,209,0.45); transform:translateY(-1px); }
        .ml-btn-primary:disabled { background:var(--ml-elev); color:var(--ml-mute); cursor:not-allowed; box-shadow:none; transform:none; }
        .ml-btn-ghost { background:transparent; color:var(--ml-text); padding:11px 18px; border:1px solid var(--ml-border); }
        .ml-btn-ghost:hover { border-color:var(--ml-cyan); color:var(--ml-cyan); }

        .ml-nav { position:sticky; top:0; z-index:50; background:rgba(13,17,23,0.82); backdrop-filter:blur(14px); border-bottom:1px solid var(--ml-border); }
        .ml-nav-inner { display:flex; align-items:center; justify-content:space-between; height:72px; }
        .ml-brand { display:flex; align-items:center; gap:11px; font-family:'Archivo',sans-serif; font-weight:800; font-size:20px; letter-spacing:-0.02em; }
        .ml-glyph { width:30px; height:30px; border-radius:7px; background:linear-gradient(135deg,var(--ml-cyan),var(--ml-blue)); display:flex; align-items:center; justify-content:center; font-size:16px; color:var(--ml-bg); font-weight:900; box-shadow:0 0 18px rgba(0,194,209,0.35); }
        .ml-brand span { color:var(--ml-dim); font-weight:500; }
        .ml-nav-right { display:flex; align-items:center; gap:18px; }
        .ml-nav-link { color:var(--ml-dim); text-decoration:none; font-size:14px; font-weight:600; transition:color .2s; }
        .ml-nav-link:hover { color:var(--ml-text); }
        .ml-linkbtn { background:none; border:none; cursor:pointer; font-family:'Manrope',sans-serif; }
        .ml-lang { background:transparent; border:1px solid var(--ml-border); color:var(--ml-dim); font-family:'IBM Plex Mono',monospace; font-size:12px; font-weight:600; padding:6px 11px; border-radius:7px; cursor:pointer; transition:all .2s; }
        .ml-lang:hover { border-color:var(--ml-cyan); color:var(--ml-cyan); }

        .ml-hero { padding:96px 0 80px; }
        .ml-beta-pill { display:inline-flex; align-items:center; gap:9px; background:var(--ml-card); border:1px solid var(--ml-border); border-radius:100px; padding:7px 16px 7px 12px; margin-bottom:30px; font-size:12.5px; font-weight:600; color:var(--ml-dim); font-family:'IBM Plex Mono',monospace; }
        .ml-dot { width:7px; height:7px; border-radius:50%; background:var(--ml-emerald); box-shadow:0 0 8px var(--ml-emerald); animation:mlPulse 2.4s infinite; }
        @keyframes mlPulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        .ml-hero h1 { font-family:'Archivo',sans-serif; font-weight:800; font-size:clamp(40px,6vw,74px); line-height:1.02; letter-spacing:-0.035em; max-width:16ch; margin-bottom:26px; }
        .ml-hero h1 .ml-accent { color:var(--ml-cyan); }
        .ml-sub { font-size:19px; color:var(--ml-dim); max-width:58ch; margin-bottom:38px; line-height:1.55; }
        .ml-hero-cta { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
        .ml-note { font-size:13px; color:var(--ml-mute); font-family:'IBM Plex Mono',monospace; }

        .ml-terminal { margin-top:64px; background:var(--ml-card); border:1px solid var(--ml-border); border-radius:16px; overflow:hidden; box-shadow:0 40px 90px -40px rgba(0,0,0,0.8); }
        .ml-term-bar { display:flex; align-items:center; gap:8px; padding:13px 18px; border-bottom:1px solid var(--ml-border); background:var(--ml-elev); }
        .ml-tdot { width:11px; height:11px; border-radius:50%; background:#3a414c; }
        .ml-tpath { margin-left:14px; font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--ml-mute); }
        .ml-term-body { padding:28px; display:grid; grid-template-columns:1.4fr 1fr; gap:28px; }
        .ml-co-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:22px; }
        .ml-co-name { font-family:'Archivo',sans-serif; font-weight:700; font-size:26px; letter-spacing:-0.02em; }
        .ml-co-ticker { font-family:'IBM Plex Mono',monospace; font-size:13px; color:var(--ml-mute); margin-top:2px; }
        .ml-badge { font-size:11px; font-weight:700; font-family:'IBM Plex Mono',monospace; padding:4px 10px; border-radius:6px; }
        .ml-badge-listed { background:rgba(16,185,129,0.12); color:var(--ml-emerald); border:1px solid rgba(16,185,129,0.25); }
        .ml-metric-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .ml-metric { background:var(--ml-elev); border:1px solid var(--ml-border); border-radius:11px; padding:15px 16px; }
        .ml-metric .ml-lbl { font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:0.05em; color:var(--ml-mute); text-transform:uppercase; }
        .ml-metric .ml-val { font-family:'Archivo',sans-serif; font-weight:700; font-size:23px; margin-top:6px; letter-spacing:-0.01em; }
        .ml-metric .ml-src { font-size:10px; color:var(--ml-mute); margin-top:5px; font-family:'IBM Plex Mono',monospace; }
        .ml-val.ml-cyan{color:var(--ml-cyan)} .ml-val.ml-emerald{color:var(--ml-emerald)} .ml-val.ml-amber{color:var(--ml-amber)}
        .ml-signal-list { display:flex; flex-direction:column; gap:10px; }
        .ml-sh { font-family:'IBM Plex Mono',monospace; font-size:10.5px; letter-spacing:0.05em; color:var(--ml-mute); text-transform:uppercase; margin-bottom:4px; }
        .ml-signal { display:flex; align-items:flex-start; gap:11px; padding:11px 13px; background:var(--ml-elev); border:1px solid var(--ml-border); border-radius:10px; }
        .ml-ic { width:8px; height:8px; border-radius:50%; margin-top:6px; flex-shrink:0; }
        .ml-tx { font-size:13px; color:var(--ml-dim); line-height:1.4; }
        .ml-tx b { color:var(--ml-text); font-weight:600; }

        .ml-sec-pad { padding:90px 0; position:relative; z-index:1; }
        .ml-eyebrow { font-family:'IBM Plex Mono',monospace; font-size:12.5px; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:var(--ml-cyan); margin-bottom:16px; text-align:center; }
        .ml-sec-title { font-family:'Archivo',sans-serif; font-weight:800; font-size:clamp(30px,4vw,46px); letter-spacing:-0.03em; line-height:1.08; max-width:22ch; margin:0 auto; text-align:center; }
        .ml-sec-lead { font-size:17px; color:var(--ml-dim); max-width:60ch; margin:18px auto 0; text-align:center; }

        .ml-seg-grid { display:grid; grid-template-columns:1.25fr 1fr 1fr; gap:20px; margin-top:52px; align-items:stretch; }
        .ml-seg { background:var(--ml-card); border:1px solid var(--ml-border); border-radius:18px; padding:32px 30px; display:flex; flex-direction:column; transition:border-color .25s,transform .25s; position:relative; overflow:hidden; }
        .ml-seg:hover { border-color:rgba(0,194,209,0.5); transform:translateY(-4px); }
        .ml-seg.ml-primary { background:linear-gradient(165deg,#15212b 0%,var(--ml-card) 55%); border-color:rgba(0,194,209,0.3); }
        .ml-seg.ml-primary::after { content:''; position:absolute; top:-60px; right:-60px; width:200px; height:200px; background:radial-gradient(circle,rgba(0,194,209,0.18),transparent 70%); pointer-events:none; }
        .ml-seg-tag { font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:0.08em; text-transform:uppercase; color:var(--ml-mute); margin-bottom:auto; }
        .ml-seg.ml-primary .ml-seg-tag { color:var(--ml-cyan); }
        .ml-seg h3 { font-family:'Archivo',sans-serif; font-weight:700; font-size:25px; letter-spacing:-0.02em; margin:14px 0 18px; }
        .ml-seg ul { list-style:none; display:flex; flex-direction:column; gap:13px; margin-top:6px; }
        .ml-seg li { display:flex; gap:11px; font-size:14.5px; color:var(--ml-dim); line-height:1.45; }
        .ml-chk { color:var(--ml-cyan); flex-shrink:0; font-weight:700; }
        .ml-seg li b { color:var(--ml-text); font-weight:600; }
        .ml-also { margin-top:30px; text-align:center; font-size:14px; color:var(--ml-mute); font-family:'IBM Plex Mono',monospace; }
        .ml-also b { color:var(--ml-dim); font-weight:500; }

        .ml-cap-section { background:var(--ml-card); border-top:1px solid var(--ml-border); border-bottom:1px solid var(--ml-border); }
        .ml-cap-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--ml-border); border:1px solid var(--ml-border); border-radius:16px; overflow:hidden; margin-top:52px; }
        .ml-cap { background:var(--ml-bg); padding:30px 28px; transition:background .25s; }
        .ml-cap:hover { background:var(--ml-elev); }
        .ml-cap .ml-num { font-family:'IBM Plex Mono',monospace; font-size:12px; color:var(--ml-cyan); margin-bottom:16px; }
        .ml-cap h4 { font-family:'Archivo',sans-serif; font-weight:700; font-size:18px; letter-spacing:-0.01em; margin-bottom:9px; }
        .ml-cap p { font-size:14px; color:var(--ml-dim); line-height:1.5; }

        .ml-cta-band { text-align:center; padding:100px 0; position:relative; z-index:1; }
        .ml-cta-band::before { content:''; position:absolute; inset:0; z-index:-1; background:radial-gradient(ellipse 50% 70% at 50% 50%,rgba(0,194,209,0.08),transparent 70%); }
        .ml-cta-band h2 { font-family:'Archivo',sans-serif; font-weight:800; font-size:clamp(32px,4.5vw,52px); letter-spacing:-0.03em; max-width:18ch; margin:0 auto 22px; line-height:1.06; }
        .ml-cta-band p { font-size:18px; color:var(--ml-dim); max-width:52ch; margin:0 auto 36px; }
        .ml-cta-band .ml-btn-primary { padding:15px 30px; font-size:15px; }

        .ml-footer { border-top:1px solid var(--ml-border); padding:40px 0; position:relative; z-index:1; }
        .ml-foot-inner { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:18px; }
        .ml-foot-inner .ml-brand { font-size:17px; }
        .ml-foot-meta { font-family:'IBM Plex Mono',monospace; font-size:12.5px; color:var(--ml-mute); }

        .ml-modal-overlay { position:fixed; inset:0; z-index:100; background:rgba(7,10,14,0.72); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; padding:24px; }
        .ml-modal { background:var(--ml-card); border:1px solid var(--ml-border); border-radius:18px; width:100%; max-width:480px; max-height:92vh; overflow-y:auto; box-shadow:0 50px 110px -30px rgba(0,0,0,0.85); position:relative; animation:mlModalIn .28s cubic-bezier(.2,.7,.2,1); }
        @keyframes mlModalIn { from{transform:translateY(16px) scale(.98); opacity:0} to{transform:none; opacity:1} }
        .ml-modal-close { position:absolute; top:16px; right:16px; width:34px; height:34px; border-radius:8px; background:var(--ml-elev); border:1px solid var(--ml-border); color:var(--ml-dim); font-size:20px; line-height:1; cursor:pointer; transition:all .2s; }
        .ml-modal-close:hover { color:var(--ml-text); border-color:var(--ml-cyan); }
        .ml-modal-head { padding:34px 34px 22px; }
        .ml-m-eyebrow { font-family:'IBM Plex Mono',monospace; font-size:11.5px; letter-spacing:0.12em; text-transform:uppercase; color:var(--ml-cyan); margin-bottom:14px; }
        .ml-modal-head h3 { font-family:'Archivo',sans-serif; font-weight:800; font-size:27px; letter-spacing:-0.025em; margin-bottom:10px; }
        .ml-modal-head p { font-size:14.5px; color:var(--ml-dim); line-height:1.5; }
        .ml-modal-body { padding:0 34px 32px; }
        .ml-field { margin-bottom:17px; }
        .ml-field label { display:block; font-size:12.5px; font-weight:700; color:var(--ml-dim); margin-bottom:7px; font-family:'IBM Plex Mono',monospace; letter-spacing:0.02em; }
        .ml-req { color:var(--ml-cyan); }
        .ml-field input, .ml-field select, .ml-field textarea { width:100%; background:var(--ml-bg); border:1px solid var(--ml-border); border-radius:10px; padding:12px 14px; color:var(--ml-text); font-family:'Manrope',sans-serif; font-size:14.5px; transition:border-color .2s; outline:none; }
        .ml-field input:focus, .ml-field select:focus, .ml-field textarea:focus { border-color:var(--ml-cyan); }
        .ml-field input.ml-err, .ml-field select.ml-err { border-color:var(--ml-vermillion); }
        .ml-field textarea { resize:vertical; min-height:74px; }
        .ml-field select { cursor:pointer; appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238B949E' d='M6 8L2 4h8z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 14px center; }
        .ml-modal-body .ml-btn-primary { width:100%; justify-content:center; padding:14px; font-size:15px; margin-top:6px; }
        .ml-modal-fine { font-size:11.5px; color:var(--ml-mute); text-align:center; margin-top:14px; line-height:1.5; }
        .ml-hp { position:absolute; left:-9999px; width:1px; height:1px; opacity:0; }
        .ml-form-error { font-size:12.5px; color:var(--ml-vermillion); margin-top:10px; text-align:center; }
        .ml-modal-success { padding:48px 34px 44px; text-align:center; }
        .ml-check { width:58px; height:58px; border-radius:50%; margin:0 auto 22px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); display:flex; align-items:center; justify-content:center; font-size:28px; color:var(--ml-emerald); }
        .ml-modal-success h3 { font-family:'Archivo',sans-serif; font-weight:800; font-size:24px; letter-spacing:-0.02em; margin-bottom:10px; }
        .ml-modal-success p { font-size:14.5px; color:var(--ml-dim); line-height:1.5; max-width:34ch; margin:0 auto; }

        @media (max-width:920px) {
          .ml-term-body { grid-template-columns:1fr; }
          .ml-seg-grid { grid-template-columns:1fr; }
          .ml-cap-grid { grid-template-columns:1fr; }
          .ml-hide-sm { display:none; }
        }
      `}</style>
    </div>
  );
}
