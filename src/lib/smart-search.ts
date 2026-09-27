import { Db, ObjectId } from "mongodb";

export interface ScoredArticle {
  id: string;
  collectionName: string;
  kbName?: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  detail?: string;
  tags: string[];
  score: number;
  matchedKeywords: string[];
  raw: Record<string, unknown>;
}

export const STOP_WORDS = new Set([
  // Kata hubung, preposisi, partikel Indonesia
  "di", "ke", "dari", "pada", "dalam", "untuk", "dengan", "dan", "atau", "yang",
  "ini", "itu", "adalah", "yaitu", "merupakan", "sebagai", "bagi", "oleh",
  "antara", "tentang", "terkait", "secara", "karena", "sebab", "serta",
  // Kata tanya
  "apa", "siapa", "kapan", "dimana", "mana", "mengapa", "kenapa", "bagaimana",
  "berapa", "apakah", "siapakah", "kemanakah", "darimanakah", "manakah",
  // Kata ganti / keterangan umum
  "saya", "aku", "kamu", "dia", "mereka", "kita", "kami", "anda", "ia",
  "bisa", "dapat", "akan", "telah", "sudah", "sedang", "lagi", "pun", "juga",
  "hanya", "saja", "ada", "tidak", "bukan", "belum", "sangat", "lebih",
  // English common stop words
  "the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to", "for",
  "and", "or", "of", "with", "by", "from", "about", "what", "where", "who",
  "when", "why", "how", "which",
]);

/**
 * 1. Normalisasi query: lowercase, buang simbol khusus, trim
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 2. Tokenisasi query & 3. Hilangkan stop words umum
 */
export function extractTokens(query: string): { tokens: string[]; cleanTokens: string[] } {
  const normalized = normalizeQuery(query);
  const rawTokens = normalized.split(/\s+/).filter((t) => t.length > 0);
  const cleanTokens = rawTokens.filter((t) => !STOP_WORDS.has(t) && t.length > 1);

  // Fallback jika semua kata terbuang sebagai stop words (misal "apa itu")
  const tokensToUse = cleanTokens.length > 0 ? cleanTokens : rawTokens;

  return {
    tokens: rawTokens,
    cleanTokens: tokensToUse,
  };
}

/**
 * Helper menghitung frekuensi kemunculan substring
 */
function countOccurrences(text: string, term: string): number {
  if (!text || !term) return 0;
  const regex = new RegExp(`\\b${term}\\b`, "gi");
  const matches = text.match(regex);
  if (matches) return matches.length;
  // Substring fallback jika tidak match batas kata
  return text.toLowerCase().includes(term.toLowerCase()) ? 1 : 0;
}

/**
 * 4. & 5. Scoring artikel berdasarkan kecocokan keyword pada field KB
 */
export function scoreArticle(
  doc: Record<string, unknown>,
  collectionName: string,
  cleanTokens: string[],
  normalizedQuery: string
): ScoredArticle {
  const title = String(doc.title || "");
  const category = String(doc.category || "");
  const summary = String(doc.summary || "");
  const detail = String(doc.detail || "");
  const content = String(doc.content || "");

  let tagsArray: string[] = [];
  if (Array.isArray(doc.tags)) {
    tagsArray = doc.tags.map((t) => String(t));
  } else if (typeof doc.tags === "string") {
    tagsArray = doc.tags.split(",").map((t) => t.trim()).filter(Boolean);
  }

  const titleLower = title.toLowerCase();
  const categoryLower = category.toLowerCase();
  const summaryLower = summary.toLowerCase();
  const detailLower = detail.toLowerCase();
  const contentLower = content.toLowerCase();
  const tagsLower = tagsArray.map((t) => t.toLowerCase());

  // Kumpulkan dynamic fields selain field standar
  const standardFields = new Set([
    "_id", "id", "title", "category", "summary", "detail", "content", "tags",
    "createdAt", "updatedAt", "createdBy", "updatedBy", "importedBy",
  ]);
  const extraTexts: string[] = [];
  for (const [k, v] of Object.entries(doc)) {
    if (!standardFields.has(k) && typeof v === "string") {
      extraTexts.push(v.toLowerCase());
    }
  }
  const extraCombined = extraTexts.join(" ");

  let totalScore = 0;
  const matchedKeywordsSet = new Set<string>();

  // Exact phrase match bonus pada title atau content
  if (normalizedQuery.length > 3) {
    if (titleLower.includes(normalizedQuery)) totalScore += 30;
    if (contentLower.includes(normalizedQuery) || detailLower.includes(normalizedQuery) || summaryLower.includes(normalizedQuery)) {
      totalScore += 20;
    }
  }

  // Cek setiap token keyword yang sudah bersih
  for (const token of cleanTokens) {
    let tokenMatched = false;

    // 1. Title match (bobot tertinggi)
    const titleCount = countOccurrences(titleLower, token);
    if (titleCount > 0) {
      totalScore += 12 * titleCount;
      tokenMatched = true;
    }

    // 2. Tags match
    for (const tag of tagsLower) {
      if (tag === token) {
        totalScore += 10;
        tokenMatched = true;
      } else if (tag.includes(token)) {
        totalScore += 5;
        tokenMatched = true;
      }
    }

    // 3. Category match
    if (categoryLower === token) {
      totalScore += 8;
      tokenMatched = true;
    } else if (categoryLower.includes(token)) {
      totalScore += 4;
      tokenMatched = true;
    }

    // 4. Summary / Detail match
    const summaryCount = countOccurrences(summaryLower, token);
    if (summaryCount > 0) {
      totalScore += 5 * summaryCount;
      tokenMatched = true;
    }

    const detailCount = countOccurrences(detailLower, token);
    if (detailCount > 0) {
      totalScore += 5 * detailCount;
      tokenMatched = true;
    }

    // 5. Content match
    const contentCount = countOccurrences(contentLower, token);
    if (contentCount > 0) {
      totalScore += 3 * contentCount;
      tokenMatched = true;
    }

    // 6. Dynamic extra fields
    const extraCount = countOccurrences(extraCombined, token);
    if (extraCount > 0) {
      totalScore += 3 * extraCount;
      tokenMatched = true;
    }

    if (tokenMatched) {
      matchedKeywordsSet.add(token);
    }
  }

  // Bonus cakupan keyword (Keyword Coverage Bonus)
  const matchedCount = matchedKeywordsSet.size;
  if (cleanTokens.length > 0) {
    const coverage = matchedCount / cleanTokens.length;
    if (coverage === 1) {
      totalScore += 25; // mencakup seluruh keyword pencarian
    } else if (coverage >= 0.5) {
      totalScore += 12; // mencakup minimal 50% keyword
    }
    totalScore += matchedCount * 4;
  }

  const articleId = doc._id ? doc._id.toString() : String(doc.id || new ObjectId().toString());

  return {
    id: articleId,
    collectionName,
    title: title || "Tanpa Judul",
    category: category || "General",
    summary,
    content: content || detail || summary,
    detail,
    tags: tagsArray,
    score: Math.round(totalScore),
    matchedKeywords: Array.from(matchedKeywordsSet),
    raw: doc,
  };
}

