"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SplashScreen } from "@/components/splash-screen";
import {
  Lock,
  Mail,
  Bot,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan login.");
      }

      if (data.user?.role === "public_user") {
        router.push("/dashboard/chatbot");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Terjadi kesalahan.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setError(null);
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-neutral-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-white rounded-2xl shadow-xl shadow-black/50 mb-4 ring-1 ring-neutral-700">
            <Bot className="w-9 h-9 text-black" />
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            GenAI Chatbot
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 border border-neutral-800">
              v1.0
            </span>
          </h1>

          <p className="text-sm text-neutral-500 mt-2">
            AI Bot & Knowledge Base Management 
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl p-7">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">
              Masuk ke Akun Anda
            </h2>

            <p className="text-xs text-neutral-500 mt-1">
              Silakan masuk menggunakan akun yang telah terdaftar.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-neutral-900 border border-neutral-700 text-neutral-300 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Alamat Email
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-600">
                  <Mail className="w-4 h-4" />
                </div>

                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-white placeholder-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Kata Sandi
              </label>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-600">
                  <Lock className="w-4 h-4" />
                </div>

                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-white placeholder-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-white hover:bg-neutral-200 text-black font-medium rounded-xl text-sm shadow-lg shadow-black/30 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>



          {/* Link to Register */}
          <div className="mt-5 pt-4 border-t border-neutral-800 text-center">
            <p className="text-xs text-neutral-500">
              Belum punya akun?{" "}
              <Link
                href="/register"
                className="text-white hover:underline font-semibold transition-colors"
              >
                Daftar sekarang
              </Link>
            </p>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-5 text-center flex items-center justify-center gap-1.5 text-xs text-neutral-600">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
          <span>
            Daftar untuk mulai menggunakan GenAI Chatbot.
          </span>
        </div>
      </div>
    </div>
  );
}