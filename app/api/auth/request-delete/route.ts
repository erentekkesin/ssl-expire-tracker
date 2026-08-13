import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { generateToken } from "@/lib/tokens";
import { isEmailConfigured, sendAccountDeleteConfirmationEmail } from "@/lib/email";
import { getClientIp, isRateLimited } from "@/lib/rateLimit";

// Oturum sahibinin kendi hesabını silme talebi. Gerçek silme, e-postadaki
// bağlantıya tıklanana kadar gerçekleşmez.
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Giriş yapmalısınız" }, { status: 401 });
  }

  const ip = getClientIp(req);
  if (isRateLimited(`request-delete:${ip}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin." },
      { status: 429 }
    );
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "E-posta gönderimi kurulu olmadığı için hesap silme onayı gönderilemiyor." },
      { status: 503 }
    );
  }

  const deleteToken = generateToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { deleteToken, pendingDelete: true },
  });

  const confirmUrl = `${req.nextUrl.origin}/confirm-delete-account?token=${deleteToken}`;
  await sendAccountDeleteConfirmationEmail({ to: user.email, confirmUrl });

  return NextResponse.json({ pendingConfirmation: true }, { status: 202 });
}
