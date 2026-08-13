import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  DUMMY_PASSWORD_HASH,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(`login:${ip}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  const user = await prisma.user.findUnique({ where: { email } });
  // Kullanıcı bulunamasa bile hash karşılaştırması çalıştırılır; aksi halde
  // yanıt süresi farkından hangi e-postaların kayıtlı olduğu anlaşılabilir.
  const passwordValid = verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH
  );
  if (!user || !passwordValid) {
    return NextResponse.json(
      { error: "E-posta veya şifre hatalı" },
      { status: 401 }
    );
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { error: "Önce e-postanızı onaylamanız gerekiyor. Gelen kutunuzu kontrol edin." },
      { status: 403 }
    );
  }

  const session = await createSession(user.id);
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, session.id);
  return response;
}
