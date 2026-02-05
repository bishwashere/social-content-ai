"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Sparkles, Loader2, CheckCircle, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";

interface ProjectToolsProps {
  projectId: string;
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

export function ProjectTools({ projectId }: ProjectToolsProps) {
  const [isDiscoveryDialogOpen, setIsDiscoveryDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAds, setGeneratedAds] = useState<AdCreative[]>([]);
  const [showAdsDialog, setShowAdsDialog] = useState(false);
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
      setIsDiscoveryDialogOpen(false);
      setShowAdsDialog(true);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error", {
        description: "Failed to generate ad creatives. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🛠️ Project Tools</CardTitle>
          <CardDescription>
            Powerful tools to enhance your content creation workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Add Discovery Tool */}
            <ToolCard
              icon={<Search className="h-8 w-8 text-blue-600" />}
              title="Add Discovery"
              description="Discover trending content and ideas for your project"
              onClick={() => setIsDiscoveryDialogOpen(true)}
            />

            {/* Placeholder for future tools */}
            <ToolCard
              icon={<Sparkles className="h-8 w-8 text-purple-600" />}
              title="Coming Soon"
              description="More tools will be added here"
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Add Discovery Dialog */}
      <Dialog open={isDiscoveryDialogOpen} onOpenChange={setIsDiscoveryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              Add Discovery
            </DialogTitle>
            <DialogDescription>
              Help us understand your brand and target audience to create better content
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-8">
            {/* Brand Information */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">📦 YOUR PRODUCT</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">What is your brand name? *</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md" 
                  placeholder="Enter your brand name"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Describe the product or service in one sentence: *</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md" 
                  placeholder="One sentence description"
                  value={formData.productDescription}
                  onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Features: What are the product's main features?</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="1. Feature one"
                  value={formData.features[0]}
                  onChange={(e) => updateArrayField("features", 0, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="2. Feature two"
                  value={formData.features[1]}
                  onChange={(e) => updateArrayField("features", 1, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md" 
                  placeholder="3. Feature three"
                  value={formData.features[2]}
                  onChange={(e) => updateArrayField("features", 2, e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Who is your Hero Persona (what specific persona are you marketing to)?</label>
                <textarea 
                  className="w-full p-2 border rounded-md" 
                  rows={2} 
                  placeholder="Describe your target persona..."
                  value={formData.heroPersona}
                  onChange={(e) => setFormData({ ...formData, heroPersona: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Benefits: What are the product's main benefits?</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="1. Benefit one"
                  value={formData.benefits[0]}
                  onChange={(e) => updateArrayField("benefits", 0, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="2. Benefit two"
                  value={formData.benefits[1]}
                  onChange={(e) => updateArrayField("benefits", 1, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md" 
                  placeholder="3. Benefit three"
                  value={formData.benefits[2]}
                  onChange={(e) => updateArrayField("benefits", 2, e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Buyer Decision Questions: What are the main questions someone might ask about the product?</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="1. Question one"
                  value={formData.buyerQuestions[0]}
                  onChange={(e) => updateArrayField("buyerQuestions", 0, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="2. Question two"
                  value={formData.buyerQuestions[1]}
                  onChange={(e) => updateArrayField("buyerQuestions", 1, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md" 
                  placeholder="3. Question three"
                  value={formData.buyerQuestions[2]}
                  onChange={(e) => updateArrayField("buyerQuestions", 2, e.target.value)}
                />
              </div>
            </section>

            {/* Competition */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">🎯 COMPETITION</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Competitors: List your top 3 competitors</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="1. Competitor one"
                  value={formData.competitors[0]}
                  onChange={(e) => updateArrayField("competitors", 0, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="2. Competitor two"
                  value={formData.competitors[1]}
                  onChange={(e) => updateArrayField("competitors", 1, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md" 
                  placeholder="3. Competitor three"
                  value={formData.competitors[2]}
                  onChange={(e) => updateArrayField("competitors", 2, e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">How is your product different or better than your competitors?</label>
                <textarea 
                  className="w-full p-2 border rounded-md" 
                  rows={3} 
                  placeholder="Explain your unique advantages..."
                  value={formData.competitiveDiff}
                  onChange={(e) => setFormData({ ...formData, competitiveDiff: e.target.value })}
                />
              </div>
            </section>

            {/* Social Proof */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">⭐ SOCIAL PROOF</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Testimonials: Paste 3 Testimonials Here</label>
                <textarea 
                  className="w-full p-2 border rounded-md mb-2" 
                  rows={2} 
                  placeholder="1. First testimonial"
                  value={formData.testimonials[0]}
                  onChange={(e) => updateArrayField("testimonials", 0, e.target.value)}
                />
                <textarea 
                  className="w-full p-2 border rounded-md mb-2" 
                  rows={2} 
                  placeholder="2. Second testimonial"
                  value={formData.testimonials[1]}
                  onChange={(e) => updateArrayField("testimonials", 1, e.target.value)}
                />
                <textarea 
                  className="w-full p-2 border rounded-md" 
                  rows={2} 
                  placeholder="3. Third testimonial"
                  value={formData.testimonials[2]}
                  onChange={(e) => updateArrayField("testimonials", 2, e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Proof Points: What proof do you have that your product works?</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="1. Proof point one (e.g., 10,000+ users)"
                  value={formData.proofPoints[0]}
                  onChange={(e) => updateArrayField("proofPoints", 0, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="2. Proof point two"
                  value={formData.proofPoints[1]}
                  onChange={(e) => updateArrayField("proofPoints", 1, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md" 
                  placeholder="3. Proof point three"
                  value={formData.proofPoints[2]}
                  onChange={(e) => updateArrayField("proofPoints", 2, e.target.value)}
                />
              </div>
            </section>

            {/* Customers */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">👥 YOUR CUSTOMERS</h3>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Customers: How would you describe your customer?</label>
                <textarea 
                  className="w-full p-2 border rounded-md" 
                  rows={2} 
                  placeholder="Describe your ideal customer..."
                  value={formData.customerDescription}
                  onChange={(e) => setFormData({ ...formData, customerDescription: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Dream Outcome: What is their dream outcome once they buy your product?</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md" 
                  placeholder="I wish that I could __ so that __"
                  value={formData.dreamOutcome}
                  onChange={(e) => setFormData({ ...formData, dreamOutcome: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Jobs To Be Done: What job(s) are they hiring the product to do?</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="1. Job one"
                  value={formData.jobsToBeDone[0]}
                  onChange={(e) => updateArrayField("jobsToBeDone", 0, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="2. Job two"
                  value={formData.jobsToBeDone[1]}
                  onChange={(e) => updateArrayField("jobsToBeDone", 1, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md" 
                  placeholder="3. Job three"
                  value={formData.jobsToBeDone[2]}
                  onChange={(e) => updateArrayField("jobsToBeDone", 2, e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Challenges: What problems will the product solve for them?</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="1. Challenge one"
                  value={formData.challenges[0]}
                  onChange={(e) => updateArrayField("challenges", 0, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="2. Challenge two"
                  value={formData.challenges[1]}
                  onChange={(e) => updateArrayField("challenges", 1, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md" 
                  placeholder="3. Challenge three"
                  value={formData.challenges[2]}
                  onChange={(e) => updateArrayField("challenges", 2, e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Emotional Benefits: What 3 emotional benefits does the product give them?</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="1. Emotional benefit one (e.g., confidence)"
                  value={formData.emotionalBenefits[0]}
                  onChange={(e) => updateArrayField("emotionalBenefits", 0, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="2. Emotional benefit two"
                  value={formData.emotionalBenefits[1]}
                  onChange={(e) => updateArrayField("emotionalBenefits", 1, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md" 
                  placeholder="3. Emotional benefit three"
                  value={formData.emotionalBenefits[2]}
                  onChange={(e) => updateArrayField("emotionalBenefits", 2, e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Transformation: How will their life change once they buy the product?</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="1. Transformation one"
                  value={formData.transformations[0]}
                  onChange={(e) => updateArrayField("transformations", 0, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="2. Transformation two"
                  value={formData.transformations[1]}
                  onChange={(e) => updateArrayField("transformations", 1, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md" 
                  placeholder="3. Transformation three"
                  value={formData.transformations[2]}
                  onChange={(e) => updateArrayField("transformations", 2, e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Perception: How will others perceive them once they have the product?</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="1. Perception one"
                  value={formData.perceptions[0]}
                  onChange={(e) => updateArrayField("perceptions", 0, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="2. Perception two"
                  value={formData.perceptions[1]}
                  onChange={(e) => updateArrayField("perceptions", 1, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md" 
                  placeholder="3. Perception three"
                  value={formData.perceptions[2]}
                  onChange={(e) => updateArrayField("perceptions", 2, e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Alternatives: What other solutions have they tried?</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="1. Alternative one"
                  value={formData.alternatives[0]}
                  onChange={(e) => updateArrayField("alternatives", 0, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="2. Alternative two"
                  value={formData.alternatives[1]}
                  onChange={(e) => updateArrayField("alternatives", 1, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md" 
                  placeholder="3. Alternative three"
                  value={formData.alternatives[2]}
                  onChange={(e) => updateArrayField("alternatives", 2, e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">How is your product better than the alternatives?</label>
                <textarea 
                  className="w-full p-2 border rounded-md" 
                  rows={3} 
                  placeholder="Explain how you're better..."
                  value={formData.alternativesDiff}
                  onChange={(e) => setFormData({ ...formData, alternativesDiff: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Life Events: Are there specific life events that typically trigger a purchase?</label>
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="1. Life event one"
                  value={formData.lifeEvents[0]}
                  onChange={(e) => updateArrayField("lifeEvents", 0, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md mb-2" 
                  placeholder="2. Life event two"
                  value={formData.lifeEvents[1]}
                  onChange={(e) => updateArrayField("lifeEvents", 1, e.target.value)}
                />
                <input 
                  type="text" 
                  className="w-full p-2 border rounded-md" 
                  placeholder="3. Life event three"
                  value={formData.lifeEvents[2]}
                  onChange={(e) => updateArrayField("lifeEvents", 2, e.target.value)}
                />
              </div>
            </section>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDiscoveryDialogOpen(false)} disabled={isGenerating}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Ad Creatives...
                  </>
                ) : (
                  "Save & Generate Ads"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generated Ads Dialog */}
      <Dialog open={showAdsDialog} onOpenChange={setShowAdsDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Generated Facebook Ad Creatives
            </DialogTitle>
            <DialogDescription>
              {generatedAds.length} ad concepts based on your brand discovery
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
            {generatedAds.map((ad, index) => (
              <Card key={ad.id || index} className="border-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {ad.angle}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-600 mb-1">📸 Image Description</h4>
                    <p className="text-sm bg-gray-50 p-3 rounded">{ad.imageDescription}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-600 mb-1">🖼️ Image Copy</h4>
                    <p className="text-sm bg-gray-50 p-3 rounded font-medium">{ad.imageCopy}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-600 mb-1">📰 Headline</h4>
                    <p className="text-base font-bold">{ad.headline}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-600 mb-1">📝 Primary Text</h4>
                    <p className="text-sm leading-relaxed">{ad.primaryText}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setShowAdsDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
}

function ToolCard({ icon, title, description, onClick, disabled }: ToolCardProps) {
  return (
    <Card 
      className={`hover:shadow-lg transition-shadow ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={disabled ? undefined : onClick}
    >
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          {icon}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {!disabled && (
        <CardContent>
          <Button variant="outline" size="sm" className="w-full">
            Open Tool
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
