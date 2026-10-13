import httpService from '../../services/httpService';
import { API_ADMIN_WEBSITE_TEMPLATES_URL } from '../../services/apiRoutes';

/**
 * Master website templates: the platform's catalogue.
 *
 * Plain httpService calls in the style of the business-type and inventory-system
 * screens next to it -- the page owns its own state, so there is no reducer here.
 *
 * ⚠️ The server puts ALL of these behind `platform.admin`. Being able to see the
 * menu is not what protects them; a company administrator who guessed this URL
 * is refused at the API.
 */

export type TemplateFieldDef = {
  key: string;
  label: string;
  type:
    | 'string' | 'text' | 'paragraphs' | 'number' | 'bool' | 'select'
    | 'color' | 'url' | 'media' | 'reference' | 'group' | 'repeater';
  default?: unknown;
  max?: number;
  min?: number;
  options?: Record<string, string>;
  fields?: TemplateFieldDef[];
};

export type TemplateSectionDef = {
  type: string;
  label: string;
  icon: string;
  blurb: string;
  fields: TemplateFieldDef[];
};

export type TemplateSection = {
  id: string;
  type: string;
  enabled: boolean;
  props: Record<string, unknown>;
};

export type TemplatePage = {
  title: string;
  slug: string;
  type: string;
  is_home: boolean;
  seo?: { title?: string; description?: string };
  sections: TemplateSection[];
};

export type WebsiteTemplateSummary = {
  id: number;
  key: string;
  name: string;
  description: string;
  status: number;
  is_published: boolean;
  pages: number;
  published_at: string | null;
  updated_at: string | null;
};

export type WebsiteTemplateDetail = {
  id: number;
  key: string;
  name: string;
  description: string;
  status: number;
  is_published: boolean;
  sort: number;
  theme: Record<string, unknown>;
  theme_css: string;
  seo: { title?: string; description?: string };
  pages: TemplatePage[];
  published_at: string | null;
  has_been_published: boolean;
};

export type TemplateSchema = {
  schema: TemplateSectionDef[];
  icon_options: Record<string, string>;
  fonts: Record<string, { label: string; stack: string }>;
  theme_tokens: Record<string, unknown>;
  theme_defaults: Record<string, unknown>;
};

export const fetchWebsiteTemplates = async (): Promise<WebsiteTemplateSummary[]> => {
  const response = await httpService.get(API_ADMIN_WEBSITE_TEMPLATES_URL);
  const rows = response?.data?.templates;

  return Array.isArray(rows) ? rows : [];
};

export const fetchWebsiteTemplate = async (id: number | string) => {
  const response = await httpService.get(`${API_ADMIN_WEBSITE_TEMPLATES_URL}/${id}`);

  return response?.data;
};

export const fetchTemplateSchema = async (): Promise<TemplateSchema> => {
  const response = await httpService.get(`${API_ADMIN_WEBSITE_TEMPLATES_URL}/schema`);

  return response?.data;
};

export const createWebsiteTemplate = (payload: { name: string; duplicate_of?: number }) =>
  httpService.post(API_ADMIN_WEBSITE_TEMPLATES_URL, payload);

export const updateWebsiteTemplate = (id: number | string, payload: Record<string, unknown>) =>
  httpService.put(`${API_ADMIN_WEBSITE_TEMPLATES_URL}/${id}`, payload);

export const duplicateWebsiteTemplate = (id: number | string) =>
  httpService.post(`${API_ADMIN_WEBSITE_TEMPLATES_URL}/${id}/duplicate`);

export const publishWebsiteTemplate = (id: number | string) =>
  httpService.post(`${API_ADMIN_WEBSITE_TEMPLATES_URL}/${id}/publish`);

export const unpublishWebsiteTemplate = (id: number | string) =>
  httpService.post(`${API_ADMIN_WEBSITE_TEMPLATES_URL}/${id}/unpublish`);

export const deleteWebsiteTemplate = (id: number | string) =>
  httpService.delete(`${API_ADMIN_WEBSITE_TEMPLATES_URL}/${id}`);
