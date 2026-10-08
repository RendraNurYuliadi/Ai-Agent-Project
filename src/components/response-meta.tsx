"use client";

import { useState } from "react";
import { X } from "lucide-react";

type RetrievalArticle = {
  id: string;
  title: string;
  collectionName?: string;
  category?: string;
  score: number;
  matchedKeywords?: string[];
};

type RetrievalComponent = {
  id: string;
  name: string;
  triggeredBy?: Array<{
    collectionName: string;
    articleId: string;
    title: string;
    score: number;
  }>;
};

type WebSource = {
  id: string;
  title: string;
  url: string;
  score: number;
  publishedDate?: string;
};

export function ResponseMeta({
  timestamp,
  align = "start",
  generationDurationMs,
  showRetrieval,
  webSearch = false,
  topArticles = [],
  uiComponents = [],
  webSources = [],
}: {
  timestamp: string | Date;
  align?: "start" | "end";
  generationDurationMs?: number;
  showRetrieval?: boolean;
  webSearch?: boolean;
  topArticles?: RetrievalArticle[];
  uiComponents?: RetrievalComponent[];
  webSources?: WebSource[];
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const date = new Date(timestamp);
  const time = Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  return <div className={`flex w-fit flex-wrap items-center gap-2 px-1 text-[10px] ${align === "end" ? "self-end justify-end" : "self-start justify-start"}`}>
    {time && <span className="select-none text-neutral-600">{time}</span>}
    {(showRetrieval || webSources.length > 0) && <>
      <button type="button" onClick={() => setDetailsOpen(true)} className="cursor-pointer text-neutral-500 hover:text-neutral-300">
        {webSearch ? `Sumber web (${webSources.length})` : `Debug retrieval (${topArticles.length})`}
      </button>
      {detailsOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setDetailsOpen(false);
      }}>
      <section role="dialog" aria-modal="true" aria-labelledby="response-details-title" className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-neutral-700 bg-[#0a0a0a] text-left shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3">
          <h2 id="response-details-title" className="text-sm font-semibold text-neutral-200">{webSearch ? "Sumber web" : "Artikel yang diambil"}</h2>
          <button type="button" onClick={() => setDetailsOpen(false)} aria-label="Tutup detail" className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-900 hover:text-white"><X className="h-4 w-4" /></button>
        </header>
        <div className="overflow-y-auto p-4 text-xs">
        {webSearch ? webSources.length > 0 ? <>
          <ul className="space-y-3">{webSources.map((source) => <li key={source.id} className="border-t border-neutral-800 pt-3 first:border-0 first:pt-0">
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-neutral-200 underline decoration-neutral-700 underline-offset-2 hover:text-white">{source.title}</a>
            <p className="mt-1 break-all text-neutral-500">{source.url}</p>
            {source.publishedDate && <p className="mt-1 text-neutral-600">{source.publishedDate}</p>}
            <p className="mt-1 text-neutral-500">Skor {source.score}</p>
          </li>)}</ul>
        </> : <p className="text-neutral-500">Tidak ada sumber web yang cocok.</p> : <>
          {topArticles.length ? <ul className="space-y-3">
          {topArticles.map((article) => <li key={article.id} className="border-t border-neutral-800 pt-3 first:border-0 first:pt-0">
            <p className="font-medium text-neutral-200">{article.title}</p>
            <p className="mt-1 text-neutral-500">{article.collectionName || article.category || "Tanpa kategori"} · Skor {article.score}</p>
            {!!article.matchedKeywords?.length && <p className="mt-1 break-words text-neutral-500">Keyword: {article.matchedKeywords.join(", ")}</p>}
          </li>)}
          </ul> : <p className="text-neutral-500">Tidak ada artikel yang cocok.</p>}
          {uiComponents.map((component) => <div key={component.id} className="mt-3 border-t border-neutral-800 pt-2">
          <p className="font-medium text-neutral-300">Komponen dipicu: {component.name}</p>
          {component.triggeredBy?.map((article) => <p key={`${component.id}-${article.collectionName}-${article.articleId}`} className="mt-1 text-neutral-500">{article.title} · Skor {article.score}</p>)}
          </div>)}
        </>}
        </div>
      </section>
      </div>}
    </>}
    {typeof generationDurationMs === "number" && Number.isFinite(generationDurationMs) && <span className="whitespace-nowrap text-neutral-500" title="Waktu proses respons">
      Response time · {(generationDurationMs / 1000).toFixed(1)} detik
    </span>}
  </div>;
}