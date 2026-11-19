export const DEFAULT_ENGAGEMENT_CSS = `/*
Engagement Widget CSS
Edit these variables. Structure and bot data do not need to change.
*/
.engagement-widget {
  --eng-bg: #ffffff;
  --eng-header-bg: #171717;
  --eng-header-title: #ffffff;
  --eng-header-subtitle: #a3a3a3;
  --eng-line: #e5e5e5;
  --eng-bot-bubble-bg: #f4f4f5;
  --eng-bot-bubble-text: #18181b;
  --eng-user-bubble-bg: #18181b;
  --eng-user-bubble-text: #ffffff;
  --eng-button-bg: #ffffff;
  --eng-button-text: #18181b;
  --eng-button-border: #d4d4d4;
  --eng-card-bg: #ffffff;
  --eng-card-text: #18181b;
  --eng-radius: 16px;
  font-size: 14px;
}

.engagement-widget .engagement-header {
  color: var(--eng-header-title);
  background: var(--eng-header-bg);
  border-color: var(--eng-line);
}

.engagement-widget .engagement-header-subtitle {
  color: var(--eng-header-subtitle);
}

.engagement-widget .engagement-bot-bubble {
  color: var(--eng-bot-bubble-text);
  background: var(--eng-bot-bubble-bg);
  border-color: var(--eng-line);
  border-radius: 16px 16px 16px 4px;
}

.engagement-widget .engagement-user-bubble {
  color: var(--eng-user-bubble-text);
  background: var(--eng-user-bubble-bg);
  border-radius: 16px 16px 4px 16px;
}

.engagement-widget .engagement-input {
  color: #18181b;
  background: #ffffff;
  border-color: var(--eng-line);
}

.engagement-widget .engagement-send,
.engagement-widget .engagement-button {
  color: var(--eng-button-text);
  background: var(--eng-button-bg);
  border-color: var(--eng-button-border);
}

.engagement-widget .engagement-card {
  color: var(--eng-card-text);
  background: var(--eng-card-bg);
  border-color: var(--eng-line);
}

.engagement-widget .engagement-component {
  width: 100%;
}
`;

export const ENGAGEMENT_CSS_PRESETS = [
  {
    id: "default",
    name: "Default gelap",
    css: DEFAULT_ENGAGEMENT_CSS,
  },
  {
    id: "clean",
    name: "Putih bersih",
    css: DEFAULT_ENGAGEMENT_CSS
      .replaceAll("#080808", "#f7f7f7")
      .replaceAll("#111111", "#ffffff")
      .replaceAll("#d4d4d4", "#262626")
      .replaceAll("#262626", "#e5e5e5")
      .replaceAll("#151515", "#ffffff")
      .replaceAll("#ffffff", "#1f2937")
      .replaceAll("color: #1f2937;", "color: #111827;"),
  },
  {
    id: "emerald",
    name: "Hijau emerald",
    css: DEFAULT_ENGAGEMENT_CSS
      .replaceAll("#2563eb", "#059669")
      .replaceAll("#080808", "#07110d")
      .replaceAll("#262626", "#173a2c")
      .replaceAll("#404040", "#2d6a50"),
  },
  {
    id: "violet",
    name: "Unggu violet",
    css: DEFAULT_ENGAGEMENT_CSS
      .replaceAll("#2563eb", "#7c3aed")
      .replaceAll("#080808", "#0d0a14")
      .replaceAll("#262626", "#33274c")
      .replaceAll("#404040", "#5b4382"),
  },
];

export interface EngagementComponentStyleDefinition {
  id: string;
  name: string;
  description: string;
  className: string;
  defaultCss: string;
}

