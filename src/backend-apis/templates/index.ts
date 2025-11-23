import api from "../axios";
import tryCatchAsync from "@/lib/try-catch-async";
import { ApiError, ApiResponse } from "../types";
import { TemplateCategory } from "@prisma/client";

export interface Template {
  id: string;
  title: string;
  description: string;
  content: string;
  category: TemplateCategory;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateProps {
  title: string;
  description: string;
  content: string;
  category: TemplateCategory;
  icon?: string;
}

export interface UpdateTemplateProps {
  id: string;
  title?: string;
  description?: string;
  content?: string;
  category?: TemplateCategory;
  icon?: string;
}

class TemplateService {
  /**
   * Get all templates, optionally filtered by category
   */
  async getTemplates(category?: TemplateCategory) {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<Template[]>
    >(async () => {
      const url = category && category !== "ALL" 
        ? `/templates?category=${category}`
        : "/templates";
      const response = await api.get(url);
      return response;
    });

    if (err) {
      console.error('[TemplateService] Error fetching templates:', err.response?.data || err.message);
      throw new Error(err.response?.data?.message || err.response?.data?.error || err.message);
    }

    console.log('[TemplateService] Templates response:', res?.data);
    return res.data.data;
  }

  /**
   * Get a template by ID
   */
  async getTemplateById(id: string) {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<Template>
    >(async () => {
      const response = await api.get(`/templates/${id}`);
      return response;
    });

    if (err) {
      throw new Error(err.response?.data?.message);
    }

    return res.data.data;
  }

  /**
   * Create a new template
   */
  async createTemplate(template: CreateTemplateProps) {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<Template>
    >(async () => {
      const response = await api.post("/templates", template);
      return response;
    });

    if (err) {
      throw new Error(err.response?.data?.message);
    }

    return res.data.data;
  }

  /**
   * Update a template
   */
  async updateTemplate(template: UpdateTemplateProps) {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<Template>
    >(async () => {
      const response = await api.put(`/templates/${template.id}`, template);
      return response;
    });

    if (err) {
      throw new Error(err.response?.data?.message);
    }

    return res.data.data;
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string) {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<void>
    >(async () => {
      const response = await api.delete(`/templates/${templateId}`);
      return response;
    });

    if (err) {
      throw new Error(err.response?.data?.message);
    }

    return res.data.message;
  }
}

export const templateService = new TemplateService();
