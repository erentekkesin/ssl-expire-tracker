/** KVKK gereği e-posta adreslerini görüntülerken maskeler: sadece ilk karakter görünür. */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) return email;

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  const visible = local.slice(0, 1);
  const masked = "*".repeat(Math.max(local.length - 1, 3));

  return `${visible}${masked}@${domain}`;
}
