"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, ExternalLink, Loader2, Plus, Save, Trash2, MessageCircle, MoreVertical } from "lucide-react";
import Image from "next/image";
import type {
  EngagementEntryPoint,
  EngagementRecord,
  EngagementWindow,
} from "@/types/engagement";
import {
  DEFAULT_ENGAGEMENT_CSS,
  ENGAGEMENT_COMPONENT_STYLES,
  getDefaultComponentStyles,
  migrateLegacyComponentStyles,
  scopeEngagementCss,
} from "@/lib/engagement-theme";

interface SkillOption {
  id: string;
  name: string;
  description: string;
  botUser: { userType: string } | null;
  bot: { isActive: boolean } | null;
  isAvailable: boolean;
}

const DEFAULT_ACCENT = "#171717";
const DEFAULT_BACKGROUND = "#ffffff";
const DEFAULT_LINE = "#e5e5e5";

function normalizeWindow(windowItem: EngagementWindow): EngagementWindow {
  const componentStyles = migrateLegacyComponentStyles({
    ...getDefaultComponentStyles(),
    ...(windowItem.componentStyles || {}),
  });
  return {
    ...windowItem,
    accentColor: windowItem.accentColor?.toLowerCase() === "#2563eb" ? "#171717" : windowItem.accentColor,
    headerIconUrl: windowItem.headerIconUrl || "",
    backgroundColor: !windowItem.backgroundColor || windowItem.backgroundColor.toLowerCase() === "#080808"
      ? DEFAULT_BACKGROUND
      : windowItem.backgroundColor,
    lineColor: !windowItem.lineColor || windowItem.lineColor.toLowerCase() === "#262626"
      ? DEFAULT_LINE
      : windowItem.lineColor,
    borderRadius: typeof windowItem.borderRadius === "number" ? windowItem.borderRadius : 16,
    allowClose: windowItem.allowClose !== false,
    customCss: typeof windowItem.customCss === "string" ? windowItem.customCss : DEFAULT_ENGAGEMENT_CSS,
    componentStyles,
  };
}

type EngagementTab = "general" | "windows" | "embed";

function readCssProperty(css: string, property: string, fallback = ""): string {
  const match = css.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, "i"));
  return match?.[1]?.trim() || fallback;
}

function setCssProperty(css: string, property: string, value: string): string {
  if (!value.trim()) return css;
  const declaration = `${property}: ${value}`;
  const propertyPattern = new RegExp(`(${property}\\s*:\\s*)[^;]+`, "i");
  if (propertyPattern.test(css)) return css.replace(propertyPattern, `$1${value}`);

  const firstBlock = css.indexOf("{");
  if (firstBlock < 0) return css;
  const end = css.indexOf("}", firstBlock);
  if (end < 0) return `${css}\n${declaration};`;
  const declarations = css.slice(firstBlock + 1, end).trim();
  return `${css.slice(0, firstBlock + 1)}\n  ${declarations}${declarations.endsWith(";") ? "" : ";"}\n  ${declaration};\n${css.slice(end)}`;
}

