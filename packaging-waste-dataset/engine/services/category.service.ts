import dayjs from "dayjs";
import { defaultCategories, type Category } from "../../config";
import { redis, redisKey } from "../config/redis";
import { createLogger } from "../lib/logger";

const logger = createLogger("categories");

const categoriesKey = redisKey("categories");

type CategoryText = { label: string; description: string; subjects?: string[] };

const findProblem = ({ label, description }: CategoryText) =>
  label.trim().length < 2 || description.trim().length < 5
    ? "Give the category a name and a short description"
    : null;

const cleanSubjects = (subjects: string[] = []) =>
  subjects.map((subject) => subject.trim()).filter(Boolean);

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

  active() {
    return this.categories.filter(({ archived }) => !archived);
  }

  ids() {
    return this.active().map(({ id }) => id);
  }

  find(id: string) {
    return this.categories.find((category) => category.id === id);
  }

  isActive(id: string) {
    return Boolean(this.find(id) && !this.find(id)!.archived);
  }

  async edit(id: string, changes: Partial<CategoryText>) {
    const category = this.find(id);
    if (!category) return { problem: "No such category" };

    const edited = {
      label: changes.label?.trim() ?? category.label,
      description: changes.description?.trim() ?? category.description,
      subjects: cleanSubjects(changes.subjects).length
        ? cleanSubjects(changes.subjects)
        : category.subjects,
    };
    const problem = findProblem(edited);
    if (problem) {
      logger.warn(`Rejected edit to ${id}: ${problem}`);
      return { problem };
    }

    Object.assign(category, edited);
    await this.save(category);
    logger.info(`Edited category ${id}`);
    return { category };
  }

  async setArchived(id: string, archived: boolean) {
    const category = this.find(id);
    if (!category) return null;
    category.archived = archived;
    await this.save(category);
    logger.info(`${archived ? "Archived" : "Restored"} category ${id}`);
    return category;
  }

  async add({ label, description, subjects = [] }: CategoryText) {
    const searchTerms = cleanSubjects(subjects);
    const problem = findProblem({ label, description, subjects: searchTerms });
    if (problem) {
      logger.warn(`Rejected new category "${label}": ${problem}`);
      return { problem };
    }

    const id = label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!id) return { problem: "Give the category a name" };
    if (this.find(id)) return { problem: `${label} already exists` };

    const category: Category = {
      id,
      label: label.trim(),
      description: description.trim(),
      subjects: searchTerms.length
        ? searchTerms
        : [`empty ${label}`, `${label} litter`, `used ${label} waste`, `${label} thrown away`],
      addedAt: dayjs().valueOf(),
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
