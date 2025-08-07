import { OauthProvider, ScheduledPost } from "@prisma/client";
import { Reddit } from "./3rd-providers/reddit";
import { prisma } from "./prisma";

type SubmitPostOptions = {
  oauth: OauthProvider;
  post: ScheduledPost;
};

export const postToSocial = async (options: SubmitPostOptions) => {
  const result: ScheduledPost = options.post;
  result.processedAt = new Date();

  try {
    switch (options.oauth.platform) {
      case "reddit":
        const r = new Reddit({
          accessToken: options.oauth.accessToken || "",
          refreshToken: options.oauth.refreshToken || "",
          expiresAt: options.oauth.expiresAt || 0,
        });

        const { newToken } = await r.submitPost({
          subreddit: options.oauth.isPersonal
            ? options.oauth.pageId?.replace("_", "/") || ""
            : options.oauth.pageId || "",
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
  } catch (err: any) {
    result.status = "failed";
    result.error = err.message;
  }
};
