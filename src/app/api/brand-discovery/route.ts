import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";

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

    // Get project details including URL
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: { url: true, name: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Save brand discovery
    const brandDiscovery = await prisma.brandDiscovery.create({
      data: {
        projectId,
        brandName: discoveryData.brandName || "",
        productDescription: discoveryData.productDescription || "",
        features: discoveryData.features || [],
        heroPersona: discoveryData.heroPersona || "",
        benefits: discoveryData.benefits || [],
        buyerQuestions: discoveryData.buyerQuestions || [],
        competitors: discoveryData.competitors || [],
        competitiveDiff: discoveryData.competitiveDiff || "",
        testimonials: discoveryData.testimonials || [],
        proofPoints: discoveryData.proofPoints || [],
        customerDescription: discoveryData.customerDescription || "",
        dreamOutcome: discoveryData.dreamOutcome || "",
        jobsToBeDone: discoveryData.jobsToBeDone || [],
        challenges: discoveryData.challenges || [],
        emotionalBenefits: discoveryData.emotionalBenefits || [],
        transformations: discoveryData.transformations || [],
        perceptions: discoveryData.perceptions || [],
        alternatives: discoveryData.alternatives || [],
        alternativesDiff: discoveryData.alternativesDiff || "",
        lifeEvents: discoveryData.lifeEvents || [],
      },
    });

    // Generate ad creatives using AI
    const adCreatives = await generateAdCreatives(brandDiscovery, project.url || "");

    // Save ad creatives to database
    const savedAdCreatives = await Promise.all(
      adCreatives.map((creative) =>
        prisma.adCreative.create({
          data: {
            brandDiscoveryId: brandDiscovery.id,
            angle: creative.angle,
            imageDescription: creative.imageDescription,
            imageCopy: creative.imageCopy,
            headline: creative.headline,
            primaryText: creative.primaryText,
            platform: "facebook",
            status: "draft",
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      brandDiscovery,
      adCreatives: savedAdCreatives,
    });
  } catch (error) {
    console.error("Error saving brand discovery:", error);
    return NextResponse.json(
      { error: "Failed to save brand discovery" },
      { status: 500 }
    );
  }
}

// All 34 predefined ad angles
const AD_ANGLES = [
  "Social proof",
  "Our product vs competitors",
  "Our product vs. alternatives",
  "Before and after",
  "Problem/Solution",
  "Emotional",
  "Key desire",
  "Pain",
  "Benefits",
  "Features",
  "Testimonial",
  "Transformation",
  "Jobs to be done",
  "Bold promise",
  "Advertorial",
  "Controversial",
  "FOMO",
  "Relatable Scenario",
  "Save time",
  "Save money",
  "It's easy",
  "Social approval",
  "Increased comfort",
  "Increased happiness",
  "Reduced stress",
  "Reduced fear",
  "Convenience",
  "Quality",
  "Care & Protection of loved ones",
  "Disruptive statement",
  "Loss aversion",
  "Curiosity",
  "Pattern interruption",
  "Competitors hate this",
];

function buildWorksheet(brandDiscovery: any): string {
  return `
BRAND: ${brandDiscovery.brandName}
PRODUCT: ${brandDiscovery.productDescription}

FEATURES:
${brandDiscovery.features.map((f: string, i: number) => `${i + 1}. ${f}`).join("\n")}

BENEFITS:
${brandDiscovery.benefits.map((b: string, i: number) => `${i + 1}. ${b}`).join("\n")}

HERO PERSONA: ${brandDiscovery.heroPersona}

BUYER QUESTIONS:
${brandDiscovery.buyerQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}

COMPETITORS:
${brandDiscovery.competitors.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}

COMPETITIVE ADVANTAGE: ${brandDiscovery.competitiveDiff}

TESTIMONIALS:
${brandDiscovery.testimonials.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}

PROOF POINTS:
${brandDiscovery.proofPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}

CUSTOMER: ${brandDiscovery.customerDescription}

DREAM OUTCOME: ${brandDiscovery.dreamOutcome}

JOBS TO BE DONE:
${brandDiscovery.jobsToBeDone.map((j: string, i: number) => `${i + 1}. ${j}`).join("\n")}

CHALLENGES:
${brandDiscovery.challenges.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}

EMOTIONAL BENEFITS:
${brandDiscovery.emotionalBenefits.map((e: string, i: number) => `${i + 1}. ${e}`).join("\n")}

TRANSFORMATIONS:
${brandDiscovery.transformations.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}

PERCEPTIONS:
${brandDiscovery.perceptions.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}

ALTERNATIVES:
${brandDiscovery.alternatives.map((a: string, i: number) => `${i + 1}. ${a}`).join("\n")}

WHY BETTER THAN ALTERNATIVES: ${brandDiscovery.alternativesDiff}

LIFE EVENTS:
${brandDiscovery.lifeEvents.map((l: string, i: number) => `${i + 1}. ${l}`).join("\n")}
`;
}

function buildBatchPrompt(
  brandName: string,
  websiteUrl: string,
  worksheet: string,
  angles: string[],
  extraAiAngles: number = 0
): string {
  const anglesList = angles
    .map((a, i) => `${i + 1}. ${a}`)
    .join("\n");

  const extraLine =
    extraAiAngles > 0
      ? `\nAdditionally, include ${extraAiAngles} more creative angles I didn't think of.\n`
      : "";

  return `I'm writing Facebook ad copy for ${brandName}. The goal of this campaign will be to drive online purchases for my product.

Give me Facebook ad concepts for each of the following angles:
${anglesList}
${extraLine}
The ad concepts should be broken into:
- An ad image description
- Ad image text overlay (the short text placed on top of the image)
- A headline
- A primary text

Use their website ${websiteUrl} and this worksheet as references:

${worksheet}

IMPORTANT: Return ONLY a valid JSON array. Each ad should be an object with these exact fields:
{
  "angle": "the angle name",
  "imageDescription": "description of the ad image",
  "imageCopy": "short text overlay on the image",
  "headline": "the headline",
  "primaryText": "the primary text"
}

Return the response as a JSON array with NO additional text or markdown formatting.`;
}

/**
 * Call OpenAI for a single batch of angles. Retries up to 2 times on failure.
 */
async function fetchBatch(
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
                  "You are an expert Facebook ad copywriter. Always respond with valid JSON arrays only, no additional text or markdown formatting.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.8,
            max_tokens: 4096,
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
            errorData.error?.message || "Failed to generate ad creatives"
          );
        }
        // Wait before retrying (1s, then 2s)
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
      console.error(
        `Batch attempt ${attempt + 1} failed:`,
        error
      );
      if (attempt === retries) {
        return []; // Return empty for this batch so other batches still work
      }
      await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
    }
  }
  return [];
}

