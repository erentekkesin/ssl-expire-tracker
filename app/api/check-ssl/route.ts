import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSslCertificate, statusFromExpiry } from "@/lib/ssl-check";
import { sendExpiryEmail } from "@/lib/email";

/**
 * Bu endpoint Vercel Cron tarafından günde bir kez otomatik çağrılır
 * (bkz. vercel.json). İsterseniz elle de tetikleyebilirsiniz:
 *   curl -H "Authorization: Bearer <CRON_SECRET>" https://.../api/check-ssl
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const domains = await prisma.domain.findMany({ where: { confirmed: true } });
  const results = [];

  for (const domain of domains) {
    const result = await checkSslCertificate(domain.name);
    const newStatus = result.ok ? statusFromExpiry(result.expiresAt!) : "error";

    const daysLeft = result.expiresAt
      ? Math.floor((result.expiresAt.getTime() - Date.now()) / 86_400_000)
      : null;

    // Hangi eşiklerin bildirim gerektirdiğini belirle
    const updates: Record<string, boolean> = {};
    if (result.ok && daysLeft !== null) {
      if (daysLeft <= 30 && !domain.notified30) {
        await sendExpiryEmail({
          to: domain.notifyEmail,
          domain: domain.name,
          daysLeft,
          expiresAt: result.expiresAt!,
        });
        updates.notified30 = true;
      }
      if (daysLeft <= 15 && !domain.notified15) {
        await sendExpiryEmail({
          to: domain.notifyEmail,
          domain: domain.name,
          daysLeft,
          expiresAt: result.expiresAt!,
        });
        updates.notified15 = true;
      }
      if (daysLeft <= 7 && !domain.notified7) {
        await sendExpiryEmail({
          to: domain.notifyEmail,
          domain: domain.name,
          daysLeft,
          expiresAt: result.expiresAt!,
        });
        updates.notified7 = true;
      }
      if (daysLeft <= 1 && !domain.notified1) {
        await sendExpiryEmail({
          to: domain.notifyEmail,
          domain: domain.name,
          daysLeft,
          expiresAt: result.expiresAt!,
        });
        updates.notified1 = true;
      }
      // Sertifika yenilendiyse (süre tekrar 30 günden fazla olduysa) bayrakları sıfırla
      if (daysLeft > 30) {
        updates.notified30 = false;
        updates.notified15 = false;
        updates.notified7 = false;
        updates.notified1 = false;
      }
    }

    await prisma.domain.update({
      where: { id: domain.id },
      data: {
        lastCheckedAt: new Date(),
        expiresAt: result.expiresAt ?? domain.expiresAt,
        issuer: result.issuer ?? domain.issuer,
        status: newStatus,
        lastError: result.ok ? null : result.error,
        ...updates,
      },
    });

    results.push({ domain: domain.name, status: newStatus, daysLeft });
  }

  return NextResponse.json({ checked: results.length, results });
}
