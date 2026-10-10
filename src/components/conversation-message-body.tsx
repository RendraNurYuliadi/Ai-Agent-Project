"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles } from "lucide-react";
import { getImageProxyUrl } from "@/lib/image-proxy-url";
import { FormattedMessage } from "@/components/formatted-message";
import { ResponseMeta } from "@/components/response-meta";

export interface ConversationMessageButton {
  label: string;
  action: "reply" | "link";
  value: string;
}

export interface ConversationMessageCard {
  imageUrl: string;
  imageHeight?: number;
  title: string;
  subtitle: string;
  buttons: ConversationMessageButton[];
}

export interface ConversationMessageComponent {
  id: string;
  name: string;
  title?: string;
  subtitle?: string;
  type: "reply_buttons" | "link_buttons" | "card" | "carousel";
  buttons: ConversationMessageButton[];
  card: ConversationMessageCard | null;
  cards: ConversationMessageCard[];
  triggeredBy?: Array<{
    collectionName: string;
    articleId: string;
    title: string;
    score: number;
  }>;
}

export interface ConversationMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string | Date;
  authorName?: string;
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
  uiComponents?: ConversationMessageComponent[];
  botInteraction?: {
    type: "welcome_message" | "guided_routing" | "text_question";
    title?: string;
    subtitle?: string;
    icon?: string;
    footerText?: string;
    buttons?: ConversationMessageButton[];
    quickButtons?: ConversationMessageButton[];
  };
}

