"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  addEdge,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Bot,
  Check,
  CircleHelp,
  GitBranch,
  Loader2,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  BOT_INTERACTION_LABELS,
  BOT_INTERACTION_TYPES,
  type BotDefinitionInput,
  type BotInteraction,
  type BotInteractionConfig,
  type BotInteractionType,
  type BotNextAction,
  type BotQuickButton,
  type GuidedRouteOption,
} from "@/lib/bot-flows";

interface BotDetail extends BotDefinitionInput {
  id: string;
  isActive: boolean;
  skillCount: number;
}

interface KnowledgeBaseOption {
  collectionName: string;
  displayName: string;
  isActive: boolean;
}

interface PromptOption {
  id: string;
  type: "faq" | "small_talk" | "route" | "guided_routing" | "rag";
  name: string;
  content: string;
  isActive: boolean;
}

interface FlowNodeData extends Record<string, unknown> {
  label: string;
  interactionType: BotInteractionType;
  summary: string;
  entry: boolean;
}

type FlowCanvasNode = Node<FlowNodeData, "botInteraction">;

const iconChoices = [
  { id: "sparkles", label: "Sparkles", Icon: Sparkles },
  { id: "bot", label: "Bot", Icon: Bot },
  { id: "message", label: "Message", Icon: MessageSquare },
  { id: "help", label: "Help", Icon: CircleHelp },
];

function nodeSummary(interaction: BotInteraction): string {
  if (interaction.type === "guided_routing") return `${interaction.config.options?.length || 0} route · LLM`;
  if (interaction.nextAction.type === "interaction") return "Next interaction";
  return interaction.nextAction.type === "end" ? "End interaction" : "Close conversation";
}

function InteractionNode({ data, selected }: NodeProps<FlowCanvasNode>) {
  const Icon = data.interactionType === "welcome_message"
    ? Sparkles
    : data.interactionType === "rag"
      ? Bot
      : data.interactionType === "guided_routing"
        ? GitBranch
        : MessageSquare;
  return (
    <div className={`min-w-52 max-w-64 rounded-lg border bg-[#0b0b0b] shadow-xl ${selected ? "border-white" : "border-neutral-700"}`}>
      <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-2 !border-neutral-900 !bg-neutral-400" />
      <div className="flex items-start gap-2.5 p-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 text-neutral-300"><Icon className="h-3.5 w-3.5" /></span>
        <div className="min-w-0">
          {data.entry && <span className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-emerald-400">Entry</span>}
          <p className="text-[10px] text-neutral-500">{BOT_INTERACTION_LABELS[data.interactionType]}</p>
          <p className="mt-0.5 truncate text-xs font-semibold text-white">{data.label}</p>
          <p className="mt-1 truncate text-[10px] text-neutral-600">{data.summary}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} isConnectable={data.interactionType !== "guided_routing"} className="!h-2.5 !w-2.5 !border-2 !border-neutral-900 !bg-neutral-300" />
    </div>
  );
}

const nodeTypes = { botInteraction: InteractionNode };

function toCanvasNode(interaction: BotInteraction, entryId: string): FlowCanvasNode {
  return {
    id: interaction.id,
    type: "botInteraction",
    position: interaction.position,
    data: {
      label: interaction.config.title || interaction.config.question || BOT_INTERACTION_LABELS[interaction.type],
      interactionType: interaction.type,
      summary: nodeSummary(interaction),
      entry: interaction.id === entryId,
    },
  };
}

function normalizeGuidedRoutes(interactions: BotInteraction[]): BotInteraction[] {
  return interactions.map((interaction) => {
    if (interaction.type !== "guided_routing") return interaction;
    return {
      ...interaction,
      config: {
        ...interaction.config,
        options: (interaction.config.options || []).map((option, index) => ({
          ...option,
          variable: option.variable || option.label.toUpperCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "") || `ROUTE_${index + 1}`,
          prompt: option.prompt || `Pilih route ini jika maksud pengguna sesuai dengan "${option.label}".`,
        })),
      },
    };
  });
}

function toEdges(interactions: BotInteraction[]): Edge[] {
  return interactions.flatMap((interaction) => {
    const edges: Edge[] = [];
    if (interaction.type !== "guided_routing" && interaction.nextAction.type === "interaction") {
      edges.push({
        id: `${interaction.id}-${interaction.nextAction.interactionId}`,
        source: interaction.id,
        target: interaction.nextAction.interactionId,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#737373" },
        style: { stroke: "#737373", strokeWidth: 1.5 },
      });
    }
    if (interaction.type === "guided_routing") {
      interaction.config.options?.forEach((option, index) => {
        edges.push({
          id: `${interaction.id}--route-${index}`,
          source: interaction.id,
          target: option.targetInteractionId,
          label: `${option.label} (${option.variable})`,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, color: "#525252" },
          labelStyle: { fill: "#a3a3a3", fontSize: 10 },
          style: { stroke: "#525252", strokeWidth: 1 },
        });
      });
    }
    return edges;
  });
}

