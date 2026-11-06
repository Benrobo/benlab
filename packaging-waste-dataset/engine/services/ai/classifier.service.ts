import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { APICallError, generateText, Output } from "ai";
import { z } from "zod";
import { aiChecksPerDay } from "../../../config";
import env from "../../config/env";
import { redis, redisKey } from "../../config/redis";
import { categoryService } from "../category.service";
import { AI_MODEL_CONFIG } from "./models";
import { createLogger } from "../../lib/logger";

const logger = createLogger("classifier");

const minimumConfidence = 0.7;

const statusCodesThatStopEverything = [401, 402, 403];

const createPhotoCheckSchema = () =>
  z.object({
    category: z
      .enum(categoryService.ids() as [string, ...string[]])
      .nullable()
      .describe("The category the photo belongs to, or null if it should not be in the dataset."),
    confidence: z.number().describe("How sure you are about this answer, from 0 to 1."),
    reason: z.string().describe("A short reason for the answer, under 12 words."),
  });

export type PhotoCheck = z.infer<ReturnType<typeof createPhotoCheckSchema>>;

const rules = [
  "Only the packaging counts, never what it contains.",
  "The packaging has been opened, emptied or left lying around. It does not need to look dirty or like trash, but it is not sealed and full, held, in use or for sale.",
  "It is a casual photo a regular person could take, not a professional product shot, an ad or a graphic. A plain or tidy background like a table, desk or floor is fine.",
  "No person or part of a person is visible.",
  "At most 4 pieces of the packaging are visible.",
  "The packaging is the clear main subject. Other things can be around it as long as they don't compete for attention.",
  "Nothing was added on top of the photo.",
  "Nothing clearly shows the photo was taken outside Nigeria.",
  "Judge each rule only by what is clearly visible, and don't reject a photo over doubts it doesn't show.",
];

export const classificationPrompt =
  () => `You check photos for a dataset of packaging thrown away in Nigeria.

Categories:
${categoryService
  .list()
  .map(({ id, description }) => `- ${id}: ${description}`)
  .join("\n")}

Give the photo's category only when it follows every rule below, otherwise null:
${rules.map((rule) => `- ${rule}`).join("\n")}`;

const checksTodayKey = () => redisKey(`ai-checks:${new Date().toISOString().slice(0, 10)}`);

class ClassifierService {
  private readonly openrouter = createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });

  async hasChecksLeft() {
    return Number(await redis.get(checksTodayKey())) < aiChecksPerDay;
  }

  private async useCheck() {
    const key = checksTodayKey();
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 2 * 24 * 60 * 60);
    return count <= aiChecksPerDay;
  }

  async checkPhoto(preview: Buffer, signal?: AbortSignal) {
    const { model, reasoningEffort } = AI_MODEL_CONFIG.imageClassification;
    if (!(await this.useCheck())) {
      logger.warn(`Reached the daily limit of ${aiChecksPerDay} AI checks`);
      return null;
    }
    try {
      const { output } = await generateText({
        model: this.openrouter(model, {
          reasoning: { effort: reasoningEffort },
          provider: { sort: "latency" },
        }),
        output: Output.object({ schema: createPhotoCheckSchema(), name: "photoCheck" }),
        system: classificationPrompt(),
        messages: [
          { role: "user", content: [{ type: "file", data: preview, mediaType: "image/jpeg" }] },
        ],
        temperature: 0,
        maxOutputTokens: 100,
        maxRetries: 4,
        abortSignal: signal,
      });
      return output;
    } catch (error) {
      if (signal?.aborted) throw error;
      const shouldStop =
        APICallError.isInstance(error) &&
        statusCodesThatStopEverything.includes(error.statusCode ?? 0);
      if (shouldStop) {
        logger.error("OpenRouter refused the request, stopping", error);
        throw error;
      }
      logger.warn("Photo check failed", error instanceof Error ? error.message : error);
      return null;
    }
  }

  isAccepted(check: PhotoCheck | null): check is PhotoCheck & { category: string } {
    return Boolean(check?.category) && check!.confidence >= minimumConfidence;
  }

  describeResult(check: PhotoCheck | null) {
    if (!check) return "unreadable";
    if (this.isAccepted(check)) return "accepted";
    return check.category ? "unsure" : "rejected";
  }
}

export const classifierService = new ClassifierService();
export default classifierService;
