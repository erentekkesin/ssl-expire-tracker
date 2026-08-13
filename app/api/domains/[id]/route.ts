import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSslCertificate, statusFromExpiry } from "@/lib/ssl-check";
import { isEmailConfigured, sendDeleteConfirmationEmail } from "@/lib/email";
import { generateToken } from "@/lib/tokens";
import { maskEmail } from "@/lib/mask";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ip = getClientIp(req);
  if (isRateLimited(`delete:${ip}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const domain = await prisma.domain.findUnique({ where: { id: params.id } });
  if (!domain) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  // Henüz onaylanmamış (yani hiç aktif olmamış) bir kaydı silmek için
  // ayrıca onay istemeye gerek yok.
  if (!domain.confirmed || !isEmailConfigured()) {
    await prisma.domain.delete({ where: { id: domain.id } });
    return NextResponse.json({ ok: true });
  }

  const deleteToken = generateToken();
  await prisma.domain.update({
    where: { id: domain.id },
    data: { deleteToken, pendingDelete: true },
  });

  const confirmUrl = `${req.nextUrl.origin}/confirm-delete?token=${deleteToken}`;
  await sendDeleteConfirmationEmail({
    to: domain.notifyEmail,
    domain: domain.name,
    confirmUrl,
  });

  return NextResponse.json({ pendingConfirmation: true }, { status: 202 });
}

// Tek bir domain'i elle yeniden kontrol etmek için (Yenile butonu)
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const domain = await prisma.domain.findUnique({ where: { id: params.id } });
  if (!domain) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  const result = await checkSslCertificate(domain.name);

  const updated = await prisma.domain.update({
    where: { id: domain.id },
    data: {
      lastCheckedAt: new Date(),
      expiresAt: result.expiresAt ?? domain.expiresAt,
      issuer: result.issuer ?? domain.issuer,
      status: result.ok ? statusFromExpiry(result.expiresAt!) : "error",
      lastError: result.ok ? null : result.error,
    },
    select: {
      id: true,
      name: true,
      notifyEmail: true,
      lastCheckedAt: true,
      expiresAt: true,
      issuer: true,
      status: true,
      lastError: true,
      confirmed: true,
      pendingDelete: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ...updated, notifyEmail: maskEmail(updated.notifyEmail) });
}
