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
  RefreshCw,
} from "lucide-react";
import { OPENROUTER_FREE_MODEL } from "@/lib/ai";

interface Config {
  provider: "lmstudio" | "openrouter";
  baseUrl: string;
  model: string;
  openRouterApiKey: string;
  openRouterModel: string;
  temperature: number;
  maxTokens: number;
}

export default function GenAIRoutePage() {
  const [config, setConfig] = useState<Config>({
    provider: "lmstudio",
    baseUrl: "http://localhost:1234/v1",
    model: "local-model",
    openRouterApiKey: "",
    openRouterModel: OPENROUTER_FREE_MODEL,
    temperature: 0.7,
    maxTokens: 1024,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
    models?: string[];
    provider?: "lmstudio" | "openrouter";
  } | null>(null);
  const [availableModels, setAvailableModels] = useState<Record<Config["provider"], string[]>>({
    lmstudio: [],
    openrouter: [],
  });
  const [loadingModels, setLoadingModels] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const notify = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.user && d.user.role !== "admin") {
          window.location.href =
            d.user.role === "manager" ? "/dashboard" : "/dashboard/chatbot";
        }
      })
      .catch(() => {});
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/genai-route/config");
      if (res.ok) {
        const data = await res.json();
        setConfig((prev) => ({ ...prev, ...data.config }));
      }
    } catch {}
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
        notify("success", "Konfigurasi LLM Gateway berhasil disimpan!");
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
          model: isOpenRouter ? config.openRouterModel : config.model,
          apiKey: config.openRouterApiKey,
        }),
      });
      const data = await res.json();
      setTestResult({ ...data, provider: config.provider });
      if (data.success && Array.isArray(data.models)) {
        setAvailableModels((previous) => ({ ...previous, [config.provider]: data.models }));
      }
    } catch {
      setTestResult({
        success: false,
        error: "Tidak dapat menghubungi endpoint testing.",
        provider: config.provider,
      });
    }
    setTesting(false);
  };

  const loadAvailableModels = async () => {
    const provider = config.provider;
    setLoadingModels(true);
    try {
      const res = await fetch("/api/genai-route/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          baseUrl: config.baseUrl,
          apiKey: config.openRouterApiKey,
          listModelsOnly: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal memuat daftar model.");
      }
      const models = Array.isArray(data.models) ? data.models : [];
      setAvailableModels((previous) => ({ ...previous, [provider]: models }));
      notify("success", `${models.length} model tersedia.`);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Gagal memuat daftar model.");
    }
    setLoadingModels(false);
  };

  const isOpenRouter = config.provider === "openrouter";
  const currentModel = isOpenRouter ? config.openRouterModel : config.model;
  const currentProviderModels = availableModels[config.provider];

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
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

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Route className="w-6 h-6 text-white" />
          LLM Gateway
        </h1>
        <p className="text-neutral-400 text-sm mt-1">
          Pilih AI Provider: <strong className="text-white">Local</strong> (LM Studio) atau{" "}
          <strong className="text-white">Public / Cloud</strong> (OpenRouter — model gratis tersedia).
        </p>
      </div>

      {/* Provider Switch */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4">
        <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
          Pilih Mode AI Provider Aktif
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* LM Studio */}
          <button
            type="button"
            onClick={() => {
              setConfig({ ...config, provider: "lmstudio" });
              setTestResult(null);
            }}
            className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
              !isOpenRouter
                ? "bg-white/10 border-white text-white shadow-md ring-1 ring-white/20"
                : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
            }`}
          >
            <div
              className={`p-2.5 rounded-lg shrink-0 ${
                !isOpenRouter ? "bg-white text-black" : "bg-neutral-900 text-neutral-400"
              }`}
            >
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
                Jalankan LLM di komputer lokal. Bebas biaya & tanpa internet.
              </p>
            </div>
          </button>

          {/* OpenRouter */}
          <button
            type="button"
            onClick={() => {
              setConfig({
                ...config,
                provider: "openrouter",
                openRouterModel: config.openRouterModel || OPENROUTER_FREE_MODEL,
              });
              setTestResult(null);
            }}
            className={`p-4 rounded-xl border text-left flex items-start gap-3.5 transition-all cursor-pointer ${
              isOpenRouter
                ? "bg-white/10 border-white text-white shadow-md ring-1 ring-white/20"
                : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
            }`}
          >
            <div
              className={`p-2.5 rounded-lg shrink-0 ${
                isOpenRouter ? "bg-white text-black" : "bg-neutral-900 text-neutral-400"
              }`}
            >
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm flex items-center gap-2">
                OpenRouter
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  Public / Cloud
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Akses Llama 3.3, Gemini Flash, Mistral, DeepSeek & lebih banyak model gratis via cloud.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Route Diagram */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-white" />
          Alur Routing ({isOpenRouter ? "OpenRouter Cloud" : "LM Studio Local"})
        </h2>
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-medium flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            User mengirim pesan
          </div>
          <ArrowDown className="w-4 h-4 text-neutral-600" />
          <div className="px-5 py-2.5 rounded-xl bg-neutral-500/10 border border-neutral-500/20 text-neutral-300 text-xs font-medium flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            {isOpenRouter ? "OpenRouter" : "LM Studio"}: Route Prompt → Klasifikasi (SMALL_TALK / FAQ)
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
              FAQ (+ Smart Search KB)
            </div>
          </div>
          <ArrowDown className="w-4 h-4 text-neutral-600" />
          <div className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-medium flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {isOpenRouter ? "OpenRouter" : "LM Studio"}: Generate Jawaban AI
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-white" />
          Konfigurasi {isOpenRouter ? "OpenRouter (Public / Cloud)" : "LM Studio (Local)"}
        </h2>

        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-neutral-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {!isOpenRouter ? (
              /* LM Studio Fields */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Base URL (LM Studio)
                  </label>
                  <input
                    type="text"
                    value={config.baseUrl}
                    onChange={(e) => {
                      setConfig({ ...config, baseUrl: e.target.value });
                      setAvailableModels((previous) => ({ ...previous, lmstudio: [] }));
                      setTestResult(null);
                    }}
                    placeholder="http://localhost:1234/v1"
                    className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-600"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    URL endpoint OpenAI-compatible dari LM Studio
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Model LM Studio
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={config.model}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      className="min-w-0 flex-1 px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600"
                    >
                      {!currentProviderModels.includes(config.model) && (
                        <option value={config.model}>{config.model} (belum dimuat)</option>
                      )}
                      {currentProviderModels.map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={loadAvailableModels}
                      disabled={loadingModels}
                      className="inline-flex w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-800 bg-black text-neutral-300 hover:bg-neutral-900 disabled:opacity-50"
                      title="Muat model LM Studio"
                      aria-label="Muat model LM Studio"
                    >
                      {loadingModels
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <RefreshCw className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    {currentProviderModels.length
                      ? `${currentProviderModels.length} model terdeteksi dari LM Studio.`
                      : "Muat daftar untuk melihat model yang tersedia."}
                  </p>
                </div>
              </div>
            ) : (
              /* OpenRouter Fields */
              <div className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Model OpenRouter
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={config.openRouterModel}
                        onChange={(e) =>
                          setConfig({ ...config, openRouterModel: e.target.value })
                        }
                        className="min-w-0 flex-1 px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600"
                      >
                        {!currentProviderModels.includes(currentModel) && (
                          <option value={currentModel}>{currentModel} (tersimpan)</option>
                        )}
                        {currentProviderModels.map((model) => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={loadAvailableModels}
                        disabled={loadingModels}
                        className="inline-flex w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-800 bg-black text-neutral-300 hover:bg-neutral-900 disabled:opacity-50"
                        title="Muat model OpenRouter"
                        aria-label="Muat model OpenRouter"
                      >
                        {loadingModels
                          ? <Loader2 className="h-4 w-4 animate-spin" />
                          : <RefreshCw className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      {currentProviderModels.length
                        ? `${currentProviderModels.length} model gratis tersedia.`
                        : "Muat daftar model tanpa mengirim request chat."}
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* Common: Temperature & Max Tokens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-neutral-900">
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
                    setConfig({ ...config, temperature: parseFloat(e.target.value) })
                  }
                  className="w-full accent-neutral-200"
                />
                <div className="flex justify-between text-[10px] text-neutral-500">
                  <span>0 (Fokus / Deterministik)</span>
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
                    setConfig({ ...config, maxTokens: parseInt(e.target.value) || 1024 })
                  }
                  className="w-full px-3.5 py-2.5 bg-black border border-neutral-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-3">
              <button
                onClick={saveConfig}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-medium rounded-xl shadow-md disabled:opacity-50 cursor-pointer transition-all"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
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
                {testing
                  ? "Testing..."
                  : `Test Koneksi ${isOpenRouter ? "OpenRouter" : "LM Studio"}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Test Results */}
      {testResult && testResult.provider === config.provider && (
        <div
          className={`border rounded-2xl p-5 ${
            testResult.success
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
            {testResult.message || testResult.error}
          </p>

        </div>
      )}

      {/* Info / Guide */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
          Variabel Environment
        </h3>
        <ul className="space-y-2.5 text-xs text-neutral-400">
          <li className="flex items-start gap-2">
            <span className="text-neutral-500 mt-0.5">•</span>
            <span>
              <strong className="text-white">LM Studio (Local / Offline):</strong> Mode ini memakai{" "}
              <code className="bg-neutral-900 px-1 py-0.5 rounded text-white">LM_STUDIO_URL</code>{" "}
              dan{" "}
              <code className="bg-neutral-900 px-1 py-0.5 rounded text-white">LM_STUDIO_MODEL</code>{" "}
              dari <code className="bg-neutral-900 px-1 py-0.5 rounded text-white">.env.local</code> pada development lokal.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-neutral-500 mt-0.5">•</span>
            <span>
              <strong className="text-white">OpenRouter (Public / Cloud):</strong> Mode ini memakai{" "}
              <code className="bg-neutral-900 px-1 py-0.5 rounded text-white">OPENROUTER_API_KEY</code>{" "}
              dan{" "}
              <code className="bg-neutral-900 px-1 py-0.5 rounded text-white">OPENROUTER_MODEL</code>{" "}
              . Saat development, atur di <code className="bg-neutral-900 px-1 py-0.5 rounded text-white">.env.local</code>; di Vercel, atur di Project Settings → Environment Variables.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-neutral-500 mt-0.5">•</span>
            <span>
              Model OpenRouter gratis ditandai dengan suffix{" "}
              <code className="bg-neutral-900 px-1 py-0.5 rounded text-white">:free</code>. Limit default 20 req/menit dan 50 req/hari.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-neutral-500 mt-0.5">•</span>
            <span>
              Pilihan provider di halaman ini disimpan sebagai konfigurasi aktif. Perubahan env lokal perlu restart server; perubahan env Vercel perlu redeploy.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}