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
} from "lucide-react";

interface Prompt {
  id: string;
  type: "faq" | "small_talk" | "route";
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

  const notify = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
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

    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/prompts");
      if (res.ok) {
        const data = await res.json();
        setPrompts(data.prompts || []);
      }
    } catch { }
    setLoading(false);
  };

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

  const deletePrompt = async (id: string) => {
    if (!confirm("Hapus prompt ini?")) return;

    try {
      await fetch(`/api/prompts/${id}`, {
        method: "DELETE",
      });

      notify("success", "Prompt berhasil dihapus.");
      fetchPrompts();
    } catch { }
  };

  const toggleActive = async (p: Prompt) => {
    try {
      await fetch(`/api/prompts/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...p,
          isActive: !p.isActive,
          type: p.type,
        }),
      });

      fetchPrompts();
    } catch { }
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-white" />
            Prompt Management
          </h1>

          <p className="text-neutral-400 text-sm mt-1">
            Kelola prompt template untuk FAQ, Route, dan Small Talk.
          </p>
        </div>

        <button
          onClick={() => openNewModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-neutral-200 text-black text-sm font-medium rounded-xl shadow-lg shadow-black/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Prompt
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: "all", label: "Semua" },
          { key: "faq", label: "FAQ" },
          { key: "route", label: "Route" },
          { key: "small_talk", label: "Small Talk" },
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
                      onClick={() => openEditModal(p)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-800 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => deletePrompt(p.id)}
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
                  Placeholder: {"{context}"} (FAQ KB), {"{question}"}{" "}
                  (pertanyaan user), {"{message}"} (pesan user)
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