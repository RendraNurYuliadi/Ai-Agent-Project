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
  generationDurationMs,
  showRetrieval,
  webSearch = false,
  topArticles = [],
  uiComponents = [],
  webSources = [],
}: {
  timestamp: string | Date;
  generationDurationMs?: number;
  showRetrieval?: boolean;
  webSearch?: boolean;
  topArticles?: RetrievalArticle[];
  uiComponents?: RetrievalComponent[];
  webSources?: WebSource[];
}) {
  const date = new Date(timestamp);
  const time = Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  return <div className="flex w-fit self-start flex-wrap items-center justify-start gap-2 px-1 text-[10px]">
    {time && <span className="select-none text-neutral-600">{time}</span>}
    {(showRetrieval || webSources.length > 0) && <details className="relative text-neutral-500">
      <summary className="cursor-pointer list-none select-none hover:text-neutral-300">{webSearch ? `Sumber web (${webSources.length})` : `Debug retrieval (${topArticles.length})`}</summary>
      <div className="absolute right-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-5rem)] rounded-lg border border-neutral-700 bg-[#0a0a0a] p-3 text-left shadow-xl">
        {webSearch ? webSources.length > 0 ? <>
          <p className="mb-2 font-medium text-neutral-300">Sumber web</p>
          <ul className="space-y-2">{webSources.map((source) => <li key={source.id} className="border-t border-neutral-800 pt-2 first:border-0 first:pt-0">
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-neutral-200 underline decoration-neutral-700 underline-offset-2 hover:text-white">{source.title}</a>
            {source.publishedDate && <p className="mt-0.5 text-neutral-600">{source.publishedDate}</p>}
          </li>)}</ul>
        </> : <><p className="mb-2 font-medium text-neutral-300">Sumber web</p><p className="text-neutral-500">Tidak ada sumber web yang cocok.</p></> : <>
          <p className="mb-2 font-medium text-neutral-300">Artikel yang diambil</p>
          {topArticles.length ? <ul className="space-y-2">
          {topArticles.map((article) => <li key={article.id} className="border-t border-neutral-800 pt-2 first:border-0 first:pt-0">
            <p className="text-neutral-200">{article.title}</p>
            <p className="mt-0.5 text-neutral-500">{article.collectionName || article.category || "Tanpa kategori"} · Skor {article.score}</p>
            {!!article.matchedKeywords?.length && <p className="mt-0.5 break-words text-neutral-500">Keyword: {article.matchedKeywords.join(", ")}</p>}
          </li>)}
          </ul> : <p className="text-neutral-500">Tidak ada artikel yang cocok.</p>}
          {uiComponents.map((component) => <div key={component.id} className="mt-3 border-t border-neutral-800 pt-2">
          <p className="font-medium text-neutral-300">Komponen dipicu: {component.name}</p>
          {component.triggeredBy?.map((article) => <p key={`${component.id}-${article.collectionName}-${article.articleId}`} className="mt-1 text-neutral-500">{article.title} · Skor {article.score}</p>)}
          </div>)}
        </>}
      </div>
    </details>}
    {typeof generationDurationMs === "number" && Number.isFinite(generationDurationMs) && <span className="whitespace-nowrap text-neutral-500" title="Waktu proses respons">
      Response time · {(generationDurationMs / 1000).toFixed(1)} detik
    </span>}
  </div>;
}