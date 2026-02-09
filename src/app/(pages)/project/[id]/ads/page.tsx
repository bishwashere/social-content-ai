"use client";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, RefreshCw, Loader2, LayoutGrid, ImageIcon, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ProjectToolsStepByStep, type AdCreative } from "../_components/project-tools-stepbystep";
import { cn } from "@/lib/cn";
import { confirm } from "@/components/ui/alert-dialog";
import { useSession } from "@/backend-apis/auth/hooks";
import { usePricingModal } from "@/providers/pricing-modal-provider";

const ALL_ANGLES_KEY = "__all__";

const CREDITS_PER_AD_DISCOVERY = 2;
const CREDITS_PER_IMAGE = 5;

export default function ChatPage() {
    const { id } = useParams() as { id: string };
    const [generatedAds, setGeneratedAds] = useState<AdCreative[]>([]);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [selectedAngle, setSelectedAngle] = useState<string>(ALL_ANGLES_KEY);
    const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);
    const [expandedImageDetails, setExpandedImageDetails] = useState<Set<string>>(new Set());
    const [showQuestionnaire, setShowQuestionnaire] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { data: session } = useSession();
    const { handleCoinsFinished } = usePricingModal();

    const fetchAds = async () => {
        if (!id) return;
        try {
            const response = await fetch(`/api/brand-discovery?projectId=${id}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch brand discovery");
            }

            const data = await response.json();
            const adCreatives = data.adCreatives as AdCreative[];
            setGeneratedAds(adCreatives);
        } catch (error) {
            console.error("Error fetching ads:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateImage = async (adCreativeId: string) => {
        const userCoins = session?.user?.remainingChatGenerations || 0;
        if (userCoins < CREDITS_PER_IMAGE) {
            toast.error(`You need ${CREDITS_PER_IMAGE} credits to generate an ad image. You have ${userCoins} credits.`);
            handleCoinsFinished();
            return;
        }

        const yes = await confirm({
            title: "Generate ad image?",
            description: `This will use ${CREDITS_PER_IMAGE} credits. You have ${userCoins} credits remaining.`,
        });
        if (!yes) return;

        setGeneratingImageFor(adCreativeId);
        try {
            const response = await fetch("/api/ad-creative/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ adCreativeId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.error?.includes("credits") || errorData.error?.includes("need")) {
                    handleCoinsFinished();
                }
                throw new Error(errorData.error || "Failed to generate image");
            }

            const data = await response.json();

            setGeneratedAds((prev) =>
                prev.map((ad) =>
                    ad.id === adCreativeId
                        ? { ...ad, imageKey: data.imageKey, imageUrl: data.imageUrl }
                        : ad
                )
            );

            toast.success("Image generated!", {
                description: "Ad image has been created and saved.",
            });
        } catch (error: any) {
            console.error("Error generating image:", error);
            toast.error("Error", {
                description: error.message || "Failed to generate ad image. Please try again.",
            });
        } finally {
            setGeneratingImageFor(null);
        }
    };

    const handleRegenerateAds = async () => {
        if (!id) return;

        const userCoins = session?.user?.remainingChatGenerations || 0;
        if (userCoins < CREDITS_PER_AD_DISCOVERY) {
            toast.error(`You need ${CREDITS_PER_AD_DISCOVERY} credits to regenerate ad creatives. You have ${userCoins} credits.`);
            handleCoinsFinished();
            return;
        }

        const yes = await confirm({
            title: "Regenerate all ad creatives?",
            description: `This will use ${CREDITS_PER_AD_DISCOVERY} credits. You have ${userCoins} credits remaining.`,
        });
        if (!yes) return;

        setIsRegenerating(true);
        try {
            const response = await fetch("/api/brand-discovery", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId: id }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.error?.includes("credits") || errorData.error?.includes("need")) {
                    handleCoinsFinished();
                }
                throw new Error(errorData.error || "Failed to regenerate ads");
            }

            const data = await response.json();
            setGeneratedAds(data.adCreatives);
            setSelectedAngle(ALL_ANGLES_KEY);
            toast.success("Success!", {
                description: `Regenerated ${data.adCreatives.length} ad creatives from your saved answers.`,
            });
        } catch (error: any) {
            console.error("Error regenerating ads:", error);
            toast.error("Error", {
                description: error.message || "Failed to regenerate ad creatives. Please try again.",
            });
        } finally {
            setIsRegenerating(false);
        }
    };

    useEffect(() => {
        fetchAds();
    }, []);

    const hasAds = generatedAds.length > 0;

    // Build unique angles list from the ads, preserving order
    const angles = useMemo(() => {
        const seen = new Set<string>();
        const result: string[] = [];
        for (const ad of generatedAds) {
            if (!seen.has(ad.angle)) {
                seen.add(ad.angle);
                result.push(ad.angle);
            }
        }
        return result;
    }, [generatedAds]);

    // Filter ads by selected angle
    const filteredAds = useMemo(() => {
        if (selectedAngle === ALL_ANGLES_KEY) return generatedAds;
        return generatedAds.filter((ad) => ad.angle === selectedAngle);
    }, [generatedAds, selectedAngle]);

    // Count ads per angle
    const angleCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const ad of generatedAds) {
            counts[ad.angle] = (counts[ad.angle] || 0) + 1;
        }
        return counts;
    }, [generatedAds]);

    // Show questionnaire inline if no ads and not loading, or if user chose "Redo Questions"
    if (!isLoading && (!hasAds || showQuestionnaire)) {
        return (
            <div className="flex-grow max-w-7xl 2xl:max-w-[90%] mx-auto justify-center px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20">
                {/* Show back button only if they have existing ads (redo mode) */}
                {hasAds && showQuestionnaire && (
                    <div className="mb-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowQuestionnaire(false)}
                            className="text-muted-foreground hover:text-foreground gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Ads
                        </Button>
                    </div>
                )}
                <ProjectToolsStepByStep
                    projectId={id}
                    setGeneratedAds={setGeneratedAds}
                    onComplete={() => setShowQuestionnaire(false)}
                    onCancel={hasAds ? () => setShowQuestionnaire(false) : undefined}
                />
            </div>
        );
    }

    return (
        <div className="flex-grow max-w-7xl 2xl:max-w-[90%] mx-auto justify-center px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        Ad Discovery
                    </CardTitle>
                    <CardDescription className="mt-4 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="text-foreground text-base font-semibold">Generated Facebook Ad Creatives</span>
                            </div>
                            {hasAds ? (
                                <p>
                                    {generatedAds.length} ad concepts across {angles.length} angles
                                </p>
                            ) : (
                                <p>
                                    No ads generated. Generate a new one
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {hasAds && (
                                <>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setShowQuestionnaire(true)}
                                    >
                                        Redo Questions
                                    </Button>
                                    <Button
                                        variant="default"
                                        onClick={handleRegenerateAds}
                                        disabled={isRegenerating}
                                    >
                                        {isRegenerating ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Regenerating...
                                            </>
                                        ) : (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4" />
                                                Regenerate Ads
                                            </>
                                        )}
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            )}

            {hasAds && (
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Mobile: Horizontal scrollable angle filter */}
                    <div className="md:hidden overflow-x-auto -mx-2 px-2 pb-2">
                        <div className="flex gap-2 min-w-max">
                            <button
                                onClick={() => setSelectedAngle(ALL_ANGLES_KEY)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                                    selectedAngle === ALL_ANGLES_KEY
                                        ? "bg-blue-600 text-white"
                                        : "bg-muted text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                                All ({generatedAds.length})
                            </button>
                            {angles.map((angle) => (
                                <button
                                    key={angle}
                                    onClick={() => setSelectedAngle(angle)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors whitespace-nowrap",
                                        selectedAngle === angle
                                            ? "bg-blue-600 text-white font-medium"
                                            : "bg-muted text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {angle} ({angleCounts[angle]})
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Desktop: Angle Sidebar Menu */}
                    <div className="hidden md:block w-64 shrink-0">
                        <div className="sticky top-4 space-y-1">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">
                                Angles
                            </h3>
                            <button
                                onClick={() => setSelectedAngle(ALL_ANGLES_KEY)}
                                className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                                    selectedAngle === ALL_ANGLES_KEY
                                        ? "bg-blue-600 text-white"
                                        : "text-foreground hover:bg-muted"
                                )}
                            >
                                <span className="flex items-center gap-2">
                                    <LayoutGrid className="h-4 w-4" />
                                    All Angles
                                </span>
                                <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full",
                                    selectedAngle === ALL_ANGLES_KEY
                                        ? "bg-blue-500 text-white"
                                        : "bg-muted text-muted-foreground"
                                )}>
                                    {generatedAds.length}
                                </span>
                            </button>

                            <div className="h-px bg-border my-2" />

                            <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-0.5 pr-1">
                                {angles.map((angle) => (
                                    <button
                                        key={angle}
                                        onClick={() => setSelectedAngle(angle)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left",
                                            selectedAngle === angle
                                                ? "bg-blue-600 text-white font-medium"
                                                : "text-foreground hover:bg-muted"
                                        )}
                                    >
                                        <span className="truncate mr-2">{angle}</span>
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full shrink-0",
                                            selectedAngle === angle
                                                ? "bg-blue-500 text-white"
                                                : "bg-muted text-muted-foreground"
                                        )}>
                                            {angleCounts[angle]}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Ad Cards */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-foreground">
                                {selectedAngle === ALL_ANGLES_KEY
                                    ? "All Ads"
                                    : selectedAngle}
                            </h2>
                            <span className="text-sm text-muted-foreground">
                                {filteredAds.length} ad{filteredAds.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredAds.map((ad, index) => (
                                <Card key={ad.id || index} className="border-2">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                                {ad.angle}
                                            </span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Generated Image or Generate Button */}
                                        <div>
                                            {ad.imageUrl ? (
                                                <div className="space-y-2">
                                                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">🎨 Generated Ad Image</h4>
                                                    <div className="relative rounded-lg overflow-hidden border border-border">
                                                        <img
                                                            src={ad.imageUrl}
                                                            alt={`Ad image for ${ad.angle}`}
                                                            className="w-full h-auto object-cover"
                                                        />
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleGenerateImage(ad.id)}
                                                        disabled={generatingImageFor === ad.id}
                                                        className="w-full"
                                                    >
                                                        {generatingImageFor === ad.id ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                                                Regenerating...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <RefreshCw className="mr-2 h-3 w-3" />
                                                                Regenerate Image
                                                            </>
                                                        )}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center text-center">
                                                        <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                                                        <p className="text-sm text-muted-foreground mb-3">No image generated yet</p>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            onClick={() => handleGenerateImage(ad.id)}
                                                            disabled={generatingImageFor === ad.id}
                                                        >
                                                            {generatingImageFor === ad.id ? (
                                                                <>
                                                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                                                    Generating...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ImageIcon className="mr-2 h-3 w-3" />
                                                                    Generate Image
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {ad.imageUrl ? (
                                            <div>
                                                <button
                                                    onClick={() => {
                                                        setExpandedImageDetails((prev) => {
                                                            const next = new Set(prev);
                                                            if (next.has(ad.id)) {
                                                                next.delete(ad.id);
                                                            } else {
                                                                next.add(ad.id);
                                                            }
                                                            return next;
                                                        });
                                                    }}
                                                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-1"
                                                >
                                                    {expandedImageDetails.has(ad.id) ? (
                                                        <ChevronUp className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4" />
                                                    )}
                                                    <span>Image Details</span>
                                                </button>
                                                {expandedImageDetails.has(ad.id) && (
                                                    <div className="space-y-3 mt-2">
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-muted-foreground mb-1">📸 Image Description</h4>
                                                            <p className="text-sm bg-muted p-3 rounded">{ad.imageDescription}</p>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-semibold text-sm text-muted-foreground mb-1">🖼️ Image Text Overlay</h4>
                                                            <p className="text-sm bg-muted p-3 rounded font-medium">{ad.imageCopy}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">📸 Image Description</h4>
                                                    <p className="text-sm bg-muted p-3 rounded">{ad.imageDescription}</p>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-sm text-muted-foreground mb-1">🖼️ Image Text Overlay</h4>
                                                    <p className="text-sm bg-muted p-3 rounded font-medium">{ad.imageCopy}</p>
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            {!ad.imageUrl && <h4 className="font-semibold text-sm text-muted-foreground mb-1">📰 Headline</h4>}
                                            <p className="text-base font-bold">{ad.headline}</p>
                                        </div>
                                        <div>
                                            {!ad.imageUrl && <h4 className="font-semibold text-sm text-muted-foreground mb-1">📝 Primary Text</h4>}
                                            <p className="text-sm leading-relaxed">{ad.primaryText}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
