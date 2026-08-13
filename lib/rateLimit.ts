// Basit, bellek içi hız sınırlama. Sunucusuz fonksiyonlar arasında
// tam olarak paylaşılmayabilir ama art arda gelen istekleri (aynı sıcak
// instance üzerinde) engelleyerek Resend kotasının kötüye kullanılmasını
// zorlaştırır. Daha güçlü/dağıtık bir koruma için Redis tabanlı bir
// çözüm (örn. Upstash) gerekir.
const hits = new Map<string, number[]>();

export function isRateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  timestamps.push(now);
  hits.set(key, timestamps);
  return timestamps.length > limit;
}

export function getClientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || "unknown";
}
