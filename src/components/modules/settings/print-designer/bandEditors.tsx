import React from 'react';
import { FiChevronDown, FiChevronUp, FiEye, FiEyeOff, FiMenu, FiTrash2 } from 'react-icons/fi';
import { Button } from '../../../../pages/UiElements/CustomButtons';
import { Input, Select, Textarea } from '../../../utils/fields/FormControls';
import {
  Align,
  DocType,
  FIELD_GROUP_NAMES,
  FieldGroup,
  InfoBand,
  InfoItem,
  NotesBand,
  SignatureBand,
  SpacerBand,
  TableBand,
  TableColumn,
  TitleBand,
  TotalsBand,
  fieldName,
  fieldsFor,
  isNumericField,
  lineFieldsFor,
} from '../../../utils/print-designer/printTemplate';

/**
 * Which paper is being designed.
 *
 * ⚠️ Context rather than a prop, and it is worth saying why: the doc type is
 * needed only by FieldPicker, four levels down inside band editors that have no
 * other reason to know about it. Threading it through would put a `docType` on
 * five component signatures whose job is to draw a form -- and the sixth one
 * added later would be the one that forgets it and quietly offers a challan's
 * fields on a hotel bill.
 *
 * The default is the sales challan, so every existing caller keeps working
 * without a provider.
 *
 * ⚠️ Declared ONCE, further down beside useDocType(). Both branches wrote this
 * context and the merge brought in both copies -- two exports of the same name
 * in one module, which is a duplicate declaration rather than a duplicated
 * comment.
 */

/**
 * The controls for one band of a print template.
 *
 * Kept apart from the designer page itself because the page is already the
 * arrangement of three panels and a preview, and each band type needs a small
 * form of its own -- seven of them inlined there would bury the arrangement.
 */

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

export const PANEL =
  'rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-3 shadow-default';

export const SUB_LABEL =
  'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400';

const CONTROL =
  'w-full rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-2 py-1 text-sm text-[rgb(var(--c-text))] outline-none dark:bg-boxdark';

const ALIGN_OPTIONS: { id: Align; name: string }[] = [
  { id: 'left', name: 'Left' },
  { id: 'center', name: 'Centre' },
  { id: 'right', name: 'Right' },
];

export const AlignPicker: React.FC<{
  value: Align;
  onChange: (value: Align) => void;
  label?: string;
}> = ({ value, onChange, label = 'Align' }) => (
  <div>
    <span className={SUB_LABEL}>{label}</span>
    <Select
      value={value}
      onChange={(event) => onChange(event.target.value as Align)}
      className={CONTROL}
    >
      {ALIGN_OPTIONS.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </Select>
  </div>
);

export const CheckRow: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}> = ({ checked, onChange, label, hint }) => (
  <label className="flex cursor-pointer items-start gap-2 py-1 text-sm text-[rgb(var(--c-text))]">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
    />
    <span className="min-w-0">
      {label}
      {hint ? (
        <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      ) : null}
    </span>
  </label>
);

export const NumberBox: React.FC<{
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}> = ({ value, onChange, label, min = 0, max = 999, step = 1, hint }) => (
  <div>
    <span className={SUB_LABEL}>{label}</span>
    <Input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(event) => {
        const next = Number(event.target.value);
        onChange(Number.isFinite(next) ? Math.min(max, Math.max(min, next)) : min);
      }}
      className={CONTROL}
    />
    {hint ? (
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    ) : null}
  </div>
);

/**
 * The "add a field" control.
 *
 * Grouped by what the field is about rather than listed as forty names,
 * because a tenant looking for the driver's mobile looks under Transport and
 * not under M. Fields already on the paper are still offered: a challan that
 * prints the invoice number twice -- once at the top, once beside the total --
 * is a real thing people ask for.
 */
/**
 * Which paper the editors are describing.
 *
 * A context rather than a prop threaded through every band editor. The doc type
 * is needed in exactly two leaves -- the field picker and the signature row's
 * field select -- and passing it down through eight editors that have no use
 * for it would be eight signatures widened to carry one value past them.
 *
 * The default is the challan, so an editor rendered outside a provider behaves
 * as it did before this existed rather than showing an empty field list.
 */
export const DocTypeContext = React.createContext<DocType>('sales_challan');

export const useDocType = () => React.useContext(DocTypeContext);

