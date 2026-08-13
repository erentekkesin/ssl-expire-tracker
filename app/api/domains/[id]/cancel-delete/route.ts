import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Bekleyen bir silme onayını iptal eder (domain silinmez, normale döner).
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const domain = await prisma.domain.findUnique({ where: { id: params.id } });
  if (!domain) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  const updated = await prisma.domain.update({
    where: { id: domain.id },
    data: { pendingDelete: false, deleteToken: null },
    select: { id: true, name: true, pendingDelete: true },
  });

  return NextResponse.json(updated);
}
