import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

// Bekleyen bir silme onayını iptal eder (domain silinmez, normale döner).
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });
  }

  const domain = await prisma.domain.findUnique({ where: { id: params.id } });
  if (!domain || domain.userId !== user.id) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  const updated = await prisma.domain.update({
    where: { id: domain.id },
    data: { pendingDelete: false, deleteToken: null },
    select: { id: true, name: true, pendingDelete: true },
  });

  return NextResponse.json(updated);
}
