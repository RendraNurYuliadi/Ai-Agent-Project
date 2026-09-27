import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDatabase();
    const usersCol = db.collection("users");

    // 1. Users statistics
    const [totalUsers, recentUsers, rolesAgg] = await Promise.all([
      usersCol.countDocuments(),
      usersCol
        .find({}, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
      usersCol
        .aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }])
        .toArray(),
    ]);

    const rolesCount: Record<string, number> = {
      admin: 0,
      manager: 0,
      public_user: 0,
    };
    rolesAgg.forEach((item) => {
      if (item._id) rolesCount[item._id] = item.count;
    });

    // 2. Chatbot & System statistics
    const [totalConversations, totalPrompts, totalFlows] = await Promise.all([
      db.collection("conversations").countDocuments(),
      db.collection("prompts").countDocuments(),
      db.collection("flowDialogs").countDocuments(),
    ]);

    // 3. Dynamic Knowledge Base statistics across all kb_* collections
    const allDbCollections = await db.listCollections().toArray();
    const kbMetaDocs = await db.collection("knowledgeBases").find({}).toArray();
    const metaMap = new Map(kbMetaDocs.map((k) => [k.collectionName, k.displayName]));

    const kbColls = Array.from(
      new Set([
        ...kbMetaDocs.map((k) => k.collectionName),
        ...allDbCollections.map((c) => c.name).filter((n) => n.startsWith("kb_")),
      ])
    );

    let totalArticles = 0;
    const allRecentArticles: Array<{
      id: string;
      title: string;
      category: string;
      summary: string;
      collection: string;
      kbName: string;
      createdAt: Date | string;
    }> = [];

    const categoriesCountMap: Record<string, number> = {};

    for (const coll of kbColls) {
      try {
        const count = await db.collection(coll).countDocuments();
        totalArticles += count;

        const docs = await db
          .collection(coll)
          .find({})
          .sort({ createdAt: -1 })
          .limit(8)
          .toArray();

        for (const doc of docs) {
          const category = (doc.category as string) || "General";
          categoriesCountMap[category] = (categoriesCountMap[category] || 0) + 1;

          allRecentArticles.push({
            id: doc._id.toString(),
            title: (doc.title as string) || "Untitled Article",
            category,
            summary: (doc.summary as string) || (doc.detail as string) || (doc.content as string) || "",
            collection: coll,
            kbName: metaMap.get(coll) || coll,
            createdAt: (doc.createdAt as Date) || new Date(),
          });
        }
      } catch {
        // Skip unaccessible collection
      }
    }

    // Sort recent articles across all collections
    allRecentArticles.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    const categoriesSorted = Object.entries(categoriesCountMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalArticles,
        totalKbs: kbColls.length,
        totalConversations,
        totalPrompts,
        totalFlows,
        rolesCount,
        categories: categoriesSorted,
      },
      recentUsers: recentUsers.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
      })),
      recentArticles: allRecentArticles.slice(0, 6),
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
}
