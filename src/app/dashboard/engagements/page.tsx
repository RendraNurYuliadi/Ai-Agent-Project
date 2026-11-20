"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, MessagesSquare, Plus, Trash2 } from "lucide-react";
import type { EngagementRecord } from "@/types/engagement";

export default function EngagementsPage() {
  const router = useRouter();
  const [engagements, setEngagements] = useState<EngagementRecord[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  const loadEngagements = async () => {
    const response = await fetch("/api/engagements");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Gagal memuat Engagement.");
    setEngagements(data.engagements || []);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/auth/me").then((response) => response.json()),
      fetch("/api/engagements").then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal memuat Engagement.");
        return data;
      }),
    ])
      .then(([meData, data]) => {
        if (!active) return;
        if (!meData.user || !["admin", "manager"].includes(meData.user.role)) {
          router.replace("/dashboard");
          return;
        }
        setEngagements(data.engagements || []);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Gagal memuat Engagement.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [router]);

  const createEngagement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/engagements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal membuat Engagement.");
      router.push(`/dashboard/engagements/${data.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Gagal membuat Engagement.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEngagement = async (engagement: EngagementRecord) => {
    if (!window.confirm(`Hapus Engagement "${engagement.name}"?`)) return;
    setDeletingId(engagement.id);
    setError("");
    try {
      const response = await fetch(`/api/engagements/${engagement.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus Engagement.");
      await loadEngagements();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Gagal menghapus Engagement.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-7 p-5 sm:p-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Website chat</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-white">
          <MessagesSquare className="h-6 w-6" />Engagement
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Konfigurasi Engagement dibagikan dan dapat dikelola oleh semua admin dan manager. Buat widget chat, pilih skill bot, lalu salin kode iframe ke website Anda.
        </p>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</p>}

      <form onSubmit={createEngagement} className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 sm:flex-row">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          placeholder="Nama Engagement, misalnya Website utama"
          aria-label="Nama Engagement"
          className="h-11 min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-900 px-3 text-sm text-white outline-none focus:border-neutral-600"
        />
        <button type="submit" disabled={saving || !name.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Buat Engagement
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-white">Engagement bersama</h2>
        {loading ? (
          <div className="flex items-center gap-2 py-12 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" />Memuat...</div>
        ) : engagements.length ? (
          engagements.map((engagement) => (
            <article key={engagement.id} className="flex flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-white">{engagement.name}</h3>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${engagement.isActive ? "border-emerald-900 bg-emerald-950/40 text-emerald-300" : "border-neutral-700 bg-neutral-900 text-neutral-400"}`}>
                    {engagement.isActive ? "Aktif" : "Belum aktif"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {engagement.entryPoints.length} website · {engagement.windows.length} chat window
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void deleteEngagement(engagement)}
                  disabled={deletingId === engagement.id}
                  aria-label={`Hapus ${engagement.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 hover:border-red-900 hover:text-red-300 disabled:opacity-50"
                >
                  {deletingId === engagement.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
                <Link href={`/dashboard/engagements/${engagement.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-700 px-3 text-xs font-medium text-white hover:bg-neutral-900">
                  Kelola <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-800 px-5 py-12 text-center text-sm text-neutral-500">
            Belum ada Engagement. Buat satu untuk mulai menyiapkan widget chat.
          </div>
        )}
      </section>
    </main>
  );
}
