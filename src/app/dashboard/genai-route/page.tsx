"use client";

import React, { useState, useEffect } from "react";
import {
  Route,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Zap,
  ArrowDown,
  MessageSquare,
  Bot,
  Sparkles,
  Wifi,
  WifiOff,
  Settings,
  TestTube,
  Globe,
  HardDrive,
  Key,
} from "lucide-react";

interface Config {
  provider: "lmstudio" | "gemini";
  baseUrl: string;
  model: string;
  geminiApiKey: string;
  geminiModel: string;
  temperature: number;
  maxTokens: number;
}

export default function GenAIRoutePage() {
  const [config, setConfig] = useState<Config>({
    provider: "lmstudio",
    baseUrl: "http://localhost:1234/v1",
    model: "local-model",
    geminiApiKey: "",
    geminiModel: "gemini-1.5-flash",
    temperature: 0.7,
    maxTokens: 1024,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; models?: string[]; error?: string } | null>(null);
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
        setConfig((prev) => ({
          ...prev,
          ...data.config,
        }));
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
        notify("success", "Konfigurasi GenAI berhasil disimpan!");
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
        body: JSON.stringify({
          provider: config.provider,
          baseUrl: config.baseUrl,
          model: config.provider === "gemini" ? config.geminiModel : config.model,
          apiKey: config.geminiApiKey,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: "Tidak dapat menghubungi endpoint testing." });
    }
    setTesting(false);
  };

  const isGemini = config.provider === "gemini";

  return (
    <div className="space-y-6">
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-2xl border flex items-center gap-3 ${
            notification.type === "success"
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
          Pilih dan konfigurasikan AI Provider: Local (LM Studio) atau Public/Cloud (Google AI Studio).
        </p>
      </div>

      {/* Provider Switch Tabs */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4">
        <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
          Pilih Mode AI Provider Aktif
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setConfig({ ...config, provider: "lmstudio" })}
            className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
              !isGemini
                ? "bg-white/10 border-white text-white shadow-md ring-1 ring-white/20"
                : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
            }`}
          >
            <div className={`p-2.5 rounded-lg shrink-0 ${!isGemini ? "bg-white text-black" : "bg-neutral-900 text-neutral-400"}`}>
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm flex items-center gap-2">
                LM Studio
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                  Local / Offline
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Jalankan LLM di komputer lokal tanpa kuota internet atau batasan API.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setConfig({ ...config, provider: "gemini" })}
            className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
              isGemini
                ? "bg-white/10 border-white text-white shadow-md ring-1 ring-white/20"
                : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
            }`}
          >
            <div className={`p-2.5 rounded-lg shrink-0 ${isGemini ? "bg-white text-black" : "bg-neutral-900 text-neutral-400"}`}>
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm flex items-center gap-2">
                Google AI Studio
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  Public / Cloud
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Gunakan API Gemini (1.5 Flash / 2.0 Flash) untuk respon super cepat di cloud.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Route Diagram */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-white" />
          Alur Routing GenAI ({isGemini ? "Google AI Studio" : "LM Studio Local"})
        </h2>

        <div className="flex flex-col items-center gap-2 py-4">
          <div className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-medium flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            User mengirim pesan
          </div>

          <ArrowDown className="w-4 h-4 text-neutral-600" />

          <div className="px-5 py-2.5 rounded-xl bg-neutral-500/10 border border-neutral-500/20 text-neutral-300 text-xs font-medium flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            {isGemini ? "Gemini" : "LM Studio"}: Route Prompt → Klasifikasi (SMALL_TALK / FAQ)
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
              FAQ (+ Smart Search KB Context)
            </div>
          </div>

          <ArrowDown className="w-4 h-4 text-neutral-600" />

          <div className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-medium flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {isGemini ? "Google AI Studio" : "LM Studio"}: Generate Jawaban AI
          </div>
        </div>
      </div>

      {/* Provider Details Configuration */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-white" />
          Konfigurasi {isGemini ? "Google AI Studio (Gemini)" : "LM Studio (Local)"}
        </h2>

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-neutral-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* If LM Studio is selected */}
            {!isGemini ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Base URL (LM Studio)
                  </label>
                  <input
                    type="text"
                    value={config.baseUrl}
                    onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                    placeholder="http://localhost:1234/v1"
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-600"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    URL endpoint API LM Studio (OpenAI-compatible)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Model LM Studio
                  </label>
                  <input
                    type="text"
                    value={config.model}
                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                    placeholder="local-model"
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-600"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Nama model yang di-load di LM Studio
                  </p>
                </div>
              </div>
            ) : (
              /* If Google AI Studio is selected */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-neutral-400" />
                    Google AI Studio API Key
                  </label>
                  <input
                    type="password"
                    value={config.geminiApiKey}
                    onChange={(e) => setConfig({ ...config, geminiApiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-600"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Dapatkan API Key gratis di{" "}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white underline hover:text-neutral-300"
                    >
                      Google AI Studio
                    </a>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Model Gemini
                  </label>
                  <input
                    type="text"
                    value={config.geminiModel}
                    onChange={(e) => setConfig({ ...config, geminiModel: e.target.value })}
                    placeholder="gemini-1.5-flash"
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-600"
                  />
                  <div className="flex gap-2 mt-1.5">
                    {["gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setConfig({ ...config, geminiModel: m })}
                        className={`text-[10px] px-2 py-0.5 rounded border cursor-pointer transition-all ${
                          config.geminiModel === m
                            ? "bg-white text-black border-white"
                            : "bg-neutral-900 text-neutral-400 border-neutral-700 hover:text-white"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Common Parameters: Temperature & Max Tokens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
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
                  <span>0 (Fokus/Deterministik)</span>
                  <span>2 (Kreatif)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Max Output Tokens
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
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600"
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
                {testing ? "Testing..." : `Test Koneksi ${isGemini ? "Google AI Studio" : "LM Studio"}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Test Results */}
      {testResult && (
        <div
          className={`border rounded-2xl p-5 ${
            testResult.success ? "bg-white/5 border-neutral-600" : "bg-neutral-900/80 border-neutral-700"
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
            {testResult.message || testResult.error}
          </p>

          {testResult.models && testResult.models.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-neutral-400 mb-1.5">
                Model yang tersedia:
              </p>

              <div className="flex flex-wrap gap-2">
                {testResult.models.slice(0, 15).map((m) => {
                  const currentSelected = isGemini ? config.geminiModel : config.model;
                  return (
                    <button
                      key={m}
                      onClick={() =>
                        isGemini
                          ? setConfig({ ...config, geminiModel: m })
                          : setConfig({ ...config, model: m })
                      }
                      className={`text-xs px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                        currentSelected === m
                          ? "bg-white text-black border-white"
                          : "bg-neutral-900 text-neutral-300 border-neutral-700 hover:bg-neutral-800 hover:text-white"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
          Panduan Penggunaan Environment
        </h3>

        <ul className="space-y-2 text-xs text-neutral-400">
          <li className="flex items-start gap-2">
            <span className="text-neutral-500 mt-0.5">•</span>
            <span>
              <strong className="text-white">Local Mode (LM Studio):</strong> Memakai variabel{" "}
              <code className="bg-neutral-900 px-1 py-0.5 rounded text-white">LM_STUDIO_URL</code> dan{" "}
              <code className="bg-neutral-900 px-1 py-0.5 rounded text-white">LM_STUDIO_MODEL</code> di file{" "}
              <code className="bg-neutral-900 px-1 py-0.5 rounded text-white">.env.local</code>.
            </span>
          </li>

          <li className="flex items-start gap-2">
            <span className="text-neutral-500 mt-0.5">•</span>
            <span>
              <strong className="text-white">Public / Cloud Mode (Google AI Studio):</strong> Memakai variabel{" "}
              <code className="bg-neutral-900 px-1 py-0.5 rounded text-white">GEMINI_API_KEY</code> dan{" "}
              <code className="bg-neutral-900 px-1 py-0.5 rounded text-white">GEMINI_MODEL</code> di file{" "}
              <code className="bg-neutral-900 px-1 py-0.5 rounded text-white">.env.production</code> atau konfigurasi dashboard.
            </span>
          </li>

          <li className="flex items-start gap-2">
            <span className="text-neutral-500 mt-0.5">•</span>
            <span>
              Konfigurasi yang disimpan di halaman ini akan diutamakan secara dinamis tanpa perlu me-restart server.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}