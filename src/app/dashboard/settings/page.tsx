"use client";

import { useState, useSyncExternalStore } from "react";
import { MessageSquare, Settings2 } from "lucide-react";
import {
  CHAT_SCROLL_ANIMATION_STYLES,
  getChatScrollAnimationSnapshot,
  getChatScrollAnimationStyleSnapshot,
  setChatScrollAnimationPreference,
  setChatScrollAnimationStylePreference,
  subscribeToChatScrollAnimation,
  type ChatScrollAnimationStyle,
} from "@/lib/chat-ui-preferences";

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
  const [error, setError] = useState("");

  const toggleChatScrollAnimation = () => {
    try {
      setChatScrollAnimationPreference(!chatScrollAnimationEnabled);
      setError("");
    } catch (storageError) {
      console.error("Could not save chat animation setting:", storageError);
      setError("Pengaturan tidak dapat disimpan di browser ini.");
    }
  };

  const selectChatScrollAnimationStyle = (style: ChatScrollAnimationStyle) => {
    try {
      setChatScrollAnimationStylePreference(style);
      setError("");
    } catch (storageError) {
      console.error("Could not save chat animation style:", storageError);
      setError("Pilihan transisi tidak dapat disimpan di browser ini.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-300">
          <Settings2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Setting</h1>
          <p className="mt-1 text-sm text-neutral-500">Atur tampilan dan perilaku chatbot.</p>
        </div>
      </header>

      <section className="rounded-xl border border-neutral-800 bg-[#080808] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-black text-neutral-400">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-neutral-100">Animasi bubble saat scroll</h2>
              <p className="mt-1 max-w-xl text-xs leading-5 text-neutral-500">
                Pilih efek yang digunakan bubble saat masuk ke area terlihat di menu Chatbot. Pengaturan disimpan di browser ini.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Animasi bubble saat scroll"
            aria-checked={chatScrollAnimationEnabled}
            onClick={toggleChatScrollAnimation}
            className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:cursor-wait disabled:opacity-50 ${chatScrollAnimationEnabled ? "border-white bg-white" : "border-neutral-700 bg-neutral-900"}`}
          >
            <span className={`h-4 w-4 rounded-full transition-transform ${chatScrollAnimationEnabled ? "translate-x-5 bg-black" : "translate-x-1 bg-neutral-400"}`} />
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-neutral-900 pt-3">
          <span className="text-[11px] text-neutral-500">{chatScrollAnimationEnabled ? "Aktif" : "Nonaktif"}</span>
          {error && <span role="alert" className="text-[11px] text-red-300">{error}</span>}
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
