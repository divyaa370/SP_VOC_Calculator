import type { ItemFormData } from "../components/ItemEntryForm";

export interface SavedAnalysis {
  id: string;
  createdAt: string;
  item: ItemFormData;
}

const key = (userId: string) => `truecost_analyses_${userId}`;

export function getSavedAnalyses(userId: string): SavedAnalysis[] {
  try {
    return JSON.parse(localStorage.getItem(key(userId)) ?? "[]");
  } catch {
    return [];
  }
}

export function saveAnalysis(userId: string, item: ItemFormData): SavedAnalysis {
  const analyses = getSavedAnalyses(userId);
  const entry: SavedAnalysis = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    item,
  };
  localStorage.setItem(key(userId), JSON.stringify([entry, ...analyses]));
  return entry;
}

export function deleteAnalysis(userId: string, id: string): void {
  const analyses = getSavedAnalyses(userId).filter((a) => a.id !== id);
  localStorage.setItem(key(userId), JSON.stringify(analyses));
}

export function getAnalysisById(userId: string, id: string): SavedAnalysis | undefined {
  return getSavedAnalyses(userId).find((a) => a.id === id);
}
