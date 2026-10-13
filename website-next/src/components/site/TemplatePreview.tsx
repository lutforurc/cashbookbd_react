'use client';

import { SectionRenderer } from '@/components/sections';
import { SiteFooter, SiteHeader } from '@/components/site/Chrome';
import type { PublicProduct, TemplateDef, TemplatePageDef } from '@/lib/site-types';

/**
 * Renders a built-in template with the SAME components the public site uses.
 *
 * This is the React side of "a template is just data": Laravel supplies the
 * theme, pages and sections (SiteTemplateLibrary), and here they are drawn by
 * the shared section components -- so what the gallery shows is exactly what a
 * company gets after "Use this template". Nothing is copied into a second
 * template model, and nothing here is Blade.
 */
export function TemplatePreview({
  template,
  page,
  products = [],
  height,
}: {
  template: TemplateDef;
  page: TemplatePageDef;
  products?: PublicProduct[];
  height?: number;
}) {
  const brand = (template.seo?.title ?? '').trim() || template.label;
  const theme = template.theme;

  return (
    <div
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'var(--site-bg, #fff)',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: template.theme_css }} />
      <div className={`btnstyle-${theme.button_style || 'solid'}`}>
        <div style={height ? { height, overflow: 'auto' } : undefined} data-testid="template-preview">
          {/* navigable={false}: a preview must not carry the admin away. */}
          <SiteHeader brand={brand} logoUrl={null} nav={theme.nav} headerStyle={theme.header_style} navigable={false} />
          <main>
            <SectionRenderer
              sections={page.sections}
              ctx={{ products, media: {}, honeypot: 'company_website_url' }}
            />
          </main>
          <SiteFooter brand={brand} footer={theme.footer} navigable={false} />
        </div>
      </div>
    </div>
  );
}
