"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ActionToast, ConfirmDialog } from "@/components/action-feedback";
import { useRouter } from "next/navigation";
import { AlertCircle, Copy, GitBranch, Loader2, Pencil, Plus, Sparkles, Trash2, UserRound, X } from "lucide-react";

interface SkillUserOption {
  id: string;
  name: string;
  fullName: string;
  email: string;
  userType: "human" | "bot";
}

interface SkillBotOption {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface SkillItem {
  id: string;
  name: string;
  description: string;
  botUserId: string;
  botId: string;
  botUser: SkillUserOption | null;
  bot: SkillBotOption | null;
  isAvailable: boolean;
  updatedAt: string | null;
}

export default function SkillsPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [users, setUsers] = useState<SkillUserOption[]>([]);
  const [bots, setBots] = useState<SkillBotOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SkillItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SkillItem | null>(null);
  const [form, setForm] = useState({ name: "", description: "", botUserId: "", botId: "", attachBot: false });
  const activeBots = bots.filter((bot) => bot.isActive);
  const selectableUsers = form.attachBot ? users.filter((user) => user.userType === "bot") : users;

  useEffect(() => {
    let current = true;
    Promise.all([
      fetch("/api/auth/me").then((response) => response.json()),
      fetch("/api/skills").then((response) => response.ok ? response.json() : Promise.reject(new Error("Gagal memuat skills."))),
      fetch("/api/users").then((response) => response.ok ? response.json() : Promise.reject(new Error("Gagal memuat users."))),
      fetch("/api/bots").then((response) => response.ok ? response.json() : Promise.reject(new Error("Gagal memuat bots."))),
    ]).then(([meData, skillData, userData, botData]) => {
      if (!current) return;
      if (!meData.user || !["admin", "manager"].includes(meData.user.role)) {
        router.replace("/dashboard");
        return;
      }
      setSkills(skillData.skills || []);
      setUsers(userData.users || []);
      setBots((botData.bots || []).map((bot: SkillBotOption & { _id?: string }) => ({ ...bot, id: bot.id || bot._id })));
    }).catch((loadError: unknown) => {
      if (current) setError(loadError instanceof Error ? loadError.message : "Gagal memuat skills.");
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => { current = false; };
  }, [router]);

  const refreshSkills = async () => {
    const response = await fetch("/api/skills");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Gagal memuat skills.");
    setSkills(data.skills || []);
  };

  const openCreate = () => {
    setEditing(null);
    const firstUser = users[0]?.id || "";
    setForm({ name: "", description: "", botUserId: firstUser, botId: activeBots[0]?.id || "", attachBot: false });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (skill: SkillItem) => {
    setEditing(skill);
    setForm({
      name: skill.name,
      description: skill.description,
      botUserId: skill.botUserId,
      botId: skill.botId,
      attachBot: Boolean(skill.botId && skill.botUserId),
    });
    setError("");
    setModalOpen(true);
  };

  const saveSkill = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        botUserId: form.botUserId,
        botId: form.attachBot ? form.botId : "",
      };
      const response = await fetch(editing ? `/api/skills/${editing.id}` : "/api/skills", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan skill.");
      await refreshSkills();
      setModalOpen(false);
      setNotice({ type: "success", message: editing ? "Skill berhasil diperbarui." : "Skill berhasil dibuat." });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan skill.");
    } finally {
      setSaving(false);
    }
  };

  const duplicateSkill = async (skill: SkillItem) => {
    try {
      const response = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateFromId: skill.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menduplikasi skill.");
      await refreshSkills();
      setNotice({ type: "success", message: `Skill "${skill.name}" berhasil diduplikat${data.name ? ` sebagai "${data.name}"` : ""}.` });
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Gagal menduplikasi skill." });
    }
  };

  const deleteSkill = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/skills/${pendingDelete.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus skill.");
      setSkills((items) => items.filter((item) => item.id !== pendingDelete.id));
      setNotice({ type: "success", message: `Skill "${pendingDelete.name}" berhasil dihapus.` });
      setPendingDelete(null);
    } catch (deleteError) {
      setNotice({ type: "error", message: deleteError instanceof Error ? deleteError.message : "Gagal menghapus skill." });
    } finally {
      setDeleting(false);
    }
  };

