"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, ArrowUp, Settings, X, Plus, ChevronDown, ChevronUp, Sparkles, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Cookie from "js-cookie";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
import { toast } from "sonner";
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

const ALL_CATEGORIES = [
  { name: "AI", keywords: ["artificial intelligence", "AI", "machine learning", "deep learning"] },
  { name: "Technology", keywords: ["technology", "tech", "software", "innovation"] },
  { name: "Investing", keywords: ["investing", "investment", "portfolio", "stocks"] },
  { name: "Crypto", keywords: ["cryptocurrency", "crypto", "bitcoin", "blockchain"] },
  { name: "Stocks", keywords: ["stocks", "trading", "market", "finance"] },
];

const DEFAULT_TOPICS = ["AI", "Technology", "Investing", "Crypto", "Stocks"];

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

// Collapsible section wrapper component
export function NewsTrendingSection() {
  // Expanded by default so users don't need to click "Get Inspired..."
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="space-y-3" data-dashboard-section="news-trending">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-lg font-semibold hover:opacity-80 transition-opacity cursor-pointer group text-left"
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform flex-shrink-0" />
          )}
          <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <span>Get Inspired from world events</span>
        </button>
        <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
          <NewsTrendingSettingsButton />
        </div>
      </div>
      {isExpanded && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <NewsTrending />
        </div>
      )}
    </div>
  );
}

