"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ConfirmDeleteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<
    "loading" | "ready" | "confirming" | "done" | "error"
  >("loading");
  const [domainName, setDomainName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMsg("Bağlantı geçersiz.");
      setStatus("error");
      return;
    }
    fetch(`/api/domains/confirm-delete?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Bağlantı geçersiz.");
        return data;
      })
      .then((data) => {
        setDomainName(data.name);
        setStatus("ready");
      })
      .catch((err: Error) => {
        setErrorMsg(err.message);
        setStatus("error");
      });
  }, [token]);

  async function handleConfirm() {
    setStatus("confirming");
    try {
      const res = await fetch("/api/domains/confirm-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onaylanamadı.");
      setStatus("done");
    } catch (err) {
      setErrorMsg((err as Error).message);
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        Domain Silme Onayı
      </h1>

      {status === "loading" && (
        <p className="text-slate-400">Yükleniyor...</p>
      )}

      {status === "ready" && (
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <p className="mb-6 text-slate-300">
            <strong className="text-white">{domainName}</strong> domainini
            SSL Expire Tracker'dan silmek istediğinizi onaylıyor musunuz? Bu
            işlem geri alınamaz.
          </p>
          <button
            onClick={handleConfirm}
            className="w-full rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Silmeyi Onayla
          </button>
        </div>
      )}

      {status === "confirming" && (
        <p className="text-slate-400">Siliniyor...</p>
      )}

      {status === "done" && (
        <div className="w-full rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <p className="mb-4 font-medium text-emerald-400">
            {domainName} başarıyla silindi.
          </p>
          <Link href="/" className="text-sm text-indigo-400 hover:underline">
            Anasayfaya dön
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <p className="mb-4 text-red-400">{errorMsg}</p>
          <Link href="/" className="text-sm text-indigo-400 hover:underline">
            Anasayfaya dön
          </Link>
        </div>
      )}
    </main>
  );
}

export default function ConfirmDeletePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-slate-400">
          Yükleniyor...
        </main>
      }
    >
      <ConfirmDeleteContent />
    </Suspense>
  );
}