async function generateAdCreatives(brandDiscovery: any, websiteUrl: string) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error("OpenAI API key not configured");
  }

  const worksheet = buildWorksheet(brandDiscovery);

  // Split angles into batches of ~10 for reliability
  const BATCH_SIZE = 10;
  const batches: string[][] = [];
  for (let i = 0; i < AD_ANGLES.length; i += BATCH_SIZE) {
    batches.push(AD_ANGLES.slice(i, i + BATCH_SIZE));
  }

  console.log(
    `[Ad Discovery] Generating ads in ${batches.length + 1} batches (${AD_ANGLES.length} angles + 10 AI-suggested)...`
  );

  // Run all angle batches in parallel
  const batchPromises = batches.map((angleBatch, idx) => {
    const prompt = buildBatchPrompt(
      brandDiscovery.brandName,
      websiteUrl,
      worksheet,
      angleBatch
    );
    console.log(
      `[Ad Discovery] Batch ${idx + 1}: ${angleBatch.length} angles`
    );
    return fetchBatch(openaiApiKey, prompt);
  });

  // Extra batch: 10 AI-suggested angles
  const aiAnglesBatchPrompt = `I'm writing Facebook ad copy for ${brandDiscovery.brandName}. The goal of this campaign will be to drive online purchases for my product.

Come up with 10 unique and creative ad angles that would work well for this brand. These should be angles not covered by common ones like social proof, before/after, FOMO, etc.

The ad concepts should be broken into:
- An ad image description
- Ad image text overlay (the short text placed on top of the image)
- A headline
- A primary text

Use their website ${websiteUrl} and this worksheet as references:

${worksheet}

IMPORTANT: Return ONLY a valid JSON array. Each ad should be an object with these exact fields:
{
  "angle": "the angle name",
  "imageDescription": "description of the ad image",
  "imageCopy": "short text overlay on the image",
  "headline": "the headline",
  "primaryText": "the primary text"
}

Return the response as a JSON array with NO additional text or markdown formatting.`;

  batchPromises.push(fetchBatch(openaiApiKey, aiAnglesBatchPrompt));

  // Wait for all batches to complete
  const batchResults = await Promise.all(batchPromises);

  // Merge all results
  const allCreatives = batchResults.flat();

  console.log(
    `[Ad Discovery] Generated ${allCreatives.length} ad creatives total`
  );

  // If everything failed, return fallback
  if (allCreatives.length === 0) {
    console.warn("[Ad Discovery] All batches failed, returning fallback ads");
    return [
      {
        angle: "Social Proof",
        imageDescription: "Happy customers using the product",
        imageCopy: "Join 10,000+ satisfied customers",
        headline: "Trusted by thousands",
        primaryText: `See why customers love ${brandDiscovery.brandName}. ${brandDiscovery.testimonials[0] || "Amazing results!"}`,
      },
      {
        angle: "Problem/Solution",
        imageDescription: "Split image showing problem vs solution",
        imageCopy: "From frustrated to fulfilled",
        headline: "Finally, a solution that works",
        primaryText: `Tired of ${brandDiscovery.challenges[0] || "the old way"}? ${brandDiscovery.brandName} makes it easy.`,
      },
    ];
  }

  return allCreatives;
}

