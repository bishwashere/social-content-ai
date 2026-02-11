"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Image, FileText } from "lucide-react";

export default function BrandDiscoveryPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-6 w-6 text-amber-600" />
          <h1 className="text-4xl font-bold">Brand Discovery & Creative Generation</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Capture your brand story and generate dozens of ad concepts with AI
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The Brand Discovery tool collects detailed information about your product, market, and customers through a structured questionnaire. Once you complete it, AI generates 40+ Facebook ad concepts tailored to your brand, each with angle, headline, primary text, and image direction.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-600" />
              What You Provide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              The questionnaire covers:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>Product:</strong> Brand name, description, features, benefits, hero persona</li>
              <li><strong>Market:</strong> Competitors, competitive differentiation</li>
              <li><strong>Social proof:</strong> Testimonials, proof points</li>
              <li><strong>Customer insights:</strong> Demographics, pain points, transformations, alternatives</li>
              <li><strong>Behavioral triggers:</strong> Life events that trigger purchases</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ad Creatives Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Each concept includes an angle (e.g. social proof, FOMO, problem/solution), headline, primary text, image description, and image copy overlay. You get many angles so you can test what resonates with your audience.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-amber-600" />
              Image Generation for Creatives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You can generate images for your ad creatives directly from the platform:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Use the image description from each ad concept to generate a matching visual</li>
              <li>Credits are used for image generation; you’ll see a confirmation before deducting</li>
              <li>Generated images can be used in your Facebook ad campaigns</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
