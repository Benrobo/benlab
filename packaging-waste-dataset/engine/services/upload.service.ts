import { uploadLimit } from "../../config";
import type { Photo, UploadResult } from "../types/dataset.types";
import { categoryService } from "./category.service";
import { datasetService } from "./dataset.service";
import { imageService } from "./image.service";
import { createLogger } from "../lib/logger";

const logger = createLogger("upload");

class UploadService {
  async upload(file: File, category: string): Promise<UploadResult> {
    const rejected = (reason: string): UploadResult => {
      logger.info(`${file.name} rejected: ${reason}`);
      return { fileName: file.name, accepted: false, reason };
    };
    if (!categoryService.isActive(category)) return rejected("unknown-category");
    if (file.size > uploadLimit.bytes) return rejected("too-large");

    const image = await imageService
      .prepare(Buffer.from(await file.arrayBuffer()))
      .catch(() => null);
    if (!image) return rejected("unreadable");

    const { width, height, visualHash } = await imageService.describe(image);
    await datasetService.refresh(0);
    if (datasetService.looksLikeSavedPhoto(visualHash)) return rejected("duplicate");

    const id = imageService.createId(image);
    const photo: Photo = {
      id,
      category,
      width,
      height,
      hash: visualHash,
      url: `upload:${id}`,
      title: file.name,
      source: "upload",
    };
    await datasetService.add(photo, image);
    logger.info(`${file.name} added to ${category}`);
    return { fileName: file.name, accepted: true, category };
  }
}

export const uploadService = new UploadService();
export default uploadService;
