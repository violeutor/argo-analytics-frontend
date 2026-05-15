import { NextRequest, NextResponse } from "next/server";
import type { MarketData } from "@/types";

/**
 * Proxy für Yahoo Finance API.
 * GET /api/market?ticker=CRH
 *
 * Yahoo Finance v8 chart endpoint ist öffentlich und benötigt keinen API-Key.
 * Für Fundamentals (PE, Revenue, EBITDA) nutzen wir quoteSummary.
 */
export async function GET(req: NextRequest) {
  const ticker = req.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return NextResponse.json({ error: "ticker required" }, { status: 400 });
  }

  try {
    // Quote (Preis + Marktcap)
    const quoteUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    const quoteRes = await fetch(quoteUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 900 },
    });

    // Summary (Fundamentals)
    const summaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=summaryDetail,financialData,defaultKeyStatistics`;
    const summaryRes = await fetch(summaryUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 900 },
    });

    if (!quoteRes.ok) {
      return NextResponse.json(null, { status: 200 }); // graceful null
    }

    const quoteJson = await quoteRes.json();
    const meta = quoteJson?.chart?.result?.[0]?.meta;

    let pe: number | null = null;
    let revenue: number | null = null;
    let ebitda: number | null = null;
    let debtEbitda: number | null = null;
    let week52High: number | null = null;
    let week52Low: number | null = null;

    if (summaryRes.ok) {
      const sJson = await summaryRes.json();
      const sd = sJson?.quoteSummary?.result?.[0];
      const detail = sd?.summaryDetail;
      const fin = sd?.financialData;
      const stats = sd?.defaultKeyStatistics;

      pe = detail?.trailingPE?.raw ?? null;
      week52High = detail?.fiftyTwoWeekHigh?.raw ?? null;
      week52Low = detail?.fiftyTwoWeekLow?.raw ?? null;
      revenue = fin?.totalRevenue?.raw
        ? fin.totalRevenue.raw / 1e9
        : null;
      ebitda = fin?.ebitda?.raw ? fin.ebitda.raw / 1e9 : null;
      debtEbitda =
        fin?.totalDebt?.raw && ebitda
          ? fin.totalDebt.raw / 1e9 / ebitda
          : null;
    }

    const marketCap = meta?.marketCap
      ? meta.marketCap / 1e9
      : null;

    const data: MarketData = {
      ticker: ticker.toUpperCase(),
      name: meta?.shortName ?? meta?.symbol ?? ticker,
      price: meta?.regularMarketPrice ?? null,
      market_cap_bn: marketCap,
      pe_ratio: pe,
      week_52_high: week52High,
      week_52_low: week52Low,
      revenue_bn: revenue,
      ebitda_bn: ebitda,
      debt_ebitda: debtEbitda,
      is_listed: true,
      exchange: meta?.exchangeName ?? null,
      currency: meta?.currency ?? null,
      last_updated: new Date().toISOString(),
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error("Yahoo Finance proxy error:", err);
    return NextResponse.json(null, { status: 200 }); // always graceful
  }
}
