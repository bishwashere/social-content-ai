"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, MessageSquare, ArrowUp, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";
import Cookies from "js-cookie";
import { IDEAS_ADMIN_TOKEN_COOKIE_NAME } from "@/constants/common";
import type { RedditPost } from "@/backend-apis/metrics/actions";
import type { HackerNewsPost } from "@/backend-apis/metrics/hooks";

// Decode HTML entities and format HTML tags
const decodeAndFormatHtml = (html: string): string => {
  if (!html) return "";
  
  // Create a temporary element to decode HTML entities
  const textarea = document.createElement("textarea");
  textarea.innerHTML = html;
  let decoded = textarea.value;
  
  // Replace HTML tags with readable format
  decoded = decoded
    .replace(/<p>/g, "\n\n") // Paragraphs become double newlines
    .replace(/<\/p>/g, "")
    .replace(/<br\s*\/?>/gi, "\n") // Line breaks
    .replace(/<i>/g, "*") // Italic start
    .replace(/<\/i>/g, "*") // Italic end
    .replace(/<b>/g, "**") // Bold start
    .replace(/<\/b>/g, "**") // Bold end
    .replace(/<strong>/g, "**") // Strong start
    .replace(/<\/strong>/g, "**") // Strong end
    .replace(/<em>/g, "*") // Emphasis start
    .replace(/<\/em>/g, "*") // Emphasis end
    .replace(/<a\s+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi, "$2 ($1)") // Links: text (url)
    .replace(/<[^>]+>/g, "") // Remove any remaining HTML tags
    .trim();
  
  return decoded;
};

const CATEGORIES = [
  { name: "AI", keywords: ["artificial intelligence", "AI", "machine learning", "deep learning"] },
  { name: "Technology", keywords: ["technology", "tech", "software", "innovation"] },
  { name: "Investing", keywords: ["investing", "investment", "portfolio", "stocks"] },
  { name: "Crypto", keywords: ["cryptocurrency", "crypto", "bitcoin", "blockchain"] },
  { name: "Stocks", keywords: ["stocks", "trading", "market", "finance"] },
];

const CACHE_KEY_PREFIX = "trending_posts_cache_";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

type TrendingData = {
  reddit: RedditPost[];
  hackernews: HackerNewsPost[];
};

type CachedData = {
  data: TrendingData;
  timestamp: number;
};

// Cache utility functions
const getCacheKey = (categoryName: string): string => {
  return `${CACHE_KEY_PREFIX}${categoryName}`;
};

const getCachedData = (categoryName: string): TrendingData | null => {
  if (typeof window === "undefined") return null;
  
  try {
    const cacheKey = getCacheKey(categoryName);
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const parsed: CachedData = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid (within 5 minutes)
    if (now - parsed.timestamp < CACHE_DURATION) {
      return parsed.data;
    }
    
    // Cache expired, remove it
    localStorage.removeItem(cacheKey);
    return null;
  } catch (error) {
    console.error("Error reading cache:", error);
    return null;
  }
};

const setCachedData = (categoryName: string, data: TrendingData): void => {
  if (typeof window === "undefined") return;
  
  try {
    const cacheKey = getCacheKey(categoryName);
    const cacheData: CachedData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Error setting cache:", error);
  }
};

type CategoryTrendingProps = {
  onStartIdea?: (data: { title: string; content: string; tags: string[] }) => void;
};

