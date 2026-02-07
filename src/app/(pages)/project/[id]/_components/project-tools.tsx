"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

interface ProjectToolsProps {
  projectId: string;
}

export function ProjectTools({ projectId }: ProjectToolsProps) {

  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🛠️ Project Tools</CardTitle>
          <CardDescription>
            Powerful tools to enhance your content creation workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Add Discovery Tool */}
            <ToolCard
              icon={<Search className="h-8 w-8 text-blue-600" />}
              title="Ad Discovery"
              description="Discover trending content and ideas for your project"
              onClick={() => router.push(`${pathname}/ads`)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
}

function ToolCard({ icon, title, description, onClick, disabled }: ToolCardProps) {
  return (
    <Card
      className={`hover:shadow-lg transition-shadow ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={disabled ? undefined : onClick}
    >
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          {icon}
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {!disabled && (
        <CardContent>
          <Button variant="outline" size="sm" className="w-full">
            Open Tool
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
