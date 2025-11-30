export const campaignPlanner = [
  {
    id: "1",
    goal: "Launching a Product",
    intensityPlans: [
      {
        targetAudience: "Light",
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
        targetAudience: "Light-Moderate",
        data: [
          { day: 1, task: "Post a teaser image with subtle text overlay" },
          { day: 3, task: "Share a close-up image revealing part of the product" },
          { day: 5, task: "Carousel: 2-3 key problems this product solves" },
          { day: 8, task: "Behind-the-scenes photo or design sketch" },
          { day: 10, task: "Post a quote from your team about the product" },
          { day: 13, task: "Short-form video: quick feature highlight" },
          { day: 15, task: "Carousel: Feature overview with icons" },
          { day: 18, task: "Partial reveal with engaging caption" },
          { day: 20, task: "Create a countdown image post" },
          { day: 23, task: "Share a visual testimonial or early feedback" },
          { day: 25, task: "Post a reminder about upcoming launch" },
          { day: 30, task: "Launch day post: headline + CTA + visual" }
        ]
      },
      {
        targetAudience: "Moderate",
        data: [
          { day: 1, task: "Teaser image with dramatic text overlay" },
          { day: 2, task: "Carousel: 3 key problems this product solves" },
          { day: 4, task: "Post a visual of the product's silhouette with no context" },
          { day: 6, task: "Share a quote from your internal team about the product" },
          { day: 8, task: "Behind-the-scenes photo or raw sketch" },
          { day: 10, task: "Reel: Time-lapse of product assembly/mock usage" },
          { day: 12, task: "Carousel: Feature highlight with icons" },
          { day: 15, task: "Drop a partial reveal with 'guess what it does' caption" },
          { day: 18, task: "Create a countdown image post" },
          { day: 20, task: "Post a meme or lighthearted take on the problem" },
          { day: 25, task: "Remind about upcoming launch via motion graphic" },
          { day: 30, task: "Launch day post: include headline + CTA + visual" }
        ]
      },
      {
        targetAudience: "Moderate-Aggressive",
        data: [
          { day: 1, task: "Teaser image with dramatic text overlay" },
          { day: 2, task: "Carousel: 3 key problems this product solves" },
          { day: 3, task: "Product silhouette visual with mystery caption" },
          { day: 4, task: "Quote from internal team about the product" },
          { day: 5, task: "Behind-the-scenes photo or raw sketch" },
          { day: 6, task: "Reel: Time-lapse of product assembly/mock usage" },
          { day: 7, task: "Carousel: Feature highlight with icons" },
          { day: 8, task: "Drop a partial reveal with 'guess what it does' caption" },
          { day: 9, task: "Post a meme or lighthearted take on the problem" },
          { day: 10, task: "Create a countdown image post" },
          { day: 11, task: "Visual testimonial or early user feedback" },
          { day: 12, task: "Carousel: 5 reasons to get excited" },
          { day: 13, task: "Behind-the-scenes video snippet" },
          { day: 14, task: "Feature comparison: before vs after" },
          { day: 15, task: "Drop another partial reveal" },
          { day: 16, task: "Post a customer success story" },
          { day: 17, task: "Create an animated countdown graphic" },
          { day: 18, task: "Share a quote from beta testers" },
          { day: 19, task: "Visual hint using emojis or symbols" },
          { day: 20, task: "Post a meme or lighthearted take on the problem" },
          { day: 21, task: "Carousel: How it works in 4 steps" },
          { day: 22, task: "Behind-the-scenes: design evolution" },
          { day: 23, task: "Remind about upcoming launch via motion graphic" },
          { day: 24, task: "Post a teaser video clip" },
          { day: 25, task: "Visual: problem vs solution comparison" },
          { day: 26, task: "Share another customer testimonial" },
          { day: 27, task: "Final countdown post with urgency" },
          { day: 28, task: "Behind-the-scenes: final preparations" },
          { day: 29, task: "Last teaser before launch" },
          { day: 30, task: "Launch day post: include headline + CTA + visual" }
        ]
      },
      {
        targetAudience: "Aggressive",
        data: Array.from({ length: 60 }).map((_, i) => ({
          day: Math.floor(i / 2) + 1,
          task: `Post idea #${i + 1} for high-frequency launch content (e.g., sneak peek, feature, customer benefit, social proof)`
        }))
      }
    ]
  },
  {
    id: "2",
    goal: "Growing Followers",
    intensityPlans: [
      {
        targetAudience: "Light",
        data: [
          { day: 1, task: "Design a post welcoming new followers with bold visuals" },
          { day: 4, task: "Share a short-form video answering a frequently asked question" },
          { day: 7, task: "Publish a carousel post with 3–5 quick tips in your niche" },
          { day: 10, task: "Post a quote graphic that aligns with your audience mindset" },
          { day: 14, task: "Share a personal brand story with a clean portrait or selfie" },
          { day: 18, task: "Create a 'Did you know?' fact post with eye-catching design" },
          { day: 21, task: "Post a 'myth vs fact' graphic busting a common misconception" },
          { day: 25, task: "Share a roundup of your most saved or shared content" },
          { day: 28, task: "Design a call-to-follow post with minimal text" },
          { day: 30, task: "Post a recap of this month's best performing posts" }
        ]
      },
      {
        targetAudience: "Light-Moderate",
        data: [
          { day: 1, task: "Carousel introducing your niche with clear value proposition" },
          { day: 3, task: "Share a short 'what we do' intro reel" },
          { day: 5, task: "Post a quote that aligns with your brand personality" },
          { day: 6, task: "Quick tip carousel: 3 hacks in your space" },
          { day: 8, task: "Design a post welcoming new followers" },
          { day: 10, task: "Before/After style visual of your service" },
          { day: 12, task: "Share a visual testimonial or client quote" },
          { day: 14, task: "Create a 'start here' beginner guide" },
          { day: 16, task: "Post a quote graphic that aligns with your audience mindset" },
          { day: 18, task: "Share a personal brand story with visuals" },
          { day: 20, task: "Create a 'Did you know?' fact post" },
          { day: 22, task: "Mini carousel: Top 3 myths in your industry" },
          { day: 24, task: "Share a visual of your favorite tool/app" },
          { day: 26, task: "Post a 'myth vs fact' graphic" },
          { day: 28, task: "Share a roundup of your most saved content" },
          { day: 30, task: "Post a recap of this month's best performing posts" }
        ]
      },
      {
        targetAudience: "Moderate",
        data: [
          { day: 1, task: "Post a carousel introducing your niche and audience promise" },
          { day: 2, task: "Create a short 'what we do' intro reel" },
          { day: 3, task: "Share a quote that aligns with your brand personality" },
          { day: 4, task: "Quick tip carousel: 3 hacks in your space" },
          { day: 5, task: "Before/After style visual of your service" },
          { day: 6, task: "Design a question-style post to spark engagement" },
          { day: 7, task: "Create a list-style post: tools you recommend" },
          { day: 8, task: "Post a trending meme adapted to your niche" },
          { day: 9, task: "Share a visual testimonial or client quote" },
          { day: 10, task: "Use a popular format (e.g., 'POV:...') to hook viewers" },
          { day: 11, task: "Create a 'start here' beginner guide" },
          { day: 12, task: "Reel: Timelapse of a process or workspace" },
          { day: 13, task: "Infographic of an industry insight or stat" },
          { day: 14, task: "Post a storytelling caption with a visual metaphor" },
          { day: 15, task: "Mini carousel: Top 3 myths in your industry" },
          { day: 16, task: "Create a day-in-the-life or schedule overview" },
          { day: 17, task: "Share a visual of your favorite tool/app" },
          { day: 18, task: "Clip of a behind-the-scenes moment or setup" },
          { day: 19, task: "Poll-style graphic: 'Which one are you?'" },
          { day: 20, task: "Animated list: Top 5 tips" },
          { day: 21, task: "Collage or grid post: transformation/impact" },
          { day: 22, task: "Sketch or drawing with storytelling angle" },
          { day: 23, task: "BTS + text: 'how we made this post'" },
          { day: 24, task: "Personal tip you'd give your past self" },
          { day: 25, task: "Mini case study in carousel format" },
          { day: 26, task: "List post: X things I wish I knew earlier" },
          { day: 27, task: "Create a 'tool of the week' highlight" },
          { day: 28, task: "Post a milestone: 'We hit X followers!'" },
          { day: 29, task: "Post a controversial opinion + invite replies" },
          { day: 30, task: "Monthly wrap-up: wins + popular content" }
        ]
      },
      {
        targetAudience: "Moderate-Aggressive",
        data: [
          { day: 1, task: "Post a carousel introducing your niche and audience promise" },
          { day: 2, task: "Create a short 'what we do' intro reel" },
          { day: 3, task: "Share a quote that aligns with your brand personality" },
          { day: 4, task: "Quick tip carousel: 3 hacks in your space" },
          { day: 5, task: "Before/After style visual of your service" },
          { day: 6, task: "Design a question-style post to spark engagement" },
          { day: 7, task: "Create a list-style post: tools you recommend" },
          { day: 8, task: "Post a trending meme adapted to your niche" },
          { day: 9, task: "Share a visual testimonial or client quote" },
          { day: 10, task: "Use a popular format (e.g., 'POV:...') to hook viewers" },
          { day: 11, task: "Create a 'start here' beginner guide" },
          { day: 12, task: "Reel: Timelapse of a process or workspace" },
          { day: 13, task: "Infographic of an industry insight or stat" },
          { day: 14, task: "Post a storytelling caption with a visual metaphor" },
          { day: 15, task: "Mini carousel: Top 3 myths in your industry" },
          { day: 16, task: "Create a day-in-the-life or schedule overview" },
          { day: 17, task: "Share a visual of your favorite tool/app" },
          { day: 18, task: "Clip of a behind-the-scenes moment or setup" },
          { day: 19, task: "Poll-style graphic: 'Which one are you?'" },
          { day: 20, task: "Animated list: Top 5 tips" },
          { day: 21, task: "Collage or grid post: transformation/impact" },
          { day: 22, task: "Sketch or drawing with storytelling angle" },
          { day: 23, task: "BTS + text: 'how we made this post'" },
          { day: 24, task: "Personal tip you'd give your past self" },
          { day: 25, task: "Mini case study in carousel format" },
          { day: 26, task: "List post: X things I wish I knew earlier" },
          { day: 27, task: "Create a 'tool of the week' highlight" },
          { day: 28, task: "Post a milestone: 'We hit X followers!'" },
          { day: 29, task: "Post a controversial opinion + invite replies" },
          { day: 30, task: "Monthly wrap-up: wins + popular content" }
        ]
      },
      {
        targetAudience: "Aggressive",
        data: Array.from({ length: 60 }).map((_, i) => ({
          day: Math.floor(i / 2) + 1,
          task: `Content idea #${i + 1} for growing followers fast: carousel, reel, insight, or viral hook`
        }))
      }
    ]
  },
  {
    id: "3",
    goal: "Making an Announcement",
    intensityPlans: [
      {
        targetAudience: "Light",
        data: [
          { day: 1, task: "Share a teaser post with vague but intriguing messaging" },
          { day: 3, task: "Publish a behind-the-scenes photo hinting at the news" },
          { day: 5, task: "Create a countdown post with bold typography" },
          { day: 7, task: "Post the announcement with a strong headline and visual" },
          { day: 10, task: "Follow up with a visual that explains what's next" }
        ]
      },
      {
        targetAudience: "Light-Moderate",
        data: [
          { day: 1, task: "Tease the announcement using a blurry image or zoom-in crop" },
          { day: 2, task: "Share a behind-the-scenes photo hinting at the news" },
          { day: 3, task: "Drop a hint using emojis or symbolic visuals" },
          { day: 4, task: "Post a quote or phrase that ties into the upcoming reveal" },
          { day: 5, task: "Create a countdown post with bold typography" },
          { day: 6, task: "Behind-the-scenes image with subtle caption" },
          { day: 7, task: "Announcement post with bold headline + caption CTA" },
          { day: 8, task: "Follow up with a visual that explains what's next" },
          { day: 9, task: "Post a user/follower reaction screenshot" },
          { day: 10, task: "Follow-up content: what's next and why it matters" }
        ]
      },
      {
        targetAudience: "Moderate",
        data: [
          { day: 1, task: "Tease the announcement using a blurry image or zoom-in crop" },
          { day: 2, task: "Create a countdown story or post with minimal detail" },
          { day: 3, task: "Drop a hint using emojis or symbolic visuals" },
          { day: 4, task: "Post a quote or phrase that ties into the upcoming reveal" },
          { day: 5, task: "Create a carousel showing 3 reasons why this matters" },
          { day: 6, task: "Behind-the-scenes image with subtle caption" },
          { day: 7, task: "Announcement post with bold headline + caption CTA" },
          { day: 8, task: "Repost the announcement in a reel format" },
          { day: 9, task: "Post a user/follower reaction screenshot" },
          { day: 10, task: "Follow-up content: what’s next and why it matters" }
        ]
      },
      {
        targetAudience: "Moderate-Aggressive",
        data: [
          { day: 1, task: "Tease the announcement using a blurry image or zoom-in crop" },
          { day: 2, task: "Create a countdown story or post with minimal detail" },
          { day: 3, task: "Drop a hint using emojis or symbolic visuals" },
          { day: 4, task: "Post a quote or phrase that ties into the upcoming reveal" },
          { day: 5, task: "Create a carousel showing 3 reasons why this matters" },
          { day: 6, task: "Behind-the-scenes image with subtle caption" },
          { day: 7, task: "Share another teaser with visual hint" },
          { day: 8, task: "Post a behind-the-scenes video snippet" },
          { day: 9, task: "Create an animated countdown graphic" },
          { day: 10, task: "Announcement post with bold headline + caption CTA" },
          { day: 11, task: "Repost the announcement in a reel format" },
          { day: 12, task: "Post a user/follower reaction screenshot" },
          { day: 13, task: "Share a visual that explains what's next" },
          { day: 14, task: "Follow-up content: what's next and why it matters" },
          { day: 15, task: "Post additional details or FAQ" },
          { day: 16, task: "Share more user reactions or testimonials" },
          { day: 17, task: "Create a recap of the announcement" },
          { day: 18, task: "Post next steps or call-to-action" },
          { day: 19, task: "Share behind-the-scenes of the announcement creation" },
          { day: 20, task: "Final follow-up with key takeaways" }
        ]
      },
      {
        targetAudience: "Aggressive",
        data: Array.from({ length: 60 }).map((_, i) => ({
          day: Math.floor(i / 2) + 1,
          task: `Announcement build-up content #${i + 1}: teaser, visual hint, or follow-up variant`
        }))
      }
    ]
  }
];

const _plan = {goal: "", ...campaignPlanner[0].intensityPlans[0]}
export type CampaignPlanner =  typeof _plan;
