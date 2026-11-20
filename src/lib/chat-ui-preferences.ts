export const CHAT_SCROLL_ANIMATION_STORAGE_KEY = "ai-chatbot:chat-scroll-animation";
export const CHAT_SCROLL_ANIMATION_STYLE_STORAGE_KEY = "ai-chatbot:chat-scroll-animation-style";
export const CHAT_SCROLL_ANIMATION_STYLES = [
  { value: "fade", label: "Fade", description: "Bubble memudar masuk." },
  { value: "slide", label: "Slide kiri / kanan", description: "Bot dari kiri, pesan Anda dari kanan." },
  { value: "pop", label: "Pop", description: "Bubble muncul dengan efek membesar." },
  { value: "rise", label: "Naik", description: "Bubble bergerak naik dari bawah." },
  { value: "blur", label: "Blur", description: "Bubble muncul dari efek blur." },
] as const;
export type ChatScrollAnimationStyle = (typeof CHAT_SCROLL_ANIMATION_STYLES)[number]["value"];

export const CHAT_WINDOW_ANIMATION_DESCRIPTIONS: Record<ChatScrollAnimationStyle, string> = {
  fade: "Chat window memudar saat ditampilkan atau disembunyikan.",
  slide: "Chat window bergeser saat dibuka atau disembunyikan.",
  pop: "Chat window membesar saat dibuka dan mengecil saat disembunyikan.",
  rise: "Chat window bergerak naik saat dibuka dan turun saat disembunyikan.",
  blur: "Chat window muncul dari blur dan kembali blur saat disembunyikan.",
};

export function isChatScrollAnimationStyle(value: unknown): value is ChatScrollAnimationStyle {
  return CHAT_SCROLL_ANIMATION_STYLES.some((style) => style.value === value);
}

const subscribers = new Set<() => void>();
let readErrorLogged = false;

const notifySubscribers = () => {
  subscribers.forEach((subscriber) => subscriber());
};

const handleStorage = (event: StorageEvent) => {
  if (
    event.key === CHAT_SCROLL_ANIMATION_STORAGE_KEY ||
    event.key === CHAT_SCROLL_ANIMATION_STYLE_STORAGE_KEY ||
    event.key === null
  ) {
    notifySubscribers();
  }
};

export function subscribeToChatScrollAnimation(subscriber: () => void): () => void {
  subscribers.add(subscriber);
  if (subscribers.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }
  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

export function getChatScrollAnimationSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CHAT_SCROLL_ANIMATION_STORAGE_KEY) === "true";
  } catch (error) {
    if (!readErrorLogged) {
      console.error("Could not read chat animation setting:", error);
      readErrorLogged = true;
    }
    return false;
  }
}

export function getChatScrollAnimationStyleSnapshot(): ChatScrollAnimationStyle {
  if (typeof window === "undefined") return "fade";
  try {
    const storedStyle = window.localStorage.getItem(CHAT_SCROLL_ANIMATION_STYLE_STORAGE_KEY);
    return isChatScrollAnimationStyle(storedStyle) ? storedStyle : "fade";
  } catch (error) {
    if (!readErrorLogged) {
      console.error("Could not read chat animation setting:", error);
      readErrorLogged = true;
    }
    return "fade";
  }
}

export function setChatScrollAnimationPreference(enabled: boolean): void {
  window.localStorage.setItem(CHAT_SCROLL_ANIMATION_STORAGE_KEY, String(enabled));
  notifySubscribers();
}

export function setChatScrollAnimationStylePreference(style: ChatScrollAnimationStyle): void {
  window.localStorage.setItem(CHAT_SCROLL_ANIMATION_STYLE_STORAGE_KEY, style);
  notifySubscribers();
}
