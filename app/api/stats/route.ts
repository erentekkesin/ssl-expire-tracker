import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Herkese açık, kimlik gerektirmeyen özet istatistik. Kullanıcı/domain
// adı gibi özel bilgi içermez, sadece toplam sayılar döner.
export async function GET() {
  const [totalDomains, okDomains, totalUsers] = await Promise.all([
    prisma.domain.count({ where: { confirmed: true } }),
    prisma.domain.count({ where: { confirmed: true, status: "ok" } }),
    prisma.user.count({ where: { emailVerified: true } }),
  ]);

  return NextResponse.json({ totalDomains, okDomains, totalUsers });
}
