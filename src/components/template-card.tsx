"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Template } from "@/backend-apis/templates/index";
import { useState } from "react";
import { TemplateDetailDialog } from "./template-detail-dialog";

interface TemplateCardProps {
  template: Template;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Card
        className="group hover:shadow-lg transition-all duration-300 cursor-pointer h-full flex flex-col"
        onClick={() => setIsDialogOpen(true)}
      >
        <CardHeader className="p-6">
          <div className="flex items-start gap-4 mb-3">
            {template.icon && (
              <div className="text-4xl flex-shrink-0">{template.icon}</div>
            )}
            <div className="flex-1">
              <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors text-xl mb-2">
                {template.title}
              </CardTitle>
              <CardDescription className="line-clamp-3 text-sm">
                {template.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-0 mt-auto">
          <div className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors group">
            Use template
            <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
          </div>
        </CardContent>
      </Card>
      <TemplateDetailDialog
        template={template}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
