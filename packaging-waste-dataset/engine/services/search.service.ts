import { places, type Category } from "../../config";
import env from "../config/env";
import { cachedSearchPath } from "../config/paths";
import { createLogger } from "../lib/logger";

const logger = createLogger("search");

export type SearchResult = { url: string; page?: string; title?: string };

export const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const bingPageSize = 35;
const bingResultsPerQuery = 150;
const bingQueriesAtOnce = 8;
const braveDelayBetweenQueriesMs = 1100;

class SearchService {
  private failed(engine: string, query: string, error: unknown): SearchResult[] {
    logger.warn(
      `${engine} search failed for "${query}"`,
      error instanceof Error ? error.message : error
    );
    return [];
  }

  async findPhotos(category: Category, signal: AbortSignal) {
    const cached = Bun.file(cachedSearchPath(category.id));
    if (await cached.exists()) return (await cached.json()) as SearchResult[];

    const queries = category.subjects.flatMap((subject) =>
      places.map((place) => `${subject} ${place}`.trim())
    );
    const [bingResults, braveResults] = await Promise.all([
      this.searchBingForAll(queries, signal),
      this.searchBraveForAll(queries, signal),
    ]);

    const uniqueResults = new Map(
      mixLists([...bingResults, ...braveResults]).map((result) => [result.url, result])
    );
    const results = [...uniqueResults.values()];
    logger.info(
      `${category.id}: ${queries.length} queries, ${bingResults.flat().length} from Bing, ${braveResults.flat().length} from Brave, ${results.length} unique`
    );
    if (!signal.aborted) await Bun.write(cached, JSON.stringify(results));
    return results;
  }

  private async searchBingForAll(queries: string[], signal: AbortSignal) {
    const lists: SearchResult[][] = [];
    for (let start = 0; start < queries.length && !signal.aborted; start += bingQueriesAtOnce) {
      const batch = queries.slice(start, start + bingQueriesAtOnce);
      lists.push(
        ...(await Promise.all(
          batch.map((query) =>
            this.searchBing(query, signal).catch((error) => this.failed("Bing", query, error))
          )
        ))
      );
    }
    return lists;
  }

  private async searchBraveForAll(queries: string[], signal: AbortSignal) {
    const lists: SearchResult[][] = [];
    if (!env.BRAVE_SEARCH_API_KEY) return lists;

    for (const query of queries) {
      if (signal.aborted) break;
      lists.push(await this.searchBrave(query, signal).catch((error) => this.failed("Brave", query, error)));
      await Bun.sleep(braveDelayBetweenQueriesMs);
    }

    return lists;
  }

  private async searchBing(query: string, signal: AbortSignal) {
    const found = new Map<string, SearchResult>();

    for (
      let first = 0;
      found.size < bingResultsPerQuery && !signal.aborted;
      first += bingPageSize
    ) {
      const params = new URLSearchParams({
        q: query,
        first: `${first}`,
        count: `${bingPageSize}`,
        // cc: "NG",
        cc: "ALL",
        adlt: "strict",
        qft: " filterui:photo-photo",
      });
      const html = await fetch(`https://www.bing.com/images/async?${params}`, {
        headers: { "user-agent": userAgent, "accept-language": "en-NG,en;q=0.9" },
        signal,
      }).then((response) => response.text());

      const countBefore = found.size;
      for (const [, encodedJson] of html.matchAll(/\sm="(\{[^"]+\})"/g)) {
        const { murl, purl, t } = JSON.parse(decodeHtml(encodedJson!));
        if (murl) found.set(murl, { url: murl, page: purl, title: t });
      }
      if (found.size === countBefore) break;
    }

    return [...found.values()];
  }

  private async searchBrave(query: string, signal: AbortSignal) {
    const params = new URLSearchParams({
      q: query,
      count: "200",
      country: "ALL",
      safesearch: "strict",
      search_lang: "en",
    });
    const response = await fetch(`https://api.search.brave.com/res/v1/images/search?${params}`, {
      headers: { accept: "application/json", "x-subscription-token": env.BRAVE_SEARCH_API_KEY },
      signal,
    });
    if (!response.ok) {
      logger.warn(`Brave returned ${response.status} for "${query}"`);
      return [];
    }

    const { results = [] } = (await response.json()) as {
      results?: { title?: string; url?: string; properties?: { url?: string } }[];
    };
    return results.flatMap(({ title, url, properties }) =>
      properties?.url ? [{ url: properties.url, page: url, title }] : []
    );
  }
}

function mixLists<T>(lists: T[][]) {
  const longest = Math.max(0, ...lists.map((list) => list.length));
  return Array.from({ length: longest }, (_, index) =>
    lists.flatMap((list) => list.slice(index, index + 1))
  ).flat();
}

function decodeHtml(text: string) {
  const entities: Record<string, string> = {
    "&quot;": '"',
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&#39;": "'",
  };
  return text.replace(/&(?:quot|amp|lt|gt|#39);/g, (entity) => entities[entity]!);
}

export const searchService = new SearchService();
export default searchService;
