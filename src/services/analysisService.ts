import type { ItemFormData } from "../components/ItemEntryForm";

export interface SavedAnalysis {
  id: string;
  createdAt: string;
  item: ItemFormData;
}

const key = (userId: string) => `truecost_analyses_${userId}`;

export const AnalysisService = {
  getAll(userId: string): SavedAnalysis[] {
    try {
      return JSON.parse(localStorage.getItem(key(userId)) ?? "[]");
    } catch {
      return [];
    }
  },

  save(userId: string, item: ItemFormData): SavedAnalysis {
    const analyses = AnalysisService.getAll(userId);
    const entry: SavedAnalysis = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      item,
    };
    localStorage.setItem(key(userId), JSON.stringify([entry, ...analyses]));
    return entry;
  },

  delete(userId: string, id: string): void {
    const analyses = AnalysisService.getAll(userId).filter((a) => a.id !== id);
    localStorage.setItem(key(userId), JSON.stringify(analyses));
  },
};
