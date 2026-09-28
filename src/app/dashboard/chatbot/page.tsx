"use client";

import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
import Image from "next/image";
import {
  Bot,
  Send,
  Plus,
  Trash2,
  MessageSquare,
  Sparkles,
  Cpu,
  Loader2,
  ChevronLeft,
  Mic,
  MicOff,
  X,
  Copy,
  Check,
  Pencil,
  RotateCw,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { FormattedMessage } from "@/components/formatted-message";

interface SpeechRecognitionResultEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
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
    collectionName?: string;
    title: string;
    category: string;
    score: number;
    matchedKeywords: string[];
  }>;
  uiComponents?: AssistantComponent[];
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
  type: "reply_buttons" | "link_buttons" | "card" | "carousel";
  buttons: ComponentActionButton[];
  card: ComponentCard | null;
  cards: ComponentCard[];
  triggeredBy?: Array<{
    collectionName: string;
    articleId: string;
    title: string;
    score: number;
  }>;
}

interface MessageSubmissionOptions {
  editUserMessageId?: string;
  regenerateAssistantId?: string;
}

interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UserProfile {
  name: string;
  fullName: string;
  email: string;
  role: string;
}

function ComponentButtons({
  buttons,
  onReply,
  disabled,
  buttonMode,
}: {
  buttons: ComponentActionButton[];
  onReply: (value: string) => void;
  disabled: boolean;
  buttonMode?: "reply" | "link";
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((button, index) => (buttonMode || button.action) === "reply" ? (
        <button
          key={`${button.label}-${index}`}
          type="button"
          onClick={() => onReply(button.value)}
          disabled={disabled}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-800 disabled:opacity-40"
        >
          {button.label}
        </button>
      ) : (
        <a
          key={`${button.label}-${index}`}
          href={button.value}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-800"
        >
          {button.label}<ExternalLink className="h-3 w-3" />
        </a>
      ))}
    </div>
  );
}

function ComponentCardView({
  card,
  onReply,
  disabled,
}: {
  card: ComponentCard;
  onReply: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <article className="w-full min-w-0 overflow-hidden rounded-xl border border-neutral-800 bg-[#101010]">
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
          <h3 className="text-sm font-semibold text-white">{card.title}</h3>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-neutral-400">{card.subtitle}</p>
        </div>
        <ComponentButtons buttons={card.buttons} onReply={onReply} disabled={disabled} />
      </div>
    </article>
  );
}

function AssistantComponents({
  component,
  onReply,
  disabled,
}: {
  component: AssistantComponent;
  onReply: (value: string) => void;
  disabled: boolean;
}) {
  if (component.type === "reply_buttons" || component.type === "link_buttons") {
    return (
      <ComponentButtons
        buttons={component.buttons}
        onReply={onReply}
        disabled={disabled}
        buttonMode={component.type === "link_buttons" ? "link" : "reply"}
      />
    );
  }
  if (component.type === "card" && component.card) {
    return (
      <div className="w-full max-w-[260px]">
        <ComponentCardView card={component.card} onReply={onReply} disabled={disabled} />
      </div>
    );
  }
  if (component.type === "carousel") {
    return <ComponentCarousel component={component} onReply={onReply} disabled={disabled} />;
  }
  return null;
}

