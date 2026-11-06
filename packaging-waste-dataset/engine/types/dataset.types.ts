export type Photo = {
  id: string;
  category: string;
  width: number;
  height: number;
  hash: string;
  url: string;
  page?: string;
  title?: string;
  reason?: string;
  source: "search" | "upload" | "agent";
};

export type PhotoWithUrl = Photo & { imageUrl: string };

export type JobState = "idle" | "queued" | "running" | "done" | "stopped" | "failed";

export type CategoryJob = { categoryId: string; state: JobState; checked: number; added: number };

export type CollectionStatus = { running: boolean; jobs: CategoryJob[] };

export type UploadResult = {
  fileName: string;
  accepted: boolean;
  category?: string;
  reason?: string;
};
