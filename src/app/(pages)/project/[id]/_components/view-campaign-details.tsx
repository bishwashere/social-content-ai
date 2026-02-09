"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PLATFORM_ICONS, PLATFORM_LABELS, type PlatformId } from "@/constants/platforms";
import { useChangeCampaignData } from "@/backend-apis/campaign-planner/hooks";
import { Check, Eye, Pencil, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type BlogNewsMetadata = {
  topics?: string[];
  angles?: string[];
  webhook?: string;
  platforms?: string[];
  timezone?: string;
  targetAudience?: string;
  productRelated?: boolean;
} | null;

type CampaignData = {
  id: string;
  name: string | null;
  goal: string;
  targetAudience: string;
  platforms: string[];
  startDate: Date | null;
  date: Date;
  createdAt: Date;
  autoPostEnabled: boolean;
  autoPostTime: string | null;
  autoPostPlatforms: string[];
  blogNewsMetadata: BlogNewsMetadata;
  chats?: { day: number }[];
  chatCount?: number;
  totalDays?: number;
};

export default function ViewCampaignDetails({ campaign }: { campaign: CampaignData }) {
  const [open, setOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(campaign.name || "");
  const updateCampaign = useChangeCampaignData();

  const isBlogNews = campaign.goal === "Blog News";
  const blogMeta = campaign.blogNewsMetadata as BlogNewsMetadata;
  const totalDays =
    (campaign as any).totalDays ||
    (campaign as any).chatCount ||
    campaign.chats?.length ||
    0;

  const handleSaveName = async () => {
    if (!editedName.trim()) return;
    await updateCampaign.mutateAsync({ id: campaign.id, name: editedName.trim() });
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setEditedName(campaign.name || "");
    setIsEditingName(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) handleCancelEdit(); }}>
      <DialogTrigger asChild>
        <button onClick={(e) => e.stopPropagation()} aria-label="View campaign details">
          <Eye className="size-4 sm:size-3 stroke-blue-500" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto scrollbar-none">
        <DialogHeader>
          <DialogTitle className="text-lg">Campaign Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Campaign Name - Editable */}
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</p>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleSaveName}
                  disabled={updateCampaign.isPending}
                >
                  <Check className="size-4 stroke-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleCancelEdit}
                  disabled={updateCampaign.isPending}
                >
                  <X className="size-4 stroke-red-500" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{campaign.name || "Unnamed Campaign"}</p>
                <button onClick={() => { setEditedName(campaign.name || ""); setIsEditingName(true); }}>
                  <Pencil className="size-3.5 stroke-muted-foreground hover:stroke-foreground transition-colors" />
                </button>
              </div>
            )}
          </div>

          {/* Goal */}
          <DetailRow label="Goal">
            <Badge variant="secondary" className="text-sm font-medium">
              {campaign.goal}
            </Badge>
          </DetailRow>

          {/* Target Audience / Intensity */}
          <DetailRow label="Target Audience">
            <Badge variant="outline" className="text-sm">
              {campaign.targetAudience}
            </Badge>
          </DetailRow>

          {/* Platforms */}
          <DetailRow label="Platforms">
            <div className="flex flex-wrap gap-2">
              {campaign.platforms.map((platform) => (
                <div
                  key={platform}
                  className="flex items-center gap-1.5 border rounded-lg px-2.5 py-1 text-sm bg-muted/40"
                >
                  <Image
                    src={PLATFORM_ICONS[platform as PlatformId]}
                    width={14}
                    height={14}
                    alt={PLATFORM_LABELS[platform as PlatformId] || platform}
                    className="dark:brightness-0 dark:invert"
                  />
                  <span>{PLATFORM_LABELS[platform as PlatformId] || platform}</span>
                </div>
              ))}
            </div>
          </DetailRow>

          {/* Total Days */}
          {totalDays > 0 && (
            <DetailRow label="Total Days" value={`${totalDays} days`} />
          )}

          {/* Start Date */}
          <DetailRow
            label="Start Date"
            value={
              campaign.startDate
                ? new Date(campaign.startDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Not set"
            }
          />

          {/* Created Date */}
          <DetailRow
            label="Created"
            value={new Date(campaign.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />

          {/* Auto-Post Settings */}
          <DetailRow label="Auto-Post">
            <div className="space-y-1.5">
              <Badge variant={campaign.autoPostEnabled ? "default" : "outline"} className="text-sm">
                {campaign.autoPostEnabled ? "Enabled" : "Disabled"}
              </Badge>
              {campaign.autoPostEnabled && campaign.autoPostTime && (
                <p className="text-sm text-muted-foreground">
                  Time: {campaign.autoPostTime}
                  {blogMeta?.timezone && ` (${blogMeta.timezone})`}
                </p>
              )}
              {campaign.autoPostEnabled && campaign.autoPostPlatforms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {campaign.autoPostPlatforms.map((platform) => (
                    <div
                      key={platform}
                      className="flex items-center gap-1 border rounded px-2 py-0.5 text-xs bg-muted/40"
                    >
                      <Image
                        src={PLATFORM_ICONS[platform as PlatformId]}
                        width={12}
                        height={12}
                        alt={PLATFORM_LABELS[platform as PlatformId] || platform}
                        className="dark:brightness-0 dark:invert"
                      />
                      <span>{PLATFORM_LABELS[platform as PlatformId] || platform}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DetailRow>

          {/* Divider for campaign-type specific properties */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {isBlogNews ? "Blog News Properties" : "Campaign Properties"}
            </p>
          </div>

          {/* Blog News specific properties */}
          {isBlogNews && blogMeta && (
            <>
              {/* Topics */}
              {blogMeta.topics && blogMeta.topics.length > 0 && (
                <DetailRow label="Topics">
                  <div className="flex flex-wrap gap-2">
                    {blogMeta.topics.map((topic, idx) => (
                      <Badge key={idx} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </DetailRow>
              )}

              {/* Angles */}
              {blogMeta.angles && blogMeta.angles.length > 0 && (
                <DetailRow label="Angles">
                  <div className="flex flex-wrap gap-2">
                    {blogMeta.angles.map((angle, idx) => (
                      <Badge key={idx} variant="outline">
                        {angle}
                      </Badge>
                    ))}
                  </div>
                </DetailRow>
              )}

              {/* Webhook */}
              {blogMeta.webhook && (
                <DetailRow label="Webhook">
                  <code className="text-xs bg-muted px-2 py-1 rounded break-all">
                    {blogMeta.webhook}
                  </code>
                </DetailRow>
              )}

              {/* Product Related */}
              {blogMeta.productRelated !== undefined && (
                <DetailRow label="Product Related">
                  <Badge variant={blogMeta.productRelated ? "default" : "outline"} className="text-sm">
                    {blogMeta.productRelated ? "Yes" : "No"}
                  </Badge>
                </DetailRow>
              )}

              {/* Timezone */}
              {blogMeta.timezone && (
                <DetailRow label="Timezone" value={blogMeta.timezone} />
              )}
            </>
          )}

          {/* Normal campaign properties */}
          {!isBlogNews && (
            <>
              <DetailRow label="Campaign Type">
                <Badge variant="secondary" className="text-sm">
                  Standard Campaign
                </Badge>
              </DetailRow>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Reusable row layout for displaying a label + value */
function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      {value ? <p className="text-sm font-medium text-foreground">{value}</p> : children}
    </div>
  );
}
