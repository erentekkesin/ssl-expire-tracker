import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/sessionCookie";

// Sayfa yollarında oturum yoksa /login'e yönlendirir, API yollarında 401 döner.
// Herkese açık kalması gereken yollar: login/kayıt sayfaları, e-posta onay
// sayfaları/endpoint'leri (kendi token'larıyla korunuyor, oturuma gerek yok)
// ve Vercel Cron'un çağırdığı /api/check-ssl (kendi CRON_SECRET'ı ile korunuyor).
const PUBLIC_PAGE_PATHS = [
  "/login",
  "/register",
  "/confirm-domain",
  "/confirm-delete",
  "/verify-email",
  "/confirm-delete-account",
];
const PUBLIC_PATH_PREFIXES = [
  "/api/auth/",
  "/api/check-ssl",
  "/api/domains/confirm",
  "/api/domains/confirm-delete",
  "/api/admin/",
  "/api/stats",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_PAGE_PATHS.includes(pathname) ||
    PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublic) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.has(SESSION_COOKIE);
  if (hasSession) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
