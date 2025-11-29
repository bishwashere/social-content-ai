"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Markdown from "react-markdown";
import { useMemo, useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CopyIcon, RefreshCcw, Share2Icon, Sparkle, Pencil } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGenerateProjectContent, useGetAllProjects } from "@/backend-apis/projects/hooks";
import Link from "next/link";
import { Projects as Project, ProjectChat } from "@prisma/client";
import { editChatContent } from "@/server-actions/edit-chat-content";

import PostToWall from "@/components/common/post-to-wall";
import { Switch } from "@/components/ui/switch";
import AutoPost from "@/components/common/auto-post";
import Image from "next/image";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/backend-apis/auth/hooks";
import { useGetFirstViewTooltip } from "@/server-actions/first-view-tooltip/hooks";
import { PlatformIconsOnboarding } from "@/components/common/platform-icons-onboarding";

interface ContentGeneratorProps {
  project: Project;
}

export function ContentGenerator({ project }: ContentGeneratorProps) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const projects = useGetAllProjects();
  const tooltipData = useGetFirstViewTooltip(session?.user?.id || "");
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(true);
  const [prompt, setPrompt] = useState("");
  const generateProjectContent = useGenerateProjectContent();
  const [isSaving, setIsSaving] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const platformCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const iconRefs = useRef<Record<string, HTMLElement | null>>({});

  // Check if should show onboarding
  useEffect(() => {
    if (
      generateProjectContent.data &&
      projects.data &&
      projects.data.length === 1 &&
      tooltipData.data &&
      !tooltipData.data.platformIconsOnboarding
    ) {
      // Small delay to ensure cards and icons are rendered
      setTimeout(() => {
        setShowOnboarding(true);
      }, 500);
    }
  }, [generateProjectContent.data, projects.data, tooltipData.data]);

  const copyToClipboard = useMemo(
    () => (text: string, platform: string) => {
      navigator.clipboard.writeText(text).then(
        () => {
          toast.success(`${platform} content copied to clipboard!`);
        },
        (err) => {
          console.error("Could not copy text: ", err);
          toast.error("Failed to copy content");
        },
      );
    },
    [],
  );
  return (
    <div className="space-y-4 w-full mt-5">
      <div className="flex items-center justify-between">
        <Label htmlFor="prompt">User Prompt:</Label>
        <div className="flex items-center space-x-2">
          <Switch
            checked={checked}
            onCheckedChange={(checked) => setChecked(checked as boolean)}
            id="checked" />
          <label
            htmlFor="checked"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Related to product
          </label>
        </div>
      </div>
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Create a fun and engaging post to promote on creative community."
        className="min-h-[100px] min-w-96"
      />
      <Button
        onClick={() => {
          generateProjectContent.mutate({
            projectId: project.id,
            projectRelated: checked,
            userPrompt: prompt,
            retry: generateProjectContent.data
              ? { chatId: generateProjectContent.data?.id }
              : undefined,
          });
        }}
        loading={generateProjectContent.isPending}
        size={"lg"}
        className="w-full"
      >
        {generateProjectContent.data ? (
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
      {generateProjectContent.data && (
        <div className="mt-4 flex flex-row flex-wrap gap-4 overflow-y-auto">
          <ScrollArea className="">
            {Object.entries(generateProjectContent.data.contents || {}).slice(0, 4).map(
              ([platform, text], index) => {
                const isFirstPlatform = index === 0;
                return (
                <Card 
                  key={platform} 
                  className="rounded-lg border mb-5"
                  ref={(el) => {
                    if (el) {
                      platformCardRefs.current[platform] = el;
                    }
                  }}
                >
                  <CardHeader className="flex justify-between items-center mb-2 flex-row">
                    <CardTitle>
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </CardTitle>
                    <div className="flex flex-row gap-2">
                      {isFirstPlatform ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            ref={(el) => {
                              if (el) {
                                iconRefs.current['edit'] = el;
                              }
                            }}
                            onClick={() => {
                              setEditedContent({ ...editedContent, [platform]: text });
                              setEditingPlatform(platform);
                            }}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            ref={(el) => {
                              if (el) {
                                iconRefs.current['copy'] = el;
                              }
                            }}
                            onClick={() => copyToClipboard(text, platform)}
                          >
                            <CopyIcon />
                          </Button>
                          <div
                            ref={(el) => {
                              if (el) {
                                iconRefs.current['postToWall'] = el;
                              }
                            }}
                          >
                            <PostToWall
                              content={text}
                              platform={platform}
                              projectId={project.id}
                              prompt={generateProjectContent.data.prompt}
                            />
                          </div>
                          <div
                            ref={(el) => {
                              if (el) {
                                iconRefs.current['autoPost'] = el;
                              }
                            }}
                          >
                            <AutoPost
                              platform={platform as any}
                              content={text}
                              projectId={project.id}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditedContent({ ...editedContent, [platform]: text });
                              setEditingPlatform(platform);
                            }}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(text, platform)}
                          >
                            <CopyIcon />
                          </Button>
                          <PostToWall
                            content={text}
                            platform={platform}
                            projectId={project.id}
                            prompt={generateProjectContent.data.prompt}
                          />
                          <AutoPost
                            platform={platform as any}
                            content={text}
                            projectId={project.id}
                          />
                        </>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {editingPlatform === platform ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            className="w-full border p-2 rounded text-black"
                            rows={10}
                            value={editedContent[platform] ?? text}
                            onChange={(e) => setEditedContent({ ...editedContent, [platform]: e.target.value })}
                          />
                          <div className="flex gap-2 justify-end">
                            <Button variant="secondary" size="sm" onClick={() => setEditingPlatform(null)}>
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              loading={isSaving}
                              onClick={async () => {
                                try {
                                  setIsSaving(true);
                                  await editChatContent({
                                    chatId: generateProjectContent.data?.id || '',
                                    platform,
                                    content: editedContent[platform] ?? text
                                  });
                                  const updatedContents = { ...generateProjectContent.data?.contents as any, [platform]: editedContent[platform] ?? text };
                                  generateProjectContent.data.contents = updatedContents;
                                  queryClient.invalidateQueries({
                                    queryKey: ["project-chats", { projectId: project.id }]
                                  });
                                  setEditingPlatform(null);
                                  toast.success('Content updated successfully');
                                } catch (error) {
                                  toast.error('Failed to update content');
                                } finally {
                                  setIsSaving(false);
                                }
                              }}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Markdown>
                          {(text as string)
                            .split("\n")
                            .map((line) => line.trim())
                            .filter((line) => line.length > 0)
                            .join("\n\n")}
                        </Markdown>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
              }
            )}
          </ScrollArea>
        </div>
      )}

      {/* Platform Icons Onboarding */}
      {showOnboarding && generateProjectContent.data && (
        <PlatformIconsOnboarding
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          iconRefs={iconRefs.current}
        />
      )}
    </div>
  );
}
