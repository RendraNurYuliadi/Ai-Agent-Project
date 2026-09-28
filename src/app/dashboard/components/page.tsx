"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Blocks,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type {
  ComponentArticleReference,
  ComponentButton,
  ComponentTemplate,
  ComponentTemplateInput,
  ComponentType,
  StaticComponentCard,
} from "@/lib/component-templates";

interface ArticleOption extends ComponentArticleReference {
  kbName: string;
  title: string;
  category: string;
}

const typeLabels: Record<ComponentType, string> = {
  reply_buttons: "Reply Buttons",
  link_buttons: "Link Buttons",
  card: "Card",
  carousel: "Carousel",
};

const blankButton = (action: ComponentButton["action"] = "reply"): ComponentButton => ({
  label: "",
  action,
  value: "",
});

const blankCard = (): StaticComponentCard => ({
  imageUrl: "",
  imageHeight: 128,
  title: "",
  subtitle: "",
  buttons: [],
});

const blankTemplate = (): ComponentTemplateInput => ({
  name: "",
  type: "reply_buttons",
  isActive: true,
  articleRefs: [],
  buttons: [blankButton()],
  card: blankCard(),
  cards: [blankCard()],
});

function ButtonFields({
  buttons,
  onChange,
  max = 10,
  actionMode = "selectable",
}: {
  buttons: ComponentButton[];
  onChange: (buttons: ComponentButton[]) => void;
  max?: number;
  actionMode?: "reply" | "link" | "selectable";
}) {
  return (
    <div className="space-y-2">
      {buttons.map((button, index) => (
        <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]">
          <input
            value={button.label}
            onChange={(event) => onChange(buttons.map((item, itemIndex) =>
              itemIndex === index ? { ...item, label: event.target.value } : item
            ))}
            placeholder="Label tombol"
            aria-label={`Label tombol ${index + 1}`}
            className="rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
          />
          {actionMode === "selectable" ? (
            <select
              value={button.action}
              onChange={(event) => onChange(buttons.map((item, itemIndex) =>
                itemIndex === index
                  ? { ...item, action: event.target.value as ComponentButton["action"] }
                  : item
              ))}
              aria-label={`Aksi tombol ${index + 1}`}
              className="rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-neutral-300 focus:border-neutral-600 focus:outline-none"
            >
              <option value="reply">Reply</option>
              <option value="link">Link</option>
            </select>
          ) : (
            <div className="flex items-center rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-[11px] text-neutral-500">
              {actionMode === "reply" ? "Reply" : "Link"}
            </div>
          )}
          <input
            value={button.value}
            onChange={(event) => onChange(buttons.map((item, itemIndex) =>
              itemIndex === index ? { ...item, value: event.target.value } : item
            ))}
            placeholder={button.action === "link" ? "https://... atau /halaman" : "Nilai pesan yang dikirim"}
            aria-label={`Custom value tombol ${index + 1}`}
            className="rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onChange(buttons.filter((_, itemIndex) => itemIndex !== index))}
            disabled={buttons.length <= 1}
            title="Hapus tombol"
            aria-label={`Hapus tombol ${index + 1}`}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-800 text-neutral-500 hover:bg-neutral-900 hover:text-white disabled:opacity-30"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...buttons, blankButton(actionMode === "selectable" ? "reply" : actionMode)])}
        disabled={buttons.length >= max}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 px-2.5 py-1.5 text-[11px] text-neutral-400 hover:bg-neutral-900 hover:text-white disabled:opacity-40"
      >
        <Plus className="h-3 w-3" /> Tambah tombol <span className="text-neutral-600">{buttons.length}/{max}</span>
      </button>
    </div>
  );
}

function CardFields({
  card,
  onChange,
}: {
  card: StaticComponentCard;
  onChange: (card: StaticComponentCard) => void;
}) {
  const update = (patch: Partial<StaticComponentCard>) => onChange({ ...card, ...patch });
  return (
    <div className="space-y-3 rounded-md border border-neutral-800 bg-neutral-950 p-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
        <input
          value={card.imageUrl}
          onChange={(event) => update({ imageUrl: event.target.value })}
          placeholder="URL gambar (opsional)"
          className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
        />
        <label className="flex items-center gap-2 text-[10px] text-neutral-500">
          Tinggi gambar
          <input
            type="number"
            min={64}
            max={500}
            step={8}
            value={card.imageHeight}
            onChange={(event) => update({ imageHeight: Number(event.target.value) })}
            className="w-20 rounded-md border border-neutral-800 bg-black px-2 py-2 text-xs text-white focus:border-neutral-600 focus:outline-none"
          />
          px
        </label>
      </div>
      <input
        value={card.title}
        onChange={(event) => update({ title: event.target.value })}
        placeholder="Judul card"
        className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
      />
      <textarea
        value={card.subtitle}
        onChange={(event) => update({ subtitle: event.target.value })}
        placeholder="Subtitle"
        rows={2}
        className="w-full resize-y rounded-md border border-neutral-800 bg-black px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
      />
      <div>
        <p className="mb-2 text-[10px] font-medium uppercase text-neutral-600">Tombol card · maksimal 3</p>
        <ButtonFields
          buttons={card.buttons}
          max={3}
          onChange={(buttons) => update({ buttons })}
        />
      </div>
    </div>
  );
}

export default function ComponentsPage() {
  const [templates, setTemplates] = useState<ComponentTemplate[]>([]);
  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ComponentTemplateInput>(blankTemplate());
  const [articleSearch, setArticleSearch] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const notify = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });
    window.setTimeout(() => setNotification(null), 4000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [componentsResponse, knowledgeBasesResponse] = await Promise.all([
        fetch("/api/components"),
        fetch("/api/knowledge-bases"),
      ]);
      const componentsData = await componentsResponse.json();
      const knowledgeBasesData = await knowledgeBasesResponse.json();
      if (!componentsResponse.ok) throw new Error(componentsData.error || "Gagal memuat template.");
      if (!knowledgeBasesResponse.ok) throw new Error(knowledgeBasesData.error || "Gagal memuat Knowledge Base.");

      const knowledgeBases = (knowledgeBasesData.knowledgeBases || []).filter(
        (kb: { isActive?: boolean }) => kb.isActive !== false
      );
      setTemplates(componentsData.components || []);
      const articleGroups = await Promise.all(knowledgeBases.map(async (kb: {
        collectionName: string;
        displayName: string;
      }) => {
        try {
          const response = await fetch(`/api/knowledge-bases/${encodeURIComponent(kb.collectionName)}/articles`);
          const data = await response.json();
          if (!response.ok) return [];
          return (data.articles || []).map((article: { id: string; title: string; category?: string }) => ({
            collectionName: kb.collectionName,
            articleId: article.id,
            kbName: kb.displayName,
            title: article.title || "Tanpa judul",
            category: article.category || "",
          }));
        } catch {
          return [];
        }
      }));
      setArticles(articleGroups.flat());
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal memuat data Components.");
    } finally {
      setLoading(false);
      setLoadingArticles(false);
    }
  }, [notify]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const openCreate = () => {
    setEditingId(null);
    setForm(blankTemplate());
    setArticleSearch("");
    setModalOpen(true);
  };

  const openEdit = (template: ComponentTemplate) => {
    setEditingId(template.id);
    setForm({
      name: template.name,
      type: template.type,
      isActive: template.isActive,
      articleRefs: template.articleRefs.map((item) => ({ ...item })),
      buttons: template.buttons.map((item) => ({ ...item })),
      card: { ...template.card, imageHeight: template.card.imageHeight ?? 128, buttons: template.card.buttons.map((item) => ({ ...item })) },
      cards: template.cards.map((card) => ({ ...card, imageHeight: card.imageHeight ?? 128, buttons: card.buttons.map((item) => ({ ...item })) })),
    });
    setArticleSearch("");
    setModalOpen(true);
  };

  const saveTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(editingId ? `/api/components/${editingId}` : "/api/components", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan template.");
      setModalOpen(false);
      notify("success", editingId ? "Template diperbarui." : "Template dibuat.");
      await loadData();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal menyimpan template.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (template: ComponentTemplate) => {
    const response = await fetch(`/api/components/${template.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...template, isActive: !template.isActive }),
    });
    if (!response.ok) {
      const data = await response.json();
      notify("error", data.error || "Gagal mengubah status template.");
      return;
    }
    setTemplates((previous) => previous.map((item) =>
      item.id === template.id ? { ...item, isActive: !item.isActive } : item
    ));
  };

  const deleteTemplate = async (template: ComponentTemplate) => {
    if (!window.confirm(`Hapus template "${template.name}"?`)) return;
    const response = await fetch(`/api/components/${template.id}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json();
      notify("error", data.error || "Gagal menghapus template.");
      return;
    }
    setTemplates((previous) => previous.filter((item) => item.id !== template.id));
    notify("success", "Template dihapus.");
  };

  const toggleArticle = (article: ArticleOption) => {
    const selected = form.articleRefs.some((item) =>
      item.collectionName === article.collectionName && item.articleId === article.articleId
    );
    if (selected) {
      setForm((previous) => ({
        ...previous,
        articleRefs: previous.articleRefs.filter((item) =>
          item.collectionName !== article.collectionName || item.articleId !== article.articleId
        ),
      }));
    } else if (form.articleRefs.length < 10) {
      setForm((previous) => ({
        ...previous,
        articleRefs: [...previous.articleRefs, {
          collectionName: article.collectionName,
          articleId: article.articleId,
        }],
      }));
    }
  };

  const filteredArticles = articles.filter((article) =>
    `${article.title} ${article.kbName} ${article.category}`.toLowerCase().includes(articleSearch.toLowerCase())
  );
  const updateCard = (index: number, card: StaticComponentCard) => {
    setForm((previous) => previous.type === "card"
      ? { ...previous, card }
      : { ...previous, cards: previous.cards.map((item, itemIndex) => itemIndex === index ? card : item) }
    );
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 border px-4 py-3 text-sm shadow-xl ${notification.type === "success" ? "border-neutral-700 bg-neutral-950 text-white" : "border-red-900 bg-neutral-950 text-red-300"}`}>
          {notification.message}
        </div>
      )}

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-900 pb-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-neutral-500">
            <Blocks className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase">Konfigurasi</span>
          </div>
          <h1 className="text-xl font-semibold text-white">Components</h1>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-white px-3.5 py-2 text-xs font-semibold text-black hover:bg-neutral-200"
        >
          <Plus className="h-4 w-4" /> Buat template
        </button>
      </header>

      <section className="overflow-hidden rounded-lg border border-neutral-800 bg-[#090909]">
        <div className="grid grid-cols-[minmax(0,1fr)_110px_100px_auto] gap-3 border-b border-neutral-800 px-4 py-3 text-[10px] font-semibold uppercase text-neutral-600 sm:grid-cols-[minmax(0,2fr)_130px_120px_130px]">
          <span>Template</span><span>Tipe</span><span>Artikel</span><span className="text-right">Status / Aksi</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-neutral-500" /></div>
        ) : templates.length ? templates.map((template) => (
          <div key={template.id} className="grid grid-cols-[minmax(0,1fr)_110px_100px_auto] items-center gap-3 border-b border-neutral-900 px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,2fr)_130px_120px_130px]">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-200">{template.name}</p>
              <p className="mt-0.5 truncate text-[10px] text-neutral-600">
                {template.articleRefs.map((ref) => articles.find((article) => article.collectionName === ref.collectionName && article.articleId === ref.articleId)?.title || ref.articleId).join(", ")}
              </p>
            </div>
            <span className="text-[11px] text-neutral-400">{typeLabels[template.type]}</span>
            <span className="text-[11px] text-neutral-400">{template.articleRefs.length} artikel</span>
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => void toggleActive(template)}
                title={template.isActive ? "Nonaktifkan" : "Aktifkan"}
                aria-label={template.isActive ? `Nonaktifkan ${template.name}` : `Aktifkan ${template.name}`}
                className={`rounded px-2 py-1 text-[10px] ${template.isActive ? "bg-white/10 text-white" : "bg-neutral-900 text-neutral-500 hover:text-neutral-300"}`}
              >
                {template.isActive ? "Aktif" : "Nonaktif"}
              </button>
              <button type="button" onClick={() => openEdit(template)} title="Edit" aria-label={`Edit ${template.name}`} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-white">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => void deleteTemplate(template)} title="Hapus" aria-label={`Hapus ${template.name}`} className="rounded p-1.5 text-neutral-600 hover:bg-red-950 hover:text-red-300">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )) : (
          <div className="px-4 py-12 text-center">
            <Blocks className="mx-auto h-6 w-6 text-neutral-700" />
            <p className="mt-3 text-sm text-neutral-400">Belum ada component template.</p>
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6">
          <form onSubmit={saveTemplate} className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-neutral-700 bg-[#0b0b0b] shadow-2xl">
            <header className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-white">{editingId ? "Edit template" : "Buat component template"}</h2>
                <p className="mt-1 text-[11px] text-neutral-500">Konten template bersifat statis.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-white" aria-label="Tutup">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
              <div className="space-y-5 p-5">
                <div className="grid gap-3 sm:grid-cols-[1fr_190px]">
                  <label className="space-y-1.5 text-[11px] text-neutral-400">
                    Nama template
                    <input required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Contoh: Panduan akun" className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none" />
                  </label>
                  <label className="space-y-1.5 text-[11px] text-neutral-400">
                    Tipe komponen
                    <select
                      value={form.type}
                      onChange={(event) => {
                        const type = event.target.value as ComponentType;
                        setForm((previous) => ({
                          ...previous,
                          type,
                          buttons: type === "reply_buttons" || type === "link_buttons"
                            ? previous.buttons.map((button) => ({
                              ...button,
                              action: type === "link_buttons" ? "link" : "reply",
                            }))
                            : previous.buttons,
                        }));
                      }}
                      className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white focus:border-neutral-600 focus:outline-none"
                    >
                      {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                </div>

                {(form.type === "reply_buttons" || form.type === "link_buttons") && (
                  <section className="space-y-2 border-t border-neutral-900 pt-4">
                    <h3 className="text-xs font-medium text-neutral-200">Daftar tombol</h3>
                    <ButtonFields buttons={form.buttons} actionMode={form.type === "reply_buttons" ? "reply" : "link"} onChange={(buttons) => setForm({ ...form, buttons })} />
                  </section>
                )}

                {form.type === "card" && (
                  <section className="space-y-2 border-t border-neutral-900 pt-4">
                    <h3 className="text-xs font-medium text-neutral-200">Konten card</h3>
                    <CardFields card={form.card} onChange={(card) => setForm({ ...form, card })} />
                  </section>
                )}

                {form.type === "carousel" && (
                  <section className="space-y-3 border-t border-neutral-900 pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-medium text-neutral-200">Card carousel</h3>
                      <button type="button" onClick={() => setForm({ ...form, cards: [...form.cards, blankCard()] })} disabled={form.cards.length >= 10} className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white disabled:opacity-40">
                        <Plus className="h-3 w-3" /> Tambah card {form.cards.length}/10
                      </button>
                    </div>
                    {form.cards.map((card, index) => (
                      <div key={index} className="relative">
                        <p className="mb-2 text-[10px] uppercase text-neutral-600">Card {index + 1}</p>
                        {form.cards.length > 1 && (
                          <button type="button" onClick={() => setForm({ ...form, cards: form.cards.filter((_, itemIndex) => itemIndex !== index) })} className="absolute right-2 top-1 z-10 rounded p-1 text-neutral-600 hover:text-white" title="Hapus card" aria-label={`Hapus card ${index + 1}`}><X className="h-3.5 w-3.5" /></button>
                        )}
                        <CardFields card={card} onChange={(updated) => updateCard(index, updated)} />
                      </div>
                    ))}
                  </section>
                )}
              </div>

              <aside className="space-y-4 border-t border-neutral-800 bg-[#080808] p-5 lg:border-l lg:border-t-0">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-white">Artikel pemicu</h3>
                    <span className={`text-[10px] ${form.articleRefs.length > 0 ? "text-neutral-400" : "text-amber-400"}`}>{form.articleRefs.length}/10 dipilih</span>
                  </div>
                  <p className="mb-3 text-[10px] leading-4 text-neutral-600">Template muncul saat retrieval menemukan salah satu artikel terhubung.</p>
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-600" />
                    <input value={articleSearch} onChange={(event) => setArticleSearch(event.target.value)} placeholder="Cari artikel atau Knowledge Base" className="w-full rounded-md border border-neutral-800 bg-black py-2 pl-8 pr-3 text-xs text-white placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none" />
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-md border border-neutral-800">
                    {loadingArticles ? (
                      <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-neutral-500" /></div>
                    ) : filteredArticles.length ? filteredArticles.map((article) => {
                      const checked = form.articleRefs.some((item) => item.collectionName === article.collectionName && item.articleId === article.articleId);
                      const key = `${article.collectionName}:${article.articleId}`;
                      return (
                        <label key={key} className="flex cursor-pointer items-start gap-2.5 border-b border-neutral-900 px-3 py-2.5 last:border-0 hover:bg-neutral-950">
                          <input type="checkbox" checked={checked} disabled={!checked && form.articleRefs.length >= 10} onChange={() => toggleArticle(article)} className="mt-0.5 accent-white" />
                          <span className="min-w-0">
                            <span className="block truncate text-[11px] text-neutral-200">{article.title}</span>
                            <span className="mt-0.5 block truncate text-[9px] text-neutral-600">{article.kbName}{article.category ? ` · ${article.category}` : ""}</span>
                          </span>
                        </label>
                      );
                    }) : <p className="px-3 py-5 text-center text-[11px] text-neutral-600">{articles.length ? "Artikel tidak ditemukan." : "Belum ada artikel di Knowledge Base."}</p>}
                  </div>
                </div>

                <div className="border-t border-neutral-900 pt-4">
                  <h3 className="mb-2 text-xs font-semibold text-white">Preview</h3>
                  <div className="rounded-lg border border-neutral-800 bg-[#101010] p-3">
                    {(form.type === "card" || form.type === "carousel") ? (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {(form.type === "card" ? [form.card] : form.cards).map((card, index) => (
                          <div key={index} className="w-48 shrink-0 overflow-hidden rounded-md border border-neutral-800 bg-black">
                            {card.imageUrl && <img src={card.imageUrl} alt="" style={{ height: `${card.imageHeight}px` }} className="w-full object-cover" />}
                            <div className="p-2.5">
                              <p className="text-xs font-semibold text-white">{card.title || "Judul card"}</p>
                              <p className="mt-1 line-clamp-2 text-[10px] text-neutral-500">{card.subtitle || "Subtitle"}</p>
                              {card.buttons.map((button, buttonIndex) => <span key={buttonIndex} className="mt-2 mr-1 inline-block rounded border border-neutral-700 px-2 py-1 text-[9px] text-neutral-300">{button.label || "Tombol"}</span>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {form.buttons.map((button, index) => <span key={index} className="rounded-md border border-neutral-700 px-2.5 py-1.5 text-[10px] text-neutral-300">{button.label || `Tombol ${index + 1}`}</span>)}
                      </div>
                    )}
                  </div>
                </div>

                <label className="flex items-center gap-2 border-t border-neutral-900 pt-4 text-xs text-neutral-300">
                  <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} className="accent-white" />
                  Aktifkan template
                </label>
              </aside>
            </div>

            <footer className="flex justify-end gap-2 border-t border-neutral-800 bg-[#0b0b0b] px-5 py-3">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-md border border-neutral-800 px-3 py-2 text-xs text-neutral-400 hover:bg-neutral-900 hover:text-white">Batal</button>
              <button type="submit" disabled={saving || form.articleRefs.length < 1 || form.articleRefs.length > 10} className="inline-flex items-center gap-2 rounded-md bg-white px-3.5 py-2 text-xs font-semibold text-black hover:bg-neutral-200 disabled:opacity-40">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? "Menyimpan..." : "Simpan template"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}