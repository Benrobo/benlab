export const MODELS = {
  openai: {
    gpt6Luna: "openai/gpt-6-luna",
  },
  google: {
    geminiFlashLite: "google/gemini-2.5-flash-lite",
    gemini31FlashLite: "google/gemini-3.1-flash-lite",
    gemini25Flash: "google/gemini-2.5-flash",
  },
} as const;

export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

type ModelId = {
  [Provider in keyof typeof MODELS]: (typeof MODELS)[Provider][keyof (typeof MODELS)[Provider]];
}[keyof typeof MODELS];

export const AI_MODEL_CONFIG = {
  // imageClassification: { model: MODELS.openai.gpt6Luna, reasoningEffort: "none" },
  imageClassification: { model: MODELS.google.gemini25Flash, reasoningEffort: "none" },
} as const satisfies Record<string, { model: ModelId; reasoningEffort: ReasoningEffort }>;
