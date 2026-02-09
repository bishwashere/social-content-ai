"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Loader2, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { VoiceInput } from "./voice-input";
import Cookie from "js-cookie";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface DashboardChatProps {
  initialMessage: string;
  onBack: () => void;
  userName?: string | null;
}

export function DashboardChat({
  initialMessage,
  onBack,
  userName,
}: DashboardChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

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

  // Handle sending a message (from user typing or voice)
  const handleSend = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

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
    [isLoading, messages, sendMessage, scrollToBottom]
  );

  // Send the initial message on mount
  useEffect(() => {
    if (!hasInitialized.current && initialMessage) {
      hasInitialized.current = true;
      handleSend(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

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
        <VoiceInput onSubmit={handleSend} />
      </div>
    </div>
  );
}
