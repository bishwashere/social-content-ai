"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Loader2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

interface PersonaQuestionnaireProps {
  projectId: string;
  buttonText: string;
  setGeneratedPersonas: React.Dispatch<React.SetStateAction<PersonaResult[]>>;
}

interface PersonaFormData {
  productName: string;
  productDescription: string;
  productCategory: string;
  priceRange: string;
  uniqueValue: string;
  currentCustomers: string;
  ageGroups: string[];
  genderSplit: string;
  topLocations: string[];
  occupations: string[];
  discoveryChannels: string[];
  purchaseTriggers: string[];
  commonObjections: string[];
  buyingCycleLength: string;
  customerGoals: string[];
  frustrations: string[];
  motivations: string[];
  fears: string[];
}

export interface PersonaResult {
  id: string;
  personaName: string;
  tagline: string;
  avatar: string;
  ageRange: string;
  gender: string;
  location: string;
  incomeLevel: string;
  education: string;
  occupation: string;
  values: string[];
  interests: string[];
  lifestyle: string;
  goals: string[];
  painPoints: string[];
  buyingMotivations: string[];
  preferredChannels: string[];
  contentPreferences: string[];
  messagingAngles: string[];
  toneOfVoice: string;
  keyMessages: string[];
  dayInTheLife: string;
  howProductFits: string;
}

