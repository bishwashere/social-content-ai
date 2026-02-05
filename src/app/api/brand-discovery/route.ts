import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

async function generateAdCreatives(brandDiscovery: any, websiteUrl: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash-001" });

  // Build the worksheet context
  const worksheet = `
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

  const prompt = `I'm writing Facebook ad copy for ${brandDiscovery.brandName}. The goal of this campaign will be to drive online purchases for my product.

Give me Facebook ad concepts for each of the following angles:
1. Social proof
2. Our product vs competitors
3. Our product vs. alternatives
4. Before and after
5. Problem/Solution
6. Emotional
7. Key desire
8. Pain
9. Benefits
10. Features
11. Testimonial
12. Transformation
13. Jobs to be done
14. Bold promise
15. Advertorial
16. Controversial
17. FOMO
18. Relatable Scenario
19. Save time
20. Save money
21. It's easy
22. Social approval
23. Increased comfort
24. Increased happiness
25. Reduced stress
26. Reduced fear
27. Convenience
28. Quality
29. Care & Protection of loved ones
30. Disruptive statement
31. Loss aversion
32. Curiosity
33. Pattern interruption
34. Competitors hate this

Additionally, include 10 angles I didn't think of.

The ad concepts should be broken into:
- An ad image description
- Ad image copy
- A headline
- A primary text

Use their website ${websiteUrl} and this worksheet as references:

${worksheet}

IMPORTANT: Return ONLY a valid JSON array. Each ad should be an object with these exact fields:
{
  "angle": "the angle name",
  "imageDescription": "description of the ad image",
  "imageCopy": "text to overlay on the image",
  "headline": "the headline",
  "primaryText": "the primary text"
}

Return the response as a JSON array with NO additional text or markdown formatting.`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Try to extract JSON from the response
    let jsonText = responseText.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    }
    
    const adCreatives = JSON.parse(jsonText);
    
    // Validate the structure
    if (!Array.isArray(adCreatives)) {
      throw new Error("Response is not an array");
    }
    
    return adCreatives;
  } catch (error) {
    console.error("Error generating ad creatives:", error);
    
    // Return fallback ad creatives if AI generation fails
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

    return NextResponse.json({ discoveries });
  } catch (error) {
    console.error("Error fetching brand discoveries:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand discoveries" },
      { status: 500 }
    );
  }
}
