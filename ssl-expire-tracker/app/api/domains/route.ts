import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSslCertificate, statusFromExpiry } from "@/lib/ssl-check";

export async function GET() {
  const domains = await prisma.domain.findMany({
    orderBy: { expiresAt: "asc" },
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
  if (existing) {
    return NextResponse.json(
      { error: "Bu domain zaten listede var" },
      { status: 409 }
    );
  }

  // Domain eklenir eklenmez ilk kontrolü hemen yap
  const result = await checkSslCertificate(cleanName);

  const domain = await prisma.domain.create({
    data: {
      name: cleanName,
      notifyEmail,
      lastCheckedAt: new Date(),
      expiresAt: result.expiresAt ?? null,
      issuer: result.issuer ?? null,
      status: result.ok ? statusFromExpiry(result.expiresAt!) : "error",
      lastError: result.ok ? null : result.error,
    },
  });

  return NextResponse.json(domain, { status: 201 });
}