export const ENGAGEMENT_COMPONENT_STYLES: EngagementComponentStyleDefinition[] = [
  {
    id: "header",
    name: "Header",
    description: "Judul, subjudul, icon, dan menu titik tiga.",
    className: "engagement-header",
    defaultCss: `.engagement-header {\n  min-height: 64px;\n  padding: 12px 16px;\n  color: #ffffff;\n  background: #171717;\n  box-shadow: 0 1px 0 rgba(0, 0, 0, .06);\n}\n.engagement-header-subtitle {\n  color: #a3a3a3;\n  font-size: 12px;\n}`,
  },
  {
    id: "bot-bubble",
    name: "Bubble jawaban bot",
    description: "Teks jawaban bot, termasuk warna, tipografi, border, dan rounded.",
    className: "engagement-bot-bubble",
    defaultCss: `.engagement-bot-bubble {\n  color: #18181b;\n  background: #f4f4f5;\n  border: 1px solid #e5e5e5;\n  border-radius: 16px 16px 16px 4px;\n  padding: 10px 12px;\n  font-size: 13px;\n  line-height: 1.6;\n  box-shadow: 0 1px 2px rgba(0, 0, 0, .04);\n}`,
  },
  {
    id: "user-bubble",
    name: "Bubble user",
    description: "Pesan teks yang dikirim visitor.",
    className: "engagement-user-bubble",
    defaultCss: `.engagement-user-bubble {\n  color: #ffffff;\n  background: #18181b;\n  border-radius: 16px 16px 4px 16px;\n  padding: 10px 12px;\n  font-size: 13px;\n  line-height: 1.6;\n  font-weight: 500;\n  box-shadow: 0 1px 2px rgba(0, 0, 0, .08);\n}`,
  },
  {
    id: "reply-buttons",
    name: "Reply buttons",
    description: "Tombol reply yang berasal dari interaction.",
    className: "engagement-button",
    defaultCss: `.engagement-button {\n  color: #18181b;\n  background: #ffffff;\n  border: 1px solid #d4d4d4;\n  border-radius: 8px;\n  padding: 8px 12px;\n  font-size: 12px;\n  font-weight: 500;\n  box-shadow: 0 1px 2px rgba(0, 0, 0, .04);\n}`,
  },
  {
    id: "link-buttons",
    name: "Link buttons",
    description: "Tombol tautan eksternal pada komponen.",
    className: "engagement-button",
    defaultCss: `.engagement-button {\n  color: #18181b;\n  background: #ffffff;\n  border: 1px solid #d4d4d4;\n  border-radius: 8px;\n  padding: 8px 12px;\n  font-size: 12px;\n  font-weight: 500;\n}`,
  },
  {
    id: "card",
    name: "Card",
    description: "Card dengan judul, subtitle, gambar, dan tombol.",
    className: "engagement-card",
    defaultCss: `.engagement-card {\n  color: #18181b;\n  background: #ffffff;\n  border: 1px solid #e5e5e5;\n  border-radius: 12px;\n  font-size: 12px;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, .06);\n}`,
  },
  {
    id: "carousel",
    name: "Carousel",
    description: "Carousel, navigasi, dan card di dalamnya.",
    className: "engagement-component",
    defaultCss: `.engagement-component {\n  width: 100%;\n  max-width: 260px;\n}\n.engagement-component button {\n  border-radius: 8px;\n  font-size: 11px;\n}`,
  },
  {
    id: "interaction",
    name: "Guided routing & text question",
    description: "Tampilan prompt interaksi dan pilihan bot selain welcome message.",
    className: "engagement-component",
    defaultCss: `.engagement-component {\n  max-width: 360px;\n  color: #18181b;\n  background: #ffffff;\n  border: 1px solid #e5e5e5;\n  border-radius: 12px;\n  padding: 14px;\n  font-size: 12px;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, .06);\n}`,
  },
  {
    id: "welcome-message",
    name: "Welcome message",
    description: "Desain kartu sambutan, judul, ikon, subtitle, dan tombol welcome.",
    className: "engagement-welcome-message",
    defaultCss: `.engagement-welcome-message {
  max-width: 360px;
  color: #18181b;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 14px;
  padding: 14px;
  font-size: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, .06);
}
.engagement-welcome-message h3 {
  color: #18181b;
  font-size: 14px;
  font-weight: 600;
}
.engagement-welcome-message p {
  color: #52525b;
  line-height: 1.6;
}
.engagement-welcome-message .engagement-welcome-icon {
  background: #18181b;
  color: #ffffff;
}`,
  },
  {
    id: "scrollbar",
    name: "Scrollbar percakapan",
    description: "Warna thumb dan track pada area pesan yang dapat digulir.",
    className: "engagement-message-list",
    defaultCss: `.engagement-message-list {
  --engagement-scrollbar-thumb: #a3a3a3;
  --engagement-scrollbar-track: #f4f4f5;
  scrollbar-color: var(--engagement-scrollbar-thumb) var(--engagement-scrollbar-track);
  scrollbar-width: thin;
}
.engagement-message-list::-webkit-scrollbar {
  width: 8px;
}
.engagement-message-list::-webkit-scrollbar-track {
  background: var(--engagement-scrollbar-track);
}
.engagement-message-list::-webkit-scrollbar-thumb {
  background: var(--engagement-scrollbar-thumb);
  border-radius: 999px;
}`,
  },
  {
    id: "input",
    name: "Input pesan",
    description: "Field penulisan pesan visitor.",
    className: "engagement-input",
    defaultCss: `.engagement-input {\n  color: #18181b;\n  background: #ffffff;\n  border: 1px solid #d4d4d4;\n  border-radius: 12px;\n  height: 44px;\n  padding: 0 12px;\n  font-size: 13px;\n  box-shadow: 0 1px 2px rgba(0, 0, 0, .04);\n}`,
  },
  {
    id: "send",
    name: "Tombol kirim",
    description: "Tombol aksi pengiriman pesan.",
    className: "engagement-send",
    defaultCss: `.engagement-send {\n  color: #ffffff;\n  background: #18181b;\n  border: 0;\n  border-radius: 12px;\n  width: 44px;\n  height: 44px;\n}`,
  },
];

