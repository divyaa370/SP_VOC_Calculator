import type { ItemFormData } from "../components/ItemEntryForm";

export interface SearchHistoryEntry {
  id: string;
  searchedAt: string;
  item: ItemFormData;
  label: string;
}

const key = (userId: string) => `truecost_history_${userId}`;
const MAX_ENTRIES = 50;

export function getSearchHistory(userId: string): SearchHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(key(userId)) ?? "[]");
  } catch {
    return [];
  }
}

export function addSearchHistory(userId: string, item: ItemFormData): SearchHistoryEntry {
  const history = getSearchHistory(userId);
  const label =
    item.category === "car"
      ? `${item.year} ${item.make} ${item.model}`
      : `${item.breed} (${item.petType})`;

  const entry: SearchHistoryEntry = {
    id: crypto.randomUUID(),
    searchedAt: new Date().toISOString(),
    item,
    label,
  };

  const updated = [entry, ...history].slice(0, MAX_ENTRIES);
  localStorage.setItem(key(userId), JSON.stringify(updated));
  return entry;
}

export function clearSearchHistory(userId: string): void {
  localStorage.removeItem(key(userId));
}

export function deleteSearchHistoryEntry(userId: string, id: string): void {
  const history = getSearchHistory(userId).filter((e) => e.id !== id);
  localStorage.setItem(key(userId), JSON.stringify(history));
}
