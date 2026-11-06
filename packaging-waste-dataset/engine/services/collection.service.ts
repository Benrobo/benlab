import { categoryService } from "./category.service";
import { categoryJobs, collectCategoryJob } from "../jobs/collect-category.job";
import type { CollectionStatus } from "../types/dataset.types";
import { createLogger } from "../lib/logger";

const logger = createLogger("collection");

class CollectionService {
  start() {
    logger.info("Starting every category");
    for (const id of categoryService.ids()) {
      if (collectCategoryJob.isRunning(id)) continue;
      categoryJobs.set(id, { categoryId: id, state: "queued", checked: 0, added: 0 });
      collectCategoryJob.trigger({ categoryId: id });
    }
  }

  stop() {
    logger.info("Stopping every category");
    collectCategoryJob.stopAll();
  }

  status(): CollectionStatus {
    const jobs = categoryService.ids().map(
      (categoryId) =>
        categoryJobs.get(categoryId) ?? {
          categoryId,
          state: "idle" as const,
          checked: 0,
          added: 0,
        }
    );
    return { running: jobs.some(({ state }) => state === "queued" || state === "running"), jobs };
  }
}

export const collectionService = new CollectionService();
export default collectionService;
