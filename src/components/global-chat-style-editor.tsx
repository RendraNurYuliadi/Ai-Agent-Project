"use client";

import Image from "next/image";
import {
  Bot,
  Cpu,
  MessageCircle,
  MessageSquare,
  Mic,
  MoreVertical,
  Plus,
  Send,
} from "lucide-react";
import {
  AssistantComponentView,
  type ConversationMessageComponent,
} from "@/components/conversation-message-body";
import {
  ENGAGEMENT_COMPONENT_STYLES,
  ENGAGEMENT_GLOBAL_STYLE_COMPONENT_IDS,
  GLOBAL_CHAT_STYLE_COMPONENT_IDS,
  readEngagementStyleProperty,
  scopeEngagementCss,
  setEngagementStyleProperty,
} from "@/lib/engagement-theme";
import { getImageProxyUrl } from "@/lib/image-proxy-url";
import type { EngagementWindow } from "@/types/engagement";

type HeaderPreviewWindow = Pick<EngagementWindow, "title" | "subtitle" | "headerIconUrl">;
const previewComponents: ConversationMessageComponent[] = [
  {
    id: "global-style-reply-preview",
    name: "Reply buttons",
    type: "reply_buttons",
    buttons: [
      { label: "Produk", action: "reply", value: "Produk" },
      { label: "Bantuan", action: "reply", value: "Bantuan" },
    ],
    card: null,
    cards: [],
  },
  {
    id: "global-style-link-preview",
    name: "Link buttons",
    type: "link_buttons",
    title: "Informasi layanan",
    subtitle: "Pelajari layanan dan temukan jawaban lebih lanjut.",
    buttons: [{ label: "Buka halaman", action: "link", value: "#" }],
    card: null,
    cards: [],
  },
  {
    id: "global-style-card-preview",
    name: "Card",
    type: "card",
    buttons: [],
    card: {
      imageUrl: "",
      imageHeight: 128,
      title: "Paket layanan",
      subtitle: "Informasi singkat tentang produk atau layanan.",
      buttons: [{ label: "Lihat detail", action: "reply", value: "Detail" }],
    },
    cards: [],
  },
  {
    id: "global-style-carousel-preview",
    name: "Carousel",
    type: "carousel",
    buttons: [],
    card: null,
    cards: [
      {
        imageUrl: "",
        imageHeight: 128,
        title: "Pilihan pertama",
        subtitle: "Geser untuk melihat pilihan lainnya.",
        buttons: [{ label: "Pilih", action: "reply", value: "Pilihan pertama" }],
      },
      {
        imageUrl: "",
        imageHeight: 128,
        title: "Pilihan kedua",
        subtitle: "Tampilan card mengikuti style global.",
        buttons: [{ label: "Pilih", action: "reply", value: "Pilihan kedua" }],
      },
    ],
  },
];

const previewCssDependencies: Record<string, string[]> = {
  "link-buttons": ["reply-buttons"],
  card: ["reply-buttons"],
  carousel: ["card", "reply-buttons"],
  interaction: ["reply-buttons"],
  "welcome-message": ["reply-buttons"],
  input: ["send"],
  "chatbot-input": ["send"],
};

function getPreviewCss(componentStyles: Record<string, string>, componentId: string): string {
  const ids = [componentId, ...(previewCssDependencies[componentId] || [])];
  return [...new Set(ids)]
    .map((id) => componentStyles[id] || ENGAGEMENT_COMPONENT_STYLES.find((style) => style.id === id)?.defaultCss || "")
    .filter(Boolean)
    .join("\n");
}

