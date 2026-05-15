# Argo Analytics – Frontend

Next.js 14 App Router · TypeScript · Zero UI-Library-Dependencies

## Setup

```bash
npm install
cp .env.example .env.local
# NEXT_PUBLIC_API_URL auf Backend-URL setzen

npm run dev
# → http://localhost:3000
```

## Features

### Research-Tab
- **Suche** nach Unternehmensname oder Ticker mit Autocomplete (gegen Supabase)
- **Company Card** — Matrix-Daten: Potenzial, Risiko, IPO-Potenzial, Funding, letztes Signal
- **Marktdaten** via Yahoo Finance (Kurs, Marktcap, KGV, 52W Range, Revenue, EBITDA, Debt/EBITDA)
- **Investitionspfade** — geordnet nach Renditepotenzial:
  - IPO-direkt (börsennotiert oder bevorstehend)
  - Käufer-Proxy mit SRR × MFR × TechReadiness Scoring
  - ETF-Proxy / Enabler
- **Klapp-Detail** je Opportunity: Scoring-Metriken + Live-Marktdaten des Proxy-Titels

### Watchlist-Tab
- Alle 43 Companies aus der Climate-Tech-Matrix
- Filter: Potenzial, Investitionspfad, Quelle (Bestand/Woche 1/Woche 2)
- Freitext-Suche
- Neue Briefing-Einträge (W1/W2) farblich markiert

## Architektur

```
src/
├── app/
│   ├── page.tsx              ← Main UI (Search + Watchlist)
│   ├── layout.tsx
│   └── api/
│       └── market/route.ts   ← Yahoo Finance Proxy (CORS-safe)
├── lib/
│   └── api.ts                ← Backend + Yahoo Finance Calls + Search Orchestration
└── types/
    └── index.ts              ← TypeScript Types (spiegeln Backend-Schemas)
```

## Deployment (Vercel)

```bash
vercel --prod
# Environment Variable setzen:
# NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```
