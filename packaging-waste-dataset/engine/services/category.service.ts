import { defaultCategories, type Category } from "../../config";
import { redis, redisKey } from "../config/redis";
import { createLogger } from "../lib/logger";

const logger = createLogger("categories");

const categoriesKey = redisKey("categories");

type NewCategory = { label: string; description: string; subjects?: string[] };

class CategoryService {
  private categories: Category[] = [];

  async load() {
    if (!(await redis.hlen(categoriesKey))) {
      await Promise.all(defaultCategories.map((category) => this.save(category)));
      logger.info(`Saved ${defaultCategories.length} default categories to Redis`);
    }
    const saved = await redis.hgetall(categoriesKey);
    this.categories = Object.values(saved)
      .map((value) => JSON.parse(value) as Category)
      .sort((first, second) => first.addedAt - second.addedAt);
    logger.info(`Loaded ${this.categories.length} categories`);
  }

  list() {
    return this.categories;
  }

  ids() {
    return this.categories.map(({ id }) => id);
  }

  find(id: string) {
    return this.categories.find((category) => category.id === id);
  }

  async add({ label, description, subjects = [] }: NewCategory) {
    const id = label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!id) return { problem: "Give the category a name" };
    if (this.find(id)) return { problem: `${label} already exists` };

    const searchTerms = subjects.map((subject) => subject.trim()).filter(Boolean);
    const category: Category = {
      id,
      label: label.trim(),
      description: description.trim(),
      subjects: searchTerms.length
        ? searchTerms
        : [`empty ${label}`, `${label} litter`, `used ${label} waste`, `${label} thrown away`],
      addedAt: Date.now(),
    };
    await this.save(category);
    this.categories.push(category);
    logger.info(`Added category ${id}: ${category.description}`);
    return { category };
  }

  private async save(category: Category) {
    await redis.hset(categoriesKey, { [category.id]: JSON.stringify(category) });
  }
}

export const categoryService = new CategoryService();
export default categoryService;
