"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Footer from "@/components/Footer";

interface Stats {
  totalDomains: number;
  okDomains: number;
  totalUsers: number;
}

const FEATURES = [
  {
    icon: "🔔",
    title: "Günlük otomatik kontrol",
    text: "Her gün otomatik olarak sertifikalarınızı kontrol eder, süre yaklaşınca e-posta gönderir.",
  },
  {
    icon: "🔐",
    title: "E-posta onaylı işlemler",
    text: "Domain ekleme, silme ve hesap işlemleri yalnızca e-postanızdaki bağlantıyı onayladığınızda gerçekleşir.",
  },
  {
    icon: "👤",
    title: "Kişisel dashboard",
    text: "Her kullanıcı yalnızca kendi eklediği domainleri görür; hesabınız tamamen size özeldir.",
  },
  {
    icon: "🕶️",
    title: "KVKK uyumlu",
    text: "Bildirim e-postaları arayüzde ve API'de maskelenerek gösterilir.",
  },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Giriş yapılamadı");
        return;
      }
      // Açık yönlendirme (open redirect) riskine karşı: yalnızca sitenin
      // kendi içindeki göreli yollara izin ver, dışarıya yönlendirme yapma.
      const rawNext = searchParams.get("next") || "/";
      const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
      router.push(next);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        {/* Sol taraf: tanıtım */}
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            🔒 SSL Expire Tracker
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Sertifikalarınız <span className="text-indigo-400">süresi dolmadan</span>{" "}
            haberdar olun
          </h1>
          <p className="mt-4 max-w-lg text-slate-400">
            Web sitelerinizin SSL sertifika bitiş tarihlerini elle takip etmeyle
            uğraşmayın. Domainlerinizi ekleyin, gerisini biz halledelim —
            sertifika süresi 30, 15, 7 ve 1 gün kala otomatik e-posta ile
            uyarırız.
          </p>

          {stats && (
            <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-md">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-2xl font-bold text-white">{stats.totalDomains}</p>
                <p className="text-xs text-slate-500">Takip edilen domain</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-2xl font-bold text-emerald-400">{stats.okDomains}</p>
                <p className="text-xs text-slate-500">Güvende</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                <p className="text-xs text-slate-500">Kullanıcı</p>
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
              >
                <div className="mb-2 text-xl">{f.icon}</div>
                <p className="text-sm font-semibold text-slate-200">{f.title}</p>
                <p className="mt-1 text-xs text-slate-500">{f.text}</p>
              </div>
            ))}
          </div>

        </div>

        {/* Sağ taraf: giriş formu */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur sm:p-8">
          <h2 className="mb-1 text-xl font-bold tracking-tight">Giriş Yap</h2>
          <p className="mb-6 text-sm text-slate-400">
            Hesabınıza giriş yapıp dashboard'unuza ulaşın.
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
                Şifre
              </label>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {submitting ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Hesabınız yok mu?{" "}
            <Link href="/register" className="text-indigo-400 hover:underline">
              Kayıt olun
            </Link>
          </p>
        </div>
      </div>

      <Footer />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
