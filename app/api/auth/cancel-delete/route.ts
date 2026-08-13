import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// Bekleyen bir hesap silme talebini iptal eder.
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { pendingDelete: false, deleteToken: null },
  });

  return NextResponse.json({ ok: true });
}
