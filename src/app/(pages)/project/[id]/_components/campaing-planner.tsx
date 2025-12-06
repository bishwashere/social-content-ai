"use client";

import {
  useCampaignPlanner,
  useChangeCampaignData,
  useDeleteCampaign,
  useEditChatContent,
  useGenerateCampaignChat,
  useGenerateBlogNewsContent,
  useGetCampaignPlanner,
  useRetryWebhook,
  useScheduleCampaignPosts,
  useScheduleCampaignTasks,
  useToggleTickMark
} from "@/backend-apis/campaign-planner/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { campaignPlanner } from "@/lib/campaign-planner";
import sleep from "@/lib/sleep";
import { Calendar, ChevronDown, ChevronsUpDown, ChevronUp, Clock, CopyIcon, HelpCircle, Loader2, Pencil, Play, RefreshCw, Settings, Trash, VideoIcon, X } from "lucide-react";
import { useSession } from "@/backend-apis/auth/hooks";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import PostToWall from "@/components/common/post-to-wall";
import Link from "next/link";
import AutoPost from "@/components/common/auto-post";
import Markdown from "react-markdown";
import { Input } from "@/components/ui/input";
import ChangeCampaignName from "./change-campaign-name";
import { confirm } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/cn";
import { CampaignVideoButton } from "./campaign-video-button";
import { CampaignCheckButton } from "./campaign-check-button";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useQueryClient } from "@tanstack/react-query";
import { Projects } from "@prisma/client";
import { SavePlatformCard } from "./save-platform-card";
import { usePricingModal } from "@/providers/pricing-modal-provider";
import { Switch } from "@/components/ui/switch";
import { TimePickerDialog } from "@/components/common/time-picker";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const PLATFORMS = [
  { key: 'x', label: 'Twitter', icon: <Image src="/x.svg" width={16} height={16} alt="X" /> },
  { key: 'facebook', label: 'Facebook', icon: <Image src="/fb.svg" width={16} height={16} alt="Facebook" /> },
  { key: 'linkedin', label: 'LinkedIn', icon: <Image src="/linkedin.png" width={16} height={16} alt="LinkedIn" /> },
  { key: 'instagram', label: 'Instagram', icon: <Image src="/instagram.svg" width={16} height={16} alt="Instagram" /> },
  { key: 'threads', label: 'Threads', icon: <Image src="/threads.svg" width={16} height={16} alt="Threads" /> },
  { key: 'reddit', label: 'Reddit', icon: <Image src="/reddit.svg" width={16} height={16} alt="Reddit" /> },
  { key: 'tiktok', label: 'TikTok', icon: <Image src="/tiktok.svg" width={16} height={16} alt="TikTok" /> }
];

const ICONS = {
  x: "/x.svg",
  facebook: "/fb.svg",
  linkedin: "/linkedin.png",
  instagram: "/instagram.svg",
  threads: "/threads.svg",
  reddit: "/reddit.svg",
  tiktok: "/tiktok.svg"
};

const getPrompt = (str: string) => `
Description: ${str}
`;

const BLOG_NEWS_ANGLES = [
  "Economic Reality Angle",
  "Market Dynamics Angle",
  "Innovation Constraint Angle",
  "Risk & Bubble Angle",
  "Enterprise Productivity Angle",
  "Builder/Creator Angle",
  "Startup Opportunity Angle",
  "Sustainability Angle",
  "Regulatory Angle",
  "Human Impact Angle",
  "Future Forecast Angle",
  "Tech Infrastructure Angle",
  "Adoption Reality Angle",
  "Strategic Pivot Angle",
  "Operational Efficiency Angle",
  "Narrative Shift Angle",
  "Contrarian Angle",
  "Psychology of Hype Angle",
  "System-Level Angle",
  "User-Centric Angle"
];

const ANGLE_DESCRIPTIONS: Record<string, string> = {
  "Economic Reality Angle": "Explore whether the financial assumptions behind this trend actually hold up.",
  "Market Dynamics Angle": "Examine how this news shifts competitive power across the industry.",
  "Innovation Constraint Angle": "Analyze whether costs, regulations, or resources slow down progress.",
  "Risk & Bubble Angle": "Look at the possibility of market overinvestment or corrections.",
  "Enterprise Productivity Angle": "Focus on how businesses can use this technology for real ROI.",
  "Builder/Creator Angle": "Interpret what this means for small teams and indie product builders.",
  "Startup Opportunity Angle": "Identify gaps, openings, or underserved problems this news exposes.",
  "Sustainability Angle": "Discuss long-term feasibility in terms of cost, energy, and maintenance.",
  "Regulatory Angle": "Look at how governments, laws, or policy shifts may affect outcomes.",
  "Human Impact Angle": "Explore how this trend affects workers, consumers, and everyday people.",
  "Future Forecast Angle": "Project how this situation may evolve over the next 3–5 years.",
  "Tech Infrastructure Angle": "Break down the hardware, scale, and infrastructure implications.",
  "Adoption Reality Angle": "Evaluate what adoption looks like outside of hype cycles.",
  "Strategic Pivot Angle": "Explain how companies should rethink their long-term strategy.",
  "Operational Efficiency Angle": "Show how systems, pipelines, or workflows may improve.",
  "Narrative Shift Angle": "Reframe the story around a deeper message or misunderstood truth.",
  "Contrarian Angle": "Explore the viewpoint that challenges the mainstream interpretation.",
  "Psychology of Hype Angle": "Analyze how hype cycles distort decisions and expectations.",
  "System-Level Angle": "Connect this news to broader forces like geopolitics or global markets.",
  "User-Centric Angle": "Reinterpret the news through the lens of the end user or customer."
};

type Props = {
  project: Projects;
};

