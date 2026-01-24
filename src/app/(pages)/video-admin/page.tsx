"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  LogOut, 
  Users, 
  Video, 
  FolderOpen, 
  Clock, 
  CheckCircle2,
  Copy,
  Play,
  ChevronDown,
  ChevronRight,
  Eye,
  Calendar,
  Mail,
  User as UserIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { VIDEO_ADMIN_TOKEN_COOKIE_NAME } from "@/constants/common";
import { toast } from "sonner";
import api from "@/backend-apis/axios";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UploadedVideo {
  id: string;
  folderId: string;
  text: string;
  day: number | null;
  status: string;
  isPublised: boolean;
  projectId: string | null;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  uploadedVideos: UploadedVideo[];
}

interface UserData {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  remainingChatGenerations: number;
  createdAt: string;
  projects: Project[];
  uploadedVideos: UploadedVideo[];
}

interface Stats {
  totalUsers: number;
  totalVideos: number;
  totalProjects: number;
  pendingVideos: number;
  completedVideos: number;
}

interface VideoDetails {
  video: UploadedVideo & {
    user: { id: string; email: string; name: string | null };
    project: { id: string; name: string } | null;
  };
  files: Array<{
    key: string;
    name: string;
    url: string;
    size: number;
    lastModified: string;
  }>;
  outputVideo?: { url: string; name: string };
  inputVideo?: { url: string; name: string };
  textFile?: { url: string; name: string };
  metadataFile?: { url: string; name: string };
}

