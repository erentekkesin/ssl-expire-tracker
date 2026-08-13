# SSL Expire Tracker

Web sitelerinizin SSL sertifika bitiş tarihlerini takip eden, süre yaklaştığında
otomatik e-posta gönderen bir uygulama. Next.js + Prisma (SQLite) + Resend.

---

## 1) Windows'ta Gerekli Programları Kurun

1. **Node.js** — https://nodejs.org adresinden **LTS** sürümünü indirip kurun
   (kurulum sırasında hepsini "Next" ile geçebilirsiniz).
2. **Git** — https://git-scm.com/download/win adresinden indirip kurun.
3. Kurulumdan sonra bilgisayarı yeniden başlatmanıza gerek yok; **PowerShell**'i
   açıp şu komutlarla kontrol edin:
   ```powershell
   node -v
   git --version
   ```
   İkisi de bir sürüm numarası gösteriyorsa hazırsınız.

## 2) Claude Code'u Kurun (isteğe bağlı ama tavsiye edilir)

PowerShell'de:
```powershell
npm install -g @anthropic-ai/claude-code
```
Proje klasörüne girip `claude` yazarak başlatabilir, Türkçe komutlarla
("şu özelliği ekle", "şu hatayı düzelt") kod üzerinde değişiklik yaptırabilirsiniz.

## 3) Projeyi Çalıştırın

Bu klasörü (zip'i açtıktan sonra) PowerShell ile açın:
```powershell
cd ssl-expire-tracker
npm install
copy .env.example .env
npx prisma migrate dev --name init
npm run dev
```
Tarayıcıda **http://localhost:3000** adresine gidin — uygulama çalışıyor olmalı.

> `.env` dosyasını açıp `RESEND_API_KEY` alanını doldurmadan e-postalar
> gönderilmez, ama domain ekleme/listeleme özelliği çalışır.

## 4) E-posta Gönderimi için Resend Kurulumu

1. https://resend.com adresine ücretsiz kaydolun.
2. Bir API anahtarı oluşturun, `.env` dosyasındaki `RESEND_API_KEY` alanına yapıştırın.
3. Kendi domaininizi doğrularsanız `EMAIL_FROM` alanını kendi adresinizle
   değiştirebilirsiniz; doğrulamadan da `onboarding@resend.dev` ile test
   e-postaları gönderebilirsiniz.

## 5) GitHub'a Yükleme

PowerShell'de proje klasöründeyken:
```powershell
git init
git add .
git commit -m "İlk sürüm: SSL Expire Tracker"
```
Sonra GitHub.com'da yeni bir **boş** repo oluşturun (README eklemeden), ardından:
```powershell
git remote add origin https://github.com/KULLANICI_ADIN/ssl-expire-tracker.git
git branch -M main
git push -u origin main
```

## 6) Canlıya Alma (Vercel — Ücretsiz)

1. https://vercel.com adresine GitHub hesabınızla giriş yapın.
2. "Add New Project" → GitHub reponuzu seçin → Import.
3. **Environment Variables** kısmına `.env` dosyanızdaki değerleri tek tek girin
   (`RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET`).
4. **Önemli:** Vercel'in dosya sistemi kalıcı olmadığından SQLite orada
   sıfırlanır. Canlı ortam için ücretsiz bir Postgres kullanın:
   - https://neon.tech veya https://supabase.com üzerinden ücretsiz bir
     Postgres veritabanı oluşturun, bağlantı adresini `DATABASE_URL` olarak
     Vercel'e girin.
   - `prisma/schema.prisma` dosyasında `provider = "sqlite"` satırını
     `provider = "postgresql"` yapın, commit edip tekrar push edin.
5. Deploy edin. `vercel.json` içindeki cron ayarı sayesinde uygulama her gün
   saat 08:00'de (UTC) otomatik olarak tüm domainlerin sertifikalarını
   kontrol edip gerekirse e-posta gönderecek.

## Klasör Yapısı

```
app/
  page.tsx              → Ana sayfa (domain listesi + ekleme formu)
  api/domains/           → Domain CRUD API
  api/check-ssl/         → Cron tarafından tetiklenen otomatik kontrol
lib/
  ssl-check.ts           → SSL sertifikası okuma mantığı (Node tls modülü)
  email.ts               → Resend ile e-posta gönderimi
prisma/schema.prisma     → Veritabanı modeli
vercel.json              → Günlük otomatik kontrol zamanlaması
```

## Bildirim Mantığı

Her domain için sertifika süresi şu eşiklere düştüğünde bir kez e-posta gönderilir:
**30 gün**, **15 gün**, **7 gün**, **1 gün**. Sertifika yenilenip süre tekrar
30 günün üzerine çıkarsa bildirim bayrakları otomatik sıfırlanır.