export default function CampaignPlannerPage({ project }: Props) {
  const generate = useGenerateCampaignChat();
  const campaignPlannerMutation = useCampaignPlanner();
  const { id: projectId } = useParams();
  const { data: session } = useSession();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [openCampaigns, setOpenCampaigns] = useState<Record<string, boolean>>({});
  const [selectedTargetAudience, setSelectedTargetAudience] = useState<number>(3);   // 1=Light, 2=Light-Moderate, 3=Moderate, 4=Moderate-Aggressive, 5=Aggressive
  const [name, setName] = useState<string>('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(Object.keys(ICONS));
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [productRelated, setProductRelated] = useState(true);
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState<string>("");
  const [selectedAngles, setSelectedAngles] = useState<string[]>([]);
  const [webhook, setWebhook] = useState<string>("");
  const [isCalenderOpen, setIsCalenderOpen] = useState<string[]>([]);   // array of ids
  const updateCampaignData = useChangeCampaignData();
  const deleteCampaignFromDb = useDeleteCampaign();
  const queryClient = useQueryClient();
  const toggleTickMark = useToggleTickMark();
  const [chatLoading, setChatLoading] = useState<{ campaignId: string, day: number } | null>(null);
  const { handleCoinsFinished } = usePricingModal()

  const [showPast, setShowPast] = useState(false);

  const [isCampaignStartDateSettingsOpen, setIsCampaignStartDateSettingsOpen] = useState<string[]>([]);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState<Record<string, boolean>>({});
  const [isPlatformSelectorOpen, setIsPlatformSelectorOpen] = useState<Record<string, boolean>>({});
  const [selectedPlatformsForAutoPost, setSelectedPlatformsForAutoPost] = useState<Record<string, string[]>>({});
  const [showOldCampaigns, setShowOldCampaigns] = useState(false);
  const scheduleCampaignPosts = useScheduleCampaignPosts();
  const scheduleCampaignTasks = useScheduleCampaignTasks();
  const generateBlogNews = useGenerateBlogNewsContent();
  const retryWebhook = useRetryWebhook();

  const campaignPlannerData = useGetCampaignPlanner({
    projectId: projectId as string
  });

  const onGenerate = async () => {
    if (!name) {
      toast.error("Please enter campaign name!");
      return;
    }
    if (!selectedGoal) {
      toast.error("Please select a goal!");
      return;
    }

    // Validate Blog News specific fields
    if (selectedGoal === "blog-news") {
      if (topics.length === 0) {
        toast.error("Please add at least one topic!");
        return;
      }
      if (selectedAngles.length === 0) {
        toast.error("Please select at least one angle!");
        return;
      }
      if (!webhook.trim()) {
        toast.error("Please enter a webhook URL!");
        return;
      }
    }

    const selectedCampaignPlanner = campaignPlanner.find(goal => goal.id === selectedGoal);
    if (!selectedCampaignPlanner) {
      toast.error("Failed to find plan");
      return;
    }
    const intensityPlan = selectedCampaignPlanner.intensityPlans[selectedTargetAudience - 1];
    if (!intensityPlan) {
      toast.error("Invalid audience level selected for this goal.");
      return;
    }

    // For Blog News, we don't need coins since we're not generating content
    if (selectedGoal !== "blog-news") {
      // Calculate initial coins needed (only for 1 day of initial data)
      // Coins needed = number of selected platforms (1 coin per platform for 1 day)
      const initialCoins = selectedPlatforms.length;
      const userCoins = session?.user?.remainingChatGenerations || 0;

      // Check if user has enough coins for initial generation
      if (userCoins < initialCoins) {
        toast.error(`You need ${initialCoins} coins to generate the initial campaign data.`);
        handleCoinsFinished();
        return;
      }

      const yes = await confirm({
        title: 'Do you want to generate campaign?',
        description: `Generating Campaign will use ${initialCoins} coins initially for the first day of content.`
      })
      if (!yes) return;
    }

    const plan = {
      ...intensityPlan,
      goal: selectedCampaignPlanner.goal
    };

    setShowCampaignForm(false);

    try {
      // For Blog News, pass empty platforms array
      const platformsToUse = selectedGoal === "blog-news" ? [] : selectedPlatforms;

      const { data: d } = await campaignPlannerMutation.mutateAsync({
        projectId: projectId as string,
        campaignName: name,
        plan,
        platforms: platformsToUse,
        // Pass Blog News metadata if it's a Blog News campaign
        ...(selectedGoal === "blog-news" ? {
          blogNewsMetadata: {
            topics,
            angles: selectedAngles,
            webhook,
            targetAudience: intensityPlan.targetAudience || "Moderate",
            productRelated,
          }
        } : {})
      });

      // Metadata is stored in database, no need to store in local state

      // Refetch campaign data to show the new campaign
      await campaignPlannerData.refetch();

      // Only generate content for non-Blog News campaigns
      if (selectedGoal !== "blog-news" && d?.chats && d?.chats[0]) {
        await generateChat(projectId as string, d.id, d.chats[0].day, d.chats[0].title);
      }
    } catch { }
  };

  const generateChat = async (projectId: string, campaignId: string, day: number, title: string | null) => {
    setChatLoading({ campaignId: campaignId, day: day });
    try {
      const { success, message, insufficientCoins } = await generate.mutateAsync({
        projectId: projectId,
        id: campaignId,
        prompt: getPrompt(`Day: ${day} Title: ${title}`),
        day: day,
        productRelated
      });
      if (!success) {
        toast.error(message || "Failed to generate campaign chat");
        if (insufficientCoins) {
          handleCoinsFinished();
        }
      }
      campaignPlannerData.refetch();
    } catch { }
    setChatLoading(null);
  }

  // Auto-generate pending chats for existing campaigns on initial page load
  // useEffect(() => {
  //   if (campaignPlannerData.isLoading || !campaignPlannerData.data) return;
  //   (async () => {
  //     if (campaignPlannerData.data)
  //       for (const campaign of campaignPlannerData.data.chatsGroupedByCampaign) {
  //         for (const chat of campaign.chats) {
  //           if (chat.status === "PENDING") {
  //             try {
  //               await generate.mutateAsync({
  //                 projectId: projectId as string,
  //                 id: campaign.id,
  //                 prompt: getPrompt(`Day: ${chat.day} Title: ${chat.title}`),
  //                 userId: session?.user?.id as string,
  //                 day: chat.day
  //               });
  //               await sleep(2000);
  //               campaignPlannerData.refetch();
  //             } catch (err) {
  //               console.error(`Failed to generate Day ${chat.day} for campaign ${campaign.name}`);
  //             }
  //           }
  //         }
  //       }
  //   })();
  // }, [campaignPlannerData?.isLoading]);

  const deleteCampaign = async (campaignId: string, projectId: string) => {
    const yes = await confirm({
      title: "Do you really want to delete this campaign?",
      description: ""
    });
    if (!yes) return;

    const res = await deleteCampaignFromDb.mutateAsync(campaignId);
    if (res) {
      toast.success("Campaign Deleted !");
      queryClient.invalidateQueries({
        queryKey: ["campaignPlanner", projectId],
      });
    } else {
      toast.error("Error while deleting campaign !")
    }
  }

  // useEffect(() => {
  //   if (!campaignPlannerData?.isLoading && campaignPlannerData?.data) {
  //     setAllCampaigns(campaignPlannerData.data.chatsGroupedByCampaign || []);
  //   }
  // }, [campaignPlannerData?.isLoading, campaignPlannerData?.data]);

  const copyToClipboard = useMemo(
    () => (text: string, platform: string) => {
      navigator.clipboard.writeText(text).then(
        () => toast.success(`${platform} content copied to clipboard!`),
        err => {
          console.error("Could not copy text: ", err);
          toast.error("Failed to copy content");
        }
      );
    },
    []
  );

  // const [isInProgress, setIsInProgress] = useState<string | null>(null);

  //Open all campaigns that are saved in memory
  useEffect(() => {
    const openedCampaigns = localStorage.getItem("openedCampaigns");
    if (openedCampaigns) {
      const openedCampaignsArray = JSON.parse(openedCampaigns) as Record<string, boolean>;
      setOpenCampaigns(openedCampaignsArray);
    }
  }, [])
  //Save opened campaings when toggled
  useEffect(() => {
  }, [openCampaigns])

  // useEffect(() => {
  //   if (!campaignPlannerData.data?.chatsGroupedByCampaign) return;

  //   const anyLoading = campaignPlannerData.data.chatsGroupedByCampaign.find(campaign => {
  //     const totalChats = campaign.chats.length;
  //     const loadedChats = campaign.chats.filter(chat =>
  //       chat.contents && Object.keys(chat.contents).length > 0
  //     ).length;

  //     const loadingProgress = totalChats > 0 ? (loadedChats / totalChats) * 100 : 0;

  //     return loadingProgress > 0 && loadingProgress < 100
  //   });

  //   setIsInProgress(anyLoading ? anyLoading.id : null);
  // }, [campaignPlannerData.data?.chatsGroupedByCampaign]);

  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const editContent = useEditChatContent();
  const handleSave = async (campaignId: string, day: number, platform: string) => {
    // You can handle saving here
    console.log("Saving for:", platform, "with content:", editedContent[platform]);
    await editContent.mutateAsync({
      campaignId,
      day,
      platform,
      content: editedContent[platform]
    })
      .then(() => toast.success(`Content edited for ${platform}`));
    setEditingPlatform(null);
  };

  return (
    <div className="flex flex-col gap-2 items-center justify-center">
      {!showCampaignForm && (
        <Button 
          size={"xl"} 
          className={cn(
            "z-50 shadow-lg",
            // Mobile/extra small: fixed position, small button in right corner
            "fixed bottom-4 right-4 w-auto min-w-[100px]",
            // Medium and larger screens: full width in body
            "md:static md:w-full md:mt-5 md:right-auto md:bottom-auto",
            !campaignPlannerData.data?.chatsGroupedByCampaign?.length 
              ? "" 
              : "md:bg-primary/40 hover:bg-primary"
          )} 
          onClick={() => setShowCampaignForm(true)}
        >
          Plan Campaign
        </Button>
      )}

      {showCampaignForm && (
        <div className="w-full max-w-2xl bg-white p-6 rounded-2xl shadow-md">
          <div className="space-y-5">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold mb-2">Campaign Name:</h2>
              <Input type="text" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <h2 className="text-xl font-semibold mb-2">Select a goal:</h2>
            <RadioGroup
              className="flex flex-row gap-4 flex-wrap"
              value={selectedGoal || ""}
              onValueChange={(value) => {
                setSelectedGoal(value);
                // Reset topics, angles, and webhook when goal changes
                if (value !== "blog-news") {
                  setTopics([]);
                  setSelectedAngles([]);
                  setWebhook("");
                }
              }}
            >
              {campaignPlanner.map(goal => (
                <div className="flex items-center space-x-2" key={goal.id}>
                  <RadioGroupItem value={goal.id} id={goal.id} />
                  <Label htmlFor={goal.id}>{goal.goal}</Label>
                </div>
              ))}
            </RadioGroup>

            {selectedGoal !== "blog-news" && (
              <div className="space-y-2">
                <h2 className="text-xl font-semibold mb-2">Select Platforms:</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PLATFORMS.map((p) => (
                    <label
                      key={p.key}
                      htmlFor={`select-${p.key}`}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border p-3 cursor-pointer",
                        selectedPlatforms.includes(p.key) ? "border-indigo-500 bg-indigo-50" : "hover:border-slate-300"
                      )}
                      onClick={() => {
                        if (selectedPlatforms.includes(p.key)) {
                          setSelectedPlatforms(selectedPlatforms.filter(platform => platform !== p.key));
                        } else {
                          setSelectedPlatforms([...selectedPlatforms, p.key]);
                        }
                      }}
                    >

                      <Switch
                        //@ts-expect-error: htmlFor is not a prop of Checkbox but it works
                        htmlFor={`select-${p.key}`} checked={selectedPlatforms.includes(p.key)} />
                      <span className="flex items-center gap-2 text-sm">{p.icon}{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {selectedGoal === "blog-news" && (
              <>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold mb-2">Topic:</h2>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (topicInput.trim() && !topics.includes(topicInput.trim())) {
                              setTopics([...topics, topicInput.trim()]);
                              setTopicInput("");
                            }
                          }
                        }}
                        placeholder="Type a topic and press Enter"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (topicInput.trim() && !topics.includes(topicInput.trim())) {
                            setTopics([...topics, topicInput.trim()]);
                            setTopicInput("");
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    {topics.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {topics.map((topic, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {topic}
                            <button
                              type="button"
                              onClick={() => setTopics(topics.filter((_, i) => i !== index))}
                              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-semibold mb-2">Angles:</h2>
                  <div className="border rounded-lg p-4 flex flex-wrap gap-3">
                    {BLOG_NEWS_ANGLES.map((angle) => (
                      <Tooltip key={angle}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`angle-${angle}`}
                              checked={selectedAngles.includes(angle)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedAngles([...selectedAngles, angle]);
                                } else {
                                  setSelectedAngles(selectedAngles.filter(a => a !== angle));
                                }
                              }}
                            />
                            <label
                              htmlFor={`angle-${angle}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer whitespace-nowrap"
                            >
                              {angle}
                            </label>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">{ANGLE_DESCRIPTIONS[angle]}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                  {selectedAngles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedAngles.map((angle) => (
                        <Badge key={angle} variant="secondary" className="flex items-center gap-1">
                          {angle}
                          <button
                            type="button"
                            onClick={() => setSelectedAngles(selectedAngles.filter(a => a !== angle))}
                            className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold mb-2">Webhook:</h2>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-md">
                        <div className="space-y-2">
                          <p className="font-semibold">Webhook Integration</p>
                          <p className="text-xs">When a blog is generated, it will be sent to your webhook URL via POST request.</p>
                          <div className="text-xs space-y-1 mt-2">
                            <p className="font-semibold">Request Format:</p>
                            <pre className="bg-background/50 p-2 rounded text-[10px] overflow-x-auto">
{`{
  "day": 1,
  "blog": {
    "title": "Blog Title",
    "content": "MDX content...",
    "tags": ["tag1", "tag2"],
    "sourceArticle": {...}
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}`}
                            </pre>
                            <p className="font-semibold mt-2">Response Format (Expected):</p>
                            <pre className="bg-background/50 p-2 rounded text-[10px] overflow-x-auto">
{`{
  "status": 201,
  "data": {
    "articleUrl": "https://yoursite.com/ideas/article-slug"
  },
  "message": "Idea created successfully"
}`}
                            </pre>
                            <p className="text-xs mt-2">The articleUrl from your response will be saved and displayed in the campaign.</p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    type="url"
                    value={webhook}
                    onChange={(e) => setWebhook(e.target.value)}
                    placeholder="Enter webhook URL"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Target Audience:</h2>
              <div className="overflow-x-auto pt-3 pb-2 w-full">
                <Slider
                  min={1}
                  max={5}
                  step={1}
                  value={[selectedTargetAudience]}
                  className="w-full"
                  onValueChange={(val) => setSelectedTargetAudience(val[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground px-1 pt-1">
                  <span>Light</span>
                  <span className="text-[10px]">Light-Mod</span>
                  <span>Moderate</span>
                  <span className="text-[10px]">Mod-Agg</span>
                  <span>Aggressive</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={productRelated}
                onCheckedChange={(checked) => setProductRelated(checked as boolean)}
                id="checked" />
              <label
                htmlFor="checked"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Related to product
              </label>
            </div>

            <Button
              size="lg"
              className="w-full"
              loading={campaignPlannerMutation.isPending}
              onClick={onGenerate}
            >
              <Image src="/flash.png" width={24} height={24} className="h-5 w-5 mr-1" alt="Thunder" />
              Generate Campaign
            </Button>
          </div>

        </div>
      )}

      <div className="space-y-6 w-full py-6">
        {campaignPlannerData?.isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="animate-spin h-5 w-5" />
          </div>
        ) : (
          <>
            {!!campaignPlannerData.data?.chatsGroupedByCampaign?.length && (
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold">Active Campaigns:</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowOldCampaigns(!showOldCampaigns)}
                  className="text-xs text-muted-foreground"
                >
                  {showOldCampaigns ? "Hide old" : "Show old"}
                </Button>
              </div>
            )}
            {/* Show loading below Active Campaigns when generating campaign */}
            {campaignPlannerMutation.isPending && (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating campaign...</span>
              </div>
            )}
            {(() => {
              const allCampaigns = campaignPlannerData.data?.chatsGroupedByCampaign || [];
              const filteredCampaigns = allCampaigns.filter((campaign) => {
                // If showing old campaigns, show everything
                if (showOldCampaigns) return true;

                // If campaign has no start date, show it (it's not scheduled yet)
                if (!campaign.startDate) return true;

                // Check if campaign is old (all dates have passed)
                const baseDate = new Date(campaign.startDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // A campaign is considered "old" if all days have passed (regardless of completion)
                const allDaysPassed = campaign.chats.every((chat) => {
                  const chatDate = new Date(baseDate.getTime() + (chat.day - 1) * 86400000);
                  chatDate.setHours(0, 0, 0, 0);
                  return chatDate < today;
                });

                // Show campaign only if it's not old (has at least one upcoming day)
                return !allDaysPassed;
              });

              // Show message if there are campaigns but all are hidden
              if (allCampaigns.length > 0 && filteredCampaigns.length === 0 && !showOldCampaigns) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-lg font-medium text-muted-foreground">
                      All campaigns completed
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowOldCampaigns(true)}
                      className="mt-2 text-xs text-muted-foreground"
                    >
                      Show old campaigns
                    </Button>
                  </div>
                );
              }

              return (
                <>
                  {filteredCampaigns.map((campaign) => {
                    // Toggle Open
                    const isOpen = openCampaigns[campaign.id] || false;
                const toggleOpen = () => {
                  const prevOpenedCampaigns = openCampaigns;
                  const newOpenedCampaigns = { ...prevOpenedCampaigns, [campaign.id]: !isOpen };
                  localStorage.setItem("openedCampaigns", JSON.stringify(newOpenedCampaigns));
                  setOpenCampaigns(newOpenedCampaigns);
                };

                // Open / Close Calendar
                const openCalendar = (campaignId: string) => {
                  if (!isCalenderOpen.includes(campaignId)) {
                    setIsCalenderOpen([...isCalenderOpen, campaignId]);
                  }
                }
                const closeCalendar = (campaignId: string) => {
                  setIsCalenderOpen(isCalenderOpen.filter(id => id !== campaignId));
                }

                // Open / Close Campaign Start Date Settings modal
                const openCampaignStartDateSettings = (campaignId: string) => {
                  if (!isCampaignStartDateSettingsOpen.includes(campaignId)) {
                    setIsCampaignStartDateSettingsOpen([...isCampaignStartDateSettingsOpen, campaignId]);
                  }
                }
                const closeCampaignStartDateSettings = (campaignId: string) => {
                  setIsCampaignStartDateSettingsOpen(isCampaignStartDateSettingsOpen.filter(id => id !== campaignId));
                }

                // To calculate next latest upcoming day to highlight the date
                const baseDate = campaign.startDate ? new Date(campaign.startDate) : new Date();
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const firstUpcomingTimeline = campaign.chats.find((timeline) => {
                  const date = new Date(baseDate.getTime() + (timeline.day - 1) * 86400000);
                  date.setHours(0, 0, 0, 0);
                  return date >= today;
                });
                const firstUpcomingDay = firstUpcomingTimeline?.day;

                // Calculate Loading and real progress bar
                const totalChats = campaign.chats.length;
                // const loadedChats = campaign.chats.filter(chat =>
                //   chat.contents && Object.keys(chat.contents).length > 0
                // ).length;
                // const completedChats = campaign.chats.filter(chat => chat.completed).length;
                const passedDays = campaign.chats.filter(chat => {
                  const chatDate = new Date(baseDate.getTime() + (chat.day - 1) * 86400000);
                  chatDate.setHours(0, 0, 0, 0);
                  return chatDate < today;
                }).length;
                // const loadingProgress = totalChats > 0 ? (loadedChats / totalChats) * 100 : 0;
                const realProgress = totalChats > 0 ? (passedDays / totalChats) * 100 : 0;


                return (
                  <div key={campaign.id} className="border rounded-lg pb-5">

                    <div className="w-full relative">
                      {/* <div
                        className={`h-1 ${loadingProgress === 100 ? 'bg-gray-400' : 'bg-green-600'} transition-all duration-300 absolute top-0 left-0 z-0`}
                        style={{ width: `${loadingProgress}%` }}
                      /> */}
                      {realProgress > 0 &&
                        <div
                          className={`h-1 bg-green-600 transition-all duration-300 absolute top-0 left-0 z-10`}
                          style={{ width: `${realProgress}%` }}
                        />
                      }
                      {/* {isInProgress && isInProgress === campaign.id && <LoadingCard loading={isInProgress} />} */}
                      <button
                        className="w-full flex justify-between items-center p-4 font-semibold"
                        onClick={toggleOpen}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {campaign.name}
                          <div className="hidden sm:block" onClick={(e) => e.stopPropagation()}>
                            <ChangeCampaignName campaignId={campaign.id} campaignName={campaign.name || ""} />
                          </div>
                          <p className="text-sm max-md:hidden">• {campaign.goal}</p>
                          <p className="text-sm max-md:hidden">• {campaign.targetAudience}</p>
                          <p className="text-sm">•&nbsp;
                            {new Date(campaign.startDate ? campaign.startDate : campaign.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          <button className="hidden sm:block" onClick={(e) => { e.stopPropagation(); deleteCampaign(campaign.id, campaign.projectId) }}>
                            <Trash className="size-[14px] stroke-red-500" />
                          </button>
                        </div>
                        <div className="flex justify-end">
                          <div className="px-4 pb-4 space-y-4">
                            <div className="hidden sm:flex gap-2 justify-end">

                              <div onClick={(e) => e.stopPropagation()} className="z-30">
                                <DatePicker
                                  // selected={selectedDate}
                                  onChange={(date) => {
                                    if (date) {
                                      updateCampaignData.mutate({ id: campaign.id, startDate: date })
                                      closeCalendar(campaign.id);
                                    }
                                  }}
                                  open={isCalenderOpen.includes(campaign.id)}
                                  onFocus={() => openCalendar(campaign.id)}
                                  onClickOutside={() => closeCalendar(campaign.id)}
                                  showPopperArrow={true}
                                  className="text-xs"
                                  calendarClassName="!z-50"
                                  customInput={
                                    <Button variant="outline" size="sm" className="w-fit text-xs !z-0">
                                      <Calendar />
                                      <span className="max-lg:hidden"> Start</span>
                                    </Button>
                                  }
                                  disabled={updateCampaignData.isPending || Boolean(campaign.startDate)}
                                />
                              </div>
                              <div onClick={(e) => e.stopPropagation()} className="z-30 flex items-center gap-2 border rounded-md px-3 py-1.5">
                                <Switch
                                  checked={campaign.autoPostEnabled || false}
                                  onCheckedChange={async (checked) => {
                                    if (checked && !campaign.startDate) {
                                      toast.error("Please set a start date first");
                                      return;
                                    }
                                    if (checked) {
                                      // For Blog News, skip platform selection and go directly to time picker
                                      if (campaign.goal === "Blog News") {
                                        setIsTimePickerOpen({ ...isTimePickerOpen, [campaign.id]: true });
                                        return;
                                      }
                                      // For regular campaigns, initialize selected platforms if not set
                                      if (!selectedPlatformsForAutoPost[campaign.id]) {
                                        setSelectedPlatformsForAutoPost({
                                          ...selectedPlatformsForAutoPost,
                                          [campaign.id]: campaign.autoPostPlatforms && campaign.autoPostPlatforms.length > 0 
                                            ? campaign.autoPostPlatforms 
                                            : campaign.platforms,
                                        });
                                      }
                                      // Open platform selector first
                                      setIsPlatformSelectorOpen({ ...isPlatformSelectorOpen, [campaign.id]: true });
                                      return;
                                    } else {
                                      // Disable auto-post
                                      await updateCampaignData.mutateAsync({
                                        id: campaign.id,
                                        autoPostEnabled: false,
                                      });
                                    }
                                  }}
                                />
                                <Label className="text-xs cursor-pointer">Auto-post</Label>
                                {campaign.autoPostEnabled && campaign.autoPostTime && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-auto p-1 text-xs"
                                    onClick={() => {
                                      // For Blog News, go directly to time picker
                                      if (campaign.goal === "Blog News") {
                                        setIsTimePickerOpen({ ...isTimePickerOpen, [campaign.id]: true });
                                        return;
                                      }
                                      // When editing, open platform selector first
                                      setIsPlatformSelectorOpen({ ...isPlatformSelectorOpen, [campaign.id]: true });
                                    }}
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    {campaign.autoPostTime}
                                  </Button>
                                )}
                              </div>
                              {/* Platform Selection Dialog - Only show for non-Blog News campaigns */}
                              {campaign.goal !== "Blog News" && (
                                <Dialog
                                  open={isPlatformSelectorOpen[campaign.id] || false}
                                  onOpenChange={(open) => {
                                    setIsPlatformSelectorOpen({ ...isPlatformSelectorOpen, [campaign.id]: open });
                                  }}
                                >
                                  <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                      <DialogTitle>Select Platforms for Auto-Post</DialogTitle>
                                      <DialogDescription>
                                        Choose which platforms you want to auto-post for this campaign
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 space-y-3">
                                      {campaign.platforms.map((platform) => {
                                      const platformKey = platform as keyof typeof ICONS;
                                      const isSelected = (selectedPlatformsForAutoPost[campaign.id] || campaign.autoPostPlatforms || campaign.platforms).includes(platform);
                                      return (
                                        <div key={platform} className="flex items-center space-x-2">
                                          <Checkbox
                                            id={`${campaign.id}-${platform}`}
                                            checked={isSelected}
                                            onCheckedChange={(checked) => {
                                              const current = selectedPlatformsForAutoPost[campaign.id] || campaign.autoPostPlatforms || campaign.platforms;
                                              const updated = checked
                                                ? [...current, platform]
                                                : current.filter((p) => p !== platform);
                                              setSelectedPlatformsForAutoPost({
                                                ...selectedPlatformsForAutoPost,
                                                [campaign.id]: updated,
                                              });
                                            }}
                                          />
                                          <label
                                            htmlFor={`${campaign.id}-${platform}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                                          >
                                            {ICONS[platformKey] && (
                                              <Image
                                                src={ICONS[platformKey]}
                                                width={16}
                                                height={16}
                                                alt={platform}
                                              />
                                            )}
                                            {platform.charAt(0).toUpperCase() + platform.slice(1)}
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setIsPlatformSelectorOpen({ ...isPlatformSelectorOpen, [campaign.id]: false });
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        const platforms = selectedPlatformsForAutoPost[campaign.id] || campaign.autoPostPlatforms || campaign.platforms;
                                        if (platforms.length === 0) {
                                          toast.error("Please select at least one platform");
                                          return;
                                        }
                                        setIsPlatformSelectorOpen({ ...isPlatformSelectorOpen, [campaign.id]: false });
                                        // Open time picker next
                                        setIsTimePickerOpen({ ...isTimePickerOpen, [campaign.id]: true });
                                      }}
                                    >
                                      Continue
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                              )}
                              <TimePickerDialog
                                value={campaign.autoPostTime || undefined}
                                open={isTimePickerOpen[campaign.id] || false}
                                onOpenChange={(open) => {
                                  setIsTimePickerOpen({ ...isTimePickerOpen, [campaign.id]: open });
                                }}
                                onConfirm={async (time) => {
                                  if (!time) return;
                                  if (!campaign.startDate) {
                                    toast.error("Please set a start date first");
                                    return;
                                  }
                                  
                                  // Handle Blog News campaigns differently
                                  if (campaign.goal === "Blog News") {
                                    // Save the time and enable auto-post (no platforms needed)
                                    await updateCampaignData.mutateAsync({
                                      id: campaign.id,
                                      autoPostEnabled: true,
                                      autoPostTime: time,
                                      autoPostPlatforms: [], // Empty for Blog News
                                    });
                                    // Schedule tasks instead of posts
                                    scheduleCampaignTasks.mutate({
                                      campaignId: campaign.id,
                                      projectId: campaign.projectId,
                                      autoPostTime: time,
                                    });
                                  } else {
                                    // Get selected platforms from state or use saved ones
                                    const platformsToUse = selectedPlatformsForAutoPost[campaign.id] || campaign.autoPostPlatforms || campaign.platforms;
                                    
                                    if (platformsToUse.length === 0) {
                                      toast.error("Please select at least one platform");
                                      setIsPlatformSelectorOpen({ ...isPlatformSelectorOpen, [campaign.id]: true });
                                      return;
                                    }

                                    // Save the time and enable auto-post
                                    await updateCampaignData.mutateAsync({
                                      id: campaign.id,
                                      autoPostEnabled: true,
                                      autoPostTime: time,
                                      autoPostPlatforms: platformsToUse,
                                    });
                                    // Schedule posts
                                    scheduleCampaignPosts.mutate({
                                      campaignId: campaign.id,
                                      projectId: campaign.projectId,
                                      autoPostTime: time,
                                      platforms: platformsToUse,
                                    });
                                  }
                                }}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const selectedCampaignPlanner = campaignPlanner.find(goal => goal.goal.toLowerCase() === campaign.goal.toLowerCase());
                                    if (!selectedCampaignPlanner) {
                                      toast.error("Failed to find plan");
                                      return;
                                    }
                                    const intensityPlans = selectedCampaignPlanner.intensityPlans.find(p => p.targetAudience.toLowerCase() === campaign.targetAudience.toLowerCase());
                                    if (!intensityPlans) {
                                      toast.error("Failed to find plan");
                                      return;
                                    }
                                    const requiredCoins = intensityPlans.data.length * campaign.platforms.length;
                                    const userCoins = session?.user?.remainingChatGenerations || 0;
                                    
                                    if (userCoins < requiredCoins) {
                                      toast.error(`You need ${requiredCoins} coins to regenerate all content. You have ${userCoins} coins.`);
                                      return;
                                    }
                                    
                                    const yes = await confirm({
                                      title: "Regenerate all contents for this campaign?",
                                      description: `Regenerating content will use your ${requiredCoins} coins`
                                    });
                                    if (!yes) return;

                                    const plan = { ...intensityPlans, goal: selectedCampaignPlanner.goal };

                                    const d = await campaignPlannerMutation.mutateAsync({
                                      id: campaign.id,
                                      projectId: projectId as string,
                                      campaignName: campaign.name || "",
                                      plan,
                                      platforms: campaign.platforms
                                    });

                                    for (const chat of (d?.data?.chats || [])) {
                                      if (chat.status === "PENDING") {
                                        await generateChat(projectId as string, campaign.id, chat.day, chat.title);
                                        await sleep(2000);
                                        campaignPlannerData.refetch();
                                      }
                                    }
                                  } catch { }
                                }}
                              >
                                <Play className="h-4 w-4 mr-1" />
                              </Button>
                            </div>
                            <div className="flex justify-end sm:hidden">
                              <Button variant="outline" className="-mr-4" size="sm" onClick={(e) => { e.stopPropagation(); openCampaignStartDateSettings(campaign.id) }}><Settings /></Button>
                            </div>
                          </div>

                          <span className="ml-2 text-sm text-gray-500">{isOpen ? <ChevronUp /> : <ChevronDown />}</span>
                        </div>
                      </button>
                    </div>

                    <div>
                      {isOpen && (
                        <>
                          <div className="flex ml-0 md:ml-32 px-4">
                            <Button variant="ghost" size="sm" onClick={() => setShowPast(!showPast)} className="w-full rounded-lg border mb-5">
                              {showPast ? "Hide Past Days" : "Show Past Days"}
                              <ChevronsUpDown />
                            </Button>
                          </div>

                          <div className="relative">
                            {/* Vertical Line */}
                            <div className="absolute hidden md:block left-5 top-0 bottom-0 w-1 bg-gray-300 z-0" />

                            {campaign.chats.map((timeline, id) => {
                              const futureDate = new Date(baseDate.getTime() + (timeline.day - 1) * 86400000);
                              futureDate.setHours(0, 0, 0, 0);

                              const isToday = futureDate.toDateString() === today.toDateString();
                              const isPast = futureDate < today;
                              // To calculate next latest upcoming day to highlight the date
                              const isFirstUpcoming = !isPast && timeline.day === firstUpcomingDay;
                              const isHighlighted = isToday || isFirstUpcoming;

                              if (isPast && !showPast) return null;

                              return (
                                <div className="flex items-center flex-grow px-4 py-2 gap-4" key={id}>
                                  <div className={`absolute hidden md:block left-3.5 h-4 w-4 rounded-full ${isToday ? "bg-primary" : "bg-gray-400"}`} />
                                  <div className="hidden md:flex items-center justify-end gap-4 min-w-28">
                                    {campaign.goal === "Blog News" ? (
                                      <div className="flex flex-col items-center justify-end">
                                        <span className={`text-sm font-semibold ${isHighlighted ? "text-primary" : "text-gray-600"}`}>
                                          Day {timeline.day}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center justify-end">
                                        <span className={`text-sm font-semibold ${isHighlighted ? "text-primary" : "text-gray-600"}`}>
                                          {futureDate.toLocaleDateString("en-US", { weekday: "long" })}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {futureDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Content Cards Right Column */}
                                  <div className="w-full">
                                    <Dialog>
                                      <div
                                        className={`border p-4 rounded-lg cursor-pointer gap-2 flex-row flex justify-between relative`}
                                      >
                                        {/* Background bar based on completion ratio */}
                                        {campaign.goal !== "Blog News" && (
                                          <div
                                            className="absolute left-0 top-0 h-full bg-green-200 z-0 transition-all duration-300 rounded-s-lg"
                                            style={{ width: timeline.completed ? '100%' : `${(Object.values(timeline.tickMark || {}).filter(Boolean).length / Math.max(Object.keys(timeline.contents || {}).length, 1)) * 100}%` }}
                                          />
                                        )}

                                        {/* Main content stays above the background */}
                                        <div className="relative z-10 flex gap-2 items-center w-full">
                                          {campaign.goal !== "Blog News" && (
                                            <div className="flex justify-end items-center gap-2">
                                              <CampaignCheckButton campaign={campaign!} timeline={timeline!} />
                                            </div>
                                          )}
                                          <DialogTrigger asChild>
                                            <div className="flex flex-row gap-1 flex-grow text-sm sm:text-base">
                                              {/* For Blog News, show "Day 1", "Day 2", etc. */}
                                              {campaign.goal === "Blog News" ? (
                                                <p className="font-medium">Day {timeline.day}</p>
                                              ) : (
                                                <>
                                                  <p className={`block md:hidden font-medium ${isHighlighted ? 'text-primary' : 'text-gray-600'}`}>
                                                    {futureDate.toLocaleDateString("en-US", {
                                                      year: "numeric",
                                                      month: "long",
                                                      day: "numeric",
                                                    })}:
                                                  </p>
                                                  <p>{timeline.title}</p>
                                                </>
                                              )}
                                            </div>
                                          </DialogTrigger>
                                        </div>
                                        <div className="flex justify-end">
                                          {campaign.goal === "Blog News" ? (
                                            // Blog News play button
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="border-dashed border-primary"
                                              onClick={async () => {
                                                // Always fetch metadata from database
                                                const { getBlogNewsMetadataFromCampaign } = await import("@/backend-apis/campaign-planner/blog-news");
                                                const metadata = await getBlogNewsMetadataFromCampaign(campaign.id);
                                                
                                                if (!metadata) {
                                                  toast.error("Blog News metadata not found. This campaign may have been created before metadata storage was implemented. Please recreate the campaign with topics, angles, and webhook URL.");
                                                  return;
                                                }
                                                
                                                // Validate metadata has required fields
                                                if (!metadata.topics || metadata.topics.length === 0) {
                                                  toast.error("Topics are missing from campaign metadata. Please recreate the campaign.");
                                                  return;
                                                }
                                                if (!metadata.angles || metadata.angles.length === 0) {
                                                  toast.error("Angles are missing from campaign metadata. Please recreate the campaign.");
                                                  return;
                                                }
                                                if (!metadata.webhook || !metadata.webhook.trim()) {
                                                  toast.error("Webhook URL is missing from campaign metadata. Please recreate the campaign with a webhook URL.");
                                                  return;
                                                }
                                                
                                                const yes = await confirm({
                                                  title: `Generate blog for Day ${timeline.day}?`,
                                                  description: `This will fetch an article and generate a blog with the selected angles.\nThis will use 3 coins.`
                                                });
                                                if (!yes) return;
                                                
                                                generateBlogNews.mutate(
                                                  {
                                                    campaignId: campaign.id,
                                                    day: timeline.day,
                                                    topics: metadata.topics,
                                                    angles: metadata.angles,
                                                    webhook: metadata.webhook,
                                                  },
                                                  {
                                                    onSuccess: (result) => {
                                                      if (!result.success && result.insufficientCoins) {
                                                        handleCoinsFinished();
                                                      }
                                                    },
                                                  }
                                                );
                                              }}
                                              loading={Boolean(generateBlogNews.isPending && generateBlogNews.variables?.day === timeline.day)}
                                              disabled={generateBlogNews.isPending}
                                            >
                                              <Play />
                                            </Button>
                                          ) : (
                                            // Regular campaign buttons
                                            <>
                                              {
                                                timeline.status === "PENDING" ?
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-dashed border-primary"
                                                    onClick={async () => {
                                                      const yes = await confirm({
                                                        title: `Generating content for this day will use ${campaign.platforms.length} coins.`,
                                                        description: ''
                                                      });
                                                      if (!yes) return;
                                                      generateChat(projectId as string, campaign.id, timeline.day, timeline.title);
                                                    }}
                                                    loading={Boolean(chatLoading && chatLoading.campaignId === campaign.id && timeline.day === chatLoading.day)}
                                                    disabled={generate.isPending}
                                                  >
                                                    <Play />
                                                  </Button>
                                                  :
                                                  <CampaignVideoButton projectId={projectId as string} campaign={campaign!} timeline={timeline!} />
                                              }
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      <DialogContent className="grid md:grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto sm:max-w-[90vw] lg:max-w-[1000px] p-5 sm:p-8 scrollbar-none">
                                        {/* Blog display for Blog News campaigns */}
                                        {campaign.goal === "Blog News" ? (
                                          (() => {
                                            const contents = timeline.contents as Record<string, any>;
                                            const blog = contents?.blog;
                                            
                                            if (!blog) {
                                              return (
                                                <div className="col-span-2 flex items-center justify-center py-12">
                                                  <p className="text-muted-foreground">No blog generated yet. Click the play button to generate.</p>
                                                </div>
                                              );
                                            }
                                            
                                            return (
                                              <div className="col-span-2 space-y-4">
                                                <Card className="rounded-lg border">
                                                  <CardHeader>
                                                    <CardTitle>{blog.title || "Untitled Blog"}</CardTitle>
                                                    {blog.tags && blog.tags.length > 0 && (
                                                      <div className="flex flex-wrap gap-2 mt-2">
                                                        {blog.tags.map((tag: string, index: number) => (
                                                          <Badge key={index} variant="secondary">{tag}</Badge>
                                                        ))}
                                                      </div>
                                                    )}
                                                    {blog.sourceArticle && (
                                                      <p className="text-sm text-muted-foreground mt-2">
                                                        Source: {blog.sourceArticle.source === "reddit" ? "Reddit" : "HackerNews"}
                                                        {blog.sourceArticle.url && (
                                                          <a href={blog.sourceArticle.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline">
                                                            View original
                                                          </a>
                                                        )}
                                                      </p>
                                                    )}
                                                    {blog.articleUrl && (
                                                      <p className="text-sm text-muted-foreground mt-2">
                                                        Published Article:{" "}
                                                        <a href={blog.articleUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                                          {blog.articleUrl}
                                                        </a>
                                                      </p>
                                                    )}
                                                  </CardHeader>
                                                  <CardContent>
                                                    <div className="prose prose-sm max-w-none">
                                                      <Markdown>{blog.content || ""}</Markdown>
                                                    </div>
                                                  </CardContent>
                                                  <CardFooter className="flex justify-between items-center pt-4 border-t">
                                                    <div className="text-sm text-muted-foreground flex flex-col gap-1">
                                                      {blog.webhookSent !== undefined && (
                                                        <span className={blog.webhookSent ? "text-green-600" : "text-red-600"}>
                                                          {blog.webhookSent ? "✓ Webhook sent" : "✗ Webhook failed"}
                                                        </span>
                                                      )}
                                                      {blog.webhookSent && blog.articleUrl && (
                                                        <a 
                                                          href={blog.articleUrl} 
                                                          target="_blank" 
                                                          rel="noopener noreferrer" 
                                                          className="text-primary hover:underline text-xs break-all"
                                                        >
                                                          {blog.articleUrl}
                                                        </a>
                                                      )}
                                                    </div>
                                                    {(() => {
                                                      // Get webhook URL from blog data (stored when blog was generated)
                                                      // Fallback to metadata if not in blog
                                                      const webhookUrl = blog.webhookUrl;
                                                      
                                                      // Always show the button if there's a blog
                                                      return (
                                                        <Button
                                                          variant="outline"
                                                          size="sm"
                                                          onClick={async () => {
                                                            // If webhook URL not in blog, fetch from database
                                                            let finalWebhookUrl = webhookUrl;
                                                            if (!finalWebhookUrl) {
                                                              const { getBlogNewsMetadataFromCampaign } = await import("@/backend-apis/campaign-planner/blog-news");
                                                              const metadata = await getBlogNewsMetadataFromCampaign(campaign.id);
                                                              finalWebhookUrl = metadata?.webhook || "";
                                                            }
                                                            
                                                            if (!finalWebhookUrl) {
                                                              toast.error("Webhook URL not found. Please configure the webhook in campaign settings.");
                                                              return;
                                                            }
                                                            retryWebhook.mutate({
                                                              webhook: finalWebhookUrl,
                                                              blog: {
                                                                title: blog.title,
                                                                content: blog.content,
                                                                tags: blog.tags,
                                                                sourceArticle: blog.sourceArticle,
                                                              },
                                                              day: timeline.day,
                                                              campaignId: campaign.id,
                                                            });
                                                          }}
                                                          loading={retryWebhook.isPending}
                                                          disabled={retryWebhook.isPending || !webhookUrl}
                                                          title={!webhookUrl ? "Webhook URL not configured" : undefined}
                                                        >
                                                          <RefreshCw className="h-4 w-4 mr-2" />
                                                          Resend Webhook
                                                        </Button>
                                                      );
                                                    })()}
                                                  </CardFooter>
                                                </Card>
                                              </div>
                                            );
                                          })()
                                        ) : (
                                          <>
                                            {/* TikTok Video Link Card */}
                                            {campaign.platforms.includes('tiktok') && (
                                              <Card className="rounded-lg border mb-5">
                                                <CardHeader className="flex justify-between items-center flex-row">
                                                  <CardTitle>TikTok</CardTitle>
                                                </CardHeader>
                                                <CardContent className="text-sm text-muted-foreground flex flex-col items-center justify-center py-8">
                                                  <VideoIcon className="w-12 h-12 mb-4 text-muted-foreground/50" />
                                                  <p className="mb-4 text-center">Create a video for TikTok</p>
                                                  <Button asChild variant="outline">
                                                    <Link href={`/project/${projectId}/video?campaignId=${campaign.id}&day=${timeline.day}`}>
                                                      Generate Video →
                                                    </Link>
                                                  </Button>
                                                </CardContent>
                                              </Card>
                                            )}
                                            {timeline.contents && (Object.entries(timeline.contents) as ["x" | "facebook" | "linkedin" | "threads" | "reddit", string][]).map(([platform, text]) => (
                                          <Card key={platform} className="rounded-lg border mb-5">
                                            <div className="flex flex-col gap-0">
                                              <CardHeader className="flex justify-between items-center flex-row">
                                                <CardTitle>{platform.charAt(0).toUpperCase() + platform.slice(1)}</CardTitle>
                                                <div className="flex flex-wrap justify-center items-center sm:flex-row sm:items-center sm:gap-2">
                                                  <Button variant="ghost" size="icon"
                                                    onClick={() => {
                                                      setEditedContent({ ...editedContent, [platform]: text });
                                                      setEditingPlatform(platform);
                                                    }}
                                                  >
                                                    <Pencil />
                                                  </Button>
                                                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(text, platform)}>
                                                    <CopyIcon />
                                                  </Button>
                                                  <PostToWall
                                                    content={text}
                                                    platform={platform}
                                                    projectId={project.id}
                                                    prompt=""
                                                  />

                                                  {
                                                    (() => {
                                                      const platformUrl = project.platformUrls?.[platform as keyof typeof project.platformUrls];
                                                      const redditFallbackUrl = timeline.subreddit ? `https://www.reddit.com/r/${timeline.subreddit}` : null;
                                                      const finalUrl = platform === "reddit" ? (platformUrl || redditFallbackUrl) : platformUrl;


                                                      if (!finalUrl) return null;

                                                      return (
                                                        <Button variant="ghost" size="icon" asChild>
                                                          <Link href={finalUrl} target="_blank" rel="noopener noreferrer">
                                                            <Image src={ICONS[platform]} alt={platform} width={16} height={16} />
                                                          </Link>
                                                        </Button>
                                                      );
                                                    })()
                                                  }


                                                  <SavePlatformCard
                                                    platform={platform}
                                                    projectId={project.id}
                                                    timelineDay={timeline.day}
                                                  />
                                                  <AutoPost platform={platform} content={text} projectId={project.id} />
                                                  <Checkbox
                                                    key={platform}
                                                    checked={(timeline.tickMark as Record<string, boolean>)?.[platform] || false}
                                                    onCheckedChange={async (checked) => {
                                                      toggleTickMark.mutateAsync({
                                                        campaignId: campaign.id,
                                                        day: timeline.day,
                                                        platform: platform,
                                                        tick: Boolean(checked)
                                                      })
                                                    }}
                                                    disabled={campaignPlannerData.isLoading || toggleTickMark.isPending}
                                                  />
                                                </div>
                                              </CardHeader>
                                              {timeline.subreddit && platform === "reddit" && <div className="px-6 flex flex-col gap-0.5">
                                                <span
                                                  className="text-sm text-muted-foreground">
                                                  {`/r/${timeline.subreddit}`}
                                                </span>
                                                {timeline.referencePostContent && <span className="text-sm text-muted-foreground">
                                                  {timeline.referencePostContent ? `${timeline.referencePostContent}...` : ""}
                                                </span>}
                                              </div>}
                                            </div>
                                            <CardContent className="text-sm text-muted-foreground" style={{ whiteSpace: "pre-wrap" }}>
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
                                                    <Button size="sm" onClick={() => handleSave(campaign.id, timeline.day, platform)} loading={editContent.isPending}>
                                                      Save
                                                    </Button>
                                                  </div>
                                                </div>
                                              ) : (
                                                <Markdown>
                                                  {text
                                                    .split("\n")
                                                    .map(line => line.trim())
                                                    .filter(line => line.length > 0)
                                                    .join("\n\n")}
                                                </Markdown>
                                              )}
                                            </CardContent>

                                          </Card>
                                        ))}
                                          </>
                                        )}
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                    {/* </div> */}
                    <Dialog open={isCampaignStartDateSettingsOpen.includes(campaign.id)} onOpenChange={() => closeCampaignStartDateSettings(campaign.id)} key={campaign.id}>
                      <DialogContent>
                        <div className="flex justify-end">
                          <button onClick={() => closeCampaignStartDateSettings(campaign.id)}><X className="size-4" /></button>
                        </div>
                        <div className="flex justify-center items-center gap-8">
                          <div onClick={(e) => e.stopPropagation()}>
                            <ChangeCampaignName campaignId={campaign.id} campaignName={campaign.name || ""} />
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); deleteCampaign(campaign.id, campaign.projectId) }}>
                            <Trash className="size-4 stroke-red-500" />
                          </button>
                        </div>
                        <div className="flex justify-center gap-4">
                          <div onClick={(e) => e.stopPropagation()} className="z-50">
                            <DatePicker
                              // selected={selectedDate}
                              onChange={(date) => {
                                if (date) {
                                  updateCampaignData.mutate({ id: campaign.id, startDate: date })
                                  closeCalendar(campaign.id);
                                  closeCampaignStartDateSettings(campaign.id);
                                }
                              }}
                              open={isCalenderOpen.includes(campaign.id)}
                              onFocus={() => openCalendar(campaign.id)}
                              onClickOutside={() => closeCalendar(campaign.id)}
                              showPopperArrow={true}
                              className="text-xs"
                              customInput={
                                <Button variant="outline" size="sm" className="w-fit text-xs">
                                  <Calendar />
                                  <span className="max-lg:hidden"> Start</span>
                                </Button>
                              }
                              disabled={updateCampaignData.isPending || Boolean(campaign.startDate)}
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const selectedCampaignPlanner = campaignPlanner.find(goal => goal.goal.toLowerCase() === campaign.goal.toLowerCase());
                                if (!selectedCampaignPlanner) {
                                  toast.error("Failed to find plan");
                                  return;
                                }
                                const intensityPlans = selectedCampaignPlanner.intensityPlans.find(p => p.targetAudience.toLowerCase() === campaign.targetAudience.toLowerCase());
                                if (!intensityPlans) {
                                  toast.error("Failed to find plan");
                                  return;
                                }
                                const requiredCoins = intensityPlans.data.length * campaign.platforms.length;
                                const userCoins = session?.user?.remainingChatGenerations || 0;
                                
                                if (userCoins < requiredCoins) {
                                  toast.error(`You need ${requiredCoins} coins to regenerate all content. You have ${userCoins} coins.`);
                                  return;
                                }
                                
                                const yes = await confirm({
                                  title: "Regenerate all contents for this campaign?",
                                  description: `Regenerating content will use your ${requiredCoins} coins`
                                });
                                if (!yes) return;

                                const plan = { ...intensityPlans, goal: selectedCampaignPlanner.goal };

                                const d = await campaignPlannerMutation.mutateAsync({
                                  id: campaign.id,
                                  projectId: projectId as string,
                                  campaignName: campaign.name || "",
                                  plan,
                                  platforms: campaign.platforms
                                });

                                for (const chat of (d?.data?.chats || [])) {
                                  if (chat.status === "PENDING") {
                                    await generateChat(projectId as string, campaign.id, chat.day, chat.title);
                                    await sleep(2000);
                                    campaignPlannerData.refetch();
                                  }
                                }
                              } catch { }
                            }}
                          >
                            <Play className="h-4 w-4 mr-1" />
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                );
                  })}
                </>
              );
            })()}
          </>
        )
        }
      </div>
    </div>
  );
}