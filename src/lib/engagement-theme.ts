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
  parameters: EngagementStyleParameterDefinition[];
}

export interface EngagementStyleParameterDefinition {
  label: string;
  selector: string;
  property: string;
  type: "color" | "number";
  defaultValue: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  group?: "layout";
}

const color = (
  label: string,
  selector: string,
  property: string,
  defaultValue: string
): EngagementStyleParameterDefinition => ({
  label,
  selector,
  property,
  type: "color",
  defaultValue,
});

const number = (
  label: string,
  selector: string,
  property: string,
  defaultValue: string,
  min: number,
  max: number,
  step = 1,
  unit = "px"
): EngagementStyleParameterDefinition => ({
  label,
  selector,
  property,
  type: "number",
  defaultValue,
  min,
  max,
  step,
  unit,
});

const layout = (
  selector: string,
  options: {
    width: string;
    height: string;
    margin: string;
    padding: string;
    borderWidth: string;
    borderRadius: string;
    widthProperty?: string;
    widthLabel?: string;
    heightProperty?: string;
    heightLabel?: string;
    borderWidthProperty?: string;
  }
): EngagementStyleParameterDefinition[] => {
  const widthUnit = options.width.endsWith("%") ? "%" : "px";
  const heightUnit = options.height.endsWith("%") ? "%" : "px";
  return [
    number(options.widthLabel || "Lebar", selector, options.widthProperty || "width", options.width, 0, 720, 1, widthUnit),
    number(options.heightLabel || "Tinggi", selector, options.heightProperty || "height", options.height, 0, 720, 1, heightUnit),
    number("Margin", selector, "margin", options.margin, 0, 80),
    number("Padding", selector, "padding", options.padding, 0, 80),
    number("Ketebalan border", selector, options.borderWidthProperty || "border-width", options.borderWidth, 0, 12),
    number("Radius border", selector, "border-radius", options.borderRadius, 0, 64),
  ].map((parameter) => ({ ...parameter, group: "layout" as const }));
};

