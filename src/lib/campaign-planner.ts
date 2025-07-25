export const campaignPlanner = [
{
    id: "1",
      title: "Launching a Product",
      data: [
              { day: 1, task: "Post a teaser image or animation hinting at the upcoming product" },
              { day: 5, task: "Share a close-up image or short clip revealing part of the product" },
              { day: 10, task: "Publish a carousel post outlining a key feature or benefit" },
              { day: 15, task: "Post a short-form video with a mock user reaction to the product" },
              { day: 20, task: "Create a countdown post with stylized visuals" },
              { day: 25, task: "Share a behind-the-scenes photo or design evolution snapshot" },
              { day: 30, task: "Publish a launch announcement with high-quality visuals and CTA" }
      ]
},
{
        id: "2",
        title: "Growing Followers",
        data: [
                { day: 1, task: "Design a post welcoming new followers with bold visuals" },
                { day: 4, task: "Share a short-form video answering a frequently asked question" },
                { day: 7, task: "Publish a carousel post with 3–5 quick tips in your niche" },
                { day: 10, task: "Post a quote graphic that aligns with your audience mindset" },
                { day: 14, task: "Share a personal brand story with a clean portrait or selfie" },
                { day: 18, task: "Create a 'Did you know?' fact post with eye-catching design" },
                { day: 21, task: "Post a 'myth vs fact' graphic busting a common misconception" }
        ]
},
{
        id: "3",
        title: "Making an Announcement",
        data: [
                { day: 1, task: "Share a teaser post with vague but intriguing messaging" },
                { day: 3, task: "Publish a behind-the-scenes photo hinting at the news" },
                { day: 5, task: "Create a countdown post with bold typography" },
                { day: 7, task: "Post the announcement with a strong headline and visual" },
                { day: 10, task: "Follow up with a video or image carousel explaining what’s next" }
        ]
}
];


export type CampaignPlanner = (typeof campaignPlanner)[0];
