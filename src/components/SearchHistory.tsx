import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import type { SearchHistoryEntry } from "../lib/searchHistory";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

interface SearchHistoryProps {
  entries: SearchHistoryEntry[];
  onSelect: (entry: SearchHistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export function SearchHistory({ entries, onSelect, onDelete, onClear }: SearchHistoryProps) {
  const navigate = useNavigate();

  if (entries.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-16">
        <p>No search history yet.</p>
        <Button className="mt-4" onClick={() => navigate("/")}>Start a calculation</Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onClear}>Clear all</Button>
      </div>
      {entries.map((entry) => (
        <Card key={entry.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{entry.label}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between pt-0">
            <span className="text-sm text-muted-foreground">{formatDate(entry.searchedAt)}</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onSelect(entry)}>Re-run</Button>
              <Button size="sm" variant="outline" onClick={() => onDelete(entry.id)}>Delete</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
