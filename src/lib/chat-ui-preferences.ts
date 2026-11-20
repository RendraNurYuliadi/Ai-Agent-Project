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

interface ChatUiPreferences {
  animationEnabled: boolean;
  animationStyle: ChatScrollAnimationStyle;
}

const DEFAULT_PREFERENCES: ChatUiPreferences = {
  animationEnabled: false,
  animationStyle: "fade",
};

let preferences = DEFAULT_PREFERENCES;
const subscribers = new Set<() => void>();

const notifySubscribers = () => {
  subscribers.forEach((subscriber) => subscriber());
};

function updateSnapshot(value: unknown) {
  const candidate = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  preferences = {
    animationEnabled: candidate.animationEnabled === true,
    animationStyle: isChatScrollAnimationStyle(candidate.animationStyle)
      ? candidate.animationStyle
      : "fade",
  };
  notifySubscribers();
}

async function savePreferences(updates: Partial<ChatUiPreferences>) {
  const response = await fetch("/api/chat-preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Pengaturan animasi tidak dapat disimpan.");
  updateSnapshot(data.preferences);
}

export function isChatScrollAnimationStyle(value: unknown): value is ChatScrollAnimationStyle {
  return CHAT_SCROLL_ANIMATION_STYLES.some((style) => style.value === value);
}

export function subscribeToChatScrollAnimation(subscriber: () => void): () => void {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function getChatScrollAnimationSnapshot(): boolean {
  return preferences.animationEnabled;
}

export function getChatScrollAnimationStyleSnapshot(): ChatScrollAnimationStyle {
  return preferences.animationStyle;
}

export async function loadChatScrollAnimationPreferences(): Promise<void> {
  updateSnapshot(DEFAULT_PREFERENCES);
  const response = await fetch("/api/chat-preferences");
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Pengaturan animasi tidak dapat dimuat.");
  updateSnapshot(data.preferences);
}

export function setChatScrollAnimationPreference(enabled: boolean): Promise<void> {
  return savePreferences({ animationEnabled: enabled });
}

export function setChatScrollAnimationStylePreference(style: ChatScrollAnimationStyle): Promise<void> {
  return savePreferences({ animationStyle: style });
}
