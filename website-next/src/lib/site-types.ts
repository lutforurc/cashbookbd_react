/**
 * The shapes the Laravel site API returns. Kept hand-written and small: it is
 * the contract between the two apps, and it mirrors SectionRegistry + the Site
 * models on the other side.
 */

export type SiteTheme = {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  bg_color: string;
  heading_font: string;
  body_font: string;
  base_radius: number;
  button_style: 'solid' | 'outline' | 'pill';
  container_width: 'narrow' | 'normal' | 'wide' | 'full';
  header_style: 'light' | 'dark' | 'transparent';
  show_logo_text: boolean;
  nav: NavItem[];
  footer: SiteFooter;
};

export type NavItem = { label: string; url: string };

export type SiteFooter = {
  about: string;
  copyright: string;
  links: NavItem[];
  facebook: string;
  instagram: string;
  youtube: string;
  whatsapp: string;
};

export type Seo = {
  title?: string;
  description?: string;
  og_image?: string | null;
};

export type PageSummary = {
  slug: string;
  title: string;
  type: string;
  is_home: boolean;
};

export type SiteShell = {
  published: boolean;
  subdomain: string;
  custom_domain: string | null;
  brand_fallback: string;
  theme: SiteTheme;
  theme_css: string;
  nav: NavItem[];
  footer: SiteFooter;
  seo: Seo;
  logo_url: string | null;
  favicon_url: string | null;
  pages: PageSummary[];
  media: Record<string, string>;
  product_count: number;
  contact_honeypot: string;
};

export type SiteShellResponse = { site: SiteShell };

export type Section = {
  id: string;
  type: string;
  enabled: boolean;
  props: Record<string, unknown>;
};

export type PageContent = { version: number; sections: Section[] };

export type PublicProduct = {
  id: number;
  title: string;
  description: string;
  category: string | null;
  price: number | null;
  price_text: string | null;
  image_url: string | null;
  is_featured: boolean;
};

export type PublicPage = {
  id: number;
  title: string;
  slug: string;
  type: string;
  is_home: boolean;
  seo: Seo;
  content: PageContent;
  published_at: string | null;
};

export type PageResponse = { page: PublicPage; products: PublicProduct[] };
export type ProductsResponse = { products: PublicProduct[] };
export type ProductResponse = { product: PublicProduct };
export type SitemapResponse = { urls: { path: string; lastmod: string | null; changefreq: string }[] };

// ------------------------------------------------------------------ builder

export type FieldDef = {
  key: string;
  label: string;
  type:
    | 'string' | 'text' | 'paragraphs' | 'number' | 'bool' | 'select'
    | 'color' | 'url' | 'media' | 'reference' | 'group' | 'repeater';
  default?: unknown;
  max?: number;
  min?: number;
  options?: Record<string, string>;
  fields?: FieldDef[];
  of?: 'category' | 'product';
};

export type SectionDef = {
  type: string;
  label: string;
  icon: string;
  blurb: string;
  fields: FieldDef[];
};

export type BuilderSite = {
  id: number;
  subdomain: string;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  status: number;
  logo_path: string | null;
  logo_url: string | null;
  favicon_path: string | null;
  favicon_url: string | null;
  theme: SiteTheme;
  seo: Seo;
  published_at: string | null;
  has_been_published: boolean;
};

export type SetupResponse = {
  site: BuilderSite;
  templates: Record<string, { label: string; description: string }>;
  fonts: Record<string, { label: string; stack: string }>;
  schema: SectionDef[];
  icon_options: Record<string, string>;
  counts: { pages: number; products: number; unread_messages: number; media: number };
  public_url: string;
};

export type BuilderPage = {
  id: number;
  title: string;
  slug: string;
  type: string;
  is_home: boolean;
  sort?: number;
  status?: number;
  seo?: Seo;
  is_published: boolean;
};

export type PagesResponse = { pages: BuilderPage[] };

export type TemplatePageDef = {
  title: string;
  slug: string;
  type: string;
  is_home: boolean;
  seo: Seo;
  sections: Section[];
};

/**
 * A built-in starting template, exactly as Laravel's SiteTemplateLibrary stores
 * it. The frontend renders it with the SAME section components the live site
 * uses, so the gallery preview and the real site cannot drift.
 */
export type TemplateDef = {
  key: string;
  label: string;
  description: string;
  theme: SiteTheme;
  theme_css: string;
  seo: Seo;
  pages: TemplatePageDef[];
};

export type TemplatesResponse = { templates: TemplateDef[] };

export type BuilderPayload = {
  page: BuilderPage;
  content: PageContent;
  schema: SectionDef[];
  icon_options: Record<string, string>;
  templates: Record<string, { label: string; description: string }>;
  media: MediaItem[];
  revisions: { id: number; label: string | null; created_at: string | null }[];
};

export type MediaItem = {
  id: number;
  url: string;
  path: string;
  alt: string | null;
  width: number | null;
  height: number | null;
};

export type PreviewData = {
  page: BuilderPage;
  content: PageContent;
  theme: SiteTheme;
  theme_css: string;
  nav: NavItem[];
  footer: SiteFooter;
  seo: Seo;
  brand_fallback: string;
  logo_url: string | null;
  favicon_url: string | null;
  media: Record<string, string>;
  products: PublicProduct[];
};

export type ProductRow = {
  id: number;
  name: string;
  code: string | null;
  sales_price: number | string | null;
  selected: boolean;
  site: {
    status: number;
    is_featured: boolean;
    sort: number;
    override_title: string | null;
    override_description: string | null;
    override_price: string | null;
  } | null;
};

export type ProductsAdminResponse = {
  products: ProductRow[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
  search: string;
};

export type MessageRow = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  is_read: boolean;
  created_at: string | null;
};

export type MessagesResponse = {
  messages: MessageRow[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};
