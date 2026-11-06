import { appendFile, link, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { REVIEW_DIR } from "../config/paths";
import { AI_MODEL_CONFIG } from "./ai/models";

export type ReviewEntry = {
  id: string;
  searchedFor: string;
  result: string;
  url: string;
  category?: string | null;
  [field: string]: unknown;
};

class ReviewService {
  private readonly folder = `${REVIEW_DIR}${AI_MODEL_CONFIG.imageClassification.model.replaceAll("/", "-")}/`;
  private readonly logPath = `${this.folder}log.jsonl`;
  private readonly reviewedUrls = new Set<string>();

  async load() {
    const log = Bun.file(this.logPath);
    if (!(await log.exists())) return;
    for (const line of (await log.text()).split("\n").filter(Boolean)) {
      this.reviewedUrls.add((JSON.parse(line) as ReviewEntry).url);
    }
  }

  wasReviewed(url: string) {
    return this.reviewedUrls.has(url);
  }

  async record(entry: ReviewEntry, imagePath: string) {
    const resultFolder = entry.result === "accepted" ? `accepted-${entry.category}` : entry.result;
    const target = `${this.folder}${entry.searchedFor}/${resultFolder}/${entry.id}.jpg`;
    await mkdir(dirname(target), { recursive: true });
    await link(imagePath, target).catch(() => {});
    await appendFile(this.logPath, `${JSON.stringify(entry)}\n`);
    this.reviewedUrls.add(entry.url);
  }
}

export const reviewService = new ReviewService();
export default reviewService;
