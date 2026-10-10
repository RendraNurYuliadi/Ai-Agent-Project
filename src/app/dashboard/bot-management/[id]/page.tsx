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
import { ActionToast, ConfirmDialog } from "@/components/action-feedback";
import {
  ArrowLeft,
  Bot,
  Check,
  CircleHelp,
  Database,
  Globe,
  GitBranch,
  ListChecks,
  Loader2,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  BOT_INTERACTION_LABELS,
  BOT_INTERACTION_TYPES,
  type BotCustomVariable,
  type BotDefinitionInput,
  type BotInteraction,
  type BotInteractionConfig,
  type BotInteractionType,
  type BotNextAction,
  type BotQuickButton,
  type DataCollectionComponent,
  type DataCollectionComponentCard,
  type DataCollectionQuestion,
  type DataCollectionValidator,
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

interface SkillOption {
  id: string;
  name: string;
  botUser: { userType: "human" | "bot" } | null;
  bot: { name: string } | null;
  isAvailable: boolean;
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

const BOT_SYSTEM_VARIABLES = [
  "{question}",
  "{chatHistory}",
  "{conversationHistory}",
  "{history}",
  "{fullName}",
  "{email}",
  "{username}",
  "{role}",
  "{year}",
  "{month}",
  "{date}",
  "{day}",
  "{time}",
];

const BOT_TOOL_TYPES: BotInteractionType[] = ["guided_routing", "small_talk", "rag", "web_search", "data_collection", "data_collection_submitted", "skill_escalation"];
const BOT_INTERACTION_TYPES_GROUPED: BotInteractionType[] = ["welcome_message", "text", "text_question"];

function getBotVariableOptions(customVariables: BotCustomVariable[] = [], interactions: BotInteraction[] = [], interactionType?: BotInteractionType) {
  const dataCollectionVariables = [...new Set(interactions.flatMap((interaction) => interaction.type === "data_collection"
    ? (interaction.config.dataCollectionQuestions || []).map((item) => `{${(item.variable || item.name || "").trim()}}`).filter(Boolean)
    : []))];
  const customNames = customVariables.filter((item) => item.name.trim()).map((item) => `{${item.name.trim()}}`);
  const systemVariables = [
    ...BOT_SYSTEM_VARIABLES,
    ...(interactionType === "rag" ? ["{context}"] : []),
    ...dataCollectionVariables,
  ];
  return [...new Set(systemVariables), ...customNames];
}

function interactionDisplayName(interaction: Pick<BotInteraction, "type" | "config">): string {
  return interaction.config.name?.trim() || interaction.config.title?.trim() || interaction.config.question?.trim() || BOT_INTERACTION_LABELS[interaction.type];
}

function nodeSummary(interaction: BotInteraction): string {
  if (interaction.type === "guided_routing") return `${interaction.config.options?.length || 0} route · LLM`;
  if (interaction.type === "web_search") return `${interaction.config.webSearchMaxResults || 5} sumber web · LLM`;
  if (interaction.type === "data_collection") return `${interaction.config.dataCollectionQuestions?.length || 0} pertanyaan · Webhook`;
  if (interaction.type === "data_collection_submitted") return `${interaction.config.dataCollectionSubmittedFields?.length || 0} field · Capture`;
  if (interaction.type === "skill_escalation") return "Alihkan percakapan ke human";
  if (interaction.nextAction.type === "interaction") return "Next interaction";
  return interaction.nextAction.type === "end" ? "End interaction" : "Close conversation";
}

function InteractionNode({ data, selected }: NodeProps<FlowCanvasNode>) {
  const Icon = data.interactionType === "welcome_message"
    ? Sparkles
    : data.interactionType === "rag"
      ? Bot
      : data.interactionType === "web_search"
        ? Globe
        : data.interactionType === "data_collection"
          ? ListChecks
          : data.interactionType === "data_collection_submitted"
            ? Database
            : data.interactionType === "skill_escalation"
              ? UserRound
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
      label: interactionDisplayName(interaction),
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
      if (interaction.config.fallbackInteractionId) {
        edges.push({
          id: `${interaction.id}--fallback`,
          source: interaction.id,
          target: interaction.config.fallbackInteractionId,
          label: "Fallback",
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, color: "#737373" },
          labelStyle: { fill: "#a3a3a3", fontSize: 10 },
          style: { stroke: "#737373", strokeWidth: 1, strokeDasharray: "4 3" },
        });
      }
    }
    return edges;
  });
}

function initialConfig(type: BotInteractionType, promptId?: string): BotInteractionConfig {
  switch (type) {
    case "welcome_message":
      return { title: "Selamat datang", subtitle: "Ada yang bisa kami bantu?", icon: "sparkles", footerText: "", quickButtons: [] };
    case "guided_routing":
      return { provider: "global", text: "Pilih topik yang ingin dibahas.", promptId, options: [], fallbackMessageEnabled: true };
    case "small_talk":
      return { provider: "lmstudio", lmStudioUrl: "http://localhost:1234/v1", model: "", temperature: 0.8, maxTokens: 400, promptId, systemPrompt: "Kamu adalah asisten yang ramah dan ringkas." };
    case "rag":
      return { provider: "lmstudio", lmStudioUrl: "http://localhost:1234/v1", model: "", temperature: 0.7, maxTokens: 1024, ragDocumentMaxResults: 5, knowledgeBases: [], promptId, systemPrompt: "Jawab berdasarkan knowledge context. Jika informasi tidak tersedia, sampaikan dengan jujur.\n\n{context}" };
    case "web_search":
      return { provider: "lmstudio", lmStudioUrl: "http://localhost:1234/v1", model: "", temperature: 0.7, maxTokens: 1024, webSearchMaxResults: 5 };
    case "data_collection":
      return { dataCollectionQuestions: [{ name: "nama_lengkap", question: "Siapa nama lengkap Anda?", variable: "nama_lengkap" }] };
    case "data_collection_submitted":
      return { dataCollectionSubmittedFields: [] };
    case "skill_escalation":
      return { escalationSkillId: "", escalationMessageEnabled: true, escalationMessage: "Percakapan Anda sedang dialihkan." };
    case "text_question":
      return { question: "Apa yang ingin Anda tanyakan?" };
    case "text_start":
      return { text: "" };
    case "text":
      return { text: "" };
  }
}

