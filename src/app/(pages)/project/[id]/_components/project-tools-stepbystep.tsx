"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Send, Bot, User, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface ProjectToolsProps {
  projectId: string;
  setGeneratedAds: React.Dispatch<React.SetStateAction<AdCreative[]>>;
  onComplete?: () => void;
  onCancel?: () => void;
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

export interface AdCreative {
  id: string;
  angle: string;
  imageDescription: string;
  imageCopy: string;
  headline: string;
  primaryText: string;
  imageKey?: string | null;
  imageUrl?: string | null;
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  section?: string;
}

// Define all questions in order
const questions = [
  {
    id: "brandName",
    section: "Your Product",
    question: "Hey! Let's get started with your brand discovery. What is your brand name?",
    required: true,
    type: "text" as const,
    placeholder: "Enter your brand name",
    hint: null,
  },
  {
    id: "productDescription",
    section: "Your Product",
    question: "Great! Now describe the product or service in one sentence:",
    required: true,
    type: "text" as const,
    placeholder: "One sentence description of your product",
    hint: null,
  },
  {
    id: "features",
    section: "Your Product",
    question: "What are the product's main features? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nAI-powered content generation\nMulti-platform scheduling\nAnalytics dashboard",
    hint: "Enter each feature on a new line",
  },
  {
    id: "heroPersona",
    section: "Your Product",
    question: "Who is your Hero Persona — the specific persona you're marketing to?",
    type: "textarea" as const,
    placeholder: "Describe your target persona...",
    hint: null,
  },
  {
    id: "benefits",
    section: "Your Product",
    question: "What are the product's main benefits? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nSaves 10 hours per week\nIncreases engagement by 3x\nReduces content costs",
    hint: "Enter each benefit on a new line",
  },
  {
    id: "buyerQuestions",
    section: "Your Product",
    question: "What are the main questions someone might ask about the product? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nHow much does it cost?\nIs there a free trial?\nDoes it integrate with my tools?",
    hint: "Enter each question on a new line",
  },
  {
    id: "competitors",
    section: "Competition",
    question: "Let's talk about competition. List your top 3 competitors, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nCompetitor A\nCompetitor B\nCompetitor C",
    hint: "Enter each competitor on a new line",
  },
  {
    id: "competitiveDiff",
    section: "Competition",
    question: "How is your product different or better than your competitors?",
    type: "textarea" as const,
    placeholder: "Explain your unique advantages...",
    hint: null,
  },
  {
    id: "testimonials",
    section: "Social Proof",
    question: "Now let's gather some social proof. Paste up to 3 testimonials, separated by blank lines.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\n\"This tool changed how we do marketing!\" — Jane D.\n\n\"We saw 5x ROI in the first month.\" — Mark S.\n\n\"The best investment our team has made.\" — Sarah K.",
    hint: "Separate each testimonial with a blank line",
    isTextarea: true,
  },
  {
    id: "proofPoints",
    section: "Social Proof",
    question: "What proof do you have that your product works? List up to 3 proof points, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\n10,000+ active users\nFeatured in TechCrunch\n4.9 star rating on G2",
    hint: "Enter each proof point on a new line",
  },
  {
    id: "customerDescription",
    section: "Your Customers",
    question: "Let's learn about your customers. How would you describe your ideal customer?",
    type: "textarea" as const,
    placeholder: "Describe your ideal customer...",
    hint: null,
  },
  {
    id: "dreamOutcome",
    section: "Your Customers",
    question: "What is their dream outcome once they buy your product?",
    type: "text" as const,
    placeholder: 'e.g. "I wish I could automate my marketing so that I can focus on growing my business"',
    hint: null,
  },
  {
    id: "jobsToBeDone",
    section: "Your Customers",
    question: "What job(s) are they hiring the product to do? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nCreate social media content faster\nGrow their audience organically\nTrack campaign performance",
    hint: "Enter each job on a new line",
  },
  {
    id: "challenges",
    section: "Your Customers",
    question: "What problems will the product solve for them? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nSpending too much time on content creation\nInconsistent posting schedule\nLow engagement rates",
    hint: "Enter each challenge on a new line",
  },
  {
    id: "emotionalBenefits",
    section: "Your Customers",
    question: "What 3 emotional benefits does the product give them? One per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nConfidence in their marketing\nRelief from content overwhelm\nExcitement about growth",
    hint: "Enter each emotional benefit on a new line",
  },
  {
    id: "transformations",
    section: "Your Customers",
    question: "How will their life change once they buy the product? List up to 3 transformations, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nFrom stressed marketer to strategic thinker\nFrom inconsistent posting to daily engagement\nFrom guessing to data-driven decisions",
    hint: "Enter each transformation on a new line",
  },
  {
    id: "perceptions",
    section: "Your Customers",
    question: "How will others perceive them once they have the product? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nSeen as a marketing expert\nRecognized as an industry leader\nAdmired for their content quality",
    hint: "Enter each perception on a new line",
  },
  {
    id: "alternatives",
    section: "Your Customers",
    question: "What other solutions have they tried? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nHiring freelancers\nUsing generic templates\nDoing everything manually",
    hint: "Enter each alternative on a new line",
  },
  {
    id: "alternativesDiff",
    section: "Your Customers",
    question: "How is your product better than those alternatives?",
    type: "textarea" as const,
    placeholder: "Explain how you're better...",
    hint: null,
  },
  {
    id: "lifeEvents",
    section: "Your Customers",
    question: "Last one! Are there specific life events that typically trigger a purchase? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nLaunching a new business\nScaling past 10 employees\nPreparing for a product launch",
    hint: "Enter each life event on a new line",
  },
];