export function PersonaQuestionnaire({ projectId, buttonText, setGeneratedPersonas }: PersonaQuestionnaireProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [formData, setFormData] = useState<PersonaFormData>({
    productName: "",
    productDescription: "",
    productCategory: "",
    priceRange: "",
    uniqueValue: "",
    currentCustomers: "",
    ageGroups: ["", "", ""],
    genderSplit: "",
    topLocations: ["", "", ""],
    occupations: ["", "", ""],
    discoveryChannels: ["", "", ""],
    purchaseTriggers: ["", "", ""],
    commonObjections: ["", "", ""],
    buyingCycleLength: "",
    customerGoals: ["", "", ""],
    frustrations: ["", "", ""],
    motivations: ["", "", ""],
    fears: ["", "", ""],
  });

  const updateArrayField = (field: keyof PersonaFormData, index: number, value: string) => {
    const currentArray = formData[field] as string[];
    const newArray = [...currentArray];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  // Define all questions in order
  const questions = [
    {
      id: "productName",
      section: "📦 PRODUCT / SERVICE",
      question: "What is your product or service name?",
      required: true,
      type: "text",
      placeholder: "Enter your product name",
    },
    {
      id: "productDescription",
      section: "📦 PRODUCT / SERVICE",
      question: "Describe your product or service in one sentence:",
      required: true,
      type: "text",
      placeholder: "One sentence description",
    },
    {
      id: "productCategory",
      section: "📦 PRODUCT / SERVICE",
      question: "What category does your product fall into?",
      type: "text",
      placeholder: "e.g., SaaS, E-commerce, Health & Wellness, Education...",
    },
    {
      id: "priceRange",
      section: "📦 PRODUCT / SERVICE",
      question: "What is the price range of your product?",
      type: "text",
      placeholder: "e.g., $29/mo, $99-$299, Free with premium tier...",
    },
    {
      id: "uniqueValue",
      section: "📦 PRODUCT / SERVICE",
      question: "What makes your product uniquely valuable?",
      type: "textarea",
      placeholder: "What's your unique value proposition that sets you apart...",
    },
    {
      id: "currentCustomers",
      section: "👥 CURRENT CUSTOMERS",
      question: "Describe your current or ideal customers:",
      type: "textarea",
      placeholder: "Who are they? What do they do? What are they like?",
    },
    {
      id: "ageGroups",
      section: "👥 CURRENT CUSTOMERS",
      question: "What age groups are most likely to buy?",
      type: "array",
      count: 3,
      placeholder: "Age group (e.g., 25-34)",
    },
    {
      id: "genderSplit",
      section: "👥 CURRENT CUSTOMERS",
      question: "What's the gender breakdown of your customers?",
      type: "text",
      placeholder: "e.g., 60% female, 40% male or evenly split...",
    },
    {
      id: "topLocations",
      section: "👥 CURRENT CUSTOMERS",
      question: "Where are your top customers located?",
      type: "array",
      count: 3,
      placeholder: "Location (e.g., US, Urban areas, Europe)",
    },
    {
      id: "occupations",
      section: "👥 CURRENT CUSTOMERS",
      question: "What occupations do your customers typically have?",
      type: "array",
      count: 3,
      placeholder: "Occupation",
    },
    {
      id: "discoveryChannels",
      section: "🛒 BUYING BEHAVIOR",
      question: "How do customers typically find your product?",
      type: "array",
      count: 3,
      placeholder: "Channel (e.g., Google, Instagram, Word of mouth)",
    },
    {
      id: "purchaseTriggers",
      section: "🛒 BUYING BEHAVIOR",
      question: "What triggers someone to buy your product?",
      type: "array",
      count: 3,
      placeholder: "Trigger (e.g., pain event, new job, frustration)",
    },
    {
      id: "commonObjections",
      section: "🛒 BUYING BEHAVIOR",
      question: "What are common objections or hesitations before buying?",
      type: "array",
      count: 3,
      placeholder: "Objection",
    },
    {
      id: "buyingCycleLength",
      section: "🛒 BUYING BEHAVIOR",
      question: "How long does it typically take from first awareness to purchase?",
      type: "text",
      placeholder: "e.g., Same day, 1-2 weeks, 1-3 months...",
    },
    {
      id: "customerGoals",
      section: "🎯 GOALS & PAIN POINTS",
      question: "What are your customers' top goals?",
      type: "array",
      count: 3,
      placeholder: "Goal",
    },
    {
      id: "frustrations",
      section: "🎯 GOALS & PAIN POINTS",
      question: "What frustrations do they experience related to your product's space?",
      type: "array",
      count: 3,
      placeholder: "Frustration",
    },
    {
      id: "motivations",
      section: "🎯 GOALS & PAIN POINTS",
      question: "What motivates them to seek a solution?",
      type: "array",
      count: 3,
      placeholder: "Motivation",
    },
    {
      id: "fears",
      section: "🎯 GOALS & PAIN POINTS",
      question: "What fears or concerns do they have about buying?",
      type: "array",
      count: 3,
      placeholder: "Fear or concern",
    },
  ];

  const currentQuestion = questions[currentStep];
  const totalSteps = questions.length;
  const isLastStep = currentStep === totalSteps - 1;

  const handleSubmit = async () => {
    if (!formData.productName || !formData.productDescription) {
      toast.error("Missing Information", {
        description: "Please provide at least the product name and description.",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/persona-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          ...formData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate personas");
      }

      const data = await response.json();

      toast.success("Success!", {
        description: `Generated ${data.personas.length} buyer personas for your product.`,
      });

      setGeneratedPersonas(data.personas);
      setIsGenerating(false);
      setIsDialogOpen(false);
      setCurrentStep(0);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error", {
        description: error.message || "Failed to generate personas. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      handleSubmit();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    const question = currentQuestion;
    const value = formData[question.id as keyof PersonaFormData];

    if (question.required) {
      if (typeof value === "string") {
        return value.trim() !== "";
      }
    }
    return true;
  };

  // Section indices for progress breadcrumb
  const sectionRanges = [
    { label: "📦 PRODUCT / SERVICE", start: 0, end: 5 },
    { label: "👥 CURRENT CUSTOMERS", start: 5, end: 10 },
    { label: "🛒 BUYING BEHAVIOR", start: 10, end: 14 },
    { label: "🎯 GOALS & PAIN POINTS", start: 14, end: 18 },
  ];

  return (
    <div>
      <Button variant="secondary" onClick={() => setIsDialogOpen(true)}>
        {buttonText}
      </Button>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setCurrentStep(0);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Persona Finder
            </DialogTitle>
            <DialogDescription>{currentQuestion.section}</DialogDescription>
          </DialogHeader>

          {/* Progress Breadcrumb - Sectioned */}
          <div className="py-4">
            <div className="space-y-6">
              {sectionRanges.map((section) => (
                <div key={section.label}>
                  <p className="text-xs font-semibold text-gray-500 mb-2 text-center">
                    {section.label}
                  </p>
                  <div className="flex items-center justify-center gap-1">
                    {questions.slice(section.start, section.end).map((_, index) => {
                      const actualIndex = section.start + index;
                      const isLast = index === section.end - section.start - 1;
                      return (
                        <div key={actualIndex} className="flex items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                              actualIndex < currentStep
                                ? "bg-green-500 text-white"
                                : actualIndex === currentStep
                                ? "bg-purple-500 text-white ring-4 ring-purple-500/20"
                                : "bg-gray-200 text-gray-400"
                            }`}
                          >
                            {actualIndex < currentStep ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              actualIndex + 1
                            )}
                          </div>
                          {!isLast && (
                            <div
                              className={`w-3 h-0.5 mx-0.5 transition-all ${
                                actualIndex < currentStep
                                  ? "bg-green-500"
                                  : "bg-gray-200"
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-gray-500 mt-4">
              Question {currentStep + 1} of {totalSteps}
            </p>
          </div>

          {/* Question Content */}
          <div className="py-6 min-h-[300px]">
            <h3 className="text-2xl font-bold mb-6">
              {currentQuestion.question}
              {currentQuestion.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </h3>

            <div className="space-y-3">
              {currentQuestion.type === "text" && (
                <input
                  type="text"
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                  placeholder={currentQuestion.placeholder}
                  value={formData[currentQuestion.id as keyof PersonaFormData] as string}
                  onChange={(e) =>
                    setFormData({ ...formData, [currentQuestion.id]: e.target.value })
                  }
                  autoFocus
                />
              )}

              {currentQuestion.type === "textarea" && (
                <textarea
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                  rows={4}
                  placeholder={currentQuestion.placeholder}
                  value={formData[currentQuestion.id as keyof PersonaFormData] as string}
                  onChange={(e) =>
                    setFormData({ ...formData, [currentQuestion.id]: e.target.value })
                  }
                  autoFocus
                />
              )}

              {currentQuestion.type === "array" && (
                <>
                  {Array.from({ length: currentQuestion.count || 3 }).map(
                    (_, index) => (
                      <input
                        key={index}
                        type="text"
                        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                        placeholder={`${index + 1}. ${currentQuestion.placeholder} ${index + 1}`}
                        value={
                          (formData[currentQuestion.id as keyof PersonaFormData] as string[])[
                            index
                          ] || ""
                        }
                        onChange={(e) =>
                          updateArrayField(
                            currentQuestion.id as keyof PersonaFormData,
                            index,
                            e.target.value
                          )
                        }
                        autoFocus={index === 0}
                      />
                    )
                  )}
                </>
              )}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="px-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canProceed() || isGenerating}
              className="px-8"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Personas...
                </>
              ) : isLastStep ? (
                "Find Personas"
              ) : (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
