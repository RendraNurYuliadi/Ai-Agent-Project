"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getImageProxyUrl } from "@/lib/image-proxy-url";
import { usePathname } from "next/navigation";
import {
  History,
  MessageSquare,
  Trash2,
  Eye,
  X,
  Bot,
  Loader2,
  Search,
  ExternalLink,
  Calendar,
  CircleHelp,
  Sparkles,
  UserRound,
  ShieldCheck,
  Layers3,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { FormattedMessage } from "@/components/formatted-message";
import { ResponseMeta } from "@/components/response-meta";
import { ActionToast, ConfirmDialog } from "@/components/action-feedback";

interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  user?: ConversationUser | null;
  bot?: ConversationBot | null;
  botUser?: ConversationUser | null;
  skill?: ConversationSkill | null;
}

interface ConversationUser {
  id: string;
  name: string;
  fullName: string;
  email: string;
  role: string;
  userType: "human" | "bot";
  createdAt?: string | null;
}

interface ConversationBot {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  interactionCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface ConversationSkill {
  id: string;
  name: string;
  description: string;
}

interface FilterOption {
  id: string;
  name: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  messageType?: string;
  lmStudioAvailable?: boolean;
  generationDurationMs?: number;
  topArticles?: Array<{
    id: string;
    title: string;
    collectionName?: string;
    category?: string;
    score: number;
    matchedKeywords?: string[];
  }>;
  webSources?: Array<{ id: string; title: string; url: string; score: number; publishedDate?: string }>;
  uiComponents?: AssistantComponent[];
  botInteraction?: {
    type: "welcome_message" | "guided_routing" | "text_question";
    title?: string;
    subtitle?: string;
    icon?: string;
    footerText?: string;
    buttons?: ComponentActionButton[];
    quickButtons?: ComponentActionButton[];
  };
  timestamp: string;
}

interface ComponentActionButton {
  label: string;
  action: "reply" | "link";
  value: string;
}

interface ComponentCard {
  imageUrl: string;
  imageHeight?: number;
  title: string;
  subtitle: string;
  buttons: ComponentActionButton[];
}

interface AssistantComponent {
  id: string;
  name: string;
  title?: string;
  subtitle?: string;
  type: "reply_buttons" | "link_buttons" | "card" | "carousel";
  buttons: ComponentActionButton[];
  card: ComponentCard | null;
  cards: ComponentCard[];
}

interface UserProfile {
  name: string;
  fullName: string;
  email: string;
  role: string;
}

function HistoryComponentPreview({ component }: { component: AssistantComponent }) {
  const renderButtons = (items: ComponentActionButton[]) => (
    <div className="flex flex-wrap gap-2">
      {items.map((button, index) => (
        <span
          key={`${button.label}-${index}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-300"
        >
          {button.label}
          {button.action === "link" && <ExternalLink className="h-3 w-3" />}
        </span>
      ))}
    </div>
  );

  const renderCard = (card: ComponentCard, index: number) => (
    <article
      key={`${component.id}-card-${index}`}
      className="w-full min-w-0 overflow-hidden rounded-xl border border-neutral-800 bg-[#101010]"
    >
      {card.imageUrl && (
        <Image
          src={getImageProxyUrl(card.imageUrl)}
          alt={card.title}
          width={520}
          height={card.imageHeight ?? 128}
          unoptimized
          style={{ height: `${card.imageHeight ?? 128}px` }}
          className="w-full object-cover"
        />
      )}
      <div className="space-y-2.5 p-3">
        <div>
          <h4 className="text-sm font-semibold text-white">{card.title}</h4>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-neutral-400">
            {card.subtitle}
          </p>
        </div>
        {renderButtons(card.buttons)}
      </div>
    </article>
  );

  if (component.type === "reply_buttons") {
    return renderButtons(component.buttons);
  }

  if (component.type === "link_buttons") {
    return (
      <article className="w-full max-w-[320px] rounded-xl border border-neutral-800 bg-[#101010] p-3">
        {component.title && <h4 className="text-sm font-semibold text-white">{component.title}</h4>}
        {component.subtitle && (
          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-neutral-400">
            {component.subtitle}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-start gap-2">
          {component.buttons.map((button, index) => (
            <div
              key={`${button.label}-${index}`}
              className="flex w-fit max-w-full items-center gap-1.5 break-words rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2.5"
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-200">
                {button.label}<ExternalLink className="h-3 w-3" />
              </span>
            </div>
          ))}
        </div>
      </article>
    );
  }

  if (component.type === "card" && component.card) {
    return <div className="w-full max-w-[260px]">{renderCard(component.card, 0)}</div>;
  }

  if (component.type === "carousel" && component.cards.length > 0) {
    return (
      <div className="flex w-full gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {component.cards.map((card, index) => (
          <div key={`${component.id}-${index}`} className="w-[240px] shrink-0 snap-start">
            {renderCard(card, index)}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function HistoryBotInteractionPreview({ data }: { data: NonNullable<Message["botInteraction"]> }) {
  const Icon = data.icon === "bot" ? Bot : data.icon === "message" ? MessageSquare : data.icon === "help" ? CircleHelp : Sparkles;
  const buttons = data.buttons || data.quickButtons || [];
  return (
    <article className="w-full max-w-[360px] rounded-xl border border-neutral-800 bg-[#101010] p-3.5">
      {data.type === "welcome_message" && (
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-black"><Icon className="h-4 w-4" /></span>
          <h3 className="text-sm font-semibold text-white">{data.title}</h3>
        </div>
      )}
      {data.subtitle && <p className="whitespace-pre-wrap text-xs leading-5 text-neutral-300">{data.subtitle}</p>}
      {buttons.length > 0 && <div className="mt-3 flex flex-wrap items-start gap-2">
        {buttons.map((button, index) => (
          <span key={`${button.label}-${index}`} className="inline-flex w-fit max-w-full items-center gap-1.5 break-words rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-300">
            {button.label}
            {button.action === "link" && <ExternalLink className="h-3 w-3 shrink-0" />}
          </span>
        ))}
      </div>}
      {data.footerText && <p className="mt-3 border-t border-neutral-800 pt-2 text-[10px] text-neutral-600">{data.footerText}</p>}
    </article>
  );
}

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

function getInitials(fullName: string, name: string): string {
  const source = (fullName || name || "?").trim();
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function getAvatarGradient(role: string): string {
  switch (role) {
    case "admin":
      return "from-neutral-300 to-white";
    case "manager":
      return "from-neutral-500 to-neutral-300";
    default:
      return "from-neutral-700 to-neutral-500";
  }
}

function ProfileSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-neutral-800 bg-[#080808] p-3.5">
    <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold text-neutral-200">{icon}{title}</h2>
    {children}
  </section>;
}

function ProfileFields({ fields }: { fields: Array<[string, string]> }) {
  return <dl className="space-y-2.5">{fields.map(([label, value]) => <div key={label} className="min-w-0">
    <dt className="text-[9px] uppercase text-neutral-600">{label}</dt>
    <dd className="mt-0.5 break-words text-[11px] text-neutral-300">{value || "-"}</dd>
  </div>)}</dl>;
}

function ProfileEmpty() {
  return <p className="text-[10px] text-neutral-600">Data tidak tersedia.</p>;
}

export default function ChatHistoryPage() {
  const pathname = usePathname();
  const isAllConversationsRoute = pathname === "/dashboard/all-conversations";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewConv, setViewConv] = useState<{
    id: string;
    title: string;
    messages: Message[];
    user?: ConversationUser | null;
    bot?: ConversationBot | null;
    botUser?: ConversationUser | null;
    skill?: ConversationSkill | null;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [error, setError] = useState("");
  const [botFilter, setBotFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({ search: "", botId: "", skillId: "", dateFrom: "", dateTo: "" });
  const [botOptions, setBotOptions] = useState<FilterOption[]>([]);
  const [skillOptions, setSkillOptions] = useState<FilterOption[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [refreshCount, setRefreshCount] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    let current = true;
    fetch("/api/auth/me").then((response) => response.json()).then((profileData) => {
      if (!current) return;
      if (profileData.user) {
        const profile = profileData.user;
        setIsStaff(profile.role === "admin" || profile.role === "manager");
        setUserProfile({
          name: profile.name || "User",
          fullName: profile.fullName || profile.name || "User",
          email: profile.email || "",
          role: profile.role || "public_user",
        });
      }
    });
    return () => { current = false; };
  }, []);

  useEffect(() => {
    let current = true;
    const query = new URLSearchParams();
    if (isAllConversationsRoute) {
      query.set("scope", "all");
      query.set("page", String(page));
      if (appliedFilters.search) query.set("search", appliedFilters.search);
      if (appliedFilters.botId) query.set("botId", appliedFilters.botId);
      if (appliedFilters.skillId) query.set("skillId", appliedFilters.skillId);
      if (appliedFilters.dateFrom) query.set("dateFrom", appliedFilters.dateFrom);
      if (appliedFilters.dateTo) query.set("dateTo", appliedFilters.dateTo);
    }
    fetch(`/api/conversations${query.size ? `?${query}` : ""}`).then(async (response) => {
      const data = await response.json();
      if (!current) return;
      if (!response.ok) {
        setError(data.error || "Gagal memuat percakapan.");
        return;
      }
      setConversations(data.conversations || []);
      setPagination(data.pagination || { page: 1, pageSize: 20, total: data.conversations?.length || 0, totalPages: 1 });
      setBotOptions(data.filters?.bots || []);
      setSkillOptions(data.filters?.skills || []);
      setError("");
    }).catch(() => {
      if (current) setError("Gagal memuat percakapan.");
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => { current = false; };
  }, [isAllConversationsRoute, page, appliedFilters, refreshCount]);

  const fetchHistory = () => {
    setLoading(true);
    setRefreshCount((count) => count + 1);
  };

  const viewConversation = async (conv: Conversation) => {
    setSelectedConversationId(conv.id);
    setLoadingDetail(true);
    setError("");
    try {
      const res = await fetch(`/api/conversations/${conv.id}`);
      if (res.ok) {
        const data = await res.json();
        setViewConv({
          id: conv.id,
          title: conv.title,
          messages: data.conversation.messages || [],
          user: data.conversation.user || conv.user || null,
          bot: data.conversation.bot || conv.bot || null,
          botUser: data.conversation.botUser || conv.botUser || null,
          skill: data.conversation.skill || conv.skill || null,
        });
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Gagal memuat detail percakapan.");
      }
    } catch {
      setError("Gagal memuat detail percakapan.");
    }
    setLoadingDetail(false);
  };

  const deleteConv = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/conversations/${pendingDelete.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus percakapan.");
      setConversations((prev) => prev.filter((conversation) => conversation.id !== pendingDelete.id));
      if (viewConv?.id === pendingDelete.id) setViewConv(null);
      setNotice(`Percakapan "${pendingDelete.title}" berhasil dihapus.`);
      setPendingDelete(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Gagal menghapus percakapan.");
    } finally {
      setDeleting(false);
    }
  };

  const deleteAllConversations = async () => {
    setDeletingAll(true);
    try {
      const response = await fetch(`/api/conversations${isAllConversationsRoute ? "?scope=all" : ""}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus semua percakapan.");
      setConversations([]);
      setViewConv(null);
      setSelectedConversationId("");
      setPagination({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
      setBulkDeleteOpen(false);
      setNotice(`${data.deletedCount} percakapan berhasil dihapus.`);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Gagal menghapus semua percakapan.");
    } finally {
      setDeletingAll(false);
    }
  };

  const filtered = isAllConversationsRoute
    ? conversations
    : conversations.filter((conversation) => conversation.title.toLowerCase().includes(search.toLowerCase()));

  if (isStaff && isAllConversationsRoute) {
    const selectedConversation = conversations.find((item) => item.id === selectedConversationId);
    const selectedUser = viewConv?.user || selectedConversation?.user;
    const selectedBot = viewConv?.bot || selectedConversation?.bot;
    const selectedBotUser = viewConv?.botUser || selectedConversation?.botUser;
    const selectedSkill = viewConv?.skill || selectedConversation?.skill;

    return <div className="space-y-5">
      <ActionToast type="success" message={notice} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Hapus percakapan?"
        message={pendingDelete ? `Percakapan "${pendingDelete.title}" akan dihapus permanen.` : ""}
        pending={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void deleteConv()}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Hapus semua percakapan?"
        message={isAllConversationsRoute ? "Semua percakapan di seluruh sistem akan dihapus, termasuk yang tidak terlihat karena filter aktif. Tindakan ini tidak dapat dibatalkan." : "Semua percakapan milik akun Anda akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."}
        confirmLabel="Hapus semua"
        pending={deletingAll}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => void deleteAllConversations()}
      />
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Admin workspace</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-white"><History className="h-6 w-6" />All Conversations</h1>
          <p className="mt-1 text-sm text-neutral-500">Semua percakapan user, beserta detail user dan bot yang digunakan.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setBulkDeleteOpen(true)} disabled={loading || deletingAll} className="inline-flex items-center gap-2 rounded-md border border-red-900/70 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-950/40 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Hapus semua percakapan</button>
          <button type="button" onClick={() => void fetchHistory()} disabled={loading} className="inline-flex w-fit items-center gap-2 rounded-md border border-neutral-800 px-3 py-2 text-xs text-neutral-300 hover:bg-neutral-900 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Muat ulang</button>
        </div>
      </header>

      <form onSubmit={(event) => {
        event.preventDefault();
        setLoading(true);
        setPage(1);
        setViewConv(null);
        setSelectedConversationId("");
        setAppliedFilters({ search, botId: botFilter, skillId: skillFilter, dateFrom, dateTo });
      }} className="grid gap-3 rounded-lg border border-neutral-800 bg-[#080808] p-3 sm:grid-cols-2 xl:grid-cols-6">
        <label className="space-y-1.5 text-[10px] text-neutral-500 xl:col-span-2">Username, nama lengkap, email, atau judul
          <span className="relative block"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" /><input type="search" placeholder="Cari user atau percakapan..." value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-md border border-neutral-800 bg-black py-2 pl-9 pr-3 text-xs text-white placeholder-neutral-600 outline-none focus:border-neutral-600" /></span>
        </label>
        <label className="space-y-1.5 text-[10px] text-neutral-500">Bot Management
          <select value={botFilter} onChange={(event) => setBotFilter(event.target.value)} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600"><option value="">Semua bot</option>{botOptions.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}</select>
        </label>
        <label className="space-y-1.5 text-[10px] text-neutral-500">Skill
          <select value={skillFilter} onChange={(event) => setSkillFilter(event.target.value)} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600"><option value="">Semua skill</option>{skillOptions.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select>
        </label>
        <label className="space-y-1.5 text-[10px] text-neutral-500">Dari tanggal<input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} className="block w-full rounded-md border border-neutral-800 bg-black px-2 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600" /></label>
        <label className="space-y-1.5 text-[10px] text-neutral-500">Sampai tanggal<input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} className="block w-full rounded-md border border-neutral-800 bg-black px-2 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600" /></label>
        <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-6">
          <button type="submit" className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-neutral-200">Terapkan filter</button>
          <button type="button" onClick={() => {
            setLoading(true);
            setSearch(""); setBotFilter(""); setSkillFilter(""); setDateFrom(""); setDateTo(""); setPage(1); setViewConv(null); setSelectedConversationId("");
            setAppliedFilters({ search: "", botId: "", skillId: "", dateFrom: "", dateTo: "" });
          }} className="rounded-md border border-neutral-800 px-3 py-2 text-xs text-neutral-400 hover:text-white">Reset</button>
        </div>
      </form>
      {error && <div role="alert" className="rounded-md border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-200">{error}</div>}

      <div className="grid min-h-[620px] grid-cols-1 gap-3 xl:grid-cols-[minmax(250px,0.85fr)_minmax(340px,1.5fr)_minmax(230px,0.8fr)]">
        <section className="flex min-h-[360px] flex-col overflow-hidden rounded-lg border border-neutral-800 bg-[#080808] xl:max-h-[calc(100vh-250px)]">
          <div className="flex items-center justify-between border-b border-neutral-800 px-3.5 py-3">
            <h2 className="text-xs font-semibold text-neutral-200">Percakapan</h2>
            <span className="text-[10px] text-neutral-600">{pagination.total} percakapan</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-neutral-500" /></div> : filtered.length === 0 ? <p className="px-4 py-12 text-center text-xs text-neutral-600">{search ? "Tidak ada hasil yang cocok." : "Belum ada percakapan."}</p> : filtered.map((conversation) => {
              const active = selectedConversationId === conversation.id;
              return <button key={conversation.id} type="button" onClick={() => void viewConversation(conversation)} className={`w-full border-b border-neutral-900 px-3.5 py-3 text-left transition-colors last:border-0 ${active ? "bg-neutral-900" : "hover:bg-neutral-950"}`}>
                <span className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 text-xs font-medium text-neutral-200">{conversation.title}</span>
                  <span className="shrink-0 text-[9px] text-neutral-600">{conversation.messageCount} pesan</span>
                </span>
                <span className="mt-1.5 block truncate text-[10px] text-neutral-500">{conversation.user?.fullName || conversation.user?.name || "User tidak ditemukan"}{conversation.user?.email ? ` · ${conversation.user.email}` : ""}</span>
                <span className="mt-1 flex items-center justify-between gap-2 text-[9px] text-neutral-600"><span className="truncate">{conversation.bot?.name || "Tanpa bot"}{conversation.skill ? ` · ${conversation.skill.name}` : ""}</span><span className="shrink-0">{formatDate(conversation.updatedAt)}</span></span>
              </button>;
            })}
          </div>
          <footer className="flex items-center justify-between border-t border-neutral-800 px-3 py-2.5">
            <span className="text-[9px] text-neutral-600">{pagination.total === 0 ? "0 hasil" : `${(pagination.page - 1) * pagination.pageSize + 1}-${Math.min(pagination.page * pagination.pageSize, pagination.total)} dari ${pagination.total}`}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => { setLoading(true); setPage((current) => Math.max(1, current - 1)); }} disabled={page <= 1 || loading} aria-label="Halaman sebelumnya" title="Halaman sebelumnya" className="rounded p-1.5 text-neutral-400 hover:bg-neutral-900 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-12 text-center text-[10px] text-neutral-500">{pagination.page} / {pagination.totalPages}</span>
              <button type="button" onClick={() => { setLoading(true); setPage((current) => Math.min(pagination.totalPages, current + 1)); }} disabled={page >= pagination.totalPages || loading} aria-label="Halaman berikutnya" title="Halaman berikutnya" className="rounded p-1.5 text-neutral-400 hover:bg-neutral-900 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </footer>
        </section>

        <section className="flex min-h-[460px] flex-col overflow-hidden rounded-lg border border-neutral-800 bg-black xl:max-h-[calc(100vh-250px)]">
          {viewConv ? <>
            <header className="flex items-center justify-between gap-3 border-b border-neutral-800 bg-[#080808] px-4 py-3">
              <div className="min-w-0"><h2 className="truncate text-sm font-semibold text-white">{viewConv.title}</h2><p className="mt-1 text-[10px] text-neutral-600">{viewConv.messages.length} pesan · {formatDate(selectedConversation?.createdAt || "")}</p></div>
              <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] ${selectedBot?.isActive ? "border-emerald-900/70 text-emerald-300" : "border-neutral-800 text-neutral-500"}`}>{selectedBot?.isActive ? "Bot aktif" : "Bot tidak tersedia"}</span>
            </header>
            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              {loadingDetail && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-neutral-500" /></div>}
              {!loadingDetail && viewConv.messages.length === 0 && <p className="py-12 text-center text-xs text-neutral-600">Belum ada pesan di percakapan ini.</p>}
              {!loadingDetail && viewConv.messages.map((message, index) => {
                const isUser = message.role === "user";
                return <div key={message.id || index} className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-neutral-300 text-black" : "bg-white text-black"}`} title={isUser ? selectedUser?.fullName : selectedBot?.name}>
                    {isUser ? <span className="text-[9px] font-semibold">{getInitials(selectedUser?.fullName || "", selectedUser?.name || "U")}</span> : <Bot className="h-3.5 w-3.5" />}
                  </span>
                  <div className={`flex min-w-0 max-w-[86%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
                    <span className="px-1 text-[9px] text-neutral-600">{isUser ? selectedUser?.fullName || "User" : selectedBot?.name || "Bot"}</span>
                    {message.content && <div className={`rounded-xl px-3 py-2.5 text-xs leading-relaxed ${isUser ? "rounded-tr-sm bg-white text-black" : "rounded-tl-sm border border-neutral-800 bg-[#111] text-neutral-300"}`}><FormattedMessage content={message.content} isUser={isUser} /></div>}
                    {!isUser && message.botInteraction && <HistoryBotInteractionPreview data={message.botInteraction} />}
                    {!isUser && message.uiComponents?.map((component) => <HistoryComponentPreview key={component.id} component={component} />)}
                    <ResponseMeta
                      timestamp={message.timestamp}
                      generationDurationMs={isUser ? undefined : message.generationDurationMs}
                      showRetrieval={!isUser && (message.messageType === "FAQ" || message.messageType === "RAG" || message.messageType === "WEB_SEARCH")}
                      webSearch={!isUser && message.messageType === "WEB_SEARCH"}
                      topArticles={message.topArticles}
                      uiComponents={message.uiComponents}
                      webSources={message.webSources}
                    />
                  </div>
                </div>;
              })}
            </div>
          </> : <div className="flex flex-1 flex-col items-center justify-center px-6 text-center"><MessageSquare className="h-8 w-8 text-neutral-700" /><p className="mt-3 text-sm font-medium text-neutral-400">Pilih percakapan</p><p className="mt-1 text-xs text-neutral-600">Preview chat akan tampil di sini.</p></div>}
        </section>

        <aside className="space-y-3 xl:max-h-[calc(100vh-250px)] xl:overflow-y-auto">
          <ProfileSection icon={<UserRound className="h-4 w-4" />} title="Biodata user">
            {selectedUser ? <ProfileFields fields={[["Nama lengkap", selectedUser.fullName], ["Username", selectedUser.name], ["Email", selectedUser.email], ["Role", selectedUser.role], ["Tipe", selectedUser.userType], ["Terdaftar", selectedUser.createdAt ? formatDate(selectedUser.createdAt) : "-"], ["User ID", selectedUser.id]]} /> : <ProfileEmpty />}
          </ProfileSection>
          <ProfileSection icon={<Bot className="h-4 w-4" />} title="Biodata bot">
            {selectedBot ? <>
              <ProfileFields fields={[["Nama bot", selectedBot.name], ["Status", selectedBot.isActive ? "Aktif" : "Tidak aktif"], ["Jumlah interaction", String(selectedBot.interactionCount)], ["Bot ID", selectedBot.id], ["Dibuat", selectedBot.createdAt ? formatDate(selectedBot.createdAt) : "-"], ["Diperbarui", selectedBot.updatedAt ? formatDate(selectedBot.updatedAt) : "-"]]} />
              <p className="mt-3 whitespace-pre-wrap text-[10px] leading-4 text-neutral-500">{selectedBot.description || "Tidak ada deskripsi bot."}</p>
            </> : <ProfileEmpty />}
          </ProfileSection>
          {(selectedBotUser || selectedSkill) && <ProfileSection icon={<Layers3 className="h-4 w-4" />} title="Relasi">
            {selectedBotUser && <div className="mb-3"><p className="text-[9px] uppercase text-neutral-600">User bot</p><p className="mt-1 text-xs text-neutral-300">{selectedBotUser.fullName || selectedBotUser.name}</p><p className="mt-0.5 break-all text-[10px] text-neutral-600">{selectedBotUser.email}</p></div>}
            {selectedSkill && <div><p className="text-[9px] uppercase text-neutral-600">Skill</p><p className="mt-1 text-xs text-neutral-300">{selectedSkill.name}</p><p className="mt-0.5 whitespace-pre-wrap text-[10px] leading-4 text-neutral-600">{selectedSkill.description || "Tanpa deskripsi"}</p></div>}
          </ProfileSection>}
          {viewConv && <div className="flex items-start gap-2 px-1 text-[9px] text-neutral-700"><ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" /><span className="break-all">Conversation ID: {viewConv.id}</span></div>}
        </aside>
      </div>
    </div>;
  }

  const userInitials = userProfile
    ? getInitials(userProfile.fullName, userProfile.name)
    : "?";

  const avatarGradient = userProfile
    ? getAvatarGradient(userProfile.role)
    : "from-neutral-700 to-neutral-500";

  return (
    <div className="space-y-6">
      <ActionToast type="success" message={notice} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Hapus percakapan?"
        message={pendingDelete ? `Percakapan "${pendingDelete.title}" akan dihapus permanen.` : ""}
        pending={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void deleteConv()}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Hapus semua percakapan?"
        message={isAllConversationsRoute ? "Semua percakapan di seluruh sistem akan dihapus, termasuk yang tidak terlihat karena filter aktif. Tindakan ini tidak dapat dibatalkan." : "Semua percakapan milik akun Anda akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."}
        confirmLabel="Hapus semua"
        pending={deletingAll}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => void deleteAllConversations()}
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <History className="w-6 h-6 text-white" />
            Chat History
          </h1>

          <p className="text-neutral-500 text-sm mt-1">
            Riwayat percakapan Anda dengan GenAI Chatbot. History tersimpan
            privat per pengguna.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setBulkDeleteOpen(true)} disabled={loading || conversations.length === 0 || deletingAll} className="inline-flex items-center gap-2 rounded-xl border border-red-900/70 px-3.5 py-2 text-xs font-medium text-red-200 hover:bg-red-950/40 disabled:opacity-40"><Trash2 className="h-4 w-4" />Hapus semua ({conversations.length})</button>
          <Link href="/dashboard/chatbot" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-medium transition-colors shadow-md shadow-black/30 w-fit"><Bot className="w-4 h-4" />Buka Chatbot</Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" />

        <input
          type="text"
          placeholder="Cari percakapan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-neutral-800 rounded-xl text-white placeholder-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700 focus:border-neutral-600 transition-all"
        />
      </div>

      {/* History List */}
      {loading ? (
        <div className="py-20 text-center text-neutral-500">
          <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-neutral-300" />
          <p className="text-sm">Memuat riwayat percakapan...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-[#0a0a0a] rounded-2xl border border-dashed border-neutral-800 p-8">
          <MessageSquare className="w-12 h-12 text-neutral-700 mx-auto mb-3" />

          <h3 className="text-base font-semibold text-white">
            Belum Ada Riwayat
          </h3>

          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            {search
              ? "Tidak ada percakapan yang cocok dengan kata kunci."
              : "Mulai percakapan baru di menu Chatbot untuk melihat riwayat tersimpan."}
          </p>

          <Link
            href="/dashboard/chatbot"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs rounded-xl border border-neutral-800 transition-colors"
          >
            Mulai Chat Sekarang
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((conv) => (
            <div
              key={conv.id}
              className="bg-[#0a0a0a] border border-neutral-800 hover:border-neutral-700 rounded-2xl p-4 flex flex-col justify-between transition-all group hover:bg-[#111111] shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => viewConversation(conv)}
                  >
                    <h3 className="text-sm font-semibold text-white group-hover:text-neutral-300 transition-colors line-clamp-2">
                      {conv.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 shrink-0">
                    <button
                      onClick={() => viewConversation(conv)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors"
                      title="Lihat Percakapan"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <Link
                      href={`/dashboard/chatbot?id=${conv.id}`}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors"
                      title="Lanjutkan di Chatbot"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => setPendingDelete(conv)}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-800 text-[11px] text-neutral-500">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3 text-neutral-400" />
                    {conv.messageCount} pesan
                  </span>

                  <span>•</span>

                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-neutral-600" />
                    {formatDate(conv.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Conversation Modal */}
      {viewConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl w-full max-w-3xl shadow-2xl relative my-8 max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-800 bg-[#080808] flex items-center justify-between shrink-0">
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black text-neutral-300 border border-neutral-800">
                    {viewConv.messages.length} pesan
                  </span>

                  <h3 className="text-sm sm:text-base font-semibold text-white truncate">
                    {viewConv.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/dashboard/chatbot?id=${viewConv.id}`}
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lanjutkan Chat</span>
                </Link>

                <button
                  onClick={() => setViewConv(null)}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Messages with Avatar and Timestamp */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-black">
              {loadingDetail ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-neutral-300 mb-2" />
                  <p className="text-xs text-neutral-500">
                    Memuat detail percakapan...
                  </p>
                </div>
              ) : viewConv.messages.length === 0 ? (
                <p className="text-xs text-neutral-600 text-center py-16">
                  Tidak ada pesan dalam percakapan ini.
                </p>
              ) : (
                viewConv.messages.map((msg, idx) => {
                  const isUser = msg.role === "user";

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"
                        }`}
                    >
                      {/* Avatar */}
                      {isUser ? (
                        <div
                          className={`w-8 h-8 rounded-full bg-gradient-to-tr ${avatarGradient} flex items-center justify-center text-[11px] font-bold ${userProfile?.role === "admin"
                            ? "text-black"
                            : "text-white"
                            } select-none shrink-0 shadow-md`}
                          title={userProfile?.fullName || "User"}
                        >
                          {userInitials}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-md">
                          <Bot className="w-4 h-4 text-black" />
                        </div>
                      )}

                      {/* Bubble + meta */}
                      <div
                        className={`flex flex-col gap-1 max-w-[82%] sm:max-w-[72%] ${isUser ? "items-end" : "items-start"
                          }`}
                      >
                        {/* Badges for assistant */}
                        {!isUser && (
                          <div className="flex items-center gap-1.5 pl-1 text-[10px] text-neutral-500">
                            <span className="font-semibold text-white">
                              GenAI
                            </span>

                            {msg.messageType && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-black text-neutral-300 border border-neutral-800">
                                {msg.messageType}
                              </span>
                            )}

                            {msg.lmStudioAvailable === false && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-black text-neutral-400 border border-neutral-800">
                                Offline
                              </span>
                            )}
                          </div>
                        )}

                        {/* Bubble */}
                        {msg.content && <div
                          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser
                            ? "bg-white text-black rounded-tr-sm shadow-lg font-medium"
                            : "bg-[#111111] text-neutral-300 border border-neutral-800 rounded-tl-sm shadow-md"
                            }`}
                        >
                          <FormattedMessage content={msg.content} isUser={isUser} />
                        </div>}

                        {!isUser && msg.botInteraction && (
                          <HistoryBotInteractionPreview data={msg.botInteraction} />
                        )}

                        {!isUser && msg.uiComponents?.map((component) => (
                          <div key={component.id} className="w-full pl-1">
                            <HistoryComponentPreview component={component} />
                          </div>
                        ))}

                        <ResponseMeta
                          timestamp={msg.timestamp}
                          generationDurationMs={isUser ? undefined : msg.generationDurationMs}
                          showRetrieval={!isUser && (msg.messageType === "FAQ" || msg.messageType === "RAG" || msg.messageType === "WEB_SEARCH")}
                          webSearch={!isUser && msg.messageType === "WEB_SEARCH"}
                          topArticles={msg.topArticles}
                          uiComponents={msg.uiComponents}
                          webSources={msg.webSources}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-neutral-800 bg-[#080808] flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => setViewConv(null)}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-medium border border-neutral-800 transition-colors"
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