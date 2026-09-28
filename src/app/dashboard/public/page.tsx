import { getSession } from "@/lib/auth";
import { getDatabase } from "@/lib/mongodb";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Clock3,
  MessageSquare,
  Plus,
  UserRound,
} from "lucide-react";

export default async function PublicDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "public_user") redirect("/dashboard");

  const db = await getDatabase();
  const conversations = await db
    .collection("conversations")
    .find(
      { userId: session.id },
      { projection: { title: 1, messageCount: 1, updatedAt: 1 } }
    )
    .sort({ updatedAt: -1 })
    .limit(5)
    .toArray();
  const conversationCount = await db
    .collection("conversations")
    .countDocuments({ userId: session.id });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-gradient-to-br from-[#161616] via-[#0b0b0b] to-black p-6 md:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-black/50 px-3 py-1.5 text-[11px] text-neutral-400">
            <Bot className="h-3.5 w-3.5 text-white" />
            Personal AI workspace
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            Halo, {session.fullName || session.name}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-400">
            Mulai percakapan dengan AI, temukan jawaban dari Knowledge Base, dan lanjutkan chat terakhir Anda dari satu tempat.
          </p>
          <Link
            href="/dashboard/chatbot"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition-colors hover:bg-neutral-200"
          >
            <Plus className="h-4 w-4" />
            Mulai Chat Baru
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/dashboard/chatbot"
          className="group rounded-2xl border border-neutral-800 bg-[#0a0a0a] p-5 transition-colors hover:border-neutral-600"
        >
          <MessageSquare className="h-5 w-5 text-neutral-300" />
          <p className="mt-4 text-sm font-semibold text-white">Chat dengan AI</p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">Tanyakan apa saja berdasarkan knowledge yang tersedia.</p>
          <ArrowRight className="mt-4 h-4 w-4 text-neutral-600 transition-transform group-hover:translate-x-1 group-hover:text-white" />
        </Link>

        <Link
          href="/dashboard/chat-history"
          className="group rounded-2xl border border-neutral-800 bg-[#0a0a0a] p-5 transition-colors hover:border-neutral-600"
        >
          <Clock3 className="h-5 w-5 text-neutral-300" />
          <p className="mt-4 text-sm font-semibold text-white">Riwayat Chat</p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">Buka kembali percakapan yang pernah Anda buat.</p>
          <ArrowRight className="mt-4 h-4 w-4 text-neutral-600 transition-transform group-hover:translate-x-1 group-hover:text-white" />
        </Link>

        <div className="rounded-2xl border border-neutral-800 bg-[#0a0a0a] p-5">
          <UserRound className="h-5 w-5 text-neutral-300" />
          <p className="mt-4 text-sm font-semibold text-white">Profil Anda</p>
          <p className="mt-1 truncate text-xs text-neutral-500">{session.email}</p>
          <p className="mt-4 text-2xl font-semibold text-white">{conversationCount}</p>
          <p className="text-[11px] text-neutral-600">total percakapan</p>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-800 bg-[#0a0a0a]">
        <div className="flex items-center justify-between border-b border-neutral-900 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Percakapan Terakhir</h2>
            <p className="mt-1 text-xs text-neutral-600">Lanjutkan dari aktivitas terbaru Anda.</p>
          </div>
          <Link href="/dashboard/chat-history" className="text-xs text-neutral-400 hover:text-white">
            Lihat semua
          </Link>
        </div>

        {conversations.length > 0 ? (
          <div className="divide-y divide-neutral-900">
            {conversations.map((conversation) => (
              <Link
                key={conversation._id.toString()}
                href={`/dashboard/chatbot?id=${conversation._id.toString()}`}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-neutral-950"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-200">{conversation.title || "Percakapan Baru"}</p>
                  <p className="mt-1 text-[11px] text-neutral-600">{conversation.messageCount || 0} pesan</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-neutral-600" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center">
            <MessageSquare className="mx-auto h-6 w-6 text-neutral-700" />
            <p className="mt-3 text-sm text-neutral-500">Belum ada percakapan.</p>
            <Link href="/dashboard/chatbot" className="mt-3 inline-flex text-xs text-white hover:underline">
              Mulai percakapan pertama
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
