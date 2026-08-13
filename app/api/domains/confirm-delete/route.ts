import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Onay sayfasının, butonu göstermeden önce domain adını göstermesi için
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Bağlantı geçersiz" }, { status: 400 });
  }

  const domain = await prisma.domain.findUnique({ where: { deleteToken: token } });
  if (!domain || !domain.pendingDelete) {
    return NextResponse.json(
      { error: "Bağlantı geçersiz veya daha önce kullanılmış" },
      { status: 404 }
    );
  }

  return NextResponse.json({ name: domain.name });
}

// Kullanıcı "Silmeyi Onayla" butonuna bastığında çalışır
export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) {
    return NextResponse.json({ error: "Bağlantı geçersiz" }, { status: 400 });
  }

  const domain = await prisma.domain.findUnique({ where: { deleteToken: token } });
  if (!domain || !domain.pendingDelete) {
    return NextResponse.json(
      { error: "Bağlantı geçersiz veya daha önce kullanılmış" },
      { status: 404 }
    );
  }

  await prisma.domain.delete({ where: { id: domain.id } });

  return NextResponse.json({ ok: true, name: domain.name });
}
