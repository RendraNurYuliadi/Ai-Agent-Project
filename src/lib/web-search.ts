import { lookup } from "node:dns/promises";
import { load } from "cheerio";
import ipaddr from "ipaddr.js";

export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

interface SearchCandidate {
  title: string;
  url: string;
  snippet: string;
  score: number;
}

const SEARCH_TIMEOUT_MS = 10000;
const PAGE_TIMEOUT_MS = 8000;
const MAX_SEARCH_HTML_BYTES = 1_000_000;
const MAX_PAGE_HTML_BYTES = 2_000_000;

async function readLimitedBody(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (totalBytes < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const remaining = maxBytes - totalBytes;
      const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value;
      chunks.push(chunk);
      totalBytes += chunk.byteLength;
      if (chunk.byteLength !== value.byteLength) break;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function resolveResultUrl(rawUrl: string): string | null {
  try {
    const resultUrl = new URL(rawUrl, "https://html.duckduckgo.com");
    let redirectTarget = resultUrl.searchParams.get("uddg");
    if (!redirectTarget && resultUrl.hostname.endsWith("bing.com") && resultUrl.pathname === "/ck/a") {
      const encodedTarget = resultUrl.searchParams.get("u") || "";
      if (encodedTarget.startsWith("a1")) {
        redirectTarget = Buffer.from(encodedTarget.slice(2), "base64url").toString("utf8");
      }
    }
    const url = redirectTarget ? new URL(redirectTarget) : resultUrl;
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    if (/\.(?:png|jpe?g|gif|svg|webp|pdf|zip|mp[34])$/i.test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function isPublicHost(hostname: string): Promise<boolean> {
  const host = hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;

  try {
    const addresses = ipaddr.isValid(host)
      ? [{ address: host }]
      : await lookup(host, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every(({ address }) => {
      try {
        return ipaddr.process(address).range() === "unicast";
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

async function searchCandidates(query: string, maxResults: number): Promise<SearchCandidate[]> {
  const searchUrl = new URL("https://www.bing.com/search");
  searchUrl.searchParams.set("q", query.trim().slice(0, 1000));
  searchUrl.searchParams.set("count", String(maxResults));
  searchUrl.searchParams.set("setlang", "id-ID");
  let response: Response;
  try {
    response = await fetch(searchUrl, {
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0 (compatible; ChatbotWebSearch/1.0)",
      },
      redirect: "error",
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });
  } catch {
    throw new Error("Bing Search tidak dapat diakses dari server saat ini.");
  }
  if (!response.ok) throw new Error(`Pencarian web gagal (HTTP ${response.status}).`);

  const html = await readLimitedBody(response, MAX_SEARCH_HTML_BYTES);
  const $ = load(html);
  const results: SearchCandidate[] = [];

  $("li.b_algo").each((index, element) => {
    if (results.length >= maxResults) return;
    const result = $(element);
    const link = result.find("h2 a").first();
    const title = link.text().replace(/\s+/g, " ").trim();
    const url = resolveResultUrl(link.attr("href") || "");
    const snippet = (result.find(".b_caption p").first().text() || result.find("p").first().text()).replace(/\s+/g, " ").trim();
    if (title && url) results.push({ title: title.slice(0, 300), url, snippet: snippet.slice(0, 2000), score: 1 / (index + 1) });
  });

  return results;
}

async function extractPage(candidate: SearchCandidate): Promise<WebSearchResult> {
  const url = new URL(candidate.url);
  if (!await isPublicHost(url.hostname)) {
    return { ...candidate, content: candidate.snippet };
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml,text/plain",
        "User-Agent": "Mozilla/5.0 (compatible; ChatbotWebSearch/1.0)",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || response.status >= 300 || !/text\/(?:html|plain)|application\/xhtml\+xml/i.test(contentType)) {
      return { ...candidate, content: candidate.snippet };
    }

    const html = await readLimitedBody(response, MAX_PAGE_HTML_BYTES);
    const $ = load(html);
    $("script,style,noscript,svg,iframe,nav,footer,header,form,button").remove();
    const title = ($('meta[property="og:title"]').attr("content") || $("title").text() || candidate.title).trim();
    const articleText = $("article,main").text();
    const pageText = (articleText || $("body").text()).replace(/\s+/g, " ").trim().slice(0, 6000);
    return {
      ...candidate,
      title: title.slice(0, 300),
      content: pageText || candidate.snippet,
    };
  } catch {
    return { ...candidate, content: candidate.snippet };
  }
}

export async function searchWeb(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  const cleanQuery = query.trim().slice(0, 1000);
  if (!cleanQuery) return [];
  const limit = Math.max(1, Math.min(10, Math.round(maxResults)));
  const candidates = await searchCandidates(cleanQuery, limit);
  if (!candidates.length) return [];

  const results: WebSearchResult[] = [];
  for (let index = 0; index < candidates.length; index += 3) {
    const batch = candidates.slice(index, index + 3);
    results.push(...await Promise.all(batch.map(extractPage)));
  }
  return results;
}