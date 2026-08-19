import React, { useMemo, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import { FIELD_BASE, FIELD_LABEL } from '../../../theme/fieldStyles';
import { Button } from '../../../pages/UiElements/CustomButtons';
import { Input, Textarea } from './FormControls';

/**
 * The letter signature block, as a form instead of a rich-text editor.
 *
 * This replaces the app's one Quill editor. Everything anyone ever built with
 * it was the same shape — a line of signatories side by side, sometimes a
 * sentence above them — so the shape IS the form now: lead text, then one
 * column per signatory. That retires react-quill (unmaintained, an XSS
 * advisory, and the `findDOMNode` call that stood between this app and React
 * 19) along with the custom table module written to teach Quill 1.3 tables.
 *
 * The serialized value is the same markup Quill produced — plain
 * table/tbody/tr/td with data-row ids, an empty row to sign on and a labelled
 * row under it — because that is what the letter's PDF renderer reads and what
 * the API's signatureBlock() repair pass expects. A block saved here prints
 * exactly like one saved from the old editor.
 *
 * A stored value this form cannot faithfully represent (free-form markup from
 * the Quill days) is NOT destroyed: it is shown read-only, keeps printing as
 * it always did, and is only replaced when the operator chooses to start
 * fresh and saves.
 */

type Signatory = {
  /** The line under the signature — "Branch Manager". */
  label: string;
  /** An optional second line — the company or branch name. */
  sub: string;
};

type Parsed =
  | { kind: 'empty' }
  | { kind: 'structured'; lead: string; signatories: Signatory[] }
  | { kind: 'custom' };

const MAX_SIGNATORIES = 4;

/** One fresh column per classic default — the old editor opened with three. */
const blankSignatories = (): Signatory[] => [
  { label: '', sub: '' },
  { label: '', sub: '' },
  { label: '', sub: '' },
];

const decode = (html: string): string => {
  const box = document.createElement('textarea');
  box.innerHTML = html;
  return box.value;
};

const encode = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Reads a stored block back into the form's terms, or says it cannot.
 *
 * Structured means: optional paragraphs, then one table whose last row carries
 * the labels (the rows above it are the space signed in). That covers every
 * block this form writes and the ordinary blocks the old editor wrote. Anything
 * else — text after the table, two tables, markup beyond p/br/strong inside a
 * cell — is 'custom' and left alone.
 */
const parse = (value: string): Parsed => {
  const trimmed = (value || '').trim();
  if (!trimmed) return { kind: 'empty' };

  const doc = new DOMParser().parseFromString(trimmed, 'text/html');
  const body = doc.body;
  const tables = body.querySelectorAll('table');

  if (tables.length !== 1) return { kind: 'custom' };
  const table = tables[0];

  // Only paragraphs may stand before the table, and nothing after it.
  let lead = '';
  for (let node = body.firstChild; node; node = node.nextSibling) {
    if (node === table) {
      for (let after = node.nextSibling; after; after = after.nextSibling) {
        if (after.textContent?.trim()) return { kind: 'custom' };
      }
      break;
    }
    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) continue;
    if (node.nodeType !== Node.ELEMENT_NODE || (node as Element).tagName !== 'P') {
      return { kind: 'custom' };
    }
    lead += (lead ? '\n' : '') + (node.textContent || '').trim();
  }

  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length === 0 || rows.length > 3) return { kind: 'custom' };

  // Every row above the label row must be blank — it is the space signed in.
  for (const row of rows.slice(0, -1)) {
    for (const cell of Array.from(row.querySelectorAll('td, th'))) {
      if (cell.textContent?.trim()) return { kind: 'custom' };
    }
  }

  const labelRow = rows[rows.length - 1];
  const signatories: Signatory[] = [];
  for (const cell of Array.from(labelRow.querySelectorAll('td, th'))) {
    // A cell is label<br>sub at most; anything richer is custom.
    if (cell.querySelector(':scope :not(br):not(strong):not(b)')) return { kind: 'custom' };
    const lines = cell.innerHTML
      .split(/<br\s*\/?\s*>/i)
      .map((part) => decode(part.replace(/<[^>]*>/g, '')).trim());
    if (lines.length > 2) return { kind: 'custom' };
    signatories.push({ label: lines[0] || '', sub: lines[1] || '' });
  }

  if (signatories.length === 0 || signatories.length > MAX_SIGNATORIES) {
    return { kind: 'custom' };
  }

  return { kind: 'structured', lead, signatories };
};

