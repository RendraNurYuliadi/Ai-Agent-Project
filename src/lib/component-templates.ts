export const COMPONENT_TYPES = [
  "reply_buttons",
  "link_buttons",
  "card",
  "carousel",
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];

export interface ComponentArticleReference {
  collectionName: string;
  articleId: string;
}

export interface ComponentButton {
  label: string;
  action: "reply" | "link";
  value: string;
}

export interface StaticComponentCard {
  imageUrl: string;
  imageHeight: number;
  title: string;
  subtitle: string;
  buttons: ComponentButton[];
}

export interface ComponentTemplateInput {
  name: string;
  type: ComponentType;
  isActive: boolean;
  articleRefs: ComponentArticleReference[];
  buttons: ComponentButton[];
  card: StaticComponentCard;
  cards: StaticComponentCard[];
}

export interface ComponentTemplate extends ComponentTemplateInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

type ValidationResult =
  | { success: true; data: ComponentTemplateInput }
  | { success: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validLink(value: string): boolean {
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseButtons(value: unknown, max: number): ComponentButton[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const buttons: ComponentButton[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const action = item.action === "link" ? "link" : item.action === "reply" ? "reply" : null;
    const buttonValue = typeof item.value === "string" ? item.value.trim() : "";
    if (!label || !buttonValue || !action || (action === "link" && !validLink(buttonValue))) return null;
    buttons.push({ label: label.slice(0, 60), action, value: buttonValue.slice(0, 500) });
  }
  return buttons;
}

function parseCard(value: unknown): StaticComponentCard | null {
  if (!isRecord(value)) return null;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const subtitle = typeof value.subtitle === "string" ? value.subtitle.trim() : "";
  const imageUrl = typeof value.imageUrl === "string" ? value.imageUrl.trim() : "";
  const imageHeight = typeof value.imageHeight === "number" ? Math.round(value.imageHeight) : 128;
  const buttons = parseButtons(value.buttons ?? [], 3);
  if (!title || !subtitle || !buttons || !Number.isFinite(imageHeight) || imageHeight < 64 || imageHeight > 500) return null;
  if (imageUrl && !validLink(imageUrl)) return null;
  return {
    title: title.slice(0, 120),
    subtitle: subtitle.slice(0, 300),
    imageUrl: imageUrl.slice(0, 1000),
    imageHeight,
    buttons,
  };
}

export function validateComponentTemplate(value: unknown): ValidationResult {
  if (!isRecord(value)) return { success: false, error: "Format template tidak valid." };

  const name = typeof value.name === "string" ? value.name.trim() : "";
  if (!name) return { success: false, error: "Nama template wajib diisi." };
  if (name.length > 100) return { success: false, error: "Nama template maksimal 100 karakter." };
  if (!COMPONENT_TYPES.includes(value.type as ComponentType)) {
    return { success: false, error: "Tipe komponen tidak valid." };
  }

  if (!Array.isArray(value.articleRefs) || value.articleRefs.length < 1 || value.articleRefs.length > 10) {
    return { success: false, error: "Pilih 1 sampai 10 artikel Knowledge Base." };
  }
  const articleRefs: ComponentArticleReference[] = [];
  for (const item of value.articleRefs) {
    if (!isRecord(item) || typeof item.collectionName !== "string" || typeof item.articleId !== "string") {
      return { success: false, error: "Referensi artikel tidak valid." };
    }
    if (!/^kb_[a-z0-9_]+$/.test(item.collectionName) || !/^[a-f\d]{24}$/i.test(item.articleId)) {
      return { success: false, error: "Referensi artikel tidak valid." };
    }
    articleRefs.push({ collectionName: item.collectionName, articleId: item.articleId });
  }
  if (new Set(articleRefs.map((item) => `${item.collectionName}:${item.articleId}`)).size !== articleRefs.length) {
    return { success: false, error: "Artikel yang sama tidak boleh dipilih dua kali." };
  }

  const type = value.type as ComponentType;
  const parsedButtons = type === "reply_buttons" || type === "link_buttons"
    ? parseButtons(value.buttons ?? [], 10)
    : [];
  const buttons = parsedButtons?.map((button) => ({
    ...button,
    action: type === "link_buttons" ? "link" as const : "reply" as const,
  })) ?? null;
  const card = type === "card" ? parseCard(value.card) : null;
  const cards = type === "carousel" && Array.isArray(value.cards)
    ? value.cards.map(parseCard)
    : [];
  if (
    !buttons ||
    (type === "card" && !card) ||
    (type === "carousel" && cards.some((item) => item === null))
  ) {
    return { success: false, error: "Isi tombol atau card belum valid." };
  }

  if ((type === "reply_buttons" || type === "link_buttons") && (buttons.length < 1 || buttons.length > 10)) {
    return { success: false, error: "Komponen tombol harus memiliki 1 sampai 10 tombol." };
  }
  if (type === "link_buttons" && buttons.some((button) => !validLink(button.value))) {
    return { success: false, error: "Semua nilai tombol link harus berupa URL HTTP/HTTPS atau path internal." };
  }
  if (type === "carousel" && (cards.length < 1 || cards.length > 10)) {
    return { success: false, error: "Carousel harus memiliki 1 sampai 10 card." };
  }

  return {
    success: true,
    data: {
      name: name.slice(0, 100),
      type,
      isActive: value.isActive === true,
      articleRefs,
      buttons,
      card: card || { imageUrl: "", imageHeight: 128, title: "", subtitle: "", buttons: [] },
      cards: cards as StaticComponentCard[],
    },
  };
}