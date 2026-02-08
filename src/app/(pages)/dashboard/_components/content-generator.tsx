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
import { useGetFirstViewTooltip, useUpdateFirstViewTooltip } from "@/server-actions/first-view-tooltip/hooks";
import { useUserSettings } from "@/backend-apis/user-settings/hooks";
import { PlatformIconsOnboarding } from "@/components/common/platform-icons-onboarding";
import { ViewMedia } from "@/components/social/view-media";
import { PLATFORM_IDS } from "@/constants/platforms";
import { RewriteWithAIDialog } from "@/components/common/rewrite-with-ai-dialog";
import { NewImageButton } from "@/components/common/new-image-button";
import { useRewriteWithAI } from "@/backend-apis/ai-text/hooks";
import { useGenerateAIImageForQuickGenerate } from "@/backend-apis/ai-image/hooks";
import { useGenerateTextCardImageForQuickGenerate } from "@/backend-apis/text-image/hooks";

interface ContentGeneratorProps {
  project: Project;
}

export function ContentGenerator({ project }: ContentGeneratorProps) {
  const queryClient = useQueryClient();
  const { data: settings } = useUserSettings();
  const { data: session } = useSession();
  const projects = useGetAllProjects();
  const tooltipData = useGetFirstViewTooltip(session?.user?.id || "");
  const updateTooltip = useUpdateFirstViewTooltip();
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(true);
  const [prompt, setPrompt] = useState("");
  const generateProjectContent = useGenerateProjectContent();
  const [isSaving, setIsSaving] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [generatedMedia, setGeneratedMedia] = useState<Record<string, string>>({});
  const platformCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const iconRefs = useRef<Record<string, HTMLElement | null>>({});
  const rewriteWithAI = useRewriteWithAI();
  const generateAIImage = useGenerateAIImageForQuickGenerate();
  const generateTextCardImage = useGenerateTextCardImageForQuickGenerate();

  const handleShowOnboarding = () => {
    // Small delay to ensure cards and icons are rendered
    setTimeout(() => {
      setShowOnboarding(true);
    }, 100);
  };

  // Mark quickGenerate as seen when content is first generated
  useEffect(() => {
    if (
      generateProjectContent.data &&
      session?.user?.id &&
      tooltipData.data &&
      !tooltipData.data.quickGenerate
    ) {
      updateTooltip.mutate({
        userId: session.user.id,
        updateData: { quickGenerate: true },
      });
    }
  }, [generateProjectContent.data, session?.user?.id, tooltipData.data, updateTooltip]);

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
        <>
          {/* First-time user message */}
          {tooltipData.data && !tooltipData.data.quickGenerate && projects.data && projects.data.length === 1 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-orange-900 leading-relaxed">
                The content that you generate gets better over time. Use campaign planner to explore more.
              </p>
            </div>
          )}
          <div className="mt-4 flex flex-row flex-wrap gap-4 overflow-y-auto">
            <ScrollArea className="">
              {/* Instagram Image Card - Instagram content is rendered as image, not text */}
              {((generateProjectContent.data.media as Record<string, string>)?.[PLATFORM_IDS.INSTAGRAM] || generatedMedia[PLATFORM_IDS.INSTAGRAM]) && (
                <Card className="rounded-lg border mb-5">
                  <CardHeader className="flex justify-between items-center mb-2 flex-row">
                    <CardTitle>Instagram</CardTitle>
                    <div className="flex flex-row gap-2 flex-wrap items-center">
                      <RewriteWithAIDialog
                        isPending={rewriteWithAI.isPending}
                        disabled={!session?.user?.id}
                        onRewrite={async (rewritePrompt) => {
                          if (!session?.user?.id) {
                            toast.error("Please log in to rewrite content");
                            return;
                          }
                          const instagramContent = (generateProjectContent.data?.contents as Record<string, string>)?.[PLATFORM_IDS.INSTAGRAM] || "";
                          const contentToUse = editedContent[PLATFORM_IDS.INSTAGRAM] || instagramContent;
                          if (!contentToUse) {
                            toast.error("No content to rewrite");
                            return;
                          }
                          const result = await rewriteWithAI.mutateAsync({
                            userId: session.user.id,
                            content: contentToUse,
                            prompt: rewritePrompt || undefined,
                          });
                          if (result.success && result.rewrittenContent) {
                            await editChatContent({
                              chatId: generateProjectContent.data?.id || '',
                              platform: PLATFORM_IDS.INSTAGRAM,
                              content: result.rewrittenContent,
                            });
                            const updatedContents = { ...generateProjectContent.data?.contents as any, [PLATFORM_IDS.INSTAGRAM]: result.rewrittenContent };
                            generateProjectContent.data.contents = updatedContents;
                            setEditedContent({ ...editedContent, [PLATFORM_IDS.INSTAGRAM]: result.rewrittenContent });
                            queryClient.invalidateQueries({
                              queryKey: ["project-chats", { projectId: project.id }]
                            });
                          }
                        }}
                      />
                      <NewImageButton
                        isTextCardPending={generateTextCardImage.isPending}
                        isAIImagePending={generateAIImage.isPending}
                        disabled={!session?.user?.id}
                        hasExistingImage={!!generatedMedia[PLATFORM_IDS.INSTAGRAM] || !!(generateProjectContent.data?.media as Record<string, string>)?.[PLATFORM_IDS.INSTAGRAM]}
                        fullWidth={false}
                        onTextCard={async () => {
                          if (!session?.user?.id) {
                            toast.error("Please log in to generate images");
                            return;
                          }
                          const instagramContent = (generateProjectContent.data?.contents as Record<string, string>)?.[PLATFORM_IDS.INSTAGRAM] || "";
                          const contentToUse = editedContent[PLATFORM_IDS.INSTAGRAM] || instagramContent || "";
                          const result = await generateTextCardImage.mutateAsync({
                            content: contentToUse,
                            userId: session.user.id,
                            projectId: project.id,
                          });
                          if (result.success && result.mediaKey) {
                            await editChatContent({
                              chatId: generateProjectContent.data?.id || '',
                              platform: PLATFORM_IDS.INSTAGRAM,
                              media: result.mediaKey,
                            });
                            const updatedMedia = { ...(generateProjectContent.data?.media as Record<string, string>) || {}, [PLATFORM_IDS.INSTAGRAM]: result.mediaKey };
                            generateProjectContent.data.media = updatedMedia;
                            setGeneratedMedia(prev => ({ ...prev, [PLATFORM_IDS.INSTAGRAM]: result.previewUrl || result.mediaKey! }));
                            queryClient.invalidateQueries({
                              queryKey: ["project-chats", { projectId: project.id }]
                            });
                          }
                        }}
                        onAIImage={async () => {
                          if (!session?.user?.id) {
                            toast.error("Please log in to generate images");
                            return;
                          }
                          const instagramContent = (generateProjectContent.data?.contents as Record<string, string>)?.[PLATFORM_IDS.INSTAGRAM] || "";
                          const contentToUse = editedContent[PLATFORM_IDS.INSTAGRAM] || instagramContent || "";
                          const result = await generateAIImage.mutateAsync({
                            content: contentToUse,
                            userId: session.user.id,
                            projectId: project.id,
                            platform: PLATFORM_IDS.INSTAGRAM,
                          });
                          if (result.success && result.mediaKey) {
                            await editChatContent({
                              chatId: generateProjectContent.data?.id || '',
                              platform: PLATFORM_IDS.INSTAGRAM,
                              media: result.mediaKey,
                            });
                            const updatedMedia = { ...(generateProjectContent.data?.media as Record<string, string>) || {}, [PLATFORM_IDS.INSTAGRAM]: result.mediaKey };
                            generateProjectContent.data.media = updatedMedia;
                            setGeneratedMedia(prev => ({ ...prev, [PLATFORM_IDS.INSTAGRAM]: result.previewUrl || result.mediaKey! }));
                            queryClient.invalidateQueries({
                              queryKey: ["project-chats", { projectId: project.id }]
                            });
                          }
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const instagramText = (generateProjectContent.data?.contents as Record<string, string>)?.[PLATFORM_IDS.INSTAGRAM] || "";
                          setEditedContent({ ...editedContent, [PLATFORM_IDS.INSTAGRAM]: instagramText });
                          setEditingPlatform(PLATFORM_IDS.INSTAGRAM);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const instagramText = (generateProjectContent.data?.contents as Record<string, string>)?.[PLATFORM_IDS.INSTAGRAM] || "";
                          copyToClipboard(instagramText, "Instagram");
                        }}
                      >
                        <CopyIcon />
                      </Button>
                      <PostToWall
                        content={(generateProjectContent.data?.contents as Record<string, string>)?.[PLATFORM_IDS.INSTAGRAM] || ""}
                        platform={PLATFORM_IDS.INSTAGRAM}
                        projectId={project.id}
                        prompt={generateProjectContent.data.prompt}
                      />
                      <AutoPost
                        platform={PLATFORM_IDS.INSTAGRAM as any}
                        content={(generateProjectContent.data?.contents as Record<string, string>)?.[PLATFORM_IDS.INSTAGRAM] || ""}
                        projectId={project.id}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Instagram edit mode */}
                    {editingPlatform === PLATFORM_IDS.INSTAGRAM && (
                      <div className="text-sm text-muted-foreground mb-4">
                        <div className="flex flex-col gap-2">
                          <textarea
                            className="w-full border p-2 rounded text-black"
                            rows={10}
                            value={editedContent[PLATFORM_IDS.INSTAGRAM] ?? (generateProjectContent.data?.contents as Record<string, string>)?.[PLATFORM_IDS.INSTAGRAM] ?? ""}
                            onChange={(e) => setEditedContent({ ...editedContent, [PLATFORM_IDS.INSTAGRAM]: e.target.value })}
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
                                    platform: PLATFORM_IDS.INSTAGRAM,
                                    content: editedContent[PLATFORM_IDS.INSTAGRAM] ?? (generateProjectContent.data?.contents as Record<string, string>)?.[PLATFORM_IDS.INSTAGRAM] ?? ""
                                  });
                                  const updatedContents = { ...generateProjectContent.data?.contents as any, [PLATFORM_IDS.INSTAGRAM]: editedContent[PLATFORM_IDS.INSTAGRAM] };
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
                      </div>
                    )}
                    <div className="aspect-square max-w-[400px] mx-auto">
                      {generatedMedia[PLATFORM_IDS.INSTAGRAM] ? (
                        <img
                          src={generatedMedia[PLATFORM_IDS.INSTAGRAM]}
                          alt="Generated image for Instagram"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <ViewMedia 
                          post={{ media: (generateProjectContent.data.media as Record<string, string>)[PLATFORM_IDS.INSTAGRAM] }} 
                          showMedia 
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              {Object.entries(generateProjectContent.data.contents || {}).filter(([platform]) => platform !== PLATFORM_IDS.INSTAGRAM).slice(0, 4).map(
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
                    <div className="flex flex-col gap-1 items-center">
                      <div className="flex flex-row gap-2 flex-wrap items-center">
                        <div
                          ref={(el) => {
                            if (el && isFirstPlatform) {
                              iconRefs.current['rewriteWithAI'] = el;
                            }
                          }}
                        >
                          <RewriteWithAIDialog
                            isPending={rewriteWithAI.isPending}
                            disabled={!session?.user?.id}
                            onRewrite={async (rewritePrompt) => {
                              if (!session?.user?.id) {
                                toast.error("Please log in to rewrite content");
                                return;
                              }
                              const contentToUse = editedContent[platform] || text;
                              if (!contentToUse) {
                                toast.error("No content to rewrite");
                                return;
                              }
                              const result = await rewriteWithAI.mutateAsync({
                                userId: session.user.id,
                                content: contentToUse,
                                prompt: rewritePrompt || undefined,
                              });
                              if (result.success && result.rewrittenContent) {
                                // Save to database
                                await editChatContent({
                                  chatId: generateProjectContent.data?.id || '',
                                  platform,
                                  content: result.rewrittenContent,
                                });
                                // Update local state
                                const updatedContents = { ...generateProjectContent.data?.contents as any, [platform]: result.rewrittenContent };
                                generateProjectContent.data.contents = updatedContents;
                                setEditedContent({ ...editedContent, [platform]: result.rewrittenContent });
                                queryClient.invalidateQueries({
                                  queryKey: ["project-chats", { projectId: project.id }]
                                });
                              }
                            }}
                          />
                        </div>
                        <div
                          ref={(el) => {
                            if (el && isFirstPlatform) {
                              iconRefs.current['createImage'] = el;
                            }
                          }}
                        >
                          <NewImageButton
                            isTextCardPending={generateTextCardImage.isPending}
                            isAIImagePending={generateAIImage.isPending}
                            disabled={!session?.user?.id}
                            hasExistingImage={!!generatedMedia[platform] || !!(generateProjectContent.data?.media as Record<string, string>)?.[platform]}
                            fullWidth={false}
                            onTextCard={async () => {
                            if (!session?.user?.id) {
                              toast.error("Please log in to generate images");
                              return;
                            }
                            const contentToUse = editedContent[platform] || text;
                            const result = await generateTextCardImage.mutateAsync({
                              content: contentToUse,
                              userId: session.user.id,
                              projectId: project.id,
                            });
                            if (result.success && result.mediaKey) {
                              // Save to database
                              await editChatContent({
                                chatId: generateProjectContent.data?.id || '',
                                platform,
                                media: result.mediaKey,
                              });
                              // Update local state for immediate display
                              const updatedMedia = { ...(generateProjectContent.data?.media as Record<string, string>) || {}, [platform]: result.mediaKey };
                              generateProjectContent.data.media = updatedMedia;
                              setGeneratedMedia(prev => ({ ...prev, [platform]: result.previewUrl || result.mediaKey! }));
                              queryClient.invalidateQueries({
                                queryKey: ["project-chats", { projectId: project.id }]
                              });
                            }
                          }}
                          onAIImage={async () => {
                            if (!session?.user?.id) {
                              toast.error("Please log in to generate images");
                              return;
                            }
                            const contentToUse = editedContent[platform] || text;
                            const result = await generateAIImage.mutateAsync({
                              content: contentToUse,
                              userId: session.user.id,
                              projectId: project.id,
                              platform,
                            });
                            if (result.success && result.mediaKey) {
                              // Save to database
                              await editChatContent({
                                chatId: generateProjectContent.data?.id || '',
                                platform,
                                media: result.mediaKey,
                              });
                              // Update local state for immediate display
                              const updatedMedia = { ...(generateProjectContent.data?.media as Record<string, string>) || {}, [platform]: result.mediaKey };
                              generateProjectContent.data.media = updatedMedia;
                              setGeneratedMedia(prev => ({ ...prev, [platform]: result.previewUrl || result.mediaKey! }));
                              queryClient.invalidateQueries({
                                queryKey: ["project-chats", { projectId: project.id }]
                              });
                            }
                          }}
                        />
                        </div>
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
                      {isFirstPlatform && (settings?.guidedTourEnabled ?? true) && (
                        <button
                          onClick={handleShowOnboarding}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Explain these icons
                        </button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Generated image display */}
                    {(generatedMedia[platform] || (generateProjectContent.data?.media as Record<string, string>)?.[platform]) && (
                      <div className="mb-4">
                        <div className="aspect-square max-w-[400px] mx-auto">
                          {generatedMedia[platform] ? (
                            <img
                              src={generatedMedia[platform]}
                              alt={`Generated image for ${platform}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <ViewMedia
                              post={{ media: (generateProjectContent.data.media as Record<string, string>)[platform] }}
                              showMedia
                            />
                          )}
                        </div>
                      </div>
                    )}
                    {editingPlatform === platform ? (
                      <div className="text-sm text-muted-foreground">
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
                      </div>
                    ) : !(generatedMedia[platform] || (generateProjectContent.data?.media as Record<string, string>)?.[platform]) ? (
                      <div className="text-sm text-muted-foreground" style={{ whiteSpace: "pre-wrap" }}>
                        <Markdown>
                          {(text as string)
                            .split("\n")
                            .map((line) => line.trim())
                            .filter((line) => line.length > 0)
                            .join("\n\n")}
                        </Markdown>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
              }
            )}
          </ScrollArea>
        </div>
        </>
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
