import { uploadLimit } from "../../config";
import { deleteFile, moveFile, uploadFile } from "../config/r2";
import type { Photo, UploadResult } from "../types/dataset.types";
import { classifierService } from "./ai/classifier.service";
import { datasetService } from "./dataset.service";
import { imageService } from "./image.service";
import { createLogger } from "../lib/logger";

const logger = createLogger("upload");

class UploadService {
  private activeUploads = 0;

  async waitUntilIdle() {
    while (this.activeUploads) await Bun.sleep(250);
  }

  async upload(file: File) {
    this.activeUploads++;
    try {
      return await this.check(file);
    } finally {
      this.activeUploads--;
    }
  }

  private async check(file: File): Promise<UploadResult> {
    const startedAt = performance.now();
    const timings: string[] = [];
    const timed = async <T>(step: string, work: Promise<T>) => {
      const stepStartedAt = performance.now();
      const result = await work;
      timings.push(`${step} ${Math.round(performance.now() - stepStartedAt)}ms`);
      return result;
    };
    const summary = () =>
      `in ${Math.round(performance.now() - startedAt)}ms (${timings.join(", ")})`;
    const rejected = (reason: string): UploadResult => {
      logger.info(`${file.name} rejected ${summary()}: ${reason}`);
      return { fileName: file.name, accepted: false, reason };
    };
    if (file.size > uploadLimit.bytes) return rejected("too-large");
    if (!(await classifierService.hasChecksLeft())) return rejected("daily-limit");

    const image = await timed(
      "prepare",
      imageService.prepare(Buffer.from(await file.arrayBuffer())).catch(() => null)
    );
    if (!image) return rejected("unreadable");

    const { width, height, preview, visualHash } = await timed(
      "describe",
      imageService.describe(image)
    );
    const id = imageService.createId(image);
    const temporaryKey = `tmp/${id}.jpg`;
    const [check] = await Promise.all([
      timed("check", classifierService.checkPhoto(preview)),
      timed("tmp upload", uploadFile(temporaryKey, image, "image/jpeg", "no-store")),
      timed("manifest", datasetService.refresh()),
    ]);

    const isDuplicate = datasetService.looksLikeSavedPhoto(visualHash);
    if (isDuplicate || !classifierService.isAccepted(check)) {
      deleteFile(temporaryKey).catch((error) =>
        logger.warn(`Couldn't delete ${temporaryKey}`, error)
      );
      return rejected(isDuplicate ? "duplicate" : (check?.reason ?? "unreadable"));
    }

    const photo: Photo = {
      id,
      category: check.category,
      width,
      height,
      hash: visualHash,
      url: `upload:${id}`,
      title: file.name,
      source: "upload",
    };
    await timed("move", moveFile(temporaryKey, datasetService.imageKey(photo), "image/jpeg"));
    await timed("save", datasetService.register(photo));
    logger.info(
      `${file.name} accepted into ${photo.category} (${check.confidence.toFixed(2)}) ${summary()}`
    );
    return { fileName: file.name, accepted: true, category: photo.category };
  }
}

export const uploadService = new UploadService();
export default uploadService;
