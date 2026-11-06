import { forgetAdminToken, getAdminToken } from "./admin-token";
import type { Category } from "../config";
import type { PhotoWithUrl, UploadResult } from "../engine/types/dataset.types";

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

async function adminHeaders() {
  const token = await getAdminToken();
  if (!token) throw new Error("This needs the admin token");
  return { authorization: `Bearer ${token}` };
}

async function readJson<T>(response: Response) {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    if (response.status === 401) forgetAdminToken();
    throw new Error(body?.error ?? "The engine didn't respond");
  }
  return (await response.json()) as T;
}

export type NewCategory = { label: string; description: string; subjects: string[] };

export const api = {
  getCategories: () => fetch("/api/categories").then(readJson<Category[]>),
  setCategoryArchived: async (id: string, archived: boolean) =>
    fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...(await adminHeaders()) },
      body: JSON.stringify({ archived }),
    }).then(readJson<Category>),
  editCategory: (id: string, category: NewCategory) =>
    fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(category),
    }).then(readJson<Category>),
  addCategory: (category: NewCategory) =>
    fetch("/api/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(category),
    }).then(readJson<Category>),
  getPhotos: () => fetch("/api/photos").then(readJson<PhotoWithUrl[]>),
  removePhoto: async (id: string) =>
    fetch(`/api/photos/${id}`, { method: "DELETE", headers: await adminHeaders() }).then(
      readJson<{ removed: boolean }>
    ),
  uploadPhotos: async (files: File[], category: string) => {
    const form = new FormData();
    form.append("category", category);
    for (const file of await Promise.all(files.map(shrinkPhoto))) form.append("files", file);
    return fetch("/api/uploads", { method: "POST", body: form }).then(readJson<UploadResult[]>);
  },
  downloadLink: (category: string) => `/api/download?category=${category}`,
};
