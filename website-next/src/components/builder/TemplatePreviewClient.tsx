'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BuilderShell, Forbidden, Notice, useRequireAuth } from '@/components/builder/Shell';
import { TemplatePreview } from '@/components/site/TemplatePreview';
import { ApiError, builderFetch } from '@/lib/builder-api';
import type { PublicProduct, TemplateDef, TemplatesResponse } from '@/lib/site-types';

const WIDTHS: Record<string, string> = { desktop: '100%', tablet: '820px', mobile: '390px' };

/**
 * A full preview of one template, without applying it. Every page of the
 * template can be walked through, and "Use this template" applies it to the
 * DRAFT only.
 */
export default function TemplatePreviewClient({ templateKey }: { templateKey: string }) {
  const ready = useRequireAuth();
  const router = useRouter();

  const [template, setTemplate] = useState<TemplateDef | null>(null);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [forbidden, setForbidden] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await builderFetch<TemplatesResponse>('/templates');
      setTemplate(res.templates.find((t) => t.key === templateKey) ?? null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
      else if (e instanceof ApiError && e.status === 401) router.replace('/site/login');
    }

    try {
      const response = await fetch('/api/public/site/products', { headers: { Accept: 'application/json' } });
      if (response.ok) setProducts(((await response.json()) as { products?: PublicProduct[] }).products ?? []);
    } catch {
      /* preview without products */
    }
  }, [templateKey, router]);

  useEffect(() => { if (ready) void load(); }, [ready, load]);

  async function useTemplate() {
    if (!template) return;
    if (!window.confirm(
      `Use the "${template.label}" template?\n\nIt replaces your DRAFT pages. Your published website stays exactly as it is until you click Publish.`,
    )) {
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const res = await builderFetch<{ message?: string; pages?: number }>('/template', {
        method: 'POST',
        body: JSON.stringify({ template: template.key }),
      });
      setNotice({ kind: 'ok', text: `${res.message ?? 'Template applied to your draft.'} Open Pages to edit, then Publish.` });
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Could not apply the template.' });
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;
  if (forbidden) return <BuilderShell title="Template preview"><Forbidden /></BuilderShell>;
  if (!template) return <BuilderShell title="Template preview"><p className="b-muted">Loading…</p></BuilderShell>;

  const page = template.pages[pageIndex] ?? template.pages[0];

  return (
    <BuilderShell title={`Template preview — ${template.label}`}>
      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}

      <div className="b-card" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="b-label" style={{ margin: 0 }}>Page</span>
        {template.pages.map((p, i) => (
          <button key={p.slug} type="button" className="b-btn" disabled={i === pageIndex} onClick={() => setPageIndex(i)}
                  data-testid={`template-page-${p.slug}`}>
            {p.title}
          </button>
        ))}

        <span style={{ marginLeft: 16 }} className="b-label">Device</span>
        {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
          <button key={d} type="button" className="b-btn" disabled={device === d} onClick={() => setDevice(d)}>{d}</button>
        ))}

        <span style={{ marginLeft: 'auto' }} />
        <Link className="b-btn" href="/site/templates">← All templates</Link>
        <button className="b-btn b-btn--primary" disabled={busy} onClick={useTemplate} data-testid="use-template">
          {busy ? 'Applying…' : 'Use this template'}
        </button>
      </div>

      <p className="b-muted">{template.description} · Draft only until you publish.</p>

      <div style={{ width: '100%', overflowX: 'auto', background: '#e2e8f0', padding: 10, borderRadius: 8 }}>
        <div style={{ width: WIDTHS[device], margin: '0 auto', transition: 'width .2s' }}>
          {page && <TemplatePreview template={template} page={page} products={products} />}
        </div>
      </div>
    </BuilderShell>
  );
}
