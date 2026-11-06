import { perCategory } from "../../config";
import { getFile } from "../config/r2";
import type { Photo } from "../types/dataset.types";
import { categoryService } from "./category.service";
import { datasetService } from "./dataset.service";
import { imageService } from "./image.service";
import { createLogger } from "../lib/logger";

const logger = createLogger("agent");

const viewSize = 768;
const downloadTimeoutMs = 20_000;
const unusableImage =
  "Couldn't use this image. It didn't download, or it is an SVG, transparent or smaller than 320px.";

type ImageSource = { imageUrl?: string; imageBase64?: string; pageUrl?: string };

type NewPhoto = ImageSource & { category: string; reason: string };

class AgentService {
  async progress() {
    const photos = await datasetService.list();
    return categoryService.list().map(({ id, label, description }) => {
      const saved = photos.filter((photo) => photo.category === id).length;
      return {
        category: id,
        description,
        label,
        saved,
        target: perCategory,
        needed: Math.max(0, perCategory - saved),
      };
    });
  }

  async viewImage(source: ImageSource & { photoId?: string }) {
    const image = source.photoId
      ? await this.getSavedImage(source.photoId)
      : await this.getImage(source);
    if (!image) return { problem: source.photoId ? "No photo with that id" : unusableImage };

    const { width, height, visualHash } = await imageService.describe(image);
    await datasetService.refresh(0);
    return {
      image: await imageService.resize(image, viewSize),
      width,
      height,
      alreadyInDataset:
        !source.photoId &&
        ((source.imageUrl && datasetService.hasPhotoFrom(source.imageUrl)) ||
          datasetService.looksLikeSavedPhoto(visualHash)),
    };
  }

  async addPhoto({ category, reason, ...source }: NewPhoto) {
    if (!categoryService.find(category)) return { added: false, problem: "Unknown category" };

    await datasetService.refresh(0);
    if (datasetService.isCategoryFull(category)) {
      return { added: false, problem: `${category} already has ${perCategory} photos` };
    }
    if (source.imageUrl && datasetService.hasPhotoFrom(source.imageUrl)) {
      return { added: false, problem: "This image is already in the dataset" };
    }

    const image = await this.getImage(source);
    if (!image) return { added: false, problem: unusableImage };

    const { width, height, visualHash } = await imageService.describe(image);
    if (datasetService.looksLikeSavedPhoto(visualHash)) {
      return { added: false, problem: "A near identical photo is already in the dataset" };
    }

    const id = imageService.createId(image);
    const photo: Photo = {
      id,
      category,
      width,
      height,
      hash: visualHash,
      url: source.imageUrl ?? `agent:${id}`,
      page: source.pageUrl,
      reason,
      source: "agent",
    };
    await datasetService.add(photo, image);
    logger.info(`Added ${id} to ${category}: ${reason} ${source.imageUrl ?? "(sent as data)"}`);
    return { added: true, id, imageUrl: datasetService.publicUrl(photo) };
  }

  private async getImage({ imageUrl, imageBase64, pageUrl }: ImageSource) {
    if (imageBase64) {
      const data = imageBase64.replace(/^data:[^,]+,/, "");
      return imageService.prepare(Buffer.from(data, "base64")).catch(() => null);
    }
    if (!imageUrl) return null;
    return imageService.getImage(
      { url: imageUrl, page: pageUrl },
      imageService.createId(imageUrl),
      AbortSignal.timeout(downloadTimeoutMs)
    );
  }

  private async getSavedImage(photoId: string) {
    const photo = (await datasetService.list()).find(({ id }) => id === photoId);
    const image = photo && (await getFile(datasetService.imageKey(photo)));
    return image ? Buffer.from(image) : null;
  }
}

export const agentService = new AgentService();
export default agentService;
