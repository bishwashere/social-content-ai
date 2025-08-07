import { OauthProvider, ScheduledPost } from "@prisma/client";
import { Reddit } from "./3rd-providers/reddit";
import { prisma } from "./prisma";

type SubmitPostOptions = {
  oauth: OauthProvider;
  post: ScheduledPost;
};

export const postToSocial = async (options: SubmitPostOptions) => {
  console.log("Posting to social media", options);

  let response: {
    success: boolean;
    error: string;
  };

  try {
    const result: Partial<ScheduledPost> = {
      processedAt: new Date(),
      status: "processing",
      updatedAt: new Date(),
      error: "",
    };

    try {
      switch (options.oauth.platform) {
        case "reddit":
          const r = new Reddit({
            accessToken: options.oauth.accessToken || "",
            refreshToken: options.oauth.refreshToken || "",
            expiresAt: options.oauth.expiresAt || 0,
          });

          const { newToken } = await r.submitPost({
            subreddit: options.oauth.pageId || "",
            title: options.post.content.substring(0, 50) + "...",
            text: options.post.content,
          });

          if (newToken) {
            await prisma.oauthProvider.update({
              where: {
                id: options.oauth.id,
              },
              data: {
                accessToken: newToken.accessToken,
                expiresAt: newToken.expiresAt,
              },
            });
          }

          break;
      }
      result.status = "success";
      response = {
        success: true,
        error: "",
      };
    } catch (err: any) {
      console.log(err);

      result.status = "failed";
      result.error = err.message;
      response = {
        success: false,
        error: err.message,
      };
    }

    await prisma.scheduledPost.update({
      where: {
        id: options.post.id,
      },
      data: result,
    });

    return response;
  } catch (err: any) {
    console.log(err);
    return {
      success: false,
      error: err.message,
    };
  }
};