/** Writes the block in the exact shape the old editor's tables took. */
const serialize = (lead: string, signatories: Signatory[]): string => {
  const named = signatories.filter((s) => s.label.trim() || s.sub.trim());
  const leadLines = lead
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (named.length === 0 && leadLines.length === 0) return '';

  const paragraphs = leadLines.map((line) => `<p>${encode(line)}</p>`).join('');
  if (named.length === 0) return paragraphs;

  const signCells = named
    .map(() => '<td data-row="row-sign"><br></td>')
    .join('');
  const labelCells = named
    .map((s) => {
      const label = encode(s.label.trim());
      const sub = s.sub.trim() ? `<br>${encode(s.sub.trim())}` : '';
      return `<td data-row="row-label" style="text-align: center;">${label}${sub}</td>`;
    })
    .join('');

  return (
    paragraphs +
    `<table><tbody><tr>${signCells}</tr><tr>${labelCells}</tr></tbody></table>`
  );
};

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

const SignatureBlockEditor: React.FC<Props> = ({ value, onChange, placeholder }) => {
  // Parsed once from the incoming value; edited state lives here afterwards,
  // and every edit writes the serialized block straight back up.
  const initial = useMemo(() => parse(value), []);
  const [mode, setMode] = useState<'form' | 'custom'>(
    initial.kind === 'custom' ? 'custom' : 'form',
  );
  const [lead, setLead] = useState(initial.kind === 'structured' ? initial.lead : '');
  const [signatories, setSignatories] = useState<Signatory[]>(
    initial.kind === 'structured' && initial.signatories.length
      ? initial.signatories
      : blankSignatories(),
  );

  const apply = (nextLead: string, nextSignatories: Signatory[]) => {
    setLead(nextLead);
    setSignatories(nextSignatories);
    onChange(serialize(nextLead, nextSignatories));
  };

  if (mode === 'custom') {
    // A hand-crafted block from the rich-editor days. It keeps printing as it
    // always has; the form only takes over if the operator asks it to.
    return (
      <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/40 dark:bg-amber-500/10">
        <p className="mb-2 text-amber-800 dark:text-amber-200">
          This signature block was written with the old editor in a layout this
          form cannot edit. It still prints on the letter exactly as before.
        </p>
        <Textarea
          readOnly
          value={value}
          rows={4}
          className={`${FIELD_BASE} w-full resize-y px-3 py-2 font-mono text-xs`}
        />
        <Button
          type="button"
          onClick={() => {
            setMode('form');
            apply('', blankSignatories());
          }}
          className="mt-2 rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
        >
          Discard and start fresh
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-boxdark">
      <label className={`${FIELD_LABEL} text-sm`}>Text above the signatures (optional)</label>
      <Textarea
        value={lead}
        onChange={(e) => apply(e.target.value, signatories)}
        placeholder={placeholder || 'One sentence per line'}
        rows={2}
        className={`${FIELD_BASE} mb-3 w-full resize-y px-3 py-2 text-sm`}
      />

      <label className={`${FIELD_LABEL} text-sm`}>Signatories, left to right</label>
      <div className="flex flex-wrap gap-2">
        {signatories.map((signatory, index) => (
          <div
            key={index}
            className="w-44 rounded border border-gray-200 p-2 dark:border-gray-600"
          >
            {/* The printed shape, in miniature: space, line, then the labels. */}
            <div className="mb-2 border-b border-gray-400 pb-6 dark:border-gray-500" />
            <Input
              value={signatory.label}
              onChange={(e) =>
                apply(
                  lead,
                  signatories.map((s, i) =>
                    i === index ? { ...s, label: e.target.value } : s,
                  ),
                )
              }
              placeholder="Authorized Signatory"
              className={`${FIELD_BASE} mb-1 w-full px-2 py-1 text-center text-xs`}
            />
            <Input
              value={signatory.sub}
              onChange={(e) =>
                apply(
                  lead,
                  signatories.map((s, i) =>
                    i === index ? { ...s, sub: e.target.value } : s,
                  ),
                )
              }
              placeholder="Second line (optional)"
              className={`${FIELD_BASE} mb-1 w-full px-2 py-1 text-center text-xs`}
            />
            {signatories.length > 1 ? (
              <Button
                type="button"
                title="Remove this signatory"
                onClick={() =>
                  apply(lead, signatories.filter((_, i) => i !== index))
                }
                className="mx-auto block text-red-500 hover:text-red-700"
              >
                <FiTrash2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        ))}
        {signatories.length < MAX_SIGNATORIES ? (
          <Button
            type="button"
            onClick={() => apply(lead, [...signatories, { label: '', sub: '' }])}
            className="flex w-10 items-center justify-center rounded border border-dashed border-gray-300 text-gray-400 hover:border-primary hover:text-primary dark:border-gray-600"
            title="Add a signatory"
          >
            <FiPlus />
          </Button>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Columns left empty are dropped from the printed block; leave everything
        empty to print the letter&apos;s default block.
      </p>
    </div>
  );
};

export default SignatureBlockEditor;
