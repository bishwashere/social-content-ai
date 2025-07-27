"use client";

import {
  useCampaignPlanner,
  useGenerateCampaignChat,
  useGetCampaignPlanner
} from "@/backend-apis/campaign-planner/hooks";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { campaignPlanner } from "@/lib/campaign-planner";
import sleep from "@/lib/sleep";
import { ChevronDown, ChevronUp, CopyIcon, Loader2, PencilLine, RefreshCcw, VideoIcon } from "lucide-react";
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

const ICONS = {
  x: "/x.svg",
  facebook: "/fb.svg",
  linkedin: "/linkedin.png",
  instagram: "/instagram.svg",
  threads: "/threads.svg"
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
        if (chat.status === "pending") {
          try {
            await generate.mutateAsync({
              projectId: projectId as string,
              id: d._id,
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
    if (!campaignPlannerData?.isLoading && campaignPlannerData?.data) {
      (async () => {
        for (const campaign of campaignPlannerData.data.chatsGroupedByCampaign) {
          for (const chat of campaign.chats) {
            if (chat.status === "pending") {
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
    }
  }, [campaignPlannerData?.isLoading]);

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

      <div className="space-y-6 py-10 w-full max-w-2xl">
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
              setOpenCampaigns(prev => ({
                ...prev,
                [campaign.id]: !isOpen,
              }));
            };
            const totalChats = campaign.chats.length;
            const completedChats = campaign.chats.filter(chat =>
              chat.contents && Object.keys(chat.contents).length > 0
            ).length;

            const progress = totalChats > 0 ? (completedChats / totalChats) * 100 : 0;

            return (
              <div key={campaign.id} className="border rounded-lg">

                <div className="w-full">
                  <div
                    className={`h-1 ${progress === 100 ? 'bg-gray-400' : 'bg-green-600'} transition-all duration-300`}
                    style={{ width: `${progress}%` }}
                  />
                  <button
                    className="w-full flex justify-between items-center p-4 font-semibold"
                    onClick={toggleOpen}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {campaign.name}
                      <ChangeCampaignName campaignId={campaign.id} campaignName={campaign.name || ""} />
                      <p className="text-sm">• {campaign.goal}</p>
                      <p className="text-sm">• {campaign.targetAudience}</p>
                      <p className="text-sm">•&nbsp;
                        {new Date(campaign.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <span className="ml-2 text-sm text-gray-500">{isOpen ? <ChevronUp /> : <ChevronDown />}</span>
                  </button>
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-4">
                    <div className="flex justify-end">
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
                              if (chat.status === "pending") {
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
                                {timeline.status === "pending" && (
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
                          {timeline.contents && (Object.entries(timeline.contents) as ["x" | "facebook" | "linkedin" | "threads", string][]).map(([platform, text]) => (
                            <Card key={platform} className="rounded-lg border mb-5">
                              <CardHeader className="flex justify-between items-center mb-2 flex-row">
                                <CardTitle>{platform.charAt(0).toUpperCase() + platform.slice(1)}</CardTitle>
                                <div className="flex flex-row gap-2">
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