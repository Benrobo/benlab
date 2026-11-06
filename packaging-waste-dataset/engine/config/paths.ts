const projectRoot = new URL("../../", import.meta.url).pathname;

export const cachedImagePath = (id: string) => `${projectRoot}.cache/images/${id}.jpg`;
