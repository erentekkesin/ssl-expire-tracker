// Middleware Edge Runtime'da çalışır ve Prisma'yı (Node-only) import edemez.
// Bu yüzden çerez adı, hem middleware.ts hem lib/auth.ts tarafından
// kullanılabilmesi için bağımsız, minik bir dosyada tutuluyor.
export const SESSION_COOKIE = "session";
