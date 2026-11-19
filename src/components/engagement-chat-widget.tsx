"use client";

import { FormEvent, type CSSProperties, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, MessageCircle, MoreVertical, X, WifiOff } from "lucide-react";
import Image from "next/image";
import {
  ConversationMessageBody,
  type ConversationMessageData,
} from "@/components/conversation-message-body";
import type { EngagementWidgetConfig } from "@/types/engagement";
import { scopeEngagementCss } from "@/lib/engagement-theme";
import { getImageProxyUrl } from "@/lib/image-proxy-url";

interface SessionResponse {
  conversationId: string;
  visitorToken: string;
  messages: ConversationMessageData[];
  botStatus: string;
  escalationStatus: string;
}

export default function EngagementChatWidget({
  config,
}: {
  config: EngagementWidgetConfig;
}) {
  const [messages, setMessages] = useState<ConversationMessageData[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [visitorToken, setVisitorToken] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [sending, setSending] = useState(false);
  const [botStatus, setBotStatus] = useState("active");
  const [escalationStatus, setEscalationStatus] = useState("bot");
  const [menuOpen, setMenuOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/public-engagement/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    })
      .then(async (response) => {
        const data = await response.json() as SessionResponse & { error?: string };
        if (!response.ok) throw new Error(data.error || "Gagal memulai chat.");
        if (!active) return;
        setConversationId(data.conversationId);
        setVisitorToken(data.visitorToken);
        setMessages(data.messages || []);
        setBotStatus(data.botStatus || "active");
        setEscalationStatus(data.escalationStatus || "bot");
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Gagal memulai chat.");
      })
      .finally(() => {
        if (active) setInitializing(false);
      });

    return () => {
      active = false;
    };
  }, [config.token]);

  useEffect(() => {
    const list = messageListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, sending]);

  useEffect(() => {
    if (
      !conversationId ||
      !visitorToken ||
      (escalationStatus !== "pending" && escalationStatus !== "accepted")
    ) {
      return;
    }

    let active = true;
    let timeout: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch(`/api/public-engagement/sessions/${conversationId}/messages`, {
          headers: {
            Authorization: `Bearer ${config.token}`,
            "X-Engagement-Visitor-Token": visitorToken,
          },
        });
        const data = await response.json() as {
          error?: string;
          messages?: ConversationMessageData[];
          botStatus?: string;
          escalationStatus?: string;
        };
        if (!response.ok) throw new Error(data.error || "Gagal memperbarui percakapan.");
        if (!active) return;
        setMessages(data.messages || []);
        if (data.botStatus) setBotStatus(data.botStatus);
        if (data.escalationStatus) setEscalationStatus(data.escalationStatus);
      } catch (pollError) {
        if (active) setError(pollError instanceof Error ? pollError.message : "Gagal memperbarui percakapan.");
      } finally {
        if (active) timeout = setTimeout(() => void poll(), 2500);
      }
    };
    void poll();

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [config.token, conversationId, escalationStatus, visitorToken]);

  const sendMessage = async (value: string) => {
    const content = value.trim();
    if (!content || sending || !conversationId || !visitorToken) return;
    setSending(true);
    setError("");
    setInput("");
    try {
      const response = await fetch(`/api/public-engagement/sessions/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.token}`,
          "X-Engagement-Visitor-Token": visitorToken,
        },
        body: JSON.stringify({ message: content }),
      });
      const data = await response.json() as {
        error?: string;
        userMessage?: ConversationMessageData;
        assistantMessages?: ConversationMessageData[];
        botStatus?: string;
        escalationStatus?: string;
      };
      if (!response.ok) throw new Error(data.error || "Pesan gagal dikirim.");
      setMessages((current) => [
        ...current,
        ...(data.userMessage ? [data.userMessage] : []),
        ...(data.assistantMessages || []),
      ]);
      if (data.botStatus) setBotStatus(data.botStatus);
      if (data.escalationStatus) setEscalationStatus(data.escalationStatus);
    } catch (sendError) {
      setInput(content);
      setError(sendError instanceof Error ? sendError.message : "Pesan gagal dikirim.");
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const closeConversation = async () => {
    if (!conversationId || !visitorToken || closing) return;
    setClosing(true);
    setMenuOpen(false);
    setError("");
    try {
      const response = await fetch(`/api/public-engagement/sessions/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.token}`,
          "X-Engagement-Visitor-Token": visitorToken,
        },
        body: JSON.stringify({ close: true }),
      });
      const data = await response.json() as { error?: string; botStatus?: string; escalationStatus?: string };
      if (!response.ok) throw new Error(data.error || "Percakapan gagal ditutup.");
      setBotStatus(data.botStatus || "closed");
      setEscalationStatus(data.escalationStatus || "closed");
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : "Percakapan gagal ditutup.");
    } finally {
      setClosing(false);
    }
  };

  const accentStyle = {
    "--engagement-accent": config.window.accentColor,
    "--engagement-background": config.window.backgroundColor,
    "--engagement-line": config.window.lineColor,
  } as CSSProperties;
  const conversationUnavailable = botStatus === "closed";
  const isWaitingForAgent = escalationStatus === "pending";
  const menuAllowed = config.window.allowClose !== false;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: scopeEngagementCss(
        Object.values(config.window.componentStyles || {}).join("\n"),
        `.engagement-window-${config.windowId}`
      ) }} />
      <main
        className={`engagement-window-${config.windowId} engagement-widget flex h-screen min-h-[420px] flex-col overflow-hidden text-white`}
        style={{ ...accentStyle, backgroundColor: "var(--engagement-background)", borderRadius: `${config.window.borderRadius}px` }}
      >
      <header className="engagement-header relative flex shrink-0 items-center gap-3 border-b px-4 py-4" style={{ backgroundColor: "var(--engagement-accent)", borderColor: "var(--engagement-line)" }}>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/20">
          {config.window.headerIconUrl
            ? <Image src={getImageProxyUrl(config.window.headerIconUrl, config.token)} alt="" width={36} height={36} unoptimized className="h-9 w-9 rounded-full object-cover" />
            : <MessageCircle className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">{config.window.title}</h1>
          <p className="engagement-header-subtitle mt-0.5 truncate text-xs text-white/75">{config.window.subtitle || "Kami siap membantu Anda."}</p>
        </div>
        {menuAllowed && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Opsi percakapan"
              aria-expanded={menuOpen}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-black/15 hover:text-white"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-20 w-44 rounded-lg border border-neutral-700 bg-neutral-950 p-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => void closeConversation()}
                  disabled={closing || conversationUnavailable}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-red-300 hover:bg-red-950/40 disabled:opacity-40"
                >
                  {closing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  Tutup percakapan
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <div ref={messageListRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {initializing && (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Menghubungkan chat...
          </div>
        )}
        {!initializing && error && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-neutral-400">
            <WifiOff className="h-5 w-5" />
            <p>{error}</p>
          </div>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`flex min-w-0 flex-col gap-1 ${message.role === "user" ? "items-end" : "items-start"}`}>
            <ConversationMessageBody
              message={message}
              isUser={message.role === "user"}
              onReply={(value) => void sendMessage(value)}
              disabled={sending || conversationUnavailable || isWaitingForAgent}
              imageProxyToken={config.token}
            />
          </div>
        ))}
        {sending && (
          <div className="flex items-center gap-2 pl-2 text-xs text-neutral-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengetik...
          </div>
        )}
      </div>

      {isWaitingForAgent && (
        <p className="border-t border-white/10 px-4 py-2 text-center text-xs text-neutral-400">
          Pesan Anda sudah diteruskan ke tim kami.
        </p>
      )}
      {escalationStatus === "accepted" && (
        <p className="border-t border-white/10 px-4 py-2 text-center text-xs text-neutral-400">
          Anda sedang terhubung dengan tim kami.
        </p>
      )}
      {error && messages.length > 0 && <p role="alert" className="px-4 pb-2 text-xs text-red-300">{error}</p>}

      <form onSubmit={onSubmit} className="flex shrink-0 items-center gap-2 border-t border-white/10 bg-[#0d0d0d] p-3">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={4000}
          disabled={initializing || !conversationId || sending || conversationUnavailable || isWaitingForAgent}
          placeholder={isWaitingForAgent ? "Tim kami akan segera membantu..." : "Tulis pesan..."}
          aria-label="Pesan"
          className="engagement-input h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#151515] px-3 text-sm text-white outline-none placeholder:text-neutral-500 focus:border-[var(--engagement-accent)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={initializing || !conversationId || sending || conversationUnavailable || isWaitingForAgent || !input.trim()}
          aria-label="Kirim pesan"
          className="engagement-send flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: "var(--engagement-accent)" }}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
        </button>
      </form>
      </main>
    </>
  );
}
