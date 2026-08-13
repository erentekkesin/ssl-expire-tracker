import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSslCertificate, statusFromExpiry } from "@/lib/ssl-check";
import { isEmailConfigured, sendAddConfirmationEmail } from "@/lib/email";
import { generateToken } from "@/lib/tokens";

export async function GET() {
  const domains = await prisma.domain.findMany({
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
  return NextResponse.json(domains);
}

export async function POST(req: NextRequest) {
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

  const existing = await prisma.domain.findUnique({ where: { name: cleanName } });

  // E-posta gönderimi kurulu değilse onay akışını atla, eskisi gibi doğrudan ekle.
  if (!isEmailConfigured()) {
    if (existing) {
      return NextResponse.json(
        { error: "Bu domain zaten listede var" },
        { status: 409 }
      );
    }
    const result = await checkSslCertificate(cleanName);
    const domain = await prisma.domain.create({
      data: {
        name: cleanName,
        notifyEmail,
        confirmed: true,
        lastCheckedAt: new Date(),
        expiresAt: result.expiresAt ?? null,
        issuer: result.issuer ?? null,
        status: result.ok ? statusFromExpiry(result.expiresAt!) : "error",
        lastError: result.ok ? null : result.error,
      },
    });
    return NextResponse.json(domain, { status: 201 });
  }

  if (existing && existing.confirmed) {
    return NextResponse.json(
      { error: "Bu domain zaten listede var" },
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
