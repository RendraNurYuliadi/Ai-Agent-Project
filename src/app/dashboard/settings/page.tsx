"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Copy, Loader2, MessageSquare, Save, Settings2 } from "lucide-react";
import GlobalChatStyleEditor from "@/components/global-chat-style-editor";
import {
  CHAT_SCROLL_ANIMATION_STYLES,
  getChatScrollAnimationSnapshot,
  getChatScrollAnimationStyleSnapshot,
  loadChatScrollAnimationPreferences,
  setChatScrollAnimationPreference,
  setChatScrollAnimationStylePreference,
  subscribeToChatScrollAnimation,
  type ChatScrollAnimationStyle,
} from "@/lib/chat-ui-preferences";
import {
  getDefaultGlobalChatStyles,
  normalizeGlobalChatStyles,
} from "@/lib/engagement-theme";
import type { EngagementWindow } from "@/types/engagement";

type HeaderPreviewWindow = Pick<EngagementWindow, "title" | "subtitle" | "headerIconUrl">;
type ChatbotPreviewHeader = { title: string; subtitle: string; skillName: string };
type ChatbotPreviewSkill = {
  name: string;
  isAvailable: boolean;
  bot: { name: string } | null;
  botUser: { name: string; fullName: string } | null;
};

export default function SettingsPage() {
  const chatScrollAnimationEnabled = useSyncExternalStore(
    subscribeToChatScrollAnimation,
    getChatScrollAnimationSnapshot,
    () => false
  );
  const chatScrollAnimationStyle = useSyncExternalStore(
    subscribeToChatScrollAnimation,
    getChatScrollAnimationStyleSnapshot,
    () => "fade"
  );
  const [chatPreferencesLoading, setChatPreferencesLoading] = useState(true);
  const [chatPreferencesSaving, setChatPreferencesSaving] = useState(false);
  const [chatPreferencesError, setChatPreferencesError] = useState("");
  const [globalComponentStyles, setGlobalComponentStyles] = useState<Record<string, string>>(getDefaultGlobalChatStyles);
  const [engagementPreviewWindow, setEngagementPreviewWindow] = useState<HeaderPreviewWindow | null>(null);
  const [chatbotPreviewHeader, setChatbotPreviewHeader] = useState<ChatbotPreviewHeader | null>(null);
  const [chatbotPreviewError, setChatbotPreviewError] = useState("");
  const [globalStylesLoading, setGlobalStylesLoading] = useState(true);
  const [globalStylesSaving, setGlobalStylesSaving] = useState(false);
  const [globalStylesApplying, setGlobalStylesApplying] = useState(false);
  const [globalStylesSaved, setGlobalStylesSaved] = useState(true);
  const [globalStylesError, setGlobalStylesError] = useState("");
  const [globalStylesApplyResult, setGlobalStylesApplyResult] = useState("");

  useEffect(() => {
    let active = true;
    loadChatScrollAnimationPreferences()
      .catch((loadError: unknown) => {
        if (active) setChatPreferencesError(loadError instanceof Error ? loadError.message : "Gagal memuat pengaturan animasi.");
      })
      .finally(() => {
        if (active) setChatPreferencesLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/chat-styles")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal memuat style global.");
        if (active) {
          setGlobalComponentStyles(normalizeGlobalChatStyles(data.componentStyles));
          setEngagementPreviewWindow(data.previewWindow);
          setGlobalStylesSaved(true);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setGlobalStylesError(loadError instanceof Error ? loadError.message : "Gagal memuat style global.");
          setGlobalStylesSaved(false);
        }
      })
      .finally(() => {
        if (active) setGlobalStylesLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/skills"),
      fetch("/api/bots/active"),
    ])
      .then(async ([skillsResponse, botResponse]) => {
        const [skillsData, botData] = await Promise.all([
          skillsResponse.json() as Promise<{ error?: string; skills?: ChatbotPreviewSkill[] }>,
          botResponse.json() as Promise<{ error?: string; bot?: { name?: string } | null }>,
        ]);
        if (!skillsResponse.ok) throw new Error(skillsData.error || "Gagal memuat skill untuk preview Chatbot.");
        if (!botResponse.ok) throw new Error(botData.error || "Gagal memuat bot untuk preview Chatbot.");
        if (!Array.isArray(skillsData.skills)) throw new Error("Daftar skill untuk preview Chatbot tidak valid.");

        const activeBotName = typeof botData.bot?.name === "string" ? botData.bot.name : "";
        const previewSkill = skillsData.skills.find((skill) =>
          skill.isAvailable && skill.bot && skill.bot.name === activeBotName
        ) || skillsData.skills.find((skill) => skill.isAvailable && skill.bot);
        const title = previewSkill?.bot?.name || activeBotName || "GenAI Chatbot";
        const skillName = previewSkill?.name || "";
        const subtitle = previewSkill
          ? `${skillName} · ${previewSkill.botUser?.fullName || previewSkill.botUser?.name || "Bot"}`
          : activeBotName
            ? "Bot flow aktif (fallback)"
            : "Pilih skill untuk memulai";

        if (active) {
          setChatbotPreviewHeader({ title, subtitle, skillName });
          setChatbotPreviewError("");
        }
      })
      .catch((loadError: unknown) => {
        if (active) setChatbotPreviewError(loadError instanceof Error ? loadError.message : "Gagal memuat preview Chatbot.");
      });
    return () => { active = false; };
  }, []);

  const saveGlobalStyles = async () => {
    setGlobalStylesSaving(true);
    setGlobalStylesError("");
    try {
      const response = await fetch("/api/chat-styles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ componentStyles: globalComponentStyles }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan style global.");
      setGlobalComponentStyles(normalizeGlobalChatStyles(data.componentStyles));
      setGlobalStylesSaved(true);
    } catch (saveError) {
      setGlobalStylesError(saveError instanceof Error ? saveError.message : "Gagal menyimpan style global.");
    } finally {
      setGlobalStylesSaving(false);
    }
  };

  const applyGlobalStylesToEngagements = async () => {
    if (!window.confirm("Terapkan style global ke semua chat window Engagement? Style spesifik yang ada akan ditimpa.")) return;
    setGlobalStylesApplying(true);
    setGlobalStylesError("");
    setGlobalStylesApplyResult("");
    try {
      const response = await fetch("/api/chat-styles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          componentStyles: globalComponentStyles,
          applyToAllEngagements: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menerapkan style ke Engagement.");
      setGlobalComponentStyles(normalizeGlobalChatStyles(data.componentStyles));
      setGlobalStylesSaved(true);
      setGlobalStylesApplyResult(`Style diterapkan ke semua chat window pada ${data.updatedEngagements} Engagement.`);
    } catch (applyError) {
      setGlobalStylesError(applyError instanceof Error ? applyError.message : "Gagal menerapkan style ke Engagement.");
    } finally {
      setGlobalStylesApplying(false);
    }
  };

  const toggleChatScrollAnimation = async () => {
    setChatPreferencesSaving(true);
    setChatPreferencesError("");
    try {
      await setChatScrollAnimationPreference(!chatScrollAnimationEnabled);
    } catch (storageError) {
      setChatPreferencesError(storageError instanceof Error ? storageError.message : "Pengaturan animasi tidak dapat disimpan.");
    } finally {
      setChatPreferencesSaving(false);
    }
  };

  const selectChatScrollAnimationStyle = async (style: ChatScrollAnimationStyle) => {
    setChatPreferencesSaving(true);
    setChatPreferencesError("");
    try {
      await setChatScrollAnimationStylePreference(style);
    } catch (storageError) {
      setChatPreferencesError(storageError instanceof Error ? storageError.message : "Pilihan transisi tidak dapat disimpan.");
    } finally {
      setChatPreferencesSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-300">
          <Settings2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Setting</h1>
          <p className="mt-1 text-sm text-neutral-500">Atur tampilan dan perilaku chatbot.</p>
        </div>
      </header>

      <section className="space-y-4 rounded-xl border border-neutral-800 bg-[#080808] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Style global chatbot</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-neutral-500">
              Style global dipakai oleh Chatbot dan menjadi sumber style Engagement. Tiap chat window menyimpan style spesifik; gunakan tombol apply untuk menimpa style spesifik semua window dengan style global saat ini.
            </p>
            <p className={`mt-1 text-[10px] ${globalStylesSaved ? "text-emerald-400" : "text-amber-400"}`}>
              {globalStylesSaved ? "Style global tersimpan." : "Ada perubahan style global yang belum disimpan."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveGlobalStyles()}
              disabled={globalStylesLoading || globalStylesSaving || globalStylesApplying || globalStylesSaved}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-700 px-3 text-xs font-semibold text-neutral-200 hover:bg-neutral-900 disabled:opacity-50"
            >
              {globalStylesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan global
            </button>
            <button
              type="button"
              onClick={() => void applyGlobalStylesToEngagements()}
              disabled={globalStylesLoading || globalStylesSaving || globalStylesApplying}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
            >
              {globalStylesApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
              Apply ke semua Engagement
            </button>
          </div>
        </div>
        {globalStylesApplyResult && <p role="status" className="text-[10px] text-emerald-400">{globalStylesApplyResult}</p>}
        {globalStylesError && <p role="alert" className="rounded-md border border-red-900/60 bg-red-950/30 px-3 py-2 text-[10px] text-red-200">{globalStylesError}</p>}
        {chatbotPreviewError && <p role="alert" className="rounded-md border border-red-900/60 bg-red-950/30 px-3 py-2 text-[10px] text-red-200">{chatbotPreviewError}</p>}
        {globalStylesLoading
          ? <p className="py-6 text-center text-xs text-neutral-500">Memuat style global...</p>
          : <GlobalChatStyleEditor
              componentStyles={globalComponentStyles}
              previewWindow={engagementPreviewWindow}
              chatbotPreviewHeader={chatbotPreviewHeader}
              onChange={(styles) => {
                setGlobalComponentStyles(styles);
                setGlobalStylesSaved(false);
                setGlobalStylesError("");
                setGlobalStylesApplyResult("");
              }}
            />}
      </section>

      <section className="rounded-xl border border-neutral-800 bg-[#080808] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-black text-neutral-400">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-neutral-100">Animasi bubble saat scroll</h2>
              <p className="mt-1 max-w-xl text-xs leading-5 text-neutral-500">
                Pilih efek bubble saat masuk ke area terlihat di menu Chatbot. Pengaturan ini dibagikan dan berlaku untuk semua pengguna.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Animasi bubble saat scroll"
            aria-checked={chatScrollAnimationEnabled}
            onClick={toggleChatScrollAnimation}
            disabled={chatPreferencesLoading || chatPreferencesSaving}
            className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:cursor-wait disabled:opacity-50 ${chatScrollAnimationEnabled ? "border-white bg-white" : "border-neutral-700 bg-neutral-900"}`}
          >
            <span className={`h-4 w-4 rounded-full transition-transform ${chatScrollAnimationEnabled ? "translate-x-5 bg-black" : "translate-x-1 bg-neutral-400"}`} />
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-neutral-900 pt-3">
          <span className="text-[11px] text-neutral-500">
            {chatPreferencesLoading ? "Memuat pengaturan akun..." : chatScrollAnimationEnabled ? "Aktif" : "Nonaktif"}
          </span>
          {chatPreferencesError && <span role="alert" className="text-[11px] text-red-300">{chatPreferencesError}</span>}
        </div>
        {chatScrollAnimationEnabled && (
          <fieldset className="mt-4 space-y-2 border-t border-neutral-900 pt-4">
            <legend className="mb-2 text-xs font-medium text-neutral-300">Pilih transisi</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {CHAT_SCROLL_ANIMATION_STYLES.map((style) => (
                <label
                  key={style.value}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors ${chatScrollAnimationStyle === style.value ? "border-neutral-500 bg-neutral-900/70" : "border-neutral-800 bg-black hover:border-neutral-700"}`}
                >
                  <input
                    type="radio"
                    name="chat-scroll-animation-style"
                    value={style.value}
                    checked={chatScrollAnimationStyle === style.value}
                    onChange={() => selectChatScrollAnimationStyle(style.value)}
                    disabled={chatPreferencesLoading || chatPreferencesSaving}
                    className="mt-0.5 accent-white"
                  />
                  <span>
                    <span className="block text-xs font-medium text-neutral-200">{style.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-4 text-neutral-500">{style.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </section>
    </div>
  );
}
