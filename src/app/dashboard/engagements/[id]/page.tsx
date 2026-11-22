"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowUp, Bot, ChevronLeft, ChevronRight, Copy, ExternalLink, Loader2, Plus, Save, Trash2, MessageCircle, MoreVertical } from "lucide-react";
import Image from "next/image";
import { getImageProxyUrl } from "@/lib/image-proxy-url";
import GlobalChatStyleEditor from "@/components/global-chat-style-editor";
import {
  CHAT_WINDOW_ANIMATION_DESCRIPTIONS,
  CHAT_SCROLL_ANIMATION_STYLES,
  isChatScrollAnimationStyle,
} from "@/lib/chat-ui-preferences";
import {
  ENGAGEMENT_WINDOW_POSITIONS,
  type EngagementEntryPoint,
  type EngagementRecord,
  type EngagementWindow,
  type EngagementWindowPosition,
} from "@/types/engagement";
import {
  DEFAULT_ENGAGEMENT_CSS,
  ENGAGEMENT_GLOBAL_STYLE_COMPONENT_IDS,
  getDefaultComponentStyles,
  getDefaultGlobalChatStyles,
  normalizeGlobalChatStyles,
  readEngagementStyleProperty,
  resolveEngagementComponentStyles,
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
const ENGAGEMENT_POSITION_LABELS: Record<EngagementWindowPosition, string> = {
  "bottom-right": "Kanan bawah",
  "bottom-left": "Kiri bawah",
  "top-right": "Kanan atas",
  "top-left": "Kiri atas",
};

function normalizeWindow(
  windowItem: EngagementWindow,
  globalStyles: Record<string, string>
): EngagementWindow {
  const componentStylesMode = windowItem.componentStylesMode === "specific" ? "specific" : "global";
  return {
    ...windowItem,
    accentColor: windowItem.accentColor?.toLowerCase() === "#2563eb" ? "#171717" : windowItem.accentColor,
    headerIconUrl: windowItem.headerIconUrl || "",
    sendIconUrl: windowItem.sendIconUrl || "",
    backgroundColor: !windowItem.backgroundColor || windowItem.backgroundColor.toLowerCase() === "#080808"
      ? DEFAULT_BACKGROUND
      : windowItem.backgroundColor,
    lineColor: !windowItem.lineColor || windowItem.lineColor.toLowerCase() === "#262626"
      ? DEFAULT_LINE
      : windowItem.lineColor,
    borderRadius: typeof windowItem.borderRadius === "number" ? windowItem.borderRadius : 16,
    launcherPosition: ENGAGEMENT_WINDOW_POSITIONS.includes(windowItem.launcherPosition)
      ? windowItem.launcherPosition
      : "bottom-right",
    launcherOffsetX: typeof windowItem.launcherOffsetX === "number" && Number.isFinite(windowItem.launcherOffsetX)
      ? Math.min(1000, Math.max(0, Math.round(windowItem.launcherOffsetX)))
      : 8,
    launcherOffsetY: typeof windowItem.launcherOffsetY === "number" && Number.isFinite(windowItem.launcherOffsetY)
      ? Math.min(1000, Math.max(0, Math.round(windowItem.launcherOffsetY)))
      : 8,
    allowClose: windowItem.allowClose !== false,
    windowAnimationStyle: isChatScrollAnimationStyle(windowItem.windowAnimationStyle)
      ? windowItem.windowAnimationStyle
      : "pop",
    bubbleAnimationEnabled: windowItem.bubbleAnimationEnabled === true,
    bubbleAnimationStyle: isChatScrollAnimationStyle(windowItem.bubbleAnimationStyle)
      ? windowItem.bubbleAnimationStyle
      : "fade",
    customCss: typeof windowItem.customCss === "string" ? windowItem.customCss : DEFAULT_ENGAGEMENT_CSS,
    componentStylesMode,
    componentStyles: resolveEngagementComponentStyles(
      windowItem.componentStyles,
      globalStyles,
      componentStylesMode
    ),
  };
}

type EngagementTab = "general" | "windows" | "embed";

function EngagementComponentPreview({
  item,
  componentId,
}: {
  item: EngagementWindow;
  componentId: string;
}) {
  switch (componentId) {
    case "launcher":
      return (
        <button
          type="button"
          aria-label="Preview icon chat"
          className="engagement-launcher flex h-[72px] w-[72px] items-center justify-center rounded-full text-white shadow-xl"
        >
          <MessageCircle className="h-7 w-7" />
        </button>
      );
    case "header":
      return (
        <header className="engagement-header relative flex shrink-0 items-center gap-3 border-b px-4 py-4">
          <span className="engagement-header-icon flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
            {item.headerIconUrl
              ? <Image src={getImageProxyUrl(item.headerIconUrl)} alt="" width={36} height={36} unoptimized className="h-9 w-9 rounded-full object-cover" />
              : <MessageCircle className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="engagement-header-title truncate font-semibold">{item.title || "Judul chat"}</h1>
            <p className="engagement-header-subtitle mt-0.5 truncate">{item.subtitle || "Subjudul chat"}</p>
          </div>
          <button type="button" aria-label="Opsi percakapan" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/80">
            <MoreVertical className="h-4 w-4" />
          </button>
        </header>
      );
    case "bot-bubble":
      return (
        <div className="engagement-bot-bubble w-fit min-w-0 max-w-full break-words rounded-2xl rounded-tl-sm border border-neutral-800 bg-[#111111] px-4 py-3 text-sm leading-relaxed text-neutral-300 shadow-md">
          Halo! Ada yang bisa kami bantu hari ini?
        </div>
      );
    case "user-bubble":
      return (
        <div className="flex min-w-0 flex-col items-end gap-1">
          <div className="engagement-user-bubble w-fit min-w-0 max-w-full break-words rounded-2xl rounded-tr-sm bg-white px-4 py-3 text-sm leading-relaxed font-medium text-black shadow-lg">
            Saya ingin bertanya.
          </div>
        </div>
      );
    case "reply-buttons":
      return (
        <div className="engagement-button-list flex flex-wrap gap-2">
          {["Produk", "Bantuan"].map((label) => (
            <button key={label} type="button" className="engagement-button engagement-reply-button rounded-lg border px-3 py-2 text-xs transition-colors hover:brightness-95">
              {label}
            </button>
          ))}
        </div>
      );
    case "link-buttons":
      return (
        <article className="engagement-link-card w-full max-w-[320px]">
          <h3 className="engagement-link-title font-semibold">Informasi layanan</h3>
          <p className="engagement-link-subtitle mt-1 whitespace-pre-wrap leading-5">Pelajari layanan dan temukan jawaban lebih lanjut.</p>
          <div className="mt-3">
            <div className="engagement-button-list flex flex-wrap gap-2">
              <a href="#" onClick={(event) => event.preventDefault()} className="engagement-button engagement-link-button inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs">
                Buka halaman <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </article>
      );
    case "card":
      return (
        <div className="w-full max-w-[260px]">
          <article className="engagement-card engagement-content-card w-full min-w-0 overflow-hidden rounded-xl border">
            <Image src="/engagement-preview-card.svg" alt="Gambar contoh kartu" width={520} height={128} unoptimized className="engagement-card-image w-full object-cover" />
            <div className="space-y-2.5 p-3">
              <div>
                <h3 className="engagement-card-title font-semibold">Paket layanan</h3>
                <p className="engagement-card-subtitle mt-1 whitespace-pre-wrap leading-5">Deskripsi singkat kartu ditampilkan di sini.</p>
              </div>
              <div className="engagement-button-list flex flex-wrap gap-2">
                <button type="button" className="engagement-button engagement-reply-button rounded-lg border px-3 py-2 text-xs transition-colors hover:brightness-95">Pilih paket</button>
              </div>
            </div>
          </article>
        </div>
      );
    case "carousel":
      return (
        <div className="engagement-carousel w-full max-w-[260px]">
          <div className="overflow-hidden">
            <div className="flex transition-transform duration-500 ease-out motion-reduce:transition-none">
              <div className="w-full shrink-0">
                <EngagementComponentPreview item={item} componentId="card" />
              </div>
            </div>
          </div>
          <div className="engagement-carousel-controls mt-2 flex items-center justify-between px-1">
            <button type="button" aria-label="Card sebelumnya" className="engagement-carousel-button p-1.5 transition-colors hover:brightness-95"><ChevronLeft className="h-4 w-4" /></button>
            <span className="engagement-carousel-position tabular-nums">1 / 3</span>
            <button type="button" aria-label="Card berikutnya" className="engagement-carousel-button p-1.5 transition-colors hover:brightness-95"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      );
    case "interaction":
      return (
        <article className="engagement-component engagement-interaction-card w-full min-w-0 max-w-full overflow-hidden rounded-xl border p-3.5 sm:max-w-[360px]">
          <h3 className="engagement-interaction-title mb-2 font-semibold">Pilih kebutuhan Anda</h3>
          <p className="engagement-interaction-subtitle whitespace-pre-wrap leading-5">Pilih salah satu opsi berikut.</p>
          <div className="mt-3">
            <EngagementComponentPreview item={item} componentId="reply-buttons" />
          </div>
        </article>
      );
    case "welcome-message":
      return (
        <article className="engagement-component engagement-welcome-message w-full min-w-0 max-w-full overflow-hidden rounded-xl border p-3.5 sm:max-w-[360px]">
          <div className="mb-2 flex items-center gap-2">
            <span className="engagement-welcome-icon flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md">
              <Bot className="h-4 w-4" />
            </span>
            <h3 className="engagement-welcome-title font-semibold">Selamat datang!</h3>
          </div>
          <p className="engagement-welcome-subtitle whitespace-pre-wrap leading-5">Ada yang bisa kami bantu hari ini?</p>
          <div className="mt-3">
            <EngagementComponentPreview item={item} componentId="reply-buttons" />
          </div>
        </article>
      );
    case "scrollbar":
      return (
        <div className="engagement-message-list h-[82px] overflow-y-scroll rounded-md border border-neutral-300 bg-white p-2 text-[10px] text-neutral-700">
          {["Halo, selamat datang.", "Bagaimana saya bisa membantu?", "Pilih topik yang ingin ditanyakan.", "Anda juga dapat berbicara dengan tim kami.", "Kami siap membantu kapan saja."].map((text) => <p key={text} className="mb-2">{text}</p>)}
        </div>
      );
    case "input":
      return (
        <div className="engagement-composer flex w-full items-center gap-2 p-3">
          <input
            readOnly
            value=""
            placeholder="Tulis pesan..."
            className="engagement-input h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#151515] px-3 text-sm text-white placeholder:text-neutral-500"
          />
          <button type="button" className="engagement-send flex h-11 w-11 shrink-0 items-center justify-center" aria-label="Preview kirim">
            {item.sendIconUrl
              ? <Image src={getImageProxyUrl(item.sendIconUrl)} alt="" width={20} height={20} unoptimized className="engagement-send-icon" />
              : <ArrowUp className="engagement-send-glyph" />}
          </button>
        </div>
      );
    case "send":
      return (
        <button type="button" className="engagement-send flex h-11 w-11 shrink-0 items-center justify-center" aria-label="Preview kirim">
          {item.sendIconUrl
            ? <Image src={getImageProxyUrl(item.sendIconUrl)} alt="" width={20} height={20} unoptimized className="engagement-send-icon" />
            : <ArrowUp className="engagement-send-glyph" />}
        </button>
      );
    default:
      return null;
  }
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
  const [globalComponentStyles, setGlobalComponentStyles] = useState<Record<string, string>>(getDefaultGlobalChatStyles);
  const [entryName, setEntryName] = useState("");
  const [entryOrigin, setEntryOrigin] = useState("");
  const [snippetEntryPointId, setSnippetEntryPointId] = useState("");
  const [snippetWindowId, setSnippetWindowId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<EngagementTab>("general");

  const activeBotSkills = useMemo(
    () => skills.filter((skill) => skill.isAvailable && skill.botUser?.userType === "bot" && skill.bot?.isActive),
    [skills]
  );

  const loadData = useCallback(async () => {
    const [engagementResponse, skillsResponse, stylesResponse] = await Promise.all([
      fetch(`/api/engagements/${id}`),
      fetch("/api/skills"),
      fetch("/api/chat-styles"),
    ]);
    const [engagementData, skillsData, styleData] = await Promise.all([
      engagementResponse.json(),
      skillsResponse.json(),
      stylesResponse.json(),
    ]);
    if (!engagementResponse.ok) throw new Error(engagementData.error || "Gagal memuat Engagement.");
    if (!skillsResponse.ok) throw new Error(skillsData.error || "Gagal memuat daftar skill.");
    if (!stylesResponse.ok) throw new Error(styleData.error || "Gagal memuat style global.");
    const item = engagementData.engagement as EngagementRecord;
    const globalStyles = normalizeGlobalChatStyles(styleData.componentStyles);
    setEngagement(item);
    setName(item.name);
    setIsActive(item.isActive);
    setEntryPoints(item.entryPoints || []);
    setWindows((item.windows || []).map((windowItem) => normalizeWindow(windowItem, globalStyles)));
    setGlobalComponentStyles(globalStyles);
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
        fetch("/api/chat-styles").then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Gagal memuat style global.");
          return data;
        }),
      ]),
    ])
      .then(([meData, [engagementData, skillsData, styleData]]) => {
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
        const globalStyles = normalizeGlobalChatStyles(styleData.componentStyles);
        setWindows((item.windows || []).map((windowItem) => normalizeWindow(windowItem, globalStyles)));
        setSkills(skillsData.skills || []);
        setGlobalComponentStyles(globalStyles);
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
    const defaultComponentStyles = getDefaultComponentStyles();
    const nextWindow: EngagementWindow = {
      id: crypto.randomUUID(),
      name: `Chat window ${windows.length + 1}`,
      skillId: activeBotSkills[0].id,
      title: "Ada yang bisa kami bantu?",
      subtitle: "Kami siap membantu Anda.",
      accentColor: DEFAULT_ACCENT,
      headerIconUrl: "",
      sendIconUrl: "",
      backgroundColor: DEFAULT_BACKGROUND,
      lineColor: DEFAULT_LINE,
      borderRadius: 16,
      launcherPosition: "bottom-right",
      launcherOffsetX: 8,
      launcherOffsetY: 8,
      allowClose: true,
      windowAnimationStyle: "pop",
      bubbleAnimationEnabled: false,
      bubbleAnimationStyle: "fade",
      customCss: DEFAULT_ENGAGEMENT_CSS,
      componentStylesMode: "specific",
      componentStyles: {
        ...defaultComponentStyles,
        ...Object.fromEntries(
          ENGAGEMENT_GLOBAL_STYLE_COMPONENT_IDS.map((styleId) => [
            styleId,
            globalComponentStyles[styleId] || defaultComponentStyles[styleId],
          ])
        ),
      },
    };
    setWindows((current) => [...current, nextWindow]);
    setSnippetWindowId((current) => current || nextWindow.id);
    setError("");
  };

  const updateWindow = (windowId: string, updates: Partial<EngagementWindow>) => {
    const nextUpdates = updates.componentStyles
      ? { ...updates, componentStylesMode: "specific" as const }
      : updates;
    setWindows((current) => current.map((item) => item.id === windowId ? { ...item, ...nextUpdates } : item));
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
  const snippetFrameId = selectedWindow
    ? `engagement-chat-${id}-${selectedWindow.id}`.replace(/[^a-zA-Z0-9_-]/g, "")
    : "";
  const getLauncherFrameDimension = (property: "width" | "height") => {
    const value = readEngagementStyleProperty(
      selectedWindow?.componentStyles.launcher || "",
      ".engagement-launcher",
      property,
      "72px"
    );
    const pixelValue = /^(\d+(?:\.\d+)?)px$/i.exec(value.trim());
    if (!pixelValue) return 72;
    const dimension = Number(pixelValue[1]);
    return Number.isFinite(dimension) ? Math.max(0, Math.ceil(dimension)) : 72;
  };
  const launcherFrameWidth = getLauncherFrameDimension("width");
  const launcherFrameHeight = getLauncherFrameDimension("height");
  const horizontalAnchor = selectedWindow?.launcherPosition.endsWith("left") ? "left" : "right";
  const verticalAnchor = selectedWindow?.launcherPosition.startsWith("top") ? "top" : "bottom";
  const launcherOffsetX = selectedWindow?.launcherOffsetX ?? 8;
  const launcherOffsetY = selectedWindow?.launcherOffsetY ?? 8;
  const frameLeft = horizontalAnchor === "left" ? `${launcherOffsetX}px` : "auto";
  const frameRight = horizontalAnchor === "right" ? `${launcherOffsetX}px` : "auto";
  const frameTop = verticalAnchor === "top" ? `${launcherOffsetY}px` : "auto";
  const frameBottom = verticalAnchor === "bottom" ? `${launcherOffsetY}px` : "auto";
  let snippet = selectedEntry && selectedWindow && typeof window !== "undefined"
    ? `<iframe
  id="${snippetFrameId}"
  src="${window.location.origin}/engagement/${encodeURIComponent(id)}/${encodeURIComponent(selectedWindow.id)}?entryPointId=${encodeURIComponent(selectedEntry.id)}"
  title="Chat widget"
  width="${launcherFrameWidth}"
  height="${launcherFrameHeight}"
  style="position:fixed;top:${frameTop};right:${frameRight};bottom:${frameBottom};left:${frameLeft};width:${launcherFrameWidth}px;height:${launcherFrameHeight}px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);max-height:calc(100dvh - 16px);z-index:9999;border:0;background:transparent"
  referrerpolicy="strict-origin-when-cross-origin"
  allow="clipboard-write"
></iframe>`
    : "";
  if (snippet) {
    snippet += `\n<script>
(() => {
  const frame = document.getElementById("${snippetFrameId}");
  if (!frame || !document.body) return;
  if (frame.parentElement !== document.body) document.body.appendChild(frame);
  const widgetOrigin = new URL(frame.src).origin;
  const horizontalAnchor = "${horizontalAnchor}";
  const verticalAnchor = "${verticalAnchor}";
  let frameIsOpen = false;
  let currentLauncherWidth = ${launcherFrameWidth};
  let currentLauncherHeight = ${launcherFrameHeight};
  const setFrameSize = (isOpen, animate = false, launcherWidth = currentLauncherWidth, launcherHeight = currentLauncherHeight) => {
    frameIsOpen = isOpen;
    currentLauncherWidth = launcherWidth;
    currentLauncherHeight = launcherHeight;
    const viewport = window.visualViewport;
    const viewportWidth = Math.max(0, Math.floor(viewport?.width || window.innerWidth));
    const viewportHeight = Math.max(0, Math.floor(viewport?.height || window.innerHeight));
    const minimumFrameWidth = Math.min(240, Math.max(0, viewportWidth - 16));
    const minimumFrameHeight = Math.min(240, Math.max(0, viewportHeight - 16));
    const offsetX = Math.min(${launcherOffsetX}, Math.max(0, viewportWidth - minimumFrameWidth - 8));
    const offsetY = Math.min(${launcherOffsetY}, Math.max(0, viewportHeight - minimumFrameHeight - 8));
    const availableWidth = Math.max(0, viewportWidth - offsetX - 8);
    const availableHeight = Math.max(0, viewportHeight - offsetY - 8);
    frame.style.setProperty("position", "fixed", "important");
    frame.style.setProperty("top", verticalAnchor === "top" ? \`\${offsetY}px\` : "auto", "important");
    frame.style.setProperty("left", horizontalAnchor === "left" ? \`\${offsetX}px\` : "auto", "important");
    frame.style.setProperty("right", horizontalAnchor === "right" ? \`\${offsetX}px\` : "auto", "important");
    frame.style.setProperty("bottom", verticalAnchor === "bottom" ? \`\${offsetY}px\` : "auto", "important");
    frame.style.setProperty("margin", "0", "important");
    frame.style.setProperty("z-index", "2147483000", "important");
    frame.style.setProperty("max-width", \`\${availableWidth}px\`, "important");
    frame.style.setProperty("max-height", \`\${availableHeight}px\`, "important");
    frame.style.setProperty("border", "0", "important");
    frame.style.setProperty("background", "transparent", "important");
    frame.style.setProperty(
      "transition",
      animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "width 3s cubic-bezier(0.16, 1, 0.3, 1), height 3s cubic-bezier(0.16, 1, 0.3, 1)"
        : "none",
      "important"
    );
    frame.style.setProperty("width", isOpen ? \`\${Math.min(380, availableWidth)}px\` : \`\${Math.min(launcherWidth, availableWidth)}px\`, "important");
    frame.style.setProperty("height", isOpen ? \`\${Math.min(620, availableHeight)}px\` : \`\${Math.min(launcherHeight, availableHeight)}px\`, "important");
  };
  const resizeFrameToViewport = () => setFrameSize(frameIsOpen);
  window.addEventListener("resize", resizeFrameToViewport);
  window.visualViewport?.addEventListener("resize", resizeFrameToViewport);
  setFrameSize(false);
  window.addEventListener("message", (event) => {
    if (event.origin !== widgetOrigin || event.source !== frame.contentWindow) return;
    if (event.data?.type !== "engagement-widget:resize") return;
    const launcherWidth = Number(event.data.launcherWidth);
    const launcherHeight = Number(event.data.launcherHeight);
    setFrameSize(
      event.data.open === true,
      event.data.animate === true,
      Number.isFinite(launcherWidth) && launcherWidth >= 0 ? launcherWidth : ${launcherFrameWidth},
      Number.isFinite(launcherHeight) && launcherHeight >= 0 ? launcherHeight : ${launcherFrameHeight}
    );
  });
})();
</script>`;
  }

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
                  <label className="space-y-1.5">
                    <span className="text-[11px] text-neutral-400">URL icon header</span>
                    <input value={item.headerIconUrl} onChange={(event) => updateWindow(item.id, { headerIconUrl: event.target.value })} maxLength={2048} placeholder="https://example.com/icon.png" className="h-9 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-xs text-white outline-none placeholder:text-neutral-700 focus:border-neutral-600" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] text-neutral-400">URL ikon tombol kirim</span>
                    <input value={item.sendIconUrl} onChange={(event) => updateWindow(item.id, { sendIconUrl: event.target.value })} maxLength={2048} placeholder="https://example.com/send-icon.svg" className="h-9 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 text-xs text-white outline-none placeholder:text-neutral-700 focus:border-neutral-600" />
                  </label>
                  <p className="md:col-span-2 text-[10px] leading-4 text-neutral-500">
                    Warna window, header, tombol, dan komponen chat diatur bersama di Setting → Style global chatbot.
                  </p>
                  <label className="flex h-9 items-center gap-2 text-[11px] text-neutral-400">
                    <input type="checkbox" checked={item.allowClose} onChange={(event) => updateWindow(item.id, { allowClose: event.target.checked })} className="h-4 w-4 accent-white" />
                    Tampilkan tombol close pada menu titik tiga
                  </label>
                  <section className="md:col-span-2 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                    <h4 className="text-xs font-semibold text-white">Posisi iframe</h4>
                    <p className="mt-1 text-[10px] leading-4 text-neutral-500">
                      Pilih sudut, lalu atur jarak X/Y dalam px. Posisi yang sama dipakai saat icon dan chat window ditampilkan.
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <label className="space-y-1.5">
                        <span className="text-[11px] text-neutral-400">Posisi sudut</span>
                        <select
                          value={item.launcherPosition}
                          onChange={(event) => {
                            const position = ENGAGEMENT_WINDOW_POSITIONS.find((candidate) => candidate === event.target.value);
                            if (position) updateWindow(item.id, { launcherPosition: position });
                          }}
                          className="h-9 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 text-xs text-white outline-none focus:border-neutral-600"
                        >
                          {ENGAGEMENT_WINDOW_POSITIONS.map((position) => (
                            <option key={position} value={position}>{ENGAGEMENT_POSITION_LABELS[position]}</option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-[11px] text-neutral-400">Jarak X (px)</span>
                        <input
                          type="number"
                          min={0}
                          max={1000}
                          step={1}
                          value={item.launcherOffsetX}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            if (Number.isFinite(value)) updateWindow(item.id, { launcherOffsetX: Math.min(1000, Math.max(0, Math.round(value))) });
                          }}
                          className="h-9 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 text-xs text-white outline-none focus:border-neutral-600"
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-[11px] text-neutral-400">Jarak Y (px)</span>
                        <input
                          type="number"
                          min={0}
                          max={1000}
                          step={1}
                          value={item.launcherOffsetY}
                          onChange={(event) => {
                            const value = Number(event.target.value);
                            if (Number.isFinite(value)) updateWindow(item.id, { launcherOffsetY: Math.min(1000, Math.max(0, Math.round(value))) });
                          }}
                          className="h-9 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 text-xs text-white outline-none focus:border-neutral-600"
                        />
                      </label>
                    </div>
                  </section>
                  <div className="md:col-span-2 grid gap-3 xl:grid-cols-2">
                  <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                    <h4 className="text-xs font-semibold text-white">Animasi tampil dan sembunyi chat window</h4>
                    <p className="mt-1 text-[10px] leading-4 text-neutral-500">Mengatur animasi panel chat saat dibuka atau disembunyikan, terpisah dari transisi bubble chat.</p>
                    <fieldset className="mt-3 space-y-2">
                      <legend className="mb-2 text-[11px] font-medium text-neutral-300">Pilih animasi chat window</legend>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {CHAT_SCROLL_ANIMATION_STYLES.map((style) => (
                          <label key={`window-${style.value}`} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition-colors ${item.windowAnimationStyle === style.value ? "border-neutral-500 bg-neutral-900/70" : "border-neutral-800 bg-black hover:border-neutral-700"}`}>
                            <input
                              type="radio"
                              name={`window-animation-${item.id}`}
                              value={style.value}
                              checked={item.windowAnimationStyle === style.value}
                              onChange={() => updateWindow(item.id, { windowAnimationStyle: style.value })}
                              className="mt-0.5 accent-white"
                            />
                            <span>
                              <span className="block text-[11px] font-medium text-neutral-200">{style.label}</span>
                              <span className="mt-0.5 block text-[10px] leading-4 text-neutral-500">{CHAT_WINDOW_ANIMATION_DESCRIPTIONS[style.value]}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </section>
                  <section className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-semibold text-white">Transisi bubble chat</h4>
                        <p className="mt-1 text-[10px] leading-4 text-neutral-500">Animasi saat bubble pesan masuk ke chat window.</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-label={`Transisi bubble chat ${item.name}`}
                        aria-checked={item.bubbleAnimationEnabled}
                        onClick={() => updateWindow(item.id, { bubbleAnimationEnabled: !item.bubbleAnimationEnabled })}
                        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${item.bubbleAnimationEnabled ? "border-white bg-white" : "border-neutral-700 bg-neutral-900"}`}
                      >
                        <span className={`h-4 w-4 rounded-full transition-transform ${item.bubbleAnimationEnabled ? "translate-x-5 bg-black" : "translate-x-1 bg-neutral-400"}`} />
                      </button>
                    </div>
                    <p className="mt-3 border-t border-neutral-900 pt-2 text-[10px] text-neutral-500">{item.bubbleAnimationEnabled ? "Aktif" : "Nonaktif"}</p>
                    {item.bubbleAnimationEnabled && (
                      <fieldset className="mt-3 space-y-2 border-t border-neutral-900 pt-3">
                        <legend className="mb-2 text-[11px] font-medium text-neutral-300">Pilih transisi</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {CHAT_SCROLL_ANIMATION_STYLES.map((style) => (
                            <label key={`bubble-${style.value}`} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition-colors ${item.bubbleAnimationStyle === style.value ? "border-neutral-500 bg-neutral-900/70" : "border-neutral-800 bg-black hover:border-neutral-700"}`}>
                              <input
                                type="radio"
                                name={`bubble-animation-${item.id}`}
                                value={style.value}
                                checked={item.bubbleAnimationStyle === style.value}
                                onChange={() => updateWindow(item.id, { bubbleAnimationStyle: style.value })}
                                className="mt-0.5 accent-white"
                              />
                              <span>
                                <span className="block text-[11px] font-medium text-neutral-200">{style.label}</span>
                                <span className="mt-0.5 block text-[10px] leading-4 text-neutral-500">{style.description}</span>
                              </span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    )}
                  </section>
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <div>
                      <h4 className="text-xs font-semibold text-white">Style komponen chat</h4>
                      <p className="mt-1 text-[10px] leading-4 text-neutral-500">
                        Komponen dan parameter sama seperti Style global. Perubahan disimpan hanya untuk chat window ini.
                      </p>
                    </div>
                    <GlobalChatStyleEditor
                      componentStyles={item.componentStyles}
                      onChange={(componentStyles) => updateWindow(item.id, { componentStyles })}
                      previewWindow={item}
                      scope="engagement"
                    />
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-neutral-600 bg-[#141414] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">Preview chat window</span>
                    <span className="text-[10px] text-neutral-600">380 × 620</span>
                  </div>
                  <style dangerouslySetInnerHTML={{ __html: scopeEngagementCss(
                    Object.values(item.componentStyles).join("\n"),
                    `.engagement-preview-window-${item.id}`
                  ) }} />
                  <div className={`engagement-preview-window-${item.id} relative mx-auto h-[457px] w-[280px] overflow-hidden`}>
                  <div className="engagement-widget absolute left-0 top-0 flex h-[620px] w-[380px] flex-col overflow-hidden border-2 shadow-2xl outline outline-1 outline-white/40" style={{ height: "620px", width: "380px", transform: "scale(0.736842)", transformOrigin: "top left", outlineOffset: "2px" }}>
                      <EngagementComponentPreview item={item} componentId="header" />
                      <div className="engagement-message-list min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4">
                        <EngagementComponentPreview item={item} componentId="welcome-message" />
                        <div className="flex min-w-0 flex-col items-start gap-1">
                          <div className="engagement-author flex items-center gap-1.5 pl-1 text-[10px] text-neutral-500">
                            <span className="font-semibold text-white">GenAI</span>
                          </div>
                          <EngagementComponentPreview item={item} componentId="bot-bubble" />
                        </div>
                        <EngagementComponentPreview item={item} componentId="user-bubble" />
                        <EngagementComponentPreview item={item} componentId="reply-buttons" />
                        <EngagementComponentPreview item={item} componentId="link-buttons" />
                        <EngagementComponentPreview item={item} componentId="card" />
                        <EngagementComponentPreview item={item} componentId="carousel" />
                        <EngagementComponentPreview item={item} componentId="interaction" />
                      </div>
                      <EngagementComponentPreview item={item} componentId="input" />
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
          <p className="mt-1 text-xs leading-5 text-neutral-500">Simpan Engagement, pilih entry point dan window, lalu tempel kode embed pada website di origin yang sama. Widget muncul sebagai ikon chat dan membuka window saat diklik.</p>
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
          Kode ini menempatkan ikon chat di pojok kanan bawah. Minimalkan menyembunyikan window tanpa mengakhiri sesi; tutup percakapan mengakhiri sesi, lalu klik ikon untuk memulai sesi baru.
        </p>
      </section>
    </main>
  );
}