// Settings button component that can be used in the header
export function NewsTrendingSettingsButton() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userTopics, setUserTopics] = useState<string[]>(DEFAULT_TOPICS);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(DEFAULT_TOPICS);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [newTopicInput, setNewTopicInput] = useState("");

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const token = Cookie.get(AUTH_TOKEN_COOKIE_NAME);
        const response = await fetch("/api/user/news-preferences", {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (response.ok) {
          const result = await response.json();
          const topics = result.data?.topics || DEFAULT_TOPICS;
          setUserTopics(topics);
          setSelectedTopics(topics);
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
      } finally {
        setLoadingPreferences(false);
      }
    };

    loadPreferences();
  }, []);

  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    try {
      const token = Cookie.get(AUTH_TOKEN_COOKIE_NAME);
      const response = await fetch("/api/user/news-preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ topics: selectedTopics }),
      });

      if (response.ok) {
        setUserTopics(selectedTopics);
        setSettingsOpen(false);
        toast.success("News preferences saved successfully");
        // Trigger a custom event to notify NewsTrending component
        window.dispatchEvent(new CustomEvent("newsPreferencesUpdated", { detail: { topics: selectedTopics } }));
      } else {
        throw new Error("Failed to save preferences");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleTopicToggle = (topicName: string) => {
    setSelectedTopics(prev => {
      if (prev.includes(topicName)) {
        return prev.filter(t => t !== topicName);
      } else {
        return [...prev, topicName];
      }
    });
  };

  const handleAddCustomTopic = () => {
    const trimmed = newTopicInput.trim();
    if (!trimmed || trimmed.length === 0) return;
    
    // Check for duplicates (case-insensitive)
    const isDuplicate = selectedTopics.some(
      topic => topic.toLowerCase() === trimmed.toLowerCase()
    );
    
    if (!isDuplicate) {
      setSelectedTopics(prev => [...prev, trimmed]);
      setNewTopicInput("");
    } else {
      toast.error("This topic already exists");
    }
  };

  const handleRemoveCustomTopic = (topicName: string) => {
    // Only allow removing if it's not the last topic
    if (selectedTopics.length > 1) {
      setSelectedTopics(prev => prev.filter(t => t !== topicName));
    }
  };

  const isPredefinedTopic = (topicName: string) => {
    return ALL_CATEGORIES.some(cat => cat.name === topicName);
  };

  const customTopics = selectedTopics.filter(t => !isPredefinedTopic(t));

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setSettingsOpen(true)}
        className="h-8 w-8 p-0"
      >
        <Settings className="h-4 w-4" />
      </Button>
      <Dialog 
        open={settingsOpen} 
        onOpenChange={(open) => {
          setSettingsOpen(open);
          if (!open) {
            // Reset input when dialog closes
            setNewTopicInput("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select News Topics</DialogTitle>
            <DialogDescription>
              Choose which topics you want to see news about. At least one topic must be selected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Predefined Topics */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Predefined Topics</Label>
              {ALL_CATEGORIES.map((category) => (
                <div key={category.name} className="flex items-center space-x-2">
                  <Checkbox
                    id={`settings-${category.name}`}
                    checked={selectedTopics.includes(category.name)}
                    onCheckedChange={() => handleTopicToggle(category.name)}
                    disabled={selectedTopics.length === 1 && selectedTopics.includes(category.name)}
                  />
                  <Label
                    htmlFor={`settings-${category.name}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {category.name}
                  </Label>
                </div>
              ))}
            </div>

            {/* Custom Topics */}
            <div className="space-y-3 pt-4 border-t">
              <Label className="text-sm font-semibold">Custom Topics</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Type a custom topic..."
                  value={newTopicInput}
                  onChange={(e) => setNewTopicInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomTopic();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomTopic}
                  disabled={
                    !newTopicInput.trim() || 
                    selectedTopics.some(topic => topic.toLowerCase() === newTopicInput.trim().toLowerCase())
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {customTopics.length > 0 && (
                <div className="space-y-2 mt-2">
                  {customTopics.map((topic) => (
                    <div
                      key={topic}
                      className="flex items-center justify-between p-2 rounded-md border bg-slate-50 dark:bg-slate-800"
                    >
                      <span className="text-sm font-medium">{topic}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCustomTopic(topic)}
                        disabled={selectedTopics.length === 1}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedTopics(userTopics);
                setNewTopicInput("");
                setSettingsOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePreferences}
              disabled={savingPreferences || selectedTopics.length === 0}
            >
              {savingPreferences ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function NewsTrending() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [trendingData, setTrendingData] = useState<TrendingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [userTopics, setUserTopics] = useState<string[]>(DEFAULT_TOPICS);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const hasAutoSelectedCategoryRef = useRef(false);

  const handleCreatePost = (post: RedditPost | HackerNewsPost, type: "reddit" | "hackernews") => {
    const title = "title" in post ? post.title : "";
    const body = type === "reddit"
      ? (post as RedditPost).selftext?.slice(0, 400) || ""
      : decodeAndFormatHtml((post as HackerNewsPost).text || "")?.slice(0, 400) || "";
    const source = type === "reddit" ? "Reddit" : "Hacker News";

    const hint = `Write a social media post inspired by this trending story from ${source}: "${title}".${body ? ` Key context: ${body}` : ""}`.trim();

    const params = new URLSearchParams({
      hint,
      title,
      source,
    });
    router.push(`/dashboard/create-post?${params.toString()}`);
  };

  // Load user preferences on mount and listen for updates
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const token = Cookie.get(AUTH_TOKEN_COOKIE_NAME);
        const response = await fetch("/api/user/news-preferences", {
          headers: {
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (response.ok) {
          const result = await response.json();
          const topics = result.data?.topics || DEFAULT_TOPICS;
          setUserTopics(topics);
        }
      } catch (error) {
        console.error("Error loading preferences:", error);
      } finally {
        setLoadingPreferences(false);
      }
    };

    loadPreferences();

    // Listen for preference updates from settings button
    const handlePreferencesUpdate = (event: CustomEvent) => {
      setUserTopics(event.detail.topics);
      // Clear selected category if it's no longer in preferences
      if (selectedCategory && !event.detail.topics.includes(selectedCategory)) {
        setSelectedCategory(null);
        setTrendingData(null);
        setExpandedPostId(null);
      }
    };

    window.addEventListener("newsPreferencesUpdated", handlePreferencesUpdate as EventListener);
    return () => {
      window.removeEventListener("newsPreferencesUpdated", handlePreferencesUpdate as EventListener);
    };
  }, [selectedCategory]);

  // Get categories based on user preferences
  // Include predefined categories that are in user topics
  const predefinedCategories = ALL_CATEGORIES.filter(cat => userTopics.includes(cat.name));
  
  // Get custom topics (topics not in ALL_CATEGORIES)
  const customTopics = userTopics.filter(topic => !ALL_CATEGORIES.some(cat => cat.name === topic));
  
  // Create category objects for custom topics (using topic name as keyword)
  const customCategories = customTopics.map(topic => ({
    name: topic,
    keywords: [topic.toLowerCase()],
  }));
  
  // Combine predefined and custom categories
  const categories = [...predefinedCategories, ...customCategories];

  const handleCategoryClick = useCallback(async (category: typeof ALL_CATEGORIES[0]) => {
    setSelectedCategory(category.name);
    setLoading(true);
    setTrendingData(null);
    setExpandedPostId(null);

    try {
      // Check cache first
      const cachedData = getCachedData(category.name);
      if (cachedData) {
        setTrendingData(cachedData);
        setLoading(false);
        return;
      }

      // Cache miss or expired, fetch from API
      const token = Cookie.get(AUTH_TOKEN_COOKIE_NAME);
      const keywords = category.keywords.join(",");
      
      const response = await fetch(`/api/trending?keywords=${encodeURIComponent(keywords)}&maxPosts=4`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch trending posts");
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
  }, []);

  // Auto-select a random topic once (as if clicked)
  useEffect(() => {
    if (loadingPreferences) return;
    if (loading) return;
    if (selectedCategory) return;
    if (categories.length === 0) return;
    if (hasAutoSelectedCategoryRef.current) return;

    hasAutoSelectedCategoryRef.current = true;

    // Prefer a non-"news" topic if present (for cases where a user adds a "News" topic).
    const nonNewsCategories = categories.filter((c) => !/news/i.test(c.name));
    const candidates = nonNewsCategories.length > 0 ? nonNewsCategories : categories;
    const randomCategory = candidates[Math.floor(Math.random() * candidates.length)];
    handleCategoryClick(randomCategory);
  }, [categories, handleCategoryClick, loading, loadingPreferences, selectedCategory]);

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

  return (
    <div className="space-y-4">
      {/* Category Buttons */}
      {loadingPreferences ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
          <Button
            key={category.name}
            variant={selectedCategory === category.name ? "default" : "outline"}
            onClick={() => handleCategoryClick(category)}
            disabled={loading}
            size="sm"
          >
            {category.name}
          </Button>
        ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8">
          <div className="flex gap-1">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span className="text-sm text-muted-foreground">Getting latest from Reddit & Hacker News</span>
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
                    <CardTitle className="text-sm line-clamp-4 mt-2">
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
                      size="sm"
                      onClick={() => handleCreatePost(expandedItem.post, expandedItem.type)}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Pencil className="h-4 w-4" />
                      Create Post from This
                    </Button>
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
    </div>
  );
}
