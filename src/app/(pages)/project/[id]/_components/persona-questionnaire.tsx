"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Send, Bot, User, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

interface PersonaQuestionnaireProps {
  projectId: string;
  setGeneratedPersonas: React.Dispatch<React.SetStateAction<PersonaResult[]>>;
  onComplete?: () => void;
  onCancel?: () => void;
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

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  section?: string;
}

// Define all questions in order
const questions = [
  {
    id: "productName",
    section: "Product / Service",
    question: "Hey! Let's find your ideal buyer personas. What is your product or service name?",
    required: true,
    type: "text" as const,
    placeholder: "Enter your product name",
    hint: null,
  },
  {
    id: "productDescription",
    section: "Product / Service",
    question: "Great! Describe your product or service in one sentence:",
    required: true,
    type: "text" as const,
    placeholder: "One sentence description",
    hint: null,
  },
  {
    id: "productCategory",
    section: "Product / Service",
    question: "What category does your product fall into?",
    type: "text" as const,
    placeholder: "e.g., SaaS, E-commerce, Health & Wellness, Education...",
    hint: null,
  },
  {
    id: "priceRange",
    section: "Product / Service",
    question: "What is the price range of your product?",
    type: "text" as const,
    placeholder: "e.g., $29/mo, $99-$299, Free with premium tier...",
    hint: null,
  },
  {
    id: "uniqueValue",
    section: "Product / Service",
    question: "What makes your product uniquely valuable?",
    type: "textarea" as const,
    placeholder: "What's your unique value proposition that sets you apart...",
    hint: null,
  },
  {
    id: "currentCustomers",
    section: "Current Customers",
    question: "Now let's talk about your customers. Describe your current or ideal customers:",
    type: "textarea" as const,
    placeholder: "Who are they? What do they do? What are they like?",
    hint: null,
  },
  {
    id: "ageGroups",
    section: "Current Customers",
    question: "What age groups are most likely to buy? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\n25-34\n35-44\n18-24",
    hint: "Enter each age group on a new line",
  },
  {
    id: "genderSplit",
    section: "Current Customers",
    question: "What's the gender breakdown of your customers?",
    type: "text" as const,
    placeholder: "e.g., 60% female, 40% male or evenly split...",
    hint: null,
  },
  {
    id: "topLocations",
    section: "Current Customers",
    question: "Where are your top customers located? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nUnited States\nEurope\nUrban areas",
    hint: "Enter each location on a new line",
  },
  {
    id: "occupations",
    section: "Current Customers",
    question: "What occupations do your customers typically have? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nMarketing Manager\nSmall Business Owner\nFreelancer",
    hint: "Enter each occupation on a new line",
  },
  {
    id: "discoveryChannels",
    section: "Buying Behavior",
    question: "Let's explore buying behavior. How do customers typically find your product? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nGoogle Search\nInstagram Ads\nWord of mouth",
    hint: "Enter each channel on a new line",
  },
  {
    id: "purchaseTriggers",
    section: "Buying Behavior",
    question: "What triggers someone to buy your product? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nPain event at work\nStarting a new business\nFrustration with current tools",
    hint: "Enter each trigger on a new line",
  },
  {
    id: "commonObjections",
    section: "Buying Behavior",
    question: "What are common objections or hesitations before buying? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nToo expensive\nAlready using a competitor\nNot sure it'll work for us",
    hint: "Enter each objection on a new line",
  },
  {
    id: "buyingCycleLength",
    section: "Buying Behavior",
    question: "How long does it typically take from first awareness to purchase?",
    type: "text" as const,
    placeholder: "e.g., Same day, 1-2 weeks, 1-3 months...",
    hint: null,
  },
  {
    id: "customerGoals",
    section: "Goals & Pain Points",
    question: "Almost there! What are your customers' top goals? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nGrow revenue faster\nSave time on repetitive tasks\nBuild a stronger brand",
    hint: "Enter each goal on a new line",
  },
  {
    id: "frustrations",
    section: "Goals & Pain Points",
    question: "What frustrations do they experience related to your product's space? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nToo many tools to manage\nHigh costs with low ROI\nLack of actionable insights",
    hint: "Enter each frustration on a new line",
  },
  {
    id: "motivations",
    section: "Goals & Pain Points",
    question: "What motivates them to seek a solution? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nFalling behind competitors\nBoss demanding results\nDesire to level up",
    hint: "Enter each motivation on a new line",
  },
  {
    id: "fears",
    section: "Goals & Pain Points",
    question: "Last one! What fears or concerns do they have about buying? List up to 3, one per line.",
    type: "array" as const,
    count: 3,
    placeholder: "e.g.\nWasting money on another tool\nToo hard to learn\nWon't get team buy-in",
    hint: "Enter each fear on a new line",
  },
];

