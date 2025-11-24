"use client";

import { useState, useMemo } from "react";
import { useGetTemplates, useGetTemplateCategories } from "@/backend-apis/templates/hooks";
import { TemplateCategory } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TemplateDetailDialog } from "@/components/template-detail-dialog";
import { Template } from "@/backend-apis/templates/index";

// Helper function to format category name (e.g., "CASE_STUDY" -> "Case Study")
const formatCategoryName = (category: string): string => {
  return category
    .split("_")
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
};

const getCategoryIcon = (category: string) => {
  return FileText; // Default icon for all categories
};

export default function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>("ALL");
  const { data: templates, isLoading, error } = useGetTemplates(selectedCategory);
  const { data: categories, isLoading: categoriesLoading } = useGetTemplateCategories();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Build categories array with "ALL" first, then categories from DB
  const categoriesList = useMemo(() => {
    if (!categories) return [{ value: "ALL", label: "All", icon: FileText }];
    return [
      { value: "ALL", label: "All", icon: FileText },
      ...categories.map(cat => ({
        value: cat,
        label: formatCategoryName(cat),
        icon: FileText,
      })),
    ];
  }, [categories]);

  const visibleCategories = categoriesList.slice(0, 8);
  const moreCategories = categoriesList.slice(8);

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <main className="flex-grow max-w-6xl mx-auto py-8 px-6 md:px-14 xl:px-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold">Templates</h1>
          <Info className="h-5 w-5 text-gray-400" />
        </div>
        <Button variant="outline" size="sm">
          Share Feedback
        </Button>
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
        {visibleCategories.map((category) => {
          const Icon = category.icon;
          const isActive = selectedCategory === category.value;
          return (
            <Button
              key={category.value}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.value as TemplateCategory)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <Icon className="h-4 w-4" />
              {category.label}
            </Button>
          );
        })}
        {moreCategories.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {moreCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <DropdownMenuItem
                    key={category.value}
                    onClick={() => setSelectedCategory(category.value as TemplateCategory)}
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    {category.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="text-center py-12 text-red-500">
          Error loading templates: {error instanceof Error ? error.message : "Unknown error"}
        </div>
      )}

      {/* Templates Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !error && templates && templates.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {templates.map((template) => {
              const Icon = getCategoryIcon(template.category);
              return (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleTemplateClick(template)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      {template.icon ? (
                        <span className="text-2xl">{template.icon}</span>
                      ) : (
                        <Icon className="h-5 w-5 text-gray-500" />
                      )}
                      <CardTitle className="text-lg">{template.title}</CardTitle>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
          {selectedTemplate && (
            <TemplateDetailDialog
              template={selectedTemplate}
              isOpen={isDialogOpen}
              onClose={handleCloseDialog}
            />
          )}
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          No templates found in this category.
        </div>
      )}
    </main>
  );
}
