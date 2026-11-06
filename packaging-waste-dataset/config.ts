export type Category = {
  id: string;
  label: string;
  description: string;
  subjects: string[];
  addedAt: number;
};

export const engineUrl = "https://packaging-waste-dataset.api.benlab.space";

export const uploadLimit = { files: 5, bytes: 5 * 1024 * 1024 };

export const aiChecksPerDay = 1000;

export const places = ["", "Nigeria", "Lagos", "Abuja", "nairaland"];

export const defaultCategories: Category[] = [
  {
    id: "water-bottle",
    label: "Water bottles",
    description: "a plastic water or soft drink bottle",
    addedAt: 0,
    subjects: [
      "empty plastic water bottle",
      "plastic bottles litter",
      "used water bottles waste",
      "crushed plastic bottle",
      "plastic bottles in gutter",
    ],
  },
  {
    id: "sachet-water",
    label: "Sachet water",
    description: "a pure water sachet, the small plastic bag of drinking water",
    addedAt: 1,
    subjects: [
      "empty pure water sachet",
      "pure water nylon litter",
      "used sachet water waste",
      "pure water sachets in gutter",
      "sachet water litter street",
    ],
  },
  {
    id: "packaged-food",
    label: "Packaged food",
    description:
      "a food wrapper or pack, such as an Indomie nylon, a biscuit wrapper or a snack pack",
    addedAt: 2,
    subjects: [
      "empty Indomie wrapper",
      "Indomie nylon litter",
      "empty biscuit wrapper",
      "biscuit nylon litter",
      "empty plantain chips nylon",
      "empty chin chin pack",
      "snack wrapper litter",
      "food wrapper litter",
    ],
  },
];
