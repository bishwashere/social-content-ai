"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Plus,
  Globe,
  Apple,
  Play,
  Facebook,
  Linkedin,
  Instagram,
  Twitter,
  Youtube,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Destination type catalogue ───────────────────────────────────────────────

export type DestinationTypeDef = {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** The placeholder key written to the project (e.g. "AppStore" → [AppStore]). Empty for Custom. */
  placeholder: string;
  urlHint: string;
};

export const DESTINATION_TYPES: DestinationTypeDef[] = [
  { id: "Website",   label: "Website",           icon: <Globe className="h-4 w-4" />,        placeholder: "Website",   urlHint: "https://yourwebsite.com" },
  { id: "AppStore",  label: "Apple App Store",   icon: <Apple className="h-4 w-4" />,        placeholder: "AppStore",  urlHint: "https://apps.apple.com/app/..." },
  { id: "PlayStore", label: "Google Play Store", icon: <Play className="h-4 w-4" />,         placeholder: "PlayStore", urlHint: "https://play.google.com/store/apps/..." },
  { id: "Facebook",  label: "Facebook Page",     icon: <Facebook className="h-4 w-4" />,     placeholder: "Facebook",  urlHint: "https://facebook.com/yourpage" },
  { id: "LinkedIn",  label: "LinkedIn Page",     icon: <Linkedin className="h-4 w-4" />,     placeholder: "LinkedIn",  urlHint: "https://linkedin.com/company/..." },
  { id: "Instagram", label: "Instagram Profile", icon: <Instagram className="h-4 w-4" />,   placeholder: "Instagram", urlHint: "https://instagram.com/yourhandle" },
  { id: "Twitter",   label: "X / Twitter",       icon: <Twitter className="h-4 w-4" />,      placeholder: "Twitter",   urlHint: "https://x.com/yourhandle" },
  { id: "YouTube",   label: "YouTube Channel",   icon: <Youtube className="h-4 w-4" />,      placeholder: "YouTube",   urlHint: "https://youtube.com/@yourchannel" },
  { id: "Custom",    label: "Custom",            icon: <ExternalLink className="h-4 w-4" />, placeholder: "",          urlHint: "https://..." },
];

/** URL pattern → typeId mapping for auto-detection */
const URL_TYPE_PATTERNS: { pattern: RegExp; typeId: string }[] = [
  { pattern: /apps\.apple\.com/i,          typeId: "AppStore" },
  { pattern: /play\.google\.com/i,         typeId: "PlayStore" },
  { pattern: /(?:facebook|fb)\.com/i,      typeId: "Facebook" },
  { pattern: /linkedin\.com/i,             typeId: "LinkedIn" },
  { pattern: /instagram\.com/i,            typeId: "Instagram" },
  { pattern: /(?:twitter|x)\.com/i,        typeId: "Twitter" },
  { pattern: /(?:youtube\.com|youtu\.be)/i, typeId: "YouTube" },
];

export function detectTypeFromUrl(url: string): string {
  for (const { pattern, typeId } of URL_TYPE_PATTERNS) {
    if (pattern.test(url)) return typeId;
  }
  return "Website";
}

// ─── Destination row type ─────────────────────────────────────────────────────

export type DestinationRow = {
  typeId: string;
  /** Only used when typeId === "Custom" */
  customLabel: string;
  url: string;
};

export function rowToPlaceholderKey(row: DestinationRow): string {
  if (row.typeId === "Custom") {
    return row.customLabel.trim().replace(/\s+/g, "_");
  }
  const type = DESTINATION_TYPES.find((t) => t.id === row.typeId);
  return type?.placeholder || row.typeId;
}

/** Convert a placeholder map (from DB) back into DestinationRow[] */
export function placeholderMapToRows(map: Record<string, string>): DestinationRow[] {
  return Object.entries(map).map(([key, value]) => {
    const known = DESTINATION_TYPES.find((t) => t.placeholder === key);
    return {
      typeId: known ? known.id : "Custom",
      customLabel: known ? "" : key,
      url: value,
    };
  });
}

/** Convert DestinationRow[] to a placeholder map for saving */
export function rowsToPlaceholderMap(rows: DestinationRow[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const row of rows) {
    const key = rowToPlaceholderKey(row);
    if (!key || !row.url.trim()) continue;
    map[key] = row.url.trim();
  }
  return map;
}

// ─── DestinationsManager component ───────────────────────────────────────────

type Props = {
  destinations: DestinationRow[];
  onChange: (rows: DestinationRow[]) => void;
};

