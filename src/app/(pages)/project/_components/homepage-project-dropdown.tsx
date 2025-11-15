import { useGenerateProjectContent, useGetAllProjects } from "@/backend-apis/projects/hooks";
import AutoPost from "@/components/common/auto-post";
import FirstViewTooltip from "@/components/common/first-view-tooltip";
import PostToWall from "@/components/common/post-to-wall";
import { Button } from "@/components/ui/button";
import { CopyIcon, RefreshCcw } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";

type HomepageProjectDropdownProps = {
  onProjectSelectRef?: React.MutableRefObject<((projectId: string) => void) | null>;
};

export type HomepageProjectDropdownHandle = {
  selectProject: (projectId: string) => void;
};

const HomepageProjectDropdown = forwardRef<HomepageProjectDropdownHandle, HomepageProjectDropdownProps>(
  ({ onProjectSelectRef }, ref) => {
    const projects = useGetAllProjects();
    const [selectedProject, setSelectedProject] = useState<string>("BLANK");
    const chat = useGenerateProjectContent();

    // Expose selectProject method via ref
    useImperativeHandle(ref, () => ({
      selectProject: (projectId: string) => {
        setSelectedProject(projectId);
        localStorage.setItem("LastHomepageProjectSelect", projectId);
      },
    }));

    // Set up callback ref for parent component
    useEffect(() => {
      if (onProjectSelectRef) {
        onProjectSelectRef.current = (projectId: string) => {
          // Function to select the project
          const selectProject = () => {
            if (projects.data && projects.data.length > 0) {
              const projectExists = projects.data.find(p => p.id === projectId);
              if (projectExists) {
                setSelectedProject(projectId);
                localStorage.setItem("LastHomepageProjectSelect", projectId);
                return true;
              }
            }
            return false;
          };

          // Try to select immediately
          if (!selectProject()) {
            // If project not found, wait a bit for query to update and try again
            const retrySelect = () => {
              if (selectProject()) {
                return;
              }
              // Retry one more time after a longer delay
              setTimeout(() => {
                selectProject();
              }, 500);
            };
            setTimeout(retrySelect, 200);
          }
        };
      }
    }, [onProjectSelectRef, projects.data]);

  const onGenerate = async () => {
    if (!selectedProject || selectedProject === "BLANK") {
      chat.mutate({
        userPrompt: "",
        projectName: null,
        projectDescription: "This is a blank project",
        projectId: "",
      });
    }
    else {
      chat.mutate({
        projectId: selectedProject || "",
        userPrompt: "",
        retry: chat.data?.id
          ? { chatId: chat.data.id }
          : undefined,
      });
    }
  }

  const copyToClipboard = (text: string, platform: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast.success(`${platform} content copied to clipboard!`);
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast.error("Failed to copy content");
      },
    );
  };

  // set project id that was remembered last time
  useEffect(() => {
    if (projects.isLoading) return;
    if (projects.data) {
      const savedProjectId = localStorage.getItem("LastHomepageProjectSelect");
      const project = projects.data.find(p => p.id === savedProjectId);
      if (project) {
        setSelectedProject(project.id);
        return;
      }
      setSelectedProject("BLANK");
    }
  }, [projects.isLoading, projects.data])

  const onProjectSelectChange = (value: string) => {
    chat.reset();
    setSelectedProject(value);
    // Remember last project used
    localStorage.setItem("LastHomepageProjectSelect", value);
  }

  return (
    <div className="flex flex-col gap-2 items-center justify-center">
      <div className="w-full max-w-2xl bg-white p-6 rounded-2xl shadow-md">
        <div className="space-y-5">
          <h2 className="text-xl font-semibold mb-4">Generate Content</h2>
          {/* Collapsible Project Details */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium w-24">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => onProjectSelectChange(e.target.value)}
              className="flex-1 p-2 border rounded-lg"
            >
              <option value="BLANK">Blank Project</option>
              {(projects?.data?.length || 0) > 0 &&
                projects?.data?.map((project, i) => (
                  <option value={project.id} key={project.id}>{project.name}</option>
                ))
              }
            </select>
          </div>

          <FirstViewTooltip content="Single click generation of content." order={2} tooltipKey="quickGenerate">
            <Button
              onClick={onGenerate}
              loading={chat.isPending}
              size={"lg"}
              className="w-full"
            >
              {chat.data ? (
                <>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Regenerate Content
                </>
              ) : (
                <>
                  <Image src="/flash.png" width={24} height={24} className="h-5 w-5 mr-1" alt="Thunder" />
                  Quick Generate
                </>
              )}
            </Button>
          </FirstViewTooltip>
        </div>
      </div>

      <div className="space-y-4 py-10 max-w-2xl">
        {chat.data?.contents && Object.entries(chat.data.contents || {}).map(([platform, text]) => (
          <div key={platform} className="border p-4 rounded-lg mb-4">
            <div className="flex justify-between mb-2">
              <h3 className="font-bold capitalize">{platform}</h3>
              <div className="flex flex-row gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(text, platform)}
                >
                  <CopyIcon />
                </Button>
                {chat.data.projectId && <PostToWall
                  content={text}
                  platform={platform}
                  projectId={chat.data.projectId}
                  prompt={chat.data.prompt}
                />}

                <AutoPost
                  platform={platform as any}
                  content={text}
                  projectId={chat.data.projectId}
                />
              </div>
            </div>
            <div
              className="text-sm text-muted-foreground w-full"
              style={{ whiteSpace: "pre-wrap" }}
            >
              <Markdown>
                {(text as string)
                  .split("\n")
                  .map((line) => line.trim())
                  .filter((line) => line.length > 0)
                  .join("\n\n")}
              </Markdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

HomepageProjectDropdown.displayName = "HomepageProjectDropdown";

export default HomepageProjectDropdown;