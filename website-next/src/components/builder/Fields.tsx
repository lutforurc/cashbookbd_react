'use client';

import type { FieldDef, MediaItem } from '@/lib/site-types';

/**
 * Draws one field of the section schema. The schema comes from the server
 * (SectionRegistry), so adding a field there makes it appear here with no code
 * change -- the same promise the Blade editor made.
 */
export type FieldCtx = { media: MediaItem[]; iconOptions: Record<string, string> };

type Value = unknown;

export function FieldEditor({
  field,
  value,
  onChange,
  ctx,
}: {
  field: FieldDef;
  value: Value;
  onChange: (next: Value) => void;
  ctx: FieldCtx;
}) {
  switch (field.type) {
    case 'group': {
      const group = (value ?? {}) as Record<string, Value>;
      return (
        <fieldset className="b-card" style={{ padding: 12 }}>
          <legend className="b-label">{field.label}</legend>
          {(field.fields ?? []).map((sub) => (
            <div key={sub.key} style={{ marginBottom: 10 }}>
              <FieldEditor
                field={sub}
                value={group[sub.key]}
                onChange={(next) => onChange({ ...group, [sub.key]: next })}
                ctx={ctx}
              />
            </div>
          ))}
        </fieldset>
      );
    }

    case 'repeater': {
      const rows = (Array.isArray(value) ? value : []) as Record<string, Value>[];
      const blank = () => {
        const out: Record<string, Value> = {};
        for (const sub of field.fields ?? []) out[sub.key] = sub.type === 'bool' ? false : sub.default ?? '';
        return out;
      };
      return (
        <div className="b-card" style={{ padding: 12 }}>
          <div className="b-label">{field.label}</div>
          {rows.map((row, index) => (
            <div className="b-repeater-row" key={index}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <span className="b-pill">#{index + 1}</span>
                <span className="spacer" style={{ marginLeft: 'auto' }} />
                <button type="button" className="b-btn" disabled={index === 0}
                        onClick={() => onChange(swap(rows, index, index - 1))}>↑</button>
                <button type="button" className="b-btn" disabled={index === rows.length - 1}
                        onClick={() => onChange(swap(rows, index, index + 1))}>↓</button>
                <button type="button" className="b-btn b-btn--danger"
                        onClick={() => onChange(rows.filter((_, i) => i !== index))}>Remove</button>
              </div>
              {(field.fields ?? []).map((sub) => (
                <div key={sub.key} style={{ marginBottom: 8 }}>
                  <FieldEditor
                    field={sub}
                    value={row[sub.key]}
                    onChange={(next) => onChange(rows.map((r, i) => (i === index ? { ...r, [sub.key]: next } : r)))}
                    ctx={ctx}
                  />
                </div>
              ))}
            </div>
          ))}
          <button type="button" className="b-btn" onClick={() => onChange([...rows, blank()])}>Add item</button>
        </div>
      );
    }

    case 'bool':
      return (
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={Boolean(value)} data-testid={`field-${field.key}`}
                 onChange={(e) => onChange(e.target.checked)} />
          <span className="b-label" style={{ margin: 0 }}>{field.label}</span>
        </label>
      );

    case 'select': {
      const options = field.options ?? {};
      return (
        <div>
          <label className="b-label">{field.label}</label>
          <select className="b-select" value={String(value ?? '')} data-testid={`field-${field.key}`}
                  onChange={(e) => onChange(e.target.value)}>
            {Object.entries(options).map(([k, label]) => <option value={k} key={k}>{label}</option>)}
          </select>
        </div>
      );
    }

    case 'number':
      return (
        <div>
          <label className="b-label">{field.label}</label>
          <input className="b-input" type="number" min={field.min} max={field.max} data-testid={`field-${field.key}`}
                 value={value === null || value === undefined ? '' : Number(value)}
                 onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
        </div>
      );

    case 'color':
      return (
        <div>
          <label className="b-label">{field.label}</label>
          <input className="b-input" type="color" value={String(value ?? '#000000')} data-testid={`field-${field.key}`}
                 onChange={(e) => onChange(e.target.value)} />
        </div>
      );

    case 'text':
    case 'paragraphs':
      return (
        <div>
          <label className="b-label">{field.label}</label>
          <textarea className="b-textarea" value={String(value ?? '')} data-testid={`field-${field.key}`}
                    onChange={(e) => onChange(e.target.value)} />
        </div>
      );

    case 'media': {
      const current = value ? ctx.media.find((m) => String(m.id) === String(value)) : undefined;
      return (
        <div>
          <label className="b-label">{field.label}</label>
          <select className="b-select" value={value === null || value === undefined ? '' : String(value)}
                  data-testid={`field-${field.key}`}
                  onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}>
            <option value="">— none —</option>
            {ctx.media.map((m) => <option value={m.id} key={m.id}>#{m.id} {m.alt || m.path}</option>)}
          </select>
          {current && <img src={current.url} alt="" style={{ maxHeight: 80, marginTop: 8, borderRadius: 6 }} />}
        </div>
      );
    }

    default:
      // string, url, reference
      return (
        <div>
          <label className="b-label">{field.label}</label>
          <input className="b-input" type="text" value={String(value ?? '')} data-testid={`field-${field.key}`}
                 onChange={(e) => onChange(e.target.value)} />
        </div>
      );
  }
}

function swap<T>(rows: T[], a: number, b: number): T[] {
  const copy = rows.slice();
  const tmp = copy[a];
  copy[a] = copy[b];
  copy[b] = tmp;
  return copy;
}
