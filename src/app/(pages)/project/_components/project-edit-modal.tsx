import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { InviteUserDialog } from "../_components/invite-user";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS } from "@/lib/prompt";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useUpdateProject } from "@/backend-apis/projects/hooks";
import { Projects as Project } from "@prisma/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProjectWithChats } from "@/backend-apis/projects/types";

export const ProjectEditModal = ({ project }: { project: ProjectWithChats }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [editedDescription, setEditedDescription] = useState("");
    const [platformUrls, setPlatformUrls] = useState<Project["platformUrls"]>(
        {} as Project["platformUrls"],
    );
    const updateProject = useUpdateProject();
    useEffect(() => {
        if (project) {
            setEditedName(project.name);
            setEditedDescription(project.description);
        }
    }, [project]);

    return (
        <Dialog>
            <DialogTrigger asChild className="cursor-pointer">
                <Settings className="size-4" />
            </DialogTrigger>
            <DialogContent>
                <DialogHeader className="flex items-center flex-row justify-between gap-2 w-full px-0">
                    <DialogTitle className="text-base sm:text-lg xl:text-xl font-bold break-all ">
                        {project.name}
                    </DialogTitle>
                    <InviteUserDialog />
                </DialogHeader>

                <DialogDescription className="p-2 bg-gray-50 rounded-lg w-full">
                    {isEditing ? (
                        <div className="space-y-4">
                            <Input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                className="w-full"
                                placeholder="Project Name"
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

                            <div className="flex gap-2">
                                <Button
                                    className=" w-28"
                                    loading={updateProject.isPending}
                                    onClick={async () => {
                                        try {
                                            await updateProject.mutateAsync({
                                                id: project.id,
                                                name: editedName,
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
                        </div>
                    ) : (
                        <div className="flex justify-between items-center">
                            <p>{project.description}</p>
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 rounded-full hover:bg-gray-100 transition"
                            >
                                ✏️
                            </button>
                        </div>
                    )}
                </DialogDescription>
            </DialogContent>
        </Dialog>
    )
}