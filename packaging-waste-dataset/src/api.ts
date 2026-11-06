import type { CollectionStatus, PhotoWithUrl, UploadResult } from "../engine/types/dataset.types";

const uploadSize = 1280;

async function shrinkPhoto(file: File) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, uploadSize / Math.max(bitmap.width, bitmap.height));
    const canvas = new OffscreenCanvas(
      Math.round(bitmap.width * scale),
      Math.round(bitmap.height * scale)
    );
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.88 });
    return new File([blob], file.name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function readJson<T>(response: Response) {
  if (!response.ok) throw new Error(response.statusText);
  return (await response.json()) as T;
}

export const api = {
  getPhotos: () => fetch("/api/photos").then(readJson<PhotoWithUrl[]>),
  removePhoto: (id: string) =>
    fetch(`/api/photos/${id}`, { method: "DELETE" }).then(readJson<{ removed: boolean }>),
  getCollection: () => fetch("/api/collection").then(readJson<CollectionStatus>),
  startCollecting: () =>
    fetch("/api/collection", { method: "POST" }).then(readJson<CollectionStatus>),
  stopCollecting: () =>
    fetch("/api/collection", { method: "DELETE" }).then(readJson<CollectionStatus>),
  uploadPhotos: async (files: File[]) => {
    const form = new FormData();
    for (const file of await Promise.all(files.map(shrinkPhoto))) form.append("files", file);
    return fetch("/api/uploads", { method: "POST", body: form }).then(readJson<UploadResult[]>);
  },
  downloadLink: (category: string) => `/api/download?category=${category}`,
};
