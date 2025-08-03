import { User } from "@prisma/client";
import { prisma } from "./prisma";
import axios from "axios";

class Fb {
  private _user: User;
  private _baseUrl = "https://graph.facebook.com/v23.0";
  constructor(user: User) {
    this._user = user;
  }

  private async _getOauth() {
    return await prisma.oauthProvider.findFirst({
      where: {
        userId: this._user.id,
      },
    });
  }

  private async _getMyPostInsightsApiUrl() {
    const oauth = await this._getOauth();
    if (!oauth) return "";
    return (
      this._baseUrl +
      "/" +
      String(oauth.facebookPageId) +
      "/posts?fields=id,message,reactions.type(LIKE).summary(total_count).limit(0),comments.summary(total_count).limit(0),insights.metric(post_impressions,post_impressions_unique)&access_token=" +
      oauth.accessToken
    );
  }

  async getMyPostInsights() {
    const oauth = await this._getOauth();
    if (!oauth) return [];

    const url = await this._getMyPostInsightsApiUrl();

    if (!url) return [];

    let posts: {
      id: string;
      message: string;
      reactions: {
        summary: {
          total_count: number;
        };
      };
      comments: {
        summary: {
          total_count: number;
        };
      };
      insights: {
        data: {
          name: "post_impressions" | "post_impressions_unique";
          title: string;
          values: [
            {
              value: number;
            }
          ];
        }[];
      };
    }[] = [];
    let nextUrl = url;
    // get all the posts
    while (true) {
      const { data } = await axios.get(nextUrl);
      if (data.data?.length === 0) {
        break;
      } else {
        posts = [...posts, ...data.data];
        const nextPaging = data.paging?.next;
        if (nextPaging) {
          nextUrl = nextPaging;
        } else {
          break;
        }
      }
    }
    const normalizedData = posts.map((post) => ({
      id: post.id,
      message: post.message,
      reactions: post.reactions?.summary?.total_count,
      comments: post.comments?.summary?.total_count,
      impressions: post.insights?.data?.find(
        (item) => item.name === "post_impressions"
      )?.values?.[0]?.value,
      uniqueImpressions: post.insights?.data?.find(
        (item) => item.name === "post_impressions_unique"
      )?.values?.[0]?.value,
    }));

    return normalizedData;
  }
}

export { Fb };
