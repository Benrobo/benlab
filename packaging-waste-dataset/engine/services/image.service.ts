import sharp from "sharp";
import { cachedImagePath } from "../config/paths";

export type ImageSource = { url: string; page?: string };

const userAgent =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const minimumSide = 320;
const maximumDownloadBytes = 25_000_000;
const downloadTimeoutMs = 12_000;
const storedSize = 1280;
const previewSize = 384;
const similarityThreshold = 6;

class ImageService {
  createId(value: string | Uint8Array) {
    return Bun.hash(value).toString(16).padStart(16, "0");
  }

  async getImage(source: ImageSource, id: string, signal: AbortSignal) {
    const cached = Bun.file(cachedImagePath(id));
    if (await cached.exists()) return Buffer.from(await cached.arrayBuffer());

    const image = await this.download(source, signal).catch(() => null);
    if (image) await Bun.write(cached, image);
    return image;
  }

  async prepare(input: Buffer) {
    const [{ width = 0, height = 0, format }, { isOpaque }] = await Promise.all([
      sharp(input).metadata(),
      sharp(input).stats(),
    ]);
    if (format === "svg" || !isOpaque || Math.min(width, height) < minimumSide) return null;

    return sharp(input)
      .rotate()
      .resize(storedSize, storedSize, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 84, mozjpeg: true })
      .toBuffer();
  }

  async describe(image: Buffer) {
    const [{ width = 0, height = 0 }, preview, visualHash] = await Promise.all([
      sharp(image).metadata(),
      this.resize(image, previewSize),
      this.computeVisualHash(image),
    ]);
    return { width, height, preview, visualHash };
  }

  resize(image: Buffer, size: number) {
    return sharp(image)
      .resize(size, size, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  looksLikeAny(visualHash: string, otherHashes: string[]) {
    return otherHashes.some(
      (other) => this.countDifferentBits(visualHash, other) <= similarityThreshold
    );
  }

  private async download({ url, page }: ImageSource, signal: AbortSignal) {
    const response = await fetch(url, {
      headers: {
        "user-agent": userAgent,
        accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        ...(page && { referer: page }),
      },
      signal: AbortSignal.any([signal, AbortSignal.timeout(downloadTimeoutMs)]),
    });
    if (!response.ok || response.headers.get("content-type")?.includes("text/")) return null;

    const input = Buffer.from(await response.arrayBuffer());
    return input.byteLength > maximumDownloadBytes ? null : this.prepare(input);
  }

  private async computeVisualHash(image: Buffer) {
    const pixels = await sharp(image)
      .removeAlpha()
      .grayscale()
      .resize(9, 8, { fit: "fill" })
      .raw()
      .toBuffer();

    let bits = "";
    for (let row = 0; row < 8; row++) {
      for (let column = 0; column < 8; column++) {
        const left = pixels[row * 9 + column]!;
        const right = pixels[row * 9 + column + 1]!;
        bits += left > right ? "1" : "0";
      }
    }
    return BigInt(`0b${bits}`).toString(16).padStart(16, "0");
  }

  private countDifferentBits(firstHash: string, secondHash: string) {
    const difference = BigInt(`0x${firstHash}`) ^ BigInt(`0x${secondHash}`);
    return difference.toString(2).replaceAll("0", "").length;
  }
}

export const imageService = new ImageService();
export default imageService;
