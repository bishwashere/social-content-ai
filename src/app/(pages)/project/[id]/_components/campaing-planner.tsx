"use client";

import {
  useCampaignPlanner,
  useChangeCampaignData,
  useDeleteCampaign,
  useGenerateCampaignChat,
  useGetCampaignPlanner,
  useToggleTickMark
} from "@/backend-apis/campaign-planner/hooks";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { campaignPlanner } from "@/lib/campaign-planner";
import sleep from "@/lib/sleep";
import { ChevronDown, ChevronUp, CopyIcon, Loader2, PencilLine, Play, RefreshCcw, Save, Trash, VideoIcon } from "lucide-react";
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
import { Project } from "@/db/projects/schema/project";
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
  project: Project;
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
    const plan = { ...selectedCampaignPlanner.intensityPlans[selectedTargetAudience - 1], goal: selectedCampaignPlanner.goal };
    console.log("PLAN : ", plan)

    try {
      const d = await campaignPlannerMutation.mutateAsync({
        projectId: projectId as string,
        campaignName: name,
        plan
      });

      for (const chat of d.chats) {
        if (chat.status === "PENDING") {
          try {
            await generate.mutateAsync({
              projectId: projectId as string,
              id: d.id,
              prompt: getPrompt(`Day: ${chat.day} Title: ${chat.title}`),
              userId: session?.user?.id as string,
              day: chat.day
            });
            await sleep(2000);
            campaignPlannerData.refetch();
          } catch { }
        }
      }
    } catch { }
  };

  // Auto-generate pending chats for existing campaigns on initial page load
  useEffect(() => {
    if (campaignPlannerData.isLoading || !campaignPlannerData.data) return;
    (async () => {
      if (campaignPlannerData.data)
        for (const campaign of campaignPlannerData.data.chatsGroupedByCampaign) {
          for (const chat of campaign.chats) {
            if (chat.status === "PENDING") {
              try {
                await generate.mutateAsync({
                  projectId: projectId as string,
                  id: campaign.id,
                  prompt: getPrompt(`Day: ${chat.day} Title: ${chat.title}`),
                  userId: session?.user?.id as string,
                  day: chat.day
                });
                await sleep(2000);
                campaignPlannerData.refetch();
              } catch (err) {
                console.error(`Failed to generate Day ${chat.day} for campaign ${campaign.name}`);
              }
            }
          }
        }
    })();
  }, [campaignPlannerData?.isLoading]);

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

  const [isInProgress, setIsInProgress] = useState<boolean>(false);

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

  useEffect(() => {
    if (!campaignPlannerData.data?.chatsGroupedByCampaign) return;

    const anyLoading = campaignPlannerData.data.chatsGroupedByCampaign.some(campaign => {
      const totalChats = campaign.chats.length;
      const loadedChats = campaign.chats.filter(chat =>
        chat.contents && Object.keys(chat.contents).length > 0
      ).length;

      const loadingProgress = totalChats > 0 ? (loadedChats / totalChats) * 100 : 0;

      return loadingProgress > 0 && loadingProgress < 100;
    });

    setIsInProgress(anyLoading);
  }, [campaignPlannerData.data?.chatsGroupedByCampaign]);

  return (
    <div className="flex flex-col gap-2 items-center justify-center">
      {!showCampaignForm && (
        <div className="w-full max-w-2xl bg-white p-6 rounded-2xl shadow-md">
          <Button className="w-full" onClick={() => setShowCampaignForm(true)}>
            Plan Campaign
          </Button>
        </div>
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

      <LoadingCard loading={isInProgress} />

      <div className="space-y-6 w-full max-w-2xl py-6">
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
                const isOpen = openCampaigns[campaign.id] || false;
                const toggleOpen = () => {
                  const prevOpenedCampaigns = openCampaigns;
                  const newOpenedCampaigns = { ...prevOpenedCampaigns, [campaign.id]: !isOpen };
                  localStorage.setItem("openedCampaigns", JSON.stringify(newOpenedCampaigns));
                  setOpenCampaigns(newOpenedCampaigns);
                };
                const totalChats = campaign.chats.length;
                const loadedChats = campaign.chats.filter(chat =>
                  chat.contents && Object.keys(chat.contents).length > 0
                ).length;
                const completedChats = campaign.chats.filter(chat => chat.completed).length;

                const loadingProgress = totalChats > 0 ? (loadedChats / totalChats) * 100 : 0;
                const realProgress = totalChats > 0 ? (completedChats / totalChats) * 100 : 0;

                const openCalendar = (campaignId: string) => {
                  if (!isCalenderOpen.includes(campaignId)) {
                    setIsCalenderOpen([...isCalenderOpen, campaignId]);
                  }
                }

                const closeCalendar = (campaignId: string) => {
                  setIsCalenderOpen(isCalenderOpen.filter(id => id !== campaignId));
                }

                return (
                  <div key={campaign.id} className="border rounded-lg">

                    <div className="w-full relative">
                      <div
                        className={`h-1 ${loadingProgress === 100 ? 'bg-gray-400' : 'bg-green-600'} transition-all duration-300 absolute top-0 left-0 z-0`}
                        style={{ width: `${loadingProgress}%` }}
                      />
                      {realProgress > 0 && loadingProgress === 100 &&
                        <div
                          className={`h-1 bg-green-600 transition-all duration-300 absolute top-0 left-0 z-10`}
                          style={{ width: `${realProgress}%` }}
                        />
                      }
                      <button
                        className="w-full flex justify-between items-center p-4 font-semibold"
                        onClick={toggleOpen}
                      >
                        <div className="flex flex-wrap justify-center items-center gap-2">
                          {campaign.name}
                          <ChangeCampaignName campaignId={campaign.id} campaignName={campaign.name || ""} />
                          <p className="text-sm">• {campaign.goal}</p>
                          <p className="text-sm">• {campaign.targetAudience}</p>
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
                        <span className="ml-2 text-sm text-gray-500">{isOpen ? <ChevronUp /> : <ChevronDown />}</span>
                      </button>
                    </div>

                    {isOpen && (
                      <div className="px-4 pb-4 space-y-4">
                        <div className="flex gap-2 justify-end">

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
                                <Play />
                                Start
                              </Button>
                            }
                            disabled={updateCampaignData.isPending || Boolean(campaign.startDate)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const yes = await confirm({
                                title: "Regenerate content for this day?",
                                description: "Regenerating content will use your coins"
                              });
                              if (!yes) return;
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

                                const plan = { ...intensityPlans, goal: selectedCampaignPlanner.goal };

                                const d = await campaignPlannerMutation.mutateAsync({
                                  id: campaign.id,
                                  projectId: projectId as string,
                                  campaignName: campaign.name || "",
                                  plan
                                });

                                for (const chat of d.chats) {
                                  if (chat.status === "PENDING") {
                                    await generate.mutateAsync({
                                      projectId: projectId as string,
                                      id: campaign.id,
                                      prompt: getPrompt(`Day: ${chat.day} Title: ${chat.title}`),
                                      userId: session?.user?.id as string,
                                      day: chat.day
                                    });
                                    await sleep(2000);
                                    campaignPlannerData.refetch();
                                  }
                                }
                              } catch {
                                toast.error("Failed to regenerate campaign");
                              }
                            }}
                          >
                            <RefreshCcw className="h-4 w-4 mr-1" />
                          </Button>
                        </div>


                      </div>
                    )}


                    {isOpen && (
                      <div className="p-2 space-y-2">
                        {campaign.chats.map((timeline, id) => (
                          <Dialog key={id}>
                            <div className="border p-4 rounded-lg cursor-pointer hover:bg-gray-50 gap-2 flex-row flex justify-between">
                              <div className="flex gap-2 items-center">
                                <div className="flex justify-end items-center gap-2">
                                  <CampaignCheckButton campaign={campaign!} timeline={timeline!} />
                                </div>
                                <DialogTrigger asChild>
                                  <div className="flex flex-row gap-1 flex-grow">
                                    <p className="font-medium">Day {timeline.day}:</p>
                                    <p>{timeline.title}</p>
                                    {timeline.status === "PENDING" && (
                                      <Loader2 className="animate-spin h-4 w-4 ml-auto" />
                                    )}
                                  </div>
                                </DialogTrigger>
                              </div>
                              <div className="flex justify-end">
                                <CampaignVideoButton projectId={projectId as string} campaign={campaign!} timeline={timeline!} />
                              </div>
                            </div>
                            <DialogContent className="grid md:grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto sm:max-w-[90vw] lg:max-w-[1000px]">
                              {timeline.contents && (Object.entries(timeline.contents) as ["x" | "facebook" | "linkedin" | "threads" | "reddit", string][]).map(([platform, text]) => (
                                <Card key={platform} className="rounded-lg border mb-5">
                                  <CardHeader className="flex justify-between items-center mb-2 flex-row">
                                    <CardTitle>{platform.charAt(0).toUpperCase() + platform.slice(1)}</CardTitle>
                                    <div className="flex flex-row items-center gap-2">
                                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(text, platform)}>
                                        <CopyIcon />
                                      </Button>
                                      <PostToWall
                                        content={text}
                                        platform={platform}
                                        projectId={project._id}
                                        prompt=""
                                      />
                                      {project.platformUrls[platform] && (
                                        <Button variant="ghost" size="icon" asChild>
                                          <Link href={project.platformUrls[platform] || "#"} target="_blank">
                                            <img src={ICONS[platform]} alt={platform} className="w-4 h-4" />
                                          </Link>
                                        </Button>
                                      )}
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
                                  <CardContent className="text-sm text-muted-foreground" style={{ whiteSpace: "pre-wrap" }}>
                                    <Markdown>
                                      {text
                                        .split("\n")
                                        .map(line => line.trim())
                                        .filter(line => line.length > 0)
                                        .join("\n\n")}
                                    </Markdown>
                                  </CardContent>
                                </Card>
                              ))}
                            </DialogContent>
                          </Dialog>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </>
        )}
      </div>
    </div>
  );
}