"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  Plus,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Sparkles,
  Copy,
} from "lucide-react";
import { ConfirmDialog } from "@/components/action-feedback";

interface Prompt {
  id: string;
  type: "faq" | "small_talk" | "route" | "guided_routing" | "rag";
  name: string;
  content: string;
  isActive: boolean;
  createdAt: string;
}

const typeLabels: Record<string, { label: string; color: string; desc: string }> = {
  faq: {
    label: "FAQ",
    color: "bg-white/10 text-white border-white/20",
    desc: "Menjawab pertanyaan berdasarkan Knowledge Base",
  },
  small_talk: {
    label: "Small Talk",
    color: "bg-neutral-500/10 text-neutral-300 border-neutral-500/20",
    desc: "Menjawab basa-basi dan sapaan",
  },
  route: {
    label: "Route",
    color: "bg-neutral-700/20 text-neutral-400 border-neutral-700/40",
    desc: "Mengklasifikasikan jenis pertanyaan user",
  },
  guided_routing: {
    label: "Guided Routing",
    color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    desc: "Memilih jalur percakapan untuk bot flow",
  },
  rag: {
    label: "RAG",
    color: "bg-sky-500/10 text-sky-300 border-sky-500/20",
    desc: "Menjawab berdasarkan hasil pencarian Knowledge Base",
  },
};

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [form, setForm] = useState({
    type: "faq",
    name: "",
    content: "",
    isActive: false,
  });
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Prompt | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const notify = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  async function fetchPrompts() {
    setLoading(true);
    try {
      const res = await fetch("/api/prompts");
      if (res.ok) {
        const data = await res.json();
        setPrompts(data.prompts || []);
      }
    } catch { }
    setLoading(false);
  }

  useEffect(() => {
    let current = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user && d.user.role !== "admin") {
          window.location.href =
            d.user.role === "manager"
              ? "/dashboard"
              : "/dashboard/chatbot";
        }
      })
      .catch(() => { });

    fetch("/api/prompts")
      .then((res) => res.ok ? res.json() : { prompts: [] })
      .then((data) => {
        if (current) setPrompts(data.prompts || []);
      })
      .catch(() => { })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => { current = false; };
  }, []);

  const openNewModal = (type?: string) => {
    setEditingPrompt(null);
    setForm({
      type: type || "faq",
      name: "",
      content: "",
      isActive: false,
    });
    setShowModal(true);
  };

  const openEditModal = (p: Prompt) => {
    setEditingPrompt(p);
    setForm({
      type: p.type,
      name: p.name,
      content: p.content,
      isActive: p.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingPrompt) {
        const res = await fetch(`/api/prompts/${editingPrompt.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!res.ok) throw new Error("Gagal memperbarui prompt");

        notify("success", "Prompt berhasil diperbarui!");
      } else {
        const res = await fetch("/api/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!res.ok) throw new Error("Gagal menambahkan prompt");

        notify(
          "success",
          `Prompt "${form.name}" berhasil ditambahkan!`
        );
      }

      setShowModal(false);
      fetchPrompts();
    } catch (err: unknown) {
      notify(
        "error",
        err instanceof Error ? err.message : "Terjadi kesalahan"
      );
    }
  };

  const duplicatePrompt = async (prompt: Prompt) => {
    try {
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateFromId: prompt.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menduplikasi prompt.");
      notify("success", `Prompt "${prompt.name}" berhasil diduplikat${data.name ? ` sebagai "${data.name}"` : ""}.`);
      await fetchPrompts();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal menduplikasi prompt.");
    }
  };

  const deletePrompt = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/prompts/${pendingDelete.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus prompt.");
      notify("success", `Prompt "${pendingDelete.name}" berhasil dihapus.`);
      setPendingDelete(null);
      await fetchPrompts();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal menghapus prompt.");
    } finally {
      setDeleting(false);
    }
  };

  const deleteAllPrompts = async () => {
    setDeletingAll(true);
    try {
      const response = await fetch("/api/prompts", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus semua prompt.");
      setPrompts([]);
      setBulkDeleteOpen(false);
      notify("success", `${data.deletedCount} prompt berhasil dihapus.`);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal menghapus semua prompt.");
    } finally {
      setDeletingAll(false);
    }
  };

  const toggleActive = async (p: Prompt) => {
    try {
      const response = await fetch(`/api/prompts/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...p,
          isActive: !p.isActive,
          type: p.type,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengubah status prompt.");
      notify("success", `Prompt "${p.name}" berhasil ${p.isActive ? "dinonaktifkan" : "diaktifkan"}.`);
      await fetchPrompts();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal mengubah status prompt.");
    }
  };

  const filtered =
    activeTab === "all"
      ? prompts
      : prompts.filter((p) => p.type === activeTab);

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 ${notification.type === "success"
              ? "bg-[#0a0a0a] border-neutral-700 text-neutral-200"
              : "bg-[#0a0a0a] border-neutral-700 text-neutral-300"
            }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-neutral-300 shrink-0" />
          )}

          <span className="text-sm font-medium">
            {notification.message}
          </span>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Hapus prompt?"
        message={pendingDelete ? `Prompt "${pendingDelete.name}" akan dihapus permanen.` : ""}
        pending={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void deletePrompt()}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Hapus semua prompt?"
        message={`Sebanyak ${prompts.length} prompt akan dihapus permanen.`}
        confirmLabel="Hapus semua"
        pending={deletingAll}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => void deleteAllPrompts()}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-white" />
            Prompt Management
          </h1>

          <p className="text-neutral-400 text-sm mt-1">
            Kelola template prompt dan pilihannya pada node bot flow.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setBulkDeleteOpen(true)} disabled={loading || prompts.length === 0 || deletingAll} className="inline-flex items-center gap-2 rounded-xl border border-red-900/70 px-3.5 py-2.5 text-xs font-medium text-red-200 hover:bg-red-950/40 disabled:opacity-40"><Trash2 className="h-4 w-4" />Hapus semua ({prompts.length})</button>
          <button onClick={() => openNewModal()} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-neutral-200 text-black text-sm font-medium rounded-xl shadow-lg shadow-black/30 transition-all cursor-pointer"><Plus className="w-4 h-4" />Tambah Prompt</button>
        </div>
      </div>

      {/* Type Tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: "all", label: "Semua" },
          { key: "faq", label: "FAQ" },
          { key: "route", label: "Route" },
          { key: "small_talk", label: "Small Talk" },
          { key: "guided_routing", label: "Guided Routing" },
          { key: "rag", label: "RAG" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-xs px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === tab.key
                ? "bg-white text-black font-medium"
                : "bg-neutral-900 hover:bg-neutral-800 text-neutral-500 hover:text-white"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Prompts List */}
      {loading ? (
        <div className="py-16 text-center text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-[#0a0a0a] rounded-2xl border border-dashed border-neutral-800">
          <Zap className="w-10 h-10 text-neutral-700 mx-auto mb-3" />

          <p className="text-sm text-white font-medium">
            Belum ada prompt.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const typeInfo = typeLabels[p.type] || typeLabels.faq;

            return (
              <div
                key={p.id}
                className="bg-[#0a0a0a] border border-neutral-800 hover:border-neutral-700 rounded-2xl p-5 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${typeInfo.color}`}
                      >
                        {typeInfo.label}
                      </span>

                      {p.isActive && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          Aktif
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-white group-hover:text-neutral-300 transition-colors">
                      {p.name}
                    </h3>

                    <p className="text-xs text-neutral-400 mt-1.5 whitespace-pre-wrap line-clamp-3 font-mono bg-black/70 p-2 rounded-lg border border-neutral-800">
                      {p.content}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleActive(p)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 cursor-pointer"
                      title="Toggle Aktif"
                    >
                      {p.isActive ? (
                        <ToggleRight className="w-5 h-5 text-white" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>

                    <button
                      onClick={() => void duplicatePrompt(p)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 cursor-pointer"
                      title="Duplikat prompt"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => openEditModal(p)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setPendingDelete(p)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-neutral-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold text-white mb-5">
              {editingPrompt ? "Edit Prompt" : "Tambah Prompt Baru"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Tipe Prompt
                </label>

                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value,
                    })
                  }
                  disabled={!!editingPrompt}
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 disabled:opacity-50"
                >
                  <option value="faq">FAQ</option>
                  <option value="route">Route</option>
                  <option value="small_talk">Small Talk</option>
                  <option value="guided_routing">Guided Routing</option>
                  <option value="rag">RAG</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Nama Prompt
                </label>

                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Konten Prompt
                </label>

                <textarea
                  rows={6}
                  required
                  value={form.content}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      content: e.target.value,
                    })
                  }
                  placeholder="Gunakan {context}, {question}, {message} sebagai placeholder..."
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm font-mono placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-600"
                />

                <p className="text-[11px] text-neutral-600 mt-1">
                  {form.type === "faq" || form.type === "rag"
                    ? `Placeholder: {context} (hasil KB), {question}, {message}, {fullName}, {name}, {email}.`
                    : `Placeholder: {question}, {message}, {fullName}, {name}, {email}.`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      isActive: e.target.checked,
                    })
                  }
                  className="accent-neutral-200"
                />

                <label className="text-xs text-neutral-300">
                  Aktifkan prompt ini (nonaktifkan prompt lain dengan tipe
                  yang sama)
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs text-neutral-500 hover:text-white hover:bg-neutral-900 rounded-lg transition-colors"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-xl shadow-md cursor-pointer transition-all"
                >
                  {editingPrompt ? "Perbarui" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}