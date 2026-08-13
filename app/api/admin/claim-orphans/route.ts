import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Tek seferlik bakım işlemi: üyelik sistemi eklenmeden önce oluşturulmuş
// (userId'si olmayan) domainleri, verilen e-postaya sahip kullanıcıya atar.
// CRON_SECRET ile korunur.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { email } = await req.json();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  const result = await prisma.domain.updateMany({
    where: { userId: null },
    data: { userId: user.id },
  });

  return NextResponse.json({ updated: result.count });
}
