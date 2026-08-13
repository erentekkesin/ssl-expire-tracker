import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Tek seferlik bakım işlemi: e-posta onay sistemi eklenmeden önce kayıt
// olmuş kullanıcıları (hiç onay e-postası alma şansı olmamış) doğrulanmış
// sayar. CRON_SECRET ile korunur.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { email } = await req.json();
  const user = await prisma.user.update({
    where: { email },
    data: { emailVerified: true, verifyToken: null },
  });

  return NextResponse.json({ ok: true, email: user.email });
}
