import { PrismaClient, TemplateCategory } from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  {
    title: "I finished Creator Camp",
    description: "Reflect on completing 30 days of Creator Camp.",
    content: `I just finished 30 days of Creator Camp.

Here's what happened:

→{{The biggest lesson about consistency, content, or yourself}}

→{{Something unexpected that happened along the way}}

→{{The habit, mindset, or practice you'll continue}}

To everyone else who finished: we did it. 🎉`,
    category: TemplateCategory.STORY,
    icon: "🎓",
  },
  {
    title: "I didn't think I could do it — and then I did",
    description: "Tell the story of trying something you thought was out of reach. What made you take the leap, and what surprised you...",
    content: `I didn't think I could {{achieve this goal}} — and then I did.

Here's what changed:

{{What made you take the leap?}}

{{What surprised you most about the process?}}

{{What you learned about yourself}}

If you're on the fence about {{similar challenge}}, here's my advice: {{your key insight}}`,
    category: TemplateCategory.STORY,
    icon: "🚀",
  },
  {
    title: "Tell me your best tip for [common challenge]",
    description: "Ask your audience to share their go-to strategy, tool, or mindset for something you're currently working on.",
    content: `Tell me your best tip for {{common challenge}}.

I'm currently {{what you're working on}} and would love to hear:

→ Your go-to strategy
→ A tool or resource that changed the game
→ The mindset shift that made the difference

Drop your wisdom below! 👇`,
    category: TemplateCategory.QUESTION,
    icon: "📁",
  },
  {
    title: "Monthly goals",
    description: "Share your creative, business, or personal goals for the month and invite your audience to do the same.",
    content: `{{Month}} goals, let's go! 🎯

Here's what I'm focusing on this month:

🎯 {{Goal 1}}
🎯 {{Goal 2}}
🎯 {{Goal 3}}

What are you working towards this month? Share below and let's hold each other accountable! 💪`,
    category: TemplateCategory.LIST,
    icon: "🍂",
  },
  {
    title: "Scarier than ghosting",
    description: "Create a fun, relatable list that ties into both seasonal humor and consistency.",
    content: `Things scarier than ghosting:

👻 {{Scary thing 1}}
👻 {{Scary thing 2}}
👻 {{Scary thing 3}}

What would you add to the list? 👇`,
    category: TemplateCategory.LIST,
    icon: "🎃",
  },
  {
    title: "That time I ghosted...",
    description: "Tell a story about a time you didn't follow through on something and what you learned from it.",
    content: `That time I ghosted {{what you ghosted}}...

I had every intention of {{what you planned to do}}, but then {{what happened}}.

Here's what I learned:

→ {{Lesson 1}}
→ {{Lesson 2}}
→ {{Lesson 3}}

Have you ever been in a similar situation? How did you handle it?`,
    category: TemplateCategory.STORY,
    icon: "🎃",
  },
  {
    title: "3 ways to avoid ghosting",
    description: "Share quick, practical tips to help your audience stay on top of industry-specific things this season.",
    content: `3 ways to avoid {{ghosting/falling behind}}:

1️⃣ {{Tip 1}}
   Why it works: {{explanation}}

2️⃣ {{Tip 2}}
   Why it works: {{explanation}}

3️⃣ {{Tip 3}}
   Why it works: {{explanation}}

Which one resonates most with you?`,
    category: TemplateCategory.TIP,
    icon: "🎃",
  },
  {
    title: "Behind-the-scenes of not ghosting",
    description: "Show your process for staying consistent with content during a busy October.",
    content: `Behind-the-scenes: How I'm staying consistent this {{time period}}

Here's my actual process:

📅 {{Process step 1}}
📝 {{Process step 2}}
⏰ {{Process step 3}}

It's not perfect, but it's working. What's your system?`,
    category: TemplateCategory.BEHIND_THE_SCENES,
    icon: "🎃",
  },
  {
    title: "What's scarier?",
    description: "Spark conversation with a seasonal 'would you rather' style question.",
    content: `What's scarier?

{{Option 1}} or {{Option 2}}?

Drop your answer below and let's see what the community thinks! 👇`,
    category: TemplateCategory.QUESTION,
    icon: "🎃",
  },
  {
    title: "My 'Ask Me Anything' moment",
    description: "Invite your audience to ask you questions about your journey, work, or expertise. Frame it around a specific topic.",
    content: `My "Ask Me Anything" moment about {{topic}}:

I'm opening up the floor for questions on:
→ {{Topic 1}}
→ {{Topic 2}}
→ {{Topic 3}}

What do you want to know? Drop your questions below! 👇`,
    category: TemplateCategory.QUESTION,
    icon: "💬",
  },
  {
    title: "The case study that changed everything",
    description: "Share a detailed breakdown of a project, campaign, or experiment that yielded significant results.",
    content: `The {{case study}} that changed everything:

📊 The Challenge:
{{What problem you were solving}}

🎯 The Approach:
{{Your strategy or method}}

📈 The Results:
→ {{Result 1}}
→ {{Result 2}}
→ {{Result 3}}

💡 Key Takeaway:
{{Main lesson learned}}

What would you do differently?`,
    category: TemplateCategory.CASE_STUDY,
    icon: "📊",
  },
  {
    title: "How I [achieved specific outcome]",
    description: "Break down a step-by-step process for achieving a specific result your audience wants.",
    content: `How I {{achieved specific outcome}}:

Step 1: {{Action 1}}
{{Explanation}}

Step 2: {{Action 2}}
{{Explanation}}

Step 3: {{Action 3}}
{{Explanation}}

The game-changer: {{Key insight}}

Try it and let me know how it goes!`,
    category: TemplateCategory.HOW_TO,
    icon: "🔧",
  },
  {
    title: "Unpopular opinion: [controversial take]",
    description: "Share a contrarian view on a topic in your industry that will spark discussion.",
    content: `Unpopular opinion: {{controversial take}}

Here's why I think this:

{{Reason 1}}

{{Reason 2}}

{{Reason 3}}

I know this might ruffle some feathers, but {{your perspective}}. What do you think?`,
    category: TemplateCategory.OPINION,
    icon: "💭",
  },
];

async function main() {
  console.log("🌱 Seeding templates...");

  // Clear existing templates (optional - remove if you want to keep existing)
  // await prisma.template.deleteMany({});

  for (const template of templates) {
    const existing = await prisma.template.findFirst({
      where: { title: template.title },
    });

    if (!existing) {
      await prisma.template.create({
        data: template,
      });
      console.log(`✅ Created template: ${template.title}`);
    } else {
      console.log(`⏭️  Skipped existing template: ${template.title}`);
    }
  }

  console.log("\n✨ Templates seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding templates:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
