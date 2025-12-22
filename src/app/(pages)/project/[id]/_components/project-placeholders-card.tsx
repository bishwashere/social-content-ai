"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { useUpdateProject } from "@/backend-apis/projects/hooks";
import { getProjectPlaceholders, PlaceholderMap } from "@/lib/placeholders";

type Props = {
  projectId: string;
  project: { platformUrls?: unknown } | null | undefined;
};

type Row = { key: string; value: string };

function toRows(map: PlaceholderMap): Row[] {
  return Object.entries(map)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function normalizeKey(key: string) {
  return key.trim().replace(/^\[|\]$/g, "");
}

export function ProjectPlaceholdersCard({ projectId, project }: Props) {
  const updateProject = useUpdateProject();

  const initial = useMemo(() => getProjectPlaceholders(project), [project]);
  const [rows, setRows] = useState<Row[]>(() => toRows(initial));
  const [dirty, setDirty] = useState(false);

  const previewKeys = useMemo(() => rows.map((r) => normalizeKey(r.key)).filter(Boolean), [rows]);

  const setRow = (idx: number, patch: Partial<Row>) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
    setDirty(true);
  };

  const addRow = () => {
    setRows((prev) => [...prev, { key: "", value: "" }]);
    setDirty(true);
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  };

  const onSave = async () => {
    const map: Record<string, string> = {};
    for (const r of rows) {
      const key = normalizeKey(r.key);
      if (!key) continue;
      map[key] = r.value ?? "";
    }

    // basic duplicate detection (case-insensitive)
    const normalizedKeys = Object.keys(map).map((k) => k.toLowerCase());
    const hasDupes = new Set(normalizedKeys).size !== normalizedKeys.length;
    if (hasDupes) {
      toast.error("Duplicate placeholder keys detected (case-insensitive).");
      return;
    }

    await updateProject.mutateAsync({ id: projectId, placeholders: map } as any);
    toast.success("Placeholders saved");
    setDirty(false);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="text-base">Placeholders</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Define tokens like <span className="font-mono">[Address]</span> and we’ll replace them in previews and when posting.
          </p>
          {previewKeys.length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Active:{" "}
              <span className="font-mono">
                {previewKeys.slice(0, 6).map((k) => `[${k}]`).join(", ")}
                {previewKeys.length > 6 ? "…" : ""}
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
          <Button size="sm" onClick={onSave} disabled={updateProject.isPending || !dirty}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No placeholders yet. Click <span className="font-medium">Add</span> to create one (e.g. key: <span className="font-mono">Address</span>).
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-2 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-14 hidden md:inline-block">Token</span>
                  <Input
                    value={r.key}
                    onChange={(e) => setRow(idx, { key: e.target.value })}
                    placeholder="Address"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-14 hidden md:inline-block">Value</span>
                  <Input
                    value={r.value}
                    onChange={(e) => setRow(idx, { value: e.target.value })}
                    placeholder="123 Main St, City"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(idx)}
                  aria-label="Remove placeholder"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


