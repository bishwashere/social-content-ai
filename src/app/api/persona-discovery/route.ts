import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, ...discoveryData } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Get project details including URL and userId
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: { url: true, name: true, userId: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check user credits (2 credits per persona discovery generation)
    const CREDITS_PER_PERSONA_DISCOVERY = 2;
    const user = await prisma.user.findUnique({
      where: { id: project.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.remainingChatGenerations < CREDITS_PER_PERSONA_DISCOVERY) {
      return NextResponse.json(
        {
          error: `You need ${CREDITS_PER_PERSONA_DISCOVERY} credits to generate personas. You have ${user.remainingChatGenerations} credits.`,
        },
        { status: 400 }
      );
    }

    // Save persona discovery
    const personaDiscovery = await prisma.personaDiscovery.create({
      data: {
        projectId,
        productName: discoveryData.productName || "",
        productDescription: discoveryData.productDescription || "",
        productCategory: discoveryData.productCategory || "",
        priceRange: discoveryData.priceRange || "",
        uniqueValue: discoveryData.uniqueValue || "",
        currentCustomers: discoveryData.currentCustomers || "",
        ageGroups: discoveryData.ageGroups || [],
        genderSplit: discoveryData.genderSplit || "",
        topLocations: discoveryData.topLocations || [],
        occupations: discoveryData.occupations || [],
        discoveryChannels: discoveryData.discoveryChannels || [],
        purchaseTriggers: discoveryData.purchaseTriggers || [],
        commonObjections: discoveryData.commonObjections || [],
        buyingCycleLength: discoveryData.buyingCycleLength || "",
        customerGoals: discoveryData.customerGoals || [],
        frustrations: discoveryData.frustrations || [],
        motivations: discoveryData.motivations || [],
        fears: discoveryData.fears || [],
      },
    });

    // Generate personas using AI
    const personas = await generatePersonas(
      personaDiscovery,
      project.url || ""
    );

    // Save persona results to database
    const savedPersonas = await Promise.all(
      personas.map((persona) =>
        prisma.personaResult.create({
          data: {
            personaDiscoveryId: personaDiscovery.id,
            personaName: persona.personaName || "Unnamed Persona",
            tagline: persona.tagline || "",
            avatar: persona.avatar || "👤",
            ageRange: persona.ageRange || "",
            gender: persona.gender || "",
            location: persona.location || "",
            incomeLevel: persona.incomeLevel || "",
            education: persona.education || "",
            occupation: persona.occupation || "",
            values: persona.values || [],
            interests: persona.interests || [],
            lifestyle: persona.lifestyle || "",
            goals: persona.goals || [],
            painPoints: persona.painPoints || [],
            buyingMotivations: persona.buyingMotivations || [],
            preferredChannels: persona.preferredChannels || [],
            contentPreferences: persona.contentPreferences || [],
            messagingAngles: persona.messagingAngles || [],
            toneOfVoice: persona.toneOfVoice || "",
            keyMessages: persona.keyMessages || [],
            dayInTheLife: persona.dayInTheLife || "",
            howProductFits: persona.howProductFits || "",
          },
        })
      )
    );

    // Deduct credits after successful generation
    await prisma.user.update({
      where: { id: project.userId },
      data: {
        remainingChatGenerations: {
          decrement: CREDITS_PER_PERSONA_DISCOVERY,
        },
      },
    });

    return NextResponse.json({
      success: true,
      personaDiscovery,
      personas: savedPersonas,
    });
  } catch (error) {
    console.error("Error saving persona discovery:", error);
    return NextResponse.json(
      { error: "Failed to save persona discovery" },
      { status: 500 }
    );
  }
}

// Build a worksheet from the persona discovery data
function buildPersonaWorksheet(discovery: any): string {
  return `
PRODUCT NAME: ${discovery.productName}
PRODUCT DESCRIPTION: ${discovery.productDescription}
PRODUCT CATEGORY: ${discovery.productCategory || "N/A"}
PRICE RANGE: ${discovery.priceRange || "N/A"}
UNIQUE VALUE PROPOSITION: ${discovery.uniqueValue || "N/A"}

CURRENT CUSTOMERS: ${discovery.currentCustomers || "N/A"}

AGE GROUPS:
${(discovery.ageGroups || []).map((a: string, i: number) => `${i + 1}. ${a}`).join("\n") || "N/A"}

GENDER SPLIT: ${discovery.genderSplit || "N/A"}

TOP LOCATIONS:
${(discovery.topLocations || []).map((l: string, i: number) => `${i + 1}. ${l}`).join("\n") || "N/A"}

OCCUPATIONS:
${(discovery.occupations || []).map((o: string, i: number) => `${i + 1}. ${o}`).join("\n") || "N/A"}

DISCOVERY CHANNELS:
${(discovery.discoveryChannels || []).map((c: string, i: number) => `${i + 1}. ${c}`).join("\n") || "N/A"}

PURCHASE TRIGGERS:
${(discovery.purchaseTriggers || []).map((t: string, i: number) => `${i + 1}. ${t}`).join("\n") || "N/A"}

COMMON OBJECTIONS:
${(discovery.commonObjections || []).map((o: string, i: number) => `${i + 1}. ${o}`).join("\n") || "N/A"}

BUYING CYCLE LENGTH: ${discovery.buyingCycleLength || "N/A"}

CUSTOMER GOALS:
${(discovery.customerGoals || []).map((g: string, i: number) => `${i + 1}. ${g}`).join("\n") || "N/A"}

FRUSTRATIONS:
${(discovery.frustrations || []).map((f: string, i: number) => `${i + 1}. ${f}`).join("\n") || "N/A"}

MOTIVATIONS:
${(discovery.motivations || []).map((m: string, i: number) => `${i + 1}. ${m}`).join("\n") || "N/A"}

FEARS:
${(discovery.fears || []).map((f: string, i: number) => `${i + 1}. ${f}`).join("\n") || "N/A"}
`;
}

function buildPersonaPrompt(
  productName: string,
  websiteUrl: string,
  worksheet: string
): string {
  return `You are an expert marketing strategist and consumer psychologist. I need you to create detailed buyer personas for ${productName}.

Analyze the following product and customer data, then generate 5 distinct, detailed buyer personas that represent the ideal target audience segments for this product.

Use their website ${websiteUrl} and this worksheet as references:

${worksheet}

For each persona, provide:
1. A creative persona name (e.g., "The Ambitious Millennial", "The Overwhelmed Parent")
2. A short tagline (one-liner description)
3. An emoji avatar that represents them
4. Demographics: age range, gender, location type, income level, education, occupation
5. Psychographics: 3 core values, 3 interests/hobbies, lifestyle description
6. Behavioral: 3 goals, 3 pain points, 3 buying motivations, 3 preferred marketing channels, 3 content preferences
7. Messaging: 3 messaging angles that would resonate, recommended tone of voice, 3 key messages
8. A "day in the life" narrative paragraph (3-4 sentences)
9. How the product fits into their life (2-3 sentences)

Make each persona distinct and well-differentiated from the others. They should cover different segments of the potential market.

IMPORTANT: Return ONLY a valid JSON array. Each persona should be an object with these exact fields:
{
  "personaName": "string",
  "tagline": "string",
  "avatar": "emoji",
  "ageRange": "string",
  "gender": "string",
  "location": "string",
  "incomeLevel": "string",
  "education": "string",
  "occupation": "string",
  "values": ["string", "string", "string"],
  "interests": ["string", "string", "string"],
  "lifestyle": "string",
  "goals": ["string", "string", "string"],
  "painPoints": ["string", "string", "string"],
  "buyingMotivations": ["string", "string", "string"],
  "preferredChannels": ["string", "string", "string"],
  "contentPreferences": ["string", "string", "string"],
  "messagingAngles": ["string", "string", "string"],
  "toneOfVoice": "string",
  "keyMessages": ["string", "string", "string"],
  "dayInTheLife": "string",
  "howProductFits": "string"
}

Return the response as a JSON array with NO additional text or markdown formatting.`;
}

/**
 * Call OpenAI to generate personas. Retries up to 2 times on failure.
 */
async function fetchPersonas(
  apiKey: string,
  prompt: string,
  retries: number = 2
): Promise<any[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are an expert marketing strategist and consumer psychologist. Always respond with valid JSON arrays only, no additional text or markdown formatting.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.8,
            max_tokens: 8192,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error(
          `OpenAI API error (attempt ${attempt + 1}):`,
          errorData
        );
        if (attempt === retries) {
          throw new Error(
            errorData.error?.message || "Failed to generate personas"
          );
        }
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
        continue;
      }

      const data = await response.json();
      const responseText = data.choices[0]?.message?.content || "";

      let jsonText = responseText.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "");
      }

      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error("Response is not an array");
      }

      return parsed;
    } catch (error) {
      console.error(`Persona generation attempt ${attempt + 1} failed:`, error);
      if (attempt === retries) {
        return [];
      }
      await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
    }
  }
  return [];
}

