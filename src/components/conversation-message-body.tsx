"use client";

import { type CSSProperties, useEffect, useState } from "react";
import Image from "next/image";
import { Bot, ChevronLeft, ChevronRight, CircleHelp, ExternalLink, MessageSquare, Sparkles } from "lucide-react";
import { getImageProxyUrl } from "@/lib/image-proxy-url";
import { readEngagementStyleProperty } from "@/lib/engagement-theme";
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
    iconUrl?: string;
    footerText?: string;
    buttons?: ConversationMessageButton[];
    quickButtons?: ConversationMessageButton[];
  };
}

function MessageButtons({
  buttons,
  onReply,
  disabled,
  previewMode = false,
}: {
  buttons: ConversationMessageButton[];
  onReply?: (value: string) => void;
  disabled: boolean;
  previewMode?: boolean;
}) {
  return <div className="engagement-button-list flex flex-wrap gap-2">
    {buttons.map((button, index) => button.action === "reply" ? (
      <button
        key={`${button.label}-${index}`}
        type="button"
        onClick={() => onReply?.(button.value)}
        disabled={disabled || !onReply}
        className="engagement-button engagement-reply-button rounded-lg border px-3 py-2 text-xs transition-colors hover:brightness-95 disabled:opacity-40"
      >{button.label}</button>
    ) : (
      <a key={`${button.label}-${index}`} href={previewMode ? undefined : button.value} target={previewMode ? undefined : "_blank"} rel={previewMode ? undefined : "noopener noreferrer"} className="engagement-button engagement-link-button inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-colors hover:brightness-95">
        {button.label}<ExternalLink className="h-3 w-3" />
      </a>
    ))}
  </div>;
}

function MessageCardView({ card, onReply, disabled, imageProxyToken, previewMode = false }: { card: ConversationMessageCard; onReply?: (value: string) => void; disabled: boolean; imageProxyToken?: string; previewMode?: boolean }) {
  return <article className="engagement-card engagement-content-card w-full min-w-0 overflow-hidden rounded-xl border">
    {card.imageUrl
      ? <Image src={getImageProxyUrl(card.imageUrl, imageProxyToken)} alt={card.title} width={520} height={card.imageHeight ?? 128} unoptimized style={{ "--engagement-card-image-height": `${card.imageHeight ?? 128}px` } as CSSProperties} className="engagement-card-image w-full object-cover" />
      : previewMode && <Image src="/engagement-preview-card.svg" alt="" width={520} height={card.imageHeight ?? 128} unoptimized style={{ "--engagement-card-image-height": `${card.imageHeight ?? 128}px` } as CSSProperties} className="engagement-card-image w-full object-cover" />}
    <div className="space-y-2.5 p-3">
      <div><h3 className="engagement-card-title font-semibold">{card.title}</h3><p className="engagement-card-subtitle mt-1 whitespace-pre-wrap leading-5">{card.subtitle}</p></div>
      <MessageButtons buttons={card.buttons} onReply={onReply} disabled={disabled} previewMode={previewMode} />
    </div>
  </article>;
}

