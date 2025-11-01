import { useChangeCampaignData } from "@/backend-apis/campaign-planner/hooks";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogContent, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PencilLine } from "lucide-react";
import { useState } from "react";

export default function ChangeCampaignName({ campaignId, campaignName }: { campaignId: string, campaignName: string }) {
    const [name, setName] = useState<string>(campaignName);
    const [open, setOpen] = useState(false);
    const update = useChangeCampaignData();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button onClick={(e) => e.stopPropagation()}><PencilLine className="size-4 sm:size-3 stroke-red-500" /></button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader className="text-lg font-semibold">Change Campaign Name</DialogHeader>
                <DialogDescription className="flex flex-col py-4 gap-4">
                    <Input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={() => { update.mutateAsync({ id: campaignId, name }).then(() => setOpen(false)) }} loading={update.isPending}>Save</Button>
                    </div>
                </DialogDescription>
            </DialogContent>
        </Dialog>
    )
}