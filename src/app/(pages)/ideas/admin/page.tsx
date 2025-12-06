"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2, LogOut, X, Save, Send, ExternalLink, Maximize2 } from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { IDEAS_ADMIN_TOKEN_COOKIE_NAME } from "@/constants/common";
import { toast } from "sonner";
import api from "@/backend-apis/axios";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { CategoryTrending } from "./_components/category-trending";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
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
  status: "draft" | "published";
  publishedAt: string | null;
  tags: string[];
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminIdeasPage() {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ideaToDelete, setIdeaToDelete] = useState<Idea | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [newIdeaSheetOpen, setNewIdeaSheetOpen] = useState(false);
  
  // New idea form state
  const [newIdeaTitle, setNewIdeaTitle] = useState("");
  const [newIdeaSummary, setNewIdeaSummary] = useState("");
  const [newIdeaContent, setNewIdeaContent] = useState("");
  const [newIdeaTags, setNewIdeaTags] = useState<string[]>([]);
  const [newIdeaTagInput, setNewIdeaTagInput] = useState("");
  const [newIdeaThumbnail, setNewIdeaThumbnail] = useState("");
  const [newIdeaStatus, setNewIdeaStatus] = useState<"draft" | "published">("draft");

  // Check admin authentication (only check ideas admin token, don't touch main dashboard session)
  useEffect(() => {
    const checkAuth = async () => {
      const token = Cookies.get(IDEAS_ADMIN_TOKEN_COOKIE_NAME) || localStorage.getItem("nextpostai_ideas_admin_token") || "";
      if (!token) {
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        return;
      }

      // Verify auth by checking if token is admin token
      try {
        const response = await fetch("/api/ideas/admin/verify", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        const result = await response.json();
        if (response.ok && result.data?.authenticated) {
          setIsAuthenticated(true);
        } else {
          // Not admin - just set as not authenticated, don't clear tokens
          setIsAuthenticated(false);
        }
      } catch (error) {
        // Error - just set as not authenticated
        console.error("Auth verification error:", error);
        setIsAuthenticated(false);
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const response = await api.post("/ideas/admin/login", {
        username,
        password,
      });

      if (response.data.status === 200) {
        const token = response.data.data.bearerToken;
        Cookies.set(IDEAS_ADMIN_TOKEN_COOKIE_NAME, token, {
          expires: 30,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });

        localStorage.setItem("nextpostai_ideas_admin_token", token);

        toast.success("Login successful!");
        // Set authenticated state directly
        setIsAuthenticated(true);
        setIsCheckingAuth(false);
      } else {
        toast.error(response.data.message || "Login failed");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.response?.data?.message || error.message || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  // Fetch all ideas (including drafts)
  const { data: ideas, isLoading } = useQuery<Idea[]>({
    queryKey: ["admin-ideas"],
    queryFn: async () => {
      const token = Cookies.get(IDEAS_ADMIN_TOKEN_COOKIE_NAME) || localStorage.getItem("nextpostai_ideas_admin_token") || "";
      const response = await fetch("/api/ideas?includeDrafts=true", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch ideas");
      const result = await response.json();
      return result.data || [];
    },
    enabled: isAuthenticated,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = Cookies.get(IDEAS_ADMIN_TOKEN_COOKIE_NAME) || localStorage.getItem("nextpostai_ideas_admin_token") || "";
      const response = await fetch(`/api/ideas/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete idea");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ideas"] });
      setDeleteDialogOpen(false);
      setIdeaToDelete(null);
    },
  });

  // Create idea mutation
  const createIdeaMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = Cookies.get(IDEAS_ADMIN_TOKEN_COOKIE_NAME) || localStorage.getItem("nextpostai_ideas_admin_token") || "";
      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create idea");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ideas"] });
      // Reset form
      setNewIdeaTitle("");
      setNewIdeaSummary("");
      setNewIdeaContent("");
      setNewIdeaTags([]);
      setNewIdeaTagInput("");
      setNewIdeaThumbnail("");
      setNewIdeaStatus("draft");
      setNewIdeaSheetOpen(false);
      toast.success("Idea created successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create idea");
    },
  });

  const handleAddTag = () => {
    if (newIdeaTagInput.trim() && !newIdeaTags.includes(newIdeaTagInput.trim())) {
      setNewIdeaTags([...newIdeaTags, newIdeaTagInput.trim()]);
      setNewIdeaTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setNewIdeaTags(newIdeaTags.filter((t) => t !== tag));
  };

  const handleCreateIdea = (e: React.FormEvent) => {
    e.preventDefault();
    createIdeaMutation.mutate({
      title: newIdeaTitle,
      summary: newIdeaSummary,
      content: newIdeaContent,
      tags: newIdeaTags,
      thumbnail: newIdeaThumbnail || null,
      status: newIdeaStatus,
      publishedAt: newIdeaStatus === "published" ? new Date().toISOString() : null,
    });
  };

  const handleDelete = (idea: Idea) => {
    setIdeaToDelete(idea);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (ideaToDelete) {
      deleteMutation.mutate(ideaToDelete.id);
    }
  };

  const handleLogout = () => {
    Cookies.remove(IDEAS_ADMIN_TOKEN_COOKIE_NAME);
    localStorage.removeItem("nextpostai_ideas_admin_token");
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    toast.success("Logged out successfully");
  };

  if (isCheckingAuth) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Ideas Admin Login
            </CardTitle>
            <CardDescription className="text-center">
              Enter your admin credentials to manage ideas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  disabled={loginLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  disabled={loginLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="w-full px-4 border-b h-fit relative overflow-hidden flex items-center justify-center">
        <div className="flex h-16 items-center justify-between bg-background w-full md:px-8">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2"
            >
              <NextImage
                src="/logo-transparent.png"
                width="100"
                height="100"
                alt="NextPostAI"
                className="size-6"
              />
              <span className="font-semibold text-lg">NextPostAI</span>
            </Link>
            <span className="text-muted-foreground mx-2">/</span>
            <Link
              href="/ideas"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Ideas
            </Link>
            <span className="text-muted-foreground mx-2">/</span>
            <span className="text-muted-foreground">Admin</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Manage Ideas</h1>
          <p className="text-muted-foreground mt-2">
            Create, edit, and manage your ideas articles
          </p>
        </div>

        {/* Category Trending Section */}
        <div className="mb-8">
          <CategoryTrending 
            onStartIdea={(data) => {
              setNewIdeaTitle(data.title);
              setNewIdeaContent(data.content);
              setNewIdeaTags(data.tags);
              setNewIdeaSheetOpen(true);
            }}
          />
        </div>

        <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold">Your Ideas</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setNewIdeaSheetOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Idea
          </Button>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : ideas && ideas.length > 0 ? (
        <div className="grid gap-4">
          {ideas.map((idea) => (
            <Card key={idea.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-xl">{idea.title}</CardTitle>
                      <Badge
                        variant={idea.status === "published" ? "default" : "secondary"}
                      >
                        {idea.status === "published" ? (
                          <Eye className="mr-1 h-3 w-3" />
                        ) : (
                          <EyeOff className="mr-1 h-3 w-3" />
                        )}
                        {idea.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {idea.summary}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Slug: {idea.slug}</span>
                      {idea.publishedAt && (
                        <span>
                          Published: {new Date(idea.publishedAt).toLocaleDateString()}
                        </span>
                      )}
                      <span>
                        Updated: {new Date(idea.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {idea.tags.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {idea.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                    <Link href={`/ideas/admin/${idea.id}/edit`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                    </Button>
                    {idea.status === "published" && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <Link href={`/ideas/${idea.slug}`} target="_blank">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(idea)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No ideas yet</p>
              <Button onClick={() => setNewIdeaSheetOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Idea
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the idea &quot;{ideaToDelete?.title}&quot;. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Idea Sheet */}
      <Sheet open={newIdeaSheetOpen} onOpenChange={setNewIdeaSheetOpen}>
        <SheetContent 
          side="bottom" 
          className="h-[50vh] max-h-[50vh] overflow-y-auto rounded-tl-2xl rounded-tr-2xl mx-4 mb-4 px-6"
          showOverlay={false}
        >
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle>Create New Idea</SheetTitle>
                <SheetDescription>
                  Write and publish your idea article
                </SheetDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Store form data in localStorage to pass to new tab
                  const formData = {
                    title: newIdeaTitle,
                    summary: newIdeaSummary,
                    content: newIdeaContent,
                    tags: newIdeaTags,
                    thumbnail: newIdeaThumbnail,
                    status: newIdeaStatus,
                  };
                  localStorage.setItem("newIdeaFormData", JSON.stringify(formData));
                  window.open("/ideas/admin/new", "_blank");
                }}
                className="gap-2"
              >
                <Maximize2 className="h-4 w-4" />
                Open in New Tab
              </Button>
            </div>
          </SheetHeader>
          
          <form onSubmit={handleCreateIdea} className="mt-6 space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-title">Title *</Label>
                <Input
                  id="new-title"
                  value={newIdeaTitle}
                  onChange={(e) => setNewIdeaTitle(e.target.value)}
                  required
                  placeholder="Enter article title"
                />
              </div>

              <div>
                <Label htmlFor="new-summary">Summary</Label>
                <Textarea
                  id="new-summary"
                  value={newIdeaSummary}
                  onChange={(e) => setNewIdeaSummary(e.target.value)}
                  placeholder="Brief summary of the article"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="new-thumbnail">Thumbnail URL</Label>
                <Input
                  id="new-thumbnail"
                  value={newIdeaThumbnail}
                  onChange={(e) => setNewIdeaThumbnail(e.target.value)}
                  placeholder="/image.png"
                />
              </div>

              <div>
                <Label htmlFor="new-status">Status</Label>
                <Select value={newIdeaStatus} onValueChange={(v: "draft" | "published") => setNewIdeaStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="new-content">MDX Content *</Label>
                <Textarea
                  id="new-content"
                  value={newIdeaContent}
                  onChange={(e) => setNewIdeaContent(e.target.value)}
                  required
                  placeholder="Write your article content in MDX format..."
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <Label htmlFor="new-tags">Tags</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="new-tags"
                    value={newIdeaTagInput}
                    onChange={(e) => setNewIdeaTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add a tag"
                  />
                  <Button type="button" onClick={handleAddTag} variant="outline">
                    Add
                  </Button>
                </div>
                {newIdeaTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newIdeaTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewIdeaSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createIdeaMutation.isPending}
              >
                {createIdeaMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : newIdeaStatus === "published" ? (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Publish
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </>
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
      </div>
    </div>
  );
}
