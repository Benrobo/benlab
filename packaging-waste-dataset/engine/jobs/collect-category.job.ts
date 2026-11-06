import { categoryService } from "../services/category.service";
import { collectorService } from "../services/collector.service";
import type { CategoryJob } from "../types/dataset.types";
import { defineJob } from "./background-job";
import { createLogger } from "../lib/logger";

const logger = createLogger("collect");

const maxCategoriesAtOnce = 10;

export const categoryJobs = new Map<string, CategoryJob>();

export const collectCategoryJob = defineJob<{ categoryId: string }>({
  id: "collect-category",
  concurrency: maxCategoriesAtOnce,
  maxDurationMs: 2 * 60 * 60_000,
  key: ({ categoryId }) => categoryId,
  run: async ({ categoryId }, signal) => {
    const category = categoryService.find(categoryId);
    if (!category) return;
    await collectorService.collect(category, categoryJobs.get(categoryId)!, signal);
  },
  onStart: ({ categoryId }) => {
    const job = categoryJobs.get(categoryId) ?? {
      categoryId,
      state: "running",
      checked: 0,
      added: 0,
    };
    categoryJobs.set(categoryId, { ...job, state: "running" });
    logger.info(`${categoryId} started`);
  },
  onFinish: ({ categoryId }, outcome) => {
    const job = categoryJobs.get(categoryId)!;
    job.state = outcome;
    logger.info(`${categoryId} ${outcome}: checked ${job.checked}, added ${job.added}`);
  },
});