// PUT: Regenerate ads using the most recent brand discovery answers (no questionnaire needed)
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

    // Get the most recent brand discovery for this project
    const latestDiscovery = await prisma.brandDiscovery.findFirst({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    if (!latestDiscovery) {
      return NextResponse.json(
        { error: "No brand discovery found. Please complete the questionnaire first." },
        { status: 404 }
      );
    }

    // Get project URL
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: { url: true },
    });

    // Delete old ad creatives for this discovery so we get a fresh set
    await prisma.adCreative.deleteMany({
      where: { brandDiscoveryId: latestDiscovery.id },
    });

    // Regenerate ad creatives using saved answers
    const adCreatives = await generateAdCreatives(
      latestDiscovery,
      project?.url || ""
    );

    // Save new ad creatives
    const savedAdCreatives = await Promise.all(
      adCreatives.map((creative) =>
        prisma.adCreative.create({
          data: {
            brandDiscoveryId: latestDiscovery.id,
            angle: creative.angle,
            imageDescription: creative.imageDescription,
            imageCopy: creative.imageCopy,
            headline: creative.headline,
            primaryText: creative.primaryText,
            platform: "facebook",
            status: "draft",
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      brandDiscovery: latestDiscovery,
      adCreatives: savedAdCreatives,
    });
  } catch (error) {
    console.error("Error regenerating ads:", error);
    return NextResponse.json(
      { error: "Failed to regenerate ad creatives" },
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

    const discoveries = await prisma.brandDiscovery.findMany({
      where: { projectId },
      include: {
        adCreatives: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const allAdCreatives = discoveries.flatMap(
      discovery => discovery.adCreatives
    );

    // Generate signed URLs for ads that have images
    const adCreativesWithUrls = await Promise.all(
      allAdCreatives.map(async (ad) => {
        if (ad.imageKey) {
          try {
            const imageUrl = await s3.getSignedUrlForExternalApi(ad.imageKey);
            return { ...ad, imageUrl };
          } catch {
            return { ...ad, imageUrl: null };
          }
        }
        return { ...ad, imageUrl: null };
      })
    );

    return NextResponse.json({ discoveries, adCreatives: adCreativesWithUrls });
  } catch (error) {
    console.error("Error fetching brand discoveries:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand discoveries" },
      { status: 500 }
    );
  }
}
