import { Resend } from "resend";

export async function sendExpiryEmail(params: {
  to: string;
  domain: string;
  daysLeft: number;
  expiresAt: Date;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY tanımlı değil, e-posta gönderilmedi.");
    return null;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { to, domain, daysLeft, expiresAt } = params;

  const urgency =
    daysLeft <= 1 ? "ACİL" : daysLeft <= 7 ? "Kritik" : "Uyarı";

  const subject =
    daysLeft < 0
      ? `🔴 SSL Sertifikası Süresi Doldu: ${domain}`
      : `⚠️ [${urgency}] ${domain} SSL sertifikası ${daysLeft} gün içinde bitiyor`;

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #dc2626;">SSL Sertifika Uyarısı</h2>
      <p><strong>${domain}</strong> için SSL sertifikasının bitiş tarihi yaklaşıyor.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px; color: #6b7280;">Domain</td>
          <td style="padding: 8px; font-weight: 600;">${domain}</td>
        </tr>
        <tr>
          <td style="padding: 8px; color: #6b7280;">Bitiş Tarihi</td>
          <td style="padding: 8px; font-weight: 600;">${expiresAt.toLocaleDateString("tr-TR")}</td>
        </tr>
        <tr>
          <td style="padding: 8px; color: #6b7280;">Kalan Süre</td>
          <td style="padding: 8px; font-weight: 600;">${daysLeft} gün</td>
        </tr>
      </table>
      <p style="color: #6b7280; font-size: 13px;">Bu e-posta SSL Expire Tracker uygulaması tarafından otomatik gönderilmiştir.</p>
    </div>
  `;

  return resend.emails.send({
    from: process.env.EMAIL_FROM || "SSL Tracker <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
}
