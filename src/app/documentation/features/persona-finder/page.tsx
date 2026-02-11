"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageCircle, RefreshCw } from "lucide-react";

export default function PersonaFinderPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-6 w-6 text-purple-600" />
          <h1 className="text-4xl font-bold">Persona Finder</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Find the right buyer personas for your product with AI-generated, detailed audience profiles
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Persona Finder helps you define your ideal customers by guiding you through a short questionnaire about your product or service. Once you answer, AI generates up to five distinct, detailed buyer personas—including demographics, values, goals, pain points, preferred channels, and messaging angles—so you can create content that resonates.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-purple-600" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Open your project and go to <strong>Persona Finder</strong> (or the Personas tab).</li>
              <li>Answer a few questions about your product name, audience, and goals.</li>
              <li>AI generates five detailed buyer personas based on your answers.</li>
              <li>Review each persona: name, tagline, demographics, lifestyle, goals, pain points, preferred channels, and content preferences.</li>
              <li>Use the personas to guide your content and campaigns. You can regenerate personas from your saved answers anytime (uses credits).</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What Each Persona Includes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Each AI-generated persona includes:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li>Creative name and tagline</li>
              <li>Demographics (age range, location, occupation, income, education)</li>
              <li>Values, interests, and lifestyle</li>
              <li>Goals and pain points</li>
              <li>Buying motivations and preferred channels</li>
              <li>Content preferences and messaging angles</li>
              <li>Tone of voice and key messages</li>
              <li>Day-in-the-life and how your product fits</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-purple-600" />
              Regenerating Personas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your questionnaire answers are saved. You can run <strong>Regenerate Personas</strong> to create a new set of five personas from the same inputs without re-answering. Regeneration uses credits. You can also choose <strong>Redo Questions</strong> to update your answers and generate personas again.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