export default function VideoAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [previewVideo, setPreviewVideo] = useState<VideoDetails | null>(null);
  const [loadingVideoId, setLoadingVideoId] = useState<string | null>(null);
  const [copyingEmails, setCopyingEmails] = useState(false);

  // Check admin authentication
  useEffect(() => {
    const checkAuth = async () => {
      const token = Cookies.get(VIDEO_ADMIN_TOKEN_COOKIE_NAME) || localStorage.getItem("nextpostai_video_admin_token") || "";
      if (!token) {
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
        return;
      }

      try {
        const response = await fetch("/api/video-admin/verify", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        const result = await response.json();
        if (response.ok && result.data?.authenticated) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
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
      const response = await api.post("/video-admin/login", {
        username,
        password,
      });

      if (response.data.status === 200) {
        const token = response.data.data.bearerToken;
        Cookies.set(VIDEO_ADMIN_TOKEN_COOKIE_NAME, token, {
          expires: 30,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });

        localStorage.setItem("nextpostai_video_admin_token", token);

        toast.success("Login successful!");
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

  const handleLogout = () => {
    Cookies.remove(VIDEO_ADMIN_TOKEN_COOKIE_NAME);
    localStorage.removeItem("nextpostai_video_admin_token");
    setIsAuthenticated(false);
    setUsername("");
    setPassword("");
    toast.success("Logged out successfully");
  };

  // Fetch all users with videos
  const { data, isLoading } = useQuery<{ users: UserData[]; stats: Stats }>({
    queryKey: ["video-admin-users"],
    queryFn: async () => {
      const token = Cookies.get(VIDEO_ADMIN_TOKEN_COOKIE_NAME) || localStorage.getItem("nextpostai_video_admin_token") || "";
      const response = await fetch("/api/video-admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const result = await response.json();
      return result.data;
    },
    enabled: isAuthenticated,
  });

  const toggleUser = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const fetchVideoDetails = async (folderId: string) => {
    setLoadingVideoId(folderId);
    try {
      const token = Cookies.get(VIDEO_ADMIN_TOKEN_COOKIE_NAME) || localStorage.getItem("nextpostai_video_admin_token") || "";
      const response = await fetch(`/api/video-admin/videos/${folderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch video details");
      const result = await response.json();
      setPreviewVideo(result.data);
    } catch (error) {
      console.error("Failed to fetch video:", error);
      toast.error("Failed to load video details");
    } finally {
      setLoadingVideoId(null);
    }
  };

  const copyAllUserEmails = async () => {
    const users = data?.users || [];
    const emails = Array.from(
      new Set(
        users
          .map((u) => (u.email || "").trim().toLowerCase())
          .filter(Boolean)
      )
    );

    if (emails.length === 0) {
      toast.error("No user emails to copy");
      return;
    }

    const text = emails.join(", ");
    setCopyingEmails(true);

    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${emails.length} email${emails.length === 1 ? "" : "s"}`);
    } catch {
      // Fallback for older browsers / permission issues
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (ok) {
          toast.success(`Copied ${emails.length} email${emails.length === 1 ? "" : "s"}`);
        } else {
          toast.error("Failed to copy emails");
        }
      } catch {
        toast.error("Failed to copy emails");
      }
    } finally {
      setCopyingEmails(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Video Admin Login
            </CardTitle>
            <CardDescription className="text-center">
              Enter your admin credentials to manage video submissions
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="w-full px-4 border-b bg-white h-fit relative overflow-hidden flex items-center justify-center">
        <div className="flex h-16 items-center justify-between bg-background w-full max-w-7xl md:px-8">
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
            <span className="text-muted-foreground">Video Admin</span>
          </div>
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Video Submissions Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              View and manage all user video submissions
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={copyAllUserEmails}
            disabled={!data?.users?.length || copyingEmails}
            title="Copy all user emails"
            aria-label="Copy all user emails"
          >
            {copyingEmails ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Stats Cards */}
        {data?.stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.stats.totalUsers}</p>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Video className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.stats.totalVideos}</p>
                    <p className="text-sm text-muted-foreground">Total Videos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FolderOpen className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.stats.totalProjects}</p>
                    <p className="text-sm text-muted-foreground">Total Projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.stats.pendingVideos}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{data.stats.completedVideos}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data?.users && data.users.length > 0 ? (
          <div className="space-y-4">
            {data.users.map((user) => (
              <Card key={user.id} className="overflow-hidden">
                <Collapsible
                  open={expandedUsers.has(user.id)}
                  onOpenChange={() => toggleUser(user.id)}
                >
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {expandedUsers.has(user.id) ? (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            )}
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.name || "User"}
                                className="h-10 w-10 rounded-full"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                                <UserIcon className="h-5 w-5 text-slate-500" />
                              </div>
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {user.name || "Unnamed User"}
                              <Badge variant="secondary" className="font-normal">
                                {user.remainingChatGenerations} credits
                              </Badge>
                            </CardTitle>
                            <CardDescription className="flex items-center gap-4 mt-1">
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FolderOpen className="h-4 w-4" />
                            {user.projects.length} projects
                          </span>
                          <span className="flex items-center gap-1">
                            <Video className="h-4 w-4" />
                            {user.uploadedVideos.length} videos
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="border-t bg-slate-50/50">
                      {user.projects.length === 0 && user.uploadedVideos.length === 0 ? (
                        <p className="text-muted-foreground py-4 text-center">
                          No projects or videos yet
                        </p>
                      ) : (
                        <div className="space-y-4 py-4">
                          {/* Projects */}
                          {user.projects.map((project) => (
                            <Collapsible
                              key={project.id}
                              open={expandedProjects.has(project.id)}
                              onOpenChange={() => toggleProject(project.id)}
                            >
                              <div className="border rounded-lg bg-white">
                                <CollapsibleTrigger asChild>
                                  <div className="p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      {expandedProjects.has(project.id) ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                      )}
                                      <FolderOpen className="h-5 w-5 text-blue-500" />
                                      <div>
                                        <p className="font-medium">{project.name}</p>
                                        {project.description && (
                                          <p className="text-sm text-muted-foreground line-clamp-1">
                                            {project.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <Badge variant="outline">
                                      {project.uploadedVideos.length} videos
                                    </Badge>
                                  </div>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="border-t p-4 space-y-2">
                                    {project.uploadedVideos.length === 0 ? (
                                      <p className="text-muted-foreground text-sm text-center py-2">
                                        No videos in this project
                                      </p>
                                    ) : (
                                      project.uploadedVideos.map((video) => (
                                        <div
                                          key={video.id}
                                          className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 hover:bg-slate-100 transition-colors"
                                        >
                                          <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <Video className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                            <div className="min-w-0">
                                              <p className="font-medium text-sm truncate">
                                                {video.text || "Untitled Video"}
                                              </p>
                                              <p className="text-xs text-muted-foreground">
                                                {format(new Date(video.createdAt), "MMM d, yyyy h:mm a")}
                                                {video.day && ` • Day ${video.day}`}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Badge
                                              variant={video.status === "completed" ? "default" : "secondary"}
                                              className={video.status === "completed" ? "bg-green-600" : "bg-orange-500"}
                                            >
                                              {video.status === "completed" ? (
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                              ) : (
                                                <Clock className="h-3 w-3 mr-1" />
                                              )}
                                              {video.status}
                                            </Badge>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => fetchVideoDetails(video.folderId)}
                                              disabled={loadingVideoId === video.folderId}
                                            >
                                              {loadingVideoId === video.folderId ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <>
                                                  <Eye className="h-4 w-4 mr-1" />
                                                  Preview
                                                </>
                                              )}
                                            </Button>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </div>
                            </Collapsible>
                          ))}

                          {/* Standalone videos (no project) */}
                          {user.uploadedVideos.filter(v => !v.projectId).length > 0 && (
                            <div className="border rounded-lg bg-white p-4">
                              <p className="font-medium mb-3 flex items-center gap-2">
                                <Video className="h-4 w-4" />
                                Standalone Videos (Video Maker)
                              </p>
                              <div className="space-y-2">
                                {user.uploadedVideos.filter(v => !v.projectId).map((video) => (
                                  <div
                                    key={video.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 hover:bg-slate-100 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <Video className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="font-medium text-sm truncate">
                                          {video.text || "Untitled Video"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {format(new Date(video.createdAt), "MMM d, yyyy h:mm a")}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        variant={video.status === "completed" ? "default" : "secondary"}
                                        className={video.status === "completed" ? "bg-green-600" : "bg-orange-500"}
                                      >
                                        {video.status === "completed" ? (
                                          <CheckCircle2 className="h-3 w-3 mr-1" />
                                        ) : (
                                          <Clock className="h-3 w-3 mr-1" />
                                        )}
                                        {video.status}
                                      </Badge>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => fetchVideoDetails(video.folderId)}
                                        disabled={loadingVideoId === video.folderId}
                                      >
                                        {loadingVideoId === video.folderId ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <>
                                            <Eye className="h-4 w-4 mr-1" />
                                            Preview
                                          </>
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No users found</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Video Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-8">
              <span className="truncate">{previewVideo?.video.text || "Video Preview"}</span>
              <Badge
                variant={previewVideo?.video.status === "completed" ? "default" : "secondary"}
                className={previewVideo?.video.status === "completed" ? "bg-green-600" : "bg-orange-500"}
              >
                {previewVideo?.video.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* Video Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">User</p>
                  <p className="font-medium">{previewVideo?.video.user.name || previewVideo?.video.user.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Project</p>
                  <p className="font-medium">{previewVideo?.video.project?.name || "Standalone"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Folder ID</p>
                  <p className="font-mono text-xs">{previewVideo?.video.folderId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {previewVideo?.video.createdAt && format(new Date(previewVideo.video.createdAt), "MMM d, yyyy h:mm a")}
                  </p>
                </div>
              </div>

              {/* Output Video */}
              {previewVideo?.outputVideo && (
                <div>
                  <p className="font-medium mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Output Video (Rendered)
                  </p>
                  <div className="rounded-lg overflow-hidden bg-black">
                    <video
                      src={previewVideo.outputVideo.url}
                      controls
                      className="w-full max-h-[400px]"
                    />
                  </div>
                </div>
              )}

              {/* Input Video */}
              {previewVideo?.inputVideo && (
                <div>
                  <p className="font-medium mb-2 flex items-center gap-2">
                    <Play className="h-4 w-4 text-blue-600" />
                    Input Video (Original)
                  </p>
                  <div className="rounded-lg overflow-hidden bg-black">
                    <video
                      src={previewVideo.inputVideo.url}
                      controls
                      className="w-full max-h-[300px]"
                    />
                  </div>
                </div>
              )}

              {/* Files List */}
              {previewVideo?.files && previewVideo.files.length > 0 && (
                <div>
                  <p className="font-medium mb-2">All Files in Folder</p>
                  <div className="border rounded-lg divide-y">
                    {previewVideo.files.map((file) => (
                      <div key={file.key} className="p-3 flex items-center justify-between hover:bg-slate-50">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-sm truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Unknown size"}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" asChild>
                          <a href={file.url} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No output warning */}
              {!previewVideo?.outputVideo && previewVideo?.video.status === "pending" && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-orange-800 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    This video is still being processed. Output will appear when rendering is complete.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
