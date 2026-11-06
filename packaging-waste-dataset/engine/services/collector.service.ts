import type { Category } from "../../config";
import { cachedImagePath } from "../config/paths";
import type { CategoryJob } from "../types/dataset.types";
import { classifierService } from "./ai/classifier.service";
import { datasetService } from "./dataset.service";
import { imageService } from "./image.service";
import { reviewService } from "./review.service";
import { searchService, type SearchResult } from "./search.service";
import { uploadService } from "./upload.service";
import { createLogger } from "../lib/logger";

const logger = createLogger("collector");

const workersPerCategory = 8;

const blockedSites =
  /shutterstock|alamy|dreamstime|istockphoto|gettyimages|123rf|depositphotos|stock\.adobe|vecteezy|freepik|canstockphoto|bigstockphoto|pond5|agefotostock|pexels|unsplash|pixabay|rawpixel|stocksnap|canva|pngtree|pngwing|youtube|ytimg|tiktok|alibaba|alicdn|aliexpress|made-in-china|indiamart|exportersindia|tradeindia|amazon|ebay|jumia|konga|walmart|etsy/i;

const blockedTitles =
  /\b(machine|vector|illustration|clipart|cartoon|icon|logo|mockup|template|diagram|infographic|drawing|price|wholesale|supplier|manufacturer|for sale|diy|craft|how to)\b/i;

class CollectorService {
  async collect(category: Category, job: CategoryJob, signal: AbortSignal) {
    if (datasetService.isCategoryFull(category.id)) return;

    const searchResults = await searchService.findPhotos(category, signal);
    const queue = searchResults.filter((searchResult) => this.isWorthChecking(searchResult));
    logger.info(
      `${category.id}: ${searchResults.length} search results, ${queue.length} new to check`
    );
    const hashesSeenThisRun: string[] = [];

    const worker = async () => {
      while (!signal.aborted && !datasetService.isCategoryFull(category.id) && queue.length) {
        await uploadService.waitUntilIdle();
        await datasetService.refresh();
        if (datasetService.isCategoryFull(category.id)) break;
        await this.checkSearchResult(queue.shift()!, category, job, hashesSeenThisRun, signal);
      }
    };
    await Promise.all(Array.from({ length: workersPerCategory }, worker));
  }

  private async checkSearchResult(
    searchResult: SearchResult,
    category: Category,
    job: CategoryJob,
    hashesSeenThisRun: string[],
    signal: AbortSignal
  ) {
    const id = imageService.createId(searchResult.url);
    const image = await imageService.getImage(searchResult, id, signal);
    if (!image || signal.aborted) return;

    const { width, height, preview, visualHash } = await imageService.describe(image);
    if (imageService.looksLikeAny(visualHash, hashesSeenThisRun)) return;
    hashesSeenThisRun.push(visualHash);

    const check = await classifierService.checkPhoto(preview, signal).catch(() => null);
    if (signal.aborted) return;

    job.checked++;
    await reviewService.record(
      {
        id,
        searchedFor: category.id,
        result: classifierService.describeResult(check),
        ...check,
        ...searchResult,
      },
      cachedImagePath(id)
    );

    const confidence = check ? check.confidence.toFixed(2) : "-";
    logger.info(
      `${category.id}: ${classifierService.describeResult(check)} ${confidence} ${check?.category ?? "none"} "${check?.reason ?? "no answer"}" ${searchResult.url}`
    );

    if (!classifierService.isAccepted(check)) return;
    if (
      datasetService.isCategoryFull(check.category) ||
      datasetService.looksLikeSavedPhoto(visualHash)
    )
      return;

    await datasetService.add(
      {
        id,
        category: check.category,
        width,
        height,
        hash: visualHash,
        url: searchResult.url,
        page: searchResult.page,
        title: searchResult.title,
        source: "search",
      },
      image
    );
    job.added++;
  }

  private isWorthChecking({ url, page = "", title = "" }: SearchResult) {
    if (datasetService.hasPhotoFrom(url) || reviewService.wasReviewed(url)) return false;
    return !blockedSites.test(`${url} ${page}`) && !blockedTitles.test(title);
  }
}

export const collectorService = new CollectorService();
export default collectorService;
