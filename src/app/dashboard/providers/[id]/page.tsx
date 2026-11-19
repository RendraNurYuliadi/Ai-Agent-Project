"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowLeftRight, CircleAlert, Eye, EyeOff, KeyRound, LoaderCircle, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import type { ProviderConnectionSummary } from "@/types/providers";

export default function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [provider, setProvider] = useState<ProviderConnectionSummary | null>(null);
  const [newApiKey, setNewApiKey] = useState("");
  const [addingApiKey, setAddingApiKey] = useState(false);
  const [removingApiKeyIndex, setRemovingApiKeyIndex] = useState<number | null>(null);
  const [showRevealForm, setShowRevealForm] = useState(false);
  const [revealPassword, setRevealPassword] = useState("");
  const [revealedApiKeys, setRevealedApiKeys] = useState<string[] | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [availableSearch, setAvailableSearch] = useState("");
  const [selectedSearch, setSelectedSearch] = useState("");
  const [publisherFilter, setPublisherFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    requestProvider(id)
      .then((detail) => {
        if (!active) return;
        setProvider(detail);
        setBaseUrl(detail.baseUrl);
        setSelectedModels(detail.selectedModels);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Gagal memuat provider.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const publishers = useMemo(() => [...new Set((provider?.availableModels || [])
    .map((model) => model.includes("/") ? model.split("/")[0] : "Lainnya")
    .sort((left, right) => left.localeCompare(right)))], [provider?.availableModels]);
  const availableModels = useMemo(() => (provider?.availableModels || [])
    .filter((model) => !selectedModels.includes(model))
    .filter((model) => model.toLocaleLowerCase().includes(availableSearch.trim().toLocaleLowerCase()))
    .filter((model) => publisherFilter === "all" || (model.includes("/") ? model.split("/")[0] : "Lainnya") === publisherFilter),
  [availableSearch, provider?.availableModels, selectedModels, publisherFilter]);
  const selectedModelOptions = useMemo(() => selectedModels
    .filter((model) => model.toLocaleLowerCase().includes(selectedSearch.trim().toLocaleLowerCase())),
  [selectedModels, selectedSearch]);
  const canTestConnection = Boolean(provider?.hasApiKey);

  const testConnection = async () => {
    if (!provider) return;
    setTesting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/providers/${provider.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Uji koneksi provider gagal.");
      setProvider(data.provider as ProviderConnectionSummary);
      setSelectedModels(data.provider.selectedModels as string[]);
      setNotice(data.message || "Koneksi berhasil diuji.");
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "Uji koneksi provider gagal.");
    } finally {
      setTesting(false);
    }
  };

  const addApiKey = async () => {
    if (!provider || !newApiKey.trim()) return;
    setAddingApiKey(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/providers/${provider.id}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: newApiKey }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan API key.");
      setProvider(data.provider as ProviderConnectionSummary);
      setNewApiKey("");
      setRevealedApiKeys(null);
      setNotice("API key berhasil ditambahkan dan disimpan terenkripsi.");
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Gagal menyimpan API key.");
    } finally {
      setAddingApiKey(false);
    }
  };

  const removeApiKey = async (index: number) => {
    if (!provider || !window.confirm(`Hapus API key ${index + 1}?`)) return;
    setRemovingApiKeyIndex(index);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/providers/${provider.id}/keys`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus API key.");
      setProvider(data.provider as ProviderConnectionSummary);
      setRevealedApiKeys(null);
      setNotice("API key berhasil dihapus.");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Gagal menghapus API key.");
    } finally {
      setRemovingApiKeyIndex(null);
    }
  };

  const revealApiKeys = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!provider || !revealPassword) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/providers/${provider.id}/keys/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: revealPassword }),
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memverifikasi password.");
      setRevealedApiKeys(data.apiKeys as string[]);
      setShowRevealForm(false);
    } catch (revealError) {
      setError(revealError instanceof Error ? revealError.message : "Gagal memverifikasi password.");
    } finally {
      setRevealPassword("");
    }
  };

  const saveModelUsage = async (nextModels: string[]) => {
    if (!provider) return;
    const previousModels = selectedModels;
    setSelectedModels(nextModels);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/providers/${provider.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedModels: nextModels }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan daftar model yang digunakan.");
      const updated = data.provider as ProviderConnectionSummary;
      setProvider(updated);
      setSelectedModels(updated.selectedModels);
      setNotice("Daftar model yang digunakan berhasil diperbarui.");
    } catch (saveError) {
      setSelectedModels(previousModels);
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan daftar model yang digunakan.");
    }
  };

  const disconnect = async () => {
    if (!provider || !window.confirm(`Putuskan koneksi ${provider.name}?`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/providers/${provider.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memutus koneksi provider.");
      setProvider((current) => current ? {
        ...current,
        configured: false,
        connected: false,
        ready: false,
        hasApiKey: false,
        availableModels: [],
        modelDetails: {},
        selectedModels: [],
        lastTestAt: undefined,
      } : current);
      setSelectedModels([]);
      setRevealedApiKeys(null);
      setNotice("Koneksi provider berhasil diputus.");
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : "Gagal memutus koneksi provider.");
    }

  };

  if (loading) {
    return <div className="flex h-full min-h-0 items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-neutral-500" /></div>;
  }
  if (!provider) {
    return <main className="p-6"><p role="alert" className="text-sm text-red-300">{error || "Provider tidak ditemukan."}</p></main>;
  }

  return (
    <main className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto p-5 md:p-7">
      <header className="flex items-start gap-3">
        <Link href="/dashboard/providers" aria-label="Kembali ke Providers" className="mt-1 rounded-lg border border-neutral-800 p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">{provider.category} Provider</p>
          <h1 className="mt-1 text-xl font-semibold text-white">{provider.name}</h1>
          <p className="mt-1 text-xs text-neutral-500">{provider.description}</p>
        </div>
        <span className={`mt-1 rounded-full border px-2.5 py-1 text-[10px] ${provider.ready ? "border-emerald-900 bg-emerald-950/30 text-emerald-300" : provider.connected ? "border-sky-900 bg-sky-950/30 text-sky-300" : "border-neutral-800 text-neutral-500"}`}>
          {!provider.supported ? "Segera tersedia" : provider.ready ? "Ready" : provider.connected ? "Connected · pilih model" : provider.configured ? "Belum diuji" : "Belum tersambung"}
        </span>
      </header>

      {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-200"><CircleAlert className="h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200">{notice}</div>}

      {!provider.supported ? (
        <section className="max-w-3xl space-y-3 rounded-xl border border-neutral-800 bg-[#101010] p-5">
          <h2 className="text-sm font-semibold text-white">Integrasi belum tersedia</h2>
          <p className="text-xs leading-5 text-neutral-400">{provider.setupNote || "Provider ini belum bisa dihubungkan."}</p>
          <p className="text-xs leading-5 text-neutral-500">Provider tidak akan muncul di pilihan LLM Bot Management sebelum autentikasi dan API-nya terintegrasi dan lolos uji koneksi.</p>
        </section>
      ) : (
        <>
          <section className="max-w-3xl space-y-4 rounded-xl border border-neutral-800 bg-[#101010] p-4 md:p-5">
            <div>
              <h2 className="text-sm font-semibold text-white">Koneksi</h2>
              <p className="mt-1 text-[11px] leading-5 text-neutral-500">
                {"API key baru hanya disimpan terenkripsi setelah koneksi berhasil diuji."}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-medium text-neutral-300">API keys ({provider.apiKeyCount}/10)</h3>
                {revealedApiKeys ? (
                  <button type="button" onClick={() => setRevealedApiKeys(null)} className="inline-flex items-center gap-1.5 text-[10px] text-neutral-400 hover:text-white">
                    <EyeOff className="h-3.5 w-3.5" />Sembunyikan key
                  </button>
                ) : provider.apiKeyCount > 0 && (
                  <button type="button" onClick={() => { setShowRevealForm((open) => !open); setRevealPassword(""); }} className="inline-flex items-center gap-1.5 text-[10px] text-neutral-400 hover:text-white">
                    <Eye className="h-3.5 w-3.5" />Tampilkan key
                  </button>
                )}
              </div>
              {provider.apiKeyCount === 0 ? (
                <p className="text-[10px] text-neutral-600">
                  {provider.hasApiKey ? "Menggunakan API key dari environment server." : "Belum ada API key tersimpan."}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {Array.from({ length: provider.apiKeyCount }, (_, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-black px-3 py-2">
                      <KeyRound className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                      <code className="min-w-0 flex-1 truncate text-[10px] text-neutral-300">
                        {revealedApiKeys?.[index] || `•••••••••••• (API key ${index + 1})`}
                      </code>
                      <span className="shrink-0 text-[9px] text-neutral-500">Key {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => void removeApiKey(index)}
                        disabled={removingApiKeyIndex !== null}
                        aria-label={`Hapus API key ${index + 1}`}
                        className="shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-900 hover:text-red-300 disabled:opacity-50"
                      >
                        {removingApiKeyIndex === index ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {showRevealForm && !revealedApiKeys && (
                <form onSubmit={(event) => void revealApiKeys(event)} className="flex flex-wrap gap-2">
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={revealPassword}
                    onChange={(event) => setRevealPassword(event.target.value)}
                    placeholder="Masukkan password login"
                    className="min-w-[220px] flex-1 rounded-lg border border-neutral-800 bg-black px-3 py-2 text-xs text-white outline-none focus:border-neutral-600"
                  />
                  <button type="submit" disabled={!revealPassword} className="rounded-lg border border-neutral-700 px-3 py-2 text-[10px] text-neutral-300 hover:bg-neutral-900 disabled:opacity-50">
                    Verifikasi &amp; tampilkan
                  </button>
                </form>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newApiKey}
                  onChange={(event) => setNewApiKey(event.target.value)}
                  placeholder="Tempel API key NVIDIA baru"
                  disabled={provider.apiKeyCount >= 10}
                  className="min-w-[220px] flex-1 rounded-lg border border-neutral-800 bg-black px-3 py-2.5 text-xs text-white outline-none focus:border-neutral-600 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => void addApiKey()}
                  disabled={addingApiKey || !newApiKey.trim() || provider.apiKeyCount >= 10}
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-900 disabled:opacity-50"
                >
                  {addingApiKey ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Tambah API key
                </button>
              </div>
              <p className="text-[10px] leading-4 text-neutral-600">
                Maksimal 10 key. Jika satu key gagal atau kuotanya habis, sistem berpindah ke key berikutnya dan tetap di sana sampai gagal. Jika semua gagal, permintaan berhenti dengan error dan percobaan berikutnya mulai dari key 1.
              </p>
            </div>
            <div className="space-y-1.5 text-[11px] text-neutral-400">API endpoint
              <div className="rounded-lg border border-neutral-800 bg-black px-3 py-2.5 font-mono text-[10px] text-neutral-500">{provider.baseUrl}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void testConnection()} disabled={testing || !canTestConnection} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
                {testing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Test connection & load models
              </button>
              {provider.configured && <button type="button" onClick={() => void disconnect()} className="ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-300 hover:bg-red-950/30"><Trash2 className="h-3.5 w-3.5" />Putuskan koneksi</button>}
            </div>
          </section>

          <section className="min-h-[320px] flex-1 rounded-xl border border-neutral-800 bg-[#101010] p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white">Model digunakan</h2>
                <p className="mt-1 text-[11px] text-neutral-500">Pindahkan model ke kolom kiri agar tersedia di Bot Management.</p>
              </div>
              <span className="text-[10px] text-neutral-500">{selectedModels.length} digunakan · {provider.availableModels.length} total</span>
            </div>
            {!provider.connected ? (
              <div className="rounded-lg border border-dashed border-neutral-800 p-6 text-center text-xs text-neutral-500">Uji koneksi terlebih dahulu untuk memuat model.</div>
            ) : provider.availableModels.length === 0 ? (
              <div className="rounded-lg border border-dashed border-neutral-800 p-6 text-center text-xs text-neutral-500">
                Klik “Test connection &amp; load models” untuk memuat ulang model Free Endpoint dari katalog NVIDIA.
              </div>
            ) : (
              <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-emerald-900/60 bg-emerald-950/20 px-2.5 py-1.5 text-[10px] text-emerald-300">Free Endpoint</span>
                <span className="rounded-md border border-sky-900/60 bg-sky-950/20 px-2.5 py-1.5 text-[10px] text-sky-300">Input/output per model</span>
                <select
                  value={publisherFilter}
                  onChange={(event) => setPublisherFilter(event.target.value)}
                  className="rounded-md border border-neutral-800 bg-black px-2.5 py-1.5 text-[10px] text-neutral-300 outline-none"
                  aria-label="Filter publisher"
                >
                  <option value="all">Semua Publisher</option>
                  {publishers.map((publisher) => <option key={publisher} value={publisher}>{publisher}</option>)}
                </select>
              </div>
              <div className="grid min-h-[260px] gap-3 lg:grid-cols-[minmax(0,1fr)_44px_minmax(0,1fr)]">
                <ModelColumn
                  title={`Model digunakan (${selectedModels.length})`}
                  search={selectedSearch}
                  onSearch={setSelectedSearch}
                  models={selectedModelOptions}
                  modelDetails={provider.modelDetails}
                  empty="Belum ada model yang dipilih."
                  action={(model) => void saveModelUsage(selectedModels.filter((item) => item !== model))}
                  actionLabel="Hapus dari model digunakan"
                  icon={<ArrowLeftRight className="h-3.5 w-3.5" />}
                />
                <div className="hidden items-center justify-center text-neutral-600 lg:flex"><ArrowLeftRight className="h-4 w-4" /></div>
                <ModelColumn
                  title={`Semua model (${provider.availableModels.length})`}
                  search={availableSearch}
                  onSearch={setAvailableSearch}
                  models={availableModels}
                  modelDetails={provider.modelDetails}
                  empty={provider.availableModels.length ? "Tidak ada model yang cocok." : "Provider belum mengembalikan model."}
                  action={(model) => void saveModelUsage([...selectedModels, model])}
                  actionLabel="Tambahkan ke model digunakan"
                  icon={<Plus className="h-3.5 w-3.5" />}
                />
              </div>
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}

async function requestProvider(id: string): Promise<ProviderConnectionSummary> {
  const response = await fetch(`/api/providers/${id}`, { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Gagal memuat provider.");
  return data.provider as ProviderConnectionSummary;
}

function ModelColumn({
  title,
  search,
  onSearch,
  models,
  modelDetails,
  empty,
  action,
  actionLabel,
  icon,
}: {
  title: string;
  search: string;
  onSearch: (value: string) => void;
  models: string[];
  modelDetails?: ProviderConnectionSummary["modelDetails"];
  empty: string;
  action: (model: string) => void;
  actionLabel: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-h-[260px] min-w-0 flex-col rounded-lg border border-neutral-800 bg-black/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-medium text-neutral-300">{title}</h3>
      </div>
      <label className="mb-2 flex items-center gap-2 rounded-md border border-neutral-800 bg-black px-2.5 py-2">
        <Search className="h-3.5 w-3.5 text-neutral-600" />
        <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Cari model..." className="min-w-0 flex-1 bg-transparent text-[10px] text-white outline-none placeholder:text-neutral-600" />
      </label>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {models.length === 0 ? <p className="py-4 text-center text-[10px] text-neutral-600">{empty}</p> : models.map((model) => (
          <div key={model} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-neutral-900">
            <span className="min-w-0 flex-1 break-all font-mono text-[10px] text-neutral-300">
              {model}
              <span className="mt-1 block font-sans text-[9px] text-neutral-600">
                {modelDetails?.[model]
                  ? `Input: ${modelDetails[model].inputModalities.join(", ") || "—"} · Output: ${modelDetails[model].outputModalities.join(", ") || "—"}`
                  : "Modalitas tidak tersedia"}
              </span>
            </span>
            <button type="button" onClick={() => action(model)} aria-label={`${actionLabel}: ${model}`} title={actionLabel} className="shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-white">{icon}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
