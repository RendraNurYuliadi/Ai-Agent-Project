"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Mail,
  User,
  Bot,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setError("Semua kolom wajib diisi.");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          name: name.trim() || fullName.trim().split(" ")[0],
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan registrasi.");
      }

      // Berhasil register dan auto-login -> redirect ke Chatbot
      router.push("/dashboard/chatbot");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Terjadi kesalahan saat pendaftaran.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-white/[0.02] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-neutral-500/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center p-3.5 bg-white rounded-2xl shadow-xl shadow-black/50 mb-4 ring-1 ring-neutral-700 hover:scale-105 transition-transform"
          >
            <Bot className="w-9 h-9 text-black" />
          </Link>

          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            GenAI Chatbot
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-300 border border-neutral-800">
              Daftar
            </span>
          </h1>

          <p className="text-sm text-neutral-500 mt-2">
            Buat akun baru untuk mulai berinteraksi dengan AI
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0a0a0a]/95 backdrop-blur-xl border border-neutral-800 rounded-2xl shadow-2xl p-7">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                Daftar Akun Baru
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Lengkapi informasi profil Anda di bawah ini
              </p>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-neutral-900 border border-neutral-800 text-neutral-400">
              Role: Public User
            </span>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/30 border border-red-900/50 flex items-start gap-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nama Lengkap */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Nama Lengkap <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-600">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="misal: Rendra Nur Yuliandi"
                  className="w-full pl-9 pr-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-white placeholder-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700 focus:border-neutral-600 transition-all"
                />
              </div>
            </div>

            {/* Nama Panggilan / Username */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Nama Panggilan <span className="text-neutral-600">(opsional)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-600">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="misal: Rendra"
                  className="w-full pl-9 pr-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-white placeholder-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700 focus:border-neutral-600 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Alamat Email <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-600">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@example.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-white placeholder-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700 focus:border-neutral-600 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-600">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-9 pr-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-white placeholder-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700 focus:border-neutral-600 transition-all"
                />
              </div>
            </div>

            {/* Konfirmasi Password */}
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                Konfirmasi Password <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-600">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password"
                  className="w-full pl-9 pr-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-white placeholder-neutral-600 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-700 focus:border-neutral-600 transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-2.5 px-4 bg-white hover:bg-neutral-200 text-black font-semibold rounded-xl text-sm shadow-lg shadow-black/30 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span>Daftar Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Login */}
          <div className="mt-6 pt-5 border-t border-neutral-800 text-center">
            <p className="text-xs text-neutral-500">
              Sudah memiliki akun?{" "}
              <Link
                href="/login"
                className="text-white hover:underline font-semibold transition-colors"
              >
                Masuk di sini
              </Link>
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-5 text-center flex items-center justify-center gap-1.5 text-xs text-neutral-600">
          <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
          <span>Akun baru otomatis terdaftar dengan hak akses Public User.</span>
        </div>
      </div>
    </div>
  );
}