export function getDefaultComponentStyles(): Record<string, string> {
  return Object.fromEntries(
    ENGAGEMENT_COMPONENT_STYLES.map((component) => [component.id, component.defaultCss])
  );
}

export function migrateLegacyComponentStyles(
  styles: Record<string, string>
): Record<string, string> {
  const legacyDefaults: Record<string, string> = {
    header: `.engagement-header {\n  min-height: 64px;\n  padding: 12px 16px;\n  color: #ffffff;\n  background: #2563eb;\n}\n.engagement-header-subtitle {\n  color: rgba(255, 255, 255, .75);\n  font-size: 12px;\n}`,
    "bot-bubble": `.engagement-bot-bubble {\n  color: #d4d4d4;\n  background: #111111;\n  border: 1px solid #262626;\n  border-radius: 16px 16px 16px 4px;\n  font-size: 13px;\n  line-height: 1.6;\n}`,
    "user-bubble": `.engagement-user-bubble {\n  color: #000000;\n  background: #ffffff;\n  border-radius: 16px 16px 4px 16px;\n  font-size: 13px;\n  line-height: 1.6;\n  font-weight: 600;\n}`,
  };
  const defaults = getDefaultComponentStyles();
  return Object.fromEntries(
    Object.entries({ ...defaults, ...styles }).map(([key, css]) =>
      legacyDefaults[key] && css === legacyDefaults[key] ? [key, defaults[key]] : [key, css]
    )
  );
}

export function scopeEngagementCss(css: string, scope: string): string {
  const cleaned = css
    .replace(/@import\b[^;]+;?/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/behavior\s*:/gi, "");

  return cleaned
    .replace(/([^{}]+)\{([^{}]*)\}/g, (_match, selectorText: string, declarations: string) => {
      const selectors = selectorText
        .split(",")
        .map((selector) => selector.trim())
        .filter(Boolean)
        .map((selector) => {
          if (selector.startsWith("@")) return selector;
          return `${scope} ${selector}`;
        });
      return `${selectors.join(",")} {${declarations}}`;
    })
    .replace(/\n\s*\n/g, "\n");
}
