"use client";

import { useSession } from "@/backend-apis/auth/hooks";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, FileText, Calendar, Target, Shield, Lock, Folder } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProject, useGetWebsiteDescription } from "@/backend-apis/projects/hooks";

export function GetStartedGuide() {
  const { data: session } = useSession();
  const projects = useGetAllProjects();
  const router = useRouter();
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);
  const [showCreatePostInfo, setShowCreatePostInfo] = useState(false);
  const [showScheduleCampaignInfo, setShowScheduleCampaignInfo] = useState(false);
  const [showAddProjectInfo, setShowAddProjectInfo] = useState(false);
  const [hasWaved, setHasWaved] = useState(false);
  const [waveKey, setWaveKey] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [addProjectDialogOpen, setAddProjectDialogOpen] = useState(false);
  const [projectStep, setProjectStep] = useState(0);
  const [projectName, setProjectName] = useState("");
  const [projectUrl, setProjectUrl] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [textareaHeight, setTextareaHeight] = useState(96);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const createProject = useCreateProject();
  const desc = useGetWebsiteDescription();

  // Check if user has connected social accounts
  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ["connected-accounts", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return { hasProviders: false, providers: [] };

      const response = await fetch(`/api/check-oauth-providers?userId=${session.user.id}`, {
        cache: 'no-store',
      });
      const result = await response.json();
      const data = result.data || result;
      return {
        hasProviders: data.hasProviders || false,
        providers: data.providers || []
      };
    },
    enabled: !!session?.user?.id,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Check completion status for each step
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["get-started-status", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        return { hasPosts: false, hasCampaigns: false, hasScheduledOrPublished: false };
      }

      const token = localStorage.getItem('nextpostai_token') || '';
      const response = await fetch(`/api/check-get-started-status`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        return { hasPosts: false, hasCampaigns: false, hasScheduledOrPublished: false };
      }

      const data = await response.json();
      return data;
    },
    enabled: !!session?.user?.id,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Check if user has any campaigns (from projects data)
  const hasCampaigns = useMemo(() => {
    if (!projects.data) return false;
    return projects.data.some(
      (project) => project.campaignPlanners && project.campaignPlanners.length > 0
    );
  }, [projects.data]);

  // Use API data or fallback to projects data
  const hasScheduledOrPublished = statusData?.hasScheduledOrPublished || false;
  const _hasPosts = statusData?.hasPosts || false;

  // Check if user has projects
  const hasProjects = useMemo(() => {
    return projects.data && projects.data.length > 0;
  }, [projects.data]);

  // Check if conditions are met to show the guide
  const shouldShow = useMemo(() => {
    if (projects.isLoading || accountsLoading || statusLoading) return false;
    if (!projects.data) return false;

    // Show guide if:
    // 1. User has not connected any socials, OR
    // 2. User has no projects, OR
    // 3. User has no posts, OR
    // 4. User has no campaigns, OR
    // 5. User has no scheduled/published posts
    
    const hasNoSocials = !accountsData?.hasProviders;
    const hasNoProjects = !hasProjects;
    const hasNoPosts = !hasScheduledOrPublished;
    const hasNoCampaigns = !hasCampaigns;

    return hasNoSocials || hasNoProjects || hasNoPosts || hasNoCampaigns;
  }, [projects.data, projects.isLoading, accountsData, accountsLoading, statusLoading, hasScheduledOrPublished, hasCampaigns, hasProjects]);

  // Check if first 2 tasks are completed (connect socials and add project)
  const firstTwoTasksCompleted = useMemo(() => {
    return accountsData?.hasProviders && hasProjects;
  }, [accountsData?.hasProviders, hasProjects]);

  // Calculate visible steps and their numbers
  const visibleSteps = useMemo(() => {
    const steps = [];
    let stepNumber = 1;
    
    // Always show first 2 tasks if pending
    if (!accountsData?.hasProviders) {
      steps.push({ type: 'connect', number: stepNumber++ });
    }
    if (!hasProjects) {
      steps.push({ type: 'add_project', number: stepNumber++ });
    }
    if (!hasScheduledOrPublished) {
      if (hasCampaigns) {
        steps.push({ type: 'schedule_campaign', number: stepNumber++ });
      } else {
        steps.push({ type: 'create_post', number: stepNumber++ });
      }
    }
    
    // Only show tasks 3 and 4 if first 2 tasks are completed
    if (firstTwoTasksCompleted) {
      if (!hasCampaigns) {
        steps.push({ type: 'campaign', number: stepNumber++ });
      }
      if (!hasScheduledOrPublished) {
        steps.push({ type: 'schedule', number: stepNumber++ });
      }
    }
    
    return steps;
  }, [accountsData?.hasProviders, hasProjects, hasScheduledOrPublished, hasCampaigns, firstTwoTasksCompleted]);

  const handleConnectSocials = () => {
    // Navigate to settings page to connect social accounts
    router.push("/dashboard/settings");
  };

  const handleCreatePost = () => {
    if (projects.data && projects.data.length > 0) {
      router.push(`/project/${projects.data[0].id}?tab=generate`);
    } else {
      router.push("/dashboard");
    }
  };

  const handleScheduleCampaign = () => {
    if (projects.data && projects.data.length > 0) {
      router.push(`/project/${projects.data[0].id}?tab=campaign`);
    } else {
      router.push("/dashboard");
    }
  };

  const handleCreateCampaign = () => {
    if (projects.data && projects.data.length > 0) {
      router.push(`/project/${projects.data[0].id}?tab=campaign`);
    } else {
      router.push("/dashboard");
    }
  };

  const handleAddProject = () => {
    setAddProjectDialogOpen(true);
  };

  const handleProjectNext = async () => {
    if (projectStep === 1 && projectUrl) {
      try {
        let urlToFetch = projectUrl.trim();
        urlToFetch = urlToFetch.replace(/\/+$/, '');
        if (!urlToFetch.match(/^https?:\/\//i)) {
          urlToFetch = `https://${urlToFetch}`;
        }
        const description = await desc.mutateAsync(urlToFetch);
        setProjectDescription(description || "");
      } catch (err) {
        console.error("Error fetching description:", err);
        setProjectDescription("");
      }
    }
    setProjectStep((prev) => prev + 1);
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProject.mutateAsync({ name: projectName, url: projectUrl, description: projectDescription });
      setAddProjectDialogOpen(false);
      setProjectStep(0);
      setProjectName("");
      setProjectUrl("");
      setProjectDescription("");
      // Invalidate projects query to refresh the list
      projects.refetch();
    } catch (err) {
      console.error("Error creating project:", err);
    }
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current && projectDescription) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(Math.max(textareaRef.current.scrollHeight, 96), 300);
      textareaRef.current.style.height = `${newHeight}px`;
      setTextareaHeight(newHeight);
    } else if (textareaRef.current && !projectDescription) {
      textareaRef.current.style.height = '96px';
      setTextareaHeight(96);
    }
  }, [projectDescription]);

  // Trigger waving animation once when card is fully loaded, then wait 0.5s
  useEffect(() => {
    if (!shouldShow || hasWaved || !cardRef.current) return;

    // Wait for the card to be fully rendered, then add 0.5s delay
    const timer = setTimeout(() => {
      setHasWaved(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [shouldShow, hasWaved]);

  if (!shouldShow) {
    return null;
  }

  // Get user's first name or email domain
  const getUserGreeting = () => {
    if (!session?.user) return { text: "Hello", emoji: "👋" };
    
    const name = session.user.name;
    if (name) {
      // Extract first name (split by space and take first part)
      const firstName = name.split(' ')[0];
      return { text: `Hello ${firstName}`, emoji: "👋" };
    }
    
    // If no name, use email domain (part before @)
    const email = session.user.email;
    if (email) {
      const emailDomain = email.split('@')[0];
      return { text: `Hello ${emailDomain}`, emoji: "👋" };
    }
    
    return { text: "Hello", emoji: "👋" };
  };

  const greeting = getUserGreeting();

  const handleWaveClick = () => {
    setWaveKey(prev => prev + 1);
  };

  return (
    <div className="w-full mb-6" ref={cardRef}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            <div>
              {greeting.text}{" "}
              <span 
                key={waveKey}
                onClick={handleWaveClick}
                className={(hasWaved || waveKey > 0) ? "inline-block animate-wave-once origin-[70%_70%] cursor-pointer" : "inline-block cursor-pointer"}
              >
                {greeting.emoji}
              </span>
            </div>
            <div className="text-lg font-normal mt-1">Get started here...</div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-start">
            {/* Step 1: Connect Social Media Accounts */}
            {!accountsData?.hasProviders && (
              <>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                  {visibleSteps.find(s => s.type === 'connect')?.number || 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Connect Your Social Media Accounts
                  </h3>
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      onClick={() => {
                        if (showMoreInfo) {
                          setShowMoreInfo(false);
                        } else {
                          setShowMoreInfo(true);
                          setShowSecurityInfo(false);
                        }
                      }}
                      className="text-muted-foreground text-sm hover:underline cursor-pointer"
                    >
                      More info
                    </button>
                    <button
                      onClick={() => {
                        if (showSecurityInfo) {
                          setShowSecurityInfo(false);
                        } else {
                          setShowSecurityInfo(true);
                          setShowMoreInfo(false);
                        }
                      }}
                      className="text-muted-foreground text-sm hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Lock className="h-3 w-3" />
                      Why it&apos;s safe
                    </button>
                  </div>
                  {showMoreInfo && (
                    <p className="text-muted-foreground mb-3">
                      Link your social media accounts to start publishing content across multiple platforms. 
                      Connect Facebook, LinkedIn, X (Twitter), TikTok, Threads, or Reddit to get started.
                    </p>
                  )}
                  {showSecurityInfo && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-blue-100 rounded-full">
                          <Shield className="h-5 w-5 text-blue-600" />
                        </div>
                        <h4 className="text-sm font-semibold text-gray-900">Your Data is Secure</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        We take your privacy and security seriously.
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed mb-4">
                        Your social media keys and credentials are stored using industry-standard hashing and encryption techniques. 
                        This means your sensitive information is protected in multiple layers, and no one can access it except you.
                      </p>
                      <div className="space-y-2">
                        <h5 className="text-sm font-semibold text-gray-900">Security Features:</h5>
                        <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                          <li>Credentials are hashed using secure algorithms</li>
                          <li>Multi-step encryption protects your data</li>
                          <li>Only you have access to your connected accounts</li>
                          <li>We never store your passwords and API keys in plain text</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <Button onClick={handleConnectSocials} variant="outline" size="sm" className="min-w-[140px]">
                    Connect Socials
                  </Button>
                </div>
              </>
            )}

            {/* Step 2: Add Project */}
            {!hasProjects && (
              <>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                  {visibleSteps.find(s => s.type === 'add_project')?.number || 2}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Folder className="h-5 w-5" />
                    Add Project
                  </h3>
                  <button
                    onClick={() => setShowAddProjectInfo(!showAddProjectInfo)}
                    className="text-muted-foreground text-sm hover:underline cursor-pointer mb-3 block"
                  >
                    More info
                  </button>
                  {showAddProjectInfo && (
                    <p className="text-muted-foreground mb-3">
                      Create a project to organize your content and campaigns. 
                      Projects help you manage multiple brands, campaigns, or content strategies in one place.
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <Button onClick={handleAddProject} variant="outline" size="sm" className="min-w-[140px]">
                    Add Project
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Create Your First Post - only when no campaign planner exists */}
            {!hasScheduledOrPublished && !hasCampaigns && (
              <>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                  {visibleSteps.find(s => s.type === 'create_post')?.number || 3}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Create Your First Post
                  </h3>
                  <button
                    onClick={() => setShowCreatePostInfo(!showCreatePostInfo)}
                    className="text-muted-foreground text-sm hover:underline cursor-pointer mb-3 block"
                  >
                    More info
                  </button>
                  {showCreatePostInfo && (
                    <p className="text-muted-foreground mb-3">
                      Use our AI-powered content generator to create engaging posts tailored to your brand. 
                      Generate content for any platform with just a few clicks.
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <Button onClick={handleCreatePost} variant="outline" size="sm" className="min-w-[140px]">
                    Create Post
                  </Button>
                </div>
              </>
            )}

            {/* Step 3 (alt): Schedule Your Campaign - when campaign exists but nothing scheduled yet */}
            {hasCampaigns && !hasScheduledOrPublished && (
              <>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                  {visibleSteps.find(s => s.type === 'schedule_campaign')?.number || 3}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Schedule Your Campaign
                  </h3>
                  <button
                    onClick={() => setShowScheduleCampaignInfo(!showScheduleCampaignInfo)}
                    className="text-muted-foreground text-sm hover:underline cursor-pointer mb-3 block"
                  >
                    More info
                  </button>
                  {showScheduleCampaignInfo && (
                    <p className="text-muted-foreground mb-3">
                      Your campaign is ready! Head to the Campaign Planner and schedule your posts so they 
                      go live automatically across your connected social media accounts.
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <Button onClick={handleScheduleCampaign} variant="outline" size="sm" className="min-w-[140px]">
                    Schedule Campaign
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Plan Your Campaign - Only show if first 2 tasks are completed */}
            {firstTwoTasksCompleted && !hasCampaigns && (
              <>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                  {visibleSteps.find(s => s.type === 'campaign')?.number || 3}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Plan Your Campaign
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    Create a comprehensive campaign plan with AI-generated content for multiple days. 
                    Set your goals, target audience, and platforms to build a complete content strategy.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Button onClick={handleCreateCampaign} variant="outline" size="sm" className="min-w-[140px]">
                    Plan Campaign
                  </Button>
                </div>
              </>
            )}

            {/* Step 4: Schedule & Publish - Only show if first 2 tasks are completed */}
            {firstTwoTasksCompleted && !hasScheduledOrPublished && (
              <>
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                  {visibleSteps.find(s => s.type === 'schedule')?.number || 4}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Schedule & Publish
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    Schedule your posts in advance and publish them automatically to your connected social media accounts. 
                    Plan your calendar and maintain a consistent posting schedule.
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {/* Empty cell for alignment */}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Project Dialog */}
      <Dialog open={addProjectDialogOpen} onOpenChange={(value) => {
        setProjectStep(0);
        setProjectName("");
        setProjectUrl("");
        setProjectDescription("");
        setAddProjectDialogOpen(value);
      }}>
        <DialogContent>
          <DialogClose />
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleProjectSubmit} className="space-y-4">
            {projectStep === 0 && (
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Spring Campaign 2025"
                  required
                />
              </div>
            )}
            {projectStep === 1 && (
              <div className="space-y-2">
                <Label htmlFor="project-url">Url</Label>
                <Input
                  id="project-url"
                  value={projectUrl}
                  onChange={(e) => setProjectUrl(e.target.value)}
                  placeholder="https://springcampaign2025.com"
                />
              </div>
            )}
            {projectStep === 2 && (
              <div className="space-y-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  ref={textareaRef}
                  id="project-description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="A campaign to promote eco-friendly products through creative storytelling"
                  className="min-h-24 resize-none overflow-y-auto"
                  style={{ height: `${textareaHeight}px` }}
                />
              </div>
            )}

            <div className="flex justify-end mt-4">
              {projectStep < 2 ? (
                <Button
                  className="w-full"
                  type="button"
                  onClick={handleProjectNext}
                  loading={desc.isPending}
                  disabled={projectStep === 0 && !projectName}
                >
                  Next
                </Button>
              ) : (
                <Button
                  className="w-full"
                  loading={createProject.isPending}
                  disabled={!projectName || !projectDescription}
                  type="submit"
                >
                  Create Project
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

