import type { ChatScrollAnimationStyle } from "@/lib/chat-ui-preferences";

export const ENGAGEMENT_WINDOW_POSITIONS = [
  "bottom-right",
  "bottom-left",
  "top-right",
  "top-left",
] as const;

export type EngagementWindowPosition = typeof ENGAGEMENT_WINDOW_POSITIONS[number];

export interface EngagementEntryPoint {
  id: string;
  name: string;
  origin: string;
}

export interface EngagementWindow {
  id: string;
  name: string;
  skillId: string;
  title: string;
  subtitle: string;
  accentColor: string;
  headerIconUrl: string;
  sendIconUrl: string;
  backgroundColor: string;
  lineColor: string;
  borderRadius: number;
  launcherPosition: EngagementWindowPosition;
  launcherOffsetX: number;
  launcherOffsetY: number;
  allowClose: boolean;
  windowAnimationStyle: ChatScrollAnimationStyle;
  bubbleAnimationEnabled: boolean;
  bubbleAnimationStyle: ChatScrollAnimationStyle;
  customCss: string;
  componentStylesMode: "global" | "specific";
  componentStyles: Record<string, string>;
}

export interface EngagementRecord {
  id: string;
  name: string;
  isActive: boolean;
  entryPoints: EngagementEntryPoint[];
  windows: EngagementWindow[];
  createdAt: string;
  updatedAt: string;
}

export interface EngagementWidgetConfig {
  engagementId: string;
  windowId: string;
  entryPointId: string;
  parentOrigin: string;
  token: string;
  window: EngagementWindow;
}
