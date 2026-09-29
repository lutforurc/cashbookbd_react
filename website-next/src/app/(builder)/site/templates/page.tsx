'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BuilderShell, Forbidden, Notice, useRequireAuth } from '@/components/builder/Shell';
import { TemplatePreview } from '@/components/site/TemplatePreview';
import { ApiError, builderFetch } from '@/lib/builder-api';
import type { PublicProduct, TemplateDef, TemplatesResponse } from '@/lib/site-types';

/**
 * The Website Templates gallery, inside the company admin.
 *
 * Each card is rendered live from the template definition by the shared React
 * section components, so what a company sees here is what "Use this template"
 * gives them. Applying a template writes the DRAFT only -- the published
 * website does not change until Publish is clicked.
 */
export default function TemplatesGalleryPage() {
  const ready = useRequireAuth();
  const router = useRouter();

  const [templates, setTemplates] = useState<TemplateDef[]>([]);
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await builderFetch<TemplatesResponse>('/templates');
      setTemplates(res.templates);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
      else if (e instanceof ApiError && e.status === 401) router.replace('/site/login');
      else setNotice({ kind: 'err', text: 'Could not load the templates.' });
    }

    // Best effort: the company's own selected products, so the "products"
    // section in a preview shows something real. Not required for the gallery.
    try {
      const response = await fetch('/api/public/site/products', { headers: { Accept: 'application/json' } });
      if (response.ok) setProducts(((await response.json()) as { products?: PublicProduct[] }).products ?? []);
    } catch {
      /* preview without products */
    }
  }, [router]);

  useEffect(() => { if (ready) void load(); }, [ready, load]);

  async function useTemplate(template: TemplateDef) {
    if (!window.confirm(
      `Use the "${template.label}" template?\n\nIt replaces your DRAFT pages. Your published website stays exactly as it is until you click Publish.`,
    )) {
      return;
    }

    setBusy(template.key);
    setNotice(null);

    try {
      const res = await builderFetch<{ message?: string; pages?: number }>('/template', {
        method: 'POST',
        body: JSON.stringify({ template: template.key }),
      });
      setNotice({
        kind: 'ok',
        text: `${res.message ?? 'Template applied to your draft.'} (${res.pages ?? 0} pages) Open Pages to edit it, then Publish.`,
      });
    } catch (e) {
      setNotice({ kind: 'err', text: e instanceof ApiError ? e.message : 'Could not apply the template.' });
    } finally {
      setBusy(null);
    }
  }

  if (!ready) return null;
  if (forbidden) return <BuilderShell title="Website templates"><Forbidden /></BuilderShell>;

  return (
    <BuilderShell title="Website templates">
      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}

      <div className="b-card">
        <p className="b-muted" style={{ margin: 0 }}>
          Pick a starting point. Choosing a template fills your <strong>draft</strong>; your live website
          is not touched until you click <strong>Publish</strong>.
        </p>
      </div>

      {templates.length === 0 && <div className="b-card b-muted">Loading templates…</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        {templates.map((template) => {
          const home = template.pages.find((p) => p.is_home) ?? template.pages[0];

          return (
            <div className="b-card" key={template.key} data-testid={`template-card-${template.key}`}>
              <h2 style={{ fontSize: '1.1rem', marginTop: 0 }}>{template.label}</h2>
              <p className="b-muted" style={{ minHeight: 40 }}>{template.description}</p>

              {home && <TemplatePreview template={template} page={home} products={products} height={320} />}

              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                <Link className="b-btn" href={`/site/templates/${template.key}`} data-testid={`preview-template-${template.key}`}>
                  Open preview →
                </Link>
                <button
                  className="b-btn b-btn--primary"
                  disabled={busy !== null}
                  onClick={() => useTemplate(template)}
                  data-testid={`use-template-${template.key}`}
                >
                  {busy === template.key ? 'Applying…' : 'Use this template'}
                </button>
              </div>

              <p className="b-muted" style={{ marginTop: 10, marginBottom: 0 }}>
                {template.pages.length} pages: {template.pages.map((p) => p.title).join(', ')}
              </p>
            </div>
          );
        })}
      </div>
    </BuilderShell>
  );
}