export function DestinationsManager({ destinations, onChange }: Props) {
  const [urlInput, setUrlInput] = useState("");
  const [detectedType, setDetectedType] = useState("Website");
  const [customLabel, setCustomLabel] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editUrl, setEditUrl] = useState("");

  const existingKeys = useMemo(
    () => new Set(destinations.map(rowToPlaceholderKey).filter(Boolean)),
    [destinations]
  );

  // Auto-detect type as user types the URL
  const handleUrlChange = (val: string) => {
    setUrlInput(val);
    if (val.trim()) {
      setDetectedType(detectTypeFromUrl(val));
    }
  };

  const handleAdd = () => {
    const url = urlInput.trim();
    if (!url) { toast.error("Please enter a URL."); return; }

    const typeId = detectedType;
    const label = typeId === "Custom" ? customLabel.trim() : typeId;
    if (!label) { toast.error("Please enter a label for the custom destination."); return; }
    const key = typeId === "Custom" ? label.replace(/\s+/g, "_") : label;

    if (existingKeys.has(key)) {
      toast.error(`"[${key}]" is already in the list.`);
      return;
    }

    onChange([...destinations, { typeId, customLabel: typeId === "Custom" ? customLabel.trim() : "", url }]);
    setUrlInput("");
    setCustomLabel("");
    setDetectedType("Website");
    setIsAdding(false);
  };

  const handleRemove = (idx: number) => {
    onChange(destinations.filter((_, i) => i !== idx));
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditUrl(destinations[idx].url);
  };

  const commitEdit = () => {
    if (editingIdx === null) return;
    const url = editUrl.trim();
    if (!url) { toast.error("URL cannot be empty."); return; }
    const next = [...destinations];
    next[editingIdx] = { ...next[editingIdx], url };
    onChange(next);
    setEditingIdx(null);
    setEditUrl("");
  };

  const typeDef = DESTINATION_TYPES.find((t) => t.id === detectedType);

  return (
    <div className="space-y-3">
      {/* Existing rows */}
      {destinations.length > 0 && (
        <div className="space-y-2">
          {destinations.map((row, idx) => {
            const def = DESTINATION_TYPES.find((t) => t.id === row.typeId);
            const key = rowToPlaceholderKey(row);
            const isEditingThis = editingIdx === idx;
            return (
              <div key={idx} className="flex items-center gap-2 p-2.5 border rounded-lg bg-muted/30 min-w-0">
                <span className="text-muted-foreground shrink-0">{def?.icon}</span>
                <Badge variant="secondary" className="font-mono text-[11px] shrink-0">[{key}]</Badge>
                {isEditingThis ? (
                  <>
                    <Input
                      className="h-7 text-xs flex-1 min-w-0"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingIdx(null); }}
                      autoFocus
                    />
                    <Button size="sm" className="h-7 px-2 text-xs" onClick={commitEdit}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditingIdx(null)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">{row.url}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => startEdit(idx)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleRemove(idx)} aria-label="Remove">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add new */}
      {isAdding ? (
        <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
          <div className="space-y-1.5">
            <Label className="text-xs">Paste a URL — type is auto-detected</Label>
            <Input
              value={urlInput}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://..."
              type="url"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            />
            {urlInput.trim() && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <span className="text-muted-foreground">{typeDef?.icon}</span>
                Detected: <span className="font-medium">{typeDef?.label}</span>
                <span className="font-mono ml-1">[{detectedType === "Custom" ? (customLabel.trim().replace(/\s+/g, "_") || "Label") : detectedType}]</span>
              </p>
            )}
          </div>

          {/* Type override */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Override type (optional)</Label>
            <Select value={detectedType} onValueChange={setDetectedType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DESTINATION_TYPES.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    <span className="flex items-center gap-2">
                      {t.icon} {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {detectedType === "Custom" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Custom label</Label>
              <Input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g. ProductHunt"
                className="h-8 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Becomes <span className="font-mono">[{customLabel.trim().replace(/\s+/g, "_") || "Label"}]</span>
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} className={cn("gap-1", !urlInput.trim() && "opacity-50")}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setUrlInput(""); setCustomLabel(""); setDetectedType("Website"); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 w-full justify-start"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add destination
        </Button>
      )}

      {destinations.length === 0 && !isAdding && (
        <p className="text-xs text-muted-foreground italic">
          Paste any URL — the placeholder token is auto-detected (e.g. an App Store link becomes <span className="font-mono">[AppStore]</span>).
        </p>
      )}
    </div>
  );
}
