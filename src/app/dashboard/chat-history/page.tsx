"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
} from "lucide-react";
import { FormattedMessage } from "@/components/formatted-message";

interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  messageType?: string;
  lmStudioAvailable?: boolean;
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
          src={card.imageUrl}
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

function formatTime(ts: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
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

export default function ChatHistoryPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewConv, setViewConv] = useState<{
    id: string;
    title: string;
    messages: Message[];
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchHistory();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUserProfile({
            name: data.user.name || "User",
            fullName: data.user.fullName || data.user.name || "User",
            email: data.user.email || "",
            role: data.user.role || "public_user",
          });
        }
      }
    } catch { }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch { }
    setLoading(false);
  };

  const viewConversation = async (conv: Conversation) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/conversations/${conv.id}`);
      if (res.ok) {
        const data = await res.json();
        setViewConv({
          id: conv.id,
          title: conv.title,
          messages: data.conversation.messages || [],
        });
      }
    } catch { }
    setLoadingDetail(false);
  };

  const deleteConv = async (id: string) => {
    if (!confirm("Hapus percakapan ini dari riwayat?")) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (viewConv?.id === id) setViewConv(null);
  };

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const userInitials = userProfile
    ? getInitials(userProfile.fullName, userProfile.name)
    : "?";

  const avatarGradient = userProfile
    ? getAvatarGradient(userProfile.role)
    : "from-neutral-700 to-neutral-500";

  return (
    <div className="space-y-6">
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

        <Link
          href="/dashboard/chatbot"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-medium transition-colors shadow-md shadow-black/30 w-fit"
        >
          <Bot className="w-4 h-4" />
          Buka Chatbot
        </Link>
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
                      onClick={() => deleteConv(conv.id)}
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

                        {/* Timestamp */}
                        <span className="text-[10px] text-neutral-600 px-1 select-none">
                          {formatTime(msg.timestamp)}
                        </span>
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