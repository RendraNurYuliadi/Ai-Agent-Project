"use client";

import React, { useState, useEffect } from "react";
import {
  Route,
  Cpu,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Save,
  Zap,
  ArrowDown,
  MessageSquare,
  Bot,
  Sparkles,
  RefreshCw,
  Wifi,
  WifiOff,
  Settings,
  TestTube,
} from "lucide-react";

interface Config {
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export default function GenAIRoutePage() {
  const [config, setConfig] = useState<Config>({
    baseUrl: "http://localhost:1234/v1",
    model: "local-model",
    temperature: 0.7,
    maxTokens: 1024,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; models?: string[] } | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const notify = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.user && d.user.role !== "admin") {
        window.location.href = d.user.role === "manager" ? "/dashboard" : "/dashboard/chatbot";
      }
    }).catch(() => { });
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/genai-route/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch { }
    setLoading(false);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/genai-route/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        notify("success", "Konfigurasi LM Studio berhasil disimpan!");
      } else {
        throw new Error("Gagal menyimpan");
      }
    } catch {
      notify("error", "Gagal menyimpan konfigurasi.");
    }
    setSaving(false);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/genai-route/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl: config.baseUrl, model: config.model }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: "Tidak dapat menghubungi server." });
    }
    setTesting(false);
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 ${notification.type === "success"
              ? "bg-[#0a0a0a] border-neutral-700 text-neutral-200"
              : "bg-[#0a0a0a] border-neutral-700 text-neutral-300"
            }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-neutral-400" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Route className="w-6 h-6 text-white" />
          GenAI Route
        </h1>
        <p className="text-neutral-400 text-sm mt-1">
          Konfigurasi routing LM Studio dan klasifikasi pertanyaan user otomatis.
        </p>
      </div>

      {/* Route Diagram */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-white" />
          Alur Routing GenAI
        </h2>

        <div className="flex flex-col items-center gap-2 py-4">
          <div className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-medium flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            User mengirim pesan
          </div>

          <ArrowDown className="w-4 h-4 text-neutral-600" />

          <div className="px-5 py-2.5 rounded-xl bg-neutral-500/10 border border-neutral-500/20 text-neutral-300 text-xs font-medium flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            LM Studio: Route Prompt → Klasifikasi
          </div>

          <ArrowDown className="w-4 h-4 text-neutral-600" />

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 rounded-xl bg-neutral-700/30 border border-neutral-700/50 text-neutral-200 text-xs font-medium flex items-center gap-2">
              <Bot className="w-3.5 h-3.5" />
              SMALL_TALK
            </div>

            <span className="text-xs text-neutral-600">atau</span>

            <div className="px-4 py-2 rounded-xl bg-neutral-500/10 border border-neutral-500/20 text-neutral-300 text-xs font-medium flex items-center gap-2">
              <Bot className="w-3.5 h-3.5" />
              FAQ (+ KB Context)
            </div>
          </div>

          <ArrowDown className="w-4 h-4 text-neutral-600" />

          <div className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-medium flex items-center gap-2">
            <Zap className="w-4 h-4" />
            LM Studio: Generate Jawaban
          </div>
        </div>
      </div>

      {/* LM Studio Config */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-white" />
          Konfigurasi LM Studio
        </h2>

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-neutral-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Base URL
                </label>

                <input
                  type="text"
                  value={config.baseUrl}
                  onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                  placeholder="http://localhost:1234/v1"
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600"
                />

                <p className="text-[11px] text-neutral-500 mt-1">
                  URL endpoint API LM Studio (OpenAI-compatible)
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Model
                </label>

                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  placeholder="local-model"
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600"
                />

                <p className="text-[11px] text-neutral-500 mt-1">
                  Nama model yang di-load di LM Studio
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Temperature: {config.temperature}
                </label>

                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      temperature: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-neutral-200"
                />

                <div className="flex justify-between text-[10px] text-neutral-500">
                  <span>0 (Deterministik)</span>
                  <span>2 (Kreatif)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Max Tokens
                </label>

                <input
                  type="number"
                  min="64"
                  max="8192"
                  value={config.maxTokens}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      maxTokens: parseInt(e.target.value) || 1024,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-xl shadow-md disabled:opacity-50 cursor-pointer transition-all"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
              </button>

              <button
                onClick={testConnection}
                disabled={testing}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-medium rounded-xl disabled:opacity-50 cursor-pointer transition-all"
              >
                {testing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <TestTube className="w-3.5 h-3.5 text-neutral-300" />
                )}
                {testing ? "Testing..." : "Test Koneksi"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Test Results */}
      {testResult && (
        <div
          className={`border rounded-2xl p-5 ${testResult.success
              ? "bg-white/5 border-neutral-600"
              : "bg-neutral-900/80 border-neutral-700"
            }`}
        >
          <div className="flex items-center gap-2.5 mb-3">
            {testResult.success ? (
              <Wifi className="w-5 h-5 text-white" />
            ) : (
              <WifiOff className="w-5 h-5 text-neutral-400" />
            )}

            <h3 className="text-sm font-semibold text-white">
              {testResult.success ? "Koneksi Berhasil!" : "Koneksi Gagal"}
            </h3>
          </div>

          <p className="text-xs text-neutral-300 mb-3">
            {testResult.message}
          </p>

          {testResult.models && testResult.models.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-neutral-400 mb-1.5">
                Model yang tersedia di LM Studio:
              </p>

              <div className="flex flex-wrap gap-2">
                {testResult.models.map((m) => (
                  <button
                    key={m}
                    onClick={() => setConfig({ ...config, model: m })}
                    className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${config.model === m
                        ? "bg-white text-black border-white"
                        : "bg-neutral-900 text-neutral-300 border-neutral-700 hover:bg-neutral-800 hover:text-white"
                      }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
          Catatan Penggunaan
        </h3>

        <ul className="space-y-2 text-xs text-neutral-400">
          <li className="flex items-start gap-2">
            <span className="text-neutral-500 mt-0.5">•</span>
            <span>
              Pastikan <strong className="text-white">LM Studio</strong> sudah
              berjalan dan model sudah di-load sebelum menggunakan chatbot.
            </span>
          </li>

          <li className="flex items-start gap-2">
            <span className="text-neutral-500 mt-0.5">•</span>
            <span>
              Jika LM Studio tidak tersedia, chatbot akan menggunakan{" "}
              <strong className="text-white">fallback offline</strong>{" "}
              (keyword matching + raw KB context).
            </span>
          </li>

          <li className="flex items-start gap-2">
            <span className="text-neutral-500 mt-0.5">•</span>
            <span>
              Prompt template yang digunakan untuk routing dan answering dapat
              dikonfigurasi di halaman{" "}
              <strong className="text-white">Prompts</strong>.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}