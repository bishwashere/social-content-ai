"use client";
import { useCampaignPlanner, useGetCampaignPlanner } from "@/backend-apis/campaign-planner/hooks";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { campaignPlanner } from "@/lib/campaign-planner";
import { Loader, Loader2, RefreshCcw } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";


export default function CampaignPlannerPage() {
  const [selectedGoal, setSelectedGoal] = useState<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const campaignPlannerMutation = useCampaignPlanner()
  const { id: projectId } = useParams();

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

      // trigger ai generation

    } catch {

    }
  }

  useEffect(() => {
    if (campaignPlannerData?.isLoading) return
    if (campaignPlannerData?.data) {
      setData(campaignPlannerData.data.chats)
    }
  }, [campaignPlannerData?.isLoading, campaignPlannerData?.data])

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
          ) : data.length > 0 && data.map((timeline, id) => (
            <div key={id} className="border p-4 rounded-lg mb-4 flex flex-col">
              <div className="flex flex-row gap-1">
                <p className="font-medium">Day {timeline.day}:</p>
                <p className="">{timeline.campaignTitle}</p>
                {timeline.status === "pending" && <Loader2 className="animate-spin h-4 w-4 ml-auto" />}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}