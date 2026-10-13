'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BuilderShell, Forbidden, useRequireAuth } from '@/components/builder/Shell';
import { SectionRenderer } from '@/components/sections';
import { SiteFooter, SiteHeader } from '@/components/site/Chrome';
import { ApiError, builderFetch } from '@/lib/builder-api';
import { brandOf } from '@/lib/brand';
import type { PreviewData } from '@/lib/site-types';
import { mediaUrl } from '@/lib/url';

const WIDTHS: Record<string, string> = { desktop: '100%', tablet: '820px', mobile: '390px' };

/**
 * Renders the DRAFT in the public layout -- what the Blade preview view did.
 * Uses the same section components as the live site, so what is previewed is
 * what will be published.
 */
export default function PreviewClient({ pageId }: { pageId: number }) {
  const ready = useRequireAuth();
  const router = useRouter();

  const [data, setData] = useState<PreviewData | null>(null);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await builderFetch<PreviewData>(`/pages/${pageId}/preview-data`));
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
      else if (e instanceof ApiError && e.status === 401) router.replace('/site/login');
    }
  }, [pageId, router]);

  useEffect(() => { if (ready) void load(); }, [ready, load]);

  if (!ready) return null;
  if (forbidden) return <BuilderShell title="Preview"><Forbidden /></BuilderShell>;
  if (!data) return <BuilderShell title="Preview"><p className="b-muted">Loading…</p></BuilderShell>;

  const brand = brandOf(data.seo, data.page.seo, data.brand_fallback);

  return (
    <BuilderShell title={`Preview — ${data.page.title}`}>
      <div className="b-card" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="b-label" style={{ margin: 0 }}>Device</span>
        {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
          <button key={d} type="button" className="b-btn" disabled={device === d} onClick={() => setDevice(d)}>
            {d}
          </button>
        ))}
        <span style={{ marginLeft: 'auto' }} />
        <Link className="b-btn" href={`/site/pages/${pageId}/builder`}>← Back to builder</Link>
      </div>

      <div className="b-preview" data-testid="preview-frame">
        <div className="b-preview__bar"><span className="b-muted">Draft preview · not public</span></div>

        {/* The device width simulates a viewport, exactly as the Blade editor's
            responsive preview did. */}
        <div style={{ width: '100%', overflowX: 'auto', background: '#e2e8f0', padding: 10 }}>
          <div style={{ width: WIDTHS[device], margin: '0 auto', background: 'var(--site-bg, #fff)', transition: 'width .2s' }}>
            <style dangerouslySetInnerHTML={{ __html: data.theme_css }} />
            <div className={`btnstyle-${data.theme.button_style || 'solid'}`}>
              {/* navigable={false}: the draft preview is a picture of the site,
                  not a way out of the builder. */}
              <SiteHeader brand={brand} logoUrl={mediaUrl(data.logo_url)} nav={data.nav} headerStyle={data.theme.header_style} navigable={false} />
              <main>
                <SectionRenderer
                  sections={data.content.sections}
                  ctx={{ products: data.products, media: data.media, honeypot: 'company_website_url' }}
                />
              </main>
              <SiteFooter brand={brand} footer={data.footer} navigable={false} />
            </div>
          </div>
        </div>
      </div>
    </BuilderShell>
  );
}
