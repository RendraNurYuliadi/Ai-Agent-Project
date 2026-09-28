import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Database,
  Bot,
  ArrowRight,
  Clock,
  FolderOpen,
  MessageSquare,
  Zap,
  Route,
  Cpu,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  if (session?.role === "public_user") {
    redirect("/dashboard/public");
  }

  const db = await getDatabase();

  // 1. Fetch Users & Roles
  const [totalUsers, recentUsers, rolesAgg] = await Promise.all([
    db.collection("users").countDocuments(),
    db
      .collection("users")
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray(),
    db
      .collection("users")
      .aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }])
      .toArray(),
  ]);

  const rolesMap: Record<string, number> = {
    admin: 0,
    manager: 0,
    public_user: 0,
  };

  rolesAgg.forEach((r) => {
    if (r._id) rolesMap[r._id] = r.count;
  });

  // 2. Fetch Chatbot, Prompts & GenAI Config
  const [totalConversations, totalPrompts, genaiConfigDoc] = await Promise.all([
    db.collection("conversations").countDocuments(),
    db.collection("prompts").countDocuments(),
    db.collection("genaiConfig").findOne({ key: "lmstudio" }),
  ]);

  // 3. Dynamic Knowledge Base Collections (only user-created collections)
  const kbMetaDocs = await db
    .collection("knowledgeBases")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  let totalArticles = 0;

  const kbSummaryList: Array<{
    id: string;
    name: string;
    coll: string;
    description: string;
    count: number;
    updatedAt?: Date;
  }> = [];

  for (const kb of kbMetaDocs) {
    try {
      const count = await db.collection(kb.collectionName).countDocuments();

      totalArticles += count;

      kbSummaryList.push({
        id: kb._id.toString(),
        name: kb.displayName,
        coll: kb.collectionName,
        description: kb.description || "",
        count,
        updatedAt: kb.updatedAt || kb.createdAt,
      });
    } catch {
      // skip collection if error
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#111111] via-[#080808] to-black border border-neutral-800 p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-white/[0.025] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-neutral-800 text-neutral-300 text-xs font-medium mb-3">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Sistem Aktif & MongoDB Terhubung
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Selamat datang kembali, {session?.name}!
            </h1>

            <p className="text-neutral-400 text-sm mt-1.5 max-w-2xl leading-relaxed">
              Kelola koleksi Knowledge Base, alur percakapan chatbot GenAI, dan akun pengguna dari portal ini.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/knowledge-base"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold transition-all shadow-sm"
            >
              <Database className="w-4 h-4" />
              <span>Kelola Knowledge Base</span>
            </Link>

            <Link
              href="/dashboard/chatbot"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition-all shadow-lg"
            >
              <Bot className="w-4 h-4" />
              <span>Buka Chatbot</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Users */}
        <div className="bg-[#080808] border border-neutral-900 rounded-2xl p-5 hover:border-neutral-700 transition-all shadow-sm group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">
              Total Pengguna
            </span>

            <div className="p-2.5 bg-neutral-900 text-neutral-300 rounded-xl group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {totalUsers}
            </span>
            <span className="text-xs text-neutral-500">
              user terdaftar
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-900 flex items-center justify-between text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Adm: {rolesMap.admin}
            </span>

            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
              Mgr: {rolesMap.manager}
            </span>

            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
              Usr: {rolesMap.public_user}
            </span>
          </div>
        </div>

        {/* Card 2: Total Koleksi KB */}
        <div className="bg-[#080808] border border-neutral-900 rounded-2xl p-5 hover:border-neutral-700 transition-all shadow-sm group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">
              Total Koleksi KB
            </span>

            <div className="p-2.5 bg-neutral-900 text-neutral-300 rounded-xl group-hover:scale-105 transition-transform">
              <Database className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {kbSummaryList.length}
            </span>

            <span className="text-xs text-neutral-500">
              koleksi aktif
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-900 flex items-center justify-between text-xs text-neutral-500">
            <span className="text-neutral-300 font-medium">
              {totalArticles} total artikel
            </span>

            <Link
              href="/dashboard/knowledge-base"
              className="text-neutral-400 hover:text-white inline-flex items-center gap-0.5 transition-colors"
            >
              Kelola <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 3: Chatbot & Conversations */}
        <div className="bg-[#080808] border border-neutral-900 rounded-2xl p-5 hover:border-neutral-700 transition-all shadow-sm group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">
              Percakapan Chat
            </span>

            <div className="p-2.5 bg-neutral-900 text-neutral-300 rounded-xl group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {totalConversations}
            </span>

            <span className="text-xs text-neutral-500">
              sesi chat tersimpan
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-900 flex items-center justify-between text-xs text-neutral-500">
            <span className="text-neutral-300 font-medium">
              History per-user
            </span>

            <Link
              href="/dashboard/chat-history"
              className="text-neutral-400 hover:text-white inline-flex items-center gap-0.5 transition-colors"
            >
              Riwayat <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 4: GenAI & Prompts Config */}
        <div className="bg-[#080808] border border-neutral-900 rounded-2xl p-5 hover:border-neutral-700 transition-all shadow-sm group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">
              GenAI & Prompts
            </span>

            <div className="p-2.5 bg-neutral-900 text-neutral-300 rounded-xl group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {totalPrompts}
            </span>

            <span className="text-xs text-neutral-500">
              prompt template
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-900 flex items-center justify-between text-xs text-neutral-500">
            <span className="text-neutral-300 truncate max-w-[120px]">
              {genaiConfigDoc?.provider === "openrouter"
                ? (genaiConfigDoc?.openRouterModel?.split("/").pop()?.replace(":free", "") || "OpenRouter")
                : (genaiConfigDoc?.model || "LM Studio")}
            </span>

            <Link
              href="/dashboard/genai-route"
              className="text-neutral-400 hover:text-white inline-flex items-center gap-0.5 transition-colors"
            >
              Route <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid: Knowledge Base Collections & Users Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Knowledge Base Collections Panel */}
        <div className="lg:col-span-2 bg-[#080808] border border-neutral-900 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-neutral-300" />
                  Koleksi Knowledge Base Anda
                </h2>

                <p className="text-xs text-neutral-500 mt-0.5">
                  Daftar Knowledge Base yang aktif dan dibuat dalam sistem
                </p>
              </div>

              <Link
                href="/dashboard/knowledge-base"
                className="text-xs text-neutral-300 hover:text-white inline-flex items-center gap-1 font-medium px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-all"
              >
                + Tambah / Buka KB <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {kbSummaryList.length === 0 ? (
              <div className="py-12 text-center bg-black/50 rounded-2xl border border-dashed border-neutral-800">
                <FolderOpen className="w-10 h-10 text-neutral-700 mx-auto mb-2" />

                <p className="text-sm font-medium text-white">
                  Belum ada Knowledge Base yang dibuat.
                </p>

                <Link
                  href="/dashboard/knowledge-base"
                  className="mt-3 inline-block px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-semibold rounded-xl transition-colors"
                >
                  Buat Knowledge Base Sekarang
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {kbSummaryList.map((kb) => (
                  <div
                    key={kb.coll}
                    className="p-4 rounded-2xl bg-black/50 border border-neutral-900 hover:border-neutral-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 mb-1">
                        <div className="p-2 rounded-xl bg-neutral-900 text-neutral-300 shrink-0">
                          <FolderOpen className="w-4 h-4" />
                        </div>

                        <h3 className="text-sm font-bold text-white group-hover:text-neutral-300 transition-colors truncate">
                          {kb.name}
                        </h3>

                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400 font-mono border border-neutral-800 shrink-0">
                          {kb.coll}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-500 line-clamp-1 ml-9">
                        {kb.description || "Tidak ada deskripsi tambahan."}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-9 sm:ml-0">
                      <div className="text-right">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-neutral-900 text-neutral-300 border border-neutral-800 block">
                          {kb.count} artikel
                        </span>
                      </div>

                      <Link
                        href="/dashboard/knowledge-base"
                        className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-white text-neutral-300 hover:text-black border border-neutral-700 text-xs font-medium transition-all"
                      >
                        Buka →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-neutral-900 flex items-center justify-between text-xs text-neutral-500">
            <span>Konsep: 1 Koleksi MongoDB = 1 Knowledge Base</span>

            <span className="text-neutral-300 font-medium">
              Struktur Field Dinamis
            </span>
          </div>
        </div>

        {/* Users & Quick Actions Panel */}
        <div className="space-y-6">
          {/* Users Summary */}
          <div className="bg-[#080808] border border-neutral-900 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-neutral-400" />
                Pengguna Terdaftar
              </h3>

              <Link
                href="/dashboard/users"
                className="text-[11px] text-neutral-400 hover:text-white font-medium transition-colors"
              >
                Kelola Semua
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentUsers.map((u) => {
                const isAdm = u.role === "admin";
                const isMgr = u.role === "manager";

                return (
                  <div
                    key={u._id.toString()}
                    className="p-2.5 rounded-xl bg-black/50 border border-neutral-900 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center font-bold text-xs text-neutral-200 shrink-0">
                        {u.name?.charAt(0).toUpperCase() || "U"}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {u.name}
                        </p>

                        <p className="text-[10px] text-neutral-500 truncate">
                          {u.email}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-semibold shrink-0 border ${isAdm
                        ? "bg-white/10 text-white border-white/20"
                        : isMgr
                          ? "bg-neutral-700/30 text-neutral-300 border-neutral-700"
                          : "bg-neutral-900 text-neutral-500 border-neutral-800"
                        }`}
                    >
                      {u.role}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-900 text-[11px] text-neutral-500 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-neutral-600" />
              <span>User hanya dapat dibuat oleh Admin.</span>
            </div>
          </div>

          {/* Quick System Links */}
          <div className="bg-[#080808] border border-neutral-900 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-neutral-400" />
              Akses Cepat Modul
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/dashboard/chatbot"
                className="p-2.5 rounded-xl bg-black/50 border border-neutral-900 hover:border-neutral-700 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-all flex items-center gap-2"
              >
                <Bot className="w-3.5 h-3.5 text-neutral-300" />
                <span>AI Chatbot</span>
              </Link>

              <Link
                href="/dashboard/prompts"
                className="p-2.5 rounded-xl bg-black/50 border border-neutral-900 hover:border-neutral-700 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-all flex items-center gap-2"
              >
                <Zap className="w-3.5 h-3.5 text-neutral-300" />
                <span>Prompts ({totalPrompts})</span>
              </Link>

              <Link
                href="/dashboard/genai-route"
                className="p-2.5 rounded-xl bg-black/50 border border-neutral-900 hover:border-neutral-700 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-all flex items-center gap-2"
              >
                <Route className="w-3.5 h-3.5 text-neutral-300" />
                <span>GenAI Route</span>
              </Link>

              <Link
                href="/dashboard/chat-history"
                className="p-2.5 rounded-xl bg-black/50 border border-neutral-900 hover:border-neutral-700 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-all flex items-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5 text-neutral-300" />
                <span>Chat History ({totalConversations})</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}