import { Resend } from "resend";

/** RESEND_API_KEY tanımlı değilse onay e-postası gönderilemez; bu durumda çağıran taraf işlemi otomatik onaylamalıdır. */
export function isEmailConfigured() {
  return !!process.env.RESEND_API_KEY;
}

/** Kullanıcı girdisini (domain adı gibi) e-posta HTML'ine gömmeden önce
 * kaçışlar: aksi halde biri domain adı olarak HTML/link içeren bir metin
 * girip, güvenilir gönderen adresimizden phishing içerikli e-posta
 * gönderilmesini sağlayabilir. */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** E-posta konu başlığına satır sonu/kontrol karakteri sızmasını önler. */
function sanitizeForHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function wrapHtml(bodyHtml: string) {
  return `
    <!DOCTYPE html>
    <html lang="tr">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="margin: 0; padding: 0;">
        <div style="font-family: -apple-system, Segoe UI, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          ${bodyHtml}
        </div>
      </body>
    </html>
  `;
}

export async function sendAddConfirmationEmail(params: {
  to: string;
  domain: string;
  confirmUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY tanımlı değil, onay e-postası gönderilmedi.");
    return null;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { to, domain, confirmUrl } = params;
  const safeDomain = escapeHtml(domain);

  const html = wrapHtml(`
    <h2 style="color: #4f46e5;">Domain Ekleme Onayı</h2>
    <p><strong>${safeDomain}</strong> domainini SSL Expire Tracker'a eklemek ve bu adrese SSL bildirimleri göndermek için aşağıdaki butona tıklayın.</p>
    <p style="margin: 24px 0;">
      <a href="${confirmUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600;">Domaini Onayla ve Ekle</a>
    </p>
    <p style="color: #6b7280; font-size: 13px;">Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz, domain eklenmeyecektir.</p>
  `);

  return resend.emails.send({
    from: process.env.EMAIL_FROM || "SSL Tracker <onboarding@resend.dev>",
    to,
    subject: sanitizeForHeader(`Onay gerekli: ${domain} domainini eklemek istiyor musunuz?`),
    html,
  });
}

export async function sendDeleteConfirmationEmail(params: {
  to: string;
  domain: string;
  confirmUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY tanımlı değil, onay e-postası gönderilmedi.");
    return null;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { to, domain, confirmUrl } = params;
  const safeDomain = escapeHtml(domain);

  const html = wrapHtml(`
    <h2 style="color: #dc2626;">Domain Silme Onayı</h2>
    <p><strong>${safeDomain}</strong> domainini SSL Expire Tracker'dan silmek istediğinizi onaylamak için aşağıdaki butona tıklayın.</p>
    <p style="margin: 24px 0;">
      <a href="${confirmUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600;">Silmeyi Onayla</a>
    </p>
    <p style="color: #6b7280; font-size: 13px;">Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz, domain silinmeyecektir.</p>
  `);

  return resend.emails.send({
    from: process.env.EMAIL_FROM || "SSL Tracker <onboarding@resend.dev>",
    to,
    subject: sanitizeForHeader(`Onay gerekli: ${domain} domainini silmek istiyor musunuz?`),
    html,
  });
}

export async function sendVerifyEmail(params: { to: string; confirmUrl: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY tanımlı değil, onay e-postası gönderilmedi.");
    return null;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { to, confirmUrl } = params;

  const html = wrapHtml(`
    <h2 style="color: #4f46e5;">Hoş Geldiniz</h2>
    <p>SSL Expire Tracker'da hesabınızı oluşturmak için son bir adım kaldı. Hesabınızı etkinleştirmek için aşağıdaki butona tıklayın.</p>
    <p style="margin: 24px 0;">
      <a href="${confirmUrl}" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600;">E-postamı Onayla</a>
    </p>
    <p style="color: #6b7280; font-size: 13px;">Bu kaydı siz yapmadıysanız bu e-postayı yok sayabilirsiniz, hesap oluşturulmayacaktır.</p>
  `);

  return resend.emails.send({
    from: process.env.EMAIL_FROM || "SSL Tracker <onboarding@resend.dev>",
    to,
    subject: "SSL Expire Tracker - Hesabınızı onaylayın",
    html,
  });
}

export async function sendAccountDeleteConfirmationEmail(params: {
  to: string;
  confirmUrl: string;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY tanımlı değil, onay e-postası gönderilmedi.");
    return null;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { to, confirmUrl } = params;

  const html = wrapHtml(`
    <h2 style="color: #dc2626;">Hesap Silme Onayı</h2>
    <p>SSL Expire Tracker hesabınızı ve takip ettiğiniz tüm domainleri kalıcı olarak silmek istediğinizi onaylamak için aşağıdaki butona tıklayın.</p>
    <p style="margin: 24px 0;">
      <a href="${confirmUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600;">Hesabımı Sil</a>
    </p>
    <p style="color: #6b7280; font-size: 13px;">Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz, hesabınız silinmeyecektir.</p>
  `);

  return resend.emails.send({
    from: process.env.EMAIL_FROM || "SSL Tracker <onboarding@resend.dev>",
    to,
    subject: "Onay gerekli: SSL Expire Tracker hesabınızı silmek istiyor musunuz?",
    html,
  });
}

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
  const safeDomain = escapeHtml(domain);

  const urgency =
    daysLeft <= 1 ? "ACİL" : daysLeft <= 7 ? "Kritik" : "Uyarı";

  const subject = sanitizeForHeader(
    daysLeft < 0
      ? `🔴 SSL Sertifikası Süresi Doldu: ${domain}`
      : `⚠️ [${urgency}] ${domain} SSL sertifikası ${daysLeft} gün içinde bitiyor`
  );

  const html = wrapHtml(`
    <h2 style="color: #dc2626;">SSL Sertifika Uyarısı</h2>
    <p><strong>${safeDomain}</strong> için SSL sertifikasının bitiş tarihi yaklaşıyor.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr>
        <td style="padding: 8px; color: #6b7280;">Domain</td>
        <td style="padding: 8px; font-weight: 600;">${safeDomain}</td>
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
  `);

  return resend.emails.send({
    from: process.env.EMAIL_FROM || "SSL Tracker <onboarding@resend.dev>",
    to,
    subject,
    html,
  });
}
