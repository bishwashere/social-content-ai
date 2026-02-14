"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  LogOut,
  FolderOpen,
  Calendar,
  User as UserIcon,
  Megaphone,
  Target,
  Zap,
  ArrowLeft,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Copy,
  Mail,
  Send,
  Video,
  Link2,
  CreditCard,
  Lightbulb,
  UserPlus,
  Star,
  Clock,
  Users,
} from "lucide-react";
import Link from "next/link";
import NextImage from "next/image";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import { VIDEO_ADMIN_TOKEN_COOKIE_NAME } from "@/constants/common";
import { toast } from "sonner";
import api from "@/backend-apis/axios";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format, formatDistanceToNow } from "date-fns";

interface CampaignData {
  id: string;
  name: string | null;
  goal: string;
  targetAudience: string;
  platforms: string[];
  startDate: string | null;
  totalDays: number | null;
  autoPostEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    user: {
      id: string;
      email: string;
      name: string | null;
      avatarUrl: string | null;
    };
  } | null;
  _count: {
    chats: number;
  };
}

interface QuickGenerateData {
  id: string;
  title: string;
  prompt: string;
  contents: Record<string, string>;
  createdAt: string;
  project: {
    id: string;
    name: string;
    user: {
      id: string;
      email: string;
      name: string | null;
      avatarUrl: string | null;
    };
  } | null;
}

// ─── User Activity Types ──────────────────────────────────

interface Activity {
  type: string;
  label: string;
  detail: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

interface UserSummary {
  projects: number;
  campaigns: number;
  quickGenerates: number;
  scheduledPosts: number;
  videos: number;
  connectedAccounts: number;
  subscriptions: number;
  featureRequests: number;
}

interface UserActivity {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  remainingChatGenerations: number;
  hasClaimedFreeTrial: boolean;
  summary: UserSummary;
  activities: Activity[];
}

// ─── Activity icon + color mapping ──────────────────────────────────

const activityConfig: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  signup: { icon: UserPlus, color: "text-emerald-600", bg: "bg-emerald-100" },
  project_created: { icon: FolderOpen, color: "text-blue-600", bg: "bg-blue-100" },
  campaign_created: { icon: Megaphone, color: "text-green-600", bg: "bg-green-100" },
  quick_generate: { icon: MessageSquare, color: "text-violet-600", bg: "bg-violet-100" },
  post_scheduled: { icon: Send, color: "text-sky-600", bg: "bg-sky-100" },
  video_created: { icon: Video, color: "text-purple-600", bg: "bg-purple-100" },
  wall_post: { icon: MessageSquare, color: "text-indigo-600", bg: "bg-indigo-100" },
  account_connected: { icon: Link2, color: "text-orange-600", bg: "bg-orange-100" },
  subscription: { icon: CreditCard, color: "text-pink-600", bg: "bg-pink-100" },
  feature_request: { icon: Lightbulb, color: "text-amber-600", bg: "bg-amber-100" },
};

const defaultActivityConfig = { icon: Star, color: "text-gray-600", bg: "bg-gray-100" };