export function CategoryTrending({ onStartIdea }: CategoryTrendingProps = {}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [trendingData, setTrendingData] = useState<TrendingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [generatingIdea, setGeneratingIdea] = useState<string | null>(null);

  const handleCategoryClick = async (category: typeof CATEGORIES[0]) => {
    setSelectedCategory(category.name);
    setLoading(true);
    setTrendingData(null);

    try {
      // Check cache first
      const cachedData = getCachedData(category.name);
      if (cachedData) {
        setTrendingData(cachedData);
        setLoading(false);
        return;
      }

      // Cache miss or expired, fetch from API
      const token = Cookies.get(IDEAS_ADMIN_TOKEN_COOKIE_NAME) || localStorage.getItem("nextpostai_ideas_admin_token") || "";
      const keywords = category.keywords.join(",");
      
      const response = await fetch(`/api/ideas/admin/trending?keywords=${encodeURIComponent(keywords)}&maxPosts=2`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => null);
        throw new Error(errorResult?.message || "Failed to fetch trending posts");
      }

      const result = await response.json();
      const fetchedData = result.data;
      
      // Store in cache
      setCachedData(category.name, fetchedData);
      setTrendingData(fetchedData);
    } catch (error) {
      console.error("Error fetching trending posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const allPosts = [
    ...(trendingData?.reddit.map((post, index) => ({ type: "reddit" as const, post, id: `reddit-${index}` })) || []),
    ...(trendingData?.hackernews.map((post, index) => ({ type: "hackernews" as const, post, id: `hackernews-${index}` })) || []),
  ];

  const handlePostClick = (postId: string) => {
    setExpandedPostId(expandedPostId === postId ? null : postId);
  };

  const handleStartIdea = async (post: RedditPost | HackerNewsPost, type: "reddit" | "hackernews") => {
    if (!onStartIdea) return;
    
    const postId = type === "reddit" ? (post as RedditPost).id : (post as HackerNewsPost).id;
    setGeneratingIdea(postId);

    try {
      const token = Cookies.get(IDEAS_ADMIN_TOKEN_COOKIE_NAME) || localStorage.getItem("nextpostai_ideas_admin_token") || "";
      const postTitle = post.title;
      const postBody = type === "reddit" 
        ? (post as RedditPost).selftext || postTitle
        : decodeAndFormatHtml((post as HackerNewsPost).text) || postTitle;

      const response = await fetch("/api/ideas/admin/generate-from-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          postTitle,
          postBody,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate idea content");
      }

      const result = await response.json();
      onStartIdea(result.data);
    } catch (error) {
      console.error("Error generating idea:", error);
    } finally {
      setGeneratingIdea(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Category Buttons */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((category) => (
          <Button
            key={category.name}
            variant={selectedCategory === category.name ? "default" : "outline"}
            onClick={() => handleCategoryClick(category)}
            disabled={loading}
          >
            {category.name}
          </Button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Posts Grid */}
      {!loading && trendingData && allPosts.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {allPosts.map((item) => {
              const isExpanded = expandedPostId === item.id;
              return (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handlePostClick(item.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-end gap-2">
                      {item.type === "reddit" && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ArrowUp className="h-3 w-3" />
                          {(item.post as RedditPost).score}
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-sm line-clamp-2 mt-2">
                      {item.post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.type === "reddit" && (
                        <>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {(item.post as RedditPost).num_comments}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-current"></span>
                            <span>Reddit</span>
                          </span>
                        </>
                      )}
                      {item.type === "hackernews" && (
                        <>
                          <span>by {(item.post as HackerNewsPost).author}</span>
                          <span className="flex items-center gap-1">
                            <span className="h-1 w-1 rounded-full bg-current"></span>
                            <span>HackerNews</span>
                          </span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {/* Expanded Content - Full Width */}
          {expandedPostId && (() => {
            const expandedItem = allPosts.find(item => item.id === expandedPostId);
            if (!expandedItem) return null;
            
            return (
              <Card className="mt-4 w-full">
                <CardContent className="pt-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">{expandedItem.post.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      {expandedItem.type === "reddit" && (
                        <>
                          <span>r/{(expandedItem.post as RedditPost).subreddit}</span>
                          <span>by u/{(expandedItem.post as RedditPost).author}</span>
                          <span className="flex items-center gap-1">
                            <ArrowUp className="h-3 w-3" />
                            {(expandedItem.post as RedditPost).score}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {(expandedItem.post as RedditPost).num_comments}
                          </span>
                        </>
                      )}
                      {expandedItem.type === "hackernews" && (
                        <>
                          <span>by {(expandedItem.post as HackerNewsPost).author}</span>
                          <span className="flex items-center gap-1">
                            <ArrowUp className="h-3 w-3" />
                            {(expandedItem.post as HackerNewsPost).score}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {(expandedItem.post as HackerNewsPost).num_comments}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none mb-4">
                    {expandedItem.type === "reddit" && (
                      <p className="whitespace-pre-wrap text-sm">
                        {(expandedItem.post as RedditPost).selftext || "No content available"}
                      </p>
                    )}
                    {expandedItem.type === "hackernews" && (
                      <p className="whitespace-pre-wrap text-sm">
                        {decodeAndFormatHtml((expandedItem.post as HackerNewsPost).text) || "No content available"}
                      </p>
                    )}
                  </div>
                  <div className="pt-4 border-t flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={
                          expandedItem.type === "reddit"
                            ? (() => {
                                const p = expandedItem.post as RedditPost;
                                const raw = (p.url || p.permalink || "").trim();
                                const norm = (s: string) => s.replace(/^https?\/\//i, "https://");
                                if (!raw) return "https://www.reddit.com";
                                if (!raw.startsWith("http")) {
                                  const path = raw.startsWith("/") ? raw : `/${raw}`;
                                  return `https://www.reddit.com${path}`;
                                }
                                let url = norm(raw);
                                const doubleMatch = url.match(/reddit\.com(https?\/\/[^\s]+)/i);
                                if (doubleMatch) url = norm(doubleMatch[1]);
                                return url;
                              })()
                            : `https://news.ycombinator.com/item?id=${(expandedItem.post as HackerNewsPost).id}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Original
                      </a>
                    </Button>
                    {onStartIdea && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleStartIdea(expandedItem.post, expandedItem.type)}
                        disabled={generatingIdea === expandedItem.id}
                        className="flex items-center gap-2"
                      >
                        {generatingIdea === expandedItem.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Start idea from this
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </>
      )}

      {/* No Results */}
      {!loading && trendingData && allPosts.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No posts found for this category
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading Dialog for AI Generation */}
      <Dialog open={!!generatingIdea} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <DialogDescription className="text-center text-lg font-medium">
              Generating your idea...
            </DialogDescription>
            <p className="text-sm text-muted-foreground text-center">
              Our AI is analyzing the post and creating a structured article with title, content, and tags.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
