import { categories } from "../../config";
import { collectorService } from "../services/collector.service";
import type { CategoryJob } from "../types/dataset.types";
import { defineJob } from "./background-job";
import { createLogger } from "../lib/logger";

const logger = createLogger("collect");

export const categoryJobs = new Map<string, CategoryJob>(
  categories.map(({ id }) => [id, { categoryId: id, state: "idle", checked: 0, added: 0 }])
);

export const collectCategoryJob = defineJob<{ categoryId: string }>({
  id: "collect-category",
  concurrency: categories.length,
  maxDurationMs: 2 * 60 * 60_000,
  key: ({ categoryId }) => categoryId,
  run: async ({ categoryId }, signal) => {
    const category = categories.find(({ id }) => id === categoryId)!;
    await collectorService.collect(category, categoryJobs.get(categoryId)!, signal);
  },
  onStart: ({ categoryId }) => {
    categoryJobs.get(categoryId)!.state = "running";
    logger.info(`${categoryId} started`);
  },
  onFinish: ({ categoryId }, outcome) => {
    const job = categoryJobs.get(categoryId)!;
    job.state = outcome;
    logger.info(`${categoryId} ${outcome}: checked ${job.checked}, added ${job.added}`);
  },
});
