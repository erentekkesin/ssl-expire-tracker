/** KVKK gereği e-posta adreslerini görüntülerken maskeler: hem yerel kısımda
 * hem domain kısmında yalnızca ilk karakter görünür (örn. e***@t****). */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return email;

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  const maskPart = (part: string) =>
    part.slice(0, 1) + "*".repeat(Math.max(part.length - 1, 3));

  return `${maskPart(local)}@${maskPart(domain)}`;
}
