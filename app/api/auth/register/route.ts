import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  hashPassword,
  isValidEmail,
  setSessionCookie,
} from "@/lib/auth";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(`register:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  const body = await req.json();
  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Geçerli bir e-posta girin" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Şifre en az 8 karakter olmalı" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Bu e-posta ile zaten bir hesap var" },
      { status: 409 }
    );
  }

  const user = await prisma.user.create({
    data: { email, passwordHash: hashPassword(password) },
  });

  const session = await createSession(user.id);
  const response = NextResponse.json({ ok: true });
  setSessionCookie(response, session.id);
  return response;
}
