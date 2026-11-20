"use client";

import { Bot, Send } from "lucide-react";
import {
  AssistantComponentView,
  type ConversationMessageComponent,
} from "@/components/conversation-message-body";
import {
  ENGAGEMENT_COMPONENT_STYLES,
  GLOBAL_CHAT_STYLE_COMPONENT_IDS,
  readEngagementStyleProperty,
  scopeEngagementCss,
  setEngagementStyleProperty,
} from "@/lib/engagement-theme";

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

function GlobalChatStylePreview({ componentStyles }: { componentStyles: Record<string, string> }) {
  return (
    <aside className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-neutral-200">Preview chat</h3>
        <span className="text-[9px] text-emerald-400">Live</span>
      </div>
      <div className="global-chat-style-preview engagement-widget overflow-hidden rounded-xl border border-neutral-800 bg-white text-neutral-900 shadow-xl">
        <style dangerouslySetInnerHTML={{ __html: scopeEngagementCss(Object.values(componentStyles).join("\n"), ".global-chat-style-preview") }} />
        <header className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-900 px-3 py-2.5 text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10"><Bot className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold">Chatbot</p>
            <p className="text-[9px] text-neutral-400">Online · tampilan contoh</p>
          </div>
        </header>
        <div className="max-h-[560px] space-y-3 overflow-y-auto bg-neutral-50 p-3">
          <div className="engagement-bot-bubble w-fit max-w-full break-words rounded-2xl rounded-tl-sm border px-3 py-2 text-xs">
            Halo! Ada yang bisa kami bantu hari ini?
          </div>
          <article className="engagement-component engagement-welcome-message w-full min-w-0 max-w-full overflow-hidden rounded-xl border p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="engagement-welcome-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-md"><Bot className="h-4 w-4" /></span>
              <h3 className="engagement-welcome-title font-semibold">Selamat datang!</h3>
            </div>
            <p className="engagement-welcome-subtitle whitespace-pre-wrap leading-5">Silakan pilih topik yang ingin Anda tanyakan.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="engagement-button engagement-reply-button rounded-lg border px-3 py-2 text-xs">Produk</button>
              <button type="button" className="engagement-button engagement-reply-button rounded-lg border px-3 py-2 text-xs">Bantuan</button>
            </div>
          </article>
          <article className="engagement-component engagement-interaction-card w-full min-w-0 max-w-full overflow-hidden rounded-xl border p-3">
            <h3 className="engagement-interaction-title mb-2 font-semibold">Pilih salah satu opsi</h3>
            <p className="engagement-interaction-subtitle whitespace-pre-wrap leading-5">Komponen interaction juga mengikuti style global.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="engagement-button engagement-reply-button rounded-lg border px-3 py-2 text-xs">Lanjutkan</button>
            </div>
          </article>
          {previewComponents.map((component) => (
            <AssistantComponentView
              key={component.id}
              component={component}
              onReply={() => {}}
              disabled={false}
              previewMode
            />
          ))}
          <div className="flex justify-end">
            <div className="engagement-user-bubble w-fit max-w-[85%] break-words rounded-2xl rounded-tr-sm border px-3 py-2 text-xs">
              Saya ingin bertanya tentang layanan.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-neutral-200 bg-white p-2">
          <div className="flex-1 rounded-full border border-neutral-300 px-3 py-2 text-[10px] text-neutral-400">Ketik pesan...</div>
          <button type="button" aria-label="Contoh tombol kirim" className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white"><Send className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <p className="text-[9px] leading-4 text-neutral-500">
        Preview ini memperlihatkan bubble, welcome message, interaction, tombol, card, dan carousel. Header dan input hanya ilustrasi.
      </p>
    </aside>
  );
}

export default function GlobalChatStyleEditor({
  componentStyles,
  onChange,
}: {
  componentStyles: Record<string, string>;
  onChange: (styles: Record<string, string>) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-2">
        {GLOBAL_CHAT_STYLE_COMPONENT_IDS.map((id) => {
          const component = ENGAGEMENT_COMPONENT_STYLES.find((style) => style.id === id);
          if (!component) return null;
          const css = componentStyles[id] || component.defaultCss;

          return (
            <details key={id} className="rounded-lg border border-neutral-800 bg-black/40">
              <summary className="cursor-pointer px-3 py-2.5 text-xs font-medium text-neutral-200 hover:text-white">
                {component.name}
              </summary>
              <div className="space-y-3 border-t border-neutral-800 p-3">
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
            </details>
          );
        })}
      </div>
      <div className="lg:sticky lg:top-3 lg:self-start">
        <GlobalChatStylePreview componentStyles={componentStyles} />
      </div>
    </div>
  );
}
