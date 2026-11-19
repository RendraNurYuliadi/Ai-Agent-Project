import { ObjectId, type Db } from "mongodb";
import type {
  EngagementEntryPoint,
  EngagementWindow,
} from "@/types/engagement";
import { getDefaultComponentStyles } from "@/lib/engagement-theme";

export function normalizeEngagementOrigin(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function parseEngagementEntryPoints(value: unknown): EngagementEntryPoint[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;
  const result: EngagementEntryPoint[] = [];
  const ids = new Set<string>();
  const origins = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const candidate = item as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    const origin = normalizeEngagementOrigin(candidate.origin);
    if (!id || id.length > 80 || !name || name.length > 80 || !origin) return null;
    if (ids.has(id) || origins.has(origin)) return null;
    ids.add(id);
    origins.add(origin);
    result.push({ id, name, origin });
  }

  return result;
}

export function parseEngagementWindows(value: unknown): EngagementWindow[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;
  const result: EngagementWindow[] = [];
  const ids = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const candidate = item as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    const skillId = typeof candidate.skillId === "string" ? candidate.skillId.trim() : "";
    const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
    const subtitle = typeof candidate.subtitle === "string" ? candidate.subtitle.trim() : "";
    const accentValue = typeof candidate.accentColor === "string" ? candidate.accentColor.trim() : "";
    const accentColor = accentValue.toLowerCase() === "#2563eb" ? "#171717" : accentValue;
    const headerIconUrl = typeof candidate.headerIconUrl === "string" ? candidate.headerIconUrl.trim() : "";
    const backgroundValue = typeof candidate.backgroundColor === "string" ? candidate.backgroundColor.trim() : "";
    const lineValue = typeof candidate.lineColor === "string" ? candidate.lineColor.trim() : "";
    const backgroundColor = backgroundValue.toLowerCase() === "#080808" ? "#ffffff" : (backgroundValue || "#ffffff");
    const lineColor = lineValue.toLowerCase() === "#262626" ? "#e5e5e5" : (lineValue || "#e5e5e5");
    const borderRadius = typeof candidate.borderRadius === "number"
      ? Math.min(32, Math.max(0, Math.round(candidate.borderRadius)))
      : 16;
    const allowClose = candidate.allowClose !== false;
    const rawComponentStyles =
      candidate.componentStyles && typeof candidate.componentStyles === "object" && !Array.isArray(candidate.componentStyles)
        ? candidate.componentStyles as Record<string, unknown>
        : {};
    const defaults = getDefaultComponentStyles();
    const componentStyles = Object.fromEntries(
      Object.entries(defaults).map(([key, defaultCss]) => [
        key,
        typeof rawComponentStyles[key] === "string"
          ? String(rawComponentStyles[key]).slice(0, 10000)
          : defaultCss,
      ])
    );
    const customCss = typeof candidate.customCss === "string"
      ? candidate.customCss
          .slice(0, 20000)
          .replace(/@import\b[^;]+;?/gi, "")
          .replace(/expression\s*\([^)]*\)/gi, "")
          .replace(/behavior\s*:/gi, "")
      : "";
    if (headerIconUrl && headerIconUrl.length > 2048) return null;
    if (headerIconUrl) {
      try {
        const iconUrl = new URL(headerIconUrl);
        if (!["http:", "https:"].includes(iconUrl.protocol) || iconUrl.username || iconUrl.password) return null;
      } catch {
        return null;
      }
    }
    if (
      !id || id.length > 80 || ids.has(id) ||
      !name || name.length > 80 ||
      !ObjectId.isValid(skillId) ||
      !title || title.length > 80 ||
      subtitle.length > 160 ||
      !/^#[0-9a-fA-F]{6}$/.test(accentColor) ||
      !/^#[0-9a-fA-F]{6}$/.test(backgroundColor) ||
      !/^#[0-9a-fA-F]{6}$/.test(lineColor)
    ) {
      return null;
    }
    ids.add(id);
    result.push({
      id,
      name,
      skillId,
      title,
      subtitle,
      accentColor,
      headerIconUrl,
      backgroundColor,
      lineColor,
      borderRadius,
      allowClose,
      customCss,
      componentStyles,
    });
  }

  return result;
}

export async function isActiveBotSkill(db: Db, skillId: string): Promise<boolean> {
  if (!ObjectId.isValid(skillId)) return false;
  const skill = await db.collection("skills").findOne({ _id: new ObjectId(skillId) });
  if (!skill || !ObjectId.isValid(skill.botUserId) || !ObjectId.isValid(skill.botId)) return false;

  const [botUser, bot, activeSetting] = await Promise.all([
    db.collection("users").findOne(
      { _id: new ObjectId(skill.botUserId), userType: "bot" },
      { projection: { _id: 1 } }
    ),
    db.collection("bots").findOne({ _id: new ObjectId(skill.botId) }, { projection: { isActive: 1 } }),
    db.collection("botSettings").findOne({ key: "active" }, { projection: { botId: 1 } }),
  ]);
  if (!botUser || !bot) return false;
  return typeof bot.isActive === "boolean"
    ? bot.isActive
    : bot._id.toString() === activeSetting?.botId;
}