export function ProjectToolsStepByStep({
  projectId,
  setGeneratedAds,
  onComplete,
  onCancel,
}: ProjectToolsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const totalSteps = questions.length;
  const currentQuestion = questions[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  // Scroll to bottom of chat whenever messages change
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, currentStep, isTyping, scrollToBottom]);

  // Focus textarea when step changes
  useEffect(() => {
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 150);
  }, [currentStep]);

  // Initialize chat with first question
  useEffect(() => {
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          id: "q-0",
          role: "assistant",
          content: questions[0].question,
          section: questions[0].section,
        },
      ]);
    }
  }, [chatMessages.length]);

  // Auto-resize textarea
  const handleTextareaResize = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 160)}px`;
    }
  }, []);

  useEffect(() => {
    handleTextareaResize();
  }, [inputValue, handleTextareaResize]);

  const saveAnswer = (step: number, value: string) => {
    const question = questions[step];
    if (question.type === "array") {
      const separator = (question as any).isTextarea ? /\n\n+/ : /\n/;
      const items = value
        .split(separator)
        .map((s) => s.trim())
        .filter(Boolean);
      const count = question.count || 3;
      while (items.length < count) items.push("");
      setFormData((prev) => ({ ...prev, [question.id]: items.slice(0, count) }));
    } else {
      setFormData((prev) => ({ ...prev, [question.id]: value.trim() }));
    }
  };

  const handleSend = () => {
    const trimmed = inputValue.trim();

    if (currentQuestion.required && !trimmed) {
      toast.error("This question is required. Please provide an answer.");
      return;
    }

    if (trimmed) {
      saveAnswer(currentStep, trimmed);
    }

    const userMsg: ChatMessage = {
      id: `u-${currentStep}`,
      role: "user",
      content: trimmed || "(skipped)",
    };

    if (isLastStep) {
      setChatMessages((prev) => [...prev, userMsg]);
      setInputValue("");
      handleSubmit(trimmed);
      return;
    }

    // Show user message + typing indicator, then reveal AI reply after a short delay
    setChatMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    const nextStep = currentStep + 1;
    const nextQuestion = questions[nextStep];

    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `q-${nextStep}`,
        role: "assistant",
        content: nextQuestion.question,
        section: nextQuestion.section,
      };

      setIsTyping(false);
      setChatMessages((prev) => [...prev, assistantMsg]);
      setCurrentStep(nextStep);
    }, 800);
  };

  const handleSkip = () => {
    if (currentQuestion.required) return;

    const userMsg: ChatMessage = {
      id: `u-${currentStep}`,
      role: "user",
      content: "(skipped)",
    };

    if (isLastStep) {
      setChatMessages((prev) => [...prev, userMsg]);
      handleSubmit("");
      return;
    }

    // Show user message + typing indicator, then reveal AI reply after a short delay
    setChatMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    const nextStep = currentStep + 1;
    const nextQuestion = questions[nextStep];

    setTimeout(() => {
      const assistantMsg: ChatMessage = {
        id: `q-${nextStep}`,
        role: "assistant",
        content: nextQuestion.question,
        section: nextQuestion.section,
      };

      setIsTyping(false);
      setChatMessages((prev) => [...prev, assistantMsg]);
      setCurrentStep(nextStep);
    }, 800);
  };

  const handleSubmit = async (lastAnswer?: string) => {
    if (lastAnswer !== undefined && lastAnswer.trim()) {
      saveAnswer(currentStep, lastAnswer);
    }

    const finalFormData = { ...formData };
    if (lastAnswer !== undefined && lastAnswer.trim()) {
      const question = questions[currentStep];
      if (question.type === "array") {
        const separator = (question as any).isTextarea ? /\n\n+/ : /\n/;
        const items = lastAnswer
          .split(separator)
          .map((s) => s.trim())
          .filter(Boolean);
        const count = question.count || 3;
        while (items.length < count) items.push("");
        (finalFormData as any)[question.id] = items.slice(0, count);
      } else {
        (finalFormData as any)[question.id] = lastAnswer.trim();
      }
    }

    if (!finalFormData.brandName || !finalFormData.productDescription) {
      toast.error("Missing Information", {
        description: "Please provide at least the brand name and product description.",
      });
      return;
    }

    setIsGenerating(true);

    setChatMessages((prev) => [
      ...prev,
      {
        id: "generating",
        role: "assistant",
        content: "Thanks for all the details! Generating your ad creatives now...",
      },
    ]);

    try {
      const response = await fetch("/api/brand-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          ...finalFormData,
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
      onComplete?.();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error", {
        description: "Failed to generate ad creatives. Please try again.",
      });
      setChatMessages((prev) => prev.filter((m) => m.id !== "generating"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (currentQuestion.type === "text") {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    } else {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const isMultiline = currentQuestion?.type === "array" || currentQuestion?.type === "textarea";

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Brand Discovery</h2>
            <p className="text-xs text-muted-foreground">
              Question {currentStep + 1} of {totalSteps} &middot; {currentQuestion?.section}
            </p>
          </div>
        </div>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            Cancel
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="px-1 pb-4 shrink-0">
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-1 space-y-4 pb-4">
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="shrink-0 h-7 w-7 rounded-full bg-blue-600/20 flex items-center justify-center mt-0.5">
                <Bot className="h-4 w-4 text-blue-400" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                msg.role === "assistant"
                  ? "bg-muted text-foreground"
                  : "bg-blue-600 text-white"
              )}
            >
              {msg.section &&
                msg.role === "assistant" &&
                (() => {
                  const prevAssistantMsgs = chatMessages.filter(
                    (m) => m.role === "assistant" && m.section
                  );
                  const myIndex = prevAssistantMsgs.findIndex((m) => m.id === msg.id);
                  const prevSection = myIndex > 0 ? prevAssistantMsgs[myIndex - 1].section : null;
                  if (msg.section !== prevSection) {
                    return (
                      <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full mb-2">
                        {msg.section}
                      </span>
                    );
                  }
                  return null;
                })()}
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center mt-0.5">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-3 justify-start">
            <div className="shrink-0 h-7 w-7 rounded-full bg-blue-600/20 flex items-center justify-center mt-0.5">
              <Bot className="h-4 w-4 text-blue-400" />
            </div>
            <div className="bg-muted rounded-2xl px-5 py-3.5">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="flex gap-3 justify-start">
            <div className="shrink-0 h-7 w-7 rounded-full bg-blue-600/20 flex items-center justify-center mt-0.5">
              <Bot className="h-4 w-4 text-blue-400" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating your ads...
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border px-1 pt-3 pb-1 shrink-0">
        {currentQuestion?.hint && (
          <p className="text-[11px] text-muted-foreground mb-2 px-1">{currentQuestion.hint}</p>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentQuestion?.placeholder || "Type your answer..."}
              disabled={isGenerating || isTyping}
              rows={1}
              className={cn(
                "w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground",
                "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "scrollbar-thin",
                isMultiline ? "min-h-[80px]" : "min-h-[44px]"
              )}
            />
            {isMultiline && (
              <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
                {typeof navigator !== "undefined" && navigator?.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to send
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Button
              size="icon"
              onClick={handleSend}
              disabled={isGenerating || isTyping || (currentQuestion?.required && !inputValue.trim())}
              className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-700 shrink-0"
            >
              {isLastStep && inputValue.trim() ? (
                <Sparkles className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            {!currentQuestion?.required && (
              <Button
                size="icon"
                variant="ghost"
                onClick={handleSkip}
                disabled={isGenerating || isTyping}
                className="h-8 w-10 rounded-xl text-muted-foreground hover:text-foreground shrink-0"
                title="Skip this question"
              >
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
          {isLastStep
            ? "This is the last question — send to generate your ads"
            : isMultiline
              ? "Enter each item on a new line"
              : "Press Enter to send"}
        </p>
      </div>
    </div>
  );
}
