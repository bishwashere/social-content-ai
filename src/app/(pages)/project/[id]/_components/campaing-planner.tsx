"use client";
import { useCampaignPlanner, useGenerateCampaignChat, useGetCampaignPlanner } from "@/backend-apis/campaign-planner/hooks";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { campaignPlanner } from "@/lib/campaign-planner";
import sleep from "@/lib/sleep";
import { CopyIcon, Loader2, RefreshCcw, Share2Icon } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
}


const getPrompt = (str: string) => {
  return `
  Your role is to plan a campaign post for me based on the given description.
  CRITICAL RULE: just give me the post content assuming that the post will be directly shared to social media.
  Do not say here is your post like that, just give the content of the post.
  Description: ${str}
  `
}

type Props = {
  project: Project
}
export default function CampaignPlannerPage(
  { project }: Props
) {
  const generate = useGenerateCampaignChat()
  const [selectedGoal, setSelectedGoal] = useState<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const campaignPlannerMutation = useCampaignPlanner()
  const { id: projectId } = useParams();
  const { data: session } = useSession()

  const campaignPlannerData = useGetCampaignPlanner({
    projectId: projectId as string,
    campaignId: selectedGoal as string,
  })

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
        plan,
      });
      setData(d.chats)

      for (const chat of d.chats) {
        if (chat.status === "pending") {
          // trigger ai generation
          try {
            console.log(`Generating post for ${chat.day} ${chat.campaignTitle}`)
            const data = await generate.mutateAsync({
              projectId: projectId as string,
              campaignId: selectedGoal as string,
              prompt: getPrompt(`Day: ${chat.day} Title: ${chat.campaignTitle}`),
              userId: session?.user?.id as string,
              day: chat.day,
            })
            await sleep(2000)
            campaignPlannerData.refetch()
          } catch {

          }
        }
      }

    } catch {

    }
  }

  useEffect(() => {
    if (campaignPlannerData?.isLoading) return
    if (campaignPlannerData?.data) {
      setData(campaignPlannerData.data.chats)
    }
  }, [campaignPlannerData?.isLoading, campaignPlannerData?.data])

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
    <div className="flex flex-col gap-2 items-center justify-center">
      <div className="w-full max-w-2xl bg-white p-6 rounded-2xl shadow-md">
        <div className="space-y-5">
          <h2 className="text-xl font-semibold mb-4">Select your goal</h2>
          <RadioGroup className="flex flex-row gap-4" onValueChange={(value) => { setData([]); setSelectedGoal(value) }}>
            {
              campaignPlanner.map(goal => (
                <div className="flex items-center space-x-1" key={goal.id}>
                  <RadioGroupItem value={goal.id} id={goal.id} />
                  <Label htmlFor={goal.id}>{goal.title}</Label>
                </div>
              ))
            }
          </RadioGroup>
          {/* <Button
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
                    </Button> */}
          <Button
            size={"lg"}
            className="w-full"
            loading={campaignPlannerMutation.isPending}
            onClick={onGenerate}
          >
            {data.length > 0 ? (
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
        </div>
      </div>

      <div className="space-y-4 py-10 w-full max-w-2xl">
        {
          campaignPlannerData.isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="animate-spin h-5 w-5" />
            </div>
          ) : data.length > 0 && data.map((timeline, id) => {
            if (timeline.status !== "pending") {
              return (
                <Dialog>
                  <DialogTrigger asChild>
                    <div key={id} className="border p-4 rounded-lg mb-4 flex flex-col cursor-pointer">
                      <div className="flex flex-row gap-1">
                        <p className="font-medium">Day {timeline.day}:</p>
                        <p className="">{timeline.campaignTitle}</p>
                        {timeline.status === "pending" && <Loader2 className="animate-spin h-4 w-4 ml-auto" />}
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="grid md:grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto sm:max-w-[90vw] lg:max-w-[1000px]">
                    {
                      //@ts-expect-error:...........
                      Array.from(timeline.contents).map(([platform, text]) => {
                        console.log("platform", platform, text)
                        return (
                          <Card key={platform} className="rounded-lg border mb-5 ">
                            <CardHeader className="flex justify-between items-center mb-2 flex-row">
                              <CardTitle>
                                {platform.charAt(0).toUpperCase() + platform.slice(1)}
                              </CardTitle>
                              <div className="flex flex-row gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyToClipboard(text as string, platform)}
                                >
                                  <CopyIcon />
                                </Button>
                                <PostToWall
                                  content={text as string}
                                  platform={platform}
                                  projectId={project._id}
                                  prompt={""}
                                />
                                {project.platformUrls[platform] && (
                                  <Button variant="ghost" size="icon" asChild>
                                    <Link
                                      href={project.platformUrls[platform] || "#"}
                                      target="_blank"
                                    >
                                      <img
                                        //@ts-expect-error:..........
                                        src={ICONS[platform]}
                                        alt={platform}
                                        className="w-4 h-4" />
                                    </Link>
                                  </Button>
                                )}
                                <AutoPost
                                  platform={platform}
                                  content={text as string}
                                />
                              </div>
                            </CardHeader>
                            <CardContent
                              className="text-sm text-muted-foreground"
                              style={{ whiteSpace: "pre-wrap" }}
                            >
                              <Markdown>
                                {(text as string)
                                  .split("\n")
                                  .map((line) => line.trim())
                                  .filter((line) => line.length > 0)
                                  .join("\n\n")}
                              </Markdown>
                            </CardContent>
                          </Card>
                        )
                      },
                      )}
                  </DialogContent>
                </Dialog>
              )
            }
            return (
              <div key={id} className="border p-4 rounded-lg mb-4 flex flex-col">
                <div className="flex flex-row gap-1">
                  <p className="font-medium">Day {timeline.day}:</p>
                  <p className="">{timeline.campaignTitle}</p>
                  {timeline.status === "pending" && <Loader2 className="animate-spin h-4 w-4 ml-auto" />}
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}