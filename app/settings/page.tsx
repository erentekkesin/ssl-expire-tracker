"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Footer from "@/components/Footer";

export default function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setEmail(data.email);
        setPendingDelete(!!data.pendingDelete);
      });
  }, []);

  async function handleRequestDelete() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/auth/request-delete", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Bir hata oluştu");
        return;
      }
      setPendingDelete(true);
      setInfo(
        "Hesabınızı silmek için onay e-postası gönderildi. Silme işleminin tamamlanması için e-postanızdaki bağlantıya tıklayın."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelDelete() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await fetch("/api/auth/cancel-delete", { method: "POST" });
      setPendingDelete(false);
      setInfo("Hesap silme talebi iptal edildi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Hesap Ayarları</h1>
        <Link href="/" className="text-sm text-indigo-400 hover:underline">
          ← Dashboard'a dön
        </Link>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <p className="mb-1 text-xs font-medium text-slate-400">Hesap E-postası</p>
        <p className="text-sm text-slate-200">{email ?? "Yükleniyor..."}</p>
      </div>

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

      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
        <h2 className="mb-1 text-sm font-semibold text-red-400">Tehlikeli Bölge</h2>
        <p className="mb-4 text-xs text-slate-400">
          Hesabınızı sildiğinizde, takip ettiğiniz tüm domainler de kalıcı
          olarak silinir. Bu işlem, e-postanıza gönderilecek bağlantıya
          tıklayarak onaylanana kadar tamamlanmaz.
        </p>

        {pendingDelete ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <p className="text-xs text-amber-400">
              Hesap silme talebiniz onay bekliyor.
            </p>
            <button
              onClick={handleCancelDelete}
              disabled={busy}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-indigo-500 hover:text-indigo-400 disabled:opacity-50"
            >
              Silme Talebini İptal Et
            </button>
          </div>
        ) : (
          <button
            onClick={handleRequestDelete}
            disabled={busy}
            className="rounded-lg border border-red-500/40 px-4 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            {busy ? "İşleniyor..." : "Hesabımı Sil"}
          </button>
        )}
      </div>

      <Footer />
    </main>
  );
}
