"use client";

import { FormEvent, type CSSProperties, useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, MessageCircle, Minus, MoreVertical, X, WifiOff } from "lucide-react";
import Image from "next/image";
import {
  ConversationMessageBody,
  type ConversationMessageData,
} from "@/components/conversation-message-body";
import type { EngagementWidgetConfig } from "@/types/engagement";
import {
  ENGAGEMENT_LAUNCHER_SHADOW_GUTTER,
  getDefaultComponentStyles,
  readEngagementStyleProperty,
  scopeEngagementCss,
} from "@/lib/engagement-theme";
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
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [initializing, setInitializing] = useState(false);
  const [sending, setSending] = useState(false);
  const [botStatus, setBotStatus] = useState("active");
  const [escalationStatus, setEscalationStatus] = useState("bot");
  const [menuOpen, setMenuOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [windowAnimationDirection, setWindowAnimationDirection] = useState<"enter" | "exit" | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const launcherButtonRef = useRef<HTMLButtonElement>(null);
  const openingRef = useRef(false);
  const resizeAnimationRef = useRef(false);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const previousRootBackground = root.style.backgroundColor;
    const previousRootHeight = root.style.height;
    const previousRootMinHeight = root.style.minHeight;
    const previousRootOverflow = root.style.overflow;
    const previousBodyBackground = body.style.backgroundColor;
    const previousBodyHeight = body.style.height;
    const previousBodyMinHeight = body.style.minHeight;
    const previousBodyMargin = body.style.margin;
    const previousBodyOverflow = body.style.overflow;
    root.style.backgroundColor = "transparent";
    root.style.height = "100%";
    root.style.minHeight = "0";
    root.style.overflow = "hidden";
    body.style.backgroundColor = "transparent";
    body.style.height = "100%";
    body.style.minHeight = "0";
    body.style.margin = "0";
    body.style.overflow = "hidden";
    return () => {
      root.style.backgroundColor = previousRootBackground;
      root.style.height = previousRootHeight;
      root.style.minHeight = previousRootMinHeight;
      root.style.overflow = previousRootOverflow;
      body.style.backgroundColor = previousBodyBackground;
      body.style.height = previousBodyHeight;
      body.style.minHeight = previousBodyMinHeight;
      body.style.margin = previousBodyMargin;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  useEffect(() => {
    if (window.parent === window) return;
    const launcherRect = !isOpen ? launcherButtonRef.current?.getBoundingClientRect() : undefined;
    window.parent.postMessage(
      {
        type: "engagement-widget:resize",
        open: isOpen,
        animate: resizeAnimationRef.current,
        ...(launcherRect ? {
          launcherWidth: Math.ceil(launcherRect.width + ENGAGEMENT_LAUNCHER_SHADOW_GUTTER * 2),
          launcherHeight: Math.ceil(launcherRect.height + ENGAGEMENT_LAUNCHER_SHADOW_GUTTER * 2),
        } : {}),
      },
      config.parentOrigin
    );
    resizeAnimationRef.current = false;
  }, [config.parentOrigin, isOpen]);

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

  const notifyParentResize = (open: boolean, animate: boolean) => {
    if (window.parent === window) return;
    const launcherRect = !open ? launcherButtonRef.current?.getBoundingClientRect() : undefined;
    window.parent.postMessage(
      {
        type: "engagement-widget:resize",
        open,
        animate,
        ...(launcherRect ? {
          launcherWidth: Math.ceil(launcherRect.width + ENGAGEMENT_LAUNCHER_SHADOW_GUTTER * 2),
          launcherHeight: Math.ceil(launcherRect.height + ENGAGEMENT_LAUNCHER_SHADOW_GUTTER * 2),
        } : {}),
      },
      config.parentOrigin
    );
  };

  const minimizeChat = () => {
    setMenuOpen(false);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setWindowAnimationDirection(null);
      setIsOpen(false);
      return;
    }
    notifyParentResize(false, true);
    setWindowAnimationDirection("exit");
  };

  const openChat = async () => {
    setIsOpen(true);
    setMenuOpen(false);
    setError("");
    if (conversationId || openingRef.current) return;

    openingRef.current = true;
    setInitializing(true);
    try {
      const response = await fetch("/api/public-engagement/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
        },
      });
      const data = await response.json() as SessionResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Gagal memulai chat.");
      setConversationId(data.conversationId);
      setVisitorToken(data.visitorToken);
      setMessages(data.messages || []);
      setBotStatus(data.botStatus || "active");
      setEscalationStatus(data.escalationStatus || "bot");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memulai chat.");
    } finally {
      openingRef.current = false;
      setInitializing(false);
    }
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
      setMessages([]);
      setConversationId("");
      setVisitorToken("");
      setInput("");
      setError("");
      minimizeChat();
    } catch (closeError) {
      setError(closeError instanceof Error ? closeError.message : "Percakapan gagal ditutup.");
    } finally {
      setClosing(false);
    }
  };

  const accentStyle = {
    "--engagement-accent": config.window.accentColor,
  } as CSSProperties;
  const conversationUnavailable = botStatus === "closed";
  const isWaitingForAgent = escalationStatus === "pending";
  const menuAllowed = config.window.allowClose !== false;
  const bubbleAnimationEnabled = config.window.bubbleAnimationEnabled;
  const componentStyles = {
    ...getDefaultComponentStyles(),
    ...(config.window.componentStyles || {}),
  };
  const launcherBorderRadius = readEngagementStyleProperty(
    componentStyles.launcher,
    ".engagement-launcher",
    "border-radius",
    "36px"
  );
  const launcherBorderWidth = readEngagementStyleProperty(
    componentStyles.launcher,
    ".engagement-launcher",
    "border-width",
    "1px"
  );
  const launcherIconUrl = readEngagementStyleProperty(
    componentStyles.launcher,
    ".engagement-launcher",
    "--engagement-launcher-icon-url",
    ""
  );
  const headerIconUrl = readEngagementStyleProperty(
    componentStyles.header,
    ".engagement-header-icon",
    "--engagement-header-icon-url",
    ""
  ) || config.window.headerIconUrl;
  const sendIconUrl = readEngagementStyleProperty(
    componentStyles.send,
    ".engagement-send",
    "--engagement-send-icon-url",
    ""
  ) || config.window.sendIconUrl;
  const scopedComponentCss = scopeEngagementCss(
    Object.values(componentStyles).join("\n"),
    `.engagement-window-${config.windowId}`
  );

  if (!isOpen) {
    return (
      <div className={`engagement-window-${config.windowId} flex h-full w-full items-center justify-center bg-transparent`} style={{ ...accentStyle, backgroundColor: "transparent" }}>
        <style dangerouslySetInnerHTML={{ __html: scopedComponentCss }} />
        <button
          ref={launcherButtonRef}
          type="button"
          onClick={() => {
            resizeAnimationRef.current = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            setWindowAnimationDirection(resizeAnimationRef.current ? "enter" : null);
            void openChat();
          }}
          aria-label={`Buka chat ${config.window.title}`}
          title={config.window.title}
          className="engagement-launcher relative flex h-[72px] w-[72px] items-center justify-center rounded-full text-white shadow-xl transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{ borderRadius: launcherBorderRadius } as CSSProperties}
        >
          {launcherIconUrl
            ? <span aria-hidden="true" className="absolute inset-0 overflow-hidden" style={{ borderRadius: launcherBorderRadius, inset: launcherBorderWidth }}>
                <Image src={launcherIconUrl} alt="" width={72} height={72} unoptimized className="h-full w-full object-cover" />
              </span>
            : initializing
              ? <Loader2 className="h-6 w-6 animate-spin" />
              : <MessageCircle className="h-7 w-7" />}
        </button>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: scopedComponentCss }} />
      <main
        className={`engagement-window-${config.windowId} engagement-widget flex h-full min-h-0 w-full flex-col overflow-hidden border text-white ${windowAnimationDirection ? `engagement-widget-window-${windowAnimationDirection}` : ""}`}
        data-window-animation={config.window.windowAnimationStyle}
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget || !windowAnimationDirection) return;
          if (windowAnimationDirection === "exit") setIsOpen(false);
          setWindowAnimationDirection(null);
        }}
        style={accentStyle}
      >
      <header className="engagement-header relative flex shrink-0 items-center gap-3 border-b px-4 py-4">
        <span className="engagement-header-icon flex h-9 w-9 items-center justify-center rounded-full">
          {headerIconUrl
            ? <Image src={getImageProxyUrl(headerIconUrl, config.token)} alt="" width={36} height={36} unoptimized className="h-9 w-9 rounded-full object-cover" />
            : <MessageCircle className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="engagement-header-title truncate font-semibold">{config.window.title}</h1>
          <p className="engagement-header-subtitle mt-0.5 truncate">{config.window.subtitle || "Kami siap membantu Anda."}</p>
        </div>
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
                onClick={() => {
                  minimizeChat();
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-neutral-200 hover:bg-neutral-800"
              >
                <Minus className="h-3.5 w-3.5" />
                Minimalkan
              </button>
              {menuAllowed && (
                <button
                  type="button"
                  onClick={() => void closeConversation()}
                  disabled={closing || conversationUnavailable}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-red-300 hover:bg-red-950/40 disabled:opacity-40"
                >
                  {closing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                  Tutup percakapan
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <div ref={messageListRef} className="engagement-message-list min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {initializing && (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-neutral-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Menghubungkan chat...
          </div>
        )}
        {!initializing && error && messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-neutral-400">
            <WifiOff className="h-5 w-5" />
            <p>{error}</p>
            {!conversationId && <button type="button" onClick={() => void openChat()} className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800">Coba lagi</button>}
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            data-chat-role={message.role}
            data-chat-animation={config.window.bubbleAnimationStyle}
            className={`flex min-w-0 flex-col gap-1 ${message.role === "user" ? "items-end" : "items-start"} ${bubbleAnimationEnabled ? "chat-scroll-reveal-active" : ""}`}
          >
            <ConversationMessageBody
              message={message}
              isUser={message.role === "user"}
              onReply={(value) => void sendMessage(value)}
              disabled={sending || conversationUnavailable || isWaitingForAgent}
              imageProxyToken={config.token}
              componentStyles={componentStyles}
              embedded
              botName={config.window.title}
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

      <form onSubmit={onSubmit} className="engagement-composer flex shrink-0 items-center gap-2 border-t border-white/10 p-3">
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
          className="engagement-send flex h-11 w-11 shrink-0 items-center justify-center transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending
            ? <Loader2 className="engagement-send-glyph animate-spin" />
            : sendIconUrl
              ? <Image src={getImageProxyUrl(sendIconUrl, config.token)} alt="" width={20} height={20} unoptimized className="engagement-send-icon" />
              : <ArrowUp className="engagement-send-glyph" />}
        </button>
      </form>
      </main>
    </>
  );
}