function ComponentCarousel({
  component,
  onReply,
  disabled,
}: {
  component: AssistantComponent;
  onReply: (value: string) => void;
  disabled: boolean;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardCount = component.cards.length;

  useEffect(() => {
    if (cardCount <= 1) return;
    const intervalId = window.setInterval(() => {
      setCurrentIndex((index) => (index + 1) % cardCount);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [cardCount]);

  if (cardCount === 0) return null;

  const showPrevious = () => setCurrentIndex((index) => (index - 1 + cardCount) % cardCount);
  const showNext = () => setCurrentIndex((index) => (index + 1) % cardCount);

  return (
    <div className="w-full max-w-[260px]" aria-roledescription="carousel">
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {component.cards.map((card, index) => (
            <div key={`${component.id}-${index}`} className="w-full shrink-0">
              <ComponentCardView card={card} onReply={onReply} disabled={disabled} />
            </div>
          ))}
        </div>
      </div>
      {cardCount > 1 && (
        <div className="mt-2 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={showPrevious}
            aria-label="Card sebelumnya"
            title="Card sebelumnya"
            className="rounded-md border border-neutral-800 p-1.5 text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-[10px] tabular-nums text-neutral-500">
            {currentIndex + 1} / {cardCount}
          </span>
          <button
            type="button"
            onClick={showNext}
            aria-label="Card berikutnya"
            title="Card berikutnya"
            className="rounded-md border border-neutral-800 p-1.5 text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function formatTime(ts: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)} dtk`;
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

interface GatewayModelOptions {
  provider: "lmstudio" | "openrouter";
  model: string;
  models: string[];
}

async function loadGatewayModelOptions(): Promise<GatewayModelOptions> {
  const configResponse = await fetch("/api/genai-route/config");
  if (!configResponse.ok) throw new Error("Gagal memuat konfigurasi model.");
  const configData = await configResponse.json();
  const provider = configData.config.provider === "openrouter" ? "openrouter" : "lmstudio";
  const model = provider === "openrouter"
    ? configData.config.openRouterModel
    : configData.config.model;

  let models: string[] = [];
  try {
    const modelsResponse = await fetch("/api/genai-route/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        baseUrl: configData.config.baseUrl,
        listModelsOnly: true,
      }),
    });
    const modelsData = await modelsResponse.json();
    if (modelsResponse.ok && modelsData.success && Array.isArray(modelsData.models)) {
      models = modelsData.models;
    }
  } catch {}

  return { provider, model, models };
}

export default function ChatbotPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatModelProvider, setChatModelProvider] = useState<"lmstudio" | "openrouter">("lmstudio");
  const [chatModel, setChatModel] = useState("local-model");
  const [availableChatModels, setAvailableChatModels] = useState<string[]>([]);
  const [loadingChatModels, setLoadingChatModels] = useState(true);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [speechLanguage, setSpeechLanguage] = useState("id-ID");
  const [isListening, setIsListening] = useState(false);
  const [speechModalOpen, setSpeechModalOpen] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const speechTranscriptRef = useRef("");
  const speechModalOpenRef = useRef(false);
  const speechSupported = useSyncExternalStore(
    () => () => {},
    () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    () => false
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    return () => {
      speechModalOpenRef.current = false;
      speechRecognitionRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchUserProfile();
    loadGatewayModelOptions()
      .then(({ provider, model, models }) => {
        setChatModelProvider(provider);
        setChatModel(model || (provider === "openrouter" ? "openrouter/free" : "local-model"));
        setAvailableChatModels(models);
      })
      .catch(() => {})
      .finally(() => setLoadingChatModels(false));

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlConvId = params.get("id");
      if (urlConvId) {
        loadConversation(urlConvId);
      }
    }
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

  const fetchConversations = async () => {
    setLoadingConvs(true);
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoadingConvs(false);
    }
  };

  const loadConversation = async (convId: string) => {
    setActiveConvId(convId);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.conversation.messages || []);
      }
    } catch (err) {
      console.error("Error loading conversation:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const createNewConversation = async () => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Percakapan Baru" }),
      });
      if (res.ok) {
        const data = await res.json();
        const newConv = data.conversation;
        setConversations((prev) => [
          {
            id: newConv.id,
            title: newConv.title,
            messageCount: 0,
            createdAt: newConv.createdAt,
            updatedAt: newConv.updatedAt,
          },
          ...prev,
        ]);
        setActiveConvId(newConv.id);
        setMessages([]);
      }
    } catch (err) {
      console.error("Error creating conversation:", err);
    }
  };

  const deleteConversation = async (convId: string) => {
    try {
      await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Error deleting conversation:", err);
    }
  };

  const startSpeechInput = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = speechLanguage;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) {
          transcript += event.results[index][0].transcript;
        }
      }

      if (transcript.trim()) {
        speechTranscriptRef.current = `${speechTranscriptRef.current} ${transcript.trim()}`.trim();
        setSpeechTranscript(speechTranscriptRef.current);
      }
    };
    recognition.onend = () => {
      if (speechModalOpenRef.current && speechRecognitionRef.current === recognition) {
        try {
          recognition.start();
          setIsListening(true);
          return;
        } catch { }
      }
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
    };

    speechRecognitionRef.current = recognition;
    speechModalOpenRef.current = true;
    setSpeechTranscript("");
    speechTranscriptRef.current = "";
    setSpeechModalOpen(true);
    setIsListening(true);
    recognition.start();
  };

  const closeSpeechInput = () => {
    speechModalOpenRef.current = false;
    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
    setIsListening(false);
    setSpeechModalOpen(false);

    const transcript = speechTranscriptRef.current.trim();
    if (transcript) {
      setInput(transcript);
      void submitMessage(transcript);
    }
  };

  const submitMessage = async (
    message: string,
    options: MessageSubmissionOptions = {}
  ) => {
    const isRegenerate = Boolean(options.regenerateAssistantId);
    const isReplacement = isRegenerate || Boolean(options.editUserMessageId);
    if ((!message.trim() && !isRegenerate) || sending) return;

    let convId = activeConvId;
    if (!convId) {
      if (isReplacement) return;
      try {
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Percakapan Baru" }),
        });
        if (res.ok) {
          const data = await res.json();
          convId = data.conversation.id;
          setActiveConvId(convId);
          setConversations((prev) => [
            {
              id: convId!,
              title: "Percakapan Baru",
              messageCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      } catch {
        return;
      }
    }

    if (!convId) return;

    const userMsg: Message | null = isReplacement
      ? null
      : {
        id: Date.now().toString(),
        role: "user",
        content: message.trim(),
        timestamp: new Date().toISOString(),
      };

    if (userMsg) {
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
    }
    setSending(true);

    try {
      const res = await fetch(`/api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          model: chatModel,
          ...options,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses pesan.");
      }

      if (options.editUserMessageId) {
        setMessages((prev) => prev.map((item) => {
          if (item.id === options.editUserMessageId) return data.userMessage;
          if (item.id === data.assistantMessage.id) return data.assistantMessage;
          return item;
        }));
        setEditingMessageId(null);
        setEditingText("");
      } else if (options.regenerateAssistantId) {
        setMessages((prev) => prev.map((item) =>
          item.id === options.regenerateAssistantId ? data.assistantMessage : item
        ));
      } else {
        setMessages((prev) => [
          ...prev.map((item) => item.id === userMsg!.id ? data.userMessage : item),
          data.assistantMessage,
        ]);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? {
                ...c,
                title: userMsg!.content.slice(0, 60),
                messageCount: c.messageCount + 2,
                updatedAt: new Date().toISOString(),
              }
              : c
          )
        );
      }
    } catch {
      const errorMsg: Message = {
        id: Date.now().toString() + "-err",
        role: "assistant",
        content: "Maaf, terjadi kesalahan saat memproses pesan Anda.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const copyMessage = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.setTimeout(() => {
        setCopiedMessageId((current) => current === message.id ? null : current);
      }, 1500);
    } catch {
      setCopiedMessageId(null);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitMessage(input);
  };

  const userInitials = userProfile
    ? getInitials(userProfile.fullName, userProfile.name)
    : "?";

  const avatarGradient = userProfile
    ? getAvatarGradient(userProfile.role)
    : "from-neutral-700 to-neutral-500";

  return (
    <div className="h-[calc(100vh-5rem)] flex rounded-2xl overflow-hidden border border-neutral-800 bg-black">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "w-72" : "w-0"
          } transition-all duration-200 bg-[#080808] border-r border-neutral-900 flex flex-col overflow-hidden shrink-0`}
      >
        <div className="p-3 border-b border-neutral-900 flex items-center justify-between shrink-0">
          <h3 className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-white" />
            Percakapan
          </h3>

          <div className="flex items-center gap-1">
            <button
              onClick={createNewConversation}
              className="p-1.5 rounded-lg bg-white hover:bg-neutral-200 text-black transition-colors cursor-pointer"
              title="Percakapan Baru"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConvs ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
              Memuat...
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 text-neutral-700" />
              Belum ada percakapan
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${activeConvId === conv.id
                  ? "bg-white text-black border border-white"
                  : "hover:bg-neutral-900 text-neutral-400 hover:text-white"
                  }`}
                onClick={() => loadConversation(conv.id)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{conv.title}</p>
                  <p
                    className={`text-[10px] mt-0.5 ${activeConvId === conv.id
                      ? "text-neutral-600"
                      : "text-neutral-600"
                      }`}
                  >
                    {conv.messageCount} pesan
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className={`p-1 rounded transition-all ${activeConvId === conv.id
                    ? "text-neutral-500 hover:text-black"
                    : "text-neutral-600 hover:text-white"
                    } opacity-0 group-hover:opacity-100`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

      </div>

      {speechModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="speech-dialog-title"
            className="w-full max-w-sm rounded-2xl border border-neutral-800 bg-[#0b0b0b] p-6 text-center shadow-2xl"
          >
            <div className="mb-5 flex justify-end">
              <button
                type="button"
                onClick={closeSpeechInput}
                aria-label="Tutup input suara dan kirim"
                title="Tutup input suara dan kirim"
                className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-900 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
              {isListening && (
                <>
                  <span className="absolute inset-0 animate-ping rounded-full border border-white/20" />
                  <span className="absolute inset-2 animate-pulse rounded-full bg-white/10" />
                </>
              )}
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-xl">
                {isListening ? <Mic className="h-7 w-7" /> : <MicOff className="h-7 w-7" />}
              </div>
            </div>

            <h2 id="speech-dialog-title" className="text-base font-semibold text-white">
              {isListening ? "Mendengarkan..." : "Siap mendengarkan"}
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              {speechLanguage === "id-ID" ? "Bahasa Indonesia" : "English"}
            </p>

            <div className="mt-5 min-h-20 rounded-xl border border-neutral-800 bg-black/60 p-3 text-left text-sm text-neutral-300">
              {speechTranscript || "Silakan bicara. Tutup modal untuk mengirim ke AI."}
            </div>

            <button
              type="button"
              onClick={closeSpeechInput}
              className="mt-5 w-full rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
            >
              {speechTranscript ? "Tutup & Kirim" : "Tutup"}
            </button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-black">
        {/* Header */}
        <div className="px-4 py-3 border-b border-neutral-900 flex items-center justify-between bg-[#080808] shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-900 border border-neutral-800 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              {sidebarOpen ? (
                <ChevronLeft className="w-4 h-4 text-white" />
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 text-white" />
                  <span className="text-xs font-medium text-neutral-300">
                    Percakapan ({conversations.length})
                  </span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white rounded-lg shadow">
                <Bot className="w-4 h-4 text-black" />
              </div>

              <div>
                <h2 className="text-sm font-semibold text-white">
                  GenAI Chatbot
                </h2>

                <p className="text-[10px] text-neutral-500 flex items-center gap-1">
                  <Cpu className="w-2.5 h-2.5" />
                  {chatModelProvider === "openrouter" ? "OpenRouter" : "LM Studio"} • {chatModel}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {userProfile && (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-neutral-900/70 border border-neutral-800">
                <div
                  className={`w-5 h-5 rounded-full bg-gradient-to-tr ${avatarGradient} flex items-center justify-center text-[9px] font-bold text-black select-none shrink-0`}
                >
                  {userInitials}
                </div>

                <span className="text-[11px] text-neutral-300 font-medium">
                  {userProfile.fullName || userProfile.name}
                </span>
              </div>
            )}

            <button
              onClick={createNewConversation}
              className="text-xs px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-lg border border-neutral-800 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3 h-3" />
              <span className="hidden sm:inline">Chat Baru</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {!activeConvId && messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-white mx-auto flex items-center justify-center shadow-xl mb-4">
                <Sparkles className="w-8 h-8 text-black" />
              </div>

              <h3 className="text-lg font-bold text-white mb-2">
                Mulai Percakapan Baru
              </h3>

              <p className="text-xs text-neutral-500 max-w-sm mb-6">
                Tanyakan apapun — chatbot akan otomatis mengklasifikasikan
                pertanyaan Anda ke FAQ atau Small Talk.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md w-full">
                {[
                  "Bagaimana cara login ke sistem?",
                  "Jelaskan tentang hak akses user",
                  "Halo, apa kabar?",
                  "Apa fungsi Knowledge Base?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="p-3 rounded-xl bg-[#0a0a0a] hover:bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 hover:text-white text-left transition-all cursor-pointer"
                  >
                    &ldquo;{q}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          ) : loadingMessages ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-300" />
            </div>
          ) : (
            <>
              {messages.map((msg, messageIndex) => {
                const isUser = msg.role === "user";
                const relatedUserMessage =
                  !isUser && messageIndex > 0 && messages[messageIndex - 1].role === "user"
                    ? messages[messageIndex - 1]
                    : null;
                const isEditing = editingMessageId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"
                      }`}
                  >
                    {/* Avatar */}
                    {isUser ? (
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-tr ${avatarGradient} flex items-center justify-center text-[11px] font-bold text-black select-none shrink-0 shadow-md`}
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
                      className={`flex flex-col gap-1 max-w-[80%] sm:max-w-[68%] ${isUser ? "items-end" : "items-start"
                        }`}
                    >
                      {/* Badges (assistant only, above bubble) */}
                      {!isUser && (
                        <div className="flex items-center gap-1.5 pl-1 text-[10px] text-neutral-500">
                          <span className="font-semibold text-white">
                            GenAI
                          </span>

                          {msg.messageType && (
                            <span
                              className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium ${msg.messageType === "FAQ"
                                ? "bg-white/10 text-white border border-white/20"
                                : "bg-neutral-700/20 text-neutral-300 border border-neutral-700/40"
                                }`}
                            >
                              {msg.messageType}
                            </span>
                          )}

                          {msg.lmStudioAvailable === false && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-neutral-800 text-neutral-400 border border-neutral-700">
                              Offline
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser
                          ? "bg-white text-black rounded-tr-sm shadow-lg font-medium"
                          : "bg-[#111111] text-neutral-300 border border-neutral-800 rounded-tl-sm shadow-md"
                          }`}
                      >
                        {isEditing ? (
                          <form
                            className="w-full min-w-48 space-y-2"
                            onSubmit={(event) => {
                              event.preventDefault();
                              void submitMessage(editingText, { editUserMessageId: msg.id });
                            }}
                          >
                            <textarea
                              autoFocus
                              value={editingText}
                              onChange={(event) => setEditingText(event.target.value)}
                              rows={Math.min(6, Math.max(2, editingText.split("\n").length))}
                              className="w-full resize-y bg-transparent text-sm text-black outline-none placeholder:text-neutral-500"
                              aria-label="Edit pesan user"
                            />
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMessageId(null);
                                  setEditingText("");
                                }}
                                disabled={sending}
                                className="rounded p-1 text-neutral-600 hover:bg-neutral-100 hover:text-black disabled:opacity-40"
                                title="Batal edit"
                                aria-label="Batal edit"
                              >
                                <X className="h-4 w-4" />
                              </button>
                              <button
                                type="submit"
                                disabled={sending || !editingText.trim()}
                                className="rounded p-1 text-neutral-600 hover:bg-neutral-100 hover:text-black disabled:opacity-40"
                                title="Kirim ulang"
                                aria-label="Kirim ulang pesan yang diedit"
                              >
                                <Send className="h-4 w-4" />
                              </button>
                            </div>
                          </form>
                        ) : (
                          <FormattedMessage content={msg.content} isUser={isUser} />
                        )}
                      </div>

                      {!isUser && msg.uiComponents?.map((component) => (
                        <div key={component.id} className="w-full pl-1">
                          <AssistantComponents
                            component={component}
                            onReply={(value) => void submitMessage(value)}
                            disabled={sending}
                          />
                        </div>
                      ))}

                      {/* Timestamp and FAQ retrieval debug */}
                      <div className="flex flex-wrap items-center gap-2 px-1">
                        <span className="text-[10px] text-neutral-600 select-none">
                          {formatTime(msg.timestamp)}
                        </span>
                        {!isUser && typeof msg.generationDurationMs === "number" && (
                          <span className="text-[10px] text-neutral-600" title="Waktu proses respons">
                            {formatDuration(msg.generationDurationMs)}
                          </span>
                        )}
                        {!isUser && msg.messageType === "FAQ" && (
                          <details className="relative text-[10px] text-neutral-500">
                            <summary className="cursor-pointer list-none select-none hover:text-neutral-300">
                              Debug retrieval ({msg.topArticles?.length ?? 0})
                            </summary>
                            <div className="absolute left-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-5rem)] rounded-lg border border-neutral-700 bg-[#0a0a0a] p-3 shadow-xl">
                              <p className="mb-2 font-medium text-neutral-300">
                                Artikel yang diambil
                              </p>
                              {msg.topArticles?.length ? (
                                <ul className="space-y-2">
                                  {msg.topArticles.map((article) => (
                                    <li key={article.id} className="border-t border-neutral-800 pt-2 first:border-0 first:pt-0">
                                      <p className="text-neutral-200">{article.title}</p>
                                      <p className="mt-0.5 text-neutral-500">
                                        {article.collectionName || article.category || "Tanpa kategori"} · Skor {article.score}
                                      </p>
                                      {article.matchedKeywords.length > 0 && (
                                        <p className="mt-0.5 break-words text-neutral-500">
                                          Keyword: {article.matchedKeywords.join(", ")}
                                        </p>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-neutral-500">Tidak ada artikel yang cocok.</p>
                              )}
                              {msg.uiComponents?.map((component) => (
                                <div key={component.id} className="mt-3 border-t border-neutral-800 pt-2">
                                  <p className="font-medium text-neutral-300">Komponen dipicu: {component.name}</p>
                                  {component.triggeredBy?.map((article) => (
                                    <p key={`${component.id}-${article.collectionName}-${article.articleId}`} className="mt-1 text-neutral-500">
                                      {article.title} · Skor {article.score}
                                    </p>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                        <button
                          type="button"
                          onClick={() => void copyMessage(msg)}
                          className="rounded p-1 text-neutral-600 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
                          title={copiedMessageId === msg.id ? "Tersalin" : "Salin pesan"}
                          aria-label={copiedMessageId === msg.id ? "Pesan tersalin" : "Salin pesan"}
                        >
                          {copiedMessageId === msg.id
                            ? <Check className="h-3.5 w-3.5" />
                            : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        {isUser && !isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setEditingText(msg.content);
                            }}
                            disabled={sending}
                            className="rounded p-1 text-neutral-600 transition-colors hover:bg-neutral-800 hover:text-neutral-200 disabled:opacity-40"
                            title="Edit pesan"
                            aria-label="Edit pesan"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {!isUser && relatedUserMessage && (
                          <button
                            type="button"
                            onClick={() => void submitMessage(relatedUserMessage.content, { regenerateAssistantId: msg.id })}
                            disabled={sending}
                            className="rounded p-1 text-neutral-600 transition-colors hover:bg-neutral-800 hover:text-neutral-200 disabled:opacity-40"
                            title="Buat ulang respons"
                            aria-label="Buat ulang respons AI"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {sending && (
                <div className="flex items-end gap-2.5 flex-row">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-md">
                    <Bot className="w-4 h-4 text-black" />
                  </div>

                  <div className="bg-[#111111] text-neutral-300 border border-neutral-800 rounded-2xl rounded-bl-sm px-4 py-3 shadow-md">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-300" />
                      <span>GenAI sedang berpikir...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-neutral-900 bg-[#080808] shrink-0">
          <form onSubmit={sendMessage} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full bg-gradient-to-tr ${avatarGradient} flex items-center justify-center text-[11px] font-bold text-black select-none shrink-0 shadow`}
              title={userProfile?.fullName || "User"}
            >
              {userInitials}
            </div>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ketik pesan Anda di sini..."
              disabled={sending}
              className="flex-1 px-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-700 focus:border-neutral-600 disabled:opacity-50"
            />

            <select
              value={chatModel}
              onChange={(event) => setChatModel(event.target.value)}
              disabled={loadingChatModels || availableChatModels.length === 0}
              aria-label={`Model ${chatModelProvider === "openrouter" ? "OpenRouter" : "LM Studio"}`}
              title={`${chatModelProvider === "openrouter" ? "OpenRouter" : "LM Studio"}: ${chatModel}`}
              className="h-10 w-28 shrink-0 truncate rounded-xl border border-neutral-800 bg-black px-2 text-[11px] text-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-700 disabled:opacity-50 sm:w-48"
            >
              {chatModel && !availableChatModels.includes(chatModel) && (
                <option value={chatModel}>{chatModel} (aktif)</option>
              )}
              {availableChatModels.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>

            <select
              value={speechLanguage}
              onChange={(e) => setSpeechLanguage(e.target.value)}
              disabled={sending || isListening}
              aria-label="Bahasa input suara"
              className="h-10 bg-black border border-neutral-800 rounded-xl px-2 text-[11px] text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-700 disabled:opacity-50"
            >
              <option value="id-ID">ID</option>
              <option value="en-US">EN</option>
            </select>

            <button
              type="button"
              onClick={startSpeechInput}
              disabled={sending || !speechSupported || speechModalOpen}
              aria-label={isListening ? "Berhenti merekam" : "Input suara"}
              title={
                speechSupported
                  ? isListening
                    ? "Berhenti merekam"
                    : "Input suara"
                  : "Input suara tidak didukung browser ini"
              }
              className={`p-2.5 rounded-xl border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isListening
                ? "bg-red-500/15 border-red-400/50 text-red-300"
                : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800"
                }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="p-2.5 bg-white hover:bg-neutral-200 text-black rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}