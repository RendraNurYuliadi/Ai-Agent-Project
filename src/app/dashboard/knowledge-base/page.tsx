"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  Plus,
  Trash2,
  FileSpreadsheet,
  Search,
  Eye,
  Edit3,
  X,
  CheckCircle2,
  AlertCircle,
  Upload,
  Loader2,
  FolderOpen,
  Copy,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Tag,
  PlusCircle,
  Sparkles,
  Info,
} from "lucide-react";
import Papa from "papaparse";
import { FormattedMessage } from "@/components/formatted-message";
import { ConfirmDialog } from "@/components/action-feedback";

interface KnowledgeBase {
  id: string;
  collectionName: string;
  displayName: string;
  description: string;
  isActive: boolean;
  articleCount: number;
  createdAt: string;
}

interface Article {
  id: string;
  [key: string]: unknown;
}

const PAGE_SIZE = 20;

export default function KnowledgeBasePage() {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKbStatusId, setSavingKbStatusId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState("public_user");

  // Active KB for viewing articles
  const [activeKb, setActiveKb] = useState<KnowledgeBase | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [articleSearch, setArticleSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [showNewKbModal, setShowNewKbModal] = useState(false);
  const [showAddArticleModal, setShowAddArticleModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailArticle, setDetailArticle] = useState<Article | null>(null);

  // Edit Article Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    category: "General",
    summary: "",
    content: "",
    tags: "",
  });

  // Delete Article Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingArticle, setDeletingArticle] = useState<Article | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  // New KB form
  const [newKbName, setNewKbName] = useState("");
  const [newKbDesc, setNewKbDesc] = useState("");
  const [pendingDeleteKb, setPendingDeleteKb] = useState<KnowledgeBase | null>(null);
  const [deletingKb, setDeletingKb] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deletingAllKb, setDeletingAllKb] = useState(false);

  // Manual article form
  const [manualForm, setManualForm] = useState({
    title: "",
    category: "General",
    summary: "",
    content: "",
    tags: "",
  });

  // CSV state
  const [csvPreview, setCsvPreview] = useState<Record<string, unknown>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Notification
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const notify = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const isReadOnly = userRole === "public_user";

  useEffect(() => {
    fetchKBs();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setUserRole(d.user.role);
          if (d.user.role === "public_user") {
            window.location.href = "/dashboard/chatbot";
          }
        }
      })
      .catch(() => { });
  }, []);

  const fetchKBs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge-bases");
      if (res.ok) {
        const data = await res.json();
        setKbs(data.knowledgeBases || []);
      }
    } catch { }
    setLoading(false);
  };

  const openKb = async (kb: KnowledgeBase) => {
    setActiveKb(kb);
    setArticlesLoading(true);
    setArticleSearch("");
    setSelectedCategory("All");
    setCurrentPage(1);
    try {
      const res = await fetch(`/api/knowledge-bases/${kb.collectionName}/articles`);
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || []);
        setCategories(data.categories || []);
      }
    } catch { }
    setArticlesLoading(false);
  };

  const createKb = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/knowledge-bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: newKbName, description: newKbDesc }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      notify("success", `Knowledge Base "${newKbName}" berhasil dibuat!`);
      setShowNewKbModal(false);
      setNewKbName("");
      setNewKbDesc("");
      fetchKBs();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Gagal membuat KB");
    }
  };

  const duplicateKb = async (kb: KnowledgeBase) => {
    try {
      const response = await fetch("/api/knowledge-bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateFromId: kb.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menduplikasi Knowledge Base.");
      await fetchKBs();
      notify("success", `Knowledge Base "${kb.displayName}" berhasil diduplikat${data.name ? ` sebagai "${data.name}"` : ""}.`);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal menduplikasi Knowledge Base.");
    }
  };

  const deleteKb = async () => {
    if (!pendingDeleteKb) return;
    setDeletingKb(true);
    try {
      const response = await fetch(`/api/knowledge-bases/${pendingDeleteKb.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus Knowledge Base.");
      notify("success", `Knowledge Base "${pendingDeleteKb.displayName}" berhasil dihapus.`);
      if (activeKb?.id === pendingDeleteKb.id) {
        setActiveKb(null);
        setArticles([]);
      }
      setPendingDeleteKb(null);
      await fetchKBs();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal menghapus Knowledge Base.");
    } finally {
      setDeletingKb(false);
    }
  };

  const deleteAllKbs = async () => {
    setDeletingAllKb(true);
    try {
      const response = await fetch("/api/knowledge-bases", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus semua Knowledge Base.");
      setKbs([]);
      setActiveKb(null);
      setArticles([]);
      setBulkDeleteOpen(false);
      notify("success", `${data.deletedCount} Knowledge Base beserta artikelnya berhasil dihapus.`);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal menghapus semua Knowledge Base.");
    } finally {
      setDeletingAllKb(false);
    }
  };

  const toggleKbRetrieval = async (event: React.MouseEvent, kb: KnowledgeBase) => {
    event.stopPropagation();
    setSavingKbStatusId(kb.id);
    try {
      const res = await fetch(`/api/knowledge-bases/${kb.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !kb.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status RAG.");
      setKbs((previous) => previous.map((item) =>
        item.id === kb.id ? { ...item, isActive: !kb.isActive } : item
      ));
      notify("success", `${kb.displayName}: RAG ${kb.isActive ? "dinonaktifkan" : "diaktifkan"}.`);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal mengubah status RAG.");
    } finally {
      setSavingKbStatusId(null);
    }
  };

  const addArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeKb) return;
    try {
      const res = await fetch(`/api/knowledge-bases/${activeKb.collectionName}/articles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      notify("success", `Artikel "${manualForm.title}" berhasil ditambahkan!`);
      setShowAddArticleModal(false);
      setManualForm({ title: "", category: "General", summary: "", content: "", tags: "" });
      openKb(activeKb);
      fetchKBs();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Gagal menambah artikel");
    }
  };

  const openEditArticleModal = (art: Article) => {
    setEditingArticle(art);
    setEditForm({
      title: (art.title as string) || "",
      category: (art.category as string) || "General",
      summary: (art.summary as string) || "",
      content: (art.content as string) || (art.detail as string) || "",
      tags: Array.isArray(art.tags) ? (art.tags as string[]).join(", ") : (art.tags as string) || "",
    });
    setShowEditModal(true);
  };

  const handleUpdateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeKb || !editingArticle) return;
    try {
      const res = await fetch(`/api/knowledge-bases/${activeKb.collectionName}/articles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articleId: editingArticle.id,
          title: editForm.title,
          category: editForm.category,
          summary: editForm.summary,
          content: editForm.content,
          detail: editForm.content,
          tags: editForm.tags,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      notify("success", "Artikel berhasil diperbarui!");
      setShowEditModal(false);
      setEditingArticle(null);
      openKb(activeKb);
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Gagal memperbarui artikel");
    }
  };

  const handleDeleteArticle = async () => {
    if (!activeKb || !deletingArticle) return;
    setDeletingLoading(true);
    try {
      const res = await fetch(
        `/api/knowledge-bases/${activeKb.collectionName}/articles?articleId=${deletingArticle.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      notify("success", "Artikel berhasil dihapus.");
      setShowDeleteModal(false);
      setDeletingArticle(null);
      openKb(activeKb);
      fetchKBs();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Gagal menghapus artikel");
    } finally {
      setDeletingLoading(false);
    }
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: true,
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        setCsvHeaders(result.meta.fields || []);
        setCsvPreview(
          (result.data as Record<string, unknown>[]).filter((r) =>
            Object.values(r).some((v) => v !== null && v !== "" && v !== undefined)
          )
        );
      },
    });
  };

  const importCsv = async () => {
    if (!activeKb || csvPreview.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/knowledge-bases/${activeKb.collectionName}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: csvPreview }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      notify("success", data.message || `Berhasil mengimpor ${data.insertedCount} artikel!`);
      setShowCsvModal(false);
      setCsvPreview([]);
      setCsvHeaders([]);
      setCsvFile(null);
      openKb(activeKb);
      fetchKBs();
    } catch (err: unknown) {
      notify("error", err instanceof Error ? err.message : "Gagal mengimpor");
    }
    setImporting(false);
  };

  const standardKeys = ["id", "_id", "createdAt", "updatedAt", "createdBy", "updatedBy", "importedBy"];

  const filteredArticles = articles.filter((a) => {
    if (selectedCategory !== "All" && a.category !== selectedCategory) return false;
    if (!articleSearch.trim()) return true;
    const term = articleSearch.toLowerCase();
    return Object.values(a).some((v) => typeof v === "string" && v.toLowerCase().includes(term));
  });

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE));
  const paginatedArticles = filteredArticles.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-medium transition-all ${notification.type === "success"
            ? "bg-[#0a0a0a]/95 border-neutral-700 text-neutral-200"
            : "bg-[#0a0a0a]/95 border-neutral-700 text-neutral-300"
            }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-white" />
          ) : (
            <AlertCircle className="w-5 h-5 text-neutral-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(pendingDeleteKb)}
        title="Hapus Knowledge Base?"
        message={pendingDeleteKb ? `Knowledge Base "${pendingDeleteKb.displayName}" beserta seluruh artikelnya akan dihapus permanen.` : ""}
        pending={deletingKb}
        onCancel={() => setPendingDeleteKb(null)}
        onConfirm={() => void deleteKb()}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Hapus semua Knowledge Base?"
        message={`Sebanyak ${kbs.length} Knowledge Base dan seluruh artikelnya akan dihapus permanen.`}
        confirmLabel="Hapus semua"
        pending={deletingAllKb}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => void deleteAllKbs()}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {activeKb ? (
              <button
                onClick={() => setActiveKb(null)}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white font-medium mb-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Kembali ke Daftar Koleksi
              </button>
            ) : (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 text-neutral-300 border border-neutral-700 font-medium">
                1 MongoDB Collection = 1 Knowledge Base
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 mt-1">
            <Database className="w-6 h-6 text-white" />
            {activeKb ? activeKb.displayName : "Knowledge Base"}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {activeKb
              ? `Koleksi: ${activeKb.collectionName} • ${articles.length} artikel terdaftar`
              : "Setiap Knowledge Base diisolasi ke dalam koleksi MongoDB tersendiri."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {activeKb ? (
            <>
              {!isReadOnly && (
                <>
                  <button
                    onClick={() => setShowCsvModal(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111111] hover:bg-[#1a1a1a] border border-neutral-800 text-neutral-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-neutral-400" />
                    <span>Import CSV</span>
                  </button>
                  <button
                    onClick={() => setShowAddArticleModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition-all shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Artikel</span>
                  </button>
                </>
              )}
            </>
          ) : (
            !isReadOnly && (
              <div className="flex flex-wrap gap-2">
                {userRole === "admin" && <button type="button" onClick={() => setBulkDeleteOpen(true)} disabled={loading || kbs.length === 0 || deletingAllKb} className="inline-flex items-center gap-2 rounded-xl border border-red-900/70 px-3.5 py-2.5 text-xs font-medium text-red-200 hover:bg-red-950/40 disabled:opacity-40"><Trash2 className="h-4 w-4" />Hapus semua ({kbs.length})</button>}
                <button onClick={() => setShowNewKbModal(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition-all shadow-md cursor-pointer"><Plus className="w-4 h-4" /><span>Add Collection</span></button>
              </div>
            )
          )}
        </div>
      </div>

      {/* KB LIST VIEW */}
      {!activeKb && (
        <>
          {loading ? (
            <div className="py-20 text-center text-neutral-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-neutral-300" />
              <p className="text-xs">Memuat daftar Knowledge Base...</p>
            </div>
          ) : kbs.length === 0 ? (
            <div className="py-16 text-center bg-[#0a0a0a] rounded-3xl border border-dashed border-neutral-800 p-8">
              <FolderOpen className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">Belum ada Knowledge Base</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                Buat Knowledge Base baru untuk mulai menyimpan dokumen artikel atau mengimpor data CSV.
              </p>
              {!isReadOnly && (
                <button
                  onClick={() => setShowNewKbModal(true)}
                  className="mt-4 px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-xl shadow-md cursor-pointer"
                >
                  Buat Knowledge Base Pertama
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kbs.map((kb) => (
                <div
                  key={kb.id}
                  onClick={() => openKb(kb)}
                  className="bg-[#0a0a0a] border border-neutral-800 hover:border-neutral-600 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-sm hover:shadow-lg cursor-pointer overflow-hidden relative"
                >
                  <div className="min-w-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2.5 bg-white/5 text-white rounded-xl group-hover:scale-105 transition-transform">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      {!isReadOnly && (
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={kb.isActive}
                            onClick={(event) => void toggleKbRetrieval(event, kb)}
                            disabled={savingKbStatusId === kb.id}
                            className={`inline-flex min-h-8 shrink-0 items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] leading-none whitespace-nowrap transition-colors disabled:opacity-50 ${kb.isActive ? "border-emerald-900 bg-emerald-950/40 text-emerald-300" : "border-neutral-800 bg-neutral-950 text-neutral-500"}`}
                            title={kb.isActive ? "Nonaktifkan dari retrieval RAG" : "Aktifkan untuk retrieval RAG"}
                          >
                            <span className={`relative inline-flex h-4 w-8 shrink-0 items-center rounded-full transition-colors ${kb.isActive ? "bg-emerald-700" : "bg-neutral-700"}`}>
                              <span className={`absolute left-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${kb.isActive ? "translate-x-4" : "translate-x-0"}`} />
                            </span>
                            <span className="shrink-0">RAG {kb.isActive ? "Aktif" : "Nonaktif"}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void duplicateKb(kb);
                            }}
                            className="text-neutral-600 hover:text-white p-1.5 rounded-lg hover:bg-neutral-900 transition-colors cursor-pointer"
                            title="Duplikat Knowledge Base"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDeleteKb(kb);
                            }}
                            className="text-neutral-600 hover:text-white p-1.5 rounded-lg hover:bg-neutral-900 transition-colors cursor-pointer"
                            title="Hapus Knowledge Base"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-neutral-300 transition-colors truncate">
                      {kb.displayName}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                      {kb.description || "Tidak ada deskripsi."}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-neutral-800 flex items-center justify-between gap-3 text-xs min-w-0">
                    <div className="min-w-0 flex-1">
                      <span
                        className="font-mono text-[11px] text-neutral-400 block truncate"
                        title={kb.collectionName}
                      >
                        {kb.collectionName}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openKb(kb);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white text-neutral-300 hover:text-black border border-neutral-700 hover:border-white text-xs font-semibold transition-all shrink-0 whitespace-nowrap flex items-center gap-1 cursor-pointer"
                    >
                      <span>Buka ({kb.articleCount})</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ARTICLES HORIZONTAL LIST VIEW WITH PAGINATION */}
      {activeKb && (
        <div className="space-y-4">
          {/* Search & Category Filter Section */}
          <div className="flex flex-col gap-3 bg-[#0a0a0a] p-3.5 rounded-2xl border border-neutral-800">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Cari artikel..."
                  value={articleSearch}
                  onChange={(e) => {
                    setArticleSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-black border border-neutral-800 rounded-xl text-white placeholder-neutral-600 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-700"
                />
              </div>

              {/* Category Filter Toggle Button */}
              {categories.length > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowCategoryFilter(!showCategoryFilter)}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${showCategoryFilter || selectedCategory !== "All"
                      ? "bg-white text-black border-white"
                      : "bg-black hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                  >
                    <Filter className="w-3.5 h-3.5" />
                    <span>
                      Kategori {selectedCategory !== "All" ? `(${selectedCategory})` : `(${categories.length})`}
                    </span>
                    {showCategoryFilter ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {selectedCategory !== "All" && (
                    <button
                      onClick={() => {
                        setSelectedCategory("All");
                        setCurrentPage(1);
                      }}
                      className="px-2.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-medium transition-all cursor-pointer"
                      title="Reset Filter"
                    >
                      Reset
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Collapsible Category Tags (Wrapped, No Horizontal Scrollbar) */}
            {showCategoryFilter && categories.length > 0 && (
              <div className="pt-3 border-t border-neutral-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-neutral-400" />
                    Pilih Kategori untuk Memfilter:
                  </span>
                  <button
                    onClick={() => setShowCategoryFilter(false)}
                    className="text-[11px] text-neutral-600 hover:text-neutral-300 cursor-pointer"
                  >
                    Sembunyikan
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedCategory("All");
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${selectedCategory === "All"
                      ? "bg-white text-black"
                      : "bg-black hover:bg-neutral-900 text-neutral-500 hover:text-white border border-neutral-800"
                      }`}
                  >
                    Semua ({articles.length})
                  </button>
                  {categories.map((c) => {
                    const count = articles.filter((a) => a.category === c).length;
                    return (
                      <button
                        key={c}
                        onClick={() => {
                          setSelectedCategory(c);
                          setCurrentPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${selectedCategory === c
                          ? "bg-white text-black"
                          : "bg-black hover:bg-neutral-900 text-neutral-500 hover:text-white border border-neutral-800"
                          }`}
                      >
                        {c} <span className="opacity-70 text-[10px]">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {articlesLoading ? (
            <div className="py-16 text-center text-neutral-500">
              <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-neutral-300" />
              <p className="text-xs">Memuat artikel...</p>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="py-12 text-center bg-[#0a0a0a] rounded-2xl border border-dashed border-neutral-800">
              <FileText className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-white">
                {articleSearch ? "Tidak ada artikel yang cocok." : "Knowledge Base ini masih kosong."}
              </p>
              {!isReadOnly && !articleSearch && (
                <button
                  onClick={() => setShowAddArticleModal(true)}
                  className="mt-3 px-3.5 py-1.5 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-xl shadow-md cursor-pointer"
                >
                  Tambah Artikel Pertama
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {paginatedArticles.map((art, idx) => {
                const itemNumber = (currentPage - 1) * PAGE_SIZE + idx + 1;
                const dynamicKeys = Object.keys(art).filter(
                  (k) =>
                    !standardKeys.includes(k) &&
                    !["title", "summary", "content", "detail", "category", "tags"].includes(k)
                );

                return (
                  <div
                    key={art.id}
                    className="p-4 rounded-2xl bg-[#0a0a0a] border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group shadow-sm hover:shadow-md"
                  >
                    {/* Left: Article info */}
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <span className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-500 text-xs font-mono font-semibold flex items-center justify-center shrink-0 mt-0.5">
                        {itemNumber}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-sm font-bold text-white group-hover:text-neutral-300 transition-colors">
                            {(art.title as string) || "Tanpa Judul"}
                          </h3>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/5 text-neutral-300 border border-neutral-700 font-semibold shrink-0">
                            {(art.category as string) || "General"}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-400 line-clamp-1 leading-relaxed">
                          {(art.summary as string) ||
                            (art.detail as string) ||
                            (art.content as string) ||
                            "Tidak ada ringkasan."}
                        </p>

                        {/* Tags and dynamic keys */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {Array.isArray(art.tags) &&
                            (art.tags as string[]).map((t, i) => (
                              <span
                                key={i}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800"
                              >
                                #{t}
                              </span>
                            ))}
                          {dynamicKeys.slice(0, 3).map((k) => (
                            <span
                              key={k}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-black border border-neutral-800 text-neutral-500 font-mono"
                            >
                              <span className="text-neutral-300">{k}:</span> {String(art[k])}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2.5 md:pt-0 border-neutral-800 justify-end">
                      <button
                        onClick={() => {
                          setDetailArticle(art);
                          setShowDetailModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                        title="Buka Detail"
                      >
                        <Eye className="w-3.5 h-3.5 text-neutral-300" />
                        <span>Detail</span>
                      </button>

                      {!isReadOnly && (
                        <>
                          <button
                            onClick={() => openEditArticleModal(art)}
                            className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                            title="Edit Artikel"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-neutral-300" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              setDeletingArticle(art);
                              setShowDeleteModal(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-500 hover:text-white transition-all text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                            title="Hapus Artikel"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Hapus</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 bg-[#0a0a0a] border border-neutral-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500 mt-4">
              <div>
                Menampilkan{" "}
                <span className="font-semibold text-white">
                  {(currentPage - 1) * PAGE_SIZE + 1}
                </span>{" "}
                -{" "}
                <span className="font-semibold text-white">
                  {Math.min(currentPage * PAGE_SIZE, filteredArticles.length)}
                </span>{" "}
                dari <span className="font-semibold text-white">{filteredArticles.length}</span> artikel
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium flex items-center gap-1 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-all cursor-pointer ${currentPage === page
                        ? "bg-white text-black"
                        : "bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white"
                        }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium flex items-center gap-1 transition-all cursor-pointer"
                >
                  Berikutnya <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: New KB */}
      {showNewKbModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowNewKbModal(false)}
              className="absolute top-5 right-5 text-neutral-500 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-white/5 text-white rounded-xl">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Buat Knowledge Base Baru</h3>
                <p className="text-xs text-neutral-500">1 Knowledge Base = 1 MongoDB Collection</p>
              </div>
            </div>
            <form onSubmit={createKb} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Nama Knowledge Base *
                </label>
                <input
                  type="text"
                  required
                  value={newKbName}
                  onChange={(e) => setNewKbName(e.target.value)}
                  placeholder="Misal: Product FAQ"
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700"
                />
                <p className="text-[11px] text-neutral-600 mt-1">
                  Akan menjadi collection: kb_
                  {newKbName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "_")
                    .slice(0, 20)}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Deskripsi</label>
                <textarea
                  rows={2}
                  value={newKbDesc}
                  onChange={(e) => setNewKbDesc(e.target.value)}
                  placeholder="Deskripsi opsional..."
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewKbModal(false)}
                  className="px-4 py-2 text-xs text-neutral-500 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Buat Knowledge Base
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Article */}
      {showAddArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowAddArticleModal(false)}
              className="absolute top-5 right-5 text-neutral-500 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-white/5 text-white rounded-xl">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Tambah Artikel Manual</h3>
                <p className="text-xs text-neutral-500">
                  Simpan ke collection: {activeKb?.collectionName}
                </p>
              </div>
            </div>
            <form onSubmit={addArticle} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Judul *</label>
                <input
                  type="text"
                  required
                  value={manualForm.title}
                  onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                  placeholder="Judul artikel"
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={manualForm.category}
                    onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                    placeholder="General"
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Tags (koma)</label>
                  <input
                    type="text"
                    value={manualForm.tags}
                    onChange={(e) => setManualForm({ ...manualForm, tags: e.target.value })}
                    placeholder="tag1, tag2"
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Ringkasan</label>
                <input
                  type="text"
                  value={manualForm.summary}
                  onChange={(e) => setManualForm({ ...manualForm, summary: e.target.value })}
                  placeholder="Ringkasan singkat"
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Konten / Detail</label>
                <textarea
                  rows={4}
                  value={manualForm.content}
                  onChange={(e) => setManualForm({ ...manualForm, content: e.target.value })}
                  placeholder="Isi konten artikel..."
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddArticleModal(false)}
                  className="px-4 py-2 text-xs text-neutral-500 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Article */}
      {showEditModal && editingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-5 right-5 text-neutral-500 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-white/5 text-white rounded-xl">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Edit Artikel</h3>
                <p className="text-xs text-neutral-500">
                  Koleksi: {activeKb?.collectionName} • ID: {editingArticle.id}
                </p>
              </div>
            </div>
            <form onSubmit={handleUpdateArticle} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Judul *</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Tags (koma)</label>
                  <input
                    type="text"
                    value={editForm.tags}
                    onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Ringkasan</label>
                <input
                  type="text"
                  value={editForm.summary}
                  onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">Konten / Detail</label>
                <textarea
                  rows={5}
                  value={editForm.content}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700 font-sans"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs text-neutral-500 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl shadow-md cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Confirmation */}
      {showDeleteModal && deletingArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-white/5 text-white rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Hapus Artikel Ini?</h3>
                <p className="text-xs text-neutral-500">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-black border border-neutral-800 mb-5">
              <p className="text-xs font-semibold text-white truncate">
                {(deletingArticle.title as string) || "Tanpa Judul"}
              </p>
              <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2">
                {(deletingArticle.summary as string) ||
                  (deletingArticle.content as string) ||
                  (deletingArticle.detail as string) ||
                  ""}
              </p>
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                disabled={deletingLoading}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs text-neutral-500 hover:text-white cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingLoading}
                onClick={handleDeleteArticle}
                className="px-5 py-2 bg-white hover:bg-neutral-200 disabled:opacity-50 text-black text-xs font-semibold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {deletingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Ya, Hapus Artikel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CSV Import */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowCsvModal(false)}
              className="absolute top-5 right-5 text-neutral-500 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 bg-white/5 text-white rounded-xl">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Import CSV ke Knowledge Base</h3>
                <p className="text-xs text-neutral-500">
                  Target collection: {activeKb?.collectionName} (Field dinamis otomatis)
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-black border border-dashed border-neutral-700 text-center">
                <Upload className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <label className="block text-xs font-semibold text-neutral-300 hover:text-white cursor-pointer">
                  <span>Pilih file CSV</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFile}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-neutral-500 mt-1">
                  {csvFile ? csvFile.name : "Format: 1 baris = 1 artikel, header = nama field dinamis"}
                </p>
              </div>

              {csvHeaders.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    Field Terdeteksi ({csvHeaders.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {csvHeaders.map((h) => (
                      <span
                        key={h}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-900 text-neutral-300 border border-neutral-800 font-mono"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {csvPreview.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    Preview Data ({csvPreview.length} baris):
                  </span>
                  <div className="max-h-48 overflow-auto border border-neutral-800 rounded-xl bg-black">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-[#0a0a0a] text-neutral-500 sticky top-0">
                        <tr>
                          {csvHeaders.map((h) => (
                            <th key={h} className="p-2 border-b border-neutral-800 font-mono">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60 text-neutral-400">
                        {csvPreview.slice(0, 5).map((row, idx) => (
                          <tr key={idx}>
                            {csvHeaders.map((h) => (
                              <td key={h} className="p-2 truncate max-w-[150px]">
                                {String(row[h] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvPreview.length > 5 && (
                    <p className="text-[10px] text-neutral-600 mt-1">
                      ...dan {csvPreview.length - 5} baris lainnya
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  className="px-4 py-2 text-xs text-neutral-500 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={importCsv}
                  disabled={importing || csvPreview.length === 0}
                  className="px-5 py-2 bg-white hover:bg-neutral-200 disabled:opacity-40 text-black text-xs font-semibold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>Impor {csvPreview.length} Artikel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Detail Article */}
      {showDetailModal && detailArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowDetailModal(false)}
              className="absolute top-5 right-5 text-neutral-500 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-900 text-neutral-300 border border-neutral-800 font-semibold">
                {(detailArticle.category as string) || "General"}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mb-4">
              {(detailArticle.title as string) || "Tanpa Judul"}
            </h2>

            <div className="space-y-3 text-xs">
              {Boolean(detailArticle.summary) && (
                <div className="p-3.5 rounded-xl bg-black border border-neutral-800">
                  <span className="text-[11px] font-semibold text-neutral-500 block mb-1">Ringkasan:</span>
                  <p className="text-neutral-300 leading-relaxed">{detailArticle.summary as string}</p>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-black border border-neutral-800">
                <span className="text-[11px] font-semibold text-neutral-500 block mb-1">Konten / Detail:</span>
                <div className="text-neutral-300">
                  <FormattedMessage
                    content={
                      ((detailArticle.content as string) ||
                        (detailArticle.detail as string) ||
                        "Tidak ada konten.")
                    }
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-black border border-neutral-800">
                <span className="text-[11px] font-semibold text-neutral-500 block mb-2">Semua Field:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {Object.entries(detailArticle)
                    .filter(([k]) => k !== "id")
                    .map(([k, v]) => (
                      <div key={k} className="p-2 rounded-lg bg-[#0a0a0a] border border-neutral-800">
                        <span className="font-mono text-neutral-300 block font-semibold">{k}:</span>
                        <span className="text-neutral-300 break-words block mt-0.5">
                          {typeof v === "object" ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-5 border-t border-neutral-800 flex items-center justify-between">
              {!isReadOnly && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openEditArticleModal(detailArticle);
                    }}
                    className="px-3.5 py-1.5 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Artikel
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setDeletingArticle(detailArticle);
                      setShowDeleteModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-white hover:bg-neutral-200 text-black rounded-xl text-xs cursor-pointer ml-auto"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}