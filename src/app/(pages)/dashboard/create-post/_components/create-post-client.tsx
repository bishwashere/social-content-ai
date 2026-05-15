"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import AdvanceCustomization from "../../_components/advance-customization";

export default function CreatePostClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const hint = searchParams.get("hint") || "";
  const articleTitle = searchParams.get("title") || "";
  const source = searchParams.get("source") || "";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              Create Post from World Event
            </h1>
          </div>

          {articleTitle && (
            <div className="mt-3 flex items-start gap-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl px-4 py-3">
              <Newspaper className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">
                  {source ? `Trending on ${source}` : "Trending Article"}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 font-medium">
                  {articleTitle}
                </p>
              </div>
            </div>
          )}

          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            The prompt below is pre-filled with context from the article. Adjust it or generate straight away — posts will be created for all platforms.
          </p>
        </div>

        {/* Post Creator */}
        <AdvanceCustomization initialPrompt={hint} />
      </div>
    </div>
  );
}
