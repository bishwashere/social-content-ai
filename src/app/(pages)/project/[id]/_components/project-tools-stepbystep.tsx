"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Sparkles, Loader2, CheckCircle, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

interface ProjectToolsProps {
  projectId: string;
  buttonText: string;
  setGeneratedAds: React.Dispatch<React.SetStateAction<AdCreative[]>>;
}

interface FormData {
  brandName: string;
  productDescription: string;
  features: string[];
  heroPersona: string;
  benefits: string[];
  buyerQuestions: string[];
  competitors: string[];
  competitiveDiff: string;
  testimonials: string[];
  proofPoints: string[];
  customerDescription: string;
  dreamOutcome: string;
  jobsToBeDone: string[];
  challenges: string[];
  emotionalBenefits: string[];
  transformations: string[];
  perceptions: string[];
  alternatives: string[];
  alternativesDiff: string;
  lifeEvents: string[];
}

interface AdCreative {
  id: string;
  angle: string;
  imageDescription: string;
  imageCopy: string;
  headline: string;
  primaryText: string;
}

export function ProjectToolsStepByStep({ projectId, buttonText, setGeneratedAds }: ProjectToolsProps) {
  const [isDiscoveryDialogOpen, setIsDiscoveryDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [formData, setFormData] = useState<FormData>({
    brandName: "",
    productDescription: "",
    features: ["", "", ""],
    heroPersona: "",
    benefits: ["", "", ""],
    buyerQuestions: ["", "", ""],
    competitors: ["", "", ""],
    competitiveDiff: "",
    testimonials: ["", "", ""],
    proofPoints: ["", "", ""],
    customerDescription: "",
    dreamOutcome: "",
    jobsToBeDone: ["", "", ""],
    challenges: ["", "", ""],
    emotionalBenefits: ["", "", ""],
    transformations: ["", "", ""],
    perceptions: ["", "", ""],
    alternatives: ["", "", ""],
    alternativesDiff: "",
    lifeEvents: ["", "", ""],
  });

  const updateArrayField = (field: keyof FormData, index: number, value: string) => {
    const currentArray = formData[field] as string[];
    const newArray = [...currentArray];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  // Define all questions in order
  const questions = [
    {
      id: "brandName",
      section: "📦 YOUR PRODUCT",
      question: "What is your brand name?",
      required: true,
      type: "text",
      placeholder: "Enter your brand name"
    },
    {
      id: "productDescription",
      section: "📦 YOUR PRODUCT",
      question: "Describe the product or service in one sentence:",
      required: true,
      type: "text",
      placeholder: "One sentence description"
    },
    {
      id: "features",
      section: "📦 YOUR PRODUCT",
      question: "What are the product's main features?",
      type: "array",
      count: 3,
      placeholder: "Feature"
    },
    {
      id: "heroPersona",
      section: "📦 YOUR PRODUCT",
      question: "Who is your Hero Persona (what specific persona are you marketing to)?",
      type: "textarea",
      placeholder: "Describe your target persona..."
    },
    {
      id: "benefits",
      section: "📦 YOUR PRODUCT",
      question: "What are the product's main benefits?",
      type: "array",
      count: 3,
      placeholder: "Benefit"
    },
    {
      id: "buyerQuestions",
      section: "📦 YOUR PRODUCT",
      question: "What are the main questions someone might ask about the product?",
      type: "array",
      count: 3,
      placeholder: "Question"
    },
    {
      id: "competitors",
      section: "🎯 COMPETITION",
      question: "List your top 3 competitors",
      type: "array",
      count: 3,
      placeholder: "Competitor"
    },
    {
      id: "competitiveDiff",
      section: "🎯 COMPETITION",
      question: "How is your product different or better than your competitors?",
      type: "textarea",
      placeholder: "Explain your unique advantages..."
    },
    {
      id: "testimonials",
      section: "⭐ SOCIAL PROOF",
      question: "Paste 3 Testimonials Here",
      type: "array",
      count: 3,
      placeholder: "Testimonial",
      isTextarea: true
    },
    {
      id: "proofPoints",
      section: "⭐ SOCIAL PROOF",
      question: "What proof do you have that your product works?",
      type: "array",
      count: 3,
      placeholder: "Proof point (e.g., 10,000+ users)"
    },
    {
      id: "customerDescription",
      section: "👥 YOUR CUSTOMERS",
      question: "How would you describe your customer?",
      type: "textarea",
      placeholder: "Describe your ideal customer..."
    },
    {
      id: "dreamOutcome",
      section: "👥 YOUR CUSTOMERS",
      question: "What is their dream outcome once they buy your product?",
      type: "text",
      placeholder: "I wish that I could __ so that __"
    },
    {
      id: "jobsToBeDone",
      section: "👥 YOUR CUSTOMERS",
      question: "What job(s) are they hiring the product to do?",
      type: "array",
      count: 3,
      placeholder: "Job"
    },
    {
      id: "challenges",
      section: "👥 YOUR CUSTOMERS",
      question: "What problems will the product solve for them?",
      type: "array",
      count: 3,
      placeholder: "Challenge"
    },
    {
      id: "emotionalBenefits",
      section: "👥 YOUR CUSTOMERS",
      question: "What 3 emotional benefits does the product give them?",
      type: "array",
      count: 3,
      placeholder: "Emotional benefit (e.g., confidence)"
    },
    {
      id: "transformations",
      section: "👥 YOUR CUSTOMERS",
      question: "How will their life change once they buy the product?",
      type: "array",
      count: 3,
      placeholder: "Transformation"
    },
    {
      id: "perceptions",
      section: "👥 YOUR CUSTOMERS",
      question: "How will others perceive them once they have the product?",
      type: "array",
      count: 3,
      placeholder: "Perception"
    },
    {
      id: "alternatives",
      section: "👥 YOUR CUSTOMERS",
      question: "What other solutions have they tried?",
      type: "array",
      count: 3,
      placeholder: "Alternative"
    },
    {
      id: "alternativesDiff",
      section: "👥 YOUR CUSTOMERS",
      question: "How is your product better than the alternatives?",
      type: "textarea",
      placeholder: "Explain how you're better..."
    },
    {
      id: "lifeEvents",
      section: "👥 YOUR CUSTOMERS",
      question: "Are there specific life events that typically trigger a purchase?",
      type: "array",
      count: 3,
      placeholder: "Life event"
    },
  ];

  const currentQuestion = questions[currentStep];
  const totalSteps = questions.length;
  const isLastStep = currentStep === totalSteps - 1;

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.brandName || !formData.productDescription) {
      toast.error("Missing Information", {
        description: "Please provide at least the brand name and product description.",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch("/api/brand-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          ...formData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save brand discovery");
      }

      const data = await response.json();

      toast.success("Success!", {
        description: `Generated ${data.adCreatives.length} ad creatives for your brand.`,
      });

      setGeneratedAds(data.adCreatives);
      setIsGenerating(false);
      setIsDiscoveryDialogOpen(false);
      setCurrentStep(0);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error", {
        description: "Failed to generate ad creatives. Please try again.",
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
    const value = formData[question.id as keyof FormData];

    if (question.required) {
      if (typeof value === 'string') {
        return value.trim() !== '';
      }
    }
    return true;
  };

  return (
    <div>
      <Button variant="secondary" onClick={() => setIsDiscoveryDialogOpen(true)}>
        {buttonText}
      </Button>
      {/* Add Discovery Dialog - Step by Step */}
      <Dialog open={isDiscoveryDialogOpen} onOpenChange={(open) => {
        setIsDiscoveryDialogOpen(open);
        if (!open) setCurrentStep(0);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              Brand Discovery
            </DialogTitle>
            <DialogDescription>
              {currentQuestion.section}
            </DialogDescription>
          </DialogHeader>

          {/* Progress Breadcrumb - Sectioned */}
          <div className="py-4">
            <div className="space-y-6">
              {/* Product Section */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 text-center">📦 YOUR PRODUCT</p>
                <div className="flex items-center justify-center gap-1">
                  {questions.slice(0, 6).map((_, index) => (
                    <div key={index} className="flex items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${index < currentStep
                          ? "bg-green-500 text-white"
                          : index === currentStep
                            ? "bg-blue-500 text-white ring-4 ring-blue-500/20"
                            : "bg-gray-200 text-gray-400"
                          }`}
                      >
                        {index < currentStep ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      {index < 5 && (
                        <div
                          className={`w-3 h-0.5 mx-0.5 transition-all ${index < currentStep ? "bg-green-500" : "bg-gray-200"
                            }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Competition Section */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 text-center">🎯 COMPETITION</p>
                <div className="flex items-center justify-center gap-1">
                  {questions.slice(6, 8).map((_, index) => {
                    const actualIndex = index + 6;
                    return (
                      <div key={actualIndex} className="flex items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${actualIndex < currentStep
                            ? "bg-green-500 text-white"
                            : actualIndex === currentStep
                              ? "bg-blue-500 text-white ring-4 ring-blue-500/20"
                              : "bg-gray-200 text-gray-400"
                            }`}
                        >
                          {actualIndex < currentStep ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            actualIndex + 1
                          )}
                        </div>
                        {index < 1 && (
                          <div
                            className={`w-3 h-0.5 mx-0.5 transition-all ${actualIndex < currentStep ? "bg-green-500" : "bg-gray-200"
                              }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Social Proof Section */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 text-center">⭐ SOCIAL PROOF</p>
                <div className="flex items-center justify-center gap-1">
                  {questions.slice(8, 10).map((_, index) => {
                    const actualIndex = index + 8;
                    return (
                      <div key={actualIndex} className="flex items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${actualIndex < currentStep
                            ? "bg-green-500 text-white"
                            : actualIndex === currentStep
                              ? "bg-blue-500 text-white ring-4 ring-blue-500/20"
                              : "bg-gray-200 text-gray-400"
                            }`}
                        >
                          {actualIndex < currentStep ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            actualIndex + 1
                          )}
                        </div>
                        {index < 1 && (
                          <div
                            className={`w-3 h-0.5 mx-0.5 transition-all ${actualIndex < currentStep ? "bg-green-500" : "bg-gray-200"
                              }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Customers Section */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 text-center">👥 YOUR CUSTOMERS</p>
                <div className="flex items-center justify-center gap-1 flex-wrap max-w-md mx-auto">
                  {questions.slice(10, 20).map((_, index) => {
                    const actualIndex = index + 10;
                    return (
                      <div key={actualIndex} className="flex items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${actualIndex < currentStep
                            ? "bg-green-500 text-white"
                            : actualIndex === currentStep
                              ? "bg-blue-500 text-white ring-4 ring-blue-500/20"
                              : "bg-gray-200 text-gray-400"
                            }`}
                        >
                          {actualIndex < currentStep ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            actualIndex + 1
                          )}
                        </div>
                        {index < 9 && (
                          <div
                            className={`w-3 h-0.5 mx-0.5 transition-all ${actualIndex < currentStep ? "bg-green-500" : "bg-gray-200"
                              }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 mt-4">
              Question {currentStep + 1} of {totalSteps}
            </p>
          </div>

          {/* Question Content */}
          <div className="py-6 min-h-[300px]">
            <h3 className="text-2xl font-bold mb-6">
              {currentQuestion.question}
              {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
            </h3>

            <div className="space-y-3">
              {currentQuestion.type === "text" && (
                <input
                  type="text"
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder={currentQuestion.placeholder}
                  value={formData[currentQuestion.id as keyof FormData] as string}
                  onChange={(e) => setFormData({ ...formData, [currentQuestion.id]: e.target.value })}
                  autoFocus
                />
              )}

              {currentQuestion.type === "textarea" && (
                <textarea
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                  rows={4}
                  placeholder={currentQuestion.placeholder}
                  value={formData[currentQuestion.id as keyof FormData] as string}
                  onChange={(e) => setFormData({ ...formData, [currentQuestion.id]: e.target.value })}
                  autoFocus
                />
              )}

              {currentQuestion.type === "array" && (
                <>
                  {Array.from({ length: currentQuestion.count || 3 }).map((_, index) => (
                    currentQuestion.isTextarea ? (
                      <textarea
                        key={index}
                        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                        rows={2}
                        placeholder={`${index + 1}. ${currentQuestion.placeholder} ${index + 1}`}
                        value={(formData[currentQuestion.id as keyof FormData] as string[])[index] || ""}
                        onChange={(e) => updateArrayField(currentQuestion.id as keyof FormData, index, e.target.value)}
                        autoFocus={index === 0}
                      />
                    ) : (
                      <input
                        key={index}
                        type="text"
                        className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
                        placeholder={`${index + 1}. ${currentQuestion.placeholder} ${index + 1}`}
                        value={(formData[currentQuestion.id as keyof FormData] as string[])[index] || ""}
                        onChange={(e) => updateArrayField(currentQuestion.id as keyof FormData, index, e.target.value)}
                        autoFocus={index === 0}
                      />
                    )
                  ))}
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
                  Generating...
                </>
              ) : isLastStep ? (
                "Generate Ads"
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