function MessageCarousel({ component, onReply, disabled, imageProxyToken, previewMode = false }: { component: ConversationMessageComponent; onReply?: (value: string) => void; disabled: boolean; imageProxyToken?: string; previewMode?: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const count = component.cards.length;
  useEffect(() => {
    if (count <= 1) return;
    const interval = window.setInterval(() => setCurrentIndex((index) => (index + 1) % count), 5000);
    return () => window.clearInterval(interval);
  }, [count]);
  if (!count) return null;
  return <div className="engagement-carousel w-full max-w-[260px]" aria-roledescription="carousel">
    <div className="overflow-hidden"><div className="flex transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
      {component.cards.map((card, index) =>       <div key={`${component.id}-${index}`} className="w-full shrink-0"><MessageCardView card={card} onReply={onReply} disabled={disabled} imageProxyToken={imageProxyToken} previewMode={previewMode} /></div>)}
    </div></div>
    {count > 1 && <div className="engagement-carousel-controls mt-2 flex items-center justify-between px-1">
      <button type="button" onClick={() => setCurrentIndex((index) => (index - 1 + count) % count)} aria-label="Card sebelumnya" title="Card sebelumnya" className="engagement-carousel-button p-1.5 transition-colors hover:brightness-95"><ChevronLeft className="h-4 w-4" /></button>
      <span className="engagement-carousel-position tabular-nums">{currentIndex + 1} / {count}</span>
      <button type="button" onClick={() => setCurrentIndex((index) => (index + 1) % count)} aria-label="Card berikutnya" title="Card berikutnya" className="engagement-carousel-button p-1.5 transition-colors hover:brightness-95"><ChevronRight className="h-4 w-4" /></button>
    </div>}
  </div>;
}

export function AssistantComponentView({ component, onReply, disabled, imageProxyToken, previewMode = false }: { component: ConversationMessageComponent; onReply?: (value: string) => void; disabled: boolean; imageProxyToken?: string; previewMode?: boolean }) {
  if (component.type === "reply_buttons") return <MessageButtons buttons={component.buttons} onReply={onReply} disabled={disabled} previewMode={previewMode} />;
  if (component.type === "link_buttons") return <article className="engagement-link-card w-full max-w-[320px]">
    {component.title && <h3 className="engagement-link-title font-semibold">{component.title}</h3>}
    {component.subtitle && <p className="engagement-link-subtitle mt-1 whitespace-pre-wrap leading-5">{component.subtitle}</p>}
    <div className="mt-3"><MessageButtons buttons={component.buttons.map((button) => ({ ...button, action: "link" }))} onReply={onReply} disabled={disabled} previewMode={previewMode} /></div>
  </article>;
  if (component.type === "card" && component.card) return <div className="w-full max-w-[260px]"><MessageCardView card={component.card} onReply={onReply} disabled={disabled} imageProxyToken={imageProxyToken} previewMode={previewMode} /></div>;
  if (component.type === "carousel") return <MessageCarousel component={component} onReply={onReply} disabled={disabled} imageProxyToken={imageProxyToken} previewMode={previewMode} />;
  return null;
}

function RotatingComponents({ components, onReply, disabled, imageProxyToken }: { components: ConversationMessageComponent[]; onReply?: (value: string) => void; disabled: boolean; imageProxyToken?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  useEffect(() => {
    if (components.length < 2) return;
    const interval = window.setInterval(() => setCurrentIndex((index) => (index + 1) % components.length), 10_000);
    return () => window.clearInterval(interval);
  }, [components.length]);
  if (!components.length) return null;
  const component = components[currentIndex % components.length];
  return <div key={component.id} className="engagement-component chat-component-enter w-full min-w-0 pl-1"><AssistantComponentView component={component} onReply={onReply} disabled={disabled} imageProxyToken={imageProxyToken} /></div>;
}

function BotInteractionView({ data, onReply, disabled, imageProxyToken, componentStyles }: { data: NonNullable<ConversationMessageData["botInteraction"]>; onReply?: (value: string) => void; disabled: boolean; imageProxyToken?: string; componentStyles?: Record<string, string> }) {
  const buttons = data.buttons || data.quickButtons || [];
  const isWelcomeMessage = data.type === "welcome_message";
  const Icon = isWelcomeMessage || data.icon === "bot" ? Bot : data.icon === "message" ? MessageSquare : data.icon === "help" ? CircleHelp : Sparkles;
  const iconLabel = isWelcomeMessage && data.icon !== "custom" ? "Bot" : data.icon === "custom" ? "Custom" : data.icon || "Sparkles";
  const globalIconUrl = isWelcomeMessage ? "" : readEngagementStyleProperty(
    componentStyles?.interaction || "",
    ".engagement-interaction-card",
    "--engagement-interaction-icon-url",
    ""
  );
  const iconUrl = (data.icon === "custom" ? data.iconUrl : "") || globalIconUrl;
  return <article className={`engagement-component ${isWelcomeMessage ? "engagement-welcome-message" : "engagement-interaction-card"} w-full min-w-0 max-w-full overflow-hidden rounded-xl border p-3.5 sm:max-w-[360px]`}>
    {data.title && <div className="mb-2 flex items-center gap-2">
      <span className={`${isWelcomeMessage ? "engagement-welcome-icon" : "engagement-interaction-icon"} flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md`}>
        {iconUrl
          ? <Image src={getImageProxyUrl(iconUrl, imageProxyToken)} alt="" width={28} height={28} unoptimized className="h-7 w-7 object-cover" />
          : <Icon className="h-4 w-4" />}
      </span>
      <h3 className={`${isWelcomeMessage ? "engagement-welcome-title" : "engagement-interaction-title"} font-semibold`}>{data.title}</h3>
    </div>}
    {data.subtitle && <p className={`${isWelcomeMessage ? "engagement-welcome-subtitle" : "engagement-interaction-subtitle"} whitespace-pre-wrap leading-5`}>{data.subtitle}</p>}
    {buttons.length > 0 && <div className="mt-3"><MessageButtons buttons={buttons} onReply={onReply} disabled={disabled} /></div>}
    {data.footerText && <p className="mt-3 border-t border-neutral-800 pt-2 text-[10px] text-neutral-600">{data.footerText}</p>}
    <span className="sr-only">{iconLabel}</span>
  </article>;
}

export function ConversationMessageBody({
  message,
  isUser,
  onReply,
  disabled = false,
  contentOverride,
  imageProxyToken,
  componentStyles,
  embedded = false,
  botName,
}: {
  message: ConversationMessageData;
  isUser: boolean;
  onReply?: (value: string) => void;
  disabled?: boolean;
  contentOverride?: React.ReactNode;
  imageProxyToken?: string;
  componentStyles?: Record<string, string>;
  embedded?: boolean;
  botName?: string;
}) {
  const topArticles = message.topArticles || [];
  const uiComponents = message.uiComponents || [];
  const webSources = message.webSources || [];
  return <>
    {!isUser && <div className="engagement-author flex items-center gap-1.5 pl-1 text-[10px] text-neutral-500">
      <span className="font-semibold text-white">{botName || message.authorName || "GenAI"}</span>
      {!embedded && message.messageType && message.messageType !== "TEXT_QUESTION" && <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${message.messageType === "FAQ" ? "border-white/20 bg-white/10 text-white" : "border-neutral-700/40 bg-neutral-700/20 text-neutral-300"}`}>{message.messageType}</span>}
      {!embedded && message.lmStudioAvailable === false && <span className="rounded-full border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[9px] font-medium text-neutral-400">Offline</span>}
    </div>}
    {(message.content || contentOverride) && <div className={`w-fit min-w-0 max-w-full break-words whitespace-pre-wrap [overflow-wrap:anywhere] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isUser ? "engagement-user-bubble rounded-tr-sm bg-white font-medium text-black shadow-lg" : "engagement-bot-bubble rounded-tl-sm border border-neutral-800 bg-[#111111] text-neutral-300 shadow-md"}`}>
      {contentOverride || <FormattedMessage content={message.content} isUser={isUser} />}
    </div>}
    {!isUser && message.botInteraction && <BotInteractionView data={message.botInteraction} onReply={onReply} disabled={disabled} imageProxyToken={imageProxyToken} componentStyles={componentStyles} />}
    {!isUser && uiComponents.length > 0 && <RotatingComponents components={uiComponents} onReply={onReply} disabled={disabled} imageProxyToken={imageProxyToken} />}
    <ResponseMeta
      timestamp={message.timestamp}
      align={isUser ? "end" : "start"}
      displayDate={embedded}
      generationDurationMs={isUser ? undefined : message.generationDurationMs}
      showDetails={!embedded}
      showRetrieval={!embedded && !isUser && (message.messageType === "FAQ" || message.messageType === "RAG" || message.messageType === "WEB_SEARCH")}
      webSearch={!isUser && message.messageType === "WEB_SEARCH"}
      topArticles={topArticles}
      uiComponents={uiComponents}
      webSources={webSources}
    />
  </>;
}