"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2, LogOut } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
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

  // Check admin authentication and clear non-admin sessions
  useEffect(() => {
    const checkAuth = async () => {
      const token = Cookies.get(AUTH_TOKEN_COOKIE_NAME) || localStorage.getItem("nextpostai_token") || "";
      if (!token) {
        // Clear any stale tokens
        Cookies.remove(AUTH_TOKEN_COOKIE_NAME);
        localStorage.removeItem("nextpostai_token");
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
          // Not admin - clear tokens and redirect
          Cookies.remove(AUTH_TOKEN_COOKIE_NAME);
          localStorage.removeItem("nextpostai_token");
          setIsAuthenticated(false);
        }
      } catch (error) {
        // Error - clear tokens
        console.error("Auth verification error:", error);
        Cookies.remove(AUTH_TOKEN_COOKIE_NAME);
        localStorage.removeItem("nextpostai_token");
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
        Cookies.set(AUTH_TOKEN_COOKIE_NAME, token, {
          expires: 30,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });

        localStorage.setItem("nextpostai_token", token);

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
      const token = Cookies.get(AUTH_TOKEN_COOKIE_NAME) || localStorage.getItem("nextpostai_token") || "";
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
      const token = Cookies.get(AUTH_TOKEN_COOKIE_NAME) || localStorage.getItem("nextpostai_token") || "";
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
    Cookies.remove(AUTH_TOKEN_COOKIE_NAME);
    localStorage.removeItem("nextpostai_token");
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
    <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Manage Ideas</h1>
          <p className="text-muted-foreground mt-2">
            Create, edit, and manage your ideas articles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/ideas/admin/new">
              <Plus className="mr-2 h-4 w-4" />
              New Idea
            </Link>
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
              <Button asChild>
                <Link href="/ideas/admin/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Idea
                </Link>
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
    </div>
  );
}
