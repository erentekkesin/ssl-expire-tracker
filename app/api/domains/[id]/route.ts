import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSslCertificate, statusFromExpiry } from "@/lib/ssl-check";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.domain.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
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
  });

  return NextResponse.json(updated);
}
