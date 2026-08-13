import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const sessionId = req.cookies.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await prisma.session.deleteMany({ where: { id: sessionId } });
  }
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
