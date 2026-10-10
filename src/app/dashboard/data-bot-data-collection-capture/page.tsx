"use client";

import { useEffect, useState } from "react";
import { ActionToast, ConfirmDialog } from "@/components/action-feedback";
import { Database, Download, Loader2, RefreshCw, Rows3, Trash2 } from "lucide-react";

interface CaptureBot {
  id: string;
  name: string;
  captureCount: number;
}

interface CaptureValue {
  name: string;
  variable: string;
  value: string;
}

interface CaptureRecord {
  id: string;
  values: CaptureValue[];
  userId: string;
  conversationId: string;
  submittedAt: string | null;
}

const PAGE_SIZE = 100;

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("id-ID");
}

export default function DataBotDataCollectionCapturePage() {
  const [bots, setBots] = useState<CaptureBot[]>([]);
  const [botsLoading, setBotsLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState<CaptureBot | null>(null);
  const [fieldNames, setFieldNames] = useState<string[]>([]);
  const [captures, setCaptures] = useState<CaptureRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [captureLoading, setCaptureLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/data-collection-captures")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal memuat daftar koleksi.");
        if (active) setBots(data.bots || []);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Gagal memuat daftar koleksi.");
      })
      .finally(() => {
        if (active) setBotsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const loadCaptures = async (bot: CaptureBot, requestedPage = 1) => {
    setSelectedBot(bot);
    setCaptureLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/data-collection-captures?botId=${encodeURIComponent(bot.id)}&page=${requestedPage}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat data capture.");
      setSelectedBot((current) => current?.id === bot.id ? { ...current, name: data.bot.name } : current);
      setFieldNames(data.fieldNames || []);
      setCaptures(data.captures || []);
      setTotalCount(data.totalCount || 0);
      setPage(data.page || requestedPage);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat data capture.");
      setCaptures([]);
    } finally {
      setCaptureLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const exportCsv = () => {
    if (!selectedBot || captures.length === 0) return;
    const delimiter = ";";
    const escapeCell = (value: string | number | null | undefined) => {
      const stringValue = String(value ?? "");
      const escaped = stringValue.replace(/"/g, '""');
      return `"${escaped}"`;
    };
    const header = ["Waktu submit", ...fieldNames];
    const rows = captures.map((capture) => {
      const values = new Map(capture.values.map((item) => [item.name, item.value]));
      return [
        formatDate(capture.submittedAt),
        ...fieldNames.map((name) => values.get(name) ?? ""),
      ].map(escapeCell).join(delimiter);
    });
    const csv = [
      header.map(escapeCell).join(delimiter),
      ...rows,
    ].join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedBot.name.replace(/\s+/g, "-").toLowerCase()}-captures.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    setNotice({ type: "success", message: "CSV berhasil diekspor." });
  };

  const deleteCapture = async (captureId: string) => {
    if (!selectedBot) return;
    setDeletingId(captureId);
    setError("");
    try {
      const response = await fetch(`/api/data-collection-captures?id=${encodeURIComponent(captureId)}&botId=${encodeURIComponent(selectedBot.id)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus data capture.");
      setCaptures((items) => items.filter((item) => item.id !== captureId));
      setTotalCount((count) => Math.max(0, count - 1));
      setBots((items) => items.map((bot) => bot.id === selectedBot.id ? { ...bot, captureCount: Math.max(0, bot.captureCount - 1) } : bot));
      setNotice({ type: "success", message: "Data capture berhasil dihapus." });
      setPendingDeleteId(null);
    } catch (deleteError) {
      setNotice({ type: "error", message: deleteError instanceof Error ? deleteError.message : "Gagal menghapus data capture." });
    } finally {
      setDeletingId(null);
    }
  };

  const deleteAllCaptures = async () => {
    if (!selectedBot) return;
    setDeletingAll(true);
    setError("");
    try {
      const response = await fetch(`/api/data-collection-captures?botId=${encodeURIComponent(selectedBot.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus semua data capture.");
      setCaptures([]);
      setTotalCount(0);
      setBots((items) => items.map((bot) => bot.id === selectedBot.id ? { ...bot, captureCount: 0 } : bot));
      setNotice({ type: "success", message: `${data.deletedCount ?? 0} data capture berhasil dihapus.` });
      setPendingBulkDelete(false);
    } catch (deleteError) {
      setNotice({ type: "error", message: deleteError instanceof Error ? deleteError.message : "Gagal menghapus semua data capture." });
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <ActionToast type={notice?.type || "success"} message={notice?.message || ""} />
      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="Hapus data capture?"
        message="Record capture yang dipilih akan dihapus permanen dari bot ini."
        pending={deletingId !== null}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={() => {
          if (pendingDeleteId) void deleteCapture(pendingDeleteId);
        }}
      />
      <ConfirmDialog
        open={pendingBulkDelete}
        title="Hapus semua data capture?"
        message={selectedBot ? `Semua record capture untuk bot "${selectedBot.name}" akan dihapus.` : "Semua record capture akan dihapus."}
        confirmLabel="Hapus semua"
        pending={deletingAll}
        onCancel={() => setPendingBulkDelete(false)}
        onConfirm={() => void deleteAllCaptures()}
      />
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Bot data</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-white">
          <Database className="h-6 w-6" /> Data Bot Data Collection Capture
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">Data yang disimpan oleh node Data Collection Submitted.</p>
      </header>

      {error && <div role="alert" className="rounded-md border border-red-900/60 bg-red-950/30 px-4 py-3 text-xs text-red-200">{error}</div>}

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <section className="min-w-0">
          <h2 className="mb-2 text-xs font-semibold text-neutral-300">Collection name · bot</h2>
          <div className="divide-y divide-neutral-900 border-y border-neutral-900">
            {botsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-neutral-500" /></div>
            ) : bots.length === 0 ? (
              <div className="py-8 text-xs leading-5 text-neutral-600">Belum ada bot dengan node Data Collection Submitted.</div>
            ) : bots.map((bot) => (
              <button
                key={bot.id}
                type="button"
                onClick={() => void loadCaptures(bot, 1)}
                className={`flex w-full items-center justify-between gap-3 py-3 text-left transition-colors ${selectedBot?.id === bot.id ? "text-white" : "text-neutral-400 hover:text-white"}`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Database className="h-4 w-4 shrink-0 text-neutral-600" />
                  <span className="truncate text-xs font-medium">{bot.name}</span>
                </span>
                <span className="shrink-0 font-mono text-[10px] text-neutral-600">{bot.captureCount}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="min-w-0">
          {!selectedBot ? (
            <div className="flex min-h-56 flex-col items-center justify-center border-y border-neutral-900 text-center">
              <Rows3 className="h-7 w-7 text-neutral-700" />
              <p className="mt-3 text-sm font-medium text-neutral-300">Pilih collection bot</p>
              <p className="mt-1 text-xs text-neutral-600">Record capture akan ditampilkan sebagai tabel.</p>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="truncate text-base font-semibold text-white">{selectedBot.name}</h2>
                  <p className="mt-1 text-[10px] text-neutral-600">{totalCount} record · {fieldNames.length} field</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={exportCsv} disabled={captureLoading || totalCount === 0} className="inline-flex items-center gap-2 rounded-md border border-neutral-800 px-3 py-2 text-[10px] font-medium text-neutral-200 hover:bg-neutral-900 disabled:opacity-40">
                    <Download className="h-3.5 w-3.5" />Export CSV
                  </button>
                  <button type="button" onClick={() => setPendingBulkDelete(true)} disabled={captureLoading || totalCount === 0 || deletingAll} className="inline-flex items-center gap-2 rounded-md border border-red-900/70 px-3 py-2 text-[10px] font-medium text-red-200 hover:bg-red-950/40 disabled:opacity-40">
                    <Trash2 className="h-3.5 w-3.5" />Hapus semua
                  </button>
                  <button type="button" onClick={() => void loadCaptures(selectedBot, page)} disabled={captureLoading} title="Muat ulang" aria-label="Muat ulang data" className="rounded-md border border-neutral-800 p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white disabled:opacity-50">
                    {captureLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border-y border-neutral-800">
                <table className="w-full min-w-max border-collapse text-left text-xs">
                  <thead className="bg-[#080808] text-[10px] uppercase text-neutral-500">
                    <tr>
                      <th className="whitespace-nowrap px-3 py-3 font-medium">Waktu submit</th>
                      {fieldNames.map((name) => <th key={name} className="whitespace-nowrap px-3 py-3 font-medium">{name}</th>)}
                      <th className="whitespace-nowrap px-3 py-3 text-center font-medium">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900">
                    {captureLoading ? (
                      <tr><td colSpan={Math.max(fieldNames.length + 1, 2)} className="py-12 text-center text-neutral-600"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                    ) : captures.length === 0 ? (
                      <tr><td colSpan={Math.max(fieldNames.length + 1, 2)} className="py-12 text-center text-neutral-600">Belum ada data yang dikirim oleh node ini.</td></tr>
                    ) : captures.map((capture) => {
                      const values = new Map(capture.values.map((item) => [item.name, item.value]));
                      return (
                        <tr key={capture.id} className="text-neutral-300 hover:bg-white/[0.02]">
                          <td className="whitespace-nowrap px-3 py-3 text-neutral-500">{formatDate(capture.submittedAt)}</td>
                          {fieldNames.map((name) => <td key={name} className="max-w-80 whitespace-pre-wrap px-3 py-3">{values.get(name) || "-"}</td>)}
                          <td className="px-3 py-3 text-center">
                            <button type="button" onClick={() => setPendingDeleteId(capture.id)} disabled={deletingId !== null} className="inline-flex items-center justify-center rounded border border-red-900/70 px-2 py-1.5 text-[10px] font-medium text-red-200 hover:bg-red-950/40 disabled:opacity-40" title="Hapus record ini">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                <span>Halaman {page} dari {totalPages}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void loadCaptures(selectedBot, page - 1)} disabled={page <= 1 || captureLoading} className="rounded-md border border-neutral-800 px-3 py-1.5 hover:text-white disabled:opacity-40">Sebelumnya</button>
                  <button type="button" onClick={() => void loadCaptures(selectedBot, page + 1)} disabled={page >= totalPages || captureLoading} className="rounded-md border border-neutral-800 px-3 py-1.5 hover:text-white disabled:opacity-40">Berikutnya</button>
                </div>
              </div>}
            </>
          )}
        </section>
      </div>
    </div>
  );
}