"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Footer from "@/components/Footer";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("Şifreler uyuşmuyor");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kayıt olunamadı");
        return;
      }
      if (data.pendingVerification) {
        setRegisteredEmail(email);
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (registeredEmail) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/20 text-2xl">
            ✉️
          </div>
          <h1 className="mb-2 text-xl font-bold">E-postanızı kontrol edin</h1>
          <p className="text-sm text-slate-300">
            <strong className="text-white">{registeredEmail}</strong> adresine
            bir onay bağlantısı gönderdik. Hesabınızı etkinleştirmek için
            e-postadaki bağlantıya tıklayın.
          </p>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Kayıt Ol</h1>
      <p className="mb-6 text-sm text-slate-400">
        Kendi SSL Expire Tracker hesabınızı oluşturun.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">
            E-posta
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">
            Şifre (en az 8 karakter)
          </label>
          <input
            required
            minLength={8}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">
            Şifre (tekrar)
          </label>
          <input
            required
            minLength={8}
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          disabled={submitting}
          className="mt-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? "Kayıt olunuyor..." : "Kayıt Ol"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Zaten hesabınız var mı?{" "}
        <Link href="/login" className="text-indigo-400 hover:underline">
          Giriş yapın
        </Link>
      </p>

      <Footer />
    </main>
  );
}
