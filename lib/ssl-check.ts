import tls from "node:tls";

export interface SslCheckResult {
  ok: boolean;
  expiresAt?: Date;
  issuer?: string;
  error?: string;
}

/**
 * Verilen domain'e 443 portundan TLS bağlantısı kurup
 * sertifikanın bitiş tarihini (valid_to) okur.
 */
export function checkSslCertificate(
  hostname: string,
  timeoutMs = 8000
): Promise<SslCheckResult> {
  return new Promise((resolve) => {
    const cleanHost = hostname
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");

    const socket = tls.connect(
      {
        host: cleanHost,
        port: 443,
        servername: cleanHost, // SNI için gerekli
        timeout: timeoutMs,
        rejectUnauthorized: false, // süresi dolmuş sertifikaları da okuyabilmek için
      },
      () => {
        try {
          const cert = socket.getPeerCertificate();
          if (!cert || Object.keys(cert).length === 0) {
            resolve({ ok: false, error: "Sertifika bilgisi alınamadı" });
          } else {
            const firstValue = (v: string | string[] | undefined) =>
              Array.isArray(v) ? v[0] : v;
            const org = firstValue(cert.issuer?.O);
            const cn = firstValue(cert.issuer?.CN);
            resolve({
              ok: true,
              expiresAt: new Date(cert.valid_to),
              issuer: org || cn || "Bilinmiyor",
            });
          }
        } catch (err) {
          resolve({ ok: false, error: (err as Error).message });
        } finally {
          socket.end();
        }
      }
    );

    socket.on("timeout", () => {
      socket.destroy();
      resolve({ ok: false, error: "Bağlantı zaman aşımına uğradı" });
    });

    socket.on("error", (err) => {
      resolve({ ok: false, error: err.message });
    });
  });
}

/** Kalan gün sayısına göre durum etiketi üretir */
export function statusFromExpiry(expiresAt: Date | null): string {
  if (!expiresAt) return "error";
  const days = Math.floor((expiresAt.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "expired";
  if (days <= 7) return "critical";
  if (days <= 30) return "warning";
  return "ok";
}
