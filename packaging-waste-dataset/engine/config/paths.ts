const projectRoot = new URL("../../", import.meta.url).pathname;

export const REVIEW_DIR = `${projectRoot}review/`;

export const cachedImagePath = (id: string) => `${projectRoot}.cache/images/${id}.jpg`;

export const cachedSearchPath = (categoryId: string) =>
  `${projectRoot}.cache/search/${categoryId}.json`;