export const FieldPicker: React.FC<{
  onPick: (key: string) => void;
  source?: 'info' | 'line';
  label?: string;
}> = ({ onPick, source = 'info', label = 'Add a field' }) => {
  const docType = useDocType();
  // ⚠️ The paper's OWN catalogue. A hotel money receipt offers no tax field and
  // no table column at all, and that absence is what stops a receipt turning
  // into a VAT invoice -- see HOTEL_RECEIPT_FIELDS. An order's list holds no
  // vehicle number and a challan's holds no order rate, for the same reason.
  const catalog = source === 'line' ? lineFieldsFor(docType) : fieldsFor(docType);
  const groups = catalog.reduce<Record<string, typeof catalog>>((map, field) => {
    (map[field.group] ||= []).push(field);
    return map;
  }, {});

  return (
    <Select
      value=""
      onChange={(event) => {
        if (event.target.value) onPick(event.target.value);
      }}
      className={CONTROL}
    >
      <option value="">{label}…</option>
      {Object.entries(groups).map(([group, fields]) => (
        <optgroup key={group} label={FIELD_GROUP_NAMES[group as FieldGroup] ?? group}>
          {fields.map((field) => (
            <option key={field.key} value={field.key}>
              {field.name}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
};

/* ------------------------------------------------------------------ */
/* A draggable row                                                     */
/* ------------------------------------------------------------------ */

type DragState = { id: string; over: string | null } | null;

export const useRowDrag = () => {
  const [drag, setDrag] = React.useState<DragState>(null);

  /**
   * The payload is set first because Firefox starts no drag without one, and
   * the state that dims the row is deferred a tick: re-rendering the element
   * the browser is still taking its drag image from cancels the drag outright.
   * Learned the hard way on the sidebar arrangement screen.
   */
  const handlers = (id: string, onDrop: (draggedId: string, overId: string) => void) => ({
    draggable: true,
    onDragStart: (event: React.DragEvent) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
      setTimeout(() => setDrag({ id, over: null }), 0);
    },
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setDrag((current) =>
        current?.over === id ? current : { id: current?.id ?? '', over: id },
      );
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      const dragged = drag?.id || event.dataTransfer.getData('text/plain');
      if (dragged && dragged !== id) onDrop(dragged, id);
      setDrag(null);
    },
    onDragEnd: () => setDrag(null),
  });

  const rowClass = (id: string) =>
    'flex cursor-grab items-center gap-2 rounded-sm border px-2 py-1.5 text-sm active:cursor-grabbing ' +
    (drag?.id === id
      ? 'border-primary bg-gray-100 opacity-60 dark:bg-meta-4'
      : drag?.over === id && drag?.id
        ? 'border-primary bg-gray-100 dark:bg-meta-4'
        : 'border-stroke dark:border-strokedark');

  return { handlers, rowClass, dragging: Boolean(drag) };
};

/** Moves `dragged` to where `over` sits, keeping everything else in order. */
export const reorder = <T,>(list: T[], from: number, to: number): T[] => {
  if (from < 0 || to < 0 || from === to) return list;
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

const MoveButtons: React.FC<{
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
}> = ({ index, count, onMove }) => (
  <>
    <Button
      type="button"
      draggable={false}
      title="Move up"
      disabled={index === 0}
      onClick={() => onMove(index, index - 1)}
      className="rounded p-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-meta-4"
    >
      <FiChevronUp />
    </Button>
    <Button
      type="button"
      draggable={false}
      title="Move down"
      disabled={index === count - 1}
      onClick={() => onMove(index, index + 1)}
      className="rounded p-1 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-meta-4"
    >
      <FiChevronDown />
    </Button>
  </>
);

/* ------------------------------------------------------------------ */
/* Info / totals: a list of label:value fields                         */
/* ------------------------------------------------------------------ */

const ItemList: React.FC<{
  items: InfoItem[];
  onChange: (items: InfoItem[]) => void;
  /** Totals have nothing to leave off -- a zero total is still a total. */
  allowHideIfEmpty?: boolean;
}> = ({ items, onChange, allowHideIfEmpty = true }) => {
  const { handlers, rowClass } = useRowDrag();

  const move = (from: number, to: number) => onChange(reorder(items, from, to));
  const rowId = (index: number) => `item-${index}`;

  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <li
          key={rowId(index)}
          {...handlers(rowId(index), (dragged, over) =>
            move(Number(dragged.split('-')[1]), Number(over.split('-')[1])),
          )}
          className={rowClass(rowId(index))}
        >
          <FiMenu className="shrink-0 text-slate-400" />

          <span
            className="w-28 shrink-0 truncate text-xs text-slate-500 dark:text-slate-400"
            title={fieldName(item.field)}
          >
            {fieldName(item.field)}
          </span>

          {/* The label is the whole point of the designer: what this tenant's
              paper calls the field, in whatever language they print in. */}
          <Input
            value={item.label ?? ''}
            draggable={false}
            // A blank line has no name of its own to fall back on -- naming it
            // is the entire reason it was added -- so it asks rather than
            // offering the catalogue's word for "a line to write on".
            placeholder={item.field === 'blank' ? 'Type the label…' : fieldName(item.field)}
            onChange={(event) => {
              const next = items.slice();
              next[index] = { ...item, label: event.target.value };
              onChange(next);
            }}
            className="min-w-0 flex-1 rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-1.5 py-0.5 text-sm outline-none dark:bg-boxdark"
          />

          {allowHideIfEmpty ? (
            <Button
              type="button"
              draggable={false}
              title={
                item.hideIfEmpty
                  ? 'Hidden when the voucher has nothing for it'
                  : 'Always printed, blank if empty'
              }
              onClick={() => {
                const next = items.slice();
                next[index] = { ...item, hideIfEmpty: !item.hideIfEmpty };
                onChange(next);
              }}
              className="rounded p-1 hover:bg-gray-100 dark:hover:bg-meta-4"
            >
              {item.hideIfEmpty ? <FiEyeOff /> : <FiEye />}
            </Button>
          ) : null}

          <MoveButtons index={index} count={items.length} onMove={move} />

          <Button
            type="button"
            draggable={false}
            title="Remove from the paper"
            onClick={() => onChange(items.filter((_, at) => at !== index))}
            className="rounded p-1 text-danger hover:bg-gray-100 dark:hover:bg-meta-4"
          >
            <FiTrash2 />
          </Button>
        </li>
      ))}

      {!items.length ? (
        <li className="rounded-sm border border-dashed border-[rgb(var(--c-border))] p-3 text-center text-xs text-slate-500 dark:text-slate-400">
          Nothing here yet — add a field below.
        </li>
      ) : null}
    </ul>
  );
};

export const InfoBandEditor: React.FC<{
  band: InfoBand;
  onChange: (band: InfoBand) => void;
}> = ({ band, onChange }) => (
  <div className="flex flex-col gap-3">
    <div className="grid grid-cols-2 gap-2">
      <div>
        <span className={SUB_LABEL}>Arrangement</span>
        <Select
          value={band.layout}
          onChange={(event) =>
            onChange({ ...band, layout: event.target.value as 'rows' | 'inline' })
          }
          className={CONTROL}
        >
          <option value="rows">One field per line</option>
          <option value="inline">All on one line</option>
        </Select>
      </div>

      {band.layout === 'rows' ? (
        <NumberBox
          label="Columns"
          value={band.columns}
          min={1}
          max={3}
          onChange={(value) => onChange({ ...band, columns: value as 1 | 2 | 3 })}
        />
      ) : (
        <div />
      )}
    </div>

    {band.layout === 'rows' ? (
      <>
        {/* The control that makes a set of lines read as a pad rather than as
            a paragraph: one width for every label, so every value starts on the
            same vertical line. */}
        <NumberBox
          label="Label column width"
          value={band.labelWidth}
          min={2}
          max={30}
          step={0.5}
          hint="Roughly how many characters wide. Raise it until the longest label fits on one line — every value then starts at the same place."
          onChange={(labelWidth) => onChange({ ...band, labelWidth })}
        />

        <div className="grid grid-cols-2 gap-2">
          {/* The depth of a row and the space between rows are two different
              things and are asked for separately: a tall row with no gap is a
              ruled table, a short row with a gap is a list of boxes. */}
          <NumberBox
            label="Row height (mm)"
            value={band.rowPadding}
            min={0}
            max={20}
            step={0.5}
            hint="Air above and below the text. Raise it to write in by hand."
            onChange={(rowPadding) => onChange({ ...band, rowPadding })}
          />
          <NumberBox
            label="Gap between rows (mm)"
            value={band.rowGap}
            min={0}
            max={20}
            step={0.5}
            hint="0 keeps boxed rows joined as one ruled block."
            onChange={(rowGap) => onChange({ ...band, rowGap })}
          />
        </div>

        <CheckRow
          checked={band.boxed}
          onChange={(boxed) => onChange({ ...band, boxed })}
          label="Draw a box around each line"
          hint="The look of a printed order pad."
        />
      </>
    ) : null}

    <ItemList items={band.items} onChange={(items) => onChange({ ...band, items })} />

    <FieldPicker
      onPick={(field) =>
        onChange({
          ...band,
          items: [
            ...band.items,
            field === 'blank'
              ? // A hand-written line is empty by definition. Left to hide when
                // empty it would never appear at all, and its label starts blank
                // because "Blank line" is the catalogue's word for it, not the
                // word the pad should carry.
                { field, label: '', hideIfEmpty: false }
              : { field, hideIfEmpty: true },
          ],
        })
      }
    />
  </div>
);

export const TotalsBandEditor: React.FC<{
  band: TotalsBand;
  onChange: (band: TotalsBand) => void;
}> = ({ band, onChange }) => (
  <div className="flex flex-col gap-3">
    <div className="grid grid-cols-2 gap-2">
      <AlignPicker
        value={band.align}
        onChange={(value) => onChange({ ...band, align: value })}
        label="Where the totals sit"
      />

      <div>
        <span className={SUB_LABEL}>Arrangement</span>
        {/* ⚠️ A column of figures is read DOWNWARDS, each against the one above
            it, which is what a bill wants. One line is for a sheet where the
            totals are a footnote to the table and the paper is short -- an
            order that already runs to a second page for six deliveries. */}
        <Select
          value={band.layout}
          onChange={(event) =>
            onChange({ ...band, layout: event.target.value as "rows" | "inline" })
          }
          className={CONTROL}
        >
          <option value="rows">One total per line</option>
          <option value="inline">All on one line</option>
        </Select>
      </div>
    </div>
    <ItemList
      items={band.items}
      allowHideIfEmpty={false}
      onChange={(items) => onChange({ ...band, items })}
    />
    <FieldPicker onPick={(field) => onChange({ ...band, items: [...band.items, { field }] })} />
  </div>
);

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */

export const TableBandEditor: React.FC<{
  band: TableBand;
  onChange: (band: TableBand) => void;
}> = ({ band, onChange }) => {
  const { handlers, rowClass } = useRowDrag();
  const move = (from: number, to: number) =>
    onChange({ ...band, columns: reorder(band.columns, from, to) });
  const rowId = (index: number) => `col-${index}`;

  const update = (index: number, patch: Partial<TableColumn>) => {
    const next = band.columns.slice();
    next[index] = { ...next[index], ...patch };
    onChange({ ...band, columns: next });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <CheckRow
          checked={band.bordered}
          onChange={(bordered) => onChange({ ...band, bordered })}
          label="Ruled table"
        />
        <CheckRow
          checked={band.repeatHeader}
          onChange={(repeatHeader) => onChange({ ...band, repeatHeader })}
          label="Headings on every page"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* ⚠️ It foots the columns the paper knows a total for, and only those.
            A rate column has none and stays blank; a running balance is taken
            from what was charged less what was taken rather than by adding the
            column up, which would count every earlier delivery again. */}
        <CheckRow
          checked={band.totalRow}
          onChange={(totalRow) => onChange({ ...band, totalRow })}
          label="Total row at the foot"
        />

        {band.totalRow ? (
          <div>
            <span className={SUB_LABEL}>What it is called</span>
            <Input
              value={band.totalRowLabel}
              onChange={(event) => onChange({ ...band, totalRowLabel: event.target.value })}
              placeholder="Grand Total"
              className={CONTROL}
            />
          </div>
        ) : null}
      </div>

      <NumberBox
        label="Blank lines after the last item"
        value={band.fillerRows}
        min={0}
        max={30}
        hint="Fills out a short challan so nothing can be written in afterwards."
        onChange={(fillerRows) => onChange({ ...band, fillerRows })}
      />

      <ul className="flex flex-col gap-1.5">
        {band.columns.map((column, index) => (
          <li
            key={rowId(index)}
            {...handlers(rowId(index), (dragged, over) =>
              move(Number(dragged.split('-')[1]), Number(over.split('-')[1])),
            )}
            className={rowClass(rowId(index)) + ' flex-wrap'}
          >
            <FiMenu className="shrink-0 text-slate-400" />

            <span
              className="w-24 shrink-0 truncate text-xs text-slate-500 dark:text-slate-400"
              title={fieldName(column.field)}
            >
              {fieldName(column.field)}
            </span>

            <Input
              value={column.label ?? ''}
              draggable={false}
              placeholder={fieldName(column.field)}
              onChange={(event) => update(index, { label: event.target.value })}
              className="min-w-0 flex-1 rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-1.5 py-0.5 text-sm outline-none dark:bg-boxdark"
            />

            {/* Widths are shares, not millimetres. They need not add up: the
                renderer scales whatever is here to fill the paper, so pulling
                a column out never leaves a gap down the side of the table. */}
            <Input
              type="number"
              min={3}
              max={100}
              value={column.width ?? 10}
              draggable={false}
              title="Width share"
              onChange={(event) => update(index, { width: Number(event.target.value) })}
              className="w-16 shrink-0 rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-1.5 py-0.5 text-sm outline-none dark:bg-boxdark"
            />

            <Select
              value={column.align ?? (isNumericField(column.field) ? 'right' : 'left')}
              draggable={false}
              onChange={(event) => update(index, { align: event.target.value as Align })}
              className="w-24 shrink-0 rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-1 py-0.5 text-xs outline-none dark:bg-boxdark"
            >
              {ALIGN_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </Select>

            <MoveButtons index={index} count={band.columns.length} onMove={move} />

            <Button
              type="button"
              draggable={false}
              title="Remove this column"
              onClick={() =>
                onChange({ ...band, columns: band.columns.filter((_, at) => at !== index) })
              }
              className="rounded p-1 text-danger hover:bg-gray-100 dark:hover:bg-meta-4"
            >
              <FiTrash2 />
            </Button>
          </li>
        ))}
      </ul>

      <FieldPicker
        source="line"
        label="Add a column"
        onPick={(field) =>
          onChange({
            ...band,
            columns: [
              ...band.columns,
              {
                field,
                width: 15,
                align: isNumericField(field) ? 'right' : 'left',
              },
            ],
          })
        }
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* The small ones                                                      */
/* ------------------------------------------------------------------ */

export const TitleBandEditor: React.FC<{
  band: TitleBand;
  onChange: (band: TitleBand) => void;
}> = ({ band, onChange }) => (
  <div className="flex flex-col gap-3">
    <div>
      <span className={SUB_LABEL}>What the paper is called</span>
      <Input
        value={band.text}
        placeholder="Delivery Challan"
        onChange={(event) => onChange({ ...band, text: event.target.value })}
        className={CONTROL}
      />
    </div>

    <div className="grid grid-cols-2 gap-2">
      <AlignPicker value={band.align} onChange={(align) => onChange({ ...band, align })} />
      <NumberBox
        label="Size"
        value={band.scale}
        min={0.8}
        max={3}
        step={0.1}
        hint="Times the document's own size."
        onChange={(scale) => onChange({ ...band, scale })}
      />
    </div>

    <CheckRow
      checked={band.underline}
      onChange={(underline) => onChange({ ...band, underline })}
      label="Underline it"
    />
  </div>
);

/**
 * The gap control.
 *
 * Millimetres, and said so on the label, because this is a distance on paper
 * and the tenant setting it is holding a ruler against a printed pad. Stating
 * it in pixels would be asking somebody to convert, and stating it in lines
 * would move the gap every time the text size changed.
 */
export const SpacerBandEditor: React.FC<{
  band: SpacerBand;
  onChange: (band: SpacerBand) => void;
}> = ({ band, onChange }) => (
  <div className="flex flex-col gap-3">
    <NumberBox
      label="Height (mm)"
      value={band.height}
      min={0}
      max={200}
      step={1}
      hint="25 mm is about an inch. A4 is 297 mm tall."
      onChange={(height) => onChange({ ...band, height })}
    />

    {/* The three sizes people actually reach for, so the common case is a
        click rather than a number typed into a box. */}
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-500 dark:text-slate-400">Quick:</span>
      {[5, 10, 25, 50].map((mm) => (
        <Button
          key={mm}
          type="button"
          onClick={() => onChange({ ...band, height: mm })}
          className={
            'rounded-sm border px-2 py-0.5 text-xs ' +
            (band.height === mm
              ? 'border-primary bg-gray-100 dark:bg-meta-4'
              : 'border-[rgb(var(--c-border))] hover:bg-gray-100 dark:hover:bg-meta-4')
          }
        >
          {mm} mm
        </Button>
      ))}
    </div>

    <CheckRow
      checked={band.rule}
      onChange={(rule) => onChange({ ...band, rule })}
      label="Draw a dashed line across it"
      hint="For a fold line or a tear-off, rather than plain blank paper."
    />

    <p className="border-t border-[rgb(var(--c-border))] pt-3 text-xs leading-snug text-slate-500 dark:text-slate-400">
      Drag this above or below any part to push it up or down the page. Add as
      many as you need — one above and one below gives a part clear space on
      both sides.
    </p>
  </div>
);

export const NotesBandEditor: React.FC<{
  band: NotesBand;
  onChange: (band: NotesBand) => void;
}> = ({ band, onChange }) => (
  <div className="flex flex-col gap-3">
    <div>
      <span className={SUB_LABEL}>Terms printed at the foot</span>
      <Textarea
        rows={4}
        value={band.text}
        placeholder="Any shortage must be reported before the vehicle leaves…"
        onChange={(event) => onChange({ ...band, text: event.target.value })}
        className={CONTROL}
      />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <AlignPicker value={band.align} onChange={(align) => onChange({ ...band, align })} />
      <div className="self-end">
        <CheckRow
          checked={band.boxed}
          onChange={(boxed) => onChange({ ...band, boxed })}
          label="Box it"
        />
      </div>
    </div>
  </div>
);

export const SignatureBandEditor: React.FC<{
  band: SignatureBand;
  onChange: (band: SignatureBand) => void;
}> = ({ band, onChange }) => {
  const docType = React.useContext(DocTypeContext);
  const { handlers, rowClass } = useRowDrag();
  // Totals are filtered out below: a signature line names who signs, and no
  // paper is signed by its own total.
  const signatureFields = fieldsFor(docType);
  const move = (from: number, to: number) =>
    onChange({ ...band, items: reorder(band.items, from, to) });
  const rowId = (index: number) => `sign-${index}`;

  return (
    <div className="flex flex-col gap-3">
      <NumberBox
        label="Room above the rules (px)"
        value={band.space}
        min={0}
        max={200}
        step={5}
        hint="Enough space for somebody to actually sign."
        onChange={(space) => onChange({ ...band, space })}
      />

      <ul className="flex flex-col gap-1.5">
        {band.items.map((item, index) => (
          <li
            key={rowId(index)}
            {...handlers(rowId(index), (dragged, over) =>
              move(Number(dragged.split('-')[1]), Number(over.split('-')[1])),
            )}
            className={rowClass(rowId(index))}
          >
            <FiMenu className="shrink-0 text-slate-400" />

            <Input
              value={item.label}
              draggable={false}
              placeholder="Received By"
              onChange={(event) => {
                const next = band.items.slice();
                next[index] = { ...item, label: event.target.value };
                onChange({ ...band, items: next });
              }}
              className="min-w-0 flex-1 rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-1.5 py-0.5 text-sm outline-none dark:bg-boxdark"
            />

            {/* A name printed above the rule -- the seller's, usually. Left
                empty the rule stands alone, which is right for a signature
                the paper is collecting rather than stating. */}
            <Select
              value={item.field ?? ''}
              draggable={false}
              title="Name printed above the rule"
              onChange={(event) => {
                const next = band.items.slice();
                next[index] = { ...item, field: event.target.value || undefined };
                onChange({ ...band, items: next });
              }}
              className="w-36 shrink-0 rounded-sm border border-[rgb(var(--c-border))] bg-transparent px-1 py-0.5 text-xs outline-none dark:bg-boxdark"
            >
              <option value="">(blank line)</option>
              {/* A name printed above the rule, so the totals are no use here
                  -- and neither are the hotel's bill figures, for the same
                  reason: nobody signs "4,830". */}
              {signatureFields
                .filter((field) => !['total', 'bill', 'receipt'].includes(field.group))
                .map((field) => (
                  <option key={field.key} value={field.key}>
                    {field.name}
                  </option>
                ))}
            </Select>

            <MoveButtons index={index} count={band.items.length} onMove={move} />

            <Button
              type="button"
              draggable={false}
              title="Remove this signature"
              onClick={() =>
                onChange({ ...band, items: band.items.filter((_, at) => at !== index) })
              }
              className="rounded p-1 text-danger hover:bg-gray-100 dark:hover:bg-meta-4"
            >
              <FiTrash2 />
            </Button>
          </li>
        ))}
      </ul>

      <Button
        type="button"
        onClick={() => onChange({ ...band, items: [...band.items, { label: 'Signature' }] })}
        className="rounded-sm border border-dashed border-[rgb(var(--c-border))] px-2 py-1 text-sm text-[rgb(var(--c-text))] hover:bg-gray-100 dark:hover:bg-meta-4"
      >
        Add a signature line
      </Button>
    </div>
  );
};