export const ENGAGEMENT_COMPONENT_STYLES: EngagementComponentStyleDefinition[] = [
  {
    id: "launcher",
    name: "Icon chat window",
    description: "Tombol chat yang tampil di pojok kanan bawah website.",
    className: "engagement-launcher",
    defaultCss: `.engagement-launcher {
  --engagement-launcher-shadow-color: #000000;
  width: 72px;
  height: 72px;
  margin: 0;
  padding: 0;
  border: 1px solid var(--engagement-line, #e5e5e5);
  border-radius: 36px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .28);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--engagement-launcher-shadow-color) 36%, transparent);
}`,
    parameters: [
      color("Warna box shadow", ".engagement-launcher", "--engagement-launcher-shadow-color", "#000000"),
      color("Warna border", ".engagement-launcher", "border-color", "#e5e5e5"),
      ...layout(".engagement-launcher", {
        width: "72px", height: "72px", margin: "0px", padding: "0px", borderWidth: "1px", borderRadius: "36px",
      }),
    ],
  },
  {
    id: "header",
    name: "Header",
    description: "Judul, subjudul, icon, dan menu titik tiga.",
    className: "engagement-header",
    defaultCss: `.engagement-header {
      width: 100%;
      height: 64px;
      min-height: 64px;
      margin: 0;
      padding: 12px;
  background: #171717;
  border-color: #404040;
      border-bottom-width: 1px;
      border-radius: 0;
}
.engagement-header-title {
  color: #ffffff;
  font-size: 14px;
}
.engagement-header-subtitle {
  color: #a3a3a3;
  font-size: 12px;
}
.engagement-header-icon {
  background: rgba(255, 255, 255, .12);
}`,
    parameters: [
      color("Warna judul", ".engagement-header-title", "color", "#ffffff"),
      color("Warna subjudul", ".engagement-header-subtitle", "color", "#a3a3a3"),
      color("Background header", ".engagement-header", "background", "#171717"),
      color("Warna border", ".engagement-header", "border-color", "#404040"),
      ...layout(".engagement-header", {
        width: "100%", height: "64px", margin: "0px", padding: "12px", borderWidth: "1px", borderRadius: "0px",
        widthLabel: "Lebar", heightProperty: "height", borderWidthProperty: "border-bottom-width",
      }),
      number("Ukuran judul", ".engagement-header-title", "font-size", "14px", 9, 32),
      number("Ukuran subjudul", ".engagement-header-subtitle", "font-size", "12px", 8, 24),
    ],
  },
  {
    id: "bot-bubble",
    name: "Bubble jawaban bot",
    description: "Teks jawaban bot, termasuk warna, tipografi, border, dan rounded.",
    className: "engagement-bot-bubble",
    defaultCss: `.engagement-bot-bubble {
      max-width: 320px;
      min-height: 40px;
      margin: 0;
  color: #18181b;
  background: #f4f4f5;
  border: 1px solid #d4d4d8;
      border-radius: 16px;
      padding: 10px;
  font-size: 13px;
  line-height: 1.6;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .04);
}
.engagement-bot-bubble * {
  color: inherit;
}`,
    parameters: [
      color("Warna teks jawaban", ".engagement-bot-bubble", "color", "#18181b"),
      color("Background bubble", ".engagement-bot-bubble", "background", "#f4f4f5"),
      color("Warna border", ".engagement-bot-bubble", "border-color", "#d4d4d8"),
      ...layout(".engagement-bot-bubble", {
        width: "320px", widthProperty: "max-width", widthLabel: "Lebar maksimal",
        height: "40px", heightProperty: "min-height", heightLabel: "Tinggi minimum",
        margin: "0px", padding: "10px", borderWidth: "1px", borderRadius: "16px",
      }),
      number("Ukuran teks", ".engagement-bot-bubble", "font-size", "13px", 8, 32),
      number("Lebar baris", ".engagement-bot-bubble", "line-height", "1.6", 1, 3, 0.1, ""),
    ],
  },
  {
    id: "user-bubble",
    name: "Bubble user",
    description: "Pesan teks yang dikirim visitor.",
    className: "engagement-user-bubble",
    defaultCss: `.engagement-user-bubble {
      max-width: 320px;
      min-height: 40px;
      margin: 0;
  color: #ffffff;
  background: #18181b;
  border: 1px solid #18181b;
      border-radius: 16px;
      padding: 10px;
  font-size: 13px;
  line-height: 1.6;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .08);
}
.engagement-user-bubble * {
  color: inherit;
}`,
    parameters: [
      color("Warna teks", ".engagement-user-bubble", "color", "#ffffff"),
      color("Background bubble", ".engagement-user-bubble", "background", "#18181b"),
      color("Warna border", ".engagement-user-bubble", "border-color", "#18181b"),
      ...layout(".engagement-user-bubble", {
        width: "320px", widthProperty: "max-width", widthLabel: "Lebar maksimal",
        height: "40px", heightProperty: "min-height", heightLabel: "Tinggi minimum",
        margin: "0px", padding: "10px", borderWidth: "1px", borderRadius: "16px",
      }),
      number("Ukuran teks", ".engagement-user-bubble", "font-size", "13px", 8, 32),
      number("Lebar baris", ".engagement-user-bubble", "line-height", "1.6", 1, 3, 0.1, ""),
    ],
  },
  {
    id: "reply-buttons",
    name: "Reply buttons",
    description: "Tombol reply yang berasal dari interaction.",
    className: "engagement-button",
    defaultCss: `.engagement-button.engagement-reply-button {
      min-width: 0;
      min-height: 34px;
      margin: 0;
  color: #18181b;
  background: #ffffff;
  border: 1px solid #d4d4d4;
  border-radius: 8px;
  padding: 8px;
  font-size: 12px;
  font-weight: 500;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .04);
}`,
    parameters: [
      color("Warna teks tombol", ".engagement-button.engagement-reply-button", "color", "#18181b"),
      color("Background tombol", ".engagement-button.engagement-reply-button", "background", "#ffffff"),
      color("Warna border", ".engagement-button.engagement-reply-button", "border-color", "#d4d4d4"),
      ...layout(".engagement-button.engagement-reply-button", {
        width: "0px", widthProperty: "min-width", widthLabel: "Lebar minimum",
        height: "34px", heightProperty: "min-height", heightLabel: "Tinggi minimum",
        margin: "0px", padding: "8px", borderWidth: "1px", borderRadius: "8px",
      }),
      number("Ukuran teks", ".engagement-button.engagement-reply-button", "font-size", "12px", 8, 32),
    ],
  },
  {
    id: "link-buttons",
    name: "Link buttons",
    description: "Tombol tautan eksternal pada komponen.",
    className: "engagement-button",
    defaultCss: `.engagement-link-card {
  width: 100%;
  max-width: 320px;
  min-height: 80px;
  margin: 0;
  color: #18181b;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 12px;
}
.engagement-link-title {
  color: #18181b;
  font-size: 14px;
}
.engagement-link-subtitle {
  color: #52525b;
  font-size: 12px;
}
.engagement-button.engagement-link-button {
  min-width: 0;
  min-height: 34px;
  margin: 0;
  color: #18181b;
  background: #ffffff;
  border: 1px solid #d4d4d4;
  border-radius: 8px;
  padding: 8px;
  font-size: 12px;
  font-weight: 500;
}`,
    parameters: [
      color("Warna judul", ".engagement-link-title", "color", "#18181b"),
      color("Warna subjudul", ".engagement-link-subtitle", "color", "#52525b"),
      color("Warna teks tombol", ".engagement-button.engagement-link-button", "color", "#18181b"),
      color("Background card", ".engagement-link-card", "background", "#ffffff"),
      color("Warna border", ".engagement-link-card", "border-color", "#e5e5e5"),
      color("Warna border tombol", ".engagement-button.engagement-link-button", "border-color", "#d4d4d4"),
      ...layout(".engagement-link-card", {
        width: "100%", widthProperty: "width",
        height: "80px", heightProperty: "min-height", heightLabel: "Tinggi minimum",
        margin: "0px", padding: "12px", borderWidth: "1px", borderRadius: "12px",
      }),
      ...layout(".engagement-button.engagement-link-button", {
        width: "0px", widthProperty: "min-width", widthLabel: "Lebar minimum",
        height: "34px", heightProperty: "min-height", heightLabel: "Tinggi minimum",
        margin: "0px", padding: "8px", borderWidth: "1px", borderRadius: "8px",
      }),
      number("Ukuran judul", ".engagement-link-title", "font-size", "14px", 8, 32),
      number("Ukuran subjudul", ".engagement-link-subtitle", "font-size", "12px", 8, 32),
    ],
  },
  {
    id: "card",
    name: "Card",
    description: "Card dengan judul, subtitle, gambar, dan tombol.",
    className: "engagement-content-card",
    defaultCss: `.engagement-content-card {
  width: 100%;
  min-height: 0;
  margin: 0;
  padding: 0;
  color: #18181b;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, .06);
}
.engagement-card-title {
  color: #18181b;
  font-size: 14px;
}
.engagement-card-subtitle {
  color: #52525b;
  font-size: 12px;
}
.engagement-card-image {
  width: 100%;
  height: var(--engagement-card-image-height, 128px);
  margin: 0;
  padding: 0;
  border: 0 solid transparent;
  border-radius: 0;
  object-fit: cover;
}`,
    parameters: [
      color("Warna judul", ".engagement-card-title", "color", "#18181b"),
      color("Warna subjudul", ".engagement-card-subtitle", "color", "#52525b"),
      color("Background card", ".engagement-content-card", "background", "#ffffff"),
      color("Warna border", ".engagement-content-card", "border-color", "#e5e5e5"),
      ...layout(".engagement-content-card", {
        width: "100%", height: "0px", heightProperty: "min-height", heightLabel: "Tinggi minimum",
        margin: "0px", padding: "0px", borderWidth: "1px", borderRadius: "12px",
      }),
      ...layout(".engagement-card-image", {
        width: "100%", height: "128px", margin: "0px", padding: "0px", borderWidth: "0px", borderRadius: "0px",
      }),
      number("Ukuran judul", ".engagement-card-title", "font-size", "14px", 8, 32),
      number("Ukuran subjudul", ".engagement-card-subtitle", "font-size", "12px", 8, 32),
    ],
  },
  {
    id: "carousel",
    name: "Carousel",
    description: "Carousel, navigasi, dan card di dalamnya.",
    className: "engagement-carousel",
    defaultCss: `.engagement-carousel {
  width: 100%;
  max-width: 260px;
  min-height: 0;
  margin: 0;
  padding: 0;
  border: 0 solid transparent;
  border-radius: 0;
}
.engagement-carousel-controls {
  color: #52525b;
}
.engagement-carousel-button {
  min-width: 28px;
  min-height: 28px;
  margin: 0;
  padding: 6px;
  color: #52525b;
  background: #ffffff;
  border: 1px solid #d4d4d8;
  border-radius: 8px;
}
.engagement-carousel-position {
  color: #52525b;
  font-size: 10px;
}`,
    parameters: [
      color("Warna navigasi", ".engagement-carousel-button", "color", "#52525b"),
      color("Background tombol", ".engagement-carousel-button", "background", "#ffffff"),
      color("Warna border", ".engagement-carousel-button", "border-color", "#d4d4d8"),
      color("Warna border carousel", ".engagement-carousel", "border-color", "#e5e5e5"),
      color("Warna posisi", ".engagement-carousel-position", "color", "#52525b"),
      ...layout(".engagement-carousel", {
        width: "260px", widthProperty: "max-width", widthLabel: "Lebar maksimal",
        height: "0px", heightProperty: "min-height", heightLabel: "Tinggi minimum",
        margin: "0px", padding: "0px", borderWidth: "0px", borderRadius: "0px",
      }),
      ...layout(".engagement-carousel-button", {
        width: "28px", widthProperty: "min-width", widthLabel: "Lebar minimum",
        height: "28px", heightProperty: "min-height", heightLabel: "Tinggi minimum",
        margin: "0px", padding: "6px", borderWidth: "1px", borderRadius: "8px",
      }),
      number("Ukuran posisi", ".engagement-carousel-position", "font-size", "10px", 8, 24),
    ],
  },
  {
    id: "interaction",
    name: "Guided routing & text question",
    description: "Tampilan prompt interaksi dan pilihan bot selain welcome message.",
    className: "engagement-interaction-card",
    defaultCss: `.engagement-interaction-card {
  width: 100%;
  max-width: 360px;
  min-height: 120px;
  margin: 0;
  color: #18181b;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, .06);
}
.engagement-interaction-title {
  color: #18181b;
  font-size: 14px;
}
.engagement-interaction-subtitle {
  color: #52525b;
  font-size: 12px;
}`,
    parameters: [
      color("Warna judul", ".engagement-interaction-title", "color", "#18181b"),
      color("Warna subjudul", ".engagement-interaction-subtitle", "color", "#52525b"),
      color("Background", ".engagement-interaction-card", "background", "#ffffff"),
      color("Warna border", ".engagement-interaction-card", "border-color", "#e5e5e5"),
      ...layout(".engagement-interaction-card", {
        width: "360px", widthProperty: "max-width", widthLabel: "Lebar maksimal",
        height: "120px", heightProperty: "min-height", heightLabel: "Tinggi minimum",
        margin: "0px", padding: "14px", borderWidth: "1px", borderRadius: "12px",
      }),
      number("Ukuran judul", ".engagement-interaction-title", "font-size", "14px", 8, 32),
      number("Ukuran subjudul", ".engagement-interaction-subtitle", "font-size", "12px", 8, 32),
    ],
  },
  {
    id: "welcome-message",
    name: "Welcome message",
    description: "Desain kartu sambutan, judul, ikon, subtitle, dan tombol welcome.",
    className: "engagement-welcome-message",
    defaultCss: `.engagement-welcome-message {
  width: 100%;
  max-width: 360px;
  min-height: 120px;
  margin: 0;
  color: #18181b;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 14px;
  padding: 14px;
  font-size: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, .06);
}
.engagement-welcome-title {
  color: #18181b;
  font-size: 14px;
  font-weight: 600;
}
.engagement-welcome-subtitle {
  color: #52525b;
  font-size: 12px;
  line-height: 1.6;
}
.engagement-welcome-message .engagement-welcome-icon {
  background: #18181b;
  color: #ffffff;
}
.engagement-welcome-message .engagement-button.engagement-reply-button {
  color: #18181b;
}`,
    parameters: [
      color("Warna judul", ".engagement-welcome-title", "color", "#18181b"),
      color("Warna subjudul", ".engagement-welcome-subtitle", "color", "#52525b"),
      color("Warna teks tombol", ".engagement-welcome-message .engagement-button.engagement-reply-button", "color", "#18181b"),
      color("Background kartu", ".engagement-welcome-message", "background", "#ffffff"),
      color("Warna border", ".engagement-welcome-message", "border-color", "#e5e5e5"),
      color("Background ikon", ".engagement-welcome-message .engagement-welcome-icon", "background", "#18181b"),
      ...layout(".engagement-welcome-message", {
        width: "360px", widthProperty: "max-width", widthLabel: "Lebar maksimal",
        height: "120px", heightProperty: "min-height", heightLabel: "Tinggi minimum",
        margin: "0px", padding: "14px", borderWidth: "1px", borderRadius: "14px",
      }),
      number("Ukuran judul", ".engagement-welcome-title", "font-size", "14px", 8, 32),
      number("Ukuran subjudul", ".engagement-welcome-subtitle", "font-size", "12px", 8, 32),
    ],
  },
  {
    id: "scrollbar",
    name: "Scrollbar percakapan",
    description: "Warna thumb dan track pada area pesan yang dapat digulir.",
    className: "engagement-message-list",
    defaultCss: `.engagement-message-list {
  width: 100%;
  min-height: 0;
  margin: 0;
  padding: 12px;
  border: 0 solid transparent;
  border-radius: 0;
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
    parameters: [
      color("Warna thumb", ".engagement-message-list", "--engagement-scrollbar-thumb", "#a3a3a3"),
      color("Warna track", ".engagement-message-list", "--engagement-scrollbar-track", "#f4f4f5"),
      color("Warna border", ".engagement-message-list", "border-color", "#e5e5e5"),
      ...layout(".engagement-message-list", {
        width: "100%", height: "0px", heightProperty: "min-height", heightLabel: "Tinggi minimum",
        margin: "0px", padding: "12px", borderWidth: "0px", borderRadius: "0px",
      }),
      number("Lebar scrollbar", ".engagement-message-list::-webkit-scrollbar", "width", "8px", 0, 24),
    ],
  },
  {
    id: "input",
    name: "Input pesan",
    description: "Field penulisan pesan visitor.",
    className: "engagement-input",
    defaultCss: `.engagement-input {
  width: 100%;
  height: 44px;
  margin: 0;
  color: #18181b;
  background: #ffffff;
  border: 1px solid #d4d4d4;
  border-radius: 12px;
  padding: 12px;
  font-size: 13px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .04);
}
.engagement-input::placeholder {
  color: #737373;
}`,
    parameters: [
      color("Warna teks input", ".engagement-input", "color", "#18181b"),
      color("Warna placeholder", ".engagement-input::placeholder", "color", "#737373"),
      color("Background input", ".engagement-input", "background", "#ffffff"),
      color("Warna border", ".engagement-input", "border-color", "#d4d4d4"),
      ...layout(".engagement-input", {
        width: "100%", height: "44px", margin: "0px", padding: "12px", borderWidth: "1px", borderRadius: "12px",
      }),
      number("Ukuran teks", ".engagement-input", "font-size", "13px", 8, 32),
    ],
  },
  {
    id: "send",
    name: "Tombol kirim",
    description: "Tombol kirim, termasuk gambar ikon khusus dari URL.",
    className: "engagement-send",
    defaultCss: `.engagement-send {
  color: #ffffff;
      width: 44px;
      height: 44px;
      margin: 0;
      padding: 0;
      background: #171717;
      border: 1px solid #171717;
  border-radius: 12px;
}
.engagement-send-glyph {
  color: #ffffff;
  width: 20px;
  height: 20px;
}
.engagement-send-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}`,
    parameters: [
      color("Warna ikon", ".engagement-send-glyph", "color", "#ffffff"),
      color("Background tombol", ".engagement-send", "background", "#171717"),
      color("Warna border", ".engagement-send", "border-color", "#171717"),
      ...layout(".engagement-send", {
        width: "44px", height: "44px", margin: "0px", padding: "0px", borderWidth: "1px", borderRadius: "12px",
      }),
    ],
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
    "reply-buttons": `.engagement-button {\n  color: #18181b;\n  background: #ffffff;\n  border: 1px solid #d4d4d4;\n  border-radius: 8px;\n  padding: 8px 12px;\n  font-size: 12px;\n  font-weight: 500;\n  box-shadow: 0 1px 2px rgba(0, 0, 0, .04);\n}`,
    "link-buttons": `.engagement-button {\n  color: #18181b;\n  background: #ffffff;\n  border: 1px solid #d4d4d4;\n  border-radius: 8px;\n  padding: 8px 12px;\n  font-size: 12px;\n  font-weight: 500;\n}`,
    card: `.engagement-card {\n  color: #18181b;\n  background: #ffffff;\n  border: 1px solid #e5e5e5;\n  border-radius: 12px;\n  font-size: 12px;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, .06);\n}`,
    carousel: `.engagement-component {\n  width: 100%;\n  max-width: 260px;\n}\n.engagement-component button {\n  border-radius: 8px;\n  font-size: 11px;\n}`,
    interaction: `.engagement-component {\n  max-width: 360px;\n  color: #18181b;\n  background: #ffffff;\n  border: 1px solid #e5e5e5;\n  border-radius: 12px;\n  padding: 14px;\n  font-size: 12px;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, .06);\n}`,
    input: `.engagement-input {\n  color: #18181b;\n  background: #ffffff;\n  border: 1px solid #d4d4d4;\n  border-radius: 12px;\n  height: 44px;\n  padding: 0 12px;\n  font-size: 13px;\n  box-shadow: 0 1px 2px rgba(0, 0, 0, .04);\n}`,
    send: `.engagement-send {\n  color: #ffffff;\n  background: #18181b;\n  border: 0;\n  border-radius: 12px;\n  width: 44px;\n  height: 44px;\n}`,
  };
  const defaults = getDefaultComponentStyles();
  const migratedStyles = Object.fromEntries(
    Object.entries({ ...defaults, ...styles }).map(([key, css]) =>
      legacyDefaults[key] && css === legacyDefaults[key] ? [key, defaults[key]] : [key, css]
    )
  );

  for (const component of ENGAGEMENT_COMPONENT_STYLES) {
    let css = migratedStyles[component.id] || component.defaultCss;
    for (const parameter of component.parameters) {
      if (parameter.group !== "layout") continue;
      const escapedSelector = parameter.selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rulePattern = new RegExp(`(^|})\\s*${escapedSelector}\\s*\\{([^}]*)\\}`, "i");
      const rule = rulePattern.exec(css);
      const declarations = rule?.[2];
      const propertyPattern = new RegExp(`(?:^|;)\\s*${parameter.property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:`, "i");
      if (declarations !== undefined && propertyPattern.test(declarations)) continue;

      const declaration = `  ${parameter.property}: ${parameter.defaultValue};`;
      if (declarations !== undefined) {
        css = css.replace(rulePattern, (_match, prefix: string, currentDeclarations: string) =>
          `${prefix}${parameter.selector} {${currentDeclarations.trimEnd()}\n${declaration}\n}`
        );
      } else {
        css = `${css.trimEnd()}\n${parameter.selector} {\n${declaration}\n}`;
      }
    }
    migratedStyles[component.id] = css;
  }

  return migratedStyles;
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
