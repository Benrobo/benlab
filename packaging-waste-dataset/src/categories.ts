import { categories } from "../config";

const categoryColors = ["#3b82f6", "#f97316", "#14b8a6", "#eab308", "#ec4899"];

export const categoryLabel = (id: string) =>
  categories.find((category) => category.id === id)?.label ?? id;

export const categoryColor = (id: string) =>
  categoryColors[categories.findIndex((category) => category.id === id)] ?? "#a3a29d";
