"use client";

import {
  useCampaignPlanner,
  useChangeCampaignData,
  useDeleteCampaign,
  useEditChatContent,
  useGenerateCampaignChat,
  useGenerateBlogNewsContent,
  useGetCampaignPlanner,
  useGetCampaignChats,
  useGetOldCampaigns,
  useRetryWebhook,
  useScheduleCampaignPosts,
  useScheduleCampaignTasks,
  useToggleTickMark,
  useBlogFromScheduledPost
} from "@/backend-apis/campaign-planner/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { campaignPlanner } from "@/lib/campaign-planner";
import sleep from "@/lib/sleep";
import { Calendar, ChevronDown, ChevronsUpDown, ChevronUp, Clock, CopyIcon, HelpCircle, Loader2, Pencil, RefreshCw, Settings, Sparkles, Trash, VideoIcon, Wand2, X } from "lucide-react";
import { useSession } from "@/backend-apis/auth/hooks";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
import { applyPlaceholders, getProjectPlaceholders } from "@/lib/placeholders";
import { markDemoCampaignCreated } from "@/server-actions/user-flags";
import { ProjectLocationTour } from "@/components/common/project-location-tour";
import { UploadMediaToCampaignChat } from "./upload-media-to-campaign-chat";
import { ViewMedia } from "@/components/social/view-media";
import { useGenerateAIImage } from "@/backend-apis/ai-image/hooks";

// Component to display blog from ScheduledPost (where Python saves it)
function BlogNewsDayContent({ 
  campaignId, 
  day, 
  retryWebhook 
}: { 
  campaignId: string; 
  day: number; 
  retryWebhook: ReturnType<typeof useRetryWebhook>;
}) {
  // Fetch blog from ScheduledPost (where Python saves it)
  const { data: scheduledPostData, isLoading: isLoadingBlog } = useBlogFromScheduledPost(campaignId, day);
  
  // Get blog from ScheduledPost.meta.blog (where Python saves it after steps 1 and 2)
  const blog = scheduledPostData?.blog;
  const step1Completed = scheduledPostData?.step1Completed || false;
  const step2Completed = scheduledPostData?.step2Completed || false;
  const step3Completed = scheduledPostData?.step3Completed || false;
  const step4Completed = scheduledPostData?.step4Completed || false;
  const allStepsComplete = scheduledPostData?.allStepsComplete || false;
  const articleUrl = scheduledPostData?.articleUrl;
  const webhookSent = scheduledPostData?.webhookSent;
  
  // Show blog if steps 1 and 2 are complete (blog exists in ScheduledPost)
  if (!step1Completed || !step2Completed || !blog) {
    return (
      <div className="col-span-2 flex items-center justify-center py-12">
        {isLoadingBlog ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-muted-foreground">Loading blog...</p>
          </div>
        ) : (
          <p className="text-muted-foreground">
            {step1Completed && !step2Completed 
              ? "Step 1 complete. Generating blog (Step 2)..." 
              : !step1Completed 
              ? "Fetching article (Step 1)..." 
              : "No blog generated yet. Click Generate to create it with AI."}
          </p>
        )}
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
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <Markdown>{blog.content || ""}</Markdown>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground flex flex-col gap-1">
            {allStepsComplete && webhookSent !== undefined && (
              <span className={webhookSent ? "text-green-600" : "text-red-600"}>
                {webhookSent ? "✓ Webhook sent" : "✗ Webhook failed"}
              </span>
            )}
            {allStepsComplete && articleUrl && (
              <a 
                href={articleUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:underline text-xs break-all"
              >
                {articleUrl}
              </a>
            )}
            {!allStepsComplete && (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant={step1Completed ? "default" : "outline"} className={step1Completed ? "bg-green-500" : ""}>
                  Step 1 {step1Completed ? "✓" : "..."}
                </Badge>
                <Badge variant={step2Completed ? "default" : "outline"} className={step2Completed ? "bg-green-500" : ""}>
                  Step 2 {step2Completed ? "✓" : "..."}
                </Badge>
                <Badge variant={step3Completed ? "default" : "outline"} className={step3Completed ? "bg-green-500" : ""}>
                  Step 3 {step3Completed ? "✓" : "..."}
                </Badge>
                <Badge variant={step4Completed ? "default" : "outline"} className={step4Completed ? "bg-green-500" : ""}>
                  Step 4 {step4Completed ? "✓" : "..."}
                </Badge>
              </div>
            )}
          </div>
          {allStepsComplete && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const { getBlogNewsMetadataFromCampaign } = await import("@/backend-apis/campaign-planner/blog-news");
                const metadata = await getBlogNewsMetadataFromCampaign(campaignId);
                const finalWebhookUrl = metadata?.webhook || "";
                
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
                  day: day,
                  campaignId: campaignId,
                });
              }}
              loading={retryWebhook.isPending}
              disabled={retryWebhook.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Resend Webhook
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export const PLATFORMS = [
  { key: 'x', label: 'Twitter', icon: <Image src="/x.svg" width={16} height={16} alt="X" className="dark:brightness-0 dark:invert" /> },
  { key: 'facebook', label: 'Facebook', icon: <Image src="/fb.svg" width={16} height={16} alt="Facebook" className="dark:brightness-0 dark:invert" /> },
  { key: 'linkedin', label: 'LinkedIn', icon: <Image src="/linkedin.png" width={16} height={16} alt="LinkedIn" className="dark:brightness-0 dark:invert" /> },
  { key: 'instagram', label: 'Instagram', icon: <Image src="/instagram.svg" width={16} height={16} alt="Instagram" className="dark:brightness-0 dark:invert" /> },
  { key: 'threads', label: 'Threads', icon: <Image src="/threads.svg" width={16} height={16} alt="Threads" className="dark:brightness-0 dark:invert" /> },
  { key: 'reddit', label: 'Reddit', icon: <Image src="/reddit.svg" width={16} height={16} alt="Reddit" className="dark:brightness-0 dark:invert" /> },
  { key: 'tiktok', label: 'TikTok', icon: <Image src="/tiktok.svg" width={16} height={16} alt="TikTok" className="dark:brightness-0 dark:invert" /> }
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

// Platforms that support media upload (same as scheduled posts)
const MEDIA_SUPPORTED_PLATFORMS = ["facebook", "linkedin", "threads"];

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

function CampaignAutoplayOverlay({
  active,
  cursor,
  highlight,
  label,
  onStop,
}: {
  active: boolean;
  cursor: { x: number; y: number };
  highlight: DOMRect | null;
  label: string;
  onStop: () => void;
}) {
  if (!active) return null;

  // Treat an empty label as the "intro" phase (no separate state).
  const isIntro = label === "";
  const rect = highlight
    ? {
        left: highlight.left - 10,
        top: highlight.top - 10,
        width: highlight.width + 20,
        height: highlight.height + 20,
      }
    : null;

  return (
    <>
      {isIntro ? (
        <div className="fixed inset-0 z-[70] bg-black/40 pointer-events-auto" />
      ) : rect ? (
        <svg
          className="fixed inset-0 z-[70] pointer-events-none"
          width="100%"
          height="100%"
        >
          <defs>
            <mask id="campaign-autoplay-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx="10"
                ry="10"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.25)"
            mask="url(#campaign-autoplay-mask)"
          />
        </svg>
      ) : (
        <div className="fixed inset-0 z-[70] bg-black/25 pointer-events-none" />
      )}

      {isIntro ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border px-6 py-5 shadow-lg">
            <div className="text-base sm:text-lg font-semibold">
              Creating your first campaign
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              This can take a few minutes
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-400 mt-4">
              Preparing…
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed z-[80] top-4 left-1/2 -translate-x-1/2 pointer-events-none w-[min(680px,calc(100vw-2rem))]">
          <div className="rounded-full bg-white/95 text-slate-900 border px-4 py-2 shadow-sm">
            <div className="text-xs sm:text-sm font-medium">
              {label ? label : "Preparing…"}
            </div>
          </div>
        </div>
      )}

      {/* Fake cursor */}
      {!isIntro && rect && (
        <div
          className="fixed z-[80] pointer-events-none"
          style={{
            left: `${cursor.x}px`,
            top: `${cursor.y}px`,
            transform: "translate(-50%, -50%)",
            transition: "left 420ms ease, top 420ms ease",
          }}
        >
          <div className="h-3.5 w-3.5 rounded-full bg-blue-600 shadow-lg ring-4 ring-blue-500/25" />
        </div>
      )}

      {/* Stop button */}
      <div className="fixed z-[80] bottom-4 right-4">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onStop}
        >
          Stop demo
        </Button>
      </div>
    </>
  );
}

