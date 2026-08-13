import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie } from "@/lib/auth";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

// Onay sayfasının, butonu göstermeden önce hesabın var olduğunu doğrulaması için
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Bağlantı geçersiz" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { deleteToken: token } });
  if (!user || !user.pendingDelete) {
    return NextResponse.json(
      { error: "Bağlantı geçersiz veya daha önce kullanılmış" },
      { status: 404 }
    );
  }

  return NextResponse.json({ email: user.email });
}

// Kullanıcı "Hesabımı Sil" butonuna bastığında çalışır
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(`confirm-delete-account:${ip}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ error: "Bağlantı geçersiz" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { deleteToken: token } });
  if (!user || !user.pendingDelete) {
    return NextResponse.json(
      { error: "Bağlantı geçersiz veya daha önce kullanılmış" },
      { status: 404 }
    );
  }

  // Domain'ler ve oturumlar onDelete: Cascade ile birlikte silinir.
  await prisma.user.delete({ where: { id: user.id } });

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
