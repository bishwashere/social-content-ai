"use server";

import { Fb } from "@/lib/3rd-providers/fb";
import { extractPostId, RedditPostData, HackerNewsPost } from "./hooks";
import { prisma } from "@/lib/prisma";
import { Linkedin } from "@/lib/3rd-providers/linkedin";
import axios from "axios";
import { Threads } from "@/lib/3rd-providers/threads";
import { TikTok } from "@/lib/3rd-providers/tiktok";

export const fetchRedditPostsData = async (
  urls: string[]
): Promise<RedditPostData[]> => {
  const results: RedditPostData[] = [];

  for (const url of urls) {
    const postId = extractPostId(url);
    if (!postId) continue;

    const res = await fetch(`https://www.reddit.com/comments/${postId}.json`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SocialContentAI/1.0)",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.log(
        "Error fetching Reddit post data",
        res.status,
        res.statusText,
        await res.text()
      );
      continue;
    }

    const data = await res.json();
    const post = data?.[0]?.data?.children?.[0]?.data;

    if (post) {
      results.push({
        url,
        title: post.title,
        upvotes: post.ups,
        comments: post.num_comments,
        date: new Date(post.created_utc * 1000).toISOString(),
      });
    }
  }

  return results;
};

export type RedditPost = {
  id: string;
  title: string;
  selftext: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  permalink: string;
  url: string;
  subreddit: string;
};

export const fetchRedditPosts = async (
  keywords: string[],
  maxPosts: number = 10
): Promise<RedditPost[]> => {
  try {
    if (!process.env.OLIVEDRIFT_BASE_URL || !process.env.OLIVEDRIFT_API_KEY) {
      throw new Error("Olivedrift API configuration is missing");
    }

    // Use popular subreddits for better results
    const popularSubreddits = [
      "technology",
      "programming",
      "startups",
      "investing",
      "cryptocurrency",
      "stocks",
      "artificial",
      "MachineLearning",
      "webdev",
      "entrepreneur",
      "business",
      "finance",
    ];

    const response = await axios.post(
      `${process.env.OLIVEDRIFT_BASE_URL}/api/getRedditPosts`,
      {
        keywords,
        maxPosts,
        subreddits: popularSubreddits, // Required field - use popular subreddits
        timeFilter: "week", // Get recent posts
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OLIVEDRIFT_API_KEY}`,
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to fetch Reddit posts");
    }

    // Transform olivedrift response to our format
    const posts: RedditPost[] = (response.data.posts || []).map((post: any) => ({
      id: post.id || post.name || "",
      title: post.title || "",
      selftext: post.selftext || "",
      author: post.author || "",
      score: post.score || 0,
      num_comments: post.num_comments || 0,
      created_utc: post.created_utc || Date.now() / 1000,
      permalink: post.permalink || "",
      url: post.url || `https://reddit.com${post.permalink}`,
      subreddit: post.subreddit || "",
    }));

    return posts;
  } catch (error) {
    console.error("Error fetching Reddit posts:", error);
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch Reddit posts"
      );
    }
    throw error;
  }
};

