import { NextRequest, NextResponse } from "next/server";

const ORACLE_URL =
  process.env.ORACLE_API_URL || "http://localhost:3001";

async function proxyRequest(req: NextRequest) {
  const path = req.nextUrl.pathname; // e.g. /api/analyze
  const target = `${ORACLE_URL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") || "application/json",
  };

  const init: RequestInit = {
    method: req.method,
    headers,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  const res = await fetch(target, init);

  const data = await res.text();

  return new NextResponse(data, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") || "application/json",
    },
  });
}

export async function GET(req: NextRequest) {
  return proxyRequest(req);
}

export async function POST(req: NextRequest) {
  return proxyRequest(req);
}
