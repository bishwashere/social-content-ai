import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { templateService, Template, CreateTemplateProps, UpdateTemplateProps } from "./index";
import { TemplateCategory } from "@prisma/client";

export function useGetTemplates(category?: TemplateCategory) {
  return useQuery<Template[]>({
    queryKey: ["templates", category],
    queryFn: () => templateService.getTemplates(category),
  });
}

export function useGetTemplate(id: string) {
  return useQuery<Template>({
    queryKey: ["template", id],
    queryFn: () => templateService.getTemplateById(id),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (template: CreateTemplateProps) => templateService.createTemplate(template),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (template: UpdateTemplateProps) => templateService.updateTemplate(template),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["template", variables.id] });
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => templateService.deleteTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}
