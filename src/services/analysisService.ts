import type { ItemFormData } from "../components/ItemEntryForm";

export interface SavedAnalysis {
  id: string;
  createdAt: string;
  item: ItemFormData;
}

const STORAGE_PREFIX = "truecost_analyses_";

const getStorageKey = (userId: string): string => `${STORAGE_PREFIX}${userId.trim()}`;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isSavedAnalysis = (value: unknown): value is SavedAnalysis => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.createdAt) &&
    "item" in candidate
  );
};

const isSavedAnalysisArray = (value: unknown): value is SavedAnalysis[] =>
  Array.isArray(value) && value.every(isSavedAnalysis);

const validateUserId = (userId: string): void => {
  if (!isNonEmptyString(userId)) {
    throw new Error("A valid userId is required.");
  }
};

const parseStoredAnalyses = (rawValue: string | null): SavedAnalysis[] => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      console.warn("Stored analyses data is not an array. Resetting to empty.");
      return [];
    }

    return parsed.filter(isSavedAnalysis);
  } catch (error) {
    console.error("Failed to parse saved analyses from localStorage.", error);
    return [];
  }
};

export const AnalysisService = {
  getAll(userId: string): SavedAnalysis[] {
    validateUserId(userId);
    const rawValue = localStorage.getItem(getStorageKey(userId));
    return parseStoredAnalyses(rawValue);
  },

  save(userId: string, item: ItemFormData): SavedAnalysis {
    validateUserId(userId);

    const analyses = AnalysisService.getAll(userId);
    const entry: SavedAnalysis = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      item,
    };

    try {
      localStorage.setItem(
        getStorageKey(userId),
        JSON.stringify([entry, ...analyses])
      );
    } catch (error) {
      console.error("Failed to save analysis to localStorage.", error);
      throw new Error("Unable to save analysis right now.");
    }

    return entry;
  },

  delete(userId: string, id: string): void {
    validateUserId(userId);

    if (!isNonEmptyString(id)) {
      throw new Error("A valid analysis id is required.");
    }

    const analyses = AnalysisService.getAll(userId).filter((analysis) => analysis.id !== id);

    try {
      localStorage.setItem(getStorageKey(userId), JSON.stringify(analyses));
    } catch (error) {
      console.error("Failed to delete analysis from localStorage.", error);
      throw new Error("Unable to delete analysis right now.");
    }
  },
};