function initialConfig(type: BotInteractionType, promptId?: string): BotInteractionConfig {
  switch (type) {
    case "welcome_message":
      return { title: "Selamat datang", subtitle: "Ada yang bisa kami bantu?", icon: "sparkles", footerText: "", quickButtons: [] };
    case "guided_routing":
      return { text: "Pilih topik yang ingin dibahas.", promptId, options: [] };
    case "small_talk":
      return { promptId, systemPrompt: "Kamu adalah asisten yang ramah dan ringkas." };
    case "rag":
      return { provider: "global", model: "", knowledgeBases: [], promptId, systemPrompt: "Jawab berdasarkan knowledge context. Jika informasi tidak tersedia, sampaikan dengan jujur.\n\n{context}" };
    case "text_question":
      return { question: "Apa yang ingin Anda tanyakan?" };
    case "text_start":
      return { text: "Halo! Ada yang bisa saya bantu?" };
    case "text":
      return { text: "" };
  }
}

function FlowEditor({ botId }: { botId: string }) {
  const { screenToFlowPosition } = useReactFlow();
  const [botName, setBotName] = useState("");
  const [description, setDescription] = useState("");
  const [interactions, setInteractions] = useState<BotInteraction[]>([]);
  const [entryInteractionId, setEntryInteractionId] = useState("");
  const [activeBot, setActiveBot] = useState(false);
  const [skillCount, setSkillCount] = useState(0);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseOption[]>([]);
  const [prompts, setPrompts] = useState<PromptOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [interactionsOpen, setInteractionsOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [variablesInfoOpen, setVariablesInfoOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowCanvasNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const selectedInteraction = interactions.find((item) => item.id === selectedId) || null;

  useEffect(() => {
    let current = true;
    Promise.all([
      fetch(`/api/bots/${botId}`).then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Gagal memuat bot.");
        return data.bot as BotDetail;
      }),
      fetch("/api/knowledge-bases").then(async (response) => {
        if (!response.ok) return [];
        const data = await response.json();
        return (data.knowledgeBases || []) as KnowledgeBaseOption[];
      }),
      fetch("/api/prompts").then(async (response) => {
        if (!response.ok) return [];
        const data = await response.json();
        return (data.prompts || []) as PromptOption[];
      }),
    ]).then(([bot, bases, promptOptions]) => {
      if (!current) return;
      setBotName(bot.name);
      setDescription(bot.description || "");
      const normalizedInteractions = normalizeGuidedRoutes(bot.interactions || []);
      setInteractions(normalizedInteractions);
      setEntryInteractionId(bot.entryInteractionId);
      setActiveBot(bot.isActive);
      setSkillCount(bot.skillCount || 0);
      setKnowledgeBases(bases.filter((base) => base.isActive !== false));
      setPrompts(promptOptions);
      setNodes(normalizedInteractions.map((item) => toCanvasNode(item, bot.entryInteractionId)));
      setEdges(toEdges(normalizedInteractions));
      setSelectedId("");
    }).catch((loadError: unknown) => {
      if (current) setError(loadError instanceof Error ? loadError.message : "Gagal memuat bot.");
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => { current = false; };
  }, [botId, setEdges, setNodes]);

  const refreshNodeData = (items: BotInteraction[], entryId = entryInteractionId) => {
    setNodes((current) => items.map((item) => {
      const existing = current.find((node) => node.id === item.id);
      return { ...toCanvasNode(item, entryId), position: existing?.position || item.position };
    }));
  };

  const updateConfig = (patch: Partial<BotInteractionConfig>) => {
    const updated = interactions.map((item) => item.id === selectedId
      ? { ...item, config: { ...item.config, ...patch } }
      : item);
    setInteractions(updated);
    setEdges(toEdges(updated));
    refreshNodeData(updated);
  };

  const updateNextAction = (nextAction: BotNextAction) => {
    const updated = interactions.map((item) => item.id === selectedId ? { ...item, nextAction } : item);
    setInteractions(updated);
    setEdges(toEdges(updated));
    refreshNodeData(updated);
  };

  const addInteraction = (type: BotInteractionType, position?: { x: number; y: number }) => {
    const id = crypto.randomUUID();
    const interaction: BotInteraction = {
      id,
      type,
      position: position || { x: 100 + interactions.length * 36, y: 100 + interactions.length * 36 },
      config: initialConfig(type, prompts.find((prompt) => prompt.type === type && prompt.isActive)?.id),
      nextAction: { type: "end" },
    };
    const updated = [...interactions, interaction];
    setInteractions(updated);
    setNodes((current) => [...current, toCanvasNode(interaction, entryInteractionId)]);
    setSelectedId(id);
  };

  const onConnect = (connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    if (interactions.find((item) => item.id === connection.source)?.type === "guided_routing") return;
    const updated = interactions.map((item) => item.id === connection.source
      ? { ...item, nextAction: { type: "interaction", interactionId: connection.target! } as BotNextAction }
      : item);
    setInteractions(updated);
    setEdges((current) => addEdge({
      ...connection,
      id: `${connection.source}-${connection.target}`,
      type: "smoothstep",
      markerEnd: { type: MarkerType.ArrowClosed, color: "#737373" },
      style: { stroke: "#737373", strokeWidth: 1.5 },
    }, current.filter((edge) => edge.source !== connection.source || edge.id.includes("--route-"))));
    refreshNodeData(updated);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/bot-interaction") as BotInteractionType;
    if (!BOT_INTERACTION_TYPES.includes(type)) return;
    addInteraction(type, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  };

  const removeSelected = () => {
    if (!selectedInteraction || interactions.length <= 1) return;
    const updated = interactions
      .filter((item) => item.id !== selectedId)
      .map((item) => ({
        ...item,
        nextAction: item.nextAction.type === "interaction" && item.nextAction.interactionId === selectedId
          ? { type: "end" as const }
          : item.nextAction,
        config: {
          ...item.config,
          options: item.config.options?.filter((option) => option.targetInteractionId !== selectedId),
        },
      }));
    const nextEntry = entryInteractionId === selectedId ? updated[0].id : entryInteractionId;
    setInteractions(updated);
    setEntryInteractionId(nextEntry);
    setNodes(updated.map((item) => toCanvasNode(item, nextEntry)));
    setEdges(toEdges(updated));
    setSelectedId("");
  };

  const saveBot = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    const savedInteractions = interactions.map((item) => {
      const canvasNode = nodes.find((node) => node.id === item.id);
      return canvasNode ? { ...item, position: canvasNode.position } : item;
    });
    try {
      const response = await fetch(`/api/bots/${botId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: botName, description, entryInteractionId, interactions: savedInteractions }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan flow.");
      setInteractions(savedInteractions);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan flow.");
    } finally {
      setSaving(false);
    }
  };

  const updateBotStatus = async () => {
    const nextActive = !activeBot;
    const response = await fetch(`/api/bots/${botId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: nextActive }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Gagal memperbarui status bot.");
      return;
    }
    setActiveBot(data.isActive);
  };

  const savePromptTemplate = async (promptId: string, content: string) => {
    const prompt = prompts.find((item) => item.id === promptId);
    if (!prompt) throw new Error("Prompt tidak ditemukan.");
    const response = await fetch(`/api/prompts/${promptId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...prompt, content }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Gagal menyimpan prompt.");
    setPrompts((items) => items.map((item) => item.id === promptId ? { ...item, content } : item));
  };

  const setQuickButton = (index: number, patch: Partial<BotQuickButton>) => {
    const buttons = [...(selectedInteraction?.config.quickButtons || [])];
    buttons[index] = { ...buttons[index], ...patch };
    updateConfig({ quickButtons: buttons });
  };

  const setGuidedOption = (index: number, patch: Partial<GuidedRouteOption>) => {
    const options = [...(selectedInteraction?.config.options || [])];
    const existing = options[index];
    const generatedVariable = (label: string, routeIndex: number) =>
      label.toUpperCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "") || `ROUTE_${routeIndex + 1}`;
    const variableWasGenerated = !existing.variable || existing.variable === generatedVariable(existing.label, index);
    options[index] = {
      ...existing,
      ...patch,
      ...(patch.label !== undefined && variableWasGenerated ? { variable: generatedVariable(patch.label, index) } : {}),
    };
    updateConfig({ options });
  };

  if (loading) return <div className="flex min-h-80 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-neutral-400" /></div>;

  const nextAction = selectedInteraction?.nextAction || { type: "end" as const };
  const otherInteractions = interactions.filter((item) => item.id !== selectedId);
  const showConfiguration = configOpen && Boolean(selectedInteraction);
  const editorGridClass = showConfiguration
    ? interactionsOpen ? "xl:grid-cols-[190px_minmax(0,1fr)_310px]" : "xl:grid-cols-[42px_minmax(0,1fr)_310px]"
    : interactionsOpen ? "xl:grid-cols-[190px_minmax(0,1fr)]" : "xl:grid-cols-[42px_minmax(0,1fr)]";
  const editorRowsClass = showConfiguration
    ? interactionsOpen
      ? "grid-rows-[auto_minmax(0,1fr)_minmax(160px,32dvh)] xl:grid-rows-1"
      : "grid-rows-[minmax(0,1fr)_minmax(160px,32dvh)] xl:grid-rows-1"
    : interactionsOpen
      ? "grid-rows-[auto_minmax(0,1fr)] xl:grid-rows-1"
      : "grid-rows-[minmax(0,1fr)] xl:grid-rows-1";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard/bot-management" aria-label="Kembali ke daftar bot" className="rounded-md border border-neutral-800 p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-neutral-600">Bot flow editor</p>
            <input aria-label="Nama bot" value={botName} onChange={(event) => setBotName(event.target.value)} className="w-full max-w-md truncate border-0 bg-transparent p-0 text-lg font-semibold text-white outline-none focus:ring-0" />
          </div>
          {activeBot && <span className="rounded-full border border-emerald-900 bg-emerald-950/40 px-2 py-1 text-[10px] text-emerald-300">Aktif · {skillCount} skill</span>}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void updateBotStatus()} className="rounded-md border border-neutral-800 px-2.5 py-2 text-[10px] text-neutral-400 hover:border-neutral-600 hover:text-white">{activeBot ? "Nonaktifkan bot" : "Aktifkan bot"}</button>
          <div className="relative">
            <button type="button" onClick={() => setVariablesInfoOpen((open) => !open)} title="Variabel sistem yang tersedia" aria-label="Variabel sistem yang tersedia" aria-expanded={variablesInfoOpen} className="rounded-md border border-neutral-800 p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white">
              <CircleHelp className="h-4 w-4" />
            </button>
            {variablesInfoOpen && <div role="dialog" aria-label="Variabel sistem yang tersedia" className="fixed right-4 top-16 z-50 w-96 max-w-[calc(100vw-2rem)] space-y-3 rounded-lg border border-neutral-800 bg-[#0a0a0a] p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xs font-semibold text-white">Variabel sistem</h2>
                  <p className="mt-1 text-[10px] leading-4 text-neutral-500">Gunakan nama variabel ini persis di prompt template.</p>
                </div>
                <button type="button" onClick={() => setVariablesInfoOpen(false)} aria-label="Tutup informasi variabel" className="rounded p-1 text-neutral-500 hover:bg-neutral-900 hover:text-white"><X className="h-3.5 w-3.5" /></button>
              </div>
              <dl className="space-y-2.5 text-[10px] leading-4">
                <div>
                  <dt className="font-mono font-semibold text-neutral-200">{"{question}"} / {"{message}"}</dt>
                  <dd className="mt-0.5 text-neutral-500">Teks pesan terbaru dari pengguna. Tersedia pada Guided Routing, Small Talk, dan RAG.</dd>
                </div>
                <div>
                  <dt className="font-mono font-semibold text-neutral-200">{"{context}"}</dt>
                  <dd className="mt-0.5 text-neutral-500">Konteks artikel hasil retrieval (maksimal Top 5). Tersedia pada node RAG; tidak diisi pada Guided Routing atau Small Talk.</dd>
                </div>
                <div>
                  <dt className="font-mono font-semibold text-neutral-200">{"{fullName}"}</dt>
                  <dd className="mt-0.5 text-neutral-500">Nama lengkap pengguna, dengan fallback ke nama akun atau “User”.</dd>
                </div>
                <div>
                  <dt className="font-mono font-semibold text-neutral-200">{"{name}"} / {"{email}"}</dt>
                  <dd className="mt-0.5 text-neutral-500">Nama dan email pengguna dari profil sesi. Tersedia pada Guided Routing, Small Talk, dan RAG.</dd>
                </div>
              </dl>
            </div>}
          </div>
          <button type="button" onClick={() => setInteractionsOpen((open) => !open)} title={interactionsOpen ? "Sembunyikan daftar interaction" : "Tampilkan daftar interaction"} aria-label={interactionsOpen ? "Sembunyikan daftar interaction" : "Tampilkan daftar interaction"} aria-expanded={interactionsOpen} className="rounded-md border border-neutral-800 p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white">
            {interactionsOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          {selectedInteraction && <button type="button" onClick={() => setConfigOpen((open) => !open)} title={showConfiguration ? "Sembunyikan konfigurasi" : "Tampilkan konfigurasi"} aria-label={showConfiguration ? "Sembunyikan konfigurasi" : "Tampilkan konfigurasi"} aria-expanded={showConfiguration} className="rounded-md border border-neutral-800 p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white">
            {showConfiguration ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>}
          {saved && <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300"><Check className="h-3 w-3" /> Tersimpan</span>}
          <button type="button" onClick={() => void saveBot()} disabled={saving || !botName.trim()} className="inline-flex items-center gap-2 rounded-md bg-white px-3.5 py-2 text-xs font-semibold text-black hover:bg-neutral-200 disabled:opacity-40">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Simpan flow
          </button>
        </div>
      </header>

      <label className="block max-w-2xl">
        <span className="sr-only">Deskripsi bot</span>
        <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Deskripsi bot" className="w-full border-0 bg-transparent p-0 text-xs text-neutral-500 outline-none placeholder:text-neutral-700 focus:ring-0" />
      </label>

      {error && <div role="alert" className="flex items-center justify-between rounded-md border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs text-red-200">{error}<button type="button" onClick={() => setError("")} aria-label="Tutup error"><X className="h-4 w-4" /></button></div>}

      <div className={`grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-xl border border-neutral-800 bg-[#080808] ${editorRowsClass} ${editorGridClass}`}>
        <aside className={`${interactionsOpen ? "block p-3" : "hidden p-1 xl:block"} min-h-0 overflow-auto border-b border-neutral-800 xl:border-b-0 xl:border-r`}>
          {interactionsOpen ? <>
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 className="text-xs font-semibold text-white">Interactions</h2>
                <p className="mt-1 text-[10px] leading-4 text-neutral-600">Seret ke canvas untuk menambahkan node.</p>
              </div>
              <button type="button" onClick={() => setInteractionsOpen(false)} title="Minimalkan daftar interaction" aria-label="Minimalkan daftar interaction" className="rounded p-1 text-neutral-500 hover:bg-neutral-900 hover:text-white"><PanelLeftClose className="h-3.5 w-3.5" /></button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible">
              {BOT_INTERACTION_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/bot-interaction", type);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => addInteraction(type)}
                  className="flex shrink-0 items-center gap-2 rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-left text-[10px] text-neutral-300 hover:border-neutral-600 hover:text-white xl:w-full"
                >
                  <Plus className="h-3 w-3 text-neutral-500" />{BOT_INTERACTION_LABELS[type]}
                </button>
              ))}
            </div>
          </> : <button type="button" onClick={() => setInteractionsOpen(true)} title="Tampilkan daftar interaction" aria-label="Tampilkan daftar interaction" className="flex w-full justify-center rounded-md p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white"><PanelLeftOpen className="h-4 w-4" /></button>}
        </aside>

        <section
          className="relative min-h-0 min-w-0 bg-[#050505]"
          onDrop={handleDrop}
          onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
        >
          <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-md border border-neutral-800 bg-black/85 px-2.5 py-1.5 text-[10px] text-neutral-500">
            <GitBranch className="h-3 w-3" /> Guided Routing routes connect to their selected target interactions
          </div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => { setSelectedId(node.id); setConfigOpen(true); }}
            onPaneClick={() => setSelectedId("")}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            colorMode="dark"
          >
            <Background color="#303030" gap={22} size={1} />
            <Controls className="!overflow-hidden !rounded-md !border-neutral-800 !bg-[#101010]" />
            <MiniMap className="!border !border-neutral-800 !bg-[#101010]" nodeColor="#737373" maskColor="rgb(0 0 0 / 70%)" />
          </ReactFlow>
        </section>

        {showConfiguration && <aside className="min-h-0 overflow-auto border-t border-neutral-800 p-4 xl:border-l xl:border-t-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-semibold text-white">Konfigurasi</h2>
              <p className="mt-1 text-[10px] text-neutral-600">{selectedInteraction ? BOT_INTERACTION_LABELS[selectedInteraction.type] : "Pilih node untuk mengatur detail."}</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setConfigOpen(false)} aria-label="Sembunyikan konfigurasi" title="Sembunyikan konfigurasi" className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-900 hover:text-white"><PanelRightClose className="h-3.5 w-3.5" /></button>
              {selectedInteraction && <button type="button" onClick={removeSelected} disabled={interactions.length <= 1} aria-label="Hapus interaction" title="Hapus interaction" className="rounded-md p-1.5 text-neutral-600 hover:bg-red-950/50 hover:text-red-300 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button>}
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <label className="block space-y-1.5 text-[10px] text-neutral-500">Entry interaction
              <select value={entryInteractionId} onChange={(event) => {
                setEntryInteractionId(event.target.value);
                setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, entry: node.id === event.target.value } })));
              }} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600">
                {interactions.map((item) => <option key={item.id} value={item.id}>{item.config.title || item.config.question || BOT_INTERACTION_LABELS[item.type]}</option>)}
              </select>
            </label>

            {selectedInteraction ? (
              <>
                <div className="rounded-md border border-neutral-800 bg-black px-3 py-2.5">
                  <p className="text-[9px] uppercase tracking-wide text-neutral-600">{BOT_INTERACTION_LABELS[selectedInteraction.type]}</p>
                  <p className="mt-1 truncate text-xs font-medium text-white">{selectedInteraction.config.title || selectedInteraction.config.question || BOT_INTERACTION_LABELS[selectedInteraction.type]}</p>
                </div>

                {selectedInteraction.type === "welcome_message" && (
                  <div className="space-y-3">
                    <TextField label="Title" value={selectedInteraction.config.title || ""} onChange={(value) => updateConfig({ title: value })} />
                    <TextAreaField label="Subtitle" value={selectedInteraction.config.subtitle || ""} onChange={(value) => updateConfig({ subtitle: value })} rows={3} />
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">Icon
                      <select value={selectedInteraction.config.icon || "sparkles"} onChange={(event) => updateConfig({ icon: event.target.value })} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600">
                        {iconChoices.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                      </select>
                    </label>
                    <TextField label="Footer text" value={selectedInteraction.config.footerText || ""} onChange={(value) => updateConfig({ footerText: value })} />
                    <div className="space-y-2 border-t border-neutral-900 pt-3">
                      <div className="flex items-center justify-between"><span className="text-[10px] font-medium text-neutral-300">Opsi cepat</span><button type="button" onClick={() => updateConfig({ quickButtons: [...(selectedInteraction.config.quickButtons || []), { label: "", action: "reply", value: "" }] })} className="inline-flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white"><Plus className="h-3 w-3" /> Tambah</button></div>
                      {(selectedInteraction.config.quickButtons || []).map((button, index) => <QuickButtonFields key={`${selectedInteraction.id}-quick-${index}`} button={button} onChange={(patch) => setQuickButton(index, patch)} onRemove={() => updateConfig({ quickButtons: selectedInteraction.config.quickButtons?.filter((_, itemIndex) => itemIndex !== index) })} />)}
                    </div>
                  </div>
                )}

                {selectedInteraction.type === "guided_routing" && (
                  <div className="space-y-3">
                    <PromptSelector type="guided_routing" prompts={prompts} value={selectedInteraction.config.promptId || ""} onChange={(value) => updateConfig({ promptId: value })} onSave={savePromptTemplate} />
                    <div className="space-y-2 border-t border-neutral-900 pt-3">
                      <div className="flex items-center justify-between"><span className="text-[10px] font-medium text-neutral-300">Pilihan route</span><button type="button" onClick={() => updateConfig({ options: [...(selectedInteraction.config.options || []), { label: "", variable: "", prompt: "", targetInteractionId: otherInteractions[0]?.id || "" }] })} className="inline-flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white"><Plus className="h-3 w-3" /> Tambah</button></div>
                      {(selectedInteraction.config.options || []).map((option, index) => <GuidedOptionFields key={`${selectedInteraction.id}-route-${index}`} option={option} interactions={otherInteractions} onChange={(patch) => setGuidedOption(index, patch)} onRemove={() => updateConfig({ options: selectedInteraction.config.options?.filter((_, itemIndex) => itemIndex !== index) })} />)}
                    </div>
                  </div>
                )}

                {selectedInteraction.type === "small_talk" && (
                  <PromptSelector type="small_talk" prompts={prompts} value={selectedInteraction.config.promptId || ""} onChange={(value) => updateConfig({ promptId: value })} onSave={savePromptTemplate} />
                )}

                {selectedInteraction.type === "rag" && (
                  <div className="space-y-3">
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">LLM provider
                      <select value={selectedInteraction.config.provider || "global"} onChange={(event) => updateConfig({ provider: event.target.value as BotInteractionConfig["provider"] })} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600">
                        <option value="global">Gunakan konfigurasi global</option><option value="lmstudio">LM Studio</option><option value="openrouter">OpenRouter</option>
                      </select>
                    </label>
                    {selectedInteraction.config.provider !== "global" && <TextField label="Model" value={selectedInteraction.config.model || ""} onChange={(value) => updateConfig({ model: value })} placeholder="Nama model" />}
                    <PromptSelector type="rag" prompts={prompts} value={selectedInteraction.config.promptId || ""} onChange={(value) => updateConfig({ promptId: value })} onSave={savePromptTemplate} />
                    <div className="space-y-2 border-t border-neutral-900 pt-3">
                      <p className="text-[10px] font-medium text-neutral-300">Knowledge Base aktif</p>
                      {knowledgeBases.length ? knowledgeBases.map((base) => {
                        const checked = selectedInteraction.config.knowledgeBases?.includes(base.collectionName) || false;
                        return <label key={base.collectionName} className="flex cursor-pointer items-start gap-2 rounded-md border border-neutral-900 px-2.5 py-2 text-[10px] text-neutral-400 hover:bg-neutral-950"><input type="checkbox" checked={checked} onChange={() => {
                          const current = selectedInteraction.config.knowledgeBases || [];
                          updateConfig({ knowledgeBases: checked ? current.filter((name) => name !== base.collectionName) : [...current, base.collectionName] });
                        }} className="mt-0.5 accent-white" /><span>{base.displayName}</span></label>;
                      }) : <p className="text-[10px] text-neutral-600">Belum ada Knowledge Base aktif.</p>}
                    </div>
                  </div>
                )}

                {(selectedInteraction.type === "text" || selectedInteraction.type === "text_start") && <TextAreaField label="Pesan" value={selectedInteraction.config.text || ""} onChange={(value) => updateConfig({ text: value })} rows={6} />}
                {selectedInteraction.type === "text_question" && <TextAreaField label="Pertanyaan" value={selectedInteraction.config.question || ""} onChange={(value) => updateConfig({ question: value })} rows={4} />}

                {selectedInteraction.type !== "guided_routing" && <div className="space-y-2 border-t border-neutral-800 pt-4">
                  <label className="block space-y-1.5 text-[10px] text-neutral-500">Next action
                    <select value={nextAction.type} onChange={(event) => {
                      const type = event.target.value;
                      if (type === "interaction") updateNextAction({ type, interactionId: otherInteractions[0]?.id || "" });
                      else if (type === "end" || type === "close") updateNextAction({ type });
                    }} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600">
                      <option value="interaction">Pilih interaction</option><option value="end">End interaction</option><option value="close">Close conversation</option>
                    </select>
                  </label>
                  {nextAction.type === "interaction" && <label className="block space-y-1.5 text-[10px] text-neutral-500">Next interaction
                    <select value={nextAction.interactionId} onChange={(event) => updateNextAction({ type: "interaction", interactionId: event.target.value })} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600">
                      {otherInteractions.map((item) => <option key={item.id} value={item.id}>{item.config.title || item.config.question || BOT_INTERACTION_LABELS[item.type]}</option>)}
                    </select>
                  </label>}
                  <p className="text-[9px] leading-4 text-neutral-600">Hubungkan handle antar-node di canvas untuk mengatur next interaction secara visual.</p>
                </div>}
              </>
            ) : <p className="rounded-md border border-dashed border-neutral-800 px-3 py-8 text-center text-[10px] text-neutral-600">Pilih node di canvas atau tambahkan interaction.</p>}
          </div>
        </aside>}
      </div>
    </div>
  );
}

