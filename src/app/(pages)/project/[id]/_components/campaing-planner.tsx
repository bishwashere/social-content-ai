"use client";

import {
  useCampaignPlanner,
  useChangeCampaignData,
  useDeleteCampaign,
  useEditChatContent,
  useGenerateCampaignChat,
  useGetCampaignPlanner,
  useToggleTickMark
} from "@/backend-apis/campaign-planner/hooks";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { campaignPlanner } from "@/lib/campaign-planner";
import sleep from "@/lib/sleep";
import { Calendar, ChevronDown, ChevronsUpDown, ChevronUp, CopyIcon, Loader2, Pencil, PencilLine, Play, RefreshCcw, Save, Trash, VideoIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogTrigger
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import LoadingCard from "./campaign-loading-card";
import { useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Projects } from "@prisma/client";
import { SavePlatformCard } from "./save-platform-card";

const ICONS = {
  x: "/x.svg",
  facebook: "/fb.svg",
  linkedin: "/linkedin.png",
  instagram: "/instagram.svg",
  threads: "/threads.svg",
  reddit: "/reddit.svg"
};

const getPrompt = (str: string) => `
Description: ${str}
`;

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
  const [selectedTargetAudience, setSelectedTargetAudience] = useState<number>(2);   // 1=Light,   2=Moderate,   3=Aggresive
  const [name, setName] = useState<string>('');
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [isCalenderOpen, setIsCalenderOpen] = useState<string[]>([]);   // array of ids
  const updateCampaignData = useChangeCampaignData();
  const deleteCampaignFromDb = useDeleteCampaign();
  const queryClient = useQueryClient();
  const toggleTickMark = useToggleTickMark();
  const [chatLoading, setChatLoading] = useState<{ campaignId: string, day: number } | null>(null);

  const [showPast, setShowPast] = useState(false);

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

    const yes = await confirm({
      title: 'Do you want to generate campaign?',
      description: 'Generating Campaign will use 5 coins initially.'
    })
    if (!yes) return;

    const plan = {
      ...intensityPlan,
      goal: selectedCampaignPlanner.goal
    };

    setShowCampaignForm(false);

    try {

      const { data: d } = await campaignPlannerMutation.mutateAsync({
        projectId: projectId as string,
        campaignName: name,
        plan
      });

      //fetch only first day data by default
      if (d?.chats && d?.chats[0])
        await generateChat(projectId as string, d.id, d.chats[0].day, d.chats[0].title);

      // for (const chat of (d?.chats || [])) {
      //   if (chat.status === "PENDING") {
      //     try {
      //       await generate.mutateAsync({
      //         projectId: projectId as string,
      //         id: d?.id || '',
      //         prompt: getPrompt(`Day: ${chat.day} Title: ${chat.title}`),
      //         userId: session?.user?.id as string,
      //         day: chat.day
      //       });
      //       await sleep(2000);
      //       campaignPlannerData.refetch();
      //     } catch { }
      //   }
      // }
    } catch { }
  };

  const generateChat = async (projectId: string, campaignId: string, day: number, title: string | null) => {
    setChatLoading({ campaignId: campaignId, day: day });
    try {
      await generate.mutateAsync({
        projectId: projectId,
        id: campaignId,
        prompt: getPrompt(`Day: ${day} Title: ${title}`),
        day: day
      });
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
        <Button size={"xl"} className="fixed bottom-8 right-8 !md:bg-primary/40 hover:bg-primary z-50 shadow-lg" onClick={() => setShowCampaignForm(true)}>
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
              onValueChange={(value) => setSelectedGoal(value)}
            >
              {campaignPlanner.map(goal => (
                <div className="flex items-center space-x-2" key={goal.id}>
                  <RadioGroupItem value={goal.id} id={goal.id} />
                  <Label htmlFor={goal.id}>{goal.goal}</Label>
                </div>
              ))}
            </RadioGroup>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Target Audience:</h2>
              <div className="overflow-x-auto pt-3 pb-2 w-full">
                <Slider
                  min={1}
                  max={3}
                  step={1}
                  value={[selectedTargetAudience]}
                  className="w-full"
                  onValueChange={(val) => setSelectedTargetAudience(val[0])}
                />
                <div className="flex justify-between text-xs text-muted-foreground px-1 pt-1">
                  <span>Light</span>
                  <span>Moderate</span>
                  <span>Aggressive</span>
                </div>
              </div>
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
              <h2 className="text-xl font-bold mb-2">Active Campaigns:</h2>
            )}
            {
              campaignPlannerData.data?.chatsGroupedByCampaign.map((campaign) => {

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
                        <div className="flex flex-wrap justify-center items-center gap-2">
                          {campaign.name}
                          <div onClick={(e) => e.stopPropagation()}>
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
                          <button onClick={(e) => { e.stopPropagation(); deleteCampaign(campaign.id, campaign.projectId) }}>
                            <Trash className="size-[14px] stroke-red-500" />
                          </button>
                        </div>
                        <div className="flex justify-end">
                          {isOpen && (
                            <div className="px-4 pb-4 space-y-4">
                              <div className="flex gap-2 justify-end">

                                <div onClick={(e) => e.stopPropagation()} className="z-50">
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
                                      const yes = await confirm({
                                        title: "Regenerate all contents for this campaign?",
                                        description: `Regenerating content will use your ${intensityPlans.data.length * 5} coins`
                                      });
                                      if (!yes) return;

                                      const plan = { ...intensityPlans, goal: selectedCampaignPlanner.goal };

                                      const d = await campaignPlannerMutation.mutateAsync({
                                        id: campaign.id,
                                        projectId: projectId as string,
                                        campaignName: campaign.name || "",
                                        plan
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


                            </div>
                          )}
                          <span className="ml-2 text-sm text-gray-500">{isOpen ? <ChevronUp /> : <ChevronDown />}</span>
                        </div>
                      </button>
                    </div>

                    <div>
                      {isOpen && (
                        <>
                          <div className="flex justify-end px-4">
                            <Button variant="ghost" size="sm" onClick={() => setShowPast(!showPast)}>
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
                                    <div className="flex flex-col items-center justify-end">
                                      <span className={`text-sm font-semibold ${isHighlighted ? "text-primary" : "text-gray-600"}`}>
                                        {futureDate.toLocaleDateString("en-US", { weekday: "long" })}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {futureDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Content Cards Right Column */}
                                  <div className="w-full">
                                    <Dialog>
                                      <div
                                        className={`border p-4 rounded-lg cursor-pointer gap-2 flex-row flex justify-between relative`}
                                      >
                                        {/* Background bar based on completion ratio */}
                                        <div
                                          className="absolute left-0 top-0 h-full bg-green-200 z-0 transition-all duration-300 rounded-s-lg"
                                          style={{ width: timeline.completed ? '100%' : `${(Object.values(timeline.tickMark || {}).filter(Boolean).length / Object.keys(timeline.contents || {}).length) * 100}%` }}
                                        />

                                        {/* Main content stays above the background */}
                                        <div className="relative z-10 flex gap-2 items-center w-full">
                                          <div className="flex justify-end items-center gap-2">
                                            <CampaignCheckButton campaign={campaign!} timeline={timeline!} />
                                          </div>
                                          <DialogTrigger asChild>
                                            <div className="flex flex-row gap-1 flex-grow text-sm sm:text-base">
                                              {/* <p className="font-medium">Day {timeline.day}:</p> */}
                                              <p className={`block md:hidden font-medium ${isHighlighted ? 'text-primary' : 'text-gray-600'}`}>
                                                {futureDate.toLocaleDateString("en-US", {
                                                  year: "numeric",
                                                  month: "long",
                                                  day: "numeric",
                                                })}:
                                              </p>
                                              <p>{timeline.title}</p>
                                              {/* {chatLoading && chatLoading.campaignId === campaign.id && timeline.day === chatLoading.day && (
                                                <Loader2 className="animate-spin h-4 w-4 ml-auto" />
                                              )} */}
                                            </div>
                                          </DialogTrigger>
                                        </div>
                                        <div className="flex justify-end">
                                          {
                                            timeline.status === "PENDING" ?
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-dashed border-primary"
                                                onClick={async() => {
                                                  const yes = await confirm({
                                                    title: 'Generating content for this day will use 5 coins.',
                                                    description: ''
                                                  });
                                                  if(!yes) return;
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
                                        </div>
                                      </div>
                                      <DialogContent className="grid md:grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto sm:max-w-[90vw] lg:max-w-[1000px]">
                                        {timeline.contents && (Object.entries(timeline.contents) as ["x" | "facebook" | "linkedin" | "threads" | "reddit", string][]).map(([platform, text]) => (
                                          <Card key={platform} className="rounded-lg border mb-5">
                                            <div className="flex flex-col gap-0">
                                              <CardHeader className="flex justify-between items-center flex-row">
                                                <CardTitle>{platform.charAt(0).toUpperCase() + platform.slice(1)}</CardTitle>
                                                <div className="flex flex-row items-center gap-2">
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
                                                            <img src={ICONS[platform]} alt={platform} className="w-4 h-4" />
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
                                                  <AutoPost platform={platform} content={text} />
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
                  </div>
                );
              })}
          </>
        )
        }
      </div>
    </div>
  );
}