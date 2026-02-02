"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { IDEAS_ADMIN_TOKEN_COOKIE_NAME } from "@/constants/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Save, Send, Loader2, Eye } from "lucide-react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Idea {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  tags: string[];
  thumbnail: string | null;
  status: "draft" | "published";
  publishedAt: string | null;
}

export default function EditIdeaPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = Cookies.get(IDEAS_ADMIN_TOKEN_COOKIE_NAME) || localStorage.getItem("nextpostai_ideas_admin_token") || "";
      if (!token) {
        router.push("/ideas/admin/login");
        return;
      }

      try {
        const response = await fetch("/api/ideas/admin/verify", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (response.ok && result.data?.authenticated) {
          setIsAuthenticated(true);
        } else {
          // Not authenticated as admin, just redirect (don't clear tokens)
          router.push("/ideas/admin/login");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        // Error checking, just redirect (don't clear tokens)
        router.push("/ideas/admin/login");
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [router]);

  // Fetch idea
  const { data: idea, isLoading, error } = useQuery<Idea>({
    queryKey: ["idea", id],
    queryFn: async () => {
      const token = Cookies.get(IDEAS_ADMIN_TOKEN_COOKIE_NAME) || localStorage.getItem("nextpostai_ideas_admin_token") || "";
      const response = await fetch(`/api/ideas/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to fetch idea" }));
        throw new Error(errorData.message || "Failed to fetch idea");
      }
      const result = await response.json();
      if (!result.data) {
        throw new Error("Idea not found");
      }
      return result.data;
    },
    enabled: !!id && isAuthenticated,
    retry: 1,
  });

  // Populate form when idea loads
  useEffect(() => {
    if (idea) {
      setTitle(idea.title);
      setSummary(idea.summary);
      setContent(idea.content);
      setTags(idea.tags || []);
      setThumbnail(idea.thumbnail || "");
      setStatus(idea.status);
    }
  }, [idea]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = Cookies.get(IDEAS_ADMIN_TOKEN_COOKIE_NAME) || localStorage.getItem("nextpostai_ideas_admin_token") || "";
      const response = await fetch(`/api/ideas/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update idea");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["idea", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-ideas"] });
      router.push("/ideas/admin");
    },
  });

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      title,
      summary,
      content,
      tags,
      thumbnail: thumbnail || null,
      status,
      publishedAt:
        status === "published" && !idea?.publishedAt
          ? new Date().toISOString()
          : idea?.publishedAt || null,
    });
  };

  if (isCheckingAuth || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login
  }

  if (!idea && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {error instanceof Error ? error.message : "Idea not found"}
            </p>
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => router.push("/ideas/admin")}>
                Back to Ideas
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Idea</h1>
        <p className="text-muted-foreground mt-2">Update your idea article</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Enter article title"
                />
              </div>

              <div>
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Brief summary of the article"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="thumbnail">Thumbnail URL</Label>
                <Input
                  id="thumbnail"
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="/image.png"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={status}
                  onValueChange={(v: "draft" | "published") => setStatus(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="content">MDX Content *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  placeholder="Write your article content in MDX format..."
                  rows={20}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add a tag"
                />
                <Button type="button" onClick={addTag} variant="outline">
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            {idea?.slug && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/ideas/${idea.slug}?preview=true`} target="_blank">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Link>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : status === "published" ? (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Update & Publish
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