function PromptSelector({ type, prompts, value, onChange, onSave }: { type: "guided_routing" | "small_talk" | "rag"; prompts: PromptOption[]; value: string; onChange: (value: string) => void; onSave: (promptId: string, content: string) => Promise<void> }) {
  const matchingPrompts = prompts.filter((prompt) => prompt.type === type);
  const selectedPrompt = matchingPrompts.find((prompt) => prompt.id === value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!selectedPrompt) return;
    setSaving(true);
    setError("");
    try {
      await onSave(selectedPrompt.id, draft);
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan prompt.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block space-y-1.5 text-[10px] text-neutral-500">Prompt template
      <select value={value} disabled={editing} onChange={(event) => onChange(event.target.value)} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600 disabled:opacity-50">
        <option value="">Prompt bawaan</option>
        {matchingPrompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{prompt.name}{prompt.isActive ? " · Aktif" : ""}</option>)}
      </select>
      {matchingPrompts.length === 0 && <span className="block text-[9px] text-neutral-600">Belum ada template. <Link href="/dashboard/prompts" className="text-neutral-400 underline">Buat prompt</Link></span>}
      </label>
      {selectedPrompt && !editing && <button type="button" onClick={() => { setDraft(selectedPrompt.content); setError(""); setEditing(true); }} className="text-[10px] text-neutral-400 underline hover:text-white">Edit prompt di sini</button>}
      {editing && <div className="space-y-2">
        <textarea aria-label="Isi prompt template" value={draft} onChange={(event) => setDraft(event.target.value)} rows={8} className="w-full resize-y rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs leading-5 text-neutral-200 outline-none focus:border-neutral-600" />
        {error && <p role="alert" className="text-[10px] text-red-300">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-neutral-800 px-2.5 py-1.5 text-[10px] text-neutral-400 hover:text-white">Batal</button>
          <button type="button" onClick={() => void save()} disabled={saving || !draft.trim()} className="rounded-md bg-white px-2.5 py-1.5 text-[10px] font-semibold text-black disabled:opacity-40">{saving ? "Menyimpan..." : "Simpan prompt"}</button>
        </div>
      </div>}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block space-y-1.5 text-[10px] text-neutral-500">{label}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none placeholder:text-neutral-700 focus:border-neutral-600" /></label>;
}

function TextAreaField({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return <label className="block space-y-1.5 text-[10px] text-neutral-500">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="w-full resize-y rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs leading-5 text-neutral-200 outline-none placeholder:text-neutral-700 focus:border-neutral-600" /></label>;
}

function QuickButtonFields({ button, onChange, onRemove }: { button: BotQuickButton; onChange: (patch: Partial<BotQuickButton>) => void; onRemove: () => void }) {
  return (
    <div className="space-y-2 rounded-md border border-neutral-900 bg-black p-2">
      <div className="flex gap-1.5">
        <input value={button.label} onChange={(event) => onChange({ label: event.target.value })} placeholder="Label" className="min-w-0 flex-1 rounded border border-neutral-800 bg-[#080808] px-2 py-1.5 text-[10px] text-white outline-none" />
        <select value={button.action} onChange={(event) => onChange({ action: event.target.value as BotQuickButton["action"] })} className="rounded border border-neutral-800 bg-[#080808] px-1.5 text-[10px] text-neutral-300"><option value="reply">Reply</option><option value="link">Link</option></select>
        <button type="button" onClick={onRemove} aria-label="Hapus opsi" className="rounded p-1 text-neutral-600 hover:text-red-300"><X className="h-3 w-3" /></button>
      </div>
      <input value={button.value} onChange={(event) => onChange({ value: event.target.value })} placeholder={button.action === "link" ? "https://..." : "Pesan yang dikirim"} className="w-full rounded border border-neutral-800 bg-[#080808] px-2 py-1.5 text-[10px] text-neutral-300 outline-none" />
    </div>
  );
}

function GuidedOptionFields({ option, interactions, onChange, onRemove }: { option: GuidedRouteOption; interactions: BotInteraction[]; onChange: (patch: Partial<GuidedRouteOption>) => void; onRemove: () => void }) {
  return (
    <div className="space-y-2 rounded-md border border-neutral-900 bg-black p-2">
      <div className="flex gap-1.5">
        <input value={option.label} onChange={(event) => onChange({ label: event.target.value })} placeholder="Nama route" aria-label="Nama route" className="min-w-0 flex-1 rounded border border-neutral-800 bg-[#080808] px-2 py-1.5 text-[10px] text-white outline-none" />
        <button type="button" onClick={onRemove} aria-label="Hapus route" className="rounded p-1 text-neutral-600 hover:text-red-300"><X className="h-3 w-3" /></button>
      </div>
      <input value={option.variable} onChange={(event) => onChange({ variable: event.target.value })} placeholder="Variable route, contoh: SMALL_TALK" aria-label="Variable route" className="w-full rounded border border-neutral-800 bg-[#080808] px-2 py-1.5 text-[10px] text-neutral-300 outline-none" />
      <TextAreaField label="Kondisi route: kapan route ini dipilih" value={option.prompt} onChange={(value) => onChange({ prompt: value })} rows={3} />
      <select value={option.targetInteractionId} onChange={(event) => onChange({ targetInteractionId: event.target.value })} className="w-full rounded border border-neutral-800 bg-[#080808] px-2 py-1.5 text-[10px] text-neutral-300">
        <option value="">Pilih target interaction</option>
        {interactions.map((item) => <option key={item.id} value={item.id}>{item.config.title || item.config.question || BOT_INTERACTION_LABELS[item.type]}</option>)}
      </select>
    </div>
  );
}

export default function BotFlowEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ReactFlowProvider><FlowEditor botId={id} /></ReactFlowProvider>;
}