function CampaignDemoFeatureTour({
  isOpen,
  onClose,
  campaignId,
}: {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | undefined>();
  const [tooltipPlacement, setTooltipPlacement] = useState<"below" | "above">("below");
  const tooltipRef = useRef<HTMLDivElement>(null);

  const steps = useMemo(
    () => [
      {
        key: "auto-post",
        name: "Auto-post",
        description:
          "Turn this on to automatically publish your campaign posts. You’ll set a start date, then choose platforms and a time. NextPostAI will schedule and auto-post for you.",
        selector: `[data-campaign-mini-tour="auto-post"][data-campaign-mini-tour-campaign-id="${campaignId}"]`,
      },
      {
        key: "generate",
        name: "AI Generate",
        description:
          "Use AI Generate to create (or regenerate) all campaign content. It can use credits/coins because it creates posts across days and platforms.",
        selector: `[data-campaign-mini-tour="generate"][data-campaign-mini-tour-campaign-id="${campaignId}"]`,
      },
    ],
    [campaignId]
  );

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setHighlightRect(undefined);
      return;
    }

    const step = steps[currentStep];
    const originalElement = document.querySelector(step.selector) as HTMLElement | null;
    let element: HTMLElement | null = originalElement;

    // If selector hits a wrapper, highlight an inner actionable element when possible.
    if (element) {
      const inner =
        element.querySelector("button") ||
        element.querySelector("[role='switch']") ||
        element;
      element = inner as HTMLElement;
    }

    if (!element) {
      setHighlightRect(undefined);
      return;
    }

    const rect = element.getBoundingClientRect();
    setHighlightRect(rect);

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "center",
    });

    const applyHighlight = () => {
      element.classList.add(
        "ring-4",
        "ring-blue-500",
        "ring-offset-2",
        "z-[60]",
        "relative",
        "rounded",
        "backdrop-blur-0"
      );

      const r = element.getBoundingClientRect();
      const maxTooltipWidth = 360;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 16;
      const actualTooltipWidth = Math.min(
        maxTooltipWidth,
        viewportWidth - padding * 2
      );

      // Prefer placing the dialog BELOW the element.
      // If there's not enough space, fall back ABOVE.
      const estimatedTooltipHeight = 220;
      const gap = 12;

      let placement: "below" | "above" = "below";
      let top = r.bottom + gap;
      if (top + estimatedTooltipHeight > viewportHeight - padding) {
        placement = "above";
        top = r.top - estimatedTooltipHeight - gap;
      }
      if (top < padding) top = padding;
      setTooltipPlacement(placement);

      // Center horizontally under the element, clamped to viewport.
      let left = r.left + r.width / 2;
      const half = actualTooltipWidth / 2;
      if (left + half > viewportWidth - padding) left = viewportWidth - padding - half;
      if (left - half < padding) left = padding + half;

      setPosition({ top, left });
    };

    const timer = setTimeout(applyHighlight, 250);

    return () => {
      clearTimeout(timer);
      element.classList.remove(
        "ring-4",
        "ring-blue-500",
        "ring-offset-2",
        "z-[60]",
        "relative",
        "rounded",
        "backdrop-blur-0"
      );
    };
  }, [currentStep, isOpen, steps]);

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <>
      <svg className="fixed inset-0 z-40 pointer-events-none" width="100%" height="100%">
        <defs>
          <mask id="campaign-feature-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left - 6}
                y={highlightRect.top - 6}
                width={highlightRect.width + 12}
                height={highlightRect.height + 12}
                rx="10"
                ry="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.3)"
          mask="url(#campaign-feature-tour-mask)"
        />
      </svg>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        ref={tooltipRef}
        className="fixed z-[60] w-80 max-w-[calc(100vw-2rem)]"
        style={{
          isolation: "isolate",
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: "translateX(-50%)",
          maxWidth: "calc(100vw - 2rem)",
        }}
      >
        <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-4">
          {/* Arrow points to the highlighted element */}
          {tooltipPlacement === "below" ? (
            <div
              className="absolute -top-2 w-4 h-4 bg-white border-l border-t border-gray-200 rotate-45"
              style={{
                left: "50%",
                transform: "translateX(-50%) rotate(45deg)",
              }}
            />
          ) : (
            <div
              className="absolute -bottom-2 w-4 h-4 bg-white border-r border-b border-gray-200 rotate-45"
              style={{
                left: "50%",
                transform: "translateX(-50%) rotate(45deg)",
              }}
            />
          )}

          <h3 className="text-xl font-semibold">{step.name}</h3>
          <p className="text-base text-gray-600 mt-2 mb-4">{step.description}</p>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {currentStep + 1} of {steps.length}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Skip
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (isLast) onClose();
                  else setCurrentStep((s) => s + 1);
                }}
              >
                {isLast ? "Got it" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function CampaignPlannerPage({ project }: Props) {
  const generate = useGenerateCampaignChat();
  const campaignPlannerMutation = useCampaignPlanner();
  const { id: projectId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
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

  // Autoplay demo (UI-clicked + real generation call)
  const demoRanRef = useRef(false);
  const demoStartPendingRef = useRef(false);
  const demoCancelledRef = useRef(false);
  const demoCampaignNameRef = useRef<string>("");
  const demoCampaignIdRef = useRef<string>("");
  const [demoActive, setDemoActive] = useState(false);
  const [demoCursor, setDemoCursor] = useState<{ x: number; y: number }>({ x: -100, y: -100 });
  const [demoHighlight, setDemoHighlight] = useState<DOMRect | null>(null);
  const [demoLabel, setDemoLabel] = useState<string>("");
  const [showPreDemoMessage, setShowPreDemoMessage] = useState(false); // New state for centered message BEFORE demo
  const [showProjectLocationTour, setShowProjectLocationTour] = useState(false);
  const projectLocationTourShownRef = useRef(false);
  const showCampaignFormRef = useRef(showCampaignForm);

  useEffect(() => {
    showCampaignFormRef.current = showCampaignForm;
  }, [showCampaignForm]);

  useEffect(() => {
    demoCancelledRef.current = false;
    return () => {
      demoCancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    const shouldAutoplay =
      searchParams.get("autoplay") === "1" ||
      searchParams.get("autoplayCampaign") === "1";
    const fromOnboarding = searchParams.get("fromOnboarding") === "1";

    if (!shouldAutoplay) return;
    if (demoRanRef.current) return;
    if (demoStartPendingRef.current) return;
    demoStartPendingRef.current = true;

    const isAutoplayStillRequested = () => {
      if (typeof window === "undefined") return false;
      const params = new URLSearchParams(window.location.search);
      return params.get("autoplay") === "1" || params.get("autoplayCampaign") === "1";
    };

    const paddedRect = (el: Element | null) => {
      if (!el) return null;
      const r = (el as HTMLElement).getBoundingClientRect();
      return new DOMRect(r.left, r.top, r.width, r.height);
    };

    const DEMO = {
      moveMs: 780,
      beforeClickMs: 260,
      afterClickMs: 700,
      betweenStepsMs: 520,
      pollMs: 140,
      typeMs: 70,
    } as const;

    const moveTo = async (el: Element | null, label: string) => {
      if (demoCancelledRef.current) return;
      setDemoLabel(label);
      const rect = paddedRect(el);
      if (rect) {
        setDemoHighlight(rect);
        setDemoCursor({
          x: rect.left + rect.width / 2,
          y: rect.top + Math.min(18, rect.height / 2),
        });
      }
      await sleep(DEMO.moveMs);
    };

    const clickEl = async (el: Element | null, label: string) => {
      if (demoCancelledRef.current) return;
      await moveTo(el, label);
      if (demoCancelledRef.current) return;
      await sleep(DEMO.beforeClickMs);
      (el as HTMLElement | null)?.click?.();
      await sleep(DEMO.afterClickMs);
    };

    const waitFor = async <T,>(fn: () => T | null, timeoutMs = 7000): Promise<T | null> => {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        if (demoCancelledRef.current) return null;
        const v = fn();
        if (v) return v;
        await sleep(DEMO.pollMs);
      }
      return null;
    };

    const waitForBlockersToClose = async (label: string) => {
      setDemoLabel(label);
      setDemoHighlight(null);
      setDemoCursor({ x: -100, y: -100 });
      // Wait indefinitely until blockers are gone (user can hit "Stop demo")
      while (!demoCancelledRef.current && document.querySelector("[data-autoplay-blocker]")) {
        await sleep(200);
      }
      await sleep(250);
    };

    const typeName = async (text: string) => {
      const input = (document.querySelector('[data-campaign-demo="name-input"]') as HTMLInputElement | null);
      if (!input) return;
      await moveTo(input, "Typing campaign name");
      input.focus();
      setName("");
      await sleep(250);
      for (const ch of text) {
        if (demoCancelledRef.current) return;
        setName((prev) => prev + ch);
        await sleep(DEMO.typeMs);
      }
      demoCampaignNameRef.current = text;
      await sleep(350);
    };

    let cancelled = false;
    (async () => {
      console.log('[DEMO] Starting demo flow - waiting for blockers to clear');
      // IMPORTANT: Don't "start" the demo at all until blockers are gone.
      while (!cancelled && !demoCancelledRef.current && document.querySelector("[data-autoplay-blocker]")) {
        await sleep(200);
      }
      if (cancelled || demoCancelledRef.current) return;
      if (!isAutoplayStillRequested()) return;
      if (demoRanRef.current) return;

      console.log('[DEMO] Blockers cleared, marking demo as started');
      demoRanRef.current = true;
      demoStartPendingRef.current = false;

      // Clean the URL and check if we need to do project selection flow
      let shouldShowProjectSelection = false;
      try {
        const url = new URL(window.location.href);
        shouldShowProjectSelection = url.searchParams.get("fromOnboarding") === "1";
        url.searchParams.delete("autoplay");
        url.searchParams.delete("autoplayCampaign");
        url.searchParams.delete("fromOnboarding");
        window.history.replaceState({}, "", url.toString());
      } catch (err) {
        console.error('[DEMO] Error parsing URL:', err);
      }

      // If coming from onboarding, show project selection demo first
      if (shouldShowProjectSelection) {
        console.log('[DEMO] Coming from onboarding, showing project selection demo');
        
        // Show welcome message
        flushSync(() => {
          setShowPreDemoMessage(true);
        });
        
        await sleep(2000);
        
        if (demoCancelledRef.current) return;
        
        // Hide message and start animated demo
        flushSync(() => {
          setShowPreDemoMessage(false);
          setDemoActive(true);
        });
        
        setDemoLabel("Let me show you where your projects are");
        await sleep(800);
        
        if (demoCancelledRef.current) return;
        
        // Step 1: Expand sidebar if collapsed
        console.log('[DEMO] Checking sidebar state');
        const sidebarElement = document.querySelector('[data-sidebar="sidebar"]');
        if (sidebarElement?.getAttribute('data-state') === 'collapsed') {
          const railButton = document.querySelector('[data-sidebar="rail"]') as HTMLElement;
          if (railButton) {
            await clickEl(railButton, "Opening sidebar");
            await sleep(400);
          }
        }
        
        if (demoCancelledRef.current) return;
        
        // Step 2: Click project selector
        console.log('[DEMO] Looking for project selector');
        const projectSelector = await waitFor(
          () => document.querySelector('[data-project-selector="true"]') as HTMLElement | null,
          5000
        );
        
        if (!projectSelector) {
          console.error('[DEMO] Project selector not found');
          setDemoActive(false);
        } else {
          await clickEl(projectSelector, "This is where you switch projects");
          await sleep(1500);
          
          if (demoCancelledRef.current) return;
          
          // Step 3: Show the project in the list (but don't click it, just highlight)
          console.log('[DEMO] Highlighting current project in list');
          const currentProjectButton = await waitFor(
            () => document.querySelector(`[data-project-item="true"][data-project-id="${projectId}"]`) as HTMLElement | null,
            5000
          );
          
          if (currentProjectButton) {
            await moveTo(currentProjectButton, `"${project?.name}" is your current project`);
            await sleep(2000);
            
            if (demoCancelledRef.current) return;
            
            // Close the popover by clicking outside or pressing escape
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
            document.dispatchEvent(escapeEvent);
            await sleep(500);
          }
        }
        
        // Stop the animated demo
        setDemoActive(false);
        setDemoHighlight(null);
        setDemoCursor({ x: -100, y: -100 });
        setDemoLabel("");
        
        await sleep(500);
      }

      // Continue with normal demo flow
      
      // Skip the project location tour for first-time users coming from onboarding
      // since we just showed them the project selector in the animated demo
      if (shouldShowProjectSelection) {
        projectLocationTourShownRef.current = true; // Mark as shown so it doesn't appear
      }

      // NEW: After credit modal closes, show project location tour ONCE
      // Only show if NOT coming from onboarding (since we already showed project selector)
      if (!projectLocationTourShownRef.current) {
        console.log('[DEMO] Showing project location tour');
        projectLocationTourShownRef.current = true;
        setShowProjectLocationTour(true);
        
        // Wait for tour to be dismissed by user (check DOM or wait for state change)
        // We'll poll to check if tour is still open by checking if the component is rendered
        while (!demoCancelledRef.current) {
          await sleep(200);
          // Check if tour dialog is still in DOM
          const tourElement = document.querySelector('[data-tour="project-location"]');
          if (!tourElement) {
            break;
          }
        }
        await sleep(500); // Brief pause after tour closes
        console.log('[DEMO] Project location tour completed');
      }

      if (demoCancelledRef.current) return;

      // Show centered message BEFORE starting demo
      console.log('Setting showPreDemoMessage to true');
      flushSync(() => {
        setShowPreDemoMessage(true);
      });
      await sleep(3500); // Show centered message for 3.5 seconds
      console.log('Hiding pre-demo message, starting actual demo');
      flushSync(() => {
        setShowPreDemoMessage(false);
      });
      
      if (demoCancelledRef.current) return;

      // NOW start the actual demo
      setDemoActive(true);
      setDemoLabel("Starting campaign setup");
      setDemoHighlight(null);
      setDemoCursor({ x: -100, y: -100 });
      
      await sleep(800); // Brief pause before first action
      if (demoCancelledRef.current) return;

      // 1) Click "Plan Campaign"
      if (!showCampaignFormRef.current) {
        const planBtn = await waitFor(() => document.querySelector('[data-campaign-demo="plan-button"]') as HTMLElement | null, 7000);
        await clickEl(planBtn, "Clicking Plan Campaign");
      }
      await sleep(DEMO.betweenStepsMs);

      // 2) Clear platforms first so selection is visible
      setDemoLabel("Resetting selections");
      setSelectedPlatforms([]);
      await sleep(650);

      // 3) Name
      await waitFor(() => document.querySelector('[data-campaign-demo="name-input"]') as HTMLElement | null, 7000);
      await typeName(`${project?.name || "New Project"} Campaign`);
      await sleep(DEMO.betweenStepsMs);

      // 4) Goal (choose the first non Blog News goal)
      const demoGoalId = campaignPlanner.find((g) => g.id !== "blog-news")?.id || campaignPlanner[0]?.id;
      if (demoGoalId) {
        const goalEl = await waitFor(
          () => document.querySelector(`label[data-campaign-demo-goal="${demoGoalId}"]`) as HTMLElement | null,
          7000
        );
        await clickEl(goalEl, "Selecting a goal");
      }
      await sleep(DEMO.betweenStepsMs);

      // 5) Platforms
      const platformKeys = ["facebook", "linkedin"];
      for (const key of platformKeys) {
        const el = await waitFor(
          () => document.querySelector(`[data-campaign-demo-platform="${key}"]`) as HTMLElement | null,
          7000
        );
        await clickEl(el, `Selecting platform: ${key}`);
        await sleep(420);
      }
      await sleep(DEMO.betweenStepsMs);

      // 6) Audience intensity
      const slider = await waitFor(() => document.querySelector('[data-campaign-demo="audience-slider"]') as HTMLElement | null, 7000);
      await moveTo(slider, "Choosing target audience intensity");
      setSelectedTargetAudience(3);
      await sleep(450);
      // Move left (decrease) to Light-Mod
      setSelectedTargetAudience(2);
      await sleep(750);

      // 7) Generate (real call)
      const genBtn = await waitFor(() => document.querySelector('[data-campaign-demo="generate-button"]') as HTMLElement | null, 7000);
      await clickEl(genBtn, "Generating campaign");
      await sleep(550);

      // 8) Confirm dialog (coins confirmation) — click the confirm action
      const dialog = await waitFor(() => document.querySelector('[role="alertdialog"]') as HTMLElement | null, 7000);
      if (dialog) {
        const buttons = Array.from(dialog.querySelectorAll("button"));
        const confirmBtn = buttons[buttons.length - 1] as HTMLElement | undefined;
        if (confirmBtn) {
          await clickEl(confirmBtn, "Confirming generation");
        }
      }

      // If credits/paywall/coins UI appears, pause until it is dismissed.
      if (document.querySelector("[data-autoplay-blocker]")) {
        await waitForBlockersToClose("Waiting for credits screen to close…");
      }

      // Let the user see the "Creating campaign..." state
      await sleep(900);

      // 9) Open the newly created campaign in the list
      const findCampaignRowByName = (campaignName: string) => {
        const rows = Array.from(
          document.querySelectorAll('[data-campaign-demo="campaign-row"]')
        ) as HTMLElement[];
        return (
          rows.find((r) => (r.getAttribute("data-campaign-demo-campaign-name") || "") === campaignName) ||
          null
        );
      };

      const demoCampaignName = demoCampaignNameRef.current || `${project?.name || "New Project"} Campaign`;
      const campaignRow = await waitFor(
        () => findCampaignRowByName(demoCampaignName),
        20000
      );
      if (campaignRow) {
        await clickEl(campaignRow, "Opening your campaign");
        await sleep(700);

        const campaignId = campaignRow.getAttribute("data-campaign-demo-campaign-id") || "";
        if (campaignId) {
          demoCampaignIdRef.current = campaignId;
        }
      }

      // After expanding, the demo is complete
      // Wait for the controls to exist in the DOM to ensure campaign is fully loaded
      await waitFor(
        () =>
          document.querySelector(
            `[data-campaign-mini-tour="auto-post"][data-campaign-mini-tour-campaign-id="${demoCampaignIdRef.current}"]`
          ) as HTMLElement | null,
        10000
      );

      setDemoActive(false);
      setDemoHighlight(null);
      setDemoCursor({ x: -100, y: -100 });
      setDemoLabel("");
      
      // Mark demo campaign as created in database
      if (session?.user?.id) {
        markDemoCampaignCreated(session.user.id).catch(console.error);
      }
      
      console.log('[DEMO] Demo completed successfully');
      return;
    })();
    return () => {
      cancelled = true;
      // If effect is torn down before starting, allow a future run when appropriate.
      if (!demoRanRef.current) {
        demoStartPendingRef.current = false;
      }
    };
  }, [searchParams, router, project?.name, session?.user?.id]);

  const [showPast, setShowPast] = useState(false);

  const [isCampaignStartDateSettingsOpen, setIsCampaignStartDateSettingsOpen] = useState<string[]>([]);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState<Record<string, boolean>>({});
  const [isPlatformSelectorOpen, setIsPlatformSelectorOpen] = useState<Record<string, boolean>>({});
  const [selectedPlatformsForAutoPost, setSelectedPlatformsForAutoPost] = useState<Record<string, string[]>>({});
  const [campaignTimezones, setCampaignTimezones] = useState<Record<string, string>>({});
  const [showOldCampaigns, setShowOldCampaigns] = useState(false);
  const scheduleCampaignPosts = useScheduleCampaignPosts();
  const scheduleCampaignTasks = useScheduleCampaignTasks();
  const generateBlogNews = useGenerateBlogNewsContent();
  const retryWebhook = useRetryWebhook();

  // Load only current campaign metadata initially (without chats) for faster initial load
  const campaignPlannerData = useGetCampaignPlanner({
    projectId: projectId as string,
    loadChats: false, // Start with metadata only
    limit: 3, // Load latest 3 current campaigns metadata
  });

  // Load old campaigns only when "Show older campaigns" button is clicked
  const oldCampaignsData = useGetOldCampaigns(
    projectId as string,
    showOldCampaigns // Only load when showOldCampaigns is true
  );

  // Track loaded chats for each campaign
  const [loadedChats, setLoadedChats] = useState<Record<string, any[]>>({});
  const [loadingChats, setLoadingChats] = useState<Set<string>>(new Set());

  // Clear state and cancel queries when project changes (like a refresh)
  // This ensures we start fresh when switching projects
  useEffect(() => {
    // Cancel all pending campaign planner queries for the previous project
    queryClient.cancelQueries({
      queryKey: ["campaignPlanner"],
      exact: false,
    });
    
    // Clear all campaign planner queries from cache
    queryClient.removeQueries({
      queryKey: ["campaignPlanner"],
      exact: false,
    });
    
    // Clear component state
    setLoadedChats({});
    setLoadingChats(new Set());
    setOpenCampaigns({});
    setShowOldCampaigns(false);
    
    console.log(`[CampaignPlannerPage] Cleared all queries and state for project switch to: ${projectId}`);
  }, [projectId, queryClient]);

  // Load chats when campaigns are opened
  useEffect(() => {
    // Don't try to load chats if campaign data hasn't loaded yet
    if (!campaignPlannerData.data) return;

    const loadChatsForCampaign = async (campaignId: string) => {
      // Skip if already loaded or loading
      if (loadedChats[campaignId] || loadingChats.has(campaignId)) {
        return;
      }

      // Verify campaign exists in current project before loading chats
      const allCampaignIds = new Set(
        (campaignPlannerData.data.chatsGroupedByCampaign || []).map((c: { id: string }) => c.id)
      );
      if (!allCampaignIds.has(campaignId)) {
        // Campaign doesn't exist in current project, remove from openCampaigns
        setOpenCampaigns(prev => {
          const next = { ...prev };
          delete next[campaignId];
          return next;
        });
        return;
      }

      setLoadingChats(prev => new Set(prev).add(campaignId));
      try {
        const { getCampaignChats } = await import("@/backend-apis/campaign-planner/index");
        const result = await getCampaignChats(campaignId);
        if (result) {
          setLoadedChats(prev => ({
            ...prev,
            [campaignId]: result.chats,
          }));
        }
      } catch (error) {
        console.error(`Failed to load chats for campaign ${campaignId}:`, error);
      } finally {
        setLoadingChats(prev => {
          const next = new Set(prev);
          next.delete(campaignId);
          return next;
        });
      }
    };

    // Load chats for all opened campaigns
    Object.keys(openCampaigns).forEach(campaignId => {
      if (openCampaigns[campaignId] && !loadedChats[campaignId]) {
        loadChatsForCampaign(campaignId);
      }
    });
  }, [openCampaigns, loadedChats, loadingChats, campaignPlannerData.data]);

  // Merge loaded chats and old campaigns into campaign data
  const mergedCampaignData = useMemo(() => {
    const currentCampaigns = campaignPlannerData.data?.chatsGroupedByCampaign || [];
    const oldCampaigns = showOldCampaigns && oldCampaignsData.data?.chatsGroupedByCampaign 
      ? oldCampaignsData.data.chatsGroupedByCampaign 
      : [];

    // Combine current and old campaigns
    const allCampaigns = [...currentCampaigns, ...oldCampaigns];

    // Remove duplicates (in case a campaign appears in both)
    const uniqueCampaigns = Array.from(
      new Map(allCampaigns.map(campaign => [campaign.id, campaign])).values()
    );

    // Sort by updatedAt descending
    // Handle dates that might be strings (from API) or Date objects
    uniqueCampaigns.sort((a, b) => {
      const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
      const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
      return bTime - aTime;
    });

    return {
      chatsGroupedByCampaign: uniqueCampaigns.map(campaign => {
        // If chats are loaded for this campaign, use them
        if (loadedChats[campaign.id]) {
          return {
            ...campaign,
            chats: loadedChats[campaign.id],
          };
        }
        // Otherwise return campaign as-is (may have empty chats array from metadata)
        return campaign;
      }),
    };
  }, [campaignPlannerData.data, oldCampaignsData.data, showOldCampaigns, loadedChats]);

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
      // Use selected platforms for all campaign types
      const { data: d } = await campaignPlannerMutation.mutateAsync({
        projectId: projectId as string,
        campaignName: name,
        plan,
        platforms: selectedPlatforms,
        // Pass Blog News metadata if it's a Blog News campaign
        ...(selectedGoal === "blog-news" ? {
          blogNewsMetadata: {
            topics,
            angles: selectedAngles,
            webhook: webhook.trim(), // Trim whitespace but preserve the exact URL
            platforms: selectedPlatforms, // Include platforms in metadata
            targetAudience: intensityPlan.targetAudience || "Moderate",
            productRelated,
          }
        } : {})
      });

      // Metadata is stored in database, no need to store in local state

      // Refetch campaign data to show the new campaign
      await campaignPlannerData.refetch();
      // Clear loaded chats cache since campaign data has changed
      setLoadedChats({});

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
      // Clear loaded chats cache for this campaign since it was updated
      if (chatLoading) {
        setLoadedChats(prev => {
          const next = { ...prev };
          delete next[chatLoading.campaignId];
          return next;
        });
      }
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
      // Clear loaded chats cache for deleted campaign
      setLoadedChats(prev => {
        const next = { ...prev };
        delete next[campaignId];
        return next;
      });
      queryClient.invalidateQueries({
        queryKey: ["campaignPlanner", projectId],
      });
      await campaignPlannerData.refetch();
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

  //Open all campaigns that are saved in memory, but only for campaigns in the current project
  useEffect(() => {
    // Wait for campaign data to load before trying to restore opened campaigns
    if (!campaignPlannerData.data) return;
    
    const openedCampaigns = localStorage.getItem("openedCampaigns");
    if (openedCampaigns) {
      const openedCampaignsArray = JSON.parse(openedCampaigns) as Record<string, boolean>;
      // Filter to only include campaigns that exist in the current project
      const currentCampaignIds = new Set(
        campaignPlannerData.data.chatsGroupedByCampaign?.map((c: { id: string }) => c.id) || []
      );
      const filteredOpenedCampaigns: Record<string, boolean> = {};
      Object.keys(openedCampaignsArray).forEach(campaignId => {
        if (currentCampaignIds.has(campaignId) && openedCampaignsArray[campaignId]) {
          filteredOpenedCampaigns[campaignId] = true;
        }
      });
      if (Object.keys(filteredOpenedCampaigns).length > 0) {
        setOpenCampaigns(filteredOpenedCampaigns);
      }
    }
  }, [campaignPlannerData.data])
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
  const [editedMedia, setEditedMedia] = useState<Record<string, string>>({});
  const [editedMediaPreview, setEditedMediaPreview] = useState<Record<string, string>>({}); // Preview URLs for display
  const editContent = useEditChatContent();
  const generateAIImage = useGenerateAIImage();
  const projectPlaceholders = useMemo(() => getProjectPlaceholders(project), [project]);
  const handleSave = async (campaignId: string, day: number, platform: string, scheduledPostId?: string) => {
    // You can handle saving here
    console.log("Saving for:", platform, "with content:", editedContent[platform], "media:", editedMedia[platform], "scheduledPostId:", scheduledPostId);
    await editContent.mutateAsync({
      campaignId,
      day,
      platform,
      content: editedContent[platform],
      media: editedMedia[platform],
      scheduledPostId
    })
      .then(() => toast.success(`Content edited for ${platform}`));
    setEditingPlatform(null);
    setEditedMedia({});
    setEditedMediaPreview({});
  };

  return (
    <div className="flex flex-col gap-2 items-center justify-center">
      {/* Pre-demo centered message - shows BEFORE demo starts */}
      {showPreDemoMessage && (
        <>
          <div className="fixed inset-0 z-[70] bg-black/40 pointer-events-auto" />
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border px-6 py-5 shadow-lg">
              <div className="text-base sm:text-lg font-semibold">
                Creating your first campaign
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                This can take a few minutes
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-400 mt-4">
                Preparing…
              </div>
            </div>
          </div>
        </>
      )}
      
      <CampaignAutoplayOverlay
        active={demoActive}
        cursor={demoCursor}
        highlight={demoHighlight}
        label={demoLabel}
        onStop={() => {
          demoCancelledRef.current = true;
          setDemoActive(false);
          setDemoHighlight(null);
          setDemoCursor({ x: -100, y: -100 });
          setDemoLabel("");
          setShowPreDemoMessage(false);
          setShowProjectLocationTour(false);
        }}
      />
      <ProjectLocationTour
        isOpen={showProjectLocationTour}
        onClose={() => setShowProjectLocationTour(false)}
        projectName={project?.name || "your project"}
      />
      {!showCampaignForm && (
        <Button 
          size={"xl"} 
          className={cn(
            "z-50 shadow-lg",
            // Mobile/extra small: fixed position, small button in right corner
            "fixed bottom-4 right-4 w-auto min-w-[100px]",
            // Medium and larger screens: full width in body
            "md:static md:w-full md:mt-5 md:right-auto md:bottom-auto",
            // Fixed blue color that doesn't change with dark mode (like Add Project button)
            "bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors",
            !mergedCampaignData?.chatsGroupedByCampaign?.length 
              ? "" 
              : ""
          )} 
          data-campaign-demo="plan-button"
          onClick={() => setShowCampaignForm(true)}
        >
          Plan Campaign
        </Button>
      )}

      {showCampaignForm && (
        <div className="w-full max-w-2xl bg-card border border-border p-6 rounded-2xl shadow-md">
          <div className="space-y-5">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold mb-2 text-foreground">Campaign Name:</h2>
              <Input data-campaign-demo="name-input" type="text" name="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <h2 className="text-xl font-semibold mb-2 text-foreground">Select a goal:</h2>
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
                  <Label data-campaign-demo-goal={goal.id} htmlFor={goal.id}>{goal.goal}</Label>
                </div>
              ))}
            </RadioGroup>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold mb-2 text-foreground">Select Platforms:</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PLATFORMS.map((p) => (
                  <label
                    key={p.key}
                    data-campaign-demo-platform={p.key}
                    htmlFor={`select-${p.key}`}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-3 cursor-pointer transition-colors",
                      selectedPlatforms.includes(p.key) 
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-400" 
                        : "hover:border-slate-300 dark:hover:border-slate-600 border-border bg-background"
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

            {selectedGoal === "blog-news" && (
              <>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold mb-2 text-foreground">Topic:</h2>
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
                  <h2 className="text-xl font-semibold mb-2 text-foreground">Angles:</h2>
                  <div className="border border-border rounded-lg p-4 flex flex-wrap gap-3 bg-muted/30">
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
                    <h2 className="text-xl font-semibold mb-2 text-foreground">Webhook:</h2>
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
    "tags": ["tag1", "tag2"]
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}`}
                            </pre>
                            <p className="font-semibold mt-2">Response Format (Expected):</p>
                            <pre className="bg-background/50 p-2 rounded text-[10px] overflow-x-auto">
{`{
  "status": 201,
  "data": {
    "id": "...",
    "slug": "...",
    "title": "...",
    "articleUrl": "https://yoursite.com/ideas/article-slug",
    ...
  },
  "message": "Idea created and published successfully"
}`}
                            </pre>
                            <p className="text-xs mt-2">The articleUrl from data.articleUrl in your response will be saved and displayed in the campaign.</p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    type="text"
                    value={webhook}
                    onChange={(e) => {
                      // Store the raw value as entered by user
                      setWebhook(e.target.value);
                    }}
                    placeholder="https://example.com/api/webhook/receive"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Target Audience:</h2>
              <div className="overflow-x-auto pt-3 pb-2 w-full">
                <Slider
                  data-campaign-demo="audience-slider"
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              loading={campaignPlannerMutation.isPending}
              data-campaign-demo="generate-button"
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
            {!!mergedCampaignData?.chatsGroupedByCampaign?.length && (
              <div className="mb-2">
                <h2 className="text-base font-bold">Active Campaigns:</h2>
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
              const allCampaigns = mergedCampaignData?.chatsGroupedByCampaign || [];
              const filteredCampaigns = allCampaigns.filter((campaign) => {
                // If showing old campaigns, show everything
                if (showOldCampaigns) return true;

                // If campaign has no start date, show it (it's not scheduled yet)
                if (!campaign.startDate) return true;

                // Calculate if campaign has any future dates based on startDate and totalDays
                const baseDate = new Date(campaign.startDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Get totalDays from campaign (available from campaign table, no need to query chats)
                // Fallback to chatCount for backward compatibility, then to chats length
                const totalDays = (campaign as any).totalDays || (campaign as any).chatCount || (campaign.chats?.length || 0);
                
                if (totalDays === 0) {
                  // No days yet, show it
                  return true;
                }

                // Calculate the last day of the campaign
                const lastDayOfCampaign = new Date(baseDate);
                lastDayOfCampaign.setDate(lastDayOfCampaign.getDate() + (totalDays - 1));
                lastDayOfCampaign.setHours(0, 0, 0, 0);

                // Campaign is "current" if the last day is today or in the future
                // Campaign is "old" if the last day is in the past
                const isCurrentCampaign = lastDayOfCampaign >= today;

                return isCurrentCampaign;
              });

              // Show button if there are campaigns but all are hidden (old campaigns)
              if (allCampaigns.length > 0 && filteredCampaigns.length === 0 && !showOldCampaigns) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowOldCampaigns(true)}
                      className="text-xs text-muted-foreground"
                    >
                      Show older campaigns
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
                const firstUpcomingTimeline = campaign.chats.find((timeline: { day: number }) => {
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
                const passedDays = campaign.chats.filter((chat: { day: number }) => {
                  const chatDate = new Date(baseDate.getTime() + (chat.day - 1) * 86400000);
                  chatDate.setHours(0, 0, 0, 0);
                  return chatDate < today;
                }).length;
                // const loadingProgress = totalChats > 0 ? (loadedChats / totalChats) * 100 : 0;
                const realProgress = totalChats > 0 ? (passedDays / totalChats) * 100 : 0;


                return (
                  <div key={campaign.id} className="border rounded-lg pb-5 bg-muted/50 dark:bg-muted/30 shadow-sm hover:shadow-md transition-shadow border-border/50 dark:border-border/70 backdrop-blur-sm">

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
                        data-campaign-demo="campaign-row"
                        data-campaign-demo-campaign-id={campaign.id}
                        data-campaign-demo-campaign-name={campaign.name}
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
                          <div className="px-4 py-0 flex flex-col justify-center gap-3">
                            <div className="hidden sm:flex gap-2 justify-end items-center">

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
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-fit text-xs !z-0"
                                      aria-label="Change campaign start date"
                                    >
                                      <Calendar />
                                      <span className="sr-only">Change campaign start date</span>
                                    </Button>
                                  }
                                  disabled={updateCampaignData.isPending}
                                />
                              </div>
                              <div
                                data-campaign-mini-tour="auto-post"
                                data-campaign-mini-tour-campaign-id={campaign.id}
                                onClick={(e) => e.stopPropagation()}
                                className="z-30 flex items-center gap-2 border rounded-md px-3 py-1.5"
                              >
                                <Switch
                                  checked={campaign.autoPostEnabled || false}
                                  onCheckedChange={async (checked) => {
                                    if (checked && !campaign.startDate) {
                                      toast.error("Please set a start date first");
                                      return;
                                    }
                                    if (checked) {
                                      // Initialize selected platforms if not set
                                      if (!selectedPlatformsForAutoPost[campaign.id]) {
                                        setSelectedPlatformsForAutoPost({
                                          ...selectedPlatformsForAutoPost,
                                          [campaign.id]: campaign.autoPostPlatforms && campaign.autoPostPlatforms.length > 0 
                                            ? campaign.autoPostPlatforms 
                                            : campaign.platforms,
                                        });
                                      }
                                      // Open platform selector first (for both regular and Blog News campaigns)
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
                                      // When editing, open platform selector first
                                      setIsPlatformSelectorOpen({ ...isPlatformSelectorOpen, [campaign.id]: true });
                                    }}
                                  >
                                    <Clock className="h-3 w-3 mr-1" />
                                    {campaign.autoPostTime}
                                  </Button>
                                )}
                              </div>
                              {/* Platform Selection Dialog */}
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
                                      {campaign.goal === "Blog News" 
                                        ? "Choose which platforms you want to post the blog link to after the blog is generated"
                                        : "Choose which platforms you want to auto-post for this campaign"}
                                    </DialogDescription>
                                  </DialogHeader>
                                    <div className="py-4 space-y-3">
                                      {campaign.platforms.map((platform: string) => {
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
                                                className="dark:brightness-0 dark:invert"
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
                              <TimePickerDialog
                                value={campaign.autoPostTime || undefined}
                                timezone={(campaign.blogNewsMetadata as any)?.timezone || campaignTimezones[campaign.id] || "America/New_York"}
                                open={isTimePickerOpen[campaign.id] || false}
                                onOpenChange={(open) => {
                                  setIsTimePickerOpen({ ...isTimePickerOpen, [campaign.id]: open });
                                }}
                                onTimezoneChange={(tz) => {
                                  setCampaignTimezones({ ...campaignTimezones, [campaign.id]: tz });
                                }}
                                onConfirm={async (time, timezone) => {
                                  if (!time) return;
                                  if (!campaign.startDate) {
                                    toast.error("Please set a start date first");
                                    return;
                                  }
                                  
                                  const selectedTimezone = timezone || campaignTimezones[campaign.id] || "America/New_York";
                                  
                                  // Handle Blog News campaigns differently
                                  if (campaign.goal === "Blog News") {
                                    // Get platforms from campaign metadata or use selected platforms
                                    const blogNewsMetadata = campaign.blogNewsMetadata as { 
                                      topics?: string[]; 
                                      angles?: string[]; 
                                      webhook?: string; 
                                      platforms?: string[]; 
                                      timezone?: string;
                                      targetAudience?: string;
                                      productRelated?: boolean;
                                    } | null;
                                    const platformsToUse = selectedPlatformsForAutoPost[campaign.id] || 
                                                          blogNewsMetadata?.platforms || 
                                                          campaign.platforms || 
                                                          [];
                                    
                                    if (platformsToUse.length === 0) {
                                      toast.error("Please select at least one platform");
                                      setIsPlatformSelectorOpen({ ...isPlatformSelectorOpen, [campaign.id]: true });
                                      return;
                                    }

                                    // Save the time, timezone, and enable auto-post
                                    // Ensure we include all required fields from existing metadata
                                    // Note: webhook should be read from existing metadata, not from state
                                    // (state is only for new campaigns)
                                    await updateCampaignData.mutateAsync({
                                      id: campaign.id,
                                      autoPostEnabled: true,
                                      autoPostTime: time,
                                      autoPostPlatforms: platformsToUse,
                                      blogNewsMetadata: {
                                        topics: blogNewsMetadata?.topics || [],
                                        angles: blogNewsMetadata?.angles || [],
                                        webhook: blogNewsMetadata?.webhook || "", // Use existing webhook from metadata
                                        platforms: platformsToUse,
                                        timezone: selectedTimezone,
                                      },
                                    });
                                    // Schedule tasks instead of posts
                                    scheduleCampaignTasks.mutate({
                                      campaignId: campaign.id,
                                      projectId: campaign.projectId,
                                      autoPostTime: time,
                                      timezone: selectedTimezone,
                                      platforms: platformsToUse,
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
                                      timezone: selectedTimezone,
                                      platforms: platformsToUse,
                                    });
                                  }
                                }}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                data-campaign-mini-tour="generate"
                                data-campaign-mini-tour-campaign-id={campaign.id}
                                aria-label="AI generate campaign content"
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
                                        // Clear loaded chats cache for this campaign
                                        setLoadedChats(prev => {
                                          const next = { ...prev };
                                          delete next[campaign.id];
                                          return next;
                                        });
                                      }
                                    }
                                  } catch { }
                                }}
                              >
                                <Sparkles className="h-4 w-4 mr-1" />
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

                            {campaign.chats.map((timeline: any, id: number) => {
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
                                              <p className={`block md:hidden font-medium ${isHighlighted ? 'text-primary' : 'text-gray-600'}`}>
                                                {futureDate.toLocaleDateString("en-US", {
                                                  month: "short",
                                                  day: "numeric",
                                                })}:
                                              </p>
                                              <p>{timeline.title || (campaign.goal === "Blog News" ? `Blog for ${futureDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : '')}</p>
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
                                              <Sparkles className="h-4 w-4" />
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
                                                    <Sparkles className="h-4 w-4" />
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
                                          <BlogNewsDayContent 
                                            campaignId={campaign.id}
                                            day={timeline.day}
                                            retryWebhook={retryWebhook}
                                          />
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
                                            {timeline.contents && (Object.entries(timeline.contents) as ["x" | "facebook" | "linkedin" | "threads" | "reddit", string][]).map(([platform, text]) => {
                                              const resolvedText = applyPlaceholders(text, projectPlaceholders);
                                              const scheduledInfo = (timeline.scheduledPlatforms as Record<string, { scheduledPostId: string; scheduledDate: Date; status: string }>)?.[platform];
                                              const isScheduled = !!scheduledInfo;
                                              return (
                                          <Card key={platform} className={cn("rounded-lg border mb-5", isScheduled && "border-green-500/50")}>
                                            <div className="flex flex-col gap-0">
                                              <CardHeader className="flex flex-col gap-2">
                                                <div className="flex flex-wrap items-center gap-1">
                                                  <Button variant="ghost" size="icon"
                                                    onClick={() => {
                                                      setEditedContent({ ...editedContent, [platform]: text });
                                                      setEditingPlatform(platform);
                                                    }}
                                                  >
                                                    <Pencil />
                                                  </Button>
                                                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(resolvedText, platform)}>
                                                    <CopyIcon />
                                                  </Button>
                                                  <PostToWall
                                                    content={resolvedText}
                                                    platform={platform}
                                                    projectId={project.id}
                                                    prompt=""
                                                  />
                                                  {(() => {
                                                    const platformUrl = project.platformUrls?.[platform as keyof typeof project.platformUrls];
                                                    const redditFallbackUrl = timeline.subreddit ? `https://www.reddit.com/r/${timeline.subreddit}` : null;
                                                    const finalUrl = platform === "reddit" ? (platformUrl || redditFallbackUrl) : platformUrl;
                                                    if (!finalUrl) return null;
                                                    return (
                                                      <Button variant="ghost" size="icon" asChild>
                                                        <Link href={finalUrl} target="_blank" rel="noopener noreferrer">
                                                          <Image src={ICONS[platform]} alt={platform} width={16} height={16} className="dark:brightness-0 dark:invert" />
                                                        </Link>
                                                      </Button>
                                                    );
                                                  })()}
                                                  <SavePlatformCard
                                                    platform={platform}
                                                    projectId={project.id}
                                                    timelineDay={timeline.day}
                                                  />
                                                  <AutoPost platform={platform} content={resolvedText} projectId={project.id} />
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
                                                <div className="flex items-center gap-2">
                                                  <CardTitle>{platform.charAt(0).toUpperCase() + platform.slice(1)}</CardTitle>
                                                  {isScheduled && (
                                                    <Badge variant="outline" className="text-xs text-green-600 border-green-500/50 whitespace-nowrap">
                                                      <Clock className="w-3 h-3 mr-1" />
                                                      Scheduled
                                                    </Badge>
                                                  )}
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
                                                  {MEDIA_SUPPORTED_PLATFORMS.includes(platform) && (
                                                    <div className="flex items-center gap-2">
                                                      <UploadMediaToCampaignChat
                                                        campaignId={campaign.id}
                                                        day={timeline.day}
                                                        platform={platform}
                                                        media={editedMedia[platform] || (timeline.media as Record<string, string>)?.[platform]}
                                                        mediaPreviewUrl={editedMediaPreview[platform]}
                                                        onMediaUploaded={(key) => {
                                                          setEditedMedia({ ...editedMedia, [platform]: key });
                                                          // Clear any AI-generated preview when manually uploading
                                                          setEditedMediaPreview({ ...editedMediaPreview, [platform]: "" });
                                                        }}
                                                      />
                                                      <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={generateAIImage.isPending}
                                                        loading={generateAIImage.isPending}
                                                        onClick={async () => {
                                                          if (!session?.user?.id) {
                                                            toast.error("Please log in to generate images");
                                                            return;
                                                          }
                                                          const contentToUse = editedContent[platform] || text;
                                                          if (!contentToUse) {
                                                            toast.error("No content to generate image from");
                                                            return;
                                                          }
                                                          const result = await generateAIImage.mutateAsync({
                                                            userId: session.user.id,
                                                            content: contentToUse,
                                                            campaignId: campaign.id,
                                                            day: timeline.day,
                                                            platform,
                                                          });
                                                          if (result.success && result.mediaKey) {
                                                            setEditedMedia({ ...editedMedia, [platform]: result.mediaKey });
                                                            if (result.previewUrl) {
                                                              setEditedMediaPreview({ ...editedMediaPreview, [platform]: result.previewUrl });
                                                            }
                                                          }
                                                        }}
                                                        title="Generate AI Image (5 credits)"
                                                      >
                                                        <Wand2 className="h-4 w-4" />
                                                      </Button>
                                                    </div>
                                                  )}
                                                  <div className="flex gap-2 justify-end">
                                                    <Button variant="secondary" size="sm" onClick={() => { setEditingPlatform(null); setEditedMedia({}); setEditedMediaPreview({}); }}>
                                                      Cancel
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleSave(campaign.id, timeline.day, platform, scheduledInfo?.scheduledPostId)} loading={editContent.isPending}>
                                                      Save
                                                    </Button>
                                                  </div>
                                                </div>
                                              ) : (
                                                <>
                                                  <Markdown>
                                                    {resolvedText
                                                      .split("\n")
                                                      .map(line => line.trim())
                                                      .filter(line => line.length > 0)
                                                      .join("\n\n")}
                                                  </Markdown>
                                                  {MEDIA_SUPPORTED_PLATFORMS.includes(platform) && (timeline.media as Record<string, string>)?.[platform] && (
                                                    <div className="mt-4">
                                                      <ViewMedia post={{ media: (timeline.media as Record<string, string>)[platform] }} showMedia />
                                                    </div>
                                                  )}
                                                </>
                                              )}
                                            </CardContent>

                                          </Card>
                                              );
                                            })}
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-fit text-xs"
                                  aria-label="Change campaign start date"
                                >
                                  <Calendar />
                                  <span className="sr-only">Change campaign start date</span>
                                </Button>
                              }
                              disabled={updateCampaignData.isPending}
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
                            <Sparkles className="h-4 w-4 mr-1" />
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                );
                  })}
                  {/* Show/Hide old campaigns button at bottom center */}
                  {(() => {
                    // Check if old campaigns exist from metadata or loaded data
                    const hasOldCampaignsFromMetadata = (campaignPlannerData.data as any)?.hasOldCampaigns ?? false;
                    const oldCampaignsCount = oldCampaignsData.data?.chatsGroupedByCampaign?.length || 0;
                    const hasOldCampaignsFromData = oldCampaignsCount > 0;
                    
                    // Only show button when old campaigns actually exist
                    // Check metadata first (from getCampaignPlannerMetadata), then loaded data
                    const hasOldCampaigns = hasOldCampaignsFromMetadata || hasOldCampaignsFromData;
                    
                    // Debug logging (remove in production if needed)
                    if (process.env.NODE_ENV === 'development') {
                      console.log('[CampaignPlanner] Show older campaigns button check:', {
                        hasOldCampaignsFromMetadata,
                        hasOldCampaignsFromData,
                        hasOldCampaigns,
                        showOldCampaigns,
                        oldCampaignsCount,
                        campaignPlannerDataExists: !!campaignPlannerData.data,
                        campaignPlannerDataHasOldCampaigns: (campaignPlannerData.data as any)?.hasOldCampaigns,
                      });
                    }
                    
                    // Only show button when:
                    // 1. Older campaigns are currently shown (so user can hide them), OR
                    // 2. Old campaigns exist (confirmed from metadata or loaded data)
                    // Do NOT show by default - only show when old campaigns are confirmed to exist
                    if (showOldCampaigns || hasOldCampaigns) {
                      return (
                        <div className="flex justify-center mt-6">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowOldCampaigns(!showOldCampaigns)}
                            className="text-xs text-muted-foreground"
                            disabled={showOldCampaigns && oldCampaignsData.isLoading}
                          >
                            {showOldCampaigns && oldCampaignsData.isLoading ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Loading...
                              </>
                            ) : showOldCampaigns ? (
                              "Hide older campaigns"
                            ) : (
                              "Show older campaigns"
                            )}
                          </Button>
                        </div>
                      );
                    }
                    return null;
                  })()}
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