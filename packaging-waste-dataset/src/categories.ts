import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

const categoryColors = [
  "#3b82f6",
  "#f97316",
  "#14b8a6",
  "#eab308",
  "#ec4899",
  "#8b5cf6",
  "#22c55e",
  "#ef4444",
  "#06b6d4",
  "#a16207",
];

export function useCategories() {
  const { data: allCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.getCategories,
    refetchInterval: 30_000,
  });

  const categories = allCategories.filter(({ archived }) => !archived);

  const categoryLabel = (id: string) =>
    allCategories.find((category) => category.id === id)?.label ?? id;

  const categoryColor = (id: string) => {
    const index = allCategories.findIndex((category) => category.id === id);
    return index < 0 ? "#a3a29d" : categoryColors[index % categoryColors.length]!;
  };

  return { categories, allCategories, categoryLabel, categoryColor };
}