/**
 * 6. & 7. Smart Search Execution:
 * Normalisasi -> Tokenisasi -> Hilangkan stop words -> Score tiap artikel -> Sort descending -> Ambil Top 5
 */
export async function smartSearchKB(
  db: Db,
  query: string,
  targetCollections?: string[],
  maxResults: number = 5
): Promise<{
  query: string;
  normalizedQuery: string;
  cleanTokens: string[];
  articles: ScoredArticle[];
  formattedContext: string;
}> {
  const normalizedQuery = normalizeQuery(query);
  const { cleanTokens } = extractTokens(query);

  // Tentukan koleksi target
  let collectionsToSearch: string[] = [];
  if (targetCollections && targetCollections.length > 0) {
    collectionsToSearch = targetCollections;
  } else {
    // Ambil dari knowledgeBases meta docs
    const kbs = await db.collection("knowledgeBases").find({}).toArray();
    collectionsToSearch = kbs.map((k) => k.collectionName);

    if (collectionsToSearch.length === 0) {
      // Fallback ke semua collections berawalan kb_
      const allColls = await db.listCollections().toArray();
      collectionsToSearch = allColls.map((c) => c.name).filter((n) => n.startsWith("kb_"));
    }
  }

  const allScored: ScoredArticle[] = [];

  for (const collName of collectionsToSearch) {
    try {
      const docs = await db.collection(collName).find({}).toArray();
      for (const doc of docs) {
        const scored = scoreArticle(doc, collName, cleanTokens, normalizedQuery);
        if (scored.score > 0) {
          allScored.push(scored);
        }
      }
    } catch {
      // Abaikan koleksi jika tidak dapat diakses
    }
  }

  // 6. Sort berdasarkan score tertinggi
  allScored.sort((a, b) => b.score - a.score);

  // 7. Ambil maksimal 5 artikel terbaik (Top 5)
  const topArticles = allScored.slice(0, maxResults);

  // Buat formatted context untuk dikirim ke LM Studio
  let formattedContext = "";
  if (topArticles.length > 0) {
    formattedContext = topArticles
      .map((art, idx) => {
        const parts: string[] = [
          `[Artikel ${idx + 1}: ${art.title}]`,
          `Kategori: ${art.category}`,
        ];
        if (art.tags.length > 0) parts.push(`Tags: ${art.tags.join(", ")}`);
        if (art.summary) parts.push(`Ringkasan: ${art.summary}`);
        if (art.detail && art.detail !== art.summary) parts.push(`Detail: ${art.detail}`);
        if (art.content && art.content !== art.detail && art.content !== art.summary) {
          parts.push(`Konten: ${art.content}`);
        }
        return parts.join("\n");
      })
      .join("\n\n");
  } else {
    formattedContext = "Tidak ada dokumen Knowledge Base yang relevan ditemukan.";
  }

  return {
    query,
    normalizedQuery,
    cleanTokens,
    articles: topArticles,
    formattedContext,
  };
}

/**
 * Format pesan konteks untuk dikirim ke LM Studio
 */
export function buildLMStudioPayload(
  query: string,
  formattedContext: string,
  model: string = "local-model",
  temperature: number = 0.7,
  maxTokens: number = 1024
) {
  const systemPrompt = `Jawab berdasarkan knowledge context yang diberikan.
Jika informasi tidak terdapat dalam context, katakan informasi tidak ditemukan.
Jangan mengarang informasi.

KNOWLEDGE CONTEXT:
${formattedContext}`;

  return {
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ],
    temperature,
    max_tokens: maxTokens,
    stream: false,
  };
}
