"use client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Markdown from "react-markdown";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CopyIcon, RefreshCcw, Share2Icon, Sparkle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Project } from "@/backend-apis/projects/types";
import { useGenerateProjectContent } from "@/backend-apis/projects/hooks";
import Link from "next/link";
interface ContentGeneratorProps {
  project: Project;
}

export function ContentGenerator({
  project,
}: ContentGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const generateProjectContent = useGenerateProjectContent()

  const copyToClipboard = useMemo(() => (text: string, platform: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast.success(`${platform} content copied to clipboard!`);
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast.error("Failed to copy content");
      }
    );
  }, []);

  return (
    <div className="space-y-4 w-full">
      <Label htmlFor="prompt">User Prompt:</Label>
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Create a fun and engaging post to promote on creative community."
        className="min-h-[100px] min-w-96"
      />
      <Button
        onClick={() => {
          generateProjectContent.mutate({
            projectId: project._id, userPrompt: prompt,
            retry: generateProjectContent.data ? { chatId: generateProjectContent.data?._id } : undefined
          })
        }}
        loading={generateProjectContent.isPending}
        size={"lg"}
        className="w-full"
      >
        {generateProjectContent.data ? (
          <>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Regenerate Content
          </>
        ) : (
          <>
            <Sparkle className="h-4 w-4 mr-2" />
            Generate Content
          </>
        )}
      </Button>
      {/* {credits <= 0 && (
        <p className="text-sm text-destructive">
          You have no credits left. Please purchase more credits.
        </p>
      )} */}
      {generateProjectContent.data && (
        <div className="mt-4 flex flex-row flex-wrap gap-4 overflow-y-auto">
          <ScrollArea className="">
            {Object.entries(generateProjectContent.data.contents).map(([platform, text]) => (
              <Card key={platform} className="rounded-lg border mb-5">
                <CardHeader className="flex justify-between items-center mb-2 flex-row">
                  <CardTitle>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </CardTitle>
                  <div className="flex flex-row gap-2">

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(text, platform)}
                    >
                      <CopyIcon />
                    </Button>
                    {
                      //@ts-expect-error :....
                      project.platformUrls[platform] && <Button
                        variant="ghost"
                        size="icon"
                        asChild
                      >
                        <Link
                          //@ts-expect-error :....
                          href={project.platformUrls[platform] || "#"}
                          target="_blank"
                        >
                          <Share2Icon />
                        </Link>
                      </Button>}
                  </div>

                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  <Markdown >
                    {text}
                  </Markdown>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
