"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, RefreshCw, Loader2, Users, Target, Heart, MessageSquare, Briefcase, MapPin, GraduationCap, DollarSign, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PersonaQuestionnaire, type PersonaResult } from "../_components/persona-questionnaire";
import { cn } from "@/lib/cn";
import { confirm } from "@/components/ui/alert-dialog";
import { useSession } from "@/backend-apis/auth/hooks";
import { usePricingModal } from "@/providers/pricing-modal-provider";

const CREDITS_PER_PERSONA_DISCOVERY = 2;

export default function PersonasPage() {
    const { id } = useParams() as { id: string };
    const [generatedPersonas, setGeneratedPersonas] = useState<PersonaResult[]>([]);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [expandedPersonas, setExpandedPersonas] = useState<Set<string>>(new Set());
    const [showQuestionnaire, setShowQuestionnaire] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const { data: session } = useSession();
    const { handleCoinsFinished } = usePricingModal();

    const fetchPersonas = async () => {
        if (!id) return;
        try {
            const response = await fetch(`/api/persona-discovery?projectId=${id}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch personas");
            }

            const data = await response.json();
            setGeneratedPersonas(data.personas as PersonaResult[]);
        } catch (error) {
            console.error("Error fetching personas:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegeneratePersonas = async () => {
        if (!id) return;

        const userCoins = session?.user?.remainingChatGenerations || 0;
        if (userCoins < CREDITS_PER_PERSONA_DISCOVERY) {
            toast.error(`You need ${CREDITS_PER_PERSONA_DISCOVERY} credits to regenerate personas. You have ${userCoins} credits.`);
            handleCoinsFinished();
            return;
        }

        const yes = await confirm({
            title: "Regenerate all personas?",
            description: `This will use ${CREDITS_PER_PERSONA_DISCOVERY} credits to regenerate your personas using your saved answers. You have ${userCoins} credits remaining.`,
        });
        if (!yes) return;

        setIsRegenerating(true);
        try {
            const response = await fetch("/api/persona-discovery", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId: id }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.error?.includes("credits") || errorData.error?.includes("need")) {
                    handleCoinsFinished();
                }
                throw new Error(errorData.error || "Failed to regenerate personas");
            }

            const data = await response.json();
            setGeneratedPersonas(data.personas);
            toast.success("Success!", {
                description: `Regenerated ${data.personas.length} personas from your saved answers.`,
            });
        } catch (error: any) {
            console.error("Error regenerating personas:", error);
            toast.error("Error", {
                description: error.message || "Failed to regenerate personas. Please try again.",
            });
        } finally {
            setIsRegenerating(false);
        }
    };

    const togglePersonaExpand = (personaId: string) => {
        setExpandedPersonas((prev) => {
            const next = new Set(prev);
            if (next.has(personaId)) {
                next.delete(personaId);
            } else {
                next.add(personaId);
            }
            return next;
        });
    };

    useEffect(() => {
        fetchPersonas();
    }, []);

    const hasPersonas = generatedPersonas.length > 0;

    // Show questionnaire inline if no personas and not loading, or if user chose "Redo Questions"
    if (!isLoading && (!hasPersonas || showQuestionnaire)) {
        return (
            <div className="flex-grow max-w-7xl 2xl:max-w-[90%] mx-auto justify-center px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20">
                {/* Show back button only if they have existing personas (redo mode) */}
                {hasPersonas && showQuestionnaire && (
                    <div className="mb-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowQuestionnaire(false)}
                            className="text-muted-foreground hover:text-foreground gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Personas
                        </Button>
                    </div>
                )}
                <PersonaQuestionnaire
                    projectId={id}
                    setGeneratedPersonas={(personas) => {
                        setGeneratedPersonas(personas);
                    }}
                    onComplete={() => setShowQuestionnaire(false)}
                    onCancel={hasPersonas ? () => setShowQuestionnaire(false) : undefined}
                />
            </div>
        );
    }

    return (
        <div className="flex-grow max-w-7xl 2xl:max-w-[90%] mx-auto justify-center px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 space-y-4">
            {/* Header Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Users className="h-5 w-5 text-purple-600" />
                        Persona Finder
                    </CardTitle>
                    <CardDescription className="mt-4 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="text-foreground text-base font-semibold">
                                    Buyer Personas
                                </span>
                            </div>
                            {hasPersonas ? (
                                <p>
                                    {generatedPersonas.length} detailed buyer personas generated
                                </p>
                            ) : (
                                <p>No personas generated yet. Answer a few questions to find your ideal personas.</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {hasPersonas && (
                                <>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setShowQuestionnaire(true)}
                                    >
                                        Redo Questions
                                    </Button>
                                    <Button
                                        variant="default"
                                        onClick={handleRegeneratePersonas}
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
                                                Regenerate Personas
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
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                </div>
            )}

            {/* Persona Cards */}
            {hasPersonas && (
                <div className="grid grid-cols-1 gap-6">
                    {generatedPersonas.map((persona, index) => {
                        const isExpanded = expandedPersonas.has(persona.id);
                        return (
                            <Card key={persona.id || index} className="border-2 overflow-hidden">
                                {/* Persona Header - Always visible */}
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="text-5xl">{persona.avatar || "👤"}</div>
                                            <div>
                                                <CardTitle className="text-xl">{persona.personaName}</CardTitle>
                                                <p className="text-sm text-muted-foreground mt-1 italic">
                                                    &ldquo;{persona.tagline}&rdquo;
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => togglePersonaExpand(persona.id)}
                                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
                                        >
                                            {isExpanded ? (
                                                <>
                                                    <ChevronUp className="h-4 w-4" />
                                                    Collapse
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="h-4 w-4" />
                                                    Expand
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Quick Demographics Bar */}
                                    <div className="flex flex-wrap gap-3 mt-4">
                                        <span className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                                            <Users className="h-3.5 w-3.5" />
                                            {persona.ageRange}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                            <Briefcase className="h-3.5 w-3.5" />
                                            {persona.occupation}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {persona.location}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                                            <DollarSign className="h-3.5 w-3.5" />
                                            {persona.incomeLevel}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 px-3 py-1 rounded-full text-sm font-medium">
                                            <GraduationCap className="h-3.5 w-3.5" />
                                            {persona.education}
                                        </span>
                                    </div>
                                </CardHeader>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <CardContent className="space-y-6 pt-2">
                                        {/* Day in the Life */}
                                        <div className="bg-muted/50 rounded-xl p-5">
                                            <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                                                📅 A Day in Their Life
                                            </h4>
                                            <p className="text-sm leading-relaxed">{persona.dayInTheLife}</p>
                                        </div>

                                        {/* How Product Fits */}
                                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-5">
                                            <h4 className="font-semibold text-sm text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
                                                🎯 How Your Product Fits
                                            </h4>
                                            <p className="text-sm leading-relaxed">{persona.howProductFits}</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Psychographics */}
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                                                        <Heart className="h-4 w-4 text-red-500" />
                                                        Values
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {persona.values.map((v, i) => (
                                                            <span key={i} className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-sm">
                                                                {v}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                                                        🎨 Interests
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {persona.interests.map((interest, i) => (
                                                            <span key={i} className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-sm">
                                                                {interest}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                                                        🏡 Lifestyle
                                                    </h4>
                                                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{persona.lifestyle}</p>
                                                </div>
                                            </div>

                                            {/* Goals & Pain Points */}
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                                                        <Target className="h-4 w-4 text-green-500" />
                                                        Goals
                                                    </h4>
                                                    <ul className="space-y-1.5">
                                                        {persona.goals.map((goal, i) => (
                                                            <li key={i} className="text-sm flex items-start gap-2">
                                                                <span className="text-green-500 mt-0.5">✓</span>
                                                                {goal}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div>
                                                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                                                        😤 Pain Points
                                                    </h4>
                                                    <ul className="space-y-1.5">
                                                        {persona.painPoints.map((pain, i) => (
                                                            <li key={i} className="text-sm flex items-start gap-2">
                                                                <span className="text-red-500 mt-0.5">✗</span>
                                                                {pain}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Buying Behavior */}
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                                                        💡 Buying Motivations
                                                    </h4>
                                                    <ul className="space-y-1.5">
                                                        {persona.buyingMotivations.map((m, i) => (
                                                            <li key={i} className="text-sm flex items-start gap-2">
                                                                <span className="text-amber-500 mt-0.5">★</span>
                                                                {m}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div>
                                                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                                                        📱 Preferred Channels
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {persona.preferredChannels.map((ch, i) => (
                                                            <span key={i} className="bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 px-3 py-1 rounded-full text-sm">
                                                                {ch}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div>
                                                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                                                        📄 Content Preferences
                                                    </h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        {persona.contentPreferences.map((cp, i) => (
                                                            <span key={i} className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-sm">
                                                                {cp}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Messaging */}
                                            <div className="space-y-4">
                                                <div>
                                                    <h4 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                                                        <MessageSquare className="h-4 w-4 text-blue-500" />
                                                        Messaging Angles
                                                    </h4>
                                                    <ul className="space-y-1.5">
                                                        {persona.messagingAngles.map((angle, i) => (
                                                            <li key={i} className="text-sm flex items-start gap-2">
                                                                <span className="text-blue-500 mt-0.5">→</span>
                                                                {angle}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div>
                                                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                                                        🎤 Tone of Voice
                                                    </h4>
                                                    <p className="text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg font-medium">
                                                        {persona.toneOfVoice}
                                                    </p>
                                                </div>

                                                <div>
                                                    <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                                                        💬 Key Messages
                                                    </h4>
                                                    <ul className="space-y-1.5">
                                                        {persona.keyMessages.map((msg, i) => (
                                                            <li key={i} className="text-sm flex items-start gap-2">
                                                                <span className="text-purple-500 mt-0.5">💎</span>
                                                                {msg}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
