import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import type { SavedAnalysis } from "../services/analysisService";
import type { ItemFormData } from "./ItemEntryForm";

function itemLabel(item: ItemFormData): string {
  return item.category === "car"
    ? `${item.year} ${item.make} ${item.model}`
    : `${item.breed} (${item.petType})`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface SavedAnalysesProps {
  analyses: SavedAnalysis[];
  onView: (analysis: SavedAnalysis) => void;
  onDelete: (id: string) => void;
}

export function SavedAnalyses({ analyses, onView, onDelete }: SavedAnalysesProps) {
  if (analyses.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-16" data-testid="empty-saved">
        No saved analyses yet. Run a calculation and save it to see it here.
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-3" data-testid="saved-analyses-list">
      {analyses.map((analysis) => (
        <Card key={analysis.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{itemLabel(analysis.item)}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between pt-0">
            <span className="text-sm text-muted-foreground">{formatDate(analysis.createdAt)}</span>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onView(analysis)}>
                View
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete(analysis.id)}
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