function FlowEditor({ botId, initialNotice }: { botId: string; initialNotice?: string }) {
  const { screenToFlowPosition } = useReactFlow();
  const [botName, setBotName] = useState("");
  const [description, setDescription] = useState("");
  const [interactions, setInteractions] = useState<BotInteraction[]>([]);
  const [entryInteractionId, setEntryInteractionId] = useState("");
  const [customVariables, setCustomVariables] = useState<BotCustomVariable[]>([]);
  const [activeBot, setActiveBot] = useState(false);
  const [skillCount, setSkillCount] = useState(0);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseOption[]>([]);
  const [prompts, setPrompts] = useState<PromptOption[]>([]);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [interactionsOpen, setInteractionsOpen] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [variablesInfoOpen, setVariablesInfoOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ragProviderTest, setRagProviderTest] = useState<{ interactionId: string; status: "testing" | "success" | "error"; message: string; models: string[] } | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState(initialNotice || "");
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [variableDraft, setVariableDraft] = useState({ name: "", value: "" });
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
      fetch("/api/skills").then(async (response) => {
        if (!response.ok) return [];
        const data = await response.json();
        return (data.skills || []) as SkillOption[];
      }),
    ]).then(([bot, bases, promptOptions, skillOptions]) => {
      if (!current) return;
      setBotName(bot.name);
      setDescription(bot.description || "");
      const activeKnowledgeBases = bases.filter((base) => base.isActive !== false);
      const activeCollectionNames = new Set(activeKnowledgeBases.map((base) => base.collectionName));
      const botInteractions = normalizeGuidedRoutes(bot.interactions || []);
      const staleKnowledgeBaseCount = botInteractions
        .filter((item) => item.type === "rag")
        .flatMap((item) => item.config.knowledgeBases || [])
        .filter((collectionName) => !activeCollectionNames.has(collectionName)).length;
      const normalizedInteractions = botInteractions.map((item) => item.type === "rag"
        ? { ...item, config: { ...item.config, knowledgeBases: (item.config.knowledgeBases || []).filter((collectionName) => activeCollectionNames.has(collectionName)) } }
        : item);
      setInteractions(normalizedInteractions);
      setEntryInteractionId(bot.entryInteractionId);
      setCustomVariables(Array.isArray(bot.variables) ? bot.variables : []);
      setActiveBot(bot.isActive);
      setSkillCount(bot.skillCount || 0);
      setKnowledgeBases(activeKnowledgeBases);
      if (staleKnowledgeBaseCount) setNotice("Referensi ke Knowledge Base yang sudah tidak tersedia dilepas. Simpan flow untuk menerapkan perubahan.");
      setPrompts(promptOptions);
      setSkills(skillOptions);
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

  const selectRagProvider = async (provider: "lmstudio" | "openrouter") => {
    if (!selectedInteraction) return;
    const baseUrl = selectedInteraction.config.lmStudioUrl || "http://localhost:1234/v1";
    updateConfig({ provider, ...(provider === "lmstudio" ? { lmStudioUrl: baseUrl } : {}) });
    setRagProviderTest({ interactionId: selectedInteraction.id, status: "testing", message: "Menguji koneksi dan memuat model...", models: [] });
    try {
      const response = await fetch("/api/genai-route/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, baseUrl, listModelsOnly: true }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Koneksi provider gagal.");
      const models = Array.isArray(data.models) ? data.models as string[] : [];
      const currentModel = selectedInteraction.config.model || "";
      const defaultModel = provider === "openrouter" ? "openrouter/free" : models[0] || "";
      updateConfig({ provider, ...(provider === "lmstudio" ? { lmStudioUrl: baseUrl } : {}), model: models.includes(currentModel) ? currentModel : defaultModel });
      setRagProviderTest({ interactionId: selectedInteraction.id, status: "success", message: data.message || `${models.length} model tersedia.`, models });
    } catch (testError) {
      setRagProviderTest({ interactionId: selectedInteraction.id, status: "error", message: testError instanceof Error ? testError.message : "Gagal menguji koneksi provider.", models: [] });
    }
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
    if (!BOT_INTERACTION_TYPES.includes(type as Exclude<BotInteractionType, "text_start">)) return;
    addInteraction(type, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  };

  const removeSelected = () => {
    if (!selectedInteraction || interactions.length <= 1) return;
    const removedName = interactionDisplayName(selectedInteraction);
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
    setConfirmRemoveOpen(false);
    setNotice(`Interaction "${removedName}" dihapus dari flow. Simpan flow untuk menerapkan perubahan.`);
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
        body: JSON.stringify({ name: botName, description, entryInteractionId, interactions: savedInteractions, variables: customVariables }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan flow.");
      setInteractions(savedInteractions);
      setSaved(true);
      setNotice("Flow bot berhasil diperbarui.");
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
    setNotice(`Bot berhasil ${data.isActive ? "diaktifkan" : "dinonaktifkan"}.`);
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
    setNotice("Prompt berhasil diperbarui.");
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

  const addCustomVariable = () => {
    const name = variableDraft.name.trim();
    if (!name || !/^\w+$/.test(name) || name.length > 40) {
      setError("Nama variabel custom harus berupa teks alfanumerik tanpa spasi, maksimal 40 karakter.");
      return;
    }
    const normalizedName = name.replace(/\s+/g, "_");
    if (BOT_SYSTEM_VARIABLES.includes(`{${normalizedName}}`) || customVariables.some((item) => item.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) {
      setError("Nama variabel custom sudah dipakai atau bertabrakan dengan variabel bawaan.");
      return;
    }
    setCustomVariables((items) => [...items, { id: crypto.randomUUID(), name: normalizedName, value: variableDraft.value }]);
    setVariableDraft({ name: "", value: "" });
    setError("");
  };

  const updateCustomVariable = (id: string, patch: Partial<BotCustomVariable>) => {
    setCustomVariables((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const removeCustomVariable = (id: string) => {
    setCustomVariables((items) => items.filter((item) => item.id !== id));
  };
  const showConfiguration = configOpen && Boolean(selectedInteraction);
  const editorGridClass = interactionsOpen ? "xl:grid-cols-[190px_minmax(0,1fr)]" : "xl:grid-cols-[42px_minmax(0,1fr)]";
  const editorRowsClass = interactionsOpen ? "grid-rows-[auto_minmax(0,1fr)] xl:grid-rows-1" : "grid-rows-[minmax(0,1fr)] xl:grid-rows-1";
  const availableVariableOptions = getBotVariableOptions(customVariables, interactions, selectedInteraction?.type);
  const groupedInteractionTypes = [
    { label: "Tools", types: BOT_TOOL_TYPES },
    { label: "Interaction", types: BOT_INTERACTION_TYPES_GROUPED },
  ];

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
                  <dd className="mt-0.5 text-neutral-500">Input user terbaru. Dinamis sesuai chat aktif.</dd>
                </div>
                <div>
                  <dt className="font-mono font-semibold text-neutral-200">{"{context}"}</dt>
                  <dd className="mt-0.5 text-neutral-500">Hasil retrieval KB / data relevan yang sedang dipakai dalam node RAG.</dd>
                </div>
                <div>
                  <dt className="font-mono font-semibold text-neutral-200">{"{fullName}"}</dt>
                  <dd className="mt-0.5 text-neutral-500">Nama lengkap user login.</dd>
                </div>
                <div>
                  <dt className="font-mono font-semibold text-neutral-200">{"{email}"}</dt>
                  <dd className="mt-0.5 text-neutral-500">Email user login.</dd>
                </div>
                <div>
                  <dt className="font-mono font-semibold text-neutral-200">{"{username}"}</dt>
                  <dd className="mt-0.5 text-neutral-500">Username / nama akun user login.</dd>
                </div>
                <div>
                  <dt className="font-mono font-semibold text-neutral-200">{"{role}"}</dt>
                  <dd className="mt-0.5 text-neutral-500">Role user login saat ini, misalnya admin, manager, public_user.</dd>
                </div>
                {customVariables.length > 0 && <div className="rounded-md border border-neutral-800 bg-neutral-950/50 p-2">
                  <dt className="mb-2 text-[9px] uppercase tracking-wide text-neutral-500">Variabel manual</dt>
                  {customVariables.map((item) => (
                    <dd key={item.id} className="mt-1 font-mono text-neutral-200">{`{${item.name}}`}</dd>
                  ))}
                </div>}
              </dl>
            </div>}
          </div>
          <button type="button" onClick={() => setInteractionsOpen((open) => !open)} title={interactionsOpen ? "Sembunyikan daftar interaction" : "Tampilkan daftar interaction"} aria-label={interactionsOpen ? "Sembunyikan daftar interaction" : "Tampilkan daftar interaction"} aria-expanded={interactionsOpen} className="rounded-md border border-neutral-800 p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white">
            {interactionsOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          {selectedInteraction && <button type="button" onClick={() => setConfigOpen((open) => !open)} title="Properti interaction" aria-label="Properti interaction" aria-expanded={showConfiguration} className="rounded-md border border-neutral-800 p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white">
            <Settings2 className="h-4 w-4" />
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
      <ActionToast type="success" message={notice} />
      <ConfirmDialog
        open={confirmRemoveOpen}
        title="Hapus interaction?"
        message={selectedInteraction ? `Interaction "${interactionDisplayName(selectedInteraction)}" akan dihapus dari flow. Perubahan baru diterapkan setelah flow disimpan.` : ""}
        confirmLabel="Hapus interaction"
        onCancel={() => setConfirmRemoveOpen(false)}
        onConfirm={removeSelected}
      />

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
            <div className="space-y-4">
              {groupedInteractionTypes.map((group) => (
                <div key={group.label} className="space-y-2">
                  <p className="text-[9px] uppercase tracking-wide text-neutral-500">{group.label}</p>
                  <div className="flex gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible">
                    {group.types.map((type) => (
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
                </div>
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

        {showConfiguration && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfigOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="interaction-properties-title" className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-neutral-800 bg-[#080808] shadow-2xl">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-900 px-4 py-3">
            <div>
              <h2 id="interaction-properties-title" className="text-sm font-semibold text-white">Properti interaction</h2>
              <p className="mt-1 text-[10px] text-neutral-600">{selectedInteraction ? BOT_INTERACTION_LABELS[selectedInteraction.type] : "Pilih node untuk mengatur detail."}</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setConfigOpen(false)} aria-label="Tutup properti" title="Tutup properti" className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-900 hover:text-white"><X className="h-4 w-4" /></button>
              {selectedInteraction && <button type="button" onClick={() => setConfirmRemoveOpen(true)} disabled={interactions.length <= 1} aria-label="Hapus interaction" title="Hapus interaction" className="rounded-md p-1.5 text-neutral-600 hover:bg-red-950/50 hover:text-red-300 disabled:opacity-30"><Trash2 className="h-3.5 w-3.5" /></button>}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {selectedInteraction && <div className="space-y-1.5 rounded-md border border-neutral-800 bg-neutral-950/50 p-3">
              <TextField
                label="Nama interaction"
                value={selectedInteraction.config.name ?? interactionDisplayName(selectedInteraction)}
                onChange={(value) => updateConfig({ name: value })}
                placeholder={`Nama ${BOT_INTERACTION_LABELS[selectedInteraction.type]}`}
                variableOptions={availableVariableOptions}
              />
              <p className="text-[9px] leading-4 text-neutral-600">Nama ini digunakan pada node dan daftar interaction.</p>
            </div>}

            <div className="space-y-3 rounded-md border border-neutral-800 bg-[#090909] p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-neutral-500">Variabel lokal</p>
                  <p className="mt-1 text-[10px] text-neutral-600">Manual / static, bukan dinamis dari user login.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={variableDraft.name} onChange={(event) => setVariableDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Nama variabel" className="rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-[10px] text-neutral-200 outline-none placeholder:text-neutral-700 focus:border-neutral-600" />
                <input value={variableDraft.value} onChange={(event) => setVariableDraft((current) => ({ ...current, value: event.target.value }))} placeholder="Nilai variabel" className="rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-[10px] text-neutral-200 outline-none placeholder:text-neutral-700 focus:border-neutral-600" />
              </div>
              <button type="button" onClick={addCustomVariable} className="inline-flex items-center gap-1 text-[10px] text-neutral-300 hover:text-white"><Plus className="h-3 w-3" /> Tambah variabel</button>
              {customVariables.length > 0 && <div className="space-y-2">
                {customVariables.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-md border border-neutral-900 bg-black p-2">
                    <span className="font-mono text-[9px] text-neutral-200">{`{${item.name}}`}</span>
                    <input value={item.value} onChange={(event) => updateCustomVariable(item.id, { value: event.target.value })} className="min-w-0 flex-1 rounded border border-neutral-800 bg-[#080808] px-2 py-1 text-[10px] text-neutral-200 outline-none" />
                    <button type="button" onClick={() => removeCustomVariable(item.id)} aria-label="Hapus variabel manual" className="rounded p-1 text-neutral-600 hover:text-red-300"><Trash2 className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>}
            </div>

            <label className="block space-y-1.5 text-[10px] text-neutral-500">Entry interaction
              <select value={entryInteractionId} onChange={(event) => {
                setEntryInteractionId(event.target.value);
                setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, entry: node.id === event.target.value } })));
              }} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600">
                {interactions.map((item) => <option key={item.id} value={item.id}>{interactionDisplayName(item)}</option>)}
              </select>
            </label>

            {selectedInteraction ? (
              <>
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

                <div className="space-y-2 rounded-md border border-neutral-800 bg-neutral-950/40 p-2.5">
                  <p className="text-[9px] uppercase tracking-wide text-neutral-500">Variabel tersedia</p>
                  <div className="flex flex-wrap gap-1.5">
                    {availableVariableOptions.map((variable) => (
                      <span key={variable} className="rounded-full border border-neutral-800 bg-black px-2 py-1 font-mono text-[9px] text-neutral-300">{variable}</span>
                    ))}
                  </div>
                </div>

                {selectedInteraction.type === "guided_routing" && (
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-center gap-2 text-[10px] text-neutral-300">
                      <input type="checkbox" checked={selectedInteraction.config.fallbackMechanismEnabled !== false} onChange={(event) => updateConfig({ fallbackMechanismEnabled: event.target.checked })} className="accent-white" />
                      Aktifkan fallback mechanism saat route tidak ditemukan
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-[10px] text-neutral-300">
                      <input type="checkbox" checked={selectedInteraction.config.fallbackMessageEnabled !== false} onChange={(event) => updateConfig({ fallbackMessageEnabled: event.target.checked })} className="accent-white" />
                      Tampilkan pesan fallback saat route tidak ditemukan
                    </label>
                    {selectedInteraction.config.fallbackMessageEnabled !== false && <TextAreaField
                      label="Pesan fallback saat route tidak ditemukan"
                      value={selectedInteraction.config.fallbackMessage ?? "Maaf, saya belum bisa menentukan topik percakapan. Silakan coba kirim pesan lagi."}
                      onChange={(value) => updateConfig({ fallbackMessage: value })}
                      rows={3}
                      variableOptions={availableVariableOptions}
                    />}
                    {selectedInteraction.config.fallbackMechanismEnabled !== false && (
                      <label className="block space-y-1.5 text-[10px] text-neutral-500">Next interaction saat route tidak ditemukan
                        <select value={selectedInteraction.config.fallbackInteractionId || ""} onChange={(event) => updateConfig({ fallbackInteractionId: event.target.value || undefined })} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600">
                          <option value="">Tetap di Guided Routing</option>
                          {otherInteractions.map((item) => <option key={item.id} value={item.id}>{interactionDisplayName(item)}</option>)}
                        </select>
                      </label>
                    )}
                    <PromptSelector type="guided_routing" prompts={prompts} value={selectedInteraction.config.promptId || ""} onChange={(value) => updateConfig({ promptId: value })} onSave={savePromptTemplate} variableOptions={availableVariableOptions} />
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">LLM provider
                      <select value={selectedInteraction.config.provider === "lmstudio" || selectedInteraction.config.provider === "openrouter" ? selectedInteraction.config.provider : "global"} onChange={(event) => {
                        const provider = event.target.value as "global" | "lmstudio" | "openrouter";
                        if (provider === "global") updateConfig({ provider, model: "" });
                        else void selectRagProvider(provider);
                      }} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600">
                        <option value="global">Pengaturan global</option><option value="lmstudio">LM Studio</option><option value="openrouter">OpenRouter</option>
                      </select>
                    </label>
                    {(selectedInteraction.config.provider === "lmstudio" || selectedInteraction.config.provider === "openrouter") && <>
                      {selectedInteraction.config.provider !== "openrouter" && <div className="space-y-1.5">
                        <label className="block text-[10px] text-neutral-500">Base URL LM Studio
                          <input value={selectedInteraction.config.lmStudioUrl || "http://localhost:1234/v1"} onChange={(event) => updateConfig({ lmStudioUrl: event.target.value })} placeholder="http://localhost:1234/v1" className="mt-1.5 w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600" />
                        </label>
                        <button type="button" onClick={() => void selectRagProvider("lmstudio")} disabled={ragProviderTest?.status === "testing" && ragProviderTest.interactionId === selectedInteraction.id} className="inline-flex items-center gap-1.5 text-[10px] text-neutral-400 hover:text-white disabled:opacity-50">
                          {ragProviderTest?.status === "testing" && ragProviderTest.interactionId === selectedInteraction.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Uji koneksi dan muat model
                        </button>
                      </div>}
                      <label className="block space-y-1.5 text-[10px] text-neutral-500">Model
                        <select value={selectedInteraction.config.model || ""} onChange={(event) => updateConfig({ model: event.target.value })} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600">
                          {selectedInteraction.config.model && !ragProviderTest?.models.includes(selectedInteraction.config.model) && <option value={selectedInteraction.config.model}>{selectedInteraction.config.model} (tersimpan)</option>}
                          {(ragProviderTest?.interactionId === selectedInteraction.id ? ragProviderTest.models : []).map((model) => <option key={model} value={model}>{model}</option>)}
                          {!selectedInteraction.config.model && <option value="">Pilih model setelah uji koneksi</option>}
                        </select>
                      </label>
                      {ragProviderTest?.interactionId === selectedInteraction.id && <p role={ragProviderTest.status === "error" ? "alert" : "status"} className={`text-[10px] ${ragProviderTest.status === "error" ? "text-red-300" : ragProviderTest.status === "success" ? "text-emerald-300" : "text-neutral-500"}`}>{ragProviderTest.message}</p>}
                    </>}
                    <div className="space-y-2 border-t border-neutral-900 pt-3">
                      <div className="flex items-center justify-between"><span className="text-[10px] font-medium text-neutral-300">Pilihan route</span><button type="button" onClick={() => updateConfig({ options: [...(selectedInteraction.config.options || []), { label: "", variable: "", prompt: "", targetInteractionId: otherInteractions[0]?.id || "" }] })} className="inline-flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white"><Plus className="h-3 w-3" /> Tambah</button></div>
                      {(selectedInteraction.config.options || []).map((option, index) => <GuidedOptionFields key={`${selectedInteraction.id}-route-${index}`} option={option} interactions={otherInteractions} onChange={(patch) => setGuidedOption(index, patch)} onRemove={() => updateConfig({ options: selectedInteraction.config.options?.filter((_, itemIndex) => itemIndex !== index) })} />)}
                    </div>
                  </div>
                )}

                {selectedInteraction.type === "small_talk" && (
                  <div className="space-y-3">
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">LLM provider
                      <select value={selectedInteraction.config.provider === "openrouter" ? "openrouter" : "lmstudio"} onChange={(event) => void selectRagProvider(event.target.value as "lmstudio" | "openrouter")} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600">
                        <option value="lmstudio">LM Studio</option><option value="openrouter">OpenRouter</option>
                      </select>
                    </label>
                    {selectedInteraction.config.provider !== "openrouter" && <div className="space-y-1.5">
                      <label className="block text-[10px] text-neutral-500">Base URL LM Studio
                        <input value={selectedInteraction.config.lmStudioUrl || "http://localhost:1234/v1"} onChange={(event) => updateConfig({ lmStudioUrl: event.target.value })} placeholder="http://localhost:1234/v1" className="mt-1.5 w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600" />
                      </label>
                      <button type="button" onClick={() => void selectRagProvider("lmstudio")} disabled={ragProviderTest?.status === "testing" && ragProviderTest.interactionId === selectedInteraction.id} className="inline-flex items-center gap-1.5 text-[10px] text-neutral-400 hover:text-white disabled:opacity-50">
                        {ragProviderTest?.status === "testing" && ragProviderTest.interactionId === selectedInteraction.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Uji koneksi dan muat model
                      </button>
                    </div>}
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">Model
                      <select value={selectedInteraction.config.model || ""} onChange={(event) => updateConfig({ model: event.target.value })} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600">
                        {selectedInteraction.config.model && !ragProviderTest?.models.includes(selectedInteraction.config.model) && <option value={selectedInteraction.config.model}>{selectedInteraction.config.model} (tersimpan)</option>}
                        {(ragProviderTest?.interactionId === selectedInteraction.id ? ragProviderTest.models : []).map((model) => <option key={model} value={model}>{model}</option>)}
                        {!selectedInteraction.config.model && <option value="">Pilih model setelah uji koneksi</option>}
                      </select>
                    </label>
                    {ragProviderTest?.interactionId === selectedInteraction.id && <p role={ragProviderTest.status === "error" ? "alert" : "status"} className={`text-[10px] ${ragProviderTest.status === "error" ? "text-red-300" : ragProviderTest.status === "success" ? "text-emerald-300" : "text-neutral-500"}`}>{ragProviderTest.message}</p>}
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">Temperature: {selectedInteraction.config.temperature ?? 0.8}
                      <input type="range" min="0" max="2" step="0.1" value={selectedInteraction.config.temperature ?? 0.8} onChange={(event) => updateConfig({ temperature: Number(event.target.value) })} className="w-full accent-white" />
                    </label>
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">Max output tokens
                      <input type="number" min="64" max="8192" value={selectedInteraction.config.maxTokens ?? 400} onChange={(event) => updateConfig({ maxTokens: Math.max(64, Math.min(8192, Number(event.target.value) || 400)) })} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600" />
                    </label>
                    <PromptSelector type="small_talk" prompts={prompts} value={selectedInteraction.config.promptId || ""} onChange={(value) => updateConfig({ promptId: value })} onSave={savePromptTemplate} variableOptions={availableVariableOptions} />
                  </div>
                )}

                {selectedInteraction.type === "web_search" && (
                  <div className="space-y-3">
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">LLM provider
                      <select value={selectedInteraction.config.provider === "openrouter" ? "openrouter" : "lmstudio"} onChange={(event) => void selectRagProvider(event.target.value as "lmstudio" | "openrouter")} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600">
                        <option value="lmstudio">LM Studio</option><option value="openrouter">OpenRouter</option>
                      </select>
                    </label>
                    {selectedInteraction.config.provider !== "openrouter" && <div className="space-y-1.5">
                      <label className="block text-[10px] text-neutral-500">Base URL LM Studio
                        <input value={selectedInteraction.config.lmStudioUrl || "http://localhost:1234/v1"} onChange={(event) => updateConfig({ lmStudioUrl: event.target.value })} placeholder="http://localhost:1234/v1" className="mt-1.5 w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600" />
                      </label>
                      <button type="button" onClick={() => void selectRagProvider("lmstudio")} disabled={ragProviderTest?.status === "testing" && ragProviderTest.interactionId === selectedInteraction.id} className="inline-flex items-center gap-1.5 text-[10px] text-neutral-400 hover:text-white disabled:opacity-50">
                        {ragProviderTest?.status === "testing" && ragProviderTest.interactionId === selectedInteraction.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Uji koneksi dan muat model
                      </button>
                    </div>}
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">Model
                      <select value={selectedInteraction.config.model || ""} onChange={(event) => updateConfig({ model: event.target.value })} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600">
                        {selectedInteraction.config.model && !ragProviderTest?.models.includes(selectedInteraction.config.model) && <option value={selectedInteraction.config.model}>{selectedInteraction.config.model} (tersimpan)</option>}
                        {(ragProviderTest?.interactionId === selectedInteraction.id ? ragProviderTest.models : []).map((model) => <option key={model} value={model}>{model}</option>)}
                        {!selectedInteraction.config.model && <option value="">Pilih model setelah uji koneksi</option>}
                      </select>
                    </label>
                    {ragProviderTest?.interactionId === selectedInteraction.id && <p role={ragProviderTest.status === "error" ? "alert" : "status"} className={`text-[10px] ${ragProviderTest.status === "error" ? "text-red-300" : ragProviderTest.status === "success" ? "text-emerald-300" : "text-neutral-500"}`}>{ragProviderTest.message}</p>}
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">Temperature: {selectedInteraction.config.temperature ?? 0.7}
                      <input type="range" min="0" max="2" step="0.1" value={selectedInteraction.config.temperature ?? 0.7} onChange={(event) => updateConfig({ temperature: Number(event.target.value) })} className="w-full accent-white" />
                    </label>
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">Max output tokens
                      <input type="number" min="64" max="8192" value={selectedInteraction.config.maxTokens ?? 1024} onChange={(event) => updateConfig({ maxTokens: Math.max(64, Math.min(8192, Number(event.target.value) || 1024)) })} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600" />
                    </label>
                    <div className="border-t border-neutral-900 pt-3" />
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">Jumlah sumber web
                      <input type="number" min="1" max="10" value={selectedInteraction.config.webSearchMaxResults ?? 5} onChange={(event) => updateConfig({ webSearchMaxResults: Math.max(1, Math.min(10, Number(event.target.value) || 5)) })} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600" />
                    </label>
                    <TextAreaField label="Instruksi jawaban" value={selectedInteraction.config.systemPrompt || ""} onChange={(value) => updateConfig({ systemPrompt: value })} rows={5} variableOptions={availableVariableOptions} />
                    <p className="text-[10px] leading-4 text-neutral-600">Jawaban dibuat dari sumber web dan akan menyertakan tautan sitasi. Sebagian situs dapat membatasi akses otomatis.</p>
                  </div>
                )}

                {selectedInteraction.type === "data_collection" && (
                  <div className="space-y-3">
                    <div className="space-y-2 border-t border-neutral-900 pt-3">
                      <div className="flex items-center justify-between"><span className="text-[10px] font-medium text-neutral-300">Daftar pertanyaan</span><button type="button" disabled={(selectedInteraction.config.dataCollectionQuestions?.length || 0) >= 30} onClick={() => updateConfig({ dataCollectionQuestions: [...(selectedInteraction.config.dataCollectionQuestions || []), { name: `pertanyaan_${(selectedInteraction.config.dataCollectionQuestions?.length || 0) + 1}`, question: "", variable: `jawaban_${(selectedInteraction.config.dataCollectionQuestions?.length || 0) + 1}` }] })} className="inline-flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white disabled:opacity-40"><Plus className="h-3 w-3" />Tambah</button></div>
                      {(selectedInteraction.config.dataCollectionQuestions || []).map((question, index) => <DataCollectionQuestionFields key={`${selectedInteraction.id}-data-question-${index}`} question={question} index={index} canRemove={(selectedInteraction.config.dataCollectionQuestions?.length || 0) > 1} variableOptions={availableVariableOptions} onChange={(patch) => {
                        const questions = [...(selectedInteraction.config.dataCollectionQuestions || [])];
                        questions[index] = { ...questions[index], ...patch };
                        updateConfig({ dataCollectionQuestions: questions });
                      }} onRemove={() => updateConfig({ dataCollectionQuestions: selectedInteraction.config.dataCollectionQuestions?.filter((_, itemIndex) => itemIndex !== index) })} />)}
                    </div>
                    <div className="space-y-2 border-t border-neutral-900 pt-3">
                      <label className="flex items-center gap-2 text-[10px] text-neutral-300">
                        <input type="checkbox" checked={Boolean(selectedInteraction.config.dataCollectionValidator)} onChange={(event) => updateConfig({ dataCollectionValidator: event.target.checked ? {
                          confirmationQuestion: "Apakah ada data yang ingin diubah?",
                          confirmationButtons: [{ label: "Ya", action: "reply", value: "Ya", type: "true" }, { label: "Tidak", action: "reply", value: "Tidak", type: "false" }],
                          reviewQuestion: "Pilih data yang ingin diubah.",
                        } : undefined })} className="accent-white" />
                        Aktifkan validator akhir
                      </label>
                      {selectedInteraction.config.dataCollectionValidator && <DataCollectionValidatorFields
                        validator={selectedInteraction.config.dataCollectionValidator}
                        variableOptions={availableVariableOptions}
                        onChange={(dataCollectionValidator) => updateConfig({ dataCollectionValidator })}
                      />}
                    </div>
                  </div>
                )}

                {selectedInteraction.type === "data_collection_submitted" && (
                  <div className="space-y-3">
                    <p className="text-[10px] leading-4 text-neutral-500">Simpan nilai variabel sebagai record pada koleksi milik bot ini.</p>
                    <div className="space-y-2">
                      {(selectedInteraction.config.dataCollectionSubmittedFields || []).map((field, index) => (
                        <div key={`${selectedInteraction.id}-capture-${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                          <input
                            aria-label={`Nama field ${index + 1}`}
                            value={field.name}
                            onChange={(event) => {
                              const fields = [...(selectedInteraction.config.dataCollectionSubmittedFields || [])];
                              fields[index] = { ...fields[index], name: event.target.value };
                              updateConfig({ dataCollectionSubmittedFields: fields });
                            }}
                            placeholder="Nama field"
                            className="min-w-0 rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600"
                          />
                          <select
                            aria-label={`Variabel field ${index + 1}`}
                            value={field.variable}
                            onChange={(event) => {
                              const fields = [...(selectedInteraction.config.dataCollectionSubmittedFields || [])];
                              fields[index] = { ...fields[index], variable: event.target.value };
                              updateConfig({ dataCollectionSubmittedFields: fields });
                            }}
                            className="min-w-0 rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600"
                          >
                            <option value="">Pilih variabel</option>
                            {availableVariableOptions.map((variable) => <option key={variable} value={variable}>{variable}</option>)}
                          </select>
                          <button
                            type="button"
                            onClick={() => updateConfig({ dataCollectionSubmittedFields: selectedInteraction.config.dataCollectionSubmittedFields?.filter((_, itemIndex) => itemIndex !== index) })}
                            aria-label={`Hapus field ${index + 1}`}
                            className="rounded-md p-2 text-neutral-500 hover:bg-neutral-900 hover:text-red-300"
                          ><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => updateConfig({ dataCollectionSubmittedFields: [...(selectedInteraction.config.dataCollectionSubmittedFields || []), { name: "", variable: "" }] })}
                      disabled={(selectedInteraction.config.dataCollectionSubmittedFields?.length || 0) >= 30}
                      className="inline-flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white disabled:opacity-40"
                    ><Plus className="h-3 w-3" /> Tambah field</button>
                  </div>
                )}

                {selectedInteraction.type === "skill_escalation" && (
                  <div className="space-y-3">
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">Skill tujuan
                      <select value={selectedInteraction.config.escalationSkillId || ""} onChange={(event) => updateConfig({ escalationSkillId: event.target.value })} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600">
                        <option value="">Pilih skill</option>
                        {skills.filter((skill) => skill.botUser && skill.isAvailable).map((skill) => <option key={skill.id} value={skill.id}>{skill.name} · {skill.botUser?.userType === "bot" ? skill.bot?.name || "Bot" : "Human"}</option>)}
                      </select>
                    </label>
                    <p className="text-[10px] leading-4 text-neutral-600">Percakapan dialihkan ke user atau bot flow yang terhubung dengan skill ini.</p>
                    <label className="flex cursor-pointer items-center gap-2 text-[10px] text-neutral-300">
                      <input type="checkbox" checked={selectedInteraction.config.escalationMessageEnabled !== false} onChange={(event) => updateConfig({ escalationMessageEnabled: event.target.checked })} className="accent-white" />
                      Tampilkan pesan saat dialihkan
                    </label>
                    {selectedInteraction.config.escalationMessageEnabled !== false && <TextAreaField
                      label="Pesan"
                      value={selectedInteraction.config.escalationMessage || ""}
                      onChange={(value) => updateConfig({ escalationMessage: value })}
                      rows={3}
                      variableOptions={availableVariableOptions}
                    />}
                  </div>
                )}

                {selectedInteraction.type === "rag" && (
                  <div className="space-y-3">
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">Jumlah dokumen retrieval
                      <input type="number" min="1" max="10" value={selectedInteraction.config.ragDocumentMaxResults ?? 5} onChange={(event) => updateConfig({ ragDocumentMaxResults: Math.max(1, Math.min(10, Number(event.target.value) || 5)) })} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600" />
                    </label>
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">LLM provider
                      <select value={selectedInteraction.config.provider === "openrouter" ? "openrouter" : "lmstudio"} onChange={(event) => void selectRagProvider(event.target.value as "lmstudio" | "openrouter")} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600">
                        <option value="lmstudio">LM Studio</option><option value="openrouter">OpenRouter</option>
                      </select>
                    </label>
                    {selectedInteraction.config.provider !== "openrouter" && <div className="space-y-1.5">
                      <label className="block text-[10px] text-neutral-500">Base URL LM Studio
                        <input value={selectedInteraction.config.lmStudioUrl || "http://localhost:1234/v1"} onChange={(event) => updateConfig({ lmStudioUrl: event.target.value })} placeholder="http://localhost:1234/v1" className="mt-1.5 w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600" />
                      </label>
                      <button type="button" onClick={() => void selectRagProvider("lmstudio")} disabled={ragProviderTest?.status === "testing" && ragProviderTest.interactionId === selectedInteraction.id} className="inline-flex items-center gap-1.5 text-[10px] text-neutral-400 hover:text-white disabled:opacity-50">
                        {ragProviderTest?.status === "testing" && ragProviderTest.interactionId === selectedInteraction.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        Uji koneksi dan muat model
                      </button>
                    </div>}
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">Model
                      <select value={selectedInteraction.config.model || ""} onChange={(event) => updateConfig({ model: event.target.value })} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600">
                        {selectedInteraction.config.model && !ragProviderTest?.models.includes(selectedInteraction.config.model) && <option value={selectedInteraction.config.model}>{selectedInteraction.config.model} (tersimpan)</option>}
                        {(ragProviderTest?.interactionId === selectedInteraction.id ? ragProviderTest.models : []).map((model) => <option key={model} value={model}>{model}</option>)}
                        {!selectedInteraction.config.model && <option value="">Pilih model setelah uji koneksi</option>}
                      </select>
                    </label>
                    {ragProviderTest?.interactionId === selectedInteraction.id && <p role={ragProviderTest.status === "error" ? "alert" : "status"} className={`text-[10px] ${ragProviderTest.status === "error" ? "text-red-300" : ragProviderTest.status === "success" ? "text-emerald-300" : "text-neutral-500"}`}>{ragProviderTest.message}</p>}
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">Temperature: {selectedInteraction.config.temperature ?? 0.7}
                      <input type="range" min="0" max="2" step="0.1" value={selectedInteraction.config.temperature ?? 0.7} onChange={(event) => updateConfig({ temperature: Number(event.target.value) })} className="w-full accent-white" />
                    </label>
                    <label className="block space-y-1.5 text-[10px] text-neutral-500">Max output tokens
                      <input type="number" min="64" max="8192" value={selectedInteraction.config.maxTokens ?? 1024} onChange={(event) => updateConfig({ maxTokens: Math.max(64, Math.min(8192, Number(event.target.value) || 1024)) })} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600" />
                    </label>
                    <PromptSelector type="rag" prompts={prompts} value={selectedInteraction.config.promptId || ""} onChange={(value) => updateConfig({ promptId: value })} onSave={savePromptTemplate} variableOptions={availableVariableOptions} />
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

                {(selectedInteraction.type === "text" || selectedInteraction.type === "text_start") && <TextAreaField label="Pesan" value={selectedInteraction.config.text || ""} onChange={(value) => updateConfig({ text: value })} rows={6} variableOptions={availableVariableOptions} />}
                {selectedInteraction.type === "text_question" && (
                  <div className="space-y-3">
                    <TextAreaField label="Pertanyaan" value={selectedInteraction.config.question || ""} onChange={(value) => updateConfig({ question: value })} rows={4} variableOptions={availableVariableOptions} />
                    <div className="space-y-2 border-t border-neutral-900 pt-3">
                      <div className="flex items-center justify-between"><span className="text-[10px] font-medium text-neutral-300">Reply / Link button</span><button type="button" onClick={() => updateConfig({ quickButtons: [...(selectedInteraction.config.quickButtons || []), { label: "", action: "reply", value: "" }] })} className="inline-flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white"><Plus className="h-3 w-3" /> Tambah</button></div>
                      {(selectedInteraction.config.quickButtons || []).map((button, index) => <QuickButtonFields key={`${selectedInteraction.id}-quick-${index}`} button={button} onChange={(patch) => setQuickButton(index, patch)} onRemove={() => updateConfig({ quickButtons: selectedInteraction.config.quickButtons?.filter((_, itemIndex) => itemIndex !== index) })} />)}
                    </div>
                  </div>
                )}

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
                      {otherInteractions.map((item) => <option key={item.id} value={item.id}>{interactionDisplayName(item)}</option>)}
                    </select>
                  </label>}
                  <p className="text-[9px] leading-4 text-neutral-600">Hubungkan handle antar-node di canvas untuk mengatur next interaction secara visual.</p>
                </div>}
              </>
            ) : <p className="rounded-md border border-dashed border-neutral-800 px-3 py-8 text-center text-[10px] text-neutral-600">Pilih node di canvas atau tambahkan interaction.</p>}
          </div>
          </div>
          </section>
        </div>}
      </div>
    </div>
  );
}

function PromptSelector({ type, prompts, value, onChange, onSave, variableOptions }: { type: "guided_routing" | "small_talk" | "rag"; prompts: PromptOption[]; value: string; onChange: (value: string) => void; onSave: (promptId: string, content: string) => Promise<void>; variableOptions?: string[] }) {
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
        <VariableDropdown options={variableOptions || []} onInsert={(item) => setDraft((current) => `${current}${current.trim() ? " " : ""}${item}`)} />
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

function VariableDropdown({ options, onInsert }: { options: string[]; onInsert: (value: string) => void }) {
  if (!options.length) return null;
  return (
    <label className="block space-y-1.5 text-[10px] text-neutral-500">
      Variabel
      <select value="" onChange={(event) => {
        const selected = event.target.value;
        if (selected) {
          onInsert(selected);
          event.target.value = "";
        }
      }} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none focus:border-neutral-600">
        <option value="">Sisipkan variabel...</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function TextField({ label, value, onChange, placeholder, variableOptions }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; variableOptions?: string[] }) {
  return <div className="space-y-1.5"><VariableDropdown options={variableOptions || []} onInsert={(item) => onChange(`${value}${value.trim() ? " " : ""}${item}`)} /><label className="block space-y-1.5 text-[10px] text-neutral-500">{label}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs text-neutral-200 outline-none placeholder:text-neutral-700 focus:border-neutral-600" /></label></div>;
}

function DataCollectionQuestionFields({ question, index, canRemove, variableOptions, onChange, onRemove }: {
  question: DataCollectionQuestion;
  index: number;
  canRemove: boolean;
  variableOptions?: string[];
  onChange: (patch: Partial<DataCollectionQuestion>) => void;
  onRemove: () => void;
}) {
  const [componentType, setComponentType] = useState<DataCollectionComponent["type"]>("reply_buttons");
  const addComponent = () => {
    const component: DataCollectionComponent = {
      name: `Komponen ${(question.components?.length || 0) + 1}`,
      type: componentType,
      title: "",
      subtitle: "",
      buttons: [],
      card: componentType === "card" ? emptyDataCard() : null,
      cards: componentType === "carousel" ? [emptyDataCard()] : [],
    };
    onChange({ components: [...(question.components || []), component] });
  };
  return <div className="space-y-2 rounded-md border border-neutral-900 bg-black p-2.5">
    <div className="flex items-center justify-between"><span className="text-[9px] font-medium uppercase text-neutral-600">Pertanyaan {index + 1}</span><button type="button" onClick={onRemove} disabled={!canRemove} aria-label={`Hapus pertanyaan ${index + 1}`} className="rounded p-1 text-neutral-600 hover:text-red-300 disabled:opacity-30"><Trash2 className="h-3 w-3" /></button></div>
    <TextField label="Nama pertanyaan" value={question.name} onChange={(value) => onChange({ name: value })} placeholder="nama_lengkap" />
    <TextAreaField label="Pertanyaan text" value={question.question} onChange={(value) => onChange({ question: value })} rows={2} variableOptions={variableOptions} />
    <TextField label="Variable jawaban" value={question.variable || question.name} onChange={(value) => onChange({ variable: value })} placeholder="nama_lengkap" />
    <div className="space-y-2 border-t border-neutral-900 pt-2">
      <span className="text-[9px] font-medium text-neutral-400">Komponen pertanyaan</span>
      {(question.components || []).map((component, componentIndex) => <DataCollectionComponentFields key={`${index}-component-${componentIndex}`} component={component} variableOptions={variableOptions} onChange={(updated) => {
        const components = [...(question.components || [])];
        components[componentIndex] = updated;
        onChange({ components });
      }} onRemove={() => onChange({ components: question.components?.filter((_, itemIndex) => itemIndex !== componentIndex) })} />)}
      <div className="flex gap-1.5">
        <select value={componentType} onChange={(event) => setComponentType(event.target.value as DataCollectionComponent["type"])} className="min-w-0 flex-1 rounded-md border border-neutral-800 bg-black px-2 py-1.5 text-[10px] text-neutral-300">
          <option value="reply_buttons">Reply buttons</option><option value="link_buttons">Link buttons</option><option value="card">Card</option><option value="carousel">Carousel</option>
        </select>
        <button type="button" onClick={addComponent} disabled={(question.components?.length || 0) >= 5} className="inline-flex items-center gap-1 rounded border border-neutral-800 px-2 py-1.5 text-[10px] text-neutral-300 disabled:opacity-40"><Plus className="h-3 w-3" />Tambah</button>
      </div>
    </div>
  </div>;
}

function emptyDataCard(): DataCollectionComponentCard {
  return { imageUrl: "", imageHeight: 128, title: "", subtitle: "", buttons: [] };
}

function DataCollectionComponentFields({ component, variableOptions, onChange, onRemove }: {
  component: DataCollectionComponent;
  variableOptions?: string[];
  onChange: (component: DataCollectionComponent) => void;
  onRemove: () => void;
}) {
  const updateButtons = (buttons: BotQuickButton[]) => onChange({ ...component, buttons });
  const updateCard = (card: DataCollectionComponentCard) => onChange({ ...component, card });
  return <div className="space-y-2 rounded border border-neutral-900 p-2">
    <div className="flex items-center justify-between"><span className="text-[9px] uppercase text-neutral-500">{component.type.replaceAll("_", " ")}</span><button type="button" onClick={onRemove} aria-label="Hapus komponen pertanyaan" className="p-1 text-neutral-600 hover:text-red-300"><X className="h-3 w-3" /></button></div>
    <TextField label="Nama komponen" value={component.name} onChange={(name) => onChange({ ...component, name })} />
    {(component.type === "link_buttons") && <><TextField label="Judul" value={component.title} onChange={(title) => onChange({ ...component, title })} variableOptions={variableOptions} /><TextAreaField label="Deskripsi" value={component.subtitle} onChange={(subtitle) => onChange({ ...component, subtitle })} rows={2} variableOptions={variableOptions} /></>}
    {(component.type === "reply_buttons" || component.type === "link_buttons") && <div className="space-y-2">
      {component.buttons.map((button, index) => <QuickButtonFields key={index} button={button} onChange={(patch) => updateButtons(component.buttons.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch, action: component.type === "link_buttons" ? "link" : "reply" } : item))} onRemove={() => updateButtons(component.buttons.filter((_, itemIndex) => itemIndex !== index))} />)}
      <button type="button" onClick={() => updateButtons([...component.buttons, { label: "", action: component.type === "link_buttons" ? "link" : "reply", value: "" }])} className="inline-flex items-center gap-1 text-[9px] text-neutral-400"><Plus className="h-3 w-3" />Tambah tombol</button>
    </div>}
    {component.type === "card" && component.card && <DataCollectionCardFields card={component.card} onChange={updateCard} />}
    {component.type === "carousel" && <div className="space-y-2">
      {component.cards.map((card, index) => <div key={index} className="space-y-1"><div className="flex justify-end"><button type="button" onClick={() => onChange({ ...component, cards: component.cards.filter((_, cardIndex) => cardIndex !== index) })} className="text-[9px] text-neutral-500 hover:text-red-300">Hapus card</button></div><DataCollectionCardFields card={card} onChange={(updated) => onChange({ ...component, cards: component.cards.map((item, cardIndex) => cardIndex === index ? updated : item) })} /></div>)}
      <button type="button" onClick={() => onChange({ ...component, cards: [...component.cards, emptyDataCard()] })} disabled={component.cards.length >= 10} className="inline-flex items-center gap-1 text-[9px] text-neutral-400 disabled:opacity-40"><Plus className="h-3 w-3" />Tambah card</button>
    </div>}
  </div>;
}

function DataCollectionCardFields({ card, onChange }: { card: DataCollectionComponentCard; onChange: (card: DataCollectionComponentCard) => void }) {
  return <div className="space-y-2 rounded border border-neutral-900 bg-[#080808] p-2">
    <TextField label="Judul card" value={card.title} onChange={(title) => onChange({ ...card, title })} />
    <TextAreaField label="Deskripsi card" value={card.subtitle} onChange={(subtitle) => onChange({ ...card, subtitle })} rows={2} />
    <TextField label="URL gambar" value={card.imageUrl} onChange={(imageUrl) => onChange({ ...card, imageUrl })} placeholder="https://..." />
    <div className="space-y-1">
      {card.buttons.map((button, index) => <QuickButtonFields key={index} button={button} onChange={(patch) => onChange({ ...card, buttons: card.buttons.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) })} onRemove={() => onChange({ ...card, buttons: card.buttons.filter((_, itemIndex) => itemIndex !== index) })} />)}
      <button type="button" onClick={() => onChange({ ...card, buttons: [...card.buttons, { label: "", action: "reply", value: "" }] })} disabled={card.buttons.length >= 3} className="inline-flex items-center gap-1 text-[9px] text-neutral-400 disabled:opacity-40"><Plus className="h-3 w-3" />Tambah tombol card</button>
    </div>
  </div>;
}

function DataCollectionValidatorFields({ validator, variableOptions, onChange }: {
  validator: DataCollectionValidator;
  variableOptions?: string[];
  onChange: (validator: DataCollectionValidator) => void;
}) {
  return <div className="space-y-2 rounded-md border border-neutral-900 p-2.5">
    <TextAreaField label="Pertanyaan konfirmasi" value={validator.confirmationQuestion} onChange={(confirmationQuestion) => onChange({ ...validator, confirmationQuestion })} rows={2} variableOptions={variableOptions} />
    <div className="space-y-2">
      <div className="flex items-center justify-between"><span className="text-[9px] text-neutral-500">Tombol konfirmasi</span><button type="button" onClick={() => onChange({ ...validator, confirmationButtons: [...validator.confirmationButtons, { label: "", action: "reply", value: "", type: "false" }] })} disabled={validator.confirmationButtons.length >= 8} className="text-[9px] text-neutral-300 disabled:opacity-40"><Plus className="inline h-3 w-3" /> Tambah</button></div>
      {validator.confirmationButtons.map((button, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-1.5"><input value={button.label} onChange={(event) => onChange({ ...validator, confirmationButtons: validator.confirmationButtons.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) })} placeholder="Label tombol" aria-label="Label tombol konfirmasi" className="min-w-0 rounded border border-neutral-800 bg-black px-2 py-1.5 text-[10px] text-white" /><input value={button.value} onChange={(event) => onChange({ ...validator, confirmationButtons: validator.confirmationButtons.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item) })} placeholder="Teks balasan di chat" aria-label="Teks balasan tombol konfirmasi" className="min-w-0 rounded border border-neutral-800 bg-black px-2 py-1.5 text-[10px] text-neutral-300" /><select value={button.type} onChange={(event) => onChange({ ...validator, confirmationButtons: validator.confirmationButtons.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value as "true" | "false" } : item) })} aria-label="Tipe internal tombol konfirmasi" className="rounded border border-neutral-800 bg-black px-1.5 py-1.5 text-[10px] text-neutral-300"><option value="true">true</option><option value="false">false</option></select><button type="button" onClick={() => onChange({ ...validator, confirmationButtons: validator.confirmationButtons.filter((_, itemIndex) => itemIndex !== index) })} aria-label="Hapus tombol konfirmasi" className="p-1 text-neutral-600 hover:text-red-300"><X className="h-3 w-3" /></button></div>)}
    </div>
    <TextAreaField label="Pertanyaan pemilihan data revisi" value={validator.reviewQuestion} onChange={(reviewQuestion) => onChange({ ...validator, reviewQuestion })} rows={2} variableOptions={variableOptions} />
  </div>;
}

function TextAreaField({ label, value, onChange, rows = 4, variableOptions }: { label: string; value: string; onChange: (value: string) => void; rows?: number; variableOptions?: string[] }) {
  return <div className="space-y-1.5"><VariableDropdown options={variableOptions || []} onInsert={(item) => onChange(`${value}${value.trim() ? " " : ""}${item}`)} /><label className="block space-y-1.5 text-[10px] text-neutral-500">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="w-full resize-y rounded-md border border-neutral-800 bg-black px-2.5 py-2 text-xs leading-5 text-neutral-200 outline-none placeholder:text-neutral-700 focus:border-neutral-600" /></label></div>;
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
        {interactions.map((item) => <option key={item.id} value={item.id}>{interactionDisplayName(item)}</option>)}
      </select>
    </div>
  );
}

export default function BotFlowEditorPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = use(params);
  const { created } = use(searchParams);
  return <ReactFlowProvider><FlowEditor botId={id} initialNotice={created === "1" ? "Bot berhasil dibuat." : ""} /></ReactFlowProvider>;
}
