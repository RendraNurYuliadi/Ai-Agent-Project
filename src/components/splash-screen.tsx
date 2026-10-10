"use client";

import { useEffect, useState } from "react";
import { Bot, Sparkles } from "lucide-react";

type SplashMessage = {
  role: "user" | "ai";
  text: string;
};

const conversation: SplashMessage[] = [
  { role: "user", text: "Bagaimana AI bisa membantuku membangun sesuatu yang hebat?" },
  { role: "ai", text: "Ide besar dimulai dari percakapan. Mari kita bangun bersama." },
  { role: "user", text: "Ayo ciptakan masa depan." },
];

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [messages, setMessages] = useState<SplashMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (delay: number, callback: () => void) => {
      timers.push(setTimeout(callback, delay));
    };

    schedule(450, () => setMessages([conversation[0]]));
    schedule(1400, () => setTyping(true));
    schedule(2700, () => {
      setTyping(false);
      setMessages((current) => [...current, conversation[1]]);
    });
    schedule(3650, () => setMessages((current) => [...current, conversation[2]]));
    schedule(4700, () => setIsEnding(true));
    schedule(6000, onComplete);

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <main className={`splash-shell relative grid h-dvh min-h-[520px] place-items-center overflow-hidden bg-[#050505] px-5 text-white ${isEnding ? "splash-ending" : ""}`}>
      <section className="relative z-10 flex w-full max-w-lg flex-col items-center">
        <div className="splash-logo mb-7 flex h-16 w-16 items-center justify-center rounded-[20px] border border-neutral-700 bg-white text-black shadow-[0_12px_48px_rgba(255,255,255,0.08)]">
          <Bot className="h-8 w-8" />
        </div>

        <h1 className="text-3xl font-semibold text-white">GenAI Chatbot</h1>
        <p className="mt-2 text-sm text-neutral-500">Imagine. Create. Evolve.</p>

        <div aria-live="polite" className="mt-10 flex min-h-48 w-full flex-col justify-end gap-4">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`splash-message flex w-full ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "ai" && (
                <div className="mr-2.5 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-[#111]">
                  <Sparkles className="h-4 w-4 text-neutral-200" />
                </div>
              )}
              <p className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "rounded-br-md bg-white text-black" : "rounded-bl-md border border-neutral-800 bg-[#111] text-neutral-200"}`}>
                {message.text}
              </p>
              {message.role === "user" && <span aria-hidden="true" className="ml-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-[10px] font-semibold">U</span>}
            </div>
          ))}

          {typing && (
            <div className="splash-message flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 bg-[#111]">
                <Sparkles className="h-4 w-4 text-neutral-200" />
              </div>
              <div className="flex h-10 items-center gap-1.5 rounded-2xl rounded-bl-md border border-neutral-800 bg-[#111] px-4">
                {[0, 1, 2].map((dot) => <span key={dot} className="splash-dot h-1.5 w-1.5 rounded-full bg-neutral-200" style={{ animationDelay: `${dot * 160}ms` }} />)}
              </div>
            </div>
          )}
        </div>

        <div className="mt-9 flex items-center gap-3" role="status">
          <div className="h-0.5 w-28 overflow-hidden rounded-full bg-neutral-800">
            <div className="splash-progress h-full bg-white" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Menyiapkan workspace</span>
        </div>
      </section>
    </main>
  );
}