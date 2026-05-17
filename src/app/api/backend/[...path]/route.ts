import { NextRequest, NextResponse } from "next/server";

// Serverseitig — kein NEXT_PUBLIC_ Prefix
const API_BASE = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_KEY  = process.env.API_KEY ?? "";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, "GET");
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return proxyRequest(request, params.path, "POST");
}

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  // pathSegments kommt von /api/backend/[...path]
  // page.tsx ruft z.B. /api/backend/api/v1/companies auf
  // → pathSegments = ["api", "v1", "companies"]
  // → wir joinen direkt, kein zusätzliches /api/v1/ prefixen
  const path   = pathSegments.join("/");
  const search = request.nextUrl.search ?? "";
  const url    = `${API_BASE}/${path}${search}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  };

  const init: RequestInit = { method, headers };

  if (method === "POST") {
    init.body = await request.text();
  }

  try {
    const res  = await fetch(url, init);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error(`Backend proxy error [${method} ${url}]:`, err);
    return NextResponse.json(
      { detail: "Backend nicht erreichbar" },
      { status: 502 }
    );
  }
}
