import { useEffect, useState } from "react";
import { Settings, Trash, Save } from "lucide-react";
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
import { getProjectPlaceholders } from "@/lib/placeholders";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { ProjectSocialConnectionAlert } from "@/app/(pages)/project/[id]/_components/project-social-connection-alert";
import { DestinationsManager, DestinationRow, placeholderMapToRows, rowsToPlaceholderMap } from "@/app/(pages)/project/[id]/_components/destinations-manager";

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

    // Destinations state (replaces the raw placeholders editor)
    const [destinations, setDestinations] = useState<DestinationRow[]>([]);
    const [destinationsDirty, setDestinationsDirty] = useState(false);

    useEffect(() => {
        if (project) {
            setEditedName(project.name);
            setEditedUrl(project.url || "");
            setEditedDescription(project.description);
            setPlatformUrls(project.platformUrls);
            setDestinations(placeholderMapToRows(getProjectPlaceholders(project)));
            setDestinationsDirty(false);
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

    const onSaveDestinations = async () => {
        await updateProject.mutateAsync({ id: project.id, placeholders: rowsToPlaceholderMap(destinations) } as any);
        toast.success("Destinations saved");
        setDestinationsDirty(false);
    };

    return (
        <Dialog>
            <DialogTrigger asChild className="cursor-pointer">
                <Settings className="size-4" />
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto overflow-x-hidden w-full">
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

                {/* Connect social accounts (non-dismissible in settings — show when project has no linked socials but user has connected accounts) */}
                <div className="space-y-2">
                    <h3 className="text-base font-semibold">Connected accounts</h3>
                    <p className="text-xs text-muted-foreground">
                        Link your social accounts to this project to post and view analytics.
                    </p>
                    <ProjectSocialConnectionAlert projectId={project.id} dismissible={false} />
                </div>

                <Separator className="my-4" />

                {/* Destinations & Placeholders Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold">Destinations</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Paste any URL — the token is auto-detected (e.g. <span className="font-mono">[AppStore]</span>, <span className="font-mono">[Website]</span>). Tokens are replaced in your posts when publishing.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            onClick={onSaveDestinations}
                            disabled={updateProject.isPending || !destinationsDirty}
                            loading={updateProject.isPending}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                        </Button>
                    </div>

                    <DestinationsManager
                        destinations={destinations}
                        onChange={(rows) => { setDestinations(rows); setDestinationsDirty(true); }}
                    />
                </div>
            </DialogContent>
        </Dialog>
    )
}