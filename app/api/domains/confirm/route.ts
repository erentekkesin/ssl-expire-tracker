import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSslCertificate, statusFromExpiry } from "@/lib/ssl-check";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

// Onay sayfasının, butonu göstermeden önce domain adını göstermesi için
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Bağlantı geçersiz" }, { status: 400 });
  }

  const domain = await prisma.domain.findUnique({ where: { confirmToken: token } });
  if (!domain || domain.confirmed) {
    return NextResponse.json(
      { error: "Bağlantı geçersiz veya daha önce kullanılmış" },
      { status: 404 }
    );
  }

  return NextResponse.json({ name: domain.name });
}

// Kullanıcı "Onayla" butonuna bastığında çalışır
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(`confirm:${ip}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ error: "Bağlantı geçersiz" }, { status: 400 });
  }

  const domain = await prisma.domain.findUnique({ where: { confirmToken: token } });
  if (!domain || domain.confirmed) {
    return NextResponse.json(
      { error: "Bağlantı geçersiz veya daha önce kullanılmış" },
      { status: 404 }
    );
  }

  const result = await checkSslCertificate(domain.name);

  const updated = await prisma.domain.update({
    where: { id: domain.id },
    data: {
      confirmed: true,
      confirmToken: null,
      lastCheckedAt: new Date(),
      expiresAt: result.expiresAt ?? null,
      issuer: result.issuer ?? null,
      status: result.ok ? statusFromExpiry(result.expiresAt!) : "error",
      lastError: result.ok ? null : result.error,
    },
    select: { id: true, name: true, confirmed: true, status: true },
  });

  return NextResponse.json(updated);
}
