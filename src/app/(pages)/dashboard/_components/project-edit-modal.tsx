import { useEffect, useMemo, useState } from "react";
import { Settings, Trash, Plus, Save } from "lucide-react";
import { InviteUserDialog } from "../_components/invite-user";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS } from "@/lib/prompt";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useDeleteProject, useUpdateProject } from "@/backend-apis/projects/hooks";
import { Projects as Project } from "@prisma/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProjectWithChats } from "@/backend-apis/projects/types";
import { confirm } from "@/components/ui/alert-dialog";
import { useSession } from "@/backend-apis/auth/hooks";
import { getProjectPlaceholders, PlaceholderMap } from "@/lib/placeholders";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";

type Row = { key: string; value: string };

function toRows(map: PlaceholderMap): Row[] {
  return Object.entries(map)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function normalizeKey(key: string) {
  return key.trim().replace(/^\[|\]$/g, "");
}

export const ProjectEditModal = ({ project }: { project: ProjectWithChats }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [editedUrl, setEditedUrl] = useState("");
    const [editedDescription, setEditedDescription] = useState("");
    const [platformUrls, setPlatformUrls] = useState<Project["platformUrls"]>(
        {} as Project["platformUrls"],
    );
    const { data: session } = useSession();
    const updateProject = useUpdateProject();
    const deleteProject = useDeleteProject();

    const initial = useMemo(() => getProjectPlaceholders(project), [project]);
    const [rows, setRows] = useState<Row[]>(() => toRows(initial));
    const [placeholdersDirty, setPlaceholdersDirty] = useState(false);

    useEffect(() => {
        if (project) {
            setEditedName(project.name);
            setEditedUrl(project.url || "");
            setEditedDescription(project.description);
            setPlatformUrls(project.platformUrls);
            setRows(toRows(getProjectPlaceholders(project)));
            setPlaceholdersDirty(false);
        }
    }, [project]);

    const onDeleteProject = async () => {
        if (!session?.user.id) return;
        const yes = await confirm({
            title: "Do you want to delete this project?",
            description: ""
        });
        if (!yes) return;

        await deleteProject.mutateAsync(project.id);
    }

    const setRow = (idx: number, patch: Partial<Row>) => {
        setRows((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...patch };
            return next;
        });
        setPlaceholdersDirty(true);
    };

    const addRow = () => {
        setRows((prev) => [...prev, { key: "", value: "" }]);
        setPlaceholdersDirty(true);
    };

    const removeRow = (idx: number) => {
        setRows((prev) => prev.filter((_, i) => i !== idx));
        setPlaceholdersDirty(true);
    };

    const onSavePlaceholders = async () => {
        const map: Record<string, string> = {};
        for (const r of rows) {
            const key = normalizeKey(r.key);
            if (!key) continue;
            map[key] = r.value ?? "";
        }

        const normalizedKeys = Object.keys(map).map((k) => k.toLowerCase());
        const hasDupes = new Set(normalizedKeys).size !== normalizedKeys.length;
        if (hasDupes) {
            toast.error("Duplicate placeholder keys detected (case-insensitive).");
            return;
        }

        await updateProject.mutateAsync({ id: project.id, placeholders: map } as any);
        toast.success("Placeholders saved");
        setPlaceholdersDirty(false);
    };

    return (
        <Dialog>
            <DialogTrigger asChild className="cursor-pointer">
                <Settings className="size-4" />
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="flex items-center flex-row justify-between gap-2 w-full px-0">
                    <DialogTitle className="text-base sm:text-lg xl:text-xl font-bold break-all ">
                        {project.name}
                    </DialogTitle>
                    <InviteUserDialog />
                </DialogHeader>

                <DialogDescription className="p-2 bg-gray-50 dark:bg-slate-800 rounded-lg w-full">
                    {isEditing ? (
                        <div className="space-y-4">
                            <Input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                className="w-full"
                                placeholder="Project Name"
                            />
                            <Input
                                type="text"
                                value={editedUrl}
                                onChange={(e) => setEditedUrl(e.target.value)}
                                className="w-full"
                                placeholder="Project Url"
                            />
                            <Textarea
                                value={editedDescription}
                                onChange={(e) => setEditedDescription(e.target.value)}
                                className="w-full"
                                placeholder="Project Description"
                            />

                            <div className="grid-cols-2 grid gap-4">
                                {Object.values(PLATFORMS).map((platform) => (
                                    <div key={platform} className="flex flex-col gap-2">
                                        <Label className="capitalize" htmlFor={platform}>
                                            {platform} (optional)
                                        </Label>
                                        <Input
                                            type="text"
                                            value={platformUrls?.[platform as keyof typeof platformUrls] || ""}
                                            onChange={(e) => {
                                                setPlatformUrls((prev) => {
                                                    return {
                                                        ...prev as any,
                                                        [platform]: e.target.value,
                                                    };
                                                });
                                            }}
                                            className="w-full"
                                            id={platform}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between gap-2">
                                <div className="flex gap-2">
                                    <Button
                                        className=" w-28"
                                        loading={updateProject.isPending}
                                        onClick={async () => {
                                            try {
                                                await updateProject.mutateAsync({
                                                    id: project.id,
                                                    name: editedName,
                                                    url: editedUrl,
                                                    description: editedDescription,
                                                    platformUrls: platformUrls as any,
                                                });
                                            } catch { }
                                            setIsEditing(false);
                                        }}
                                    >
                                        Save
                                    </Button>
                                    <Button
                                        variant={"secondary"}
                                        onClick={() => setIsEditing(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                                <Button
                                    variant={"outline"}
                                    onClick={onDeleteProject}
                                    loading={deleteProject.isPending}
                                >
                                    <Trash className="stroke-red-500" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center">
                            <p>{project.description}</p>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                            >
                                ✏️
                            </button>
                        </div>
                    )}
                </DialogDescription>

                <Separator className="my-4" />

                {/* Placeholders Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold">Placeholders</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Define tokens like <span className="font-mono">[Address]</span> and we&apos;ll replace them in previews and when posting.
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={addRow}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add
                            </Button>
                            <Button 
                                size="sm" 
                                onClick={onSavePlaceholders} 
                                disabled={updateProject.isPending || !placeholdersDirty}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                Save
                            </Button>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                        {rows.length === 0 ? (
                            <div className="text-sm text-muted-foreground text-center py-4">
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
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}