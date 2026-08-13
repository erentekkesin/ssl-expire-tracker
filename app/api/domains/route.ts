import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSslCertificate, statusFromExpiry } from "@/lib/ssl-check";
import { isEmailConfigured, sendAddConfirmationEmail } from "@/lib/email";
import { generateToken } from "@/lib/tokens";
import { maskEmail } from "@/lib/mask";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });
  }

  const domains = await prisma.domain.findMany({
    where: { userId: user.id },
    orderBy: { expiresAt: "asc" },
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
      // confirmToken ve deleteToken kasıtlı olarak dışarıda bırakıldı:
      // bu liste herkese açık, token'lar yalnızca e-posta ile gönderilmeli.
    },
  });
  const masked = domains.map((d) => ({ ...d, notifyEmail: maskEmail(d.notifyEmail) }));
  return NextResponse.json(masked);
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });
  }

  const ip = getClientIp(req);
  if (isRateLimited(`add:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const { name, notifyEmail } = body;

  if (!name || !notifyEmail) {
    return NextResponse.json(
      { error: "Domain adı ve e-posta zorunludur" },
      { status: 400 }
    );
  }

  const cleanName = name
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  const existing = await prisma.domain.findFirst({
    where: { userId: user.id, name: cleanName },
  });

  // E-posta gönderimi kurulu değilse onay akışını atla, eskisi gibi doğrudan ekle.
  if (!isEmailConfigured()) {
    if (existing) {
      return NextResponse.json(
        { error: "Bu domain zaten listenizde var" },
        { status: 409 }
      );
    }
    const result = await checkSslCertificate(cleanName);
    const domain = await prisma.domain.create({
      data: {
        name: cleanName,
        notifyEmail,
        userId: user.id,
        confirmed: true,
        lastCheckedAt: new Date(),
        expiresAt: result.expiresAt ?? null,
        issuer: result.issuer ?? null,
        status: result.ok ? statusFromExpiry(result.expiresAt!) : "error",
        lastError: result.ok ? null : result.error,
      },
    });
    return NextResponse.json(
      { ...domain, notifyEmail: maskEmail(domain.notifyEmail) },
      { status: 201 }
    );
  }

  if (existing && existing.confirmed) {
    return NextResponse.json(
      { error: "Bu domain zaten listenizde var" },
      { status: 409 }
    );
  }

  const confirmToken = generateToken();

  const domain = existing
    ? await prisma.domain.update({
        where: { id: existing.id },
        data: { notifyEmail, confirmToken },
      })
    : await prisma.domain.create({
        data: {
          name: cleanName,
          notifyEmail,
          userId: user.id,
          confirmed: false,
          confirmToken,
        },
      });

  const confirmUrl = `${req.nextUrl.origin}/confirm-domain?token=${confirmToken}`;
  await sendAddConfirmationEmail({ to: notifyEmail, domain: cleanName, confirmUrl });

  return NextResponse.json(
    { pendingConfirmation: true, name: domain.name },
    { status: 202 }
  );
}
