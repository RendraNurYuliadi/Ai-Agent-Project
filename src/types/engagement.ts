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
  backgroundColor: string;
  lineColor: string;
  borderRadius: number;
  allowClose: boolean;
  customCss: string;
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
