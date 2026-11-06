import { uploadLimit } from "../../config";
import { deleteFile, moveFile, uploadFile } from "../config/r2";
import type { Photo, UploadResult } from "../types/dataset.types";
import { classifierService } from "./ai/classifier.service";
import { datasetService } from "./dataset.service";
import { imageService } from "./image.service";
import { createLogger } from "../lib/logger";

const logger = createLogger("upload");

class UploadService {
  async upload(file: File): Promise<UploadResult> {
    const rejected = (reason: string): UploadResult => {
      logger.info(`${file.name} rejected: ${reason}`);
      return { fileName: file.name, accepted: false, reason };
    };
    if (file.size > uploadLimit.bytes) return rejected("too-large");

    const image = await imageService
      .prepare(Buffer.from(await file.arrayBuffer()))
      .catch(() => null);
    if (!image) return rejected("unreadable");

    const { width, height, preview, visualHash } = await imageService.describe(image);
    await datasetService.refresh();
    if (datasetService.looksLikeSavedPhoto(visualHash)) return rejected("duplicate");

    const id = imageService.createId(image);
    const temporaryKey = `tmp/${id}.jpg`;
    const [check] = await Promise.all([
      classifierService.checkPhoto(preview),
      uploadFile(temporaryKey, image, "image/jpeg", "no-store"),
    ]);

    if (!classifierService.isAccepted(check)) {
      await deleteFile(temporaryKey);
      return rejected(check?.reason ?? "unreadable");
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
    await moveFile(temporaryKey, datasetService.imageKey(photo), "image/jpeg");
    await datasetService.register(photo);
    logger.info(`${file.name} accepted into ${photo.category} (${check.confidence.toFixed(2)})`);
    return { fileName: file.name, accepted: true, category: photo.category };
  }
}

export const uploadService = new UploadService();
export default uploadService;
