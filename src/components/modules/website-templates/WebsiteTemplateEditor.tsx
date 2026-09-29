import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiCopy, FiEye, FiPlus, FiSave, FiTrash2, FiUploadCloud, FiX } from 'react-icons/fi';

import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import TemplateFieldEditor, { blankSection } from './TemplateFieldEditor';
import TemplatePreviewPane from './TemplatePreviewPane';
import {
  TemplatePage,
  TemplateSchema,
  TemplateSection,
  TemplateSectionDef,
  WebsiteTemplateDetail,
  deleteWebsiteTemplate,
  duplicateWebsiteTemplate,
  fetchTemplateSchema,
  fetchWebsiteTemplate,
  publishWebsiteTemplate,
  unpublishWebsiteTemplate,
  updateWebsiteTemplate,
} from './websiteTemplateSlice';

/**
 * Editing one master template.
 *
 * The layout mirrors the company builder deliberately: pages on the left, the
 * sections of the page below them, the section's fields under that, and a live
 * preview beside it with desktop / tablet / mobile widths. What is different is
 * who it belongs to: this is the PLATFORM's template. Saving writes a draft;
 * Publish is what offers it to companies, and even then it is a copy each
 * company takes -- editing this later never changes anyone's live website.
 */
const labelClass = 'mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300';
const inputClass =
  'w-full rounded-sm border border-[rgb(var(--c-border))] bg-white px-2 py-1.5 text-sm text-[rgb(var(--c-text))] outline-none focus:border-blue-500 dark:bg-transparent dark:text-[rgb(var(--c-text))]';
const cardClass = 'rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-4 shadow-default';

const THEME_COLORS = ['primary_color', 'secondary_color', 'accent_color', 'text_color', 'bg_color'] as const;
const THEME_SELECTS = {
  button_style: [['solid', 'Solid'], ['outline', 'Outline'], ['pill', 'Pill']],
  container_width: [['narrow', 'Narrow'], ['normal', 'Normal'], ['wide', 'Wide'], ['full', 'Full']],
  header_style: [['light', 'Light'], ['dark', 'Dark'], ['transparent', 'Transparent']],
} as const;

const WebsiteTemplateEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<WebsiteTemplateDetail | null>(null);
  const [schema, setSchema] = useState<TemplateSchema | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState<Record<string, unknown>>({});
  const [seo, setSeo] = useState<{ title?: string; description?: string }>({});
  const [pages, setPages] = useState<TemplatePage[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [detailResponse, schemaResponse] = await Promise.all([
        fetchWebsiteTemplate(id as string),
        fetchTemplateSchema(),
      ]);

      const template: WebsiteTemplateDetail = detailResponse?.template;
      setDetail(template);
      setSchema(schemaResponse);
      setName(template.name);
      setDescription(template.description ?? '');
      setTheme(template.theme ?? {});
      setSeo(template.seo ?? {});
      setPages(Array.isArray(template.pages) ? template.pages : []);
      setPageIndex(0);
      setSectionId(template.pages?.[0]?.sections?.[0]?.id ?? null);
      setDirty(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Could not load the template.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const page = pages[pageIndex] ?? null;
  const section = useMemo(
    () => page?.sections.find((s) => s.id === sectionId) ?? null,
    [page, sectionId],
  );
  const sectionDef: TemplateSectionDef | undefined = section
    ? schema?.schema.find((d) => d.type === section.type)
    : undefined;

  const touch = () => setDirty(true);

  const patchPage = (index: number, patch: Partial<TemplatePage>) => {
    setPages((current) => current.map((p, i) => (i === index ? { ...p, ...patch } : p)));
    touch();
  };

  const patchSection = (sid: string, patch: Partial<TemplateSection>) => {
    if (!page) return;
    const next = page.sections.map((s) => (s.id === sid ? { ...s, ...patch } : s));
    patchPage(pageIndex, { sections: next });
  };

  const moveSection = (index: number, delta: number) => {
    if (!page) return;
    const target = index + delta;
    if (target < 0 || target >= page.sections.length) return;
    const copy = page.sections.slice();
    const tmp = copy[index];
    copy[index] = copy[target];
    copy[target] = tmp;
    patchPage(pageIndex, { sections: copy });
  };

  const addSection = (type: string) => {
    const def = schema?.schema.find((d) => d.type === type);
    if (!def || !page) return;
    const created = blankSection(def);
    patchPage(pageIndex, { sections: [...page.sections, created] });
    setSectionId(created.id);
  };

  const removeSection = (sid: string) => {
    if (!page) return;
    patchPage(pageIndex, { sections: page.sections.filter((s) => s.id !== sid) });
    if (sectionId === sid) setSectionId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await updateWebsiteTemplate(id as string, {
        name,
        description,
        theme,
        seo,
        pages,
      });
      toast.success(response?.data?.message || 'Draft saved.');
      setDirty(false);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const run = async (action: () => Promise<any>, okMessage: string) => {
    setBusy(true);
    try {
      const response = await action();
      toast.success(response?.data?.message || okMessage);
      load();
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'The request was refused.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete "${name}"? Companies that already used it keep their own copies.`)) return;
    setBusy(true);
    deleteWebsiteTemplate(id as string)
      .then(() => {
        toast.success('Template deleted.');
        navigate('/admin/website-templates');
      })
      .catch((error: any) => toast.error(error?.response?.data?.error?.message || 'Could not delete.'))
      .finally(() => setBusy(false));
  };

  if (loading && !detail) {
    return <div className="p-6 text-slate-500">Loading…</div>;
  }

  if (!detail) {
    return (
      <div className="p-6">
        <p className="mb-4 text-slate-500">That template could not be loaded.</p>
        <Link className="text-primary" to="/admin/website-templates">← Back to templates</Link>
      </div>
    );
  }

  return (
    <div className="text-slate-900 dark:text-[rgb(var(--c-text))]">
      <HelmetTitle title={`Template — ${detail.name}`} />

      <div className={`${cardClass} mb-5 flex flex-wrap items-center gap-3`}>
        <Link to="/admin/website-templates" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-primary">
          <FiArrowLeft /> All templates
        </Link>
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${
          detail.is_published
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        }`}>
          {detail.is_published ? 'Published' : 'Draft'}
        </span>
        {dirty && <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">unsaved</span>}

        <span className="flex-1" />

        <ButtonLoading onClick={handleSave} buttonLoading={saving} label={saving ? 'Saving…' : 'Save draft'} icon={<FiSave />} className="px-5" />
        {detail.is_published ? (
          <Button type="button" disabled={busy} onClick={() => run(() => unpublishWebsiteTemplate(id as string), 'Unpublished.')}
            className="inline-flex items-center gap-1 rounded-sm border border-[rgb(var(--c-border))] px-3 py-2 text-sm">
            <FiEye /> Unpublish
          </Button>
        ) : (
          <Button type="button" disabled={busy} onClick={() => run(() => publishWebsiteTemplate(id as string), 'Published.')}
            className="inline-flex items-center gap-1 rounded-sm bg-emerald-600 px-3 py-2 text-sm text-white">
            <FiUploadCloud /> Publish
          </Button>
        )}
        <Button type="button" disabled={busy} onClick={() => run(() => duplicateWebsiteTemplate(id as string), 'Duplicated as a draft.')}
          className="inline-flex items-center gap-1 rounded-sm border border-[rgb(var(--c-border))] px-3 py-2 text-sm">
          <FiCopy /> Duplicate
        </Button>
        <Button type="button" disabled={busy} onClick={handleDelete}
          className="inline-flex items-center gap-1 rounded-sm border border-[rgb(var(--c-border))] px-3 py-2 text-sm text-rose-600">
          <FiTrash2 /> Delete
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* ---------------------------------------------------------- editor */}
        <div>
          <div className={`${cardClass} mb-4`}>
            <h2 className="mb-3 text-base font-bold">Template</h2>
            <div className="mb-3">
              <label className={labelClass}>Name</label>
              <input className={inputClass} data-testid="template-name" value={name}
                onChange={(e) => { setName(e.target.value.slice(0, 150)); touch(); }} />
            </div>
            <div>
              <label className={labelClass}>Description (shown in the company gallery)</label>
              <input className={inputClass} value={description} onChange={(e) => { setDescription(e.target.value.slice(0, 255)); touch(); }} />
            </div>
          </div>

          <div className={`${cardClass} mb-4`}>
            <h2 className="mb-3 text-base font-bold">Theme</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {THEME_COLORS.map((token) => (
                <div key={token}>
                  <label className={labelClass}>{token.replace(/_/g, ' ')}</label>
                  <input className={inputClass} type="color" value={String(theme[token] ?? '#000000')}
                    onChange={(e) => { setTheme((t) => ({ ...t, [token]: e.target.value })); touch(); }} />
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Heading font</label>
                <select className={inputClass} value={String(theme.heading_font ?? 'system')}
                  onChange={(e) => { setTheme((t) => ({ ...t, heading_font: e.target.value })); touch(); }}>
                  {Object.entries(schema?.fonts ?? {}).map(([k, f]) => <option value={k} key={k}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Body font</label>
                <select className={inputClass} value={String(theme.body_font ?? 'system')}
                  onChange={(e) => { setTheme((t) => ({ ...t, body_font: e.target.value })); touch(); }}>
                  {Object.entries(schema?.fonts ?? {}).map(([k, f]) => <option value={k} key={k}>{f.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Corner radius</label>
                <input className={inputClass} type="number" min={0} max={32} value={Number(theme.base_radius ?? 10)}
                  onChange={(e) => { setTheme((t) => ({ ...t, base_radius: Number(e.target.value) })); touch(); }} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Object.entries(THEME_SELECTS).map(([token, options]) => (
                <div key={token}>
                  <label className={labelClass}>{token.replace(/_/g, ' ')}</label>
                  <select className={inputClass} value={String(theme[token] ?? '')}
                    onChange={(e) => { setTheme((t) => ({ ...t, [token]: e.target.value })); touch(); }}>
                    {options.map(([v, l]) => <option value={v} key={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className={`${cardClass} mb-4`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Pages</h2>
              <button type="button" className="text-xs font-semibold text-primary"
                onClick={() => { setPages((p) => [...p, { title: 'New page', slug: 'new-page-' + (p.length + 1), type: 'custom', is_home: false, seo: { title: '', description: '' }, sections: [] }]); touch(); }}>
                + Add page
              </button>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {pages.map((p, i) => (
                <button key={i} type="button" onClick={() => { setPageIndex(i); setSectionId(p.sections[0]?.id ?? null); }}
                  className={`rounded-sm border px-2 py-1 text-xs ${i === pageIndex ? 'border-primary text-primary' : 'border-[rgb(var(--c-border))] text-slate-600 dark:text-slate-300'}`}>
                  {p.title}{p.is_home ? ' · home' : ''}
                </button>
              ))}
            </div>

            {page && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Title</label>
                    <input className={inputClass} value={page.title} onChange={(e) => patchPage(pageIndex, { title: e.target.value.slice(0, 150) })} />
                  </div>
                  <div>
                    <label className={labelClass}>Slug</label>
                    <input className={inputClass} value={page.slug} onChange={(e) => patchPage(pageIndex, { slug: e.target.value })} />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={page.is_home} onChange={(e) => {
                      setPages((current) => current.map((p, i) => ({ ...p, is_home: i === pageIndex ? e.target.checked : false })));
                      touch();
                    }} />
                    This is the home page
                  </label>
                  {pages.length > 1 && !page.is_home && (
                    <button type="button" className="text-xs text-rose-600"
                      onClick={() => { setPages((current) => current.filter((_, i) => i !== pageIndex)); setPageIndex(0); touch(); }}>
                      Remove page
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {page && (
            <div className={`${cardClass} mb-4`}>
              <h2 className="mb-3 text-base font-bold">Sections — {page.title}</h2>

              <ul className="mb-3 space-y-1">
                {page.sections.map((s, index) => (
                  <li key={s.id}
                    className={`flex items-center gap-2 rounded-sm border px-2 py-1 ${s.id === sectionId ? 'border-primary' : 'border-[rgb(var(--c-border))]'}`}>
                    <button type="button" className="text-xs text-slate-500" disabled={index === 0} onClick={() => moveSection(index, -1)}>↑</button>
                    <button type="button" className="text-xs text-slate-500" disabled={index === page.sections.length - 1} onClick={() => moveSection(index, 1)}>↓</button>
                    <button type="button" className="flex-1 text-left text-sm font-semibold" onClick={() => setSectionId(s.id)}>
                      {schema?.schema.find((d) => d.type === s.type)?.label ?? s.type}
                    </button>
                    <span className="text-[10px] uppercase text-slate-400">{s.type}</span>
                    <label className="text-xs" title="Enabled">
                      <input type="checkbox" checked={s.enabled} onChange={(e) => patchSection(s.id, { enabled: e.target.checked })} />
                    </label>
                    <button type="button" className="text-xs text-rose-600" onClick={() => removeSection(s.id)}><FiX /></button>
                  </li>
                ))}
                {page.sections.length === 0 && <li className="text-xs text-slate-400">No sections yet.</li>}
              </ul>

              <label className={labelClass}>Add a section</label>
              <select className={inputClass} data-testid="add-template-section" value=""
                onChange={(e) => e.target.value && addSection(e.target.value)}>
                <option value="">— choose a section —</option>
                {(schema?.schema ?? []).map((def) => <option value={def.type} key={def.type}>{def.label}</option>)}
              </select>

              {section && sectionDef && (
                <div className="mt-4 rounded-sm border border-[rgb(var(--c-border))] p-3">
                  <h3 className="mb-2 text-sm font-bold">{sectionDef.label}</h3>
                  {sectionDef.fields.map((field) => (
                    <TemplateFieldEditor
                      key={field.key}
                      field={field}
                      value={(section.props as Record<string, unknown>)[field.key]}
                      onChange={(next) => patchSection(section.id, { props: { ...section.props, [field.key]: next } })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* --------------------------------------------------------- preview */}
        <div>
          <div className={`${cardClass} mb-3 flex flex-wrap items-center gap-2`}>
            <span className="text-xs font-semibold text-slate-500">Preview (draft)</span>
            <span className="flex-1" />
            {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDevice(d)} disabled={device === d}
                className={`rounded-sm border px-2 py-1 text-xs ${device === d ? 'border-primary text-primary' : 'border-[rgb(var(--c-border))] text-slate-600 dark:text-slate-300'}`}>
                {d}
              </button>
            ))}
          </div>

          <TemplatePreviewPane
            page={page}
            theme={{ ...theme, name: name || 'Preview' }}
            themeCss={detail.theme_css}
            device={device}
          />

          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            This preview is your <strong>draft</strong>. Companies see only what you publish, and only
            through their own installation's synced copy of this catalogue.
          </p>
        </div>
      </div>

      <div className={`${cardClass} mt-5 flex items-center gap-3`}>
        <FiPlus className="text-slate-400" />
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Tip: duplicate an existing template to start from a working layout — a duplicate is always a draft.
        </span>
      </div>
    </div>
  );
};

export default WebsiteTemplateEditor;
