"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Check, GitBranch, Loader2, Plus, Settings2, Trash2, X } from "lucide-react";
import { createStarterBot, type BotDefinitionInput } from "@/lib/bot-flows";

interface BotListItem {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  interactions: Array<{ id: string }>;
  updatedAt: string;
}

export default function BotManagementPage() {
  const router = useRouter();
  const [bots, setBots] = useState<BotListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/bots")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal memuat bot.");
        if (active) setBots(data.bots || []);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Gagal memuat bot.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const createBot = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const starter: BotDefinitionInput = createStarterBot(name.trim());
    starter.description = description.trim();
    try {
      const response = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(starter),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal membuat bot.");
      router.push(`/dashboard/bot-management/${data.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Gagal membuat bot.");
    } finally {
      setSaving(false);
    }
  };

  const activateBot = async (bot: BotListItem) => {
    setError("");
    const response = await fetch(`/api/bots/${bot.id}`, { method: "PATCH" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Gagal mengaktifkan bot.");
      return;
    }
    setBots((items) => items.map((item) => ({ ...item, isActive: item.id === bot.id })));
  };

  const deleteBot = async (bot: BotListItem) => {
    if (!window.confirm(`Hapus bot "${bot.name}"?`)) return;
    const response = await fetch(`/api/bots/${bot.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Gagal menghapus bot.");
      return;
    }
    setBots((items) => items.filter((item) => item.id !== bot.id).map((item) => ({
      ...item,
      isActive: data.activeBotId ? item.id === data.activeBotId : item.isActive,
    })));
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Automation</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-white">
            <GitBranch className="h-6 w-6" /> Bot Management
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">Kelola bot dan susun alur interaksinya. Hanya satu bot aktif yang digunakan Chatbot.</p>
        </div>
        <button
          type="button"
          onClick={() => { setName(""); setDescription(""); setModalOpen(true); }}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-white px-3.5 py-2.5 text-xs font-semibold text-black transition-colors hover:bg-neutral-200"
        >
          <Plus className="h-4 w-4" /> Buat bot
        </button>
      </header>

      {error && (
        <div role="alert" className="flex items-center justify-between rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3 text-xs text-red-200">
          {error}
          <button type="button" onClick={() => setError("")} aria-label="Tutup pesan error"><X className="h-4 w-4" /></button>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-neutral-800 bg-[#080808]">
        <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_auto] gap-4 border-b border-neutral-800 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-600 max-sm:grid-cols-[minmax(0,1fr)_auto]">
          <span>Bot</span><span className="max-sm:hidden">Interactions</span><span className="max-sm:hidden">Status</span><span className="text-right">Aksi</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-neutral-500" /></div>
        ) : bots.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Bot className="mx-auto h-8 w-8 text-neutral-700" />
            <p className="mt-3 text-sm font-medium text-neutral-300">Belum ada bot</p>
            <p className="mt-1 text-xs text-neutral-600">Buat bot untuk mulai menyusun alur percakapan.</p>
          </div>
        ) : bots.map((bot) => (
          <article key={bot.id} className="grid grid-cols-[minmax(0,1fr)_120px_120px_auto] items-center gap-4 border-b border-neutral-900 px-4 py-4 last:border-0 max-sm:grid-cols-[minmax(0,1fr)_auto]">
            <Link href={`/dashboard/bot-management/${bot.id}`} className="group min-w-0">
              <span className="block truncate text-sm font-semibold text-neutral-200 group-hover:text-white">{bot.name}</span>
              <span className="mt-1 block truncate text-xs text-neutral-600">{bot.description || "Belum ada deskripsi"}</span>
              <span className="mt-2 hidden text-[10px] text-neutral-600 max-sm:block">{bot.interactions?.length || 0} interactions</span>
            </Link>
            <span className="text-xs text-neutral-400 max-sm:hidden">{bot.interactions?.length || 0}</span>
            <span className="max-sm:hidden">
              {bot.isActive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-900/70 bg-emerald-950/40 px-2.5 py-1 text-[10px] text-emerald-300"><Check className="h-3 w-3" /> Aktif</span>
              ) : <span className="text-[10px] text-neutral-600">Nonaktif</span>}
            </span>
            <div className="flex items-center justify-end gap-1.5">
              {!bot.isActive && <button type="button" onClick={() => void activateBot(bot)} className="rounded-md border border-neutral-800 px-2.5 py-1.5 text-[10px] text-neutral-400 hover:border-neutral-600 hover:text-white">Aktifkan</button>}
              <Link href={`/dashboard/bot-management/${bot.id}`} title="Atur flow" aria-label={`Atur flow ${bot.name}`} className="rounded-md p-2 text-neutral-500 hover:bg-neutral-900 hover:text-white"><Settings2 className="h-4 w-4" /></Link>
              <button type="button" onClick={() => void deleteBot(bot)} title="Hapus bot" aria-label={`Hapus ${bot.name}`} className="rounded-md p-2 text-neutral-600 hover:bg-red-950/50 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
            </div>
          </article>
        ))}
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <form onSubmit={createBot} className="w-full max-w-md space-y-4 rounded-xl border border-neutral-800 bg-[#0a0a0a] p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div><h2 className="text-base font-semibold text-white">Buat bot</h2><p className="mt-1 text-xs text-neutral-500">Flow awal berisi Welcome dan Text Start.</p></div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Tutup" className="rounded p-1 text-neutral-500 hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <label className="block space-y-1.5 text-xs text-neutral-400">Nama bot
              <input required maxLength={100} autoFocus value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-neutral-600" placeholder="Contoh: Asisten Kost" />
            </label>
            <label className="block space-y-1.5 text-xs text-neutral-400">Deskripsi
              <textarea maxLength={500} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full resize-y rounded-md border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-neutral-600" placeholder="Tujuan bot ini" />
            </label>
            <div className="flex justify-end gap-2 border-t border-neutral-900 pt-4">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-md border border-neutral-800 px-3 py-2 text-xs text-neutral-400 hover:text-white">Batal</button>
              <button type="submit" disabled={saving || !name.trim()} className="inline-flex items-center gap-2 rounded-md bg-white px-3.5 py-2 text-xs font-semibold text-black disabled:opacity-40">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Buat bot
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
