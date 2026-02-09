"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Loader2, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { VoiceInput } from "./voice-input";
import Cookie from "js-cookie";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export type DashboardChatMode = "chat" | "start-project";

interface DashboardChatProps {
  initialMessage: string;
  onBack: () => void;
  userName?: string | null;
  mode?: DashboardChatMode;
}

export function DashboardChat({
  initialMessage,
  onBack,
  userName,
  mode = "chat",
}: DashboardChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Track the start-project flow phase: "ask-name" → "creating" → "done"
  const [projectPhase, setProjectPhase] = useState<"ask-name" | "creating" | "done">("ask-name");

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }, 50);
      });
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string, history: ChatMessage[]) => {
      const token = Cookie.get(AUTH_TOKEN_COOKIE_NAME);

      try {
        const res = await fetch("/api/dashboard-chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: content,
            history: history.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          return data.data?.reply || data.reply || "Sorry, I couldn't generate a response.";
        } else {
          const errorData = await res.json().catch(() => ({}));
          return errorData.message || "Something went wrong. Please try again.";
        }
      } catch {
        return "Network error. Please check your connection and try again.";
      }
    },
    []
  );

  // Create a project via the API
  const createProject = useCallback(
    async (name: string) => {
      const token = Cookie.get(AUTH_TOKEN_COOKIE_NAME);

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, url: "", description: "" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create project");
      }

      const data = await res.json();
      return data.data as { id: string; name: string };
    },
    []
  );

  // Handle sending a message (from user typing or voice)
  const handleSend = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      // ── Start-project flow ──
      if (mode === "start-project" && projectPhase === "ask-name") {
        const projectName = content.trim();

        const userMsg: ChatMessage = {
          id: `user-${Date.now()}`,
          role: "user",
          content: projectName,
        };
        setMessages((prev) => [...prev, userMsg]);
        setIsLoading(true);
        setProjectPhase("creating");
        scrollToBottom();

        try {
          const project = await createProject(projectName);

          // Invalidate projects cache so sidebar / dashboard refreshes
          queryClient.invalidateQueries({ queryKey: ["projects"] });

          const successMsg: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: `Your project **"${project.name}"** has been created! Taking you there now...`,
          };
          setMessages((prev) => [...prev, successMsg]);
          setIsLoading(false);
          setProjectPhase("done");
          scrollToBottom();

          // Navigate after a short pause so the user sees the success message
          setTimeout(() => {
            router.push(`/project/${project.id}?tab=campaign`);
          }, 1200);
        } catch (error: any) {
          const errorMsg: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: `Something went wrong: ${error.message || "Could not create the project."}. Please try again.`,
          };
          setMessages((prev) => [...prev, errorMsg]);
          setIsLoading(false);
          setProjectPhase("ask-name");
          scrollToBottom();
        }

        return;
      }

      // ── Normal AI chat flow ──
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: content.trim(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      scrollToBottom();

      const updatedHistory = [...messages, userMsg];
      const reply = await sendMessage(content.trim(), updatedHistory);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: reply,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsLoading(false);
      scrollToBottom();
    },
    [isLoading, messages, sendMessage, scrollToBottom, mode, projectPhase, createProject, queryClient, router]
  );

  // Initialize chat on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (mode === "start-project") {
      // Seed the conversation with a hardcoded exchange – no AI call
      const firstName = userName?.split(" ")[0];
      setMessages([
        {
          id: "user-init",
          role: "user",
          content: "Start a project",
        },
        {
          id: "assistant-init",
          role: "assistant",
          content: `Great${firstName ? `, ${firstName}` : ""}! What would you like to name your new project?`,
        },
      ]);
    } else if (initialMessage) {
      handleSend(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage, mode]);

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Chat Header */}
      <div className="flex items-center gap-3 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-500" />
          <h2 className="text-lg font-semibold text-foreground">Chat</h2>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto scrollbar-hide space-y-4 pb-4"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
            )}

            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "bg-violet-600 text-white dark:bg-violet-500"
                  : "bg-muted text-foreground border border-border"
              )}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>

            {msg.role === "user" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="bg-muted border border-border rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input at bottom */}
      <div className="flex-shrink-0 pt-4 pb-2 border-t border-border">
        {mode === "start-project" && projectPhase === "done" ? (
          <p className="text-sm text-muted-foreground text-center py-2">Redirecting to your project...</p>
        ) : (
          <VoiceInput
            onSubmit={handleSend}
            placeholder={
              mode === "start-project" && projectPhase === "ask-name"
                ? "Enter your project name..."
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
