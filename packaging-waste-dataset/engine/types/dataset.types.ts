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

export type UploadResult = {
  fileName: string;
  accepted: boolean;
  category?: string;
  reason?: string;
};
