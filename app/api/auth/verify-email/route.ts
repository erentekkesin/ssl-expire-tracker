import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/lib/auth";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

// Onay sayfasının, butonu göstermeden önce hesabın var olduğunu doğrulaması için
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Bağlantı geçersiz" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { verifyToken: token } });
  if (!user || user.emailVerified) {
    return NextResponse.json(
      { error: "Bağlantı geçersiz veya daha önce kullanılmış" },
      { status: 404 }
    );
  }

  return NextResponse.json({ email: user.email });
}

// Kullanıcı "E-postamı Onayla" butonuna bastığında çalışır
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(`verify-email:${ip}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ error: "Bağlantı geçersiz" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { verifyToken: token } });
  if (!user || user.emailVerified) {
    return NextResponse.json(
      { error: "Bağlantı geçersiz veya daha önce kullanılmış" },
      { status: 404 }
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null },
  });

  const session = await createSession(user.id);
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, session.id);
  return response;
}
