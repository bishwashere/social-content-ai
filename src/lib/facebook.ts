import axios from "axios";

class Fb {
  private _baseUrl = "https://graph.facebook.com/v23.0";
  private _pageId: string;
  private _accessToken: string;

  constructor(pageId: string, accessToken: string) {
    this._pageId = pageId;
    this._accessToken = accessToken;
  }

  private _getMyPostInsightsApiUrl() {
    return (
      this._baseUrl +
      "/" +
      this._pageId +
      "/posts?fields=id,message,reactions.type(LIKE).summary(total_count).limit(0),comments.summary(total_count).limit(0),insights.metric(post_impressions,post_impressions_unique)&access_token=" +
      this._accessToken
    );
  }

  async getMyPostInsights() {
    const url = this._getMyPostInsightsApiUrl();

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
