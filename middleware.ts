import { NextRequest, NextResponse } from "next/server";

// Siteyi basit bir parola ile korur. SITE_PASSWORD tanımlı değilse
// koruma devre dışı kalır (yerel geliştirmede parola girmeye gerek yok).
// /api/check-ssl hariç tutulur çünkü onu Vercel Cron kendi CRON_SECRET'ı
// ile çağırır, tarayıcı parolası göndermez.
//
// Not: Middleware Edge Runtime'da çalıştığı için Node'un Buffer'ı yerine
// Web standardı olan atob() kullanılır.
function extractPassword(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Basic ")) return null;
  try {
    const decoded = atob(authHeader.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    return separatorIndex === -1 ? null : decoded.slice(separatorIndex + 1);
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    return NextResponse.next();
  }

  const providedPassword = extractPassword(req.headers.get("authorization"));

  if (providedPassword === sitePassword) {
    return NextResponse.next();
  }

  return new NextResponse("Yetkilendirme gerekli", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="SSL Expire Tracker"' },
  });
}

export const config = {
  matcher: [
    "/((?!api/check-ssl|_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