function ActivityIcon({ type }: { type: string }) {
  const config = activityConfig[type] || defaultActivityConfig;
  const Icon = config.icon;
  return (
    <div className={`p-1.5 rounded-full ${config.bg} flex-shrink-0`}>
      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────

export default function CampaignsAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("campaigns");
  const [expandedQG, setExpandedQG] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [excludeAdmins, setExcludeAdmins] = useState(false);

  const adminEmails = [
    "bishwashere@gmail.com",
    "b.bishwas@gmail.com",
    "bishwas.work@gmail.com",
    "binitkc220@gmail.com",
  ];

  const toggleQG = (id: string) => {
    setExpandedQG((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleUser = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  // Check admin authentication
  useEffect(() => {
    const checkAuth = async () => {
      const token =
        Cookies.get(VIDEO_ADMIN_TOKEN_COOKIE_NAME) ||
        localStorage.getItem("nextpostai_video_admin_token") ||
        "";
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
      toast.error(
        error.response?.data?.message || error.message || "Login failed"
      );
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

  // Fetch all campaigns
  const { data: campaignsData, isLoading: campaignsLoading } = useQuery<{
    campaigns: CampaignData[];
    totalCampaigns: number;
  }>({
    queryKey: ["video-admin-campaigns"],
    queryFn: async () => {
      const token =
        Cookies.get(VIDEO_ADMIN_TOKEN_COOKIE_NAME) ||
        localStorage.getItem("nextpostai_video_admin_token") ||
        "";
      const response = await fetch("/api/video-admin/campaigns", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch campaigns");
      const result = await response.json();
      return result.data;
    },
    enabled: isAuthenticated,
  });

  // Fetch all quick generates (lazy — only when tab is active)
  const { data: quickGenData, isLoading: quickGenLoading } = useQuery<{
    quickGenerates: QuickGenerateData[];
    totalQuickGenerates: number;
  }>({
    queryKey: ["video-admin-quick-generates"],
    queryFn: async () => {
      const token =
        Cookies.get(VIDEO_ADMIN_TOKEN_COOKIE_NAME) ||
        localStorage.getItem("nextpostai_video_admin_token") ||
        "";
      const response = await fetch("/api/video-admin/quick-generates", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch quick generates");
      const result = await response.json();
      return result.data;
    },
    enabled: isAuthenticated && activeTab === "quick-generate",
  });

  // Fetch user activity (lazy — only when tab is active)
  const { data: userActivityData, isLoading: userActivityLoading } = useQuery<{
    users: UserActivity[];
  }>({
    queryKey: ["video-admin-user-activity"],
    queryFn: async () => {
      const token =
        Cookies.get(VIDEO_ADMIN_TOKEN_COOKIE_NAME) ||
        localStorage.getItem("nextpostai_video_admin_token") ||
        "";
      const response = await fetch("/api/video-admin/user-activity", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch user activity");
      const result = await response.json();
      return result.data;
    },
    enabled: isAuthenticated && activeTab === "user-activity",
  });

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
          <div className="p-6">
            <h2 className="text-2xl font-bold text-center">
              Video Admin Login
            </h2>
            <p className="text-center text-muted-foreground mt-1">
              Enter your admin credentials
            </p>
          </div>
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

  const copyEmail = (e: React.MouseEvent, email: string | undefined) => {
    e.stopPropagation();
    if (!email) {
      toast.error("No email to copy");
      return;
    }
    navigator.clipboard.writeText(email).then(
      () => toast.success(`Copied ${email}`),
      () => toast.error("Failed to copy email")
    );
  };

  const platformKeys = (contents: Record<string, string>) => {
    return Object.keys(contents).filter(
      (key) => contents[key] && contents[key].trim().length > 0
    );
  };

  // Filtered data based on excludeAdmins toggle
  const filteredCampaigns = excludeAdmins
    ? campaignsData?.campaigns.filter(
        (c) => !adminEmails.includes(c.project?.user?.email?.toLowerCase() || "")
      )
    : campaignsData?.campaigns;

  const filteredQuickGenerates = excludeAdmins
    ? quickGenData?.quickGenerates.filter(
        (qg) => !adminEmails.includes(qg.project?.user?.email?.toLowerCase() || "")
      )
    : quickGenData?.quickGenerates;

  const filteredUsers = excludeAdmins
    ? userActivityData?.users.filter(
        (u) => !adminEmails.includes(u.email?.toLowerCase() || "")
      )
    : userActivityData?.users;

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
            <Link
              href="/video-admin"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Video Admin
            </Link>
            <span className="text-muted-foreground mx-2">/</span>
            <span className="text-muted-foreground">
              {activeTab === "campaigns"
                ? "Campaigns"
                : activeTab === "quick-generate"
                  ? "Quick Generate"
                  : "User Activity"}
            </span>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/video-admin">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Content Overview</h1>
          <Button
            variant={excludeAdmins ? "default" : "outline"}
            size="sm"
            onClick={() => setExcludeAdmins((prev) => !prev)}
            className="ml-auto"
          >
            {excludeAdmins ? "Showing without admins" : "Exclude Admins"}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="campaigns" className="gap-2">
              <Megaphone className="h-4 w-4" />
              Campaigns
              {filteredCampaigns && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {filteredCampaigns.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="quick-generate" className="gap-2">
              <Zap className="h-4 w-4" />
              Quick Generate
              {filteredQuickGenerates && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {filteredQuickGenerates.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="user-activity" className="gap-2">
              <Users className="h-4 w-4" />
              User Activity
              {filteredUsers && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {filteredUsers.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns">
            {campaignsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCampaigns &&
              filteredCampaigns.length > 0 ? (
              <div className="space-y-3">
                {filteredCampaigns.map((campaign) => (
                  <Card
                    key={campaign.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Megaphone className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <p className="font-semibold truncate">
                              {campaign.name || "Unnamed Campaign"}
                            </p>
                            {campaign.autoPostEnabled && (
                              <Badge
                                variant="outline"
                                className="text-xs border-blue-300 text-blue-600 flex-shrink-0"
                              >
                                <Zap className="h-3 w-3 mr-0.5" />
                                Auto-post
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-3">
                            <Target className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="line-clamp-1">
                              {campaign.goal}
                            </span>
                          </p>

                          <div className="flex flex-wrap gap-1 mb-3">
                            {campaign.platforms.map((platform) => (
                              <Badge
                                key={platform}
                                variant="secondary"
                                className="text-xs capitalize"
                              >
                                {platform}
                              </Badge>
                            ))}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              {campaign.project?.user?.avatarUrl ? (
                                <img
                                  src={campaign.project.user.avatarUrl}
                                  alt=""
                                  className="h-5 w-5 rounded-full"
                                />
                              ) : (
                                <UserIcon className="h-4 w-4" />
                              )}
                              {campaign.project?.user?.name ||
                                campaign.project?.user?.email ||
                                "Unknown"}
                              <button
                                onClick={(e) => copyEmail(e, campaign.project?.user?.email)}
                                className="p-0.5 hover:bg-slate-200 rounded transition-colors"
                                title="Copy email"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <FolderOpen className="h-4 w-4" />
                              {campaign.project?.name || "No project"}
                            </span>
                            {campaign._count.chats > 0 && (
                              <span className="flex items-center gap-1.5">
                                <Calendar className="h-4 w-4" />
                                {campaign._count.chats} day
                                {campaign._count.chats !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-medium">
                            {format(
                              new Date(campaign.createdAt),
                              "MMM d, yyyy"
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(campaign.createdAt), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No campaigns found</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Quick Generate Tab */}
          <TabsContent value="quick-generate">
            {quickGenLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredQuickGenerates &&
              filteredQuickGenerates.length > 0 ? (
              <div className="space-y-3">
                {filteredQuickGenerates.map((qg) => {
                  const platforms = platformKeys(qg.contents);
                  const isExpanded = expandedQG.has(qg.id);
                  return (
                    <Card
                      key={qg.id}
                      className="overflow-hidden"
                    >
                      <Collapsible
                        open={isExpanded}
                        onOpenChange={() => toggleQG(qg.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <CardContent className="p-5 cursor-pointer hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  )}
                                  <Zap className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                                  <p className="font-semibold truncate">
                                    {qg.title || "Untitled"}
                                  </p>
                                </div>

                                {qg.prompt && (
                                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mb-3 ml-10">
                                    <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span className="line-clamp-1">
                                      {qg.prompt}
                                    </span>
                                  </p>
                                )}

                                <div className="flex items-center gap-4 text-sm text-muted-foreground ml-10">
                                  <span className="flex items-center gap-1.5">
                                    {qg.project?.user?.avatarUrl ? (
                                      <img
                                        src={qg.project.user.avatarUrl}
                                        alt=""
                                        className="h-5 w-5 rounded-full"
                                      />
                                    ) : (
                                      <UserIcon className="h-4 w-4" />
                                    )}
                                    {qg.project?.user?.name ||
                                      qg.project?.user?.email ||
                                      "Unknown"}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyEmail(e, qg.project?.user?.email);
                                      }}
                                      className="p-0.5 hover:bg-slate-200 rounded transition-colors"
                                      title="Copy email"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </button>
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <FolderOpen className="h-4 w-4" />
                                    {qg.project?.name || "No project"}
                                  </span>
                                  {platforms.length > 0 && (
                                    <span className="flex items-center gap-1.5">
                                      <MessageSquare className="h-4 w-4" />
                                      {platforms.length} platform{platforms.length !== 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-medium">
                                  {format(new Date(qg.createdAt), "MMM d, yyyy")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(qg.createdAt), "h:mm a")}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="border-t bg-slate-50/50 px-5 py-4">
                            {platforms.length > 0 ? (
                              <div className="space-y-4">
                                {platforms.map((platform) => (
                                  <div key={platform}>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs capitalize mb-2"
                                    >
                                      {platform}
                                    </Badge>
                                    <div className="bg-white border rounded-lg p-4">
                                      <p className="text-sm whitespace-pre-wrap">
                                        {qg.contents[platform]}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No content generated
                              </p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No quick generates found
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* User Activity Tab */}
          <TabsContent value="user-activity">
            {userActivityLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers && filteredUsers.length > 0 ? (
              <div className="space-y-5">
                {filteredUsers.map((user) => {
                  const isExpanded = expandedUsers.has(user.id);
                  const totalActions = user.activities.length - 1;

                  return (
                    <Card key={user.id} className="overflow-hidden">
                      <Collapsible
                        open={isExpanded}
                        onOpenChange={() => toggleUser(user.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <div className="cursor-pointer hover:bg-slate-50 transition-colors p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  {isExpanded ? (
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
                                  <p className="font-semibold text-lg flex items-center gap-2">
                                    {user.name || "Unnamed User"}
                                    <Badge variant="secondary" className="font-normal">
                                      {user.remainingChatGenerations} credits
                                    </Badge>
                                    {user.hasClaimedFreeTrial && (
                                      <Badge
                                        variant="outline"
                                        className="font-normal text-xs border-green-300 text-green-700"
                                      >
                                        Free trial claimed
                                      </Badge>
                                    )}
                                  </p>
                                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {user.email}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2 items-center max-w-xs justify-end">
                                {totalActions === 0 ? (
                                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                                    No activity yet
                                  </Badge>
                                ) : (
                                  <>
                                    {user.summary.projects > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        <FolderOpen className="h-3 w-3 mr-1" />
                                        {user.summary.projects} project{user.summary.projects !== 1 ? "s" : ""}
                                      </Badge>
                                    )}
                                    {user.summary.campaigns > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        <Megaphone className="h-3 w-3 mr-1" />
                                        {user.summary.campaigns} campaign{user.summary.campaigns !== 1 ? "s" : ""}
                                      </Badge>
                                    )}
                                    {user.summary.quickGenerates > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        <MessageSquare className="h-3 w-3 mr-1" />
                                        {user.summary.quickGenerates} quick generate{user.summary.quickGenerates !== 1 ? "s" : ""}
                                      </Badge>
                                    )}
                                    {user.summary.connectedAccounts > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        <Link2 className="h-3 w-3 mr-1" />
                                        {user.summary.connectedAccounts} account{user.summary.connectedAccounts !== 1 ? "s" : ""}
                                      </Badge>
                                    )}
                                    {user.summary.videos > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        <Video className="h-3 w-3 mr-1" />
                                        {user.summary.videos} video{user.summary.videos !== 1 ? "s" : ""}
                                      </Badge>
                                    )}
                                    {user.summary.scheduledPosts > 0 && (
                                      <Badge variant="outline" className="text-xs">
                                        <Send className="h-3 w-3 mr-1" />
                                        {user.summary.scheduledPosts} post{user.summary.scheduledPosts !== 1 ? "s" : ""}
                                      </Badge>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="border-t bg-white">
                            <div className="p-5">
                              {user.activities.length === 0 ? (
                                <p className="text-center text-muted-foreground py-4">
                                  No activity recorded
                                </p>
                              ) : (
                                <div className="relative">
                                  <div className="absolute left-[15px] top-0 bottom-0 w-px bg-slate-200" />
                                  <div className="space-y-0">
                                    {[...user.activities]
                                      .sort(
                                        (a, b) =>
                                          new Date(b.timestamp).getTime() -
                                          new Date(a.timestamp).getTime()
                                      )
                                      .map((activity, idx) => (
                                      <div
                                        key={`${activity.type}-${idx}`}
                                        className="relative flex items-start gap-4 py-3 pl-0"
                                      >
                                        <div className="relative z-10 bg-white">
                                          <ActivityIcon type={activity.type} />
                                        </div>
                                        <div className="flex-1 min-w-0 -mt-0.5">
                                          <div className="flex items-baseline justify-between gap-2">
                                            <p className="text-sm font-medium">{activity.label}</p>
                                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                                              {format(new Date(activity.timestamp), "MMM d, yyyy · h:mm a")}
                                            </p>
                                          </div>
                                          <p className="text-sm text-muted-foreground mt-0.5 break-words">
                                            {activity.detail}
                                          </p>
                                          {(activity.meta as any)?.platforms &&
                                            Array.isArray((activity.meta as any).platforms) &&
                                            (activity.meta as any).platforms.length > 0 && (
                                              <div className="flex flex-wrap gap-1 mt-1.5">
                                                {((activity.meta as any).platforms as string[]).map((p) => (
                                                  <Badge key={p} variant="secondary" className="text-[10px] capitalize py-0">
                                                    {p}
                                                  </Badge>
                                                ))}
                                              </div>
                                            )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })}
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
