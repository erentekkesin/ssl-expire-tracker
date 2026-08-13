import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
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
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { error: "E-posta veya şifre hatalı" },
      { status: 401 }
    );
  }

  const session = await createSession(user.id);
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, session.id);
  return response;
}
