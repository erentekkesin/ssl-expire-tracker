import { NextRequest, NextResponse } from "next/server";

// Siteyi basit bir parola ile korur. SITE_PASSWORD tanımlı değilse
// koruma devre dışı kalır (yerel geliştirmede parola girmeye gerek yok).
// /api/check-ssl hariç tutulur çünkü onu Vercel Cron kendi CRON_SECRET'ı
// ile çağırır, tarayıcı parolası göndermez.
export function middleware(req: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    return NextResponse.next();
  }

  const expected =
    "Basic " + Buffer.from(`admin:${sitePassword}`).toString("base64");
  const authHeader = req.headers.get("authorization");

  if (authHeader === expected) {
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
