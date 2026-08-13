"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Footer from "@/components/Footer";

interface Domain {
  id: string;
  name: string;
  notifyEmail: string;
  expiresAt: string | null;
  status: string;
  issuer: string | null;
  lastError: string | null;
  lastCheckedAt: string | null;
  confirmed: boolean;
  pendingDelete: boolean;
}

const STATUS_MAP: Record<
  string,
  { label: string; classes: string; dot: string }
> = {
  ok: { label: "Güvende", classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  warning: { label: "30 gün içinde", classes: "bg-amber-500/10 text-amber-400 border-amber-500/30", dot: "bg-amber-400" },
  critical: { label: "7 gün içinde", classes: "bg-orange-500/10 text-orange-400 border-orange-500/30", dot: "bg-orange-400" },
  expired: { label: "Süresi Doldu", classes: "bg-red-500/10 text-red-400 border-red-500/30", dot: "bg-red-400" },
  error: { label: "Kontrol Edilemedi", classes: "bg-slate-500/10 text-slate-400 border-slate-500/30", dot: "bg-slate-400" },
  pending: { label: "Bekliyor", classes: "bg-slate-500/10 text-slate-400 border-slate-500/30", dot: "bg-slate-400" },
};

const AWAITING_CONFIRM = {
  label: "Onay Bekliyor",
  classes: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  dot: "bg-indigo-400",
};

const AWAITING_DELETE = {
  label: "Silme Onayı Bekleniyor",
  classes: "bg-red-500/10 text-red-400 border-red-500/30",
  dot: "bg-red-400",
};

function daysLeft(expiresAt: string | null) {
  if (!expiresAt) return null;
  return Math.floor((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

export default function Home() {
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  async function loadDomains() {
    const res = await fetch("/api/domains");
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setDomains(data);
    setLoading(false);
  }

  async function loadUser() {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setUserEmail(data.email);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    loadDomains();
    loadUser();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, notifyEmail: email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Bir hata oluştu");
      } else {
        setName("");
        setEmail("");
        if (data.pendingConfirmation) {
          setInfo(
            `"${data.name}" domainini eklemek için onay e-postası gönderildi. Eklemenin tamamlanması için e-postanızdaki bağlantıya tıklayın.`
          );
        }
        await loadDomains();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/domains/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Bir hata oluştu");
      } else if (data.pendingConfirmation) {
        setInfo(
          "Domaini silmek için onay e-postası gönderildi. Silme işleminin tamamlanması için e-postanızdaki bağlantıya tıklayın."
        );
      }
      await loadDomains();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCancelDelete(id: string) {
    setCancelingId(id);
    setError(null);
    setInfo(null);
    try {
      await fetch(`/api/domains/${id}/cancel-delete`, { method: "POST" });
      setInfo("Silme talebi iptal edildi, domain normal takibe devam ediyor.");
      await loadDomains();
    } finally {
      setCancelingId(null);
    }
  }

  async function handleRefresh(id: string) {
    setRefreshingId(id);
    await fetch(`/api/domains/${id}`, { method: "POST" });
    await loadDomains();
    setRefreshingId(null);
  }

  const confirmedDomains = domains.filter((d) => d.confirmed);
  const summary = {
    total: domains.length,
    ok: confirmedDomains.filter((d) => d.status === "ok").length,
    attention: confirmedDomains.filter((d) =>
      ["warning", "critical", "expired", "error"].includes(d.status)
    ).length,
    pending: domains.filter((d) => !d.confirmed || d.pendingDelete).length,
  };

  return (
    <main className="relative mx-auto max-w-4xl px-6 py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(79,70,229,0.15),transparent_70%)]" />

      <header className="mb-10 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SSL Expire Tracker</h1>
          <p className="mt-2 text-slate-400">
            Web sitelerinizin SSL sertifika bitiş tarihlerini takip edin, süresi
            yaklaştığında otomatik e-posta ile haberdar olun.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          {userEmail && (
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-300">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-slate-500">{userEmail}</span>
            </div>
          )}
          <Link
            href="/settings"
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-indigo-500 hover:text-indigo-400"
          >
            Ayarlar
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-red-500 hover:text-red-400"
          >
            Çıkış Yap
          </button>
        </div>
      </header>

      {!loading && domains.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700">
            <p className="text-2xl font-bold">{summary.total}</p>
            <p className="text-xs text-slate-500">Toplam Domain</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 transition hover:border-emerald-500/40">
            <p className="text-2xl font-bold text-emerald-400">{summary.ok}</p>
            <p className="text-xs text-slate-500">Güvende</p>
          </div>
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 transition hover:border-orange-500/40">
            <p className="text-2xl font-bold text-orange-400">{summary.attention}</p>
            <p className="text-xs text-slate-500">Dikkat Gerekli</p>
          </div>
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 transition hover:border-indigo-500/40">
            <p className="text-2xl font-bold text-indigo-400">{summary.pending}</p>
            <p className="text-xs text-slate-500">Onay Bekliyor</p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleAdd}
        className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-400">
            Domain
          </label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="example.com"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-400">
            Bildirim E-postası
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@sirket.com"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <button
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? "Ekleniyor..." : "Domain Ekle"}
        </button>
      </form>

      <p className="mb-6 text-xs text-slate-500">
        Güvenlik amacıyla domain ekleme ve silme işlemleri, bildirim
        e-postanıza gönderilen bağlantıya tıklayarak onaylanana kadar
        tamamlanmaz.
      </p>

      {info && (
        <p className="mb-6 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-300">
          {info}
        </p>
      )}

      {error && (
        <p className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-slate-800 bg-slate-900/40"
            />
          ))}
        </div>
      ) : domains.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-2xl">
            🔒
          </div>
          <p className="text-slate-400">Henüz eklenmiş bir domain yok.</p>
          <p className="mt-1 text-sm text-slate-600">
            Yukarıdaki formdan bir domain ekleyip başlayabilirsiniz.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {domains.map((d) => {
            const dl = daysLeft(d.expiresAt);
            const s = !d.confirmed
              ? AWAITING_CONFIRM
              : d.pendingDelete
                ? AWAITING_DELETE
                : STATUS_MAP[d.status] || STATUS_MAP.pending;
            return (
              <div
                key={d.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700 hover:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    <span className="font-medium">{d.name}</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${s.classes}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {!d.confirmed
                      ? "E-postanızdaki bağlantıyla onaylayana kadar takip başlamayacak"
                      : d.expiresAt
                        ? `Bitiş: ${new Date(d.expiresAt).toLocaleDateString("tr-TR")} ${
                            dl !== null ? `(${dl} gün kaldı)` : ""
                          }`
                        : d.lastError || "Henüz kontrol edilmedi"}
                    {d.confirmed && d.issuer ? ` · Sağlayıcı: ${d.issuer}` : ""}
                  </p>
                  <p className="text-xs text-slate-600">
                    Bildirim: {d.notifyEmail}
                  </p>
                </div>
                <div className="flex gap-2">
                  {d.confirmed && (
                    <button
                      onClick={() => handleRefresh(d.id)}
                      disabled={refreshingId === d.id}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-indigo-500 hover:text-indigo-400 disabled:opacity-50"
                    >
                      {refreshingId === d.id ? "Kontrol ediliyor..." : "Yenile"}
                    </button>
                  )}
                  {d.pendingDelete ? (
                    <button
                      onClick={() => handleCancelDelete(d.id)}
                      disabled={cancelingId === d.id}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-indigo-500 hover:text-indigo-400 disabled:opacity-50"
                    >
                      {cancelingId === d.id ? "İptal ediliyor..." : "Silmeyi İptal Et"}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(d.id)}
                      disabled={deletingId === d.id}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-red-500 hover:text-red-400 disabled:opacity-50"
                    >
                      {deletingId === d.id ? "İşleniyor..." : "Sil"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Footer />
    </main>
  );
}
