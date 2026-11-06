export type Category = {
  id: string;
  label: string;
  description: string;
  subjects: string[];
  addedAt: number;
  archived?: boolean;
};

export const engineUrl = "https://packaging-waste-dataset.api.benlab.space";

export const uploadLimit = { files: 5, bytes: 5 * 1024 * 1024 };

export const photoRules = [
  "Only the packaging counts, never what it contains.",
  "The packaging has been opened, emptied or left lying around. It does not need to look dirty or like trash, but it is not sealed and full, held, in use or for sale.",
  "It is a casual photo a regular person could take, not a professional product shot, an ad or a graphic. A plain or tidy background like a table, desk or floor is fine.",
  "No person or part of a person is visible.",
  "At most 4 pieces of the packaging are visible.",
  "The packaging is the clear main subject. Other things can be around it as long as they don't compete for attention.",
  "Nothing was added on top of the photo.",
  "Nothing clearly shows the photo was taken outside Nigeria.",
  "Judge each rule only by what is clearly visible, and don't reject a photo over doubts it doesn't show.",
];

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
