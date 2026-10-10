"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRightLeft, Check, Loader2, MessageSquare, RefreshCw, Send, UserRound, X } from "lucide-react";
import { ConversationMessageBody, type ConversationMessageData } from "@/components/conversation-message-body";

interface TransferSkill {
  id: string;
  name: string;
  recipientType: "human" | "bot";
  recipientId: string;
  botId: string | null;
}

interface QueueConversation {
  id: string;
  title: string;
  status: "pending" | "accepted";
  assignedHumanUserId: string | null;
  requester: { name: string; email: string };
  latestMessage: { role: string; content: string; timestamp: string | null } | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface QueueMessage extends ConversationMessageData {
  authorName?: string;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("id-ID");
}

export default function EscalationQueuePage() {
  const [items, setItems] = useState<QueueConversation[]>([]);
  const [selected, setSelected] = useState<QueueConversation | null>(null);
  const [messages, setMessages] = useState<QueueMessage[]>([]);
  const [transferSkills, setTransferSkills] = useState<TransferSkill[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferSkillId, setTransferSkillId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const selectedConversationId = selected?.id || null;

  const refreshQueue = async () => {
    setRefreshing(true);
    setError("");
    try {
      const response = await fetch("/api/escalation-queue");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat queue.");
      const queueItems: QueueConversation[] = data.conversations || [];
      setItems(queueItems);
      setTransferSkills(data.transferSkills || []);
      setSelected((current) => current ? queueItems.find((item) => item.id === current.id) || null : null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat queue.");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const loadConversation = async (item: QueueConversation) => {
    setSelected(item);
    setMessages([]);
    if (item.status !== "accepted") return;
    try {
      const response = await fetch(`/api/conversations/${item.id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memuat percakapan.");
      setMessages(data.conversation.messages || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat percakapan.");
    }
  };

  const refreshSelected = async () => {
    await refreshQueue();
    if (selected?.status === "accepted") await loadConversation(selected);
  };

  useEffect(() => {
    let active = true;
    const syncQueue = async () => {
      try {
        const response = await fetch("/api/escalation-queue");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal memuat queue.");
        if (!active) return;
        const queueItems: QueueConversation[] = data.conversations || [];
        setItems(queueItems);
        setTransferSkills(data.transferSkills || []);
        const selectedItem = selectedConversationId ? queueItems.find((item) => item.id === selectedConversationId) || null : null;
        if (selectedConversationId && !selectedItem) {
          setSelected(null);
          setMessages([]);
          return;
        }
        if (selectedItem) setSelected(selectedItem);
        if (selectedItem?.status === "accepted") {
          const conversationResponse = await fetch(`/api/conversations/${selectedItem.id}`);
          const conversationData = await conversationResponse.json();
          if (!conversationResponse.ok) throw new Error(conversationData.error || "Gagal memuat percakapan.");
          if (active) setMessages(conversationData.conversation.messages || []);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Gagal memuat queue.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void syncQueue();
    const interval = window.setInterval(() => void syncQueue(), 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [selectedConversationId]);

  const acceptConversation = async () => {
    if (!selected) return;
    setAccepting(true);
    setError("");
    try {
      const response = await fetch("/api/escalation-queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selected.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menerima percakapan.");
      const accepted = { ...selected, status: "accepted" as const };
      setSelected(accepted);
      await refreshQueue();
      await loadConversation(accepted);
    } catch (acceptError) {
      setError(acceptError instanceof Error ? acceptError.message : "Gagal menerima percakapan.");
      await refreshQueue();
    } finally {
      setAccepting(false);
    }
  };

  const sendReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected || selected.status !== "accepted" || !draft.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/conversations/${selected.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: draft.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal mengirim balasan.");
      if (data.assistantMessage) setMessages((current) => [...current, data.assistantMessage]);
      setDraft("");
      await refreshQueue();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Gagal mengirim balasan.");
    } finally {
      setSending(false);
    }
  };

  const updateConversationAction = async (action: "close" | "transfer") => {
    if (!selected || (action === "transfer" && !transferSkillId)) return;
    setActionPending(true);
    setError("");
    try {
      const response = await fetch("/api/escalation-queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selected.id, action, ...(action === "transfer" ? { skillId: transferSkillId } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal memperbarui percakapan.");
      setTransferOpen(false);
      setTransferSkillId("");
      setSelected(null);
      setMessages([]);
      await refreshQueue();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Gagal memperbarui percakapan.");
    } finally {
      setActionPending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Human support</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-white"><MessageSquare className="h-6 w-6" />Escalation Queue</h1>
          <p className="mt-1 text-sm text-neutral-500">Percakapan yang dialihkan ke skill Anda.</p>
        </div>
        <button type="button" onClick={() => void refreshSelected()} disabled={refreshing} title="Refresh queue and conversation" aria-label="Refresh queue and conversation" className="rounded-md border border-neutral-800 p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white disabled:opacity-50">
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>
      </header>

      {error && <div role="alert" className="shrink-0 rounded-md border border-red-900/60 bg-red-950/30 px-4 py-3 text-xs text-red-200">{error}</div>}

      <div className="grid min-h-0 flex-1 gap-5 overflow-hidden lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.6fr)]">
        <section className="min-h-0 overflow-y-auto border-y border-neutral-900">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-900 bg-black py-3">
            <h2 className="text-xs font-semibold text-neutral-300">Queue <span className="ml-1 font-mono text-neutral-600">{items.length}</span></h2>
            <span className="text-[10px] text-neutral-600">{items.filter((item) => item.status === "pending").length} pending</span>
          </div>
          {loading ? <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-neutral-500" /></div> : items.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-600">Belum ada percakapan di queue.</div>
          ) : items.map((item) => (
            <button key={item.id} type="button" onClick={() => void loadConversation(item)} className={`w-full border-b border-neutral-900 px-3 py-3 text-left ${selected?.id === item.id ? "bg-neutral-900/70" : "hover:bg-neutral-950"}`}>
              <div className="flex items-center justify-between gap-3"><span className="truncate text-xs font-semibold text-neutral-200">{item.requester.name}</span><span className={`shrink-0 text-[9px] uppercase ${item.status === "pending" ? "text-amber-300" : "text-emerald-300"}`}>{item.status}</span></div>
              <p className="mt-1 truncate text-[10px] text-neutral-500">{item.title}</p>
              <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-neutral-600">{item.latestMessage?.content || "Belum ada pesan"}</p>
              <p className="mt-2 text-[9px] text-neutral-700">{formatDate(item.updatedAt)}</p>
            </button>
          ))}
        </section>

        <section className="flex min-h-0 flex-col border-y border-neutral-900">
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center text-neutral-600"><UserRound className="h-7 w-7" /><p className="mt-3 text-xs">Pilih percakapan dari queue.</p></div>
          ) : (
            <>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-neutral-900 py-3">
                <div className="min-w-0"><h2 className="truncate text-sm font-semibold text-white">{selected.requester.name}</h2><p className="mt-1 truncate text-[10px] text-neutral-500">{selected.title} · {selected.requester.email}</p></div>
                {selected.status === "pending" ? <button type="button" onClick={() => void acceptConversation()} disabled={accepting} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-50">{accepting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Accept</button> : <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] text-emerald-300">Anda menangani percakapan ini</span><button type="button" onClick={() => setTransferOpen(true)} className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 px-2.5 py-2 text-[10px] text-neutral-300 hover:bg-neutral-900"><ArrowRightLeft className="h-3.5 w-3.5" />Transfer</button><button type="button" onClick={() => void updateConversationAction("close")} disabled={actionPending} className="inline-flex items-center gap-1.5 rounded-md border border-red-900/70 px-2.5 py-2 text-[10px] text-red-200 hover:bg-red-950/40 disabled:opacity-50"><X className="h-3.5 w-3.5" />Close conversation</button></div>}
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-4">
                {selected.status === "pending" ? <p className="rounded-md border border-amber-900/40 bg-amber-950/20 p-3 text-xs text-amber-200">Accept percakapan untuk membuka riwayat dan mulai membalas.</p> : messages.map((message) => (
                  <div key={message.id} className={`flex items-start gap-2.5 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.role === "user" ? "bg-neutral-300 text-black" : "bg-white text-black"}`} title={message.role === "user" ? selected.requester.name : message.authorName || "GenAI"}>{message.role === "user" ? <UserRound className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}</span>
                    <div className={`flex min-w-0 max-w-[82%] flex-col gap-1 ${message.role === "user" ? "items-end" : "items-start"}`}><ConversationMessageBody message={message} isUser={message.role === "user"} /></div>
                  </div>
                ))}
              </div>
              {selected.status === "accepted" && <form onSubmit={sendReply} className="flex shrink-0 gap-2 border-t border-neutral-900 py-3">
                <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Tulis balasan sebagai human agent..." className="h-10 min-w-0 flex-1 rounded-md border border-neutral-800 bg-black px-3 text-xs text-white outline-none placeholder:text-neutral-600 focus:border-neutral-600" />
                <button type="submit" disabled={sending || !draft.trim()} aria-label="Kirim balasan" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-black disabled:opacity-40">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
              </form>}
            </>
          )}
        </section>
      </div>
      {transferOpen && selected && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4">
        <section role="dialog" aria-modal="true" aria-labelledby="transfer-title" className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-800 bg-[#0a0a0a] p-5 shadow-2xl">
          <div><h2 id="transfer-title" className="text-sm font-semibold text-white">Transfer conversation</h2><p className="mt-1 text-xs text-neutral-500">Pilih skill human atau bot aktif sebagai tujuan.</p></div>
          <select value={transferSkillId} onChange={(event) => setTransferSkillId(event.target.value)} className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2.5 text-xs text-neutral-200 outline-none focus:border-neutral-600">
            <option value="">Pilih skill tujuan</option>
            {transferSkills.filter((skill) => skill.recipientType === "bot" || skill.recipientId !== selected.assignedHumanUserId).map((skill) => <option key={skill.id} value={skill.id}>{skill.name} · {skill.recipientType === "bot" ? "Bot" : "Human"}</option>)}
          </select>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setTransferOpen(false)} disabled={actionPending} className="rounded-md border border-neutral-800 px-3 py-2 text-xs text-neutral-400 hover:text-white">Batal</button><button type="button" onClick={() => void updateConversationAction("transfer")} disabled={actionPending || !transferSkillId} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-black disabled:opacity-40">{actionPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Transfer</button></div>
        </section>
      </div>}
    </div>
  );
}