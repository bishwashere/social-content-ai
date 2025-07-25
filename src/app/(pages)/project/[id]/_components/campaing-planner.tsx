"use client";

import {
  useCampaignPlanner,
  useGenerateCampaignChat,
  useGetCampaignPlanner
} from "@/backend-apis/campaign-planner/hooks";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { campaignPlanner } from "@/lib/campaign-planner";
import sleep from "@/lib/sleep";
import { CopyIcon, Loader2, RefreshCcw } from "lucide-react";
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

const ICONS = {
  x: "/x.svg",
  facebook: "/fb.svg",
  linkedin: "/linkedin.png",
  instagram: "/instagram.svg",
  threads: "/threads.svg"
};

const getPrompt = (str: string) => `
Your role is to plan a campaign post for me based on the given description.
CRITICAL RULE: just give me the post content assuming that the post will be directly shared to social media.
Do not say here is your post like that, just give the content of the post.
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
  const [allCampaigns, setAllCampaigns] = useState<any[]>([]);
  const [openCampaigns, setOpenCampaigns] = useState<Record<string, boolean>>({});

  const campaignPlannerData = useGetCampaignPlanner({
    projectId: projectId as string
  });

  const onGenerate = async () => {
    if (!selectedGoal) {
      toast.error("Please select a goal!");
      return;
    }

    const plan = campaignPlanner.find(goal => goal.id === selectedGoal);
    if (!plan) {
      toast.error("Failed to find plan");
      return;
    }

    try {
      const d = await campaignPlannerMutation.mutateAsync({
        projectId: projectId as string,
        plan
      });

      for (const chat of d.chats) {
        if (chat.status === "pending") {
          try {
            await generate.mutateAsync({
              projectId: projectId as string,
              campaignId: selectedGoal,
              prompt: getPrompt(`Day: ${chat.day} Title: ${chat.campaignTitle}`),
              userId: session?.user?.id as string,
              day: chat.day
            });
            await sleep(2000);
            campaignPlannerData.refetch();
          } catch {}
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (!campaignPlannerData?.isLoading && campaignPlannerData?.data) {
      setAllCampaigns(campaignPlannerData.data.chatsGroupedByCampaign || []);
    }
  }, [campaignPlannerData?.isLoading, campaignPlannerData?.data]);

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
      <div className="w-full max-w-2xl bg-white p-6 rounded-2xl shadow-md">
        <div className="space-y-5">
          <h2 className="text-xl font-semibold mb-4">Select a goal:</h2>
          <RadioGroup
            className="flex flex-row gap-4 flex-wrap"
            value={selectedGoal || ""}
            onValueChange={(value) => setSelectedGoal(value)}
          >
            {campaignPlanner.map(goal => (
              <div className="flex items-center space-x-2" key={goal.id}>
                <RadioGroupItem value={goal.id} id={goal.id} />
                <Label htmlFor={goal.id}>{goal.title}</Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold mb-4">Target Audience:</h2>
            <div className="overflow-x-auto pb-2">
              <Slider
                min={1}
                max={3}
                step={1}
                defaultValue={[2]}
                className="w-full max-w-md"
                onValueChange={(val) => console.log("Selected intensity:", val[0])}
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
            Quick Generate
          </Button>
        </div>




      </div>

      <div className="space-y-6 py-10 w-full max-w-2xl">
        {campaignPlannerData?.isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="animate-spin h-5 w-5" />
          </div>
        ) : (
          allCampaigns.map((campaign) => {
            const isOpen = openCampaigns[campaign.campaignId] || false;
            const toggleOpen = () => {
              setOpenCampaigns(prev => ({
                ...prev,
                [campaign.campaignId]: !isOpen,
              }));
            };

            return (
              <div key={campaign.campaignId} className="border rounded-lg">
                <div className="flex justify-between items-center p-4">
                  <button
                    className="text-left font-semibold"
                    onClick={toggleOpen}
                  >
                    {campaign.campaignTitle}
                    <span className="ml-2 text-sm text-gray-500">{isOpen ? "Hide" : "Show"}</span>
                  </button>
                </div>

                {isOpen && (
                  <div className="p-4 space-y-4">
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const plan = campaignPlanner.find(g => g.id === campaign.campaignId);
                            if (!plan) return toast.error("Plan not found");

                            const d = await campaignPlannerMutation.mutateAsync({
                              projectId: projectId as string,
                              plan
                            });

                            for (const chat of d.chats) {
                              if (chat.status === "pending") {
                                await generate.mutateAsync({
                                  projectId: projectId as string,
                                  campaignId: campaign.campaignId,
                                  prompt: getPrompt(`Day: ${chat.day} Title: ${chat.campaignTitle}`),
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
                        Regenerate
                      </Button>
                    </div>


                  </div>
                )}


                {isOpen && (
                  <div className="p-2 space-y-2">
                    {campaign.chats.map((timeline: any, id: number) => (
                      <Dialog key={id}>
                        <DialogTrigger asChild>
                          <div className="border p-4 rounded-lg cursor-pointer hover:bg-gray-50">
                            <div className="flex flex-row gap-1">
                              <p className="font-medium">Day {timeline.day}:</p>
                              <p>{timeline.campaignTitle}</p>
                              {timeline.status === "pending" && (
                                <Loader2 className="animate-spin h-4 w-4 ml-auto" />
                              )}
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="grid md:grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto sm:max-w-[90vw] lg:max-w-[1000px]">
                          {Object.entries(timeline.contents).map(([platform, text]) => (
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
          })
        )}
      </div>
    </div>
  );
}
