import tls from "node:tls";
import dns from "node:dns";
import net from "node:net";

export interface SslCheckResult {
  ok: boolean;
  expiresAt?: Date;
  issuer?: string;
  error?: string;
}

/**
 * Bir IP adresinin özel/iç ağ veya bulut metadata adresi olup olmadığını
 * kontrol eder. Kullanıcılar domain adı olarak iç ağ adresleri (örn.
 * 169.254.169.254 bulut metadata servisi, 127.0.0.1, 10.x.x.x) girip
 * sunucunun onlara bağlanmasını sağlayamasın diye (SSRF koruması).
 */
function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local (bulut metadata dahil)
    if (a === 0) return true; // 0.0.0.0/8
    if (a >= 224) return true; // multicast/reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true; // loopback
    if (lower.startsWith("fe80:")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local (fc00::/7)
    if (lower.startsWith("::ffff:")) {
      // IPv4-mapped IPv6 adresi, IPv4 kuralına göre tekrar kontrol et
      return isPrivateOrReservedIp(lower.replace("::ffff:", ""));
    }
    return false;
  }
  return true; // ayrıştırılamayan adresler güvenli tarafta kalınarak reddedilir
}

/**
 * Verilen domain'e 443 portundan TLS bağlantısı kurup
 * sertifikanın bitiş tarihini (valid_to) okur.
 */
export async function checkSslCertificate(
  hostname: string,
  timeoutMs = 8000
): Promise<SslCheckResult> {
  const cleanHost = hostname
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");

  let resolvedIp: string;
  try {
    const lookup = await dns.promises.lookup(cleanHost);
    resolvedIp = lookup.address;
  } catch {
    return { ok: false, error: "Domain çözümlenemedi (DNS hatası)" };
  }

  if (isPrivateOrReservedIp(resolvedIp)) {
    return { ok: false, error: "Özel/iç ağ adreslerine bağlantı desteklenmiyor" };
  }

  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: resolvedIp,
        port: 443,
        servername: cleanHost, // SNI ve sertifika doğrulaması için gerçek hostname
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
