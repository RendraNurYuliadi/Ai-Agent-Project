import { MongoClient } from "mongodb";

// Stop words definition
const STOP_WORDS = new Set([
  "di", "ke", "dari", "pada", "dalam", "untuk", "dengan", "dan", "atau", "yang",
  "ini", "itu", "adalah", "yaitu", "merupakan", "sebagai", "bagi", "oleh",
  "antara", "tentang", "terkait", "secara", "karena", "sebab", "serta",
  "apa", "siapa", "kapan", "dimana", "mana", "mengapa", "kenapa", "bagaimana",
  "berapa", "apakah", "siapakah", "kemanakah", "darimanakah", "manakah",
  "saya", "aku", "kamu", "dia", "mereka", "kita", "kami", "anda", "ia",
  "bisa", "dapat", "akan", "telah", "sudah", "sedang", "lagi", "pun", "juga",
  "hanya", "saja", "ada", "tidak", "bukan", "belum", "sangat", "lebih",
]);

function normalizeQuery(query) {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTokens(query) {
  const normalized = normalizeQuery(query);
  const rawTokens = normalized.split(/\s+/).filter((t) => t.length > 0);
  const cleanTokens = rawTokens.filter((t) => !STOP_WORDS.has(t) && t.length > 1);
  return { tokens: rawTokens, cleanTokens: cleanTokens.length > 0 ? cleanTokens : rawTokens };
}

function countOccurrences(text, term) {
  if (!text || !term) return 0;
  const regex = new RegExp(`\\b${term}\\b`, "gi");
  const matches = text.match(regex);
  if (matches) return matches.length;
  return text.toLowerCase().includes(term.toLowerCase()) ? 1 : 0;
}

function scoreArticle(doc, collectionName, cleanTokens, normalizedQuery) {
  const title = String(doc.title || "");
  const category = String(doc.category || "");
  const summary = String(doc.summary || "");
  const detail = String(doc.detail || "");
  const content = String(doc.content || "");

  let tagsArray = [];
  if (Array.isArray(doc.tags)) tagsArray = doc.tags.map(String);
  else if (typeof doc.tags === "string") tagsArray = doc.tags.split(",").map((t) => t.trim()).filter(Boolean);

  const titleLower = title.toLowerCase();
  const categoryLower = category.toLowerCase();
  const summaryLower = summary.toLowerCase();
  const detailLower = detail.toLowerCase();
  const contentLower = content.toLowerCase();
  const tagsLower = tagsArray.map((t) => t.toLowerCase());

  let totalScore = 0;
  const matchedKeywordsSet = new Set();

  if (normalizedQuery.length > 3) {
    if (titleLower.includes(normalizedQuery)) totalScore += 30;
    if (contentLower.includes(normalizedQuery) || detailLower.includes(normalizedQuery) || summaryLower.includes(normalizedQuery)) {
      totalScore += 20;
    }
  }

  for (const token of cleanTokens) {
    let tokenMatched = false;

    // 1. Title
    const titleCount = countOccurrences(titleLower, token);
    if (titleCount > 0) {
      totalScore += 12 * titleCount;
      tokenMatched = true;
    }

    // 2. Tags
    for (const tag of tagsLower) {
      if (tag === token) {
        totalScore += 10;
        tokenMatched = true;
      } else if (tag.includes(token)) {
        totalScore += 5;
        tokenMatched = true;
      }
    }

    // 3. Category
    if (categoryLower === token) {
      totalScore += 8;
      tokenMatched = true;
    } else if (categoryLower.includes(token)) {
      totalScore += 4;
      tokenMatched = true;
    }

    // 4. Summary / Detail
    const sumCount = countOccurrences(summaryLower, token);
    if (sumCount > 0) {
      totalScore += 5 * sumCount;
      tokenMatched = true;
    }

    const detCount = countOccurrences(detailLower, token);
    if (detCount > 0) {
      totalScore += 5 * detCount;
      tokenMatched = true;
    }

    // 5. Content
    const contCount = countOccurrences(contentLower, token);
    if (contCount > 0) {
      totalScore += 3 * contCount;
      tokenMatched = true;
    }

    if (tokenMatched) matchedKeywordsSet.add(token);
  }

  const matchedCount = matchedKeywordsSet.size;
  if (cleanTokens.length > 0) {
    const coverage = matchedCount / cleanTokens.length;
    if (coverage === 1) totalScore += 25;
    else if (coverage >= 0.5) totalScore += 12;
    totalScore += matchedCount * 4;
  }

  return {
    id: doc._id ? doc._id.toString() : String(doc.id || ""),
    collectionName,
    title: title || "Tanpa Judul",
    category: category || "General",
    summary,
    content: content || detail || summary,
    detail,
    tags: tagsArray,
    score: Math.round(totalScore),
    matchedKeywords: Array.from(matchedKeywordsSet),
  };
}

async function runTest() {
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("aiChatbot");

  const query = "rendra kuliah di mana dan apa jurusannya?";
  console.log("=== 1. QUERY ===");
  console.log(`"${query}"\n`);

  const normalizedQuery = normalizeQuery(query);
  const { cleanTokens } = extractTokens(query);
  console.log("Normalized Query:", `"${normalizedQuery}"`);
  console.log("Tokens sesudah buang stop words:", cleanTokens, "\n");

  // Get active collections
  const kbs = await db.collection("knowledgeBases").find({}).toArray();
  const collectionsToSearch = kbs.map((k) => k.collectionName);

  const allScored = [];
  for (const coll of collectionsToSearch) {
    const docs = await db.collection(coll).find({}).toArray();
    for (const doc of docs) {
      const scored = scoreArticle(doc, coll, cleanTokens, normalizedQuery);
      if (scored.score > 0) {
        allScored.push(scored);
      }
    }
  }

  allScored.sort((a, b) => b.score - a.score);
  const top5 = allScored.slice(0, 5);

  console.log("=== 2. TOP 5 ARTIKEL HASIL RANKING & SCORE ===");
  top5.forEach((art, idx) => {
    console.log(`${idx + 1}. [Score: ${art.score}] ${art.title} (Kategori: ${art.category})`);
    console.log(`   Keywords Cocok: [${art.matchedKeywords.join(", ")}]`);
    console.log(`   Ringkasan: ${art.summary || art.content || "-"}`);
    console.log(`   Tags: ${art.tags.join(", ") || "-"}\n`);
  });

  const formattedContext = top5
    .map((art, idx) => {
      const parts = [`[Artikel ${idx + 1}: ${art.title}]`, `Kategori: ${art.category}`];
      if (art.tags.length > 0) parts.push(`Tags: ${art.tags.join(", ")}`);
      if (art.summary) parts.push(`Ringkasan: ${art.summary}`);
      if (art.detail && art.detail !== art.summary) parts.push(`Detail: ${art.detail}`);
      if (art.content && art.content !== art.detail && art.content !== art.summary) parts.push(`Konten: ${art.content}`);
      return parts.join("\n");
    })
    .join("\n\n");

  const systemPrompt = `Jawab berdasarkan knowledge context yang diberikan.
Jika informasi tidak terdapat dalam context, katakan informasi tidak ditemukan.
Jangan mengarang informasi.

KNOWLEDGE CONTEXT:
${formattedContext}`;

  console.log("=== 3. CONTEXT YANG DIKIRIM KE LM STUDIO ===");
  console.log("--- SYSTEM PROMPT ---");
  console.log(systemPrompt);
  console.log("--- USER MESSAGE ---");
  console.log(query);
  console.log("\n");

  console.log("=== 4. HASIL RESPONSE AI ===");
  // Test LM Studio connection
  const genaiConfig = await db.collection("genaiConfig").findOne({ key: "lmstudio" });
  const lmStudioUrl = genaiConfig?.baseUrl || "http://localhost:1234/v1";
  const lmStudioModel = genaiConfig?.model || "local-model";

  try {
    const res = await fetch(`${lmStudioUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: lmStudioModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        temperature: 0.7,
        max_tokens: 512,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const data = await res.json();
      console.log("[Status: LM Studio Online]");
      console.log(data.choices?.[0]?.message?.content);
    } else {
      console.log(`[Status: LM Studio Offline / HTTP ${res.status}]`);
      console.log("Fallback response berdasarkan Top 5 context:");
      const top1 = top5[0];
      console.log(`Berdasarkan data Knowledge Base (${top1.title}): ${top1.detail || top1.summary}`);
    }
  } catch (err) {
    console.log("[Status: LM Studio Offline / Server belum berjalan di port 1234]");
    console.log("Fallback response berdasarkan Top 5 context:");
    const top1 = top5[0];
    console.log(`Berdasarkan data Knowledge Base (${top1.title}): ${top1.detail || top1.summary}`);
  }

  await client.close();
}

runTest().catch(console.error);
