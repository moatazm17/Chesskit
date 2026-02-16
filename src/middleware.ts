import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CLOUDFLARE_URL = "https://chessplus.pages.dev";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";

  // Only redirect if served from Railway - Cloudflare and localhost pass through
  if (host.includes("railway.app")) {
    const url = new URL(request.url);
    return NextResponse.redirect(
      `${CLOUDFLARE_URL}${url.pathname}${url.search}`,
      301
    );
  }

  return NextResponse.next();
}
