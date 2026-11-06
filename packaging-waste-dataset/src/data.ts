import { categories } from "../config";
import type { CollectionStatus, PhotoWithUrl, UploadResult } from "../engine/types/dataset.types";

const categoryColors = ["#3b82f6", "#f97316", "#14b8a6", "#eab308", "#ec4899"];

export const categoryLabel = (id: string) =>
  categories.find((category) => category.id === id)?.label ?? id;

export const categoryColor = (id: string) =>
  categoryColors[categories.findIndex((category) => category.id === id)] ?? "#a3a29d";

const rejectionMessages: Record<string, string> = {
  duplicate: "Already in the dataset",
  "too-large": "Larger than 5 MB",
  unreadable: "Couldn't read this photo",
};

export const rejectionMessage = (reason = "unreadable") => rejectionMessages[reason] ?? reason;

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
  uploadPhotos: (files: File[]) => {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    return fetch("/api/uploads", { method: "POST", body: form }).then(readJson<UploadResult[]>);
  },
  downloadLink: (category: string) => `/api/download?category=${category}`,
};
