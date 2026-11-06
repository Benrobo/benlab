import { downloadZip } from "client-zip";
import { perCategory } from "../../config";
import { cachedImagePath } from "../config/paths";
import { deleteFile, getFile, getPublicUrl, uploadFile } from "../config/r2";
import { redis, redisKey } from "../config/redis";
import type { Photo, PhotoWithUrl } from "../types/dataset.types";
import { imageService } from "./image.service";
import { reviewService } from "./review.service";
import { createLogger } from "../lib/logger";

const logger = createLogger("dataset");

const photosKey = redisKey("photos");
const oldManifestKey = "manifest.json";
const zipFolder = "packaging-waste-dataset";
const refreshAfterMs = 3000;

class DatasetService {
  private photos: Photo[] = [];
  private loadedAt = 0;
  private loading: Promise<void> | null = null;

  async load() {
    if (!(await redis.hlen(photosKey))) await this.importOldManifest();
    await this.refresh(0);
    logger.info(`Loaded ${this.photos.length} photos from Redis`);
  }

  async refresh(maxAgeMs = refreshAfterMs) {
    if (Date.now() - this.loadedAt < maxAgeMs) return;
    this.loading ??= this.readPhotos().finally(() => (this.loading = null));
    await this.loading;
  }

  imageKey(photo: Photo) {
    return `images/${photo.category}/${photo.id}.jpg`;
  }

  publicUrl(photo: Photo) {
    return getPublicUrl(this.imageKey(photo));
  }

  async list(): Promise<PhotoWithUrl[]> {
    await this.refresh();
    return this.photos.map((photo) => ({ ...photo, imageUrl: this.publicUrl(photo) }));
  }

  countIn(category: string) {
    return this.photos.filter((photo) => photo.category === category).length;
  }

  isCategoryFull(category: string) {
    return this.countIn(category) >= perCategory;
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
    await redis.hset(photosKey, { [photo.id]: JSON.stringify(photo) });
    if (!this.photos.some((saved) => saved.id === photo.id)) this.photos.push(photo);
  }

  async remove(id: string) {
    await this.refresh(0);
    const photo = this.photos.find((saved) => saved.id === id);
    if (!photo) {
      logger.warn(`Tried to remove ${id}, but it isn't in the dataset`);
      return false;
    }

    await redis.hdel(photosKey, id);
    this.photos = this.photos.filter((saved) => saved.id !== id);
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

  private async readPhotos() {
    const saved = await redis.hgetall(photosKey);
    this.photos = Object.values(saved).map((value) => JSON.parse(value) as Photo);
    this.loadedAt = Date.now();
  }

  private async importOldManifest() {
    const manifest = await getFile(oldManifestKey);
    if (!manifest) return;
    const saved = JSON.parse(new TextDecoder().decode(manifest));
    const photos: Photo[] = saved.photos ?? saved.items ?? [];
    if (!photos.length) return;
    await redis.hset(
      photosKey,
      Object.fromEntries(photos.map((photo) => [photo.id, JSON.stringify(photo)]))
    );
    logger.info(`Imported ${photos.length} photos from the old R2 manifest`);
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
