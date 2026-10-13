import type { TemplateFieldDef } from './websiteTemplateSlice';

/**
 * One field of a section, drawn from the SERVER's schema (SectionRegistry).
 * Add a field to the registry and it appears here with no change on this side,
 * which is the same promise the company builder makes.
 */
const labelClass = 'mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300';
const inputClass =
  'w-full rounded-sm border border-[rgb(var(--c-border))] bg-white px-2 py-1.5 text-sm text-[rgb(var(--c-text))] outline-none focus:border-blue-500 dark:bg-transparent dark:text-[rgb(var(--c-text))]';

const defaultFor = (field: TemplateFieldDef): unknown => {
  if (field.type === 'bool') return field.default ?? false;
  if (field.type === 'repeater') return [];
  if (field.type === 'group') {
    const out: Record<string, unknown> = {};
    (field.fields ?? []).forEach((sub) => { out[sub.key] = defaultFor(sub); });
    return out;
  }
  return field.default ?? '';
};

export const blankSection = (def: { type: string; fields: TemplateFieldDef[] }) => {
  const props: Record<string, unknown> = {};
  def.fields.forEach((f) => { props[f.key] = defaultFor(f); });

  return {
    id: 'sec_' + Math.random().toString(36).slice(2, 10),
    type: def.type,
    enabled: true,
    props,
  };
};

const swap = <T,>(rows: T[], a: number, b: number): T[] => {
  const copy = rows.slice();
  const tmp = copy[a];
  copy[a] = copy[b];
  copy[b] = tmp;
  return copy;
};

const TemplateFieldEditor = ({
  field,
  value,
  onChange,
}: {
  field: TemplateFieldDef;
  value: unknown;
  onChange: (next: unknown) => void;
}) => {
  switch (field.type) {
    case 'group': {
      const group = (value ?? {}) as Record<string, unknown>;
      return (
        <fieldset className="mb-2 rounded-sm border border-[rgb(var(--c-border))] p-2">
          <legend className={labelClass}>{field.label}</legend>
          {(field.fields ?? []).map((sub) => (
            <div className="mb-2" key={sub.key}>
              <TemplateFieldEditor
                field={sub}
                value={group[sub.key]}
                onChange={(next) => onChange({ ...group, [sub.key]: next })}
              />
            </div>
          ))}
        </fieldset>
      );
    }

    case 'repeater': {
      const rows = (Array.isArray(value) ? value : []) as Record<string, unknown>[];
      const blank = () => {
        const out: Record<string, unknown> = {};
        (field.fields ?? []).forEach((sub) => { out[sub.key] = defaultFor(sub); });
        return out;
      };

      return (
        <div className="mb-2 rounded-sm border border-[rgb(var(--c-border))] p-2">
          <div className={labelClass}>{field.label}</div>
          {rows.map((row, index) => (
            <div className="mb-2 rounded-sm border border-dashed border-[rgb(var(--c-border))] p-2" key={index}>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-slate-200 px-2 text-xs dark:bg-slate-700">#{index + 1}</span>
                <span className="flex-1" />
                <button type="button" className="text-xs text-slate-500" disabled={index === 0}
                  onClick={() => onChange(swap(rows, index, index - 1))}>↑</button>
                <button type="button" className="text-xs text-slate-500" disabled={index === rows.length - 1}
                  onClick={() => onChange(swap(rows, index, index + 1))}>↓</button>
                <button type="button" className="text-xs text-rose-600"
                  onClick={() => onChange(rows.filter((_, i) => i !== index))}>Remove</button>
              </div>
              {(field.fields ?? []).map((sub) => (
                <div className="mb-2" key={sub.key}>
                  <TemplateFieldEditor
                    field={sub}
                    value={row[sub.key]}
                    onChange={(next) => onChange(rows.map((r, i) => (i === index ? { ...r, [sub.key]: next } : r)))}
                  />
                </div>
              ))}
            </div>
          ))}
          <button type="button" className="text-xs font-semibold text-primary" onClick={() => onChange([...rows, blank()])}>
            + Add item
          </button>
        </div>
      );
    }

    case 'bool':
      return (
        <label className="mb-2 flex items-center gap-2">
          <input type="checkbox" checked={Boolean(value)} data-testid={`tf-${field.key}`}
            onChange={(e) => onChange(e.target.checked)} />
          <span className={labelClass} style={{ marginBottom: 0 }}>{field.label}</span>
        </label>
      );

    case 'select':
      return (
        <div className="mb-2">
          <label className={labelClass}>{field.label}</label>
          <select className={inputClass} value={String(value ?? '')} data-testid={`tf-${field.key}`}
            onChange={(e) => onChange(e.target.value)}>
            {Object.entries(field.options ?? {}).map(([k, label]) => <option value={k} key={k}>{label}</option>)}
          </select>
        </div>
      );

    case 'number':
      return (
        <div className="mb-2">
          <label className={labelClass}>{field.label}</label>
          <input className={inputClass} type="number" min={field.min} max={field.max} data-testid={`tf-${field.key}`}
            value={value === null || value === undefined ? '' : Number(value)}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
        </div>
      );

    case 'color':
      return (
        <div className="mb-2">
          <label className={labelClass}>{field.label}</label>
          <input className={inputClass} type="color" value={String(value ?? '#000000')} data-testid={`tf-${field.key}`}
            onChange={(e) => onChange(e.target.value)} />
        </div>
      );

    case 'text':
    case 'paragraphs':
      return (
        <div className="mb-2">
          <label className={labelClass}>{field.label}</label>
          <textarea className={`${inputClass} min-h-[80px]`} value={String(value ?? '')} data-testid={`tf-${field.key}`}
            onChange={(e) => onChange(e.target.value)} />
        </div>
      );

    case 'media':
      // A master template stores images as URLs, so they can be exported and
      // synced into other installations as plain data (see the manager).
      return (
        <div className="mb-2">
          <label className={labelClass}>{field.label} (image URL)</label>
          <input className={inputClass} type="text" placeholder="https://…" value={String(value ?? '')} data-testid={`tf-${field.key}`}
            onChange={(e) => onChange(e.target.value)} />
          {typeof value === 'string' && value.startsWith('http') && (
            <img src={value} alt="" className="mt-2 max-h-24 rounded-sm" />
          )}
        </div>
      );

    default:
      return (
        <div className="mb-2">
          <label className={labelClass}>{field.label}</label>
          <input className={inputClass} type="text" value={String(value ?? '')} data-testid={`tf-${field.key}`}
            onChange={(e) => onChange(e.target.value)} />
        </div>
      );
  }
};

export default TemplateFieldEditor;