export default function EngagementDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const [engagement, setEngagement] = useState<EngagementRecord | null>(null);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [entryPoints, setEntryPoints] = useState<EngagementEntryPoint[]>([]);
  const [windows, setWindows] = useState<EngagementWindow[]>([]);
  const [entryName, setEntryName] = useState("");
  const [entryOrigin, setEntryOrigin] = useState("");
  const [snippetEntryPointId, setSnippetEntryPointId] = useState("");
  const [snippetWindowId, setSnippetWindowId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<EngagementTab>("general");
  const [openStyleEditor, setOpenStyleEditor] = useState<Record<string, boolean>>({});

  const activeBotSkills = useMemo(
    () => skills.filter((skill) => skill.isAvailable && skill.botUser?.userType === "bot" && skill.bot?.isActive),
    [skills]
  );

  const loadData = useCallback(async () => {
    const [engagementResponse, skillsResponse] = await Promise.all([
      fetch(`/api/engagements/${id}`),
      fetch("/api/skills"),
    ]);
    const [engagementData, skillsData] = await Promise.all([
      engagementResponse.json(),
      skillsResponse.json(),
    ]);
    if (!engagementResponse.ok) throw new Error(engagementData.error || "Gagal memuat Engagement.");
    if (!skillsResponse.ok) throw new Error(skillsData.error || "Gagal memuat daftar skill.");
    const item = engagementData.engagement as EngagementRecord;
    setEngagement(item);
    setName(item.name);
    setIsActive(item.isActive);
    setEntryPoints(item.entryPoints || []);
    setWindows((item.windows || []).map(normalizeWindow));
    setSkills(skillsData.skills || []);
    setSnippetEntryPointId(item.entryPoints?.[0]?.id || "");
    setSnippetWindowId(item.windows?.[0]?.id || "");
  }, [id]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/auth/me").then((response) => response.json()),
      Promise.all([
        fetch(`/api/engagements/${id}`).then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Gagal memuat Engagement.");
          return data;
        }),
        fetch("/api/skills").then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Gagal memuat daftar skill.");
          return data;
        }),
      ]),
    ])
      .then(([meData, [engagementData, skillsData]]) => {
        if (!active) return;
        if (!meData.user || !["admin", "manager"].includes(meData.user.role)) {
          router.replace("/dashboard");
          return;
        }
        const item = engagementData.engagement as EngagementRecord;
        setEngagement(item);
        setName(item.name);
        setIsActive(item.isActive);
        setEntryPoints(item.entryPoints || []);
        setWindows((item.windows || []).map(normalizeWindow));
        setSkills(skillsData.skills || []);
        setSnippetEntryPointId(item.entryPoints?.[0]?.id || "");
        setSnippetWindowId(item.windows?.[0]?.id || "");
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Gagal memuat Engagement.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id, router]);

  const addEntryPoint = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      const url = new URL(entryOrigin.trim());
      if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      const origin = url.origin;
      if (entryPoints.some((entry) => entry.origin === origin)) {
        setError("Website ini sudah terdaftar.");
        return;
      }
      if (entryPoints.length >= 20) {
        setError("Maksimal 20 website per Engagement.");
        return;
      }
      const point = {
        id: crypto.randomUUID(),
        name: entryName.trim() || origin,
        origin,
      };
      setEntryPoints((current) => [...current, point]);
      setSnippetEntryPointId((current) => current || point.id);
      setEntryName("");
      setEntryOrigin("");
    } catch {
      setError("Masukkan alamat website lengkap, misalnya https://contoh.com.");
    }
  };

  const addWindow = () => {
    if (!activeBotSkills.length) {
      setError("Hubungkan skill ke bot yang aktif terlebih dahulu.");
      return;
    }
    if (windows.length >= 20) {
      setError("Maksimal 20 chat window per Engagement.");
      return;
    }
    const nextWindow: EngagementWindow = {
      id: crypto.randomUUID(),
      name: `Chat window ${windows.length + 1}`,
      skillId: activeBotSkills[0].id,
      title: "Ada yang bisa kami bantu?",
      subtitle: "Kami siap membantu Anda.",
      accentColor: DEFAULT_ACCENT,
      headerIconUrl: "",
      backgroundColor: DEFAULT_BACKGROUND,
      lineColor: DEFAULT_LINE,
      borderRadius: 16,
      allowClose: true,
      customCss: DEFAULT_ENGAGEMENT_CSS,
      componentStyles: getDefaultComponentStyles(),
    };
    setWindows((current) => [...current, nextWindow]);
    setSnippetWindowId((current) => current || nextWindow.id);
    setError("");
  };

  const updateWindow = (windowId: string, updates: Partial<EngagementWindow>) => {
    setWindows((current) => current.map((item) => item.id === windowId ? { ...item, ...updates } : item));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/engagements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, isActive, entryPoints, windows }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan Engagement.");
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan Engagement.");
    } finally {
      setSaving(false);
    }
  };

  const selectedEntry = entryPoints.find((item) => item.id === snippetEntryPointId);
  const selectedWindow = windows.find((item) => item.id === snippetWindowId);
  const snippet = selectedEntry && selectedWindow && typeof window !== "undefined"
    ? `<iframe\n  src="${window.location.origin}/engagement/${id}/${selectedWindow.id}?entryPointId=${encodeURIComponent(selectedEntry.id)}"\n  title="Chat widget"\n  width="380"\n  height="620"\n  style="position:fixed;right:24px;bottom:24px;z-index:9999;border:0;border-radius:${selectedWindow.borderRadius}px;box-shadow:0 12px 40px rgba(0,0,0,.3)"\n  referrerpolicy="strict-origin-when-cross-origin"\n  allow="clipboard-write"\n></iframe>`
    : "";

  const copySnippet = async () => {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Kode gagal disalin. Salin kode secara manual.");
    }
  };

  if (loading) {
    return <main className="p-8 text-sm text-neutral-400"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Memuat Engagement...</main>;
  }
  if (!engagement) {
    return <main className="p-8 text-sm text-red-300">{error || "Engagement tidak ditemukan."}</main>;
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-7 p-5 sm:p-8">
      <Link href="/dashboard/engagements" className="inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" />Kembali ke Engagement
      </Link>
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Widget configuration</p>
        <h1 className="mt-1 text-2xl font-bold text-white">{engagement.name}</h1>
        <p className="mt-2 text-sm text-neutral-400">Atur website yang diizinkan, hubungkan tiap window ke skill bot, lalu pasang iframe.</p>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</p>}

      <nav className="sticky top-0 z-20 -mx-1 flex gap-1 rounded-xl border border-neutral-800 bg-neutral-950/95 p-1 backdrop-blur" aria-label="Pengaturan Engagement">
        {([
          ["general", "Umum"],
          ["windows", "Chat windows"],
          ["embed", "Embed"],
        ] as Array<[EngagementTab, string]>).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`h-9 flex-1 rounded-lg px-3 text-xs font-medium transition-colors ${activeTab === tab ? "bg-white text-black" : "text-neutral-400 hover:bg-neutral-900 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="space-y-6">
        <section className={`${activeTab === "general" ? "block" : "hidden"} space-y-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4 sm:p-5`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 space-y-1.5">
              <span className="text-xs font-medium text-neutral-300">Nama Engagement</span>
              <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required className="h-10 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 text-sm text-white outline-none focus:border-neutral-600" />
            </label>
            <label className="flex h-10 items-center gap-2 text-xs text-neutral-300">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} className="h-4 w-4 accent-white" />
              Engagement aktif
            </label>
          </div>
        </section>

        <section className={`${activeTab === "general" ? "block" : "hidden"} space-y-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4 sm:p-5`}>
          <div>
            <h2 className="text-sm font-semibold text-white">Entry point / website yang diizinkan</h2>
            <p className="mt-1 text-xs leading-5 text-neutral-500">Tambahkan origin website tempat kode iframe akan dipasang, misalnya https://contoh.com. Setiap origin hanya boleh didaftarkan satu kali.</p>
          </div>
          <form onSubmit={addEntryPoint} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_auto]">
            <input value={entryName} onChange={(event) => setEntryName(event.target.value)} maxLength={80} placeholder="Nama website (opsional)" aria-label="Nama website" className="h-10 rounded-lg border border-neutral-800 bg-neutral-900 px-3 text-sm text-white outline-none focus:border-neutral-600" />
            <input value={entryOrigin} onChange={(event) => setEntryOrigin(event.target.value)} placeholder="https://contoh.com" aria-label="Origin website" className="h-10 rounded-lg border border-neutral-800 bg-neutral-900 px-3 text-sm text-white outline-none focus:border-neutral-600" />
            <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-700 px-3 text-xs font-medium text-white hover:bg-neutral-900"><Plus className="h-4 w-4" />Tambah</button>
          </form>
          <div className="space-y-2">
            {entryPoints.map((entry) => (
              <div key={entry.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-white">{entry.name}</p>
                  <p className="truncate text-[11px] text-neutral-500">{entry.origin}</p>
                </div>
                <button type="button" onClick={() => setEntryPoints((current) => current.filter((item) => item.id !== entry.id))} aria-label={`Hapus ${entry.origin}`} className="text-neutral-500 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            {!entryPoints.length && <p className="rounded-lg border border-dashed border-neutral-800 p-4 text-center text-xs text-neutral-500">Belum ada website yang diizinkan.</p>}
          </div>
        </section>

        <section className={`${activeTab === "windows" ? "block" : "hidden"} space-y-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4 sm:p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Chat windows</h2>
              <p className="mt-1 text-xs leading-5 text-neutral-500">Setiap window menggunakan skill bot aktif dan dapat memiliki tampilan header sendiri.</p>
            </div>
            <button type="button" onClick={addWindow} className="inline-flex h-9 items-center gap-2 rounded-lg border border-neutral-700 px-3 text-xs font-medium text-white hover:bg-neutral-900"><Plus className="h-4 w-4" />Tambah window</button>
          </div>

          {activeBotSkills.length === 0 && <p className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-3 text-xs text-amber-200">Belum ada skill yang terhubung ke bot aktif. Atur bot pada menu Skills terlebih dahulu.</p>}
          <div className="space-y-3">
            {windows.map((item, index) => (
              <article key={item.id} className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-semibold text-white">Window {index + 1}</h3>
                  <button type="button" onClick={() => setWindows((current) => current.filter((windowItem) => windowItem.id !== item.id))} aria-label={`Hapus ${item.name}`} className="text-neutral-500 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_340px]">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-[11px] text-neutral-400">Nama internal window</span>
                    <input value={item.name} onChange={(event) => updateWindow(item.id, { name: event.target.value })} maxLength={80} required className="h-9 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-xs text-white outline-none focus:border-neutral-600" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] text-neutral-400">Skill bot</span>
                    <select value={item.skillId} onChange={(event) => updateWindow(item.id, { skillId: event.target.value })} required className="h-9 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-xs text-white outline-none focus:border-neutral-600">
                      {activeBotSkills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] text-neutral-400">Judul chat</span>
                    <input value={item.title} onChange={(event) => updateWindow(item.id, { title: event.target.value })} maxLength={80} required className="h-9 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-xs text-white outline-none focus:border-neutral-600" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] text-neutral-400">Subjudul</span>
                    <input value={item.subtitle} onChange={(event) => updateWindow(item.id, { subtitle: event.target.value })} maxLength={160} className="h-9 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-xs text-white outline-none focus:border-neutral-600" />
                  </label>
                  <label className="flex items-center gap-3 text-[11px] text-neutral-400">
                    <span>Warna utama</span>
                    <input type="color" value={item.accentColor} onChange={(event) => updateWindow(item.id, { accentColor: event.target.value })} className="h-8 w-12 cursor-pointer rounded border border-neutral-700 bg-transparent p-0.5" />
                    <span className="font-mono">{item.accentColor}</span>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] text-neutral-400">URL icon header</span>
                    <input value={item.headerIconUrl} onChange={(event) => updateWindow(item.id, { headerIconUrl: event.target.value })} maxLength={2048} placeholder="https://example.com/icon.png" className="h-9 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-xs text-white outline-none placeholder:text-neutral-700 focus:border-neutral-600" />
                  </label>
                  <label className="flex items-center gap-3 text-[11px] text-neutral-400">
                    <span>Background window</span>
                    <input type="color" value={item.backgroundColor} onChange={(event) => updateWindow(item.id, { backgroundColor: event.target.value })} className="h-8 w-12 cursor-pointer rounded border border-neutral-700 bg-transparent p-0.5" />
                    <span className="font-mono">{item.backgroundColor}</span>
                  </label>
                  <label className="flex items-center gap-3 text-[11px] text-neutral-400">
                    <span>Warna garis</span>
                    <input type="color" value={item.lineColor} onChange={(event) => updateWindow(item.id, { lineColor: event.target.value })} className="h-8 w-12 cursor-pointer rounded border border-neutral-700 bg-transparent p-0.5" />
                    <span className="font-mono">{item.lineColor}</span>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] text-neutral-400">Rounded window: {item.borderRadius}px</span>
                    <input type="range" min={0} max={32} value={item.borderRadius} onChange={(event) => updateWindow(item.id, { borderRadius: Number(event.target.value) })} className="h-3 w-full accent-white" />
                  </label>
                  <label className="flex h-9 items-center gap-2 text-[11px] text-neutral-400">
                    <input type="checkbox" checked={item.allowClose} onChange={(event) => updateWindow(item.id, { allowClose: event.target.checked })} className="h-4 w-4 accent-white" />
                    Tampilkan tombol close pada menu titik tiga
                  </label>
                  <div className="md:col-span-2 space-y-3">
                    <div>
                      <h4 className="text-xs font-semibold text-white">Custom CSS per komponen</h4>
                      <p className="mt-1 text-[10px] leading-4 text-neutral-500">
                        Setiap komponen memiliki preview independen, CSS sendiri, dan class yang aman. Struktur, teks, data, dan action bot tidak berubah.
                      </p>
                    </div>
                    <div className="grid gap-3 xl:grid-cols-2">
                      {ENGAGEMENT_COMPONENT_STYLES.map((component) => (
                        <article key={component.id} className="min-w-0 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950">
                          <style dangerouslySetInnerHTML={{ __html: scopeEngagementCss(item.componentStyles[component.id] || component.defaultCss, `.engagement-preview-${item.id}-${component.id}`) }} />
                          <div className="border-b border-neutral-800 px-3 py-2.5">
                            <p className="text-xs font-semibold text-white">{component.name}</p>
                            <p className="mt-0.5 text-[10px] text-neutral-500">{component.description}</p>
                          </div>
                          <div className={`engagement-preview-${item.id}-${component.id} min-h-[108px] bg-[#f8fafc] p-3`}>
                            {component.id === "header" && (
                              <div className="engagement-header flex min-h-[64px] items-center gap-2 rounded-lg px-3 text-white" style={{ backgroundColor: item.accentColor }}>
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20"><MessageCircle className="h-4 w-4" /></span>
                                <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{item.title}</p><p className="engagement-header-subtitle truncate text-[10px] text-white/70">{item.subtitle}</p></div>
                                {item.allowClose && <MoreVertical className="h-4 w-4" />}
                              </div>
                            )}
                            {component.id === "bot-bubble" && <div className="engagement-bot-bubble max-w-[220px] px-3 py-2"><p>Halo! Ada yang bisa kami bantu hari ini?</p></div>}
                            {component.id === "user-bubble" && <div className="ml-auto max-w-[220px]"><div className="engagement-user-bubble px-3 py-2">Saya ingin bertanya.</div></div>}
                            {(component.id === "reply-buttons" || component.id === "link-buttons") && (
                              <div className="flex flex-wrap gap-2">
                                <button type="button" className="engagement-button">Produk</button>
                                <button type="button" className="engagement-button">Bantuan</button>
                              </div>
                            )}
                            {component.id === "card" && (
                              <div className="engagement-card max-w-[240px] overflow-hidden">
                                <div className="h-10 bg-neutral-800" />
                                <div className="p-3"><p className="text-xs font-semibold">Judul kartu</p><p className="mt-1 text-[10px] opacity-70">Deskripsi singkat kartu.</p></div>
                              </div>
                            )}
                            {component.id === "carousel" && (
                              <div className="engagement-component overflow-hidden rounded-lg border border-neutral-700">
                                <div className="h-12 bg-neutral-800" />
                                <div className="flex items-center justify-between p-2"><span className="text-[10px]">‹</span><span className="text-[10px]">1 / 3</span><span className="text-[10px]">›</span></div>
                              </div>
                            )}
                            {component.id === "interaction" && (
                              <div className="engagement-component p-3">
                                <p className="text-xs font-semibold">Pilih kebutuhan Anda</p>
                                <div className="mt-2 flex gap-2"><button type="button" className="engagement-button">Pesan</button><button type="button" className="engagement-button">Informasi</button></div>
                              </div>
                            )}
                            {component.id === "input" && <input readOnly value="" placeholder="Tulis pesan..." className="engagement-input w-full" />}
                            {component.id === "send" && <button type="button" className="engagement-send" aria-label="Preview kirim">↑</button>}
                          </div>
                          <div className="border-t border-neutral-800 p-2">
                            {(() => {
                              const editorKey = `${item.id}:${component.id}`;
                              const css = item.componentStyles[component.id] || component.defaultCss;
                              const setProperty = (property: string, value: string) => updateWindow(item.id, {
                                componentStyles: {
                                  ...item.componentStyles,
                                  [component.id]: setCssProperty(css, property, value),
                                },
                              });
                              return (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <button type="button" onClick={() => setOpenStyleEditor((current) => ({ ...current, [editorKey]: !current[editorKey] }))} className="rounded-md border border-neutral-700 px-2.5 py-1.5 text-[10px] text-neutral-300 hover:bg-neutral-800">
                                      {openStyleEditor[editorKey] ? "Sembunyikan parameter" : "Atur parameter"}
                                    </button>
                                    <button type="button" onClick={() => updateWindow(item.id, { componentStyles: { ...item.componentStyles, [component.id]: component.defaultCss } })} className="text-[9px] text-neutral-500 hover:text-white">Reset</button>
                                  </div>
                                  {openStyleEditor[editorKey] && (
                                    <div className="grid grid-cols-2 gap-2 rounded-md border border-neutral-800 bg-neutral-900 p-2">
                                      <label className="space-y-1 text-[9px] text-neutral-500">Teks
                                        <input type="color" value={readCssProperty(css, "color", "#18181b")} onChange={(event) => setProperty("color", event.target.value)} className="h-7 w-full rounded border border-neutral-700 bg-neutral-950 p-0.5" />
                                      </label>
                                      <label className="space-y-1 text-[9px] text-neutral-500">Background
                                        <input type="color" value={readCssProperty(css, "background", "#ffffff").startsWith("#") ? readCssProperty(css, "background", "#ffffff") : "#ffffff"} onChange={(event) => setProperty("background", event.target.value)} className="h-7 w-full rounded border border-neutral-700 bg-neutral-950 p-0.5" />
                                      </label>
                                      <label className="space-y-1 text-[9px] text-neutral-500">Border
                                        <input type="color" value={readCssProperty(css, "border", "#e5e5e5").match(/#[0-9a-fA-F]{6}/)?.[0] || "#e5e5e5"} onChange={(event) => setProperty("border", `1px solid ${event.target.value}`)} className="h-7 w-full rounded border border-neutral-700 bg-neutral-950 p-0.5" />
                                      </label>
                                      <label className="space-y-1 text-[9px] text-neutral-500">Rounded
                                        <input type="number" min={0} max={32} value={parseInt(readCssProperty(css, "border-radius", "8").replace("px", ""), 10) || 0} onChange={(event) => setProperty("border-radius", `${event.target.value}px`)} className="h-7 w-full rounded border border-neutral-700 bg-neutral-950 px-2 text-[10px] text-white" />
                                      </label>
                                      <label className="space-y-1 text-[9px] text-neutral-500">Font
                                        <input type="number" min={8} max={32} value={parseInt(readCssProperty(css, "font-size", "12").replace("px", ""), 10) || 12} onChange={(event) => setProperty("font-size", `${event.target.value}px`)} className="h-7 w-full rounded border border-neutral-700 bg-neutral-950 px-2 text-[10px] text-white" />
                                      </label>
                                      <label className="space-y-1 text-[9px] text-neutral-500">Lebar baris
                                        <input type="number" step={0.1} min={1} max={3} value={parseFloat(readCssProperty(css, "line-height", "1.6")) || 1.6} onChange={(event) => setProperty("line-height", event.target.value)} className="h-7 w-full rounded border border-neutral-700 bg-neutral-950 px-2 text-[10px] text-white" />
                                      </label>
                                    </div>
                                  )}
                                  <details>
                                    <summary className="cursor-pointer text-[9px] text-neutral-500 hover:text-neutral-300">Tampilkan CSS</summary>
                                    <textarea
                                      value={css}
                                      onChange={(event) => updateWindow(item.id, { componentStyles: { ...item.componentStyles, [component.id]: event.target.value.slice(0, 10000) } })}
                                      spellCheck={false}
                                      rows={7}
                                      aria-label={`CSS ${component.name}`}
                                      className="mt-2 w-full resize-y rounded-md border border-neutral-800 bg-black px-2.5 py-2 font-mono text-[9px] leading-4 text-neutral-300 outline-none focus:border-neutral-600"
                                    />
                                  </details>
                                </div>
                              );
                            })()}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-neutral-800 bg-[#141414] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">Preview chat window</span>
                    <span className="text-[10px] text-neutral-600">380 × 620</span>
                  </div>
                  <style dangerouslySetInnerHTML={{ __html: scopeEngagementCss(
                    Object.values(item.componentStyles).join("\n"),
                    `.engagement-preview-window-${item.id}`
                  ) }} />
                  <div className={`engagement-preview-window-${item.id} engagement-widget mx-auto w-[280px] overflow-hidden shadow-2xl`} style={{ height: "390px", borderRadius: `${item.borderRadius}px`, backgroundColor: item.backgroundColor, border: `1px solid ${item.lineColor}` }}>
                    <div className="engagement-header flex h-[58px] items-center gap-2 px-3 text-white" style={{ backgroundColor: item.accentColor }}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/20">
                        {item.headerIconUrl ? <Image src={item.headerIconUrl} alt="" width={32} height={32} unoptimized className="h-8 w-8 object-cover" /> : <MessageCircle className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold">{item.title || "Judul chat"}</p>
                        <p className="engagement-header-subtitle truncate text-[9px] text-white/70">{item.subtitle || "Subjudul chat"}</p>
                      </div>
                      {item.allowClose && <MoreVertical className="h-4 w-4 shrink-0 text-white/80" />}
                    </div>
                    <div className="h-[282px] space-y-3 px-3 py-3" style={{ borderColor: item.lineColor }}>
                      <div className="engagement-bot-bubble max-w-[210px] rounded-2xl rounded-tl-sm border px-3 py-2 text-[9px] leading-4 text-zinc-900" style={{ borderColor: item.lineColor, backgroundColor: "#f4f4f5" }}>
                        Halo! Ada yang bisa kami bantu hari ini?
                      </div>
                      <div className="engagement-user-bubble ml-auto max-w-[180px] rounded-2xl rounded-tr-sm bg-zinc-900 px-3 py-2 text-[9px] leading-4 text-white">
                        Saya ingin bertanya.
                      </div>
                      <div className="engagement-card max-w-[210px] rounded-2xl rounded-tl-sm border px-3 py-2" style={{ borderColor: item.lineColor, backgroundColor: "#ffffff" }}>
                        <p className="text-[9px] leading-4 text-zinc-900">Silakan pilih kebutuhan Anda.</p>
                        <div className="mt-2 flex gap-1.5">
                          <span className="engagement-button rounded-md border px-2 py-1 text-[8px] text-neutral-300" style={{ borderColor: item.lineColor }}>Produk</span>
                          <span className="engagement-button rounded-md border px-2 py-1 text-[8px] text-neutral-300" style={{ borderColor: item.lineColor }}>Bantuan</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex h-[49px] items-center gap-2 border-t px-2" style={{ borderColor: item.lineColor, backgroundColor: "#0d0d0d" }}>
                      <div className="h-8 flex-1 rounded-lg border px-2 py-2 text-[8px] text-neutral-600" style={{ borderColor: item.lineColor }}>Tulis pesan...</div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ backgroundColor: item.accentColor }}>↑</div>
                    </div>
                  </div>
                </div>
                </div>
              </article>
            ))}
            {!windows.length && <p className="rounded-lg border border-dashed border-neutral-800 p-4 text-center text-xs text-neutral-500">Belum ada chat window.</p>}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">Simpan konfigurasi sebelum menyalin kode embed.</p>
          <button type="button" onClick={() => void save()} disabled={saving || !name.trim()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-xs font-semibold text-black hover:bg-neutral-200 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Simpan perubahan
          </button>
        </div>
      </div>

      <section className={`${activeTab === "embed" ? "block" : "hidden"} space-y-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4 sm:p-5`}>
        <div>
          <h2 className="text-sm font-semibold text-white">Pasang di website</h2>
          <p className="mt-1 text-xs leading-5 text-neutral-500">Simpan Engagement, pilih entry point dan window, lalu tempel iframe di HTML website pada origin yang sama.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-[11px] text-neutral-400">Entry point</span>
            <select value={snippetEntryPointId} onChange={(event) => setSnippetEntryPointId(event.target.value)} className="h-10 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 text-xs text-white outline-none">
              <option value="">Pilih website</option>
              {entryPoints.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} — {entry.origin}</option>)}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-[11px] text-neutral-400">Chat window</span>
            <select value={snippetWindowId} onChange={(event) => setSnippetWindowId(event.target.value)} className="h-10 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 text-xs text-white outline-none">
              <option value="">Pilih window</option>
              {windows.map((item) => <option key={item.id} value={item.id}>{item.name} — {item.title}</option>)}
            </select>
          </label>
        </div>
        <div className="relative">
          <pre className="overflow-x-auto rounded-lg border border-neutral-800 bg-black p-4 pr-28 text-[11px] leading-5 text-neutral-300">{snippet || "Pilih entry point dan chat window untuk membuat kode embed."}</pre>
          <button type="button" onClick={() => void copySnippet()} disabled={!snippet} className="absolute right-2 top-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-700 bg-neutral-900 px-2.5 text-[11px] font-medium text-white hover:bg-neutral-800 disabled:opacity-40">
            <Copy className="h-3.5 w-3.5" />{copied ? "Tersalin" : "Salin"}
          </button>
        </div>
        <p className="flex items-start gap-2 text-[11px] leading-5 text-neutral-500">
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Kode ini menampilkan jendela chat tetap di kanan bawah. Pastikan Engagement aktif dan website telah terdaftar di entry point.
        </p>
      </section>
    </main>
  );
}
