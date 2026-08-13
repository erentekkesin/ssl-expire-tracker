import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Tek seferlik bakım işlemi: onay sistemi eklenmeden önce oluşturulmuş,
// hiç confirmToken almamış (dolayısıyla asla onaylanma şansı olmamış)
// domainleri onaylı sayar. CRON_SECRET ile korunur.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const result = await prisma.domain.updateMany({
    where: { confirmed: false, confirmToken: null },
    data: { confirmed: true },
  });

  return NextResponse.json({ updated: result.count });
}