function MessageButtons({
  buttons,
  onReply,
  disabled,
}: {
  buttons: ConversationMessageButton[];
  onReply?: (value: string) => void;
  disabled: boolean;
}) {
  return <div className="flex flex-wrap gap-2">
    {buttons.map((button, index) => button.action === "reply" ? (
      <button
        key={`${button.label}-${index}`}
        type="button"
        onClick={() => onReply?.(button.value)}
        disabled={disabled || !onReply}
        className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-800 disabled:opacity-40"
      >{button.label}</button>
    ) : (
      <a key={`${button.label}-${index}`} href={button.value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-800">
        {button.label}<ExternalLink className="h-3 w-3" />
      </a>
    ))}
  </div>;
}

function MessageCardView({ card, onReply, disabled }: { card: ConversationMessageCard; onReply?: (value: string) => void; disabled: boolean }) {
  return <article className="w-full min-w-0 overflow-hidden rounded-xl border border-neutral-800 bg-[#101010]">
    {card.imageUrl && <Image src={getImageProxyUrl(card.imageUrl)} alt={card.title} width={520} height={card.imageHeight ?? 128} unoptimized style={{ height: `${card.imageHeight ?? 128}px` }} className="w-full object-cover" />}
    <div className="space-y-2.5 p-3">
      <div><h3 className="text-sm font-semibold text-white">{card.title}</h3><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-neutral-400">{card.subtitle}</p></div>
      <MessageButtons buttons={card.buttons} onReply={onReply} disabled={disabled} />
    </div>
  </article>;
}

function MessageCarousel({ component, onReply, disabled }: { component: ConversationMessageComponent; onReply?: (value: string) => void; disabled: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const count = component.cards.length;
  useEffect(() => {
    if (count <= 1) return;
    const interval = window.setInterval(() => setCurrentIndex((index) => (index + 1) % count), 5000);
    return () => window.clearInterval(interval);
  }, [count]);
  if (!count) return null;
  return <div className="w-full max-w-[260px]" aria-roledescription="carousel">
    <div className="overflow-hidden"><div className="flex transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
      {component.cards.map((card, index) => <div key={`${component.id}-${index}`} className="w-full shrink-0"><MessageCardView card={card} onReply={onReply} disabled={disabled} /></div>)}
    </div></div>
    {count > 1 && <div className="mt-2 flex items-center justify-between px-1">
      <button type="button" onClick={() => setCurrentIndex((index) => (index - 1 + count) % count)} aria-label="Card sebelumnya" title="Card sebelumnya" className="rounded-md border border-neutral-800 p-1.5 text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
      <span className="text-[10px] tabular-nums text-neutral-500">{currentIndex + 1} / {count}</span>
      <button type="button" onClick={() => setCurrentIndex((index) => (index + 1) % count)} aria-label="Card berikutnya" title="Card berikutnya" className="rounded-md border border-neutral-800 p-1.5 text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-white"><ChevronRight className="h-4 w-4" /></button>
    </div>}
  </div>;
}

function AssistantComponentView({ component, onReply, disabled }: { component: ConversationMessageComponent; onReply?: (value: string) => void; disabled: boolean }) {
  if (component.type === "reply_buttons") return <MessageButtons buttons={component.buttons} onReply={onReply} disabled={disabled} />;
  if (component.type === "link_buttons") return <article className="w-full max-w-[320px] rounded-xl border border-neutral-800 bg-[#101010] p-3">
    {component.title && <h3 className="text-sm font-semibold text-white">{component.title}</h3>}
    {component.subtitle && <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-neutral-400">{component.subtitle}</p>}
    <div className="mt-3"><MessageButtons buttons={component.buttons.map((button) => ({ ...button, action: "link" }))} onReply={onReply} disabled={disabled} /></div>
  </article>;
  if (component.type === "card" && component.card) return <div className="w-full max-w-[260px]"><MessageCardView card={component.card} onReply={onReply} disabled={disabled} /></div>;
  if (component.type === "carousel") return <MessageCarousel component={component} onReply={onReply} disabled={disabled} />;
  return null;
}

function RotatingComponents({ components, onReply, disabled }: { components: ConversationMessageComponent[]; onReply?: (value: string) => void; disabled: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    if (components.length < 2) return;
    const interval = window.setInterval(() => setCurrentIndex((index) => (index + 1) % components.length), 10_000);
    return () => window.clearInterval(interval);
  }, [components.length]);
  if (!components.length) return null;
  const component = components[currentIndex % components.length];
  return <div key={component.id} className="chat-component-enter w-full min-w-0 pl-1"><AssistantComponentView component={component} onReply={onReply} disabled={disabled} /></div>;
}

function BotInteractionView({ data, onReply, disabled }: { data: NonNullable<ConversationMessageData["botInteraction"]>; onReply?: (value: string) => void; disabled: boolean }) {
  const buttons = data.buttons || data.quickButtons || [];
  const icon = data.icon === "bot" ? "bot" : data.icon === "message" ? "message" : "sparkles";
  return <article className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-neutral-800 bg-[#101010] p-3.5 sm:max-w-[360px]">
    {data.type === "welcome_message" && data.title && <div className="mb-2 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-black"><Sparkles className="h-4 w-4" /></span><h3 className="text-sm font-semibold text-white">{data.title}</h3></div>}
    {data.subtitle && <p className="whitespace-pre-wrap text-xs leading-5 text-neutral-300">{data.subtitle}</p>}
    {buttons.length > 0 && <div className="mt-3"><MessageButtons buttons={buttons} onReply={onReply} disabled={disabled} /></div>}
    {data.footerText && <p className="mt-3 border-t border-neutral-800 pt-2 text-[10px] text-neutral-600">{data.footerText}</p>}
    <span className="sr-only">{icon}</span>
  </article>;
}

export function ConversationMessageBody({
  message,
  isUser,
  onReply,
  disabled = false,
  contentOverride,
}: {
  message: ConversationMessageData;
  isUser: boolean;
  onReply?: (value: string) => void;
  disabled?: boolean;
  contentOverride?: React.ReactNode;
}) {
  const topArticles = message.topArticles || [];
  const uiComponents = message.uiComponents || [];
  const webSources = message.webSources || [];
  return <>
    {!isUser && <div className="flex items-center gap-1.5 pl-1 text-[10px] text-neutral-500">
      <span className="font-semibold text-white">{message.authorName || "GenAI"}</span>
      {message.messageType && message.messageType !== "TEXT_QUESTION" && <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${message.messageType === "FAQ" ? "border-white/20 bg-white/10 text-white" : "border-neutral-700/40 bg-neutral-700/20 text-neutral-300"}`}>{message.messageType}</span>}
      {message.lmStudioAvailable === false && <span className="rounded-full border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[9px] font-medium text-neutral-400">Offline</span>}
    </div>}
    {(message.content || contentOverride) && <div className={`w-fit min-w-0 max-w-full break-words [overflow-wrap:anywhere] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "rounded-tr-sm bg-white font-medium text-black shadow-lg" : "rounded-tl-sm border border-neutral-800 bg-[#111111] text-neutral-300 shadow-md"}`}>
      {contentOverride || <FormattedMessage content={message.content} isUser={isUser} />}
    </div>}
    {!isUser && message.botInteraction && <BotInteractionView data={message.botInteraction} onReply={onReply} disabled={disabled} />}
    {!isUser && uiComponents.length > 0 && <RotatingComponents components={uiComponents} onReply={onReply} disabled={disabled} />}
    <ResponseMeta
      timestamp={message.timestamp}
      align={isUser ? "end" : "start"}
      generationDurationMs={isUser ? undefined : message.generationDurationMs}
      showRetrieval={!isUser && (message.messageType === "FAQ" || message.messageType === "RAG" || message.messageType === "WEB_SEARCH")}
      webSearch={!isUser && message.messageType === "WEB_SEARCH"}
      topArticles={topArticles}
      uiComponents={uiComponents}
      webSources={webSources}
    />
  </>;
}