async function generatePersonas(discovery: any, websiteUrl: string) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const worksheet = buildPersonaWorksheet(discovery);
  const prompt = buildPersonaPrompt(
    discovery.productName,
    websiteUrl,
    worksheet
  );

  console.log("[Persona Finder] Generating 5 personas...");

  const personas = await fetchPersonas(openaiApiKey, prompt);

  console.log(`[Persona Finder] Generated ${personas.length} personas`);

  // Fallback if generation fails
  if (personas.length === 0) {
    console.warn("[Persona Finder] Generation failed, returning fallback personas");
    return [
      {
        personaName: "The Early Adopter",
        tagline: "Always first to try new solutions",
        avatar: "🚀",
        ageRange: "25-35",
        gender: "Any",
        location: "Urban areas",
        incomeLevel: "Middle to upper-middle",
        education: "Bachelor's degree or higher",
        occupation: "Tech professional",
        values: ["Innovation", "Efficiency", "Growth"],
        interests: ["Technology", "Productivity", "Self-improvement"],
        lifestyle: "Fast-paced, digitally connected, always looking for better tools.",
        goals: ["Stay ahead of trends", "Optimize daily routines", "Find best-in-class tools"],
        painPoints: ["Too many options to choose from", "Wasting time on ineffective solutions", "Difficulty finding trustworthy products"],
        buyingMotivations: ["Innovative features", "Strong social proof", "Easy onboarding"],
        preferredChannels: ["Twitter/X", "Product Hunt", "Tech blogs"],
        contentPreferences: ["Product demos", "Comparison articles", "User reviews"],
        messagingAngles: ["Be first to experience", "Built for power users", "Join the community"],
        toneOfVoice: "Confident and forward-thinking",
        keyMessages: ["Cutting-edge solution", "Trusted by innovators", "Try it free today"],
        dayInTheLife: `Wakes up early, checks industry news on their phone. Spends the morning optimizing workflows. Lunches while browsing Product Hunt. Evenings dedicated to side projects and learning.`,
        howProductFits: `${discovery.productName} slots into their morning routine as a productivity booster they can rely on daily.`,
      },
      {
        personaName: "The Practical Buyer",
        tagline: "Needs proof before purchasing",
        avatar: "🎯",
        ageRange: "35-50",
        gender: "Any",
        location: "Suburban",
        incomeLevel: "Middle class",
        education: "Bachelor's degree",
        occupation: "Manager or small business owner",
        values: ["Reliability", "Value for money", "Simplicity"],
        interests: ["Business growth", "Family", "Financial planning"],
        lifestyle: "Balances work and family, makes deliberate purchasing decisions.",
        goals: ["Save time and money", "Find reliable solutions", "Grow their business"],
        painPoints: ["Limited budget", "Skeptical of new tools", "No time for complex onboarding"],
        buyingMotivations: ["Clear ROI", "Testimonials from peers", "Money-back guarantee"],
        preferredChannels: ["Email", "Facebook", "Google Search"],
        contentPreferences: ["Case studies", "How-to guides", "Pricing comparisons"],
        messagingAngles: ["Proven results", "Simple and effective", "Risk-free trial"],
        toneOfVoice: "Straightforward and trustworthy",
        keyMessages: ["See real results", "Easy to get started", "Loved by businesses like yours"],
        dayInTheLife: `Starts the day reviewing emails and team updates. Juggles client calls and operations throughout the day. Researches solutions during lunch breaks. Ends the day planning tomorrow's priorities.`,
        howProductFits: `${discovery.productName} provides the proven, no-fuss solution they've been searching for to simplify their workload.`,
      },
    ];
  }

  return personas;
}

