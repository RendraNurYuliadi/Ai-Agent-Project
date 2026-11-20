import { headers } from "next/headers";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { normalizeEngagementOrigin } from "@/lib/engagement-data";
import {
  migrateLegacyComponentStyles,
  normalizeGlobalChatStyles,
} from "@/lib/engagement-theme";
import { isChatScrollAnimationStyle } from "@/lib/chat-ui-preferences";
import { signEngagementWidgetToken } from "@/lib/engagement-auth";
import type { EngagementWidgetConfig } from "@/types/engagement";
import EngagementChatWidget from "@/components/engagement-chat-widget";

export const dynamic = "force-dynamic";

export default async function EngagementWidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ engagementId: string; windowId: string }>;
  searchParams: Promise<{ entryPointId?: string }>;
}) {
  const { engagementId, windowId } = await params;
  const { entryPointId } = await searchParams;
  const requestHeaders = await headers();
  const requestOrigin = normalizeEngagementOrigin(requestHeaders.get("referer"));

  if (!ObjectId.isValid(engagementId) || !requestOrigin || !entryPointId) {
    return <UnavailableWidget />;
  }

  const db = await getDatabase();
  const engagement = await db.collection("engagements").findOne({
    _id: new ObjectId(engagementId),
    isActive: true,
  });
  const entryPoint = engagement?.entryPoints?.find(
    (item: { id: string; origin: string }) =>
      item.id === entryPointId && item.origin === requestOrigin
  );
  const windowConfig = engagement?.windows?.find(
    (item: { id: string }) => item.id === windowId
  );
  if (!engagement || !entryPoint || !windowConfig) {
    return <UnavailableWidget />;
  }

  const globalStyleSetting = await db.collection("botSettings").findOne(
    { key: "globalChatStyles", userId: engagement.createdBy },
    { projection: { componentStyles: 1 } }
  ) || await db.collection("botSettings").findOne(
    { key: "globalChatStyles", userId: { $exists: false } },
    { projection: { componentStyles: 1 } }
  );
  const componentStyles = {
    ...migrateLegacyComponentStyles(
      windowConfig.componentStyles && typeof windowConfig.componentStyles === "object"
        ? windowConfig.componentStyles as Record<string, string>
        : {}
    ),
    ...normalizeGlobalChatStyles(globalStyleSetting?.componentStyles),
  };

  const widgetConfig: EngagementWidgetConfig = {
    engagementId,
    windowId,
    entryPointId: entryPoint.id,
    parentOrigin: entryPoint.origin,
    token: await signEngagementWidgetToken({
      engagementId,
      windowId,
      entryPointId: entryPoint.id,
      origin: requestOrigin,
    }),
    window: {
      id: windowConfig.id,
      name: windowConfig.name,
      skillId: windowConfig.skillId,
      title: windowConfig.title,
      subtitle: windowConfig.subtitle,
      accentColor: windowConfig.accentColor,
      headerIconUrl: windowConfig.headerIconUrl || "",
      sendIconUrl: windowConfig.sendIconUrl || "",
      backgroundColor: windowConfig.backgroundColor || "#ffffff",
      lineColor: windowConfig.lineColor || "#e5e5e5",
      borderRadius: typeof windowConfig.borderRadius === "number" ? windowConfig.borderRadius : 16,
      allowClose: windowConfig.allowClose !== false,
      windowAnimationStyle: isChatScrollAnimationStyle(windowConfig.windowAnimationStyle)
        ? windowConfig.windowAnimationStyle
        : "pop",
      bubbleAnimationEnabled: windowConfig.bubbleAnimationEnabled === true,
      bubbleAnimationStyle: isChatScrollAnimationStyle(windowConfig.bubbleAnimationStyle)
        ? windowConfig.bubbleAnimationStyle
        : "fade",
      customCss: typeof windowConfig.customCss === "string" ? windowConfig.customCss : "",
      componentStyles,
    },
  };

  return <EngagementChatWidget config={widgetConfig} />;
}

function UnavailableWidget() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080808] p-6 text-center text-sm text-neutral-400">
      Chat ini tidak tersedia untuk website ini.
    </main>
  );
}