function ChatbotHeaderPreview({ componentStyles }: { componentStyles?: Record<string, string> }) {
  const css = componentStyles?.["chatbot-header"] || "";
  const iconUrl = readEngagementStyleProperty(css, ".chatbot-header-icon", "--chatbot-header-icon-url", "");
  return (
    <header className="chatbot-header flex min-w-0 flex-wrap items-center justify-between gap-2 border-b px-2.5 py-2.5 sm:px-4 sm:py-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button type="button" className="hidden h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-neutral-800 px-2 text-neutral-300 shadow-sm sm:flex">
          <MessageSquare className="h-4 w-4 text-white" />
          <span className="hidden text-xs font-medium text-neutral-300 sm:inline">Percakapan (6)</span>
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <div className="chatbot-header-icon flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg p-1.5 shadow">
            {iconUrl ? <Image src={getImageProxyUrl(iconUrl)} alt="" width={32} height={32} unoptimized className="h-full w-full object-cover" /> : <Bot className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <h2 className="chatbot-header-title truncate text-sm font-semibold">Bot name</h2>
            <p className="chatbot-header-subtitle flex items-center gap-1 truncate text-[10px]">
              <Cpu className="h-2.5 w-2.5 shrink-0" />
              Nama dan skill bot
            </p>
          </div>
        </div>
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
        <select aria-label="Preview pilih skill" defaultValue="skill" className="h-9 max-w-24 truncate rounded-lg border border-neutral-800 bg-black px-1.5 text-[10px] text-neutral-300 sm:max-w-40 sm:px-2 sm:text-[11px]">
          <option value="skill">Pilih skill</option>
        </select>
        <div className="hidden items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/70 px-2.5 py-1.5 md:flex">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[9px] font-bold text-black">UN</span>
          <span className="text-[11px] font-medium text-neutral-300">User name</span>
        </div>
        <button type="button" className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-xs text-neutral-300">
          <Plus className="h-3 w-3" /><span className="hidden sm:inline">Chat Baru</span>
        </button>
      </div>
    </header>
  );
}

function EngagementHeaderPreview({
  componentStyles,
  previewWindow,
}: {
  componentStyles?: Record<string, string>;
  previewWindow?: HeaderPreviewWindow | null;
}) {
  const css = componentStyles?.header || "";
  const iconUrl = readEngagementStyleProperty(css, ".engagement-header-icon", "--engagement-header-icon-url", "")
    || previewWindow?.headerIconUrl
    || "";
  return (
    <header className="engagement-header relative flex shrink-0 items-center gap-3 border-b px-4 py-4">
      <span className="engagement-header-icon flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
        {iconUrl ? <Image src={getImageProxyUrl(iconUrl)} alt="" width={36} height={36} unoptimized className="h-full w-full object-cover" /> : <MessageCircle className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="engagement-header-title truncate font-semibold">{previewWindow?.title || "Judul chat window"}</h2>
        <p className="engagement-header-subtitle mt-0.5 truncate">{previewWindow?.subtitle || "Kami siap membantu Anda."}</p>
      </div>
      <button type="button" aria-label="Menu Engagement" className="shrink-0 rounded-lg p-2 text-neutral-400"><MoreVertical className="h-4 w-4" /></button>
    </header>
  );
}

function ChatbotComposerPreview() {
  return (
    <div className="chatbot-composer shrink-0 border-t px-2 py-2 sm:p-3">
      <form className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <input disabled placeholder="Pilih skill untuk memulai..." className="chatbot-input h-10 min-w-0 flex-1 rounded-xl border px-3 text-sm placeholder:text-neutral-600 disabled:opacity-50 sm:px-4" />
        <select aria-label="Bahasa input suara" defaultValue="id-ID" className="h-10 w-12 shrink-0 rounded-xl border border-neutral-800 bg-black px-1 text-center text-[10px] text-neutral-400 sm:w-auto sm:px-2 sm:text-[11px]"><option value="id-ID">ID</option></select>
        <button type="button" disabled aria-label="Input suara" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300 disabled:opacity-40"><Mic className="h-4 w-4" /></button>
        <button type="button" disabled aria-label="Kirim pesan" className="engagement-send flex h-10 w-10 shrink-0 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-40"><Send className="engagement-send-glyph h-4 w-4" /></button>
      </form>
    </div>
  );
}

function EngagementComposerPreview() {
  return (
    <form className="engagement-composer flex shrink-0 items-center gap-2 border-t p-3">
      <input readOnly placeholder="Tulis pesan..." aria-label="Pesan Engagement" className="engagement-input h-11 min-w-0 flex-1 rounded-xl border px-3 text-sm placeholder:text-neutral-500" />
      <button type="button" aria-label="Kirim pesan Engagement" className="engagement-send flex h-11 w-11 shrink-0 items-center justify-center"><Send className="engagement-send-glyph h-5 w-5" /></button>
    </form>
  );
}

function LauncherPreviewButton({ componentStyles }: { componentStyles: Record<string, string> }) {
  const css = componentStyles.launcher || "";
  const iconUrl = readEngagementStyleProperty(css, ".engagement-launcher", "--engagement-launcher-icon-url", "");
  const borderRadius = readEngagementStyleProperty(css, ".engagement-launcher", "border-radius", "36px");
  const borderWidth = readEngagementStyleProperty(css, ".engagement-launcher", "border-width", "1px");
  return (
    <button
      type="button"
      aria-label="Preview icon chat"
      className="engagement-launcher relative flex h-[72px] w-[72px] items-center justify-center rounded-full text-white shadow-xl"
      style={{ borderRadius }}
    >
      {iconUrl
        ? <span aria-hidden="true" className="absolute inset-0 overflow-hidden" style={{ borderRadius, inset: borderWidth }}>
            <Image src={getImageProxyUrl(iconUrl)} alt="" width={72} height={72} unoptimized className="h-full w-full object-cover" />
          </span>
        : <MessageCircle className="h-7 w-7" />}
    </button>
  );
}

function PreviewConversationSamples({
  componentStyles,
}: {
  componentStyles: Record<string, string>;
}) {
  return (
    <div className="engagement-message-list flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div className="engagement-author pl-1 text-[10px] text-neutral-500">
        <span className="font-semibold text-white">Bot name</span>
      </div>
      <div className="flex w-full min-w-0">
        <div className="min-w-0 max-w-[85%]">
          <div className="engagement-bot-bubble w-fit min-w-0 max-w-full break-words whitespace-pre-wrap rounded-2xl rounded-tl-sm border px-4 py-3 text-sm leading-relaxed [overflow-wrap:anywhere]">
            Halo! Saya siap membantu. Jika pesannya panjang, teks akan turun ke baris berikutnya dan tetap berada di dalam batas lebar bubble.
          </div>
        </div>
      </div>
      <ComponentPreviewContent id="welcome-message" componentStyles={componentStyles} />
      <div className="flex w-full min-w-0 justify-end">
        <div className="min-w-0 max-w-[85%]">
          <div className="engagement-user-bubble w-fit min-w-0 max-w-full break-words whitespace-pre-wrap rounded-2xl rounded-tr-sm border px-4 py-3 text-sm leading-relaxed [overflow-wrap:anywhere]">
            Saya ingin bertanya tentang layanan dan informasi yang tersedia untuk kebutuhan saya.
          </div>
        </div>
      </div>
      {previewComponents.map((component) => (
        <div key={component.id} className="engagement-component chat-component-enter w-full min-w-0 pl-1">
          <AssistantComponentView
            component={component}
            onReply={() => {}}
            disabled={false}
            previewMode
          />
        </div>
      ))}
      <ComponentPreviewContent id="interaction" componentStyles={componentStyles} />
    </div>
  );
}

function ComponentPreviewContent({
  id,
  componentStyles,
  previewWindow,
}: {
  id: string;
  componentStyles: Record<string, string>;
  previewWindow?: HeaderPreviewWindow | null;
}) {
  switch (id) {
    case "launcher":
      return <div className="flex min-h-24 items-center justify-center"><LauncherPreviewButton componentStyles={componentStyles} /></div>;
    case "header":
      return <EngagementHeaderPreview componentStyles={componentStyles} previewWindow={previewWindow} />;
    case "chatbot-header":
      return <ChatbotHeaderPreview componentStyles={componentStyles} />;
    case "window":
      return <div className="engagement-widget flex min-h-28 items-center justify-center border p-3 text-xs">Area window chat</div>;
    case "bot-bubble":
      return <div className="flex w-full min-w-0"><div className="min-w-0 max-w-[85%]"><div className="engagement-bot-bubble w-fit min-w-0 max-w-full break-words whitespace-pre-wrap rounded-2xl rounded-tl-sm border px-3 py-2 text-xs leading-relaxed [overflow-wrap:anywhere]">Halo! Saya siap membantu. Pesan panjang akan turun ke baris berikutnya di dalam batas lebar bubble.</div></div></div>;
    case "user-bubble":
      return <div className="flex w-full min-w-0 justify-end"><div className="min-w-0 max-w-[85%]"><div className="engagement-user-bubble w-fit min-w-0 max-w-full break-words whitespace-pre-wrap rounded-2xl rounded-tr-sm border px-3 py-2 text-xs leading-relaxed [overflow-wrap:anywhere]">Saya ingin bertanya tentang layanan dan informasi yang tersedia untuk kebutuhan saya.</div></div></div>;
    case "reply-buttons":
    case "link-buttons":
    case "card":
    case "carousel":
      return <AssistantComponentView component={previewComponents.find((component) => component.type === (id === "reply-buttons" ? "reply_buttons" : id === "link-buttons" ? "link_buttons" : id)) || previewComponents[0]} onReply={() => {}} disabled={false} previewMode />;
    case "interaction":
    case "welcome-message": {
      const welcome = id === "welcome-message";
      const iconUrl = welcome ? "" : readEngagementStyleProperty(
        componentStyles[id] || "",
        ".engagement-interaction-card",
        "--engagement-interaction-icon-url",
        ""
      );
      return <article className={`engagement-component ${id === "welcome-message" ? "engagement-welcome-message" : "engagement-interaction-card"} w-full min-w-0 max-w-full overflow-hidden rounded-xl border p-3.5`}>
        <div className="mb-2 flex items-center gap-2">
          <span className={`${welcome ? "engagement-welcome-icon" : "engagement-interaction-icon"} flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md`}>
            {iconUrl
              ? <Image src={getImageProxyUrl(iconUrl)} alt="" width={28} height={28} unoptimized className="h-full w-full object-cover" />
              : <Bot className="h-4 w-4" />}
          </span>
          <h3 className={`${welcome ? "engagement-welcome-title" : "engagement-interaction-title"} font-semibold`}>{welcome ? "Selamat datang!" : "Pilih salah satu opsi"}</h3>
        </div>
        <p className={`${welcome ? "engagement-welcome-subtitle" : "engagement-interaction-subtitle"} whitespace-pre-wrap leading-5`}>Silakan pilih topik yang ingin Anda tanyakan.</p>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="engagement-button engagement-reply-button rounded-lg border px-3 py-2 text-xs">Lanjutkan</button></div>
      </article>;
    }
    case "scrollbar":
      return (
        <div
          aria-label="Preview scrollbar percakapan"
          className="engagement-message-list h-44 min-h-0 overflow-y-scroll p-3 text-xs"
          style={{ scrollbarGutter: "stable" }}
        >
          <div className="space-y-3">
            <p>Halo, ada yang bisa dibantu?</p>
            <p>Saya ingin bertanya tentang layanan dan informasi yang tersedia.</p>
            <p>Tentu, saya bisa membantu menjelaskan pilihan yang sesuai dengan kebutuhan Anda.</p>
            <p>Apakah Anda ingin mengetahui detail layanan, harga, atau cara memulainya?</p>
            <p>Saya ingin melihat informasi lebih lanjut tentang layanan yang tersedia.</p>
            <p>Baik, berikut ringkasan informasi yang bisa membantu Anda memilih.</p>
            <p>Anda juga bisa memilih salah satu opsi berikut untuk melanjutkan percakapan.</p>
            <p>Silakan pilih topik yang ingin dibahas atau tulis pertanyaan lainnya.</p>
          </div>
        </div>
      );
    case "input":
      return <EngagementComposerPreview />;
    case "chatbot-input":
      return <ChatbotComposerPreview />;
    case "send":
      {
        const css = componentStyles.send || "";
        const iconUrl = readEngagementStyleProperty(css, ".engagement-send", "--engagement-send-icon-url", "");
        return <div className="flex min-h-24 items-center justify-center"><button type="button" aria-label="Preview tombol kirim" className="engagement-send flex h-11 w-11 items-center justify-center rounded-xl">{iconUrl ? <Image src={getImageProxyUrl(iconUrl)} alt="" width={20} height={20} unoptimized className="engagement-send-icon" /> : <Send className="engagement-send-glyph h-5 w-5" />}</button></div>;
      }
    default:
      return null;
  }
}

function ComponentPreviewCard({
  id,
  componentStyles,
  previewWindow,
}: {
  id: string;
  componentStyles: Record<string, string>;
  previewWindow?: HeaderPreviewWindow | null;
}) {
  const component = ENGAGEMENT_COMPONENT_STYLES.find((style) => style.id === id);
  if (!component) return null;
  const scopeClass = `global-style-component-${id}`;

  return (
    <article className={`min-w-0 rounded-lg border border-neutral-800 bg-black/50 ${id === "launcher" ? "overflow-visible" : "overflow-hidden"}`}>
      <style dangerouslySetInnerHTML={{ __html: scopeEngagementCss(getPreviewCss(componentStyles, id), `.${scopeClass}`) }} />
      <div className="border-b border-neutral-800 px-3 py-2">
        <p className="text-[10px] font-semibold text-white">{component.name}</p>
        <p className="mt-0.5 text-[9px] leading-4 text-neutral-500">{component.description}</p>
      </div>
      <div className={`${scopeClass} engagement-widget flex min-h-24 items-center bg-white text-neutral-900 ${id === "launcher" ? "overflow-visible rounded-b-lg p-6" : "overflow-hidden p-3"}`}>
        <div className="w-full min-w-0">
          <ComponentPreviewContent
            id={id}
            componentStyles={componentStyles}
            previewWindow={previewWindow}
          />
        </div>
      </div>
    </article>
  );
}

function FullChatbotWindowPreview({
  componentStyles,
}: {
  componentStyles: Record<string, string>;
}) {
  return (
    <article className="space-y-2">
      <div>
        <h4 className="text-xs font-semibold text-white">Menu Chatbot internal</h4>
        <p className="text-[9px] text-neutral-500">Header, area pesan, dan input sesuai tampilan menu Chatbot.</p>
      </div>
      <div className="global-chatbot-full-preview engagement-widget flex h-[520px] min-w-0 flex-col overflow-hidden rounded-xl border border-neutral-800 bg-black text-white shadow-xl">
        <style dangerouslySetInnerHTML={{ __html: scopeEngagementCss(Object.values(componentStyles).join("\n"), ".global-chatbot-full-preview") }} />
        <ChatbotHeaderPreview componentStyles={componentStyles} />
        <PreviewConversationSamples componentStyles={componentStyles} />
        <ChatbotComposerPreview />
      </div>
    </article>
  );
}

function FullEngagementWindowPreview({
  componentStyles,
  previewWindow,
}: {
  componentStyles: Record<string, string>;
  previewWindow?: HeaderPreviewWindow | null;
}) {
  return (
    <article className="space-y-2">
      <div>
        <h4 className="text-xs font-semibold text-white">Engagement</h4>
        <p className="text-[9px] text-neutral-500">Window embed dengan header dan input khusus Engagement.</p>
      </div>
      <div className="space-y-4">
        <div className="global-engagement-launcher-preview flex min-h-28 items-center justify-center overflow-visible p-6">
          <style dangerouslySetInnerHTML={{ __html: scopeEngagementCss(componentStyles.launcher || "", ".global-engagement-launcher-preview") }} />
          <LauncherPreviewButton componentStyles={componentStyles} />
        </div>
        <div className="mx-auto w-full max-w-[380px]">
          <div className="global-engagement-full-preview engagement-widget flex h-[620px] min-w-0 flex-col overflow-hidden rounded-xl border bg-white text-neutral-900 shadow-xl">
            <style dangerouslySetInnerHTML={{ __html: scopeEngagementCss(Object.values(componentStyles).join("\n"), ".global-engagement-full-preview") }} />
            <EngagementHeaderPreview componentStyles={componentStyles} previewWindow={previewWindow} />
            <PreviewConversationSamples componentStyles={componentStyles} />
            <EngagementComposerPreview />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function GlobalChatStyleEditor({
  componentStyles,
  onChange,
  previewWindow,
  scope = "global",
}: {
  componentStyles: Record<string, string>;
  onChange: (styles: Record<string, string>) => void;
  previewWindow?: HeaderPreviewWindow | null;
  scope?: "global" | "engagement";
}) {
  const componentIds = scope === "engagement"
    ? ENGAGEMENT_GLOBAL_STYLE_COMPONENT_IDS
    : GLOBAL_CHAT_STYLE_COMPONENT_IDS;

  return (
    <div className="space-y-7">
      {scope === "global" && (
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Preview full chat window</h3>
            <p className="mt-1 text-[10px] leading-4 text-neutral-500">
              Header Engagement memakai konfigurasi window terbaru. Preview komponen di bawah hanya menampilkan bagian yang sedang diedit.
            </p>
          </div>
          <div className="space-y-5">
            <FullChatbotWindowPreview componentStyles={componentStyles} />
            <FullEngagementWindowPreview componentStyles={componentStyles} previewWindow={previewWindow} />
          </div>
        </section>
      )}

      <div className="grid gap-2">
        {componentIds.map((id) => {
          const component = ENGAGEMENT_COMPONENT_STYLES.find((style) => style.id === id);
          if (!component) return null;
          const css = componentStyles[id] || component.defaultCss;

          return (
            <details key={id} className="rounded-lg border border-neutral-800 bg-black/40">
              <summary className="cursor-pointer px-3 py-2.5 text-xs font-medium text-neutral-200 hover:text-white">
                {component.name}
              </summary>
              <div className="grid gap-3 border-t border-neutral-800 p-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
                <div className="space-y-3 min-w-0">
                  <p className="text-[10px] leading-4 text-neutral-500">{component.description}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {component.parameters.map((parameter) => {
                      const value = readEngagementStyleProperty(
                        css,
                        parameter.selector,
                        parameter.property,
                        parameter.defaultValue
                      );
                      const controlId = `${id}:${parameter.selector}:${parameter.property}`;

                      if (parameter.type === "color") {
                        const colorValue = value.match(/^#[0-9a-fA-F]{6}$/)?.[0] || parameter.defaultValue;
                        return (
                          <label key={controlId} className="space-y-1 text-[9px] text-neutral-500">
                            {parameter.label}
                            <input
                              type="color"
                              aria-label={`${component.name}: ${parameter.label}`}
                              value={colorValue}
                              onChange={(event) => onChange({
                                ...componentStyles,
                                [id]: setEngagementStyleProperty(css, parameter.selector, parameter.property, event.target.value),
                              })}
                              className="h-7 w-full rounded border border-neutral-700 bg-neutral-950 p-0.5"
                            />
                          </label>
                        );
                      }

                      if (parameter.type === "text") {
                        return (
                          <label key={controlId} className="col-span-2 space-y-1 text-[9px] text-neutral-500">
                            {parameter.label}
                            <input
                              type="url"
                              aria-label={`${component.name}: ${parameter.label}`}
                              placeholder="https://example.com/icon.png"
                              value={value === parameter.defaultValue ? "" : value}
                              onChange={(event) => onChange({
                                ...componentStyles,
                                [id]: setEngagementStyleProperty(
                                  css,
                                  parameter.selector,
                                  parameter.property,
                                  event.target.value.trim()
                                ),
                              })}
                              className="h-7 w-full rounded border border-neutral-700 bg-neutral-950 px-2 text-[10px] text-white placeholder:text-neutral-700"
                            />
                          </label>
                        );
                      }

                      const fallbackNumber = Number.parseFloat(parameter.defaultValue) || 0;
                      const numericValue = Number.parseFloat(value);
                      return (
                        <label key={controlId} className="space-y-1 text-[9px] text-neutral-500">
                          {parameter.label}
                          <input
                            type="number"
                            aria-label={`${component.name}: ${parameter.label}`}
                            min={parameter.min}
                            max={parameter.max}
                            step={parameter.step}
                            value={Number.isFinite(numericValue) ? numericValue : fallbackNumber}
                            onChange={(event) => {
                              const next = Number(event.target.value);
                              if (!Number.isFinite(next)) return;
                              const bounded = Math.min(parameter.max ?? next, Math.max(parameter.min ?? next, next));
                              onChange({
                                ...componentStyles,
                                [id]: setEngagementStyleProperty(
                                  css,
                                  parameter.selector,
                                  parameter.property,
                                  `${bounded}${parameter.unit || ""}`
                                ),
                              });
                            }}
                            className="h-7 w-full rounded border border-neutral-700 bg-neutral-950 px-2 text-[10px] text-white"
                          />
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <details className="min-w-0 flex-1">
                      <summary className="cursor-pointer text-[9px] text-neutral-500 hover:text-neutral-300">
                        Tampilkan CSS
                      </summary>
                      <textarea
                        value={css}
                        onChange={(event) => onChange({
                          ...componentStyles,
                          [id]: event.target.value.slice(0, 10000),
                        })}
                        spellCheck={false}
                        rows={6}
                        aria-label={`CSS ${component.name}`}
                        className="mt-2 w-full resize-y rounded-md border border-neutral-800 bg-black px-2.5 py-2 font-mono text-[9px] leading-4 text-neutral-300 outline-none focus:border-neutral-600"
                      />
                    </details>
                    <button
                      type="button"
                      onClick={() => onChange({
                        ...componentStyles,
                        [id]: component.defaultCss,
                      })}
                      className="shrink-0 text-[9px] text-neutral-500 hover:text-white"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <ComponentPreviewCard
                  id={id}
                  componentStyles={componentStyles}
                  previewWindow={previewWindow}
                />
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