  const deleteAllSkills = async () => {
    setDeletingAll(true);
    try {
      const response = await fetch("/api/skills", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menghapus semua skill.");
      setSkills([]);
      setBulkDeleteOpen(false);
      setNotice({ type: "success", message: `${data.deletedCount} skill berhasil dihapus.` });
    } catch (deleteError) {
      setNotice({ type: "error", message: deleteError instanceof Error ? deleteError.message : "Gagal menghapus semua skill." });
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <ActionToast type={notice?.type || "success"} message={notice?.message || ""} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Hapus skill?"
        message={pendingDelete ? `Skill "${pendingDelete.name}" akan dihapus. Percakapan yang sudah ada tetap tersimpan.` : ""}
        pending={deleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void deleteSkill()}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Hapus semua skill?"
        message={`Sebanyak ${skills.length} skill akan dihapus. Percakapan yang sudah ada tetap tersimpan.`}
        confirmLabel="Hapus semua"
        pending={deletingAll}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={() => void deleteAllSkills()}
      />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Bot identity</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-white"><Sparkles className="h-6 w-6" />Skills</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">Hubungkan skill ke user human untuk menerima escalation, atau ke user bot dan bot flow untuk percakapan otomatis.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setBulkDeleteOpen(true)} disabled={loading || skills.length === 0 || deletingAll} className="inline-flex items-center gap-2 rounded-lg border border-red-900/70 px-3.5 py-2.5 text-xs font-medium text-red-200 hover:bg-red-950/40 disabled:opacity-40"><Trash2 className="h-4 w-4" />Hapus semua ({skills.length})</button>
          <button type="button" onClick={openCreate} disabled={loading || !users.length} className="inline-flex w-fit items-center gap-2 rounded-lg bg-white px-3.5 py-2.5 text-xs font-semibold text-black transition-colors hover:bg-neutral-200 disabled:opacity-40"><Plus className="h-4 w-4" />Buat skill</button>
        </div>
      </header>

      {error && !modalOpen && <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3 text-xs text-red-200"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

      {!loading && !users.length && <div className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-[#080808] px-4 py-3 text-xs text-neutral-400 sm:flex-row sm:items-center">
        <span>Tambahkan user terlebih dahulu untuk membuat skill.</span>
        <Link href="/dashboard/users" className="text-neutral-200 underline">Buka Users</Link>
      </div>}

      <section className="overflow-hidden rounded-xl border border-neutral-800 bg-[#080808]">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(130px,0.8fr)_minmax(150px,1fr)_auto] gap-4 border-b border-neutral-800 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-600 max-sm:grid-cols-[minmax(0,1fr)_auto]">
          <span>Skill</span><span className="max-sm:hidden">User terhubung</span><span className="max-sm:hidden">Bot flow</span><span className="text-right">Aksi</span>
        </div>
        {loading ? <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-neutral-500" /></div> : skills.length === 0 ? (
          <div className="px-5 py-16 text-center"><Sparkles className="mx-auto h-8 w-8 text-neutral-700" /><p className="mt-3 text-sm font-medium text-neutral-300">Belum ada skill</p><p className="mt-1 text-xs text-neutral-600">Buat skill untuk menghubungkan user bot dan bot flow.</p></div>
        ) : skills.map((skill) => (
          <article key={skill.id} className="grid grid-cols-[minmax(0,1fr)_minmax(130px,0.8fr)_minmax(150px,1fr)_auto] items-center gap-4 border-b border-neutral-900 px-4 py-4 last:border-0 max-sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0"><p className="truncate text-sm font-semibold text-neutral-200">{skill.name}</p><p className="mt-1 truncate text-xs text-neutral-600">{skill.description || "Tanpa deskripsi"}</p><span className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] ${skill.isAvailable ? "border-emerald-900/70 bg-emerald-950/30 text-emerald-300" : "border-amber-900/70 bg-amber-950/30 text-amber-300"}`}>{skill.isAvailable ? "Siap digunakan" : "Relasi perlu diperbaiki"}</span></div>
            <div className="hidden min-w-0 items-center gap-2 text-xs text-neutral-400 sm:flex"><UserRound className="h-4 w-4 shrink-0 text-neutral-600" /><span className="truncate">{skill.botUser?.fullName || skill.botUser?.name || "User tidak ditemukan"} · {skill.botUser?.userType || "-"}</span></div>
            <div className="hidden min-w-0 items-center gap-2 text-xs text-neutral-400 sm:flex"><GitBranch className="h-4 w-4 shrink-0 text-neutral-600" /><span className="truncate">{skill.bot?.name || "Tidak terhubung"}</span></div>
            <div className="flex items-center justify-end gap-1"><button type="button" onClick={() => void duplicateSkill(skill)} aria-label={`Duplikat skill ${skill.name}`} title="Duplikat skill" className="rounded-md p-2 text-neutral-500 hover:bg-neutral-900 hover:text-white"><Copy className="h-4 w-4" /></button><button type="button" onClick={() => openEdit(skill)} aria-label={`Edit nama dan relasi skill ${skill.name}`} title="Edit nama, user, dan bot terkait" className="rounded-md p-2 text-neutral-500 hover:bg-neutral-900 hover:text-white"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => setPendingDelete(skill)} aria-label={`Hapus skill ${skill.name}`} title="Hapus skill" className="rounded-md p-2 text-neutral-600 hover:bg-red-950/50 hover:text-red-300"><Trash2 className="h-4 w-4" /></button></div>
          </article>
        ))}
      </section>

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm">
        <form onSubmit={saveSkill} className="my-8 w-full max-w-lg space-y-4 rounded-xl border border-neutral-800 bg-[#0a0a0a] p-5 shadow-2xl">
          <div className="flex items-start justify-between"><div><h2 className="text-base font-semibold text-white">{editing ? "Edit skill" : "Buat skill"}</h2><p className="mt-1 text-xs text-neutral-500">{editing ? "Ubah nama skill, user human/bot, atau bot flow." : "Skill human menerima escalation; skill bot dapat dihubungkan dengan bot flow."}</p></div><button type="button" onClick={() => setModalOpen(false)} aria-label="Tutup" className="rounded p-1 text-neutral-500 hover:text-white"><X className="h-4 w-4" /></button></div>
          {error && <div role="alert" className="flex items-center gap-2 rounded-md border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-200"><AlertCircle className="h-4 w-4" />{error}</div>}
          <label className="block space-y-1.5 text-xs text-neutral-400">Nama skill<input required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Contoh: Asisten Rendra" className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-neutral-600" /></label>
          <label className="block space-y-1.5 text-xs text-neutral-400">Deskripsi<textarea maxLength={500} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Tujuan skill ini" className="w-full resize-y rounded-md border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-neutral-600" /></label>
          <label className="flex items-center gap-2 text-xs text-neutral-400">
            <input type="checkbox" checked={form.attachBot} onChange={(event) => {
              const attachBot = event.target.checked;
              setForm({ ...form, attachBot, botId: attachBot ? form.botId || activeBots[0]?.id || "" : "" });
              if (attachBot && form.botUserId && !users.find((user) => user.id === form.botUserId && user.userType === "bot")) {
                setForm((current) => ({ ...current, botUserId: users.find((user) => user.userType === "bot")?.id || "" }));
              }
            }} className="accent-white" />
            Hubungkan ke bot flow
          </label>
          <label className="block space-y-1.5 text-xs text-neutral-400">User<select required value={form.botUserId} onChange={(event) => setForm({ ...form, botUserId: event.target.value })} className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-neutral-600"><option value="">Pilih user</option>{selectableUsers.map((user) => <option key={user.id} value={user.id}>{user.fullName || user.name} · {user.email} · {user.userType}</option>)}</select></label>
          {form.attachBot && <label className="block space-y-1.5 text-xs text-neutral-400">Bot flow aktif<select required value={form.botId} onChange={(event) => setForm({ ...form, botId: event.target.value })} className="w-full rounded-md border border-neutral-800 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-neutral-600"><option value="">Pilih bot aktif</option>{activeBots.map((bot) => <option key={bot.id} value={bot.id}>{bot.name}</option>)}</select></label>}
          <div className="flex justify-end gap-2 border-t border-neutral-900 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="rounded-md border border-neutral-800 px-3 py-2 text-xs text-neutral-400 hover:text-white">Batal</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-white px-3.5 py-2 text-xs font-semibold text-black disabled:opacity-40">{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{editing ? "Simpan perubahan" : "Buat skill"}</button></div>
        </form>
      </div>}
    </div>
  );
}