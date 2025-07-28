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
import { useGenerateProjectContent } from "@/backend-apis/projects/hooks";
import Link from "next/link";
import { Projects as Project } from "@prisma/client";

import PostToWall from "@/components/common/post-to-wall";
import { Switch } from "@/components/ui/switch";
import AutoPost from "@/components/common/auto-post";
import Image from "next/image";

interface ContentGeneratorProps {
  project: Project;
}

export function ContentGenerator({ project }: ContentGeneratorProps) {
  const [checked, setChecked] = useState(true);
  const [prompt, setPrompt] = useState("");
  const generateProjectContent = useGenerateProjectContent();
  const copyToClipboard = useMemo(
    () => (text: string, platform: string) => {
      navigator.clipboard.writeText(text).then(
        () => {
          toast.success(`${platform} content copied to clipboard!`);
        },
        (err) => {
          console.error("Could not copy text: ", err);
          toast.error("Failed to copy content");
        },
      );
    },
    [],
  );

  return (
    <div className="space-y-4 w-full mt-5">
      <div className="flex items-center justify-between">
        <Label htmlFor="prompt">User Prompt:</Label>
        <div className="flex items-center space-x-2">
          <Switch
            checked={checked}
            onCheckedChange={(checked) => setChecked(checked as boolean)}
            id="checked" />
          <label
            htmlFor="checked"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Related to product
          </label>
        </div>
      </div>
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Create a fun and engaging post to promote on creative community."
        className="min-h-[100px] min-w-96"
      />
      <Button
        onClick={() => {
          generateProjectContent.mutate({
            projectId: project.id,
            projectRelated: checked,
            userPrompt: prompt,
            retry: generateProjectContent.data
              ? { chatId: generateProjectContent.data?.id }
              : undefined,
          });
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
            <Image src="/flash.png" width={24} height={24} className="h-5 w-5 mr-1" alt="Thunder" />
            Quick Generate
          </>
        )}
      </Button>
      {generateProjectContent.data && (
        <div className="mt-4 flex flex-row flex-wrap gap-4 overflow-y-auto">
          <ScrollArea className="">
            {Object.entries(generateProjectContent.data.contents || {}).map(
              ([platform, text]) => (
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
                      <PostToWall
                        content={text}
                        platform={platform}
                        projectId={project.id}
                        prompt={generateProjectContent.data.prompt}
                      />
                      <AutoPost
                        //@ts-expect-error:...........
                        platform={platform}
                        content={text}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <Markdown>
                        {(text as string)
                          .split("\n")
                          .map((line) => line.trim())
                          .filter((line) => line.length > 0)
                          .join("\n\n")}
                      </Markdown>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
