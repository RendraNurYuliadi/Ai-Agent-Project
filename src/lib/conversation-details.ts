import { ObjectId, type Db } from "mongodb";

function asObjectId(value: unknown): ObjectId | null {
  if (typeof value !== "string" || !ObjectId.isValid(value)) return null;
  return new ObjectId(value);
}

function idString(value: unknown): string {
  return value instanceof ObjectId ? value.toString() : typeof value === "string" ? value : "";
}

export async function getConversationRelations(db: Db, conversation: Record<string, unknown>) {
  const skillId = asObjectId(conversation.skillId);
  const skill = skillId
    ? await db.collection("skills").findOne({ _id: skillId }, { projection: { name: 1, description: 1, botUserId: 1, botId: 1, createdAt: 1 } })
    : null;
  const userIds = [...new Set([
    idString(conversation.userId),
    idString(conversation.botUserId),
    idString(skill?.botUserId),
  ].filter((id) => ObjectId.isValid(id)))].map((id) => new ObjectId(id));
  const botIds = [...new Set([
    idString(conversation.botId),
    idString(skill?.botId),
  ].filter((id) => ObjectId.isValid(id)))].map((id) => new ObjectId(id));

  const [users, bots, activeSetting] = await Promise.all([
    userIds.length
      ? db.collection("users").find({ _id: { $in: userIds } }, { projection: { name: 1, fullName: 1, email: 1, role: 1, userType: 1, createdAt: 1 } }).toArray()
      : Promise.resolve([]),
    botIds.length
      ? db.collection("bots").find({ _id: { $in: botIds } }, { projection: { name: 1, description: 1, isActive: 1, createdAt: 1, updatedAt: 1, interactions: 1 } }).toArray()
      : Promise.resolve([]),
    db.collection("botSettings").findOne({ key: "active" }, { projection: { botId: 1 } }),
  ]);

  const userById = new Map(users.map((user) => [user._id.toString(), user]));
  const botById = new Map(bots.map((bot) => [bot._id.toString(), bot]));
  const userId = idString(conversation.userId);
  const botUserId = idString(conversation.botUserId || skill?.botUserId);
  const botId = idString(conversation.botId || skill?.botId);
  const user = userById.get(userId);
  const botUser = userById.get(botUserId);
  const bot = botById.get(botId);

  return {
    user: user ? {
      id: user._id.toString(),
      name: user.name || "",
      fullName: user.fullName || user.name || "",
      email: user.email || "",
      role: user.role || "public_user",
      userType: user.userType === "bot" ? "bot" : "human",
      createdAt: user.createdAt || null,
    } : null,
    botUser: botUser ? {
      id: botUser._id.toString(),
      name: botUser.name || "",
      fullName: botUser.fullName || botUser.name || "",
      email: botUser.email || "",
      role: botUser.role || "public_user",
      userType: botUser.userType === "bot" ? "bot" : "human",
    } : null,
    bot: bot ? {
      id: bot._id.toString(),
      name: bot.name || "Bot",
      description: bot.description || "",
      isActive: typeof bot.isActive === "boolean" ? bot.isActive : activeSetting?.botId === botId,
      interactionCount: Array.isArray(bot.interactions) ? bot.interactions.length : 0,
      createdAt: bot.createdAt || null,
      updatedAt: bot.updatedAt || null,
    } : null,
    skill: skill ? {
      id: skill._id.toString(),
      name: skill.name || "Skill",
      description: skill.description || "",
    } : null,
  };
}