// PUT: Regenerate personas using the most recent persona discovery answers
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Get the most recent persona discovery for this project
    const latestDiscovery = await prisma.personaDiscovery.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    if (!latestDiscovery) {
      return NextResponse.json(
        {
          error:
            "No persona discovery found. Please complete the questionnaire first.",
        },
        { status: 404 }
      );
    }

    // Get project URL and userId
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: { url: true, userId: true },
    });

    // Check user credits
    const CREDITS_PER_PERSONA_DISCOVERY = 2;
    if (project) {
      const user = await prisma.user.findUnique({
        where: { id: project.userId },
      });

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      if (user.remainingChatGenerations < CREDITS_PER_PERSONA_DISCOVERY) {
        return NextResponse.json(
          {
            error: `You need ${CREDITS_PER_PERSONA_DISCOVERY} credits to regenerate personas. You have ${user.remainingChatGenerations} credits.`,
          },
          { status: 400 }
        );
      }
    }

    // Delete old persona results for this discovery
    await prisma.personaResult.deleteMany({
      where: { personaDiscoveryId: latestDiscovery.id },
    });

    // Regenerate personas using saved answers
    const personas = await generatePersonas(
      latestDiscovery,
      project?.url || ""
    );

    // Save new persona results
    const savedPersonas = await Promise.all(
      personas.map((persona) =>
        prisma.personaResult.create({
          data: {
            personaDiscoveryId: latestDiscovery.id,
            personaName: persona.personaName || "Unnamed Persona",
            tagline: persona.tagline || "",
            avatar: persona.avatar || "👤",
            ageRange: persona.ageRange || "",
            gender: persona.gender || "",
            location: persona.location || "",
            incomeLevel: persona.incomeLevel || "",
            education: persona.education || "",
            occupation: persona.occupation || "",
            values: persona.values || [],
            interests: persona.interests || [],
            lifestyle: persona.lifestyle || "",
            goals: persona.goals || [],
            painPoints: persona.painPoints || [],
            buyingMotivations: persona.buyingMotivations || [],
            preferredChannels: persona.preferredChannels || [],
            contentPreferences: persona.contentPreferences || [],
            messagingAngles: persona.messagingAngles || [],
            toneOfVoice: persona.toneOfVoice || "",
            keyMessages: persona.keyMessages || [],
            dayInTheLife: persona.dayInTheLife || "",
            howProductFits: persona.howProductFits || "",
          },
        })
      )
    );

    // Deduct credits after successful regeneration
    if (project) {
      await prisma.user.update({
        where: { id: project.userId },
        data: {
          remainingChatGenerations: {
            decrement: CREDITS_PER_PERSONA_DISCOVERY,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      personaDiscovery: latestDiscovery,
      personas: savedPersonas,
    });
  } catch (error) {
    console.error("Error regenerating personas:", error);
    return NextResponse.json(
      { error: "Failed to regenerate personas" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const discoveries = await prisma.personaDiscovery.findMany({
      where: { projectId },
      include: {
        personaResults: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const allPersonas = discoveries.flatMap(
      (discovery) => discovery.personaResults
    );

    return NextResponse.json({ discoveries, personas: allPersonas });
  } catch (error) {
    console.error("Error fetching persona discoveries:", error);
    return NextResponse.json(
      { error: "Failed to fetch persona discoveries" },
      { status: 500 }
    );
  }
}
