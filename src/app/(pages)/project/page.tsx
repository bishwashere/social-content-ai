"use client";
import Markdown from "react-markdown";
import { useEffect, useState } from "react";
import { Plus, Copy, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import {
  useGenerateProjectContent,
  useGetAllProjects,
} from "@/backend-apis/projects/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// Import utilities
import { randomizeOptions } from "./projectPageUtils/randomizeOptions";
import { copyToClipboard } from "./projectPageUtils/clipboard";
import { PLATFORMS } from "@/lib/prompt";

export default function Home() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("persuasive");
  const [tone, setTone] = useState("formal");
  const [verb, setVerb] = useState("inform");
  const [goal, setGoal] = useState("motivate");
  const [theme, setTheme] = useState("business");
  const [output, setOutput] = useState<Record<string, string>>({});
  const [selectedPlatform, setSelectedPlatform] = useState("facebook");

  const projects = useGetAllProjects();

  const handleSelectProject = (projectId: string) => {
    router.push(`/project/${projectId}`);
  };

  const chat = useGenerateProjectContent();

  const handleRandomizeOptions = () => {
    const randomOptions = randomizeOptions();
    setStyle(randomOptions.style);
    setTone(randomOptions.tone);
    setVerb(randomOptions.verb);
    setGoal(randomOptions.goal);
    setTheme(randomOptions.theme);
  };

  const handleGenerateOutput = async () => {
    try {
      const res = await chat.mutateAsync({
        userPrompt: prompt,
        options: { style, tone, verb, goal, theme },
        projectName,
        projectDescription: description,
        projectId: "",
      });

      //@ts-expect-error: type is not defined
      setOutput(res.contents || {});
    } catch { }
  };

  const handleCopyToClipboard = () => {
    if (output[selectedPlatform]) {
      copyToClipboard(output[selectedPlatform]);
    }
  };

  useEffect(() => {
    console.log("output: ", output);
  }, [output]);

  return (
    <div className="md:ml-64 lg:ml-72 p-6 space-y-6">
      <div className="text-center">
        Welcome to NextPostAI!
        <br />
        Select a project from the left to get started, or click ‘Add Project’ to
        create a new one.
      </div>

      {/* Main Content - Two Boxes */}
      <div className="flex flex-col md:flex-row gap-6 justify-center items-start w-full">
        {/* Left Box - Input */}
        <div className="w-full md:w-1/2 bg-white p-6 rounded-2xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">Customise (optional)</h2>
          <div className="space-y-4">
            {/* Collapsible Project Details */}
            <div>
              <Button
                variant="outline"
                className="w-full flex justify-between items-center rounded-xl"
                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              >
                Project Info
                <Plus className="w-4 h-4" />
              </Button>
              {isDetailsOpen && (
                <div
                  className="mt-2 space-y-4 p-4 rounded-2xl"
                  style={{
                    border: "1px solid transparent",
                    backgroundImage: "linear-gradient(white, white),",
                    backgroundOrigin: "border-box",
                    backgroundClip: "content-box, border-box",
                    boxShadow: "0 0 10px rgba(120, 115, 245, 0.3)",
                  }}
                >
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                      placeholder="Enter project name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full p-2 border rounded-lg"
                      rows={4}
                      placeholder="Enter project description"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Options */}
            <div>
              <Button
                variant="outline"
                className="w-full flex justify-between items-center rounded-xl"
                onClick={() => setIsOptionsOpen(!isOptionsOpen)}
              >
                Content Options
                <Plus className="w-4 h-4" />
              </Button>
              {isOptionsOpen && (
                <div
                  className="mt-2 space-y-2 p-4 rounded-2xl"
                  style={{
                    border: "1px solid transparent",
                    backgroundImage: "linear-gradient(white, white),",
                    backgroundOrigin: "border-box",
                    backgroundClip: "content-box, border-box",
                    boxShadow: "0 0 10px rgba(44, 130, 255, 0.3)",
                  }}
                >
                  <Button
                    variant="outline"
                    className="w-full flex justify-center items-center gap-2 rounded-lg"
                    onClick={handleRandomizeOptions}
                  >
                    <Shuffle className="w-4 h-4" />
                    Randomize
                  </Button>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-24">Style</label>
                    <select
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      className="flex-1 p-2 border rounded-lg"
                    >
                      <option value="narrative">Narrative</option>
                      <option value="descriptive">Descriptive</option>
                      <option value="persuasive">Persuasive</option>
                      <option value="expository">Expository</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-24">Tone</label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="flex-1 p-2 border rounded-lg"
                    >
                      <option value="neutral">Neutral</option>
                      <option value="formal">Formal</option>
                      <option value="casual">Casual</option>
                      <option value="humorous">Humorous</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-24">Verb</label>
                    <select
                      value={verb}
                      onChange={(e) => setVerb(e.target.value)}
                      className="flex-1 p-2 border rounded-lg"
                    >
                      <option value="inform">Inform</option>
                      <option value="persuade">Persuade</option>
                      <option value="entertain">Entertain</option>
                      <option value="inspire">Inspire</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-24">Goal</label>
                    <select
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      className="flex-1 p-2 border rounded-lg"
                    >
                      <option value="educate">Educate</option>
                      <option value="convince">Convince</option>
                      <option value="engage">Engage</option>
                      <option value="motivate">Motivate</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-24">Theme</label>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="flex-1 p-2 border rounded-lg"
                    >
                      <option value="technology">Technology</option>
                      <option value="nature">Nature</option>
                      <option value="business">Business</option>
                      <option value="personal">Personal</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt (Outside Content Options) */}
            <div
              style={{
                border: "1px solid transparent",
                backgroundImage: "linear-gradient(white, white), ",
                backgroundOrigin: "border-box",
                backgroundClip: "content-box, border-box",
                boxShadow: "0 0 10px rgba(255, 215, 0, 0.3)",
                borderRadius: "1rem",
                padding: "0.5rem",
              }}
            >
              <label className="block text-sm font-medium mb-1">
                Prompt (Optional)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-2 border rounded-lg"
                rows={4}
                placeholder="Enter your custom prompt here..."
              />
            </div>

            <Button
              loading={chat.isPending}
              onClick={handleGenerateOutput}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
            >
              Generate Output
            </Button>
          </div>
        </div>

        {/* Right Box - Output */}
        <div className="w-full md:w-1/2 bg-white p-6 rounded-2xl shadow-md">
          <h2 className="text-xl font-semibold mb-4">Output</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Tabs
                value={selectedPlatform}
                onValueChange={setSelectedPlatform}
                className="w-full"
              >
                <TabsList>
                  {PLATFORMS.map((platform) => (
                    <TabsTrigger
                      key={platform}
                      value={platform}
                      className="capitalize min-w-24"
                    >
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {PLATFORMS.map((platform) => (
                  <TabsContent key={platform} value={platform}>
                    <div
                      className="min-h-[500px] p-4 rounded-2xl bg-gray-50 relative"
                      style={{
                        border: "1px solid transparent",
                        backgroundOrigin: "border-box",
                        backgroundClip: "content-box, border-box",
                        boxShadow: "0 0 10px rgba(120, 115, 245, 0.3)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyToClipboard}
                        disabled={!output[selectedPlatform]}
                        className="rounded-lg absolute top-4 right-4"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {output[platform] ? (
                        <Markdown>
                          {output[platform]
                            .split("\n")
                            .map((line) => line.trim())
                            .filter((line) => line.length > 0)
                            .join("\n\n")}
                        </Markdown>
                      ) : (
                        <p className="text-gray-500">
                          Output will appear here once generated...
                        </p>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button
          variant="default"
          size="icon"
          className="rounded-full w-16 h-16 shadow-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
          onClick={() => setOpen(true)}
        >
          <Plus className="w-8 h-4" />
        </Button>
      </div>

      {/* Modal for Project Selection */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogClose />
          <DialogHeader>
            <DialogTitle>Select a Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {projects.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 rounded-lg" />
              ))
            ) : (projects?.data?.length || 0) > 0 ? (
              projects?.data?.map((project, i) => (
                <Button
                  key={i}
                  className="w-full rounded-lg"
                  onClick={() => handleSelectProject(project._id)}
                >
                  {project.name}
                </Button>
              ))
            ) : (
              <p className="text-center text-gray-500">
                No projects available.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
