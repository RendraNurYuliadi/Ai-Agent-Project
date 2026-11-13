"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, CircleAlert, LoaderCircle, Search, Sparkles } from "lucide-react";
import type { ProviderConnectionSummary } from "@/types/providers";

export default function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderConnectionSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [testingAll, setTestingAll] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    requestProviders()
      .then((items) => { if (active) setProviders(items); })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Gagal memuat provider.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visibleProviders = useMemo(() => providers.filter((provider) =>
    `${provider.name} ${provider.description}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  ), [providers, search]);
  const freeProviders = visibleProviders.filter((provider) => provider.category === "Free Tier");
  const localProviders = visibleProviders.filter((provider) => provider.category === "Local");

  const testAll = async () => {
    const configured = providers.filter((provider) => provider.supported && provider.configured);
    if (configured.length === 0) {
      setNotice("Belum ada provider siap diuji. Hubungkan provider terlebih dahulu.");
      return;
    }
    setTestingAll(true);
    setError("");
    setNotice("");
    try {
      const results = await Promise.all(configured.map(async (provider) => {
        try {
          const response = await fetch(`/api/providers/${provider.id}/test`, { method: "POST" });
          const data = await response.json();
          return { name: provider.name, success: response.ok && data.success };
        } catch {
          return { name: provider.name, success: false };
        }
      }));
      const updatedProviders = await requestProviders();
      setProviders(updatedProviders);
      const failed = results.filter((result) => !result.success);
      setNotice(failed.length
        ? `${results.length - failed.length} provider berhasil diuji; gagal: ${failed.map((result) => result.name).join(", ")}.`
        : `${results.length} provider berhasil diuji.`);
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "Gagal memuat status koneksi provider.");
    } finally {
      setTestingAll(false);
    }

  };

  const renderProvider = (provider: ProviderConnectionSummary) => {
    const status = provider.ready
      ? `${provider.selectedModels.length} model digunakan`
      : provider.connected
        ? "Tersambung · pilih model"
        : provider.configured
          ? "Belum diuji"
          : provider.supported
            ? "Belum tersambung"
            : "Segera tersedia";
    return (
      <Link
        key={provider.id}
        href={`/dashboard/providers/${provider.id}`}
        className="group flex min-h-[76px] items-center gap-3 rounded-xl border border-neutral-800 bg-[#222] px-3 py-3 transition-colors hover:border-neutral-600 hover:bg-[#292929]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-[11px] font-bold text-neutral-300">
          {provider.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-neutral-100">{provider.name}</span>
          <span className={`mt-1 flex items-center gap-1.5 text-[10px] ${provider.ready ? "text-emerald-400" : provider.connected ? "text-sky-300" : "text-neutral-500"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${provider.ready ? "bg-emerald-400" : provider.connected ? "bg-sky-300" : "bg-neutral-600"}`} />
            {status}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-600 transition-colors group-hover:text-white" />
      </Link>
    );
  };

  return (
    <main className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto p-5 md:p-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Model connections</p>
          <h1 className="mt-1 text-xl font-semibold text-white">Providers</h1>
          <p className="mt-1 text-xs text-neutral-500">Hubungkan provider dan pilih model yang boleh digunakan oleh bot.</p>
        </div>
        <button type="button" onClick={() => void testAll()} disabled={testingAll || loading} className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-200 hover:bg-neutral-800 disabled:opacity-50">
          {testingAll ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Test All
        </button>
      </header>

      <label className="flex max-w-lg items-center gap-2 rounded-lg border border-neutral-800 bg-[#111] px-3 py-2">
        <Search className="h-4 w-4 text-neutral-500" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari provider..." className="w-full bg-transparent text-xs text-white outline-none placeholder:text-neutral-600" />
      </label>

      {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-200"><CircleAlert className="h-4 w-4" />{error}</div>}
      {notice && <div role="status" className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-300"><CheckCircle2 className="h-4 w-4 text-emerald-400" />{notice}</div>}
      {loading ? <div className="flex flex-1 items-center justify-center"><LoaderCircle className="h-6 w-6 animate-spin text-neutral-500" /></div> : (
        <div className="space-y-7">
          {freeProviders.length > 0 && <section>
            <h2 className="mb-3 text-sm font-semibold text-neutral-200">Free Tier Providers</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{freeProviders.map(renderProvider)}</div>
          </section>}
          {localProviders.length > 0 && <section>
            <h2 className="mb-3 text-sm font-semibold text-neutral-200">Local Providers</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{localProviders.map(renderProvider)}</div>
          </section>}
          {visibleProviders.length === 0 && <p className="rounded-lg border border-neutral-800 p-6 text-center text-xs text-neutral-500">Provider tidak ditemukan.</p>}
        </div>
      )}
    </main>
  );
}

async function requestProviders(): Promise<ProviderConnectionSummary[]> {
  const response = await fetch("/api/providers", { cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Gagal memuat provider.");
  return data.providers as ProviderConnectionSummary[];
}