export function PersonaQuestionnaire({
  projectId,
  setGeneratedPersonas,
  onComplete,
  onCancel,
}: PersonaQuestionnaireProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      const items = value
        .split(/\n/)
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

    // Check required
    if (currentQuestion.required && !trimmed) {
      toast.error("This question is required. Please provide an answer.");
      return;
    }

    // Save the answer
    if (trimmed) {
      saveAnswer(currentStep, trimmed);
    }

    // Add user message to chat
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
    // Save the last answer if provided
    if (lastAnswer !== undefined && lastAnswer.trim()) {
      saveAnswer(currentStep, lastAnswer);
    }

    // Build final form data
    const finalFormData = { ...formData };
    if (lastAnswer !== undefined && lastAnswer.trim()) {
      const question = questions[currentStep];
      if (question.type === "array") {
        const items = lastAnswer
          .split(/\n/)
          .map((s) => s.trim())
          .filter(Boolean);
        const count = question.count || 3;
        while (items.length < count) items.push("");
        (finalFormData as any)[question.id] = items.slice(0, count);
      } else {
        (finalFormData as any)[question.id] = lastAnswer.trim();
      }
    }

    // Validate required fields
    if (!finalFormData.productName || !finalFormData.productDescription) {
      toast.error("Missing Information", {
        description: "Please provide at least the product name and description.",
      });
      return;
    }

    setIsGenerating(true);

    // Add a "generating" message
    setChatMessages((prev) => [
      ...prev,
      {
        id: "generating",
        role: "assistant",
        content: "Thanks for all the details! Generating your buyer personas now...",
      },
    ]);

    try {
      const response = await fetch("/api/persona-discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          ...finalFormData,
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
      onComplete?.();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Error", {
        description: error.message || "Failed to generate personas. Please try again.",
      });
      // Remove the generating message
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
          <div className="h-9 w-9 rounded-full bg-purple-600 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Persona Finder</h2>
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
            className="h-full bg-purple-600 rounded-full transition-all duration-500 ease-out"
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
              <div className="shrink-0 h-7 w-7 rounded-full bg-purple-600/20 flex items-center justify-center mt-0.5">
                <Bot className="h-4 w-4 text-purple-400" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                msg.role === "assistant"
                  ? "bg-muted text-foreground"
                  : "bg-purple-600 text-white"
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
                      <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full mb-2">
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
            <div className="shrink-0 h-7 w-7 rounded-full bg-purple-600/20 flex items-center justify-center mt-0.5">
              <Bot className="h-4 w-4 text-purple-400" />
            </div>
            <div className="bg-muted rounded-2xl px-5 py-3.5">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="flex gap-3 justify-start">
            <div className="shrink-0 h-7 w-7 rounded-full bg-purple-600/20 flex items-center justify-center mt-0.5">
              <Bot className="h-4 w-4 text-purple-400" />
            </div>
            <div className="bg-muted rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating your personas...
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
                "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent",
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
              className="h-10 w-10 rounded-xl bg-purple-600 hover:bg-purple-700 shrink-0"
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
            ? "This is the last question — send to find your personas"
            : isMultiline
              ? "Enter each item on a new line"
              : "Press Enter to send"}
        </p>
      </div>
    </div>
  );
}
