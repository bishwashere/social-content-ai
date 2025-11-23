"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGetTemplate } from "@/backend-apis/templates/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  const { data: template, isLoading } = useGetTemplate(templateId);
  
  const [placeholders, setPlaceholders] = useState<Record<string, string>>({});
  const [finalContent, setFinalContent] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Extract placeholders from template content
  useEffect(() => {
    if (template?.content) {
      const placeholderRegex = /\{\{([^}]+)\}\}/g;
      const matches = Array.from(template.content.matchAll(placeholderRegex));
      const initialPlaceholders: Record<string, string> = {};
      
      matches.forEach((match) => {
        const placeholder = match[1].trim();
        if (!initialPlaceholders[placeholder]) {
          initialPlaceholders[placeholder] = "";
        }
      });
      
      setPlaceholders(initialPlaceholders);
    }
  }, [template]);

  // Update final content when placeholders change
  useEffect(() => {
    if (template?.content) {
      let content = template.content;
      Object.entries(placeholders).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
        content = content.replace(regex, value || `{{${key}}}`);
      });
      setFinalContent(content);
    }
  }, [placeholders, template]);

  const handlePlaceholderChange = (key: string, value: string) => {
    setPlaceholders((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(finalContent);
    setCopied(true);
    toast.success("Content copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseTemplate = () => {
    // Navigate to quick generate or create a new post with this content
    // For now, just copy the content
    handleCopy();
  };

  if (isLoading) {
    return (
      <main className="flex-grow max-w-4xl mx-auto py-8 px-6 md:px-14 xl:px-20">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </main>
    );
  }

  if (!template) {
    return (
      <main className="flex-grow max-w-4xl mx-auto py-8 px-6 md:px-14 xl:px-20">
        <div className="text-center py-12">
          <p className="text-gray-500">Template not found</p>
          <Button onClick={() => router.push("/project/templates")} className="mt-4">
            Back to Templates
          </Button>
        </div>
      </main>
    );
  }

  const placeholderKeys = Object.keys(placeholders);

  return (
    <main className="flex-grow max-w-4xl mx-auto py-8 px-6 md:px-14 xl:px-20">
      <Button
        variant="ghost"
        onClick={() => router.push("/project/templates")}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Templates
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">{template.title}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </div>
            {template.icon && (
              <span className="text-4xl">{template.icon}</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Placeholder Inputs */}
          {placeholderKeys.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Fill in the details:</h3>
              {placeholderKeys.map((key) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key} className="capitalize">
                    {key.replace(/_/g, " ")}
                  </Label>
                  <Textarea
                    id={key}
                    placeholder={`Enter ${key.replace(/_/g, " ").toLowerCase()}`}
                    value={placeholders[key]}
                    onChange={(e) => handlePlaceholderChange(key, e.target.value)}
                    rows={2}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Preview:</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <div className="border rounded-md p-4 bg-gray-50 min-h-[200px] whitespace-pre-wrap">
              {finalContent || template.content}
            </div>
          </div>

          {/* Use Template Button */}
          <Button
            onClick={handleUseTemplate}
            className="w-full"
            size="lg"
          >
            Use Template
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
