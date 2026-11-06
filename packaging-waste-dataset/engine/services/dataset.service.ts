import { downloadZip } from "client-zip";
import { perCategory } from "../../config";
import { cachedImagePath } from "../config/paths";
import {
  deleteFile,
  getFile,
  getFileWithVersion,
  getPublicUrl,
  uploadFile,
  uploadFileIfUnchanged,
} from "../config/r2";
import type { Photo, PhotoWithUrl } from "../types/dataset.types";
import { imageService } from "./image.service";
import { reviewService } from "./review.service";
import { createLogger } from "../lib/logger";

const logger = createLogger("dataset");

const manifestKey = "manifest.json";
const zipFolder = "packaging-waste-dataset";
const refreshAfterMs = 3000;
const saveAttempts = 5;

class DatasetService {
  private photos: Photo[] = [];
  private version: string | undefined;
  private loadedAt = 0;
  private loading: Promise<void> | null = null;
  private changing = Promise.resolve();

  async load() {
    await this.refresh(0);
    logger.info(`Loaded ${this.photos.length} photos from R2`);
  }

  async refresh(maxAgeMs = refreshAfterMs) {
    if (Date.now() - this.loadedAt < maxAgeMs) return;
    this.loading ??= this.readManifest().finally(() => (this.loading = null));
    await this.loading;
  }

  imageKey(photo: Photo) {
    return `images/${photo.category}/${photo.id}.jpg`;
  }

  async list(): Promise<PhotoWithUrl[]> {
    await this.refresh();
    return this.photos.map((photo) => ({ ...photo, imageUrl: getPublicUrl(this.imageKey(photo)) }));
  }

  isCategoryFull(category: string) {
    return this.photos.filter((photo) => photo.category === category).length >= perCategory;
  }

  hasPhotoFrom(url: string) {
    return this.photos.some((photo) => photo.url === url);
  }

  looksLikeSavedPhoto(visualHash: string) {
    return imageService.looksLikeAny(
      visualHash,
      this.photos.map((photo) => photo.hash)
    );
  }

  async add(photo: Photo, image: Uint8Array) {
    await uploadFile(this.imageKey(photo), image, "image/jpeg");
    await this.register(photo);
    logger.info(`Added ${photo.id} to ${photo.category}`);
  }

  async register(photo: Photo) {
    await this.changeManifest((photos) =>
      photos.some((saved) => saved.id === photo.id) ? photos : [...photos, photo]
    );
  }

  async remove(id: string) {
    await this.refresh(0);
    const photo = this.photos.find((saved) => saved.id === id);
    if (!photo) {
      logger.warn(`Tried to remove ${id}, but it isn't in the dataset`);
      return false;
    }

    await this.changeManifest((photos) => photos.filter((saved) => saved.id !== id));
    await deleteFile(this.imageKey(photo));
    await reviewService.record(
      { id, searchedFor: photo.category, result: "removed", url: photo.url },
      cachedImagePath(id)
    );
    logger.info(`Removed ${id} from ${photo.category}`);
    return true;
  }

  async zip(category: string) {
    await this.refresh(0);
    const chosen = this.photos.filter((photo) => category === "all" || photo.category === category);
    return downloadZip(this.zipEntries(chosen)).body!;
  }

  private async readManifest() {
    const { body, version } = await getFileWithVersion(manifestKey);
    const saved = body ? JSON.parse(body) : {};
    this.photos = saved.photos ?? saved.items ?? [];
    this.version = version;
    this.loadedAt = Date.now();
  }

  private changeManifest(change: (photos: Photo[]) => Photo[]) {
    const run = async () => {
      for (let attempt = 1; attempt <= saveAttempts; attempt++) {
        await this.readManifest();
        const photos = change(this.photos);
        const manifest = JSON.stringify({ updatedAt: new Date().toISOString(), photos });
        if (await uploadFileIfUnchanged(manifestKey, manifest, "application/json", this.version)) {
          this.photos = photos;
          this.loadedAt = 0;
          return;
        }
        logger.warn(`Manifest changed in R2 while saving, retrying (${attempt}/${saveAttempts})`);
      }
      throw new Error("Couldn't save the manifest to R2 after several attempts");
    };
    const result = this.changing.then(run);
    this.changing = result.catch((error) =>
      logger.error("Couldn't save the manifest to R2", error)
    );
    return result;
  }

  private async *zipEntries(chosen: Photo[]) {
    const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows = chosen.map((photo) =>
      [`${photo.category}/${photo.id}.jpg`, photo.category, photo.source, photo.page ?? photo.url]
        .map(csvCell)
        .join(",")
    );
    yield {
      name: `${zipFolder}/labels.csv`,
      input: ["file,category,source,origin", ...rows].join("\n"),
    };

    for (const photo of chosen) {
      const image = await getFile(this.imageKey(photo));
      if (image) yield { name: `${zipFolder}/${photo.category}/${photo.id}.jpg`, input: image };
    }
  }
}

export const datasetService = new DatasetService();
export default datasetService;
