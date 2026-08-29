// Presets — catalog of pre-configured AI transforms
export {
  PRESETS,
  PRESET_CATEGORIES,
  isValidPreset,
  getPresetConfig,
  getPresetsByCategory,
} from "./presets";
export type { PresetId, PresetConfig, PresetCategory, PresetCategoryConfig } from "./presets";

// Generation & Transforms — free-form writing, presets, and selection transforms
export { generate, streamGenerate, MAX_PROMPT_LENGTH, MAX_SELECTION_LENGTH } from "./generate";
export { streamMockAiResponse, generateMockAiContent } from "./mockAi";