export const fetchHackerNewsPosts = async (
  keywords: string[],
  maxPosts: number = 10
): Promise<HackerNewsPost[]> => {
  try {
    if (!process.env.OLIVEDRIFT_BASE_URL || !process.env.OLIVEDRIFT_API_KEY) {
      throw new Error("Olivedrift API configuration is missing");
    }

    const response = await axios.post(
      `${process.env.OLIVEDRIFT_BASE_URL}/api/getHackerNewsPosts`,
      {
        keywords,
        maxPosts,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OLIVEDRIFT_API_KEY}`,
        },
      }
    );

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to fetch HackerNews posts");
    }

    // Transform olivedrift response to our format
    const posts: HackerNewsPost[] = (response.data.posts || []).map((post: any) => ({
      id: post.id,
      title: post.title,
      text: post.selftext || "",
      author: post.author,
      score: post.score,
      num_comments: post.num_comments,
      created_utc: post.created_utc,
      permalink: post.permalink,
    }));

    return posts;
  } catch (error) {
    console.error("Error fetching HackerNews posts:", error);
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || "Failed to fetch HackerNews posts"
      );
    }
    throw error;
  }
};

export const getFacebookMetrics = async (userId: string, projectId: string | null) => {
  try {
    // Step 1: Find OAuth provider and existing posts
    const oauthProvider = await prisma.oauthProvider.findMany({
      where: {
        userId,
        platform: "facebook",
      },
      include: {
        pagePosts: true,
        projectToOAuthProviders: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!oauthProvider.length) {
      return {
        success: false,
        message: "Facebook page not found",
      };
    }

    // Step 2: Return from DB if posts already exist
    const projectOauthProvider = oauthProvider.filter(provider => provider.projectToOAuthProviders.some(data => data.projectId === projectId))
    
    console.log(`[getFacebookMetrics] User: ${userId}, Project: ${projectId}`);
    console.log(`[getFacebookMetrics] Total OAuth providers: ${oauthProvider.length}`);
    console.log(`[getFacebookMetrics] Providers linked to project: ${projectOauthProvider.length}`);
    
    if (projectOauthProvider.length === 0) {
      console.log(`[getFacebookMetrics] No Facebook providers linked to project ${projectId}`);
      return {
        success: false,
        message: "No Facebook page linked to this project. Please link a Facebook page in project settings.",
      };
    }
    
    const posts = projectOauthProvider.flatMap(provider => provider.pagePosts || []);
    if (posts.length) {
      console.log(`[getFacebookMetrics] Returning ${posts.length} posts from database`);
      return {
        success: true,
        data: posts,
      };
    }

    if (!projectOauthProvider[0]?.pageId) {
      console.log(`[getFacebookMetrics] Provider has no pageId`);
      return {
        success: false,
        message: "Facebook page not found",
      };
    }

    // Step 3: Fetch from Facebook API
    const fb = new Fb({
      accessToken: projectOauthProvider[0].accessToken,
      refreshToken: projectOauthProvider[0].refreshToken!,
    });
    const metrics = await fb.getMyPostInsights(projectOauthProvider[0].pageId);

    // Step 4: Map API response to DB structure with insights
    const postsToSave = metrics.map((post) => {
      const postData = {
        postId: post.id,
        content: post.message || "No message",
        date: new Date(post.date),
        shares: post.shares || 0,
        likes: post.reactions || 0,
        comments: post.comments || 0,
        impressions: post.impressions,
        uniqueImpressions: post.uniqueImpressions,
        // Include insights if we have additional metadata
        insights: (post.postType || post.permalinkUrl || post.fullPictureUrl || post.linkUrl || post.story) ? {
          create: {
            postType: post.postType || null,
            permalinkUrl: post.permalinkUrl || null,
            fullPictureUrl: post.fullPictureUrl || null,
            linkUrl: post.linkUrl || null,
            story: post.story || null,
            // Reaction breakdowns and detailed insights will be fetched separately
            // to avoid blocking the main flow
          },
        } : undefined,
      };
      // Remove insights if undefined to avoid Prisma errors
      if (!postData.insights) {
        delete (postData as any).insights;
      }
      return postData;
    });

    // Step 5: Save to DB
    const data = await prisma.oauthProvider.update({
      where: { id: projectOauthProvider[0].id },
      data: {
        pagePosts: {
          create: postsToSave,
        },
      },
      include: {
        pagePosts: {
          include: {
            insights: true,
          },
        },
      },
    });

    // Step 6: Fetch detailed insights asynchronously (don't block response)
    // This includes: engaged users, clicks, negative feedback, reach, reaction breakdowns
    // We do this in the background so it doesn't slow down the main request
    Promise.all(
      data.pagePosts.map(async (savedPost) => {
        try {
          // Find the corresponding metric to get metadata we already fetched
          const metric = metrics.find((m) => m.id === savedPost.postId);

          // Fetch detailed insights and reaction breakdowns
          const [detailedInsights, reactionBreakdown] = await Promise.all([
            fb.getPostDetailedInsights(savedPost.postId),
            fb.getPostReactionBreakdown(savedPost.postId),
          ]);

          // Upsert insights with all data (create if doesn't exist, update if it does)
          await prisma.postInsights.upsert({
            where: { platformPostId: savedPost.id },
            create: {
              platformPostId: savedPost.id,
              postType: metric?.postType || null,
              permalinkUrl: metric?.permalinkUrl || null,
              fullPictureUrl: metric?.fullPictureUrl || null,
              linkUrl: metric?.linkUrl || null,
              story: metric?.story || null,
              engagedUsers: detailedInsights.engagedUsers || null,
              postClicks: detailedInsights.postClicks || null,
              negativeFeedback: detailedInsights.negativeFeedback || null,
              postReach: detailedInsights.postReach || null,
              reactionsLike: reactionBreakdown.like || null,
              reactionsLove: reactionBreakdown.love || null,
              reactionsWow: reactionBreakdown.wow || null,
              reactionsHaha: reactionBreakdown.haha || null,
              reactionsSorry: reactionBreakdown.sorry || null,
              reactionsAnger: reactionBreakdown.anger || null,
            },
            update: {
              // Update metadata if not already set
              postType: metric?.postType || undefined,
              permalinkUrl: metric?.permalinkUrl || undefined,
              fullPictureUrl: metric?.fullPictureUrl || undefined,
              linkUrl: metric?.linkUrl || undefined,
              story: metric?.story || undefined,
              // Always update detailed insights
              engagedUsers: detailedInsights.engagedUsers || null,
              postClicks: detailedInsights.postClicks || null,
              negativeFeedback: detailedInsights.negativeFeedback || null,
              postReach: detailedInsights.postReach || null,
              reactionsLike: reactionBreakdown.like || null,
              reactionsLove: reactionBreakdown.love || null,
              reactionsWow: reactionBreakdown.wow || null,
              reactionsHaha: reactionBreakdown.haha || null,
              reactionsSorry: reactionBreakdown.sorry || null,
              reactionsAnger: reactionBreakdown.anger || null,
              updatedAt: new Date(),
            },
          });
        } catch (error) {
          // Silently fail - insights fetching is optional
          console.warn(`Failed to fetch detailed insights for post ${savedPost.postId}:`, error);
        }
      })
    ).catch((error) => {
      // Don't throw - this is background processing
      console.warn("Error fetching detailed insights in background:", error);
    });

    return {
      success: true,
      data: data.pagePosts,
    };
  } catch (error) {
    console.error("Error fetching Facebook metrics:", error);
    throw new Error("Could not load Facebook data!");
  }
};

export const getLinkedinMetrics = async (userId: string, projectId: string | null) => {
  try {
    const oauthProvider = await prisma.oauthProvider.findMany({
      where: {
        userId,
        platform: "linkedin",
      },
      include: {
        pagePosts: true,
        projectToOAuthProviders: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    const projectOauthProvider = oauthProvider.filter(provider => provider.projectToOAuthProviders.some(data => data.projectId === projectId))

    console.log(`[getLinkedinMetrics] User: ${userId}, Project: ${projectId}`);
    console.log(`[getLinkedinMetrics] Total OAuth providers: ${oauthProvider.length}`);
    console.log(`[getLinkedinMetrics] Providers linked to project: ${projectOauthProvider.length}`);

    if (!projectOauthProvider.length) {
      console.log(`[getLinkedinMetrics] No LinkedIn providers linked to project ${projectId}`);
      return {
        success: false,
        message: "No LinkedIn page linked to this project. Please link a LinkedIn page in project settings.",
      };
    }

    if (!projectOauthProvider[0].pageId || !projectOauthProvider[0].expiresAt) {
      console.log(`[getLinkedinMetrics] Provider missing pageId or expiresAt`);
      return {
        success: false,
        message: "Linkedin page not found",
      };
    }

    const posts = projectOauthProvider.flatMap(provider => provider.pagePosts || []);
    if (posts.length) {
      // Reutrn data from db
      return {
        sucess: true,
        data: posts,
        followersCount: projectOauthProvider[0].pageFollowers,
      };
    }

    // Otherwise fetch from linkedin and save to db and return as well
    const l = new Linkedin({
      accessToken: projectOauthProvider[0].accessToken,
      expiresAt: projectOauthProvider[0].expiresAt,
    });
    const metrics = await l.getMyPostInsights(projectOauthProvider[0].pageId);

    const followersCount = await l.getFollowersCount(projectOauthProvider[0].pageId);

    const data = await prisma.oauthProvider.update({
      where: { id: projectOauthProvider[0].id },
      data: {
        pageFollowers: followersCount,
        pagePosts: {
          create: metrics.map((post) => ({
            postId: post.postId,
            content: post.content,
            likes: post.likes,
            comments: post.comments,
            shares: post.shares,
            impressions: post.impressions,
            uniqueImpressions: post.uniqueImpressions,
            date: post.date,
          })),
        },
      },
      include: {
        pagePosts: true,
      },
    });

    return {
      success: true,
      data: data.pagePosts,
      followersCount: followersCount,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      console.error("Axios error:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
      });
      throw new Error("API call limit reached for today !");
    } else {
      throw new Error("Couldnot load linkedin data !");
    }
  }
};

export const getThreadsMetrics = async (userId: string, projectId: string | null) => {
  try {
    // Step 1: Find the Threads OAuth provider and existing posts
    const oauthProvider = await prisma.oauthProvider.findMany({
      where: {
        userId,
        platform: "threads",
      },
      include: {
        pagePosts: true,
        projectToOAuthProviders: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    const projectOauthProvider = oauthProvider.filter(provider => provider.projectToOAuthProviders.some(data => data.projectId === projectId))

    if (!oauthProvider.length) {
      return {
        success: false,
        message: "Threads account not found",
      };
    }

    // Step 2: Return from DB if posts already exist
    const posts = projectOauthProvider.flatMap(provider => provider.pagePosts || []);
    if (posts.length) {
      return {
        success: true,
        data: posts,
      };
    }

    // Step 3: Fetch from Threads API if not in DB
    const t = new Threads({ accessToken: projectOauthProvider[0].accessToken });
    const metrics = await t.fetchUserPostsWithInsights(
      projectOauthProvider[0].pageId || ""
    );

    // Step 4: Transform metrics to match DB structure
    const postsToSave = metrics.map((post) => ({
      postId: post.postId,
      content: post.content,
      likes: post.insights.likesCount,
      comments: post.insights.repliesCount,
      shares: 0, // Threads API do not have shares
      impressions: post.insights.viewsCount,
      uniqueImpressions: post.insights.viewsCount,
      date: new Date(post.date),
    }));

    // Step 5: Save to DB
    const data = await prisma.oauthProvider.update({
      where: { id: projectOauthProvider[0].id },
      data: {
        pagePosts: {
          create: postsToSave,
        },
      },
      include: {
        pagePosts: true,
      },
    });

    return {
      success: true,
      data: data.pagePosts,
    };
  } catch (error) {
    console.error("Error fetching Threads metrics:", error);
    throw new Error("Could not load Threads data!");
  }
};

export const getTiktokMetrics = async (userId: string, projectId: string | null) => {
  // TODO: Make this function work like other functions after getting tiktok production api
  try {
    // Step 1: Find the Tiktok OAuth provider and existing posts
    const oauthProvider = await prisma.oauthProvider.findMany({
      where: {
        userId,
        platform: "tiktok",
      },
      include: {
        // pagePosts: true,
        projectToOAuthProviders: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    const projectOauthProvider = oauthProvider.filter(provider => provider.projectToOAuthProviders.some(data => data.projectId === projectId))

    if (!oauthProvider.length) {
      return {
        success: false,
        message: "Threads account not found",
      };
    }

    // Step 2: Return from DB if posts already exist
    // const posts = projectOauthProvider.flatMap(provider => provider.pagePosts || []);
    // if (posts.length) {
    //   return {
    //     success: true,
    //     data: posts,
    //   };
    // }

    // Step 3: Fetch from Tiktok API if not in DB
    const t = new TikTok({
      accessToken: projectOauthProvider[0].accessToken!,
      refreshToken: projectOauthProvider[0].refreshToken!,
      expiresAt: projectOauthProvider[0].expiresAt!
    });

    // const userInfo = await t.getUserInfo();
    const videosList = await t.getVideoList();

    // Step 4: Transform metrics to match DB structure
    const posts = videosList?.videos.map((post) => ({
      postId: post.id,
      content: post.title,
      likes: post.like_count,
      comments: post.comment_count,
      shares: post.share_count,
      impressions: post.view_count,
      uniqueImpressions: post.view_count,
      date: post.create_time ? new Date(post.create_time * 1000) : new Date(),
    }));

    // Step 5: Save to DB
    // const data = await prisma.oauthProvider.update({
    //   where: { id: projectOauthProvider[0].id },
    //   data: {
    //     pagePosts: {
    //       create: postsToSave,
    //     },
    //   },
    //   include: {
    //     pagePosts: true,
    //   },
    // });

    return {
      success: true,
      data: posts,
    };
  } catch (error) {
    console.error("Error fetching Tiktok metrics:", error);
    throw new Error("Could not load Tiktok data!");
  }
};

export const getAllPlatformMetrics = async (userId: string, projectId: string | null) => {
  try {
    console.log(`[getAllPlatformMetrics] User: ${userId}, Project: ${projectId}`);
    
    if (!projectId) {
      console.log(`[getAllPlatformMetrics] No projectId provided`);
      return {
        success: false,
        message: "No project selected",
        data: [],
      };
    }
    
    const oauthProvider = await prisma.oauthProvider.findMany({
      where: {
        userId,
      },
      include: {
        pagePosts: true,
        projectToOAuthProviders: true,
      },
    });

    console.log(`[getAllPlatformMetrics] Total OAuth providers: ${oauthProvider.length}`);

    if (!oauthProvider || oauthProvider.length === 0) {
      console.log(`[getAllPlatformMetrics] No OAuth providers found for user`);
      return {
        success: false,
        message: "No social media accounts connected",
        data: [],
      };
    }

    // Filter providers linked to the selected project
    const linkedProviders = oauthProvider.filter(provider => 
      provider.projectToOAuthProviders.some(data => data.projectId === projectId)
    );
    
    console.log(`[getAllPlatformMetrics] Providers linked to project: ${linkedProviders.length}`);
    linkedProviders.forEach(p => {
      console.log(`  - ${p.platform} (${p.pageName}): ${p.pagePosts.length} posts`);
    });

    if (linkedProviders.length === 0) {
      console.log(`[getAllPlatformMetrics] No providers linked to project ${projectId}`);
      return {
        success: false,
        message: "No social media accounts linked to this project. Please link accounts in project settings.",
        data: [],
      };
    }

    // Collect posts from database and fetch from APIs for providers with no posts
    const allPosts: any[] = [];
    
    for (const provider of linkedProviders) {
      const existingPosts = provider.pagePosts || [];
      
      console.log(`[getAllPlatformMetrics] Processing ${provider.platform} (${provider.pageName}):`, {
        hasPageId: !!provider.pageId,
        hasAccessToken: !!provider.accessToken,
        existingPostsCount: existingPosts.length,
        samplePost: existingPosts[0] ? {
          id: existingPosts[0].id,
          postId: existingPosts[0].postId,
          date: existingPosts[0].date,
          dateType: typeof existingPosts[0].date,
          hasDate: !!existingPosts[0].date,
        } : null,
      });
      
      if (existingPosts.length > 0) {
        // Use existing posts from database
        // Ensure date is properly formatted
        const formattedPosts = existingPosts.map(post => ({
          ...post,
          date: post.date instanceof Date ? post.date : new Date(post.date),
        }));
        allPosts.push(...formattedPosts);
        console.log(`[getAllPlatformMetrics] Using ${existingPosts.length} existing posts for ${provider.platform} (${provider.pageName})`);
      } else {
        // Fetch from API if no posts in database
        console.log(`[getAllPlatformMetrics] No posts in DB for ${provider.platform} (${provider.pageName}), fetching from API...`);
        
        try {
          let platformPosts: any[] = [];
          
          if (provider.platform === "facebook" && provider.pageId) {
            console.log(`[getAllPlatformMetrics] Fetching Facebook posts for ${provider.pageName} (pageId: ${provider.pageId})`);
            try {
              if (!provider.accessToken) {
                console.error(`[getAllPlatformMetrics] No access token for Facebook provider ${provider.id}`);
                continue;
              }
              
              const fb = new Fb({
                accessToken: provider.accessToken,
                refreshToken: provider.refreshToken || "",
              });
              
              console.log(`[getAllPlatformMetrics] Calling Facebook API for pageId: ${provider.pageId}`);
              
              let metrics;
              try {
                metrics = await fb.getMyPostInsights(provider.pageId);
                console.log(`[getAllPlatformMetrics] Facebook API returned ${metrics.length} posts`);
              } catch (apiError) {
                console.error(`[getAllPlatformMetrics] Facebook API error for ${provider.pageName}:`, apiError);
                console.error(`[getAllPlatformMetrics] Error details:`, {
                  message: apiError instanceof Error ? apiError.message : String(apiError),
                  pageId: provider.pageId,
                  hasAccessToken: !!provider.accessToken,
                  hasRefreshToken: !!provider.refreshToken,
                });
                // Continue with other providers even if this one fails
                continue;
              }
              
              if (!metrics || metrics.length === 0) {
                console.warn(`[getAllPlatformMetrics] No posts returned from Facebook API for ${provider.pageName}. This could mean:
                  - No posts exist on this page
                  - API permissions are insufficient
                  - Access token is invalid/expired
                  - Page ID is incorrect`);
                continue;
              }
              
              const postsToSave = metrics.map((post) => ({
                postId: post.id,
                content: post.message || "No message",
                date: new Date(post.date),
                shares: post.shares || 0,
                likes: post.reactions || 0,
                comments: post.comments || 0,
                impressions: post.impressions,
                uniqueImpressions: post.uniqueImpressions,
              }));
              
              console.log(`[getAllPlatformMetrics] Saving ${postsToSave.length} Facebook posts to database`);
              
              // Save to database
              const updated = await prisma.oauthProvider.update({
                where: { id: provider.id },
                data: {
                  pagePosts: {
                    create: postsToSave,
                  },
                },
                include: {
                  pagePosts: true,
                },
              });
              
              // Format posts for return
              platformPosts = updated.pagePosts.map((post) => ({
                id: post.id,
                postId: post.postId,
                content: post.content,
                date: post.date instanceof Date ? post.date : new Date(post.date),
                shares: post.shares,
                likes: post.likes,
                comments: post.comments,
                impressions: post.impressions,
                uniqueImpressions: post.uniqueImpressions,
              }));
              console.log(`[getAllPlatformMetrics] Successfully saved ${platformPosts.length} Facebook posts`);
              if (platformPosts.length > 0) {
                console.log(`[getAllPlatformMetrics] Sample saved post:`, {
                  id: platformPosts[0].id,
                  date: platformPosts[0].date,
                  dateType: typeof platformPosts[0].date,
                });
              }
            } catch (fbError) {
              console.error(`[getAllPlatformMetrics] Facebook API error:`, fbError);
              throw fbError; // Re-throw to be caught by outer catch
            }
            
          } else if (provider.platform === "linkedin" && provider.pageId && provider.expiresAt) {
            console.log(`[getAllPlatformMetrics] Fetching LinkedIn posts for ${provider.pageName}`);
            const l = new Linkedin({
              accessToken: provider.accessToken,
              expiresAt: provider.expiresAt,
            });
            const metrics = await l.getMyPostInsights(provider.pageId);
            const followersCount = await l.getFollowersCount(provider.pageId);
            
            const updated = await prisma.oauthProvider.update({
              where: { id: provider.id },
              data: {
                pageFollowers: followersCount,
                pagePosts: {
                  create: metrics.map((post) => ({
                    postId: post.postId,
                    content: post.content,
                    likes: post.likes,
                    comments: post.comments,
                    shares: post.shares,
                    impressions: post.impressions,
                    uniqueImpressions: post.uniqueImpressions,
                    date: post.date,
                  })),
                },
              },
              include: {
                pagePosts: true,
              },
            });
            
            platformPosts = updated.pagePosts.map((post) => ({
              id: post.id,
              postId: post.postId,
              content: post.content,
              date: post.date instanceof Date ? post.date : new Date(post.date),
              shares: post.shares,
              likes: post.likes,
              comments: post.comments,
              impressions: post.impressions,
              uniqueImpressions: post.uniqueImpressions,
            }));
            console.log(`[getAllPlatformMetrics] Fetched and saved ${platformPosts.length} LinkedIn posts`);
            
          } else if (provider.platform === "threads" && provider.pageId) {
            console.log(`[getAllPlatformMetrics] Fetching Threads posts for ${provider.pageName}`);
            const threads = new Threads({
              accessToken: provider.accessToken,
            });
            const results = await threads.fetchUserPostsWithInsights(provider.pageId);
            
            const postsToSave = results.map((post: any) => ({
              postId: post.postId,
              content: post.content,
              likes: post.insights.likesCount || 0,
              comments: post.insights.repliesCount || 0,
              shares: 0,
              impressions: post.insights.viewsCount || 0,
              uniqueImpressions: post.insights.viewsCount || 0,
              date: new Date(post.date),
            }));
            
            const updated = await prisma.oauthProvider.update({
              where: { id: provider.id },
              data: {
                pagePosts: {
                  create: postsToSave,
                },
              },
              include: {
                pagePosts: true,
              },
            });
            
            platformPosts = updated.pagePosts.map((post) => ({
              id: post.id,
              postId: post.postId,
              content: post.content,
              date: post.date instanceof Date ? post.date : new Date(post.date),
              shares: post.shares,
              likes: post.likes,
              comments: post.comments,
              impressions: post.impressions,
              uniqueImpressions: post.uniqueImpressions,
            }));
            console.log(`[getAllPlatformMetrics] Fetched and saved ${platformPosts.length} Threads posts`);
            
          } else if (provider.platform === "tiktok" && provider.pageId && provider.refreshToken && provider.expiresAt) {
            console.log(`[getAllPlatformMetrics] Fetching TikTok posts for ${provider.pageName}`);
            const tiktok = new TikTok({
              accessToken: provider.accessToken,
              refreshToken: provider.refreshToken,
              expiresAt: provider.expiresAt,
            });
            const videosList = await tiktok.getVideoList();
            
            if (!videosList?.videos || videosList.videos.length === 0) {
              console.log(`[getAllPlatformMetrics] No TikTok videos returned for ${provider.pageName}`);
              continue;
            }
            
            const postsToSave = videosList.videos.map((video: any) => ({
              postId: video.id,
              content: video.title || video.video_description || "",
              likes: video.like_count || 0,
              comments: video.comment_count || 0,
              shares: video.share_count || 0,
              impressions: video.view_count || 0,
              uniqueImpressions: video.view_count || 0,
              date: video.create_time ? new Date(video.create_time * 1000) : new Date(),
            }));
            
            const updated = await prisma.oauthProvider.update({
              where: { id: provider.id },
              data: {
                pagePosts: {
                  create: postsToSave,
                },
              },
              include: {
                pagePosts: true,
              },
            });
            
            platformPosts = updated.pagePosts.map((post) => ({
              id: post.id,
              postId: post.postId,
              content: post.content,
              date: post.date instanceof Date ? post.date : new Date(post.date),
              shares: post.shares,
              likes: post.likes,
              comments: post.comments,
              impressions: post.impressions,
              uniqueImpressions: post.uniqueImpressions,
            }));
            console.log(`[getAllPlatformMetrics] Fetched and saved ${platformPosts.length} TikTok posts`);
          }
          
          // Add fetched posts to the collection
          if (platformPosts.length > 0) {
            allPosts.push(...platformPosts);
          }
        } catch (error) {
          console.error(`[getAllPlatformMetrics] Error fetching posts for ${provider.platform} (${provider.pageName}):`, error);
          console.error(`[getAllPlatformMetrics] Error details:`, {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            providerId: provider.id,
            platform: provider.platform,
            pageId: provider.pageId,
          });
          // Continue with other platforms even if one fails
        }
      }
    }
    
    console.log(`[getAllPlatformMetrics] Total posts after processing: ${allPosts.length}`);
    
    if (allPosts.length > 0) {
      console.log(`[getAllPlatformMetrics] Sample post structure:`, {
        id: allPosts[0].id,
        postId: allPosts[0].postId,
        date: allPosts[0].date,
        dateType: typeof allPosts[0].date,
        dateIsDate: allPosts[0].date instanceof Date,
        hasDate: !!allPosts[0].date,
        keys: Object.keys(allPosts[0]),
      });
    }

    // Convert Date objects to ISO strings for JSON serialization
    const serializedPosts = allPosts.map(post => ({
      ...post,
      date: post.date instanceof Date ? post.date.toISOString() : (post.date || new Date().toISOString()),
    }));

    return {
      success: true,
      data: serializedPosts,
    };
  } catch (error) {
    console.error("[getAllPlatformMetrics] Error fetching metrics:", error);
    throw new Error("Could not load data!");
  }
}
