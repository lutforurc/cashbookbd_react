import React, { useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import TableModule from './quillTable';

/**
 * Quill writes alignment as a CSS class (ql-align-center) by default, and the
 * PDF renderer only reads inline styles — a centred line would come out left
 * aligned on the printed page. Registering the style attributors makes Quill
 * emit `style="text-align:center"` instead, which survives the trip.
 */
const AlignStyle = Quill.import('attributors/style/align');
Quill.register(AlignStyle, true);

/** Quill 1.3 has no tables of its own; these are ours. */
Quill.register('modules/table', TableModule, true);

/**
 * The table buttons are ours, not Quill's, so they arrive without an icon.
 * Drawn on Quill's own 18x18 grid and with its ql-stroke class, so they take
 * the same hover and active colours as the buttons beside them.
 */
const icons = Quill.import('ui/icons');

icons.insertTable =
  '<svg viewBox="0 0 18 18">' +
  '<rect class="ql-stroke" height="12" width="14" x="2" y="3"></rect>' +
  '<line class="ql-stroke" x1="2" x2="16" y1="7" y2="7"></line>' +
  '<line class="ql-stroke" x1="6.7" x2="6.7" y1="3" y2="15"></line>' +
  '<line class="ql-stroke" x1="11.3" x2="11.3" y1="3" y2="15"></line>' +
  '</svg>';

icons.insertRow =
  '<svg viewBox="0 0 18 18">' +
  '<rect class="ql-stroke" height="7" width="14" x="2" y="2"></rect>' +
  '<line class="ql-stroke" x1="6.7" x2="6.7" y1="2" y2="9"></line>' +
  '<line class="ql-stroke" x1="11.3" x2="11.3" y1="2" y2="9"></line>' +
  '<line class="ql-stroke" x1="9" x2="9" y1="11" y2="16"></line>' +
  '<line class="ql-stroke" x1="6.5" x2="11.5" y1="13.5" y2="13.5"></line>' +
  '</svg>';

/*
  Rows are drawn lying down and columns standing up, so the pair a button acts
  on is legible before the tooltip is.
*/
icons.insertColumn =
  '<svg viewBox="0 0 18 18">' +
  '<rect class="ql-stroke" height="14" width="7" x="2" y="2"></rect>' +
  '<line class="ql-stroke" x1="2" x2="9" y1="6.7" y2="6.7"></line>' +
  '<line class="ql-stroke" x1="2" x2="9" y1="11.3" y2="11.3"></line>' +
  '<line class="ql-stroke" x1="13.5" x2="13.5" y1="6.5" y2="11.5"></line>' +
  '<line class="ql-stroke" x1="11" x2="16" y1="9" y2="9"></line>' +
  '</svg>';

icons.removeColumn =
  '<svg viewBox="0 0 18 18">' +
  '<rect class="ql-stroke" height="14" width="7" x="2" y="2"></rect>' +
  '<line class="ql-stroke" x1="2" x2="9" y1="6.7" y2="6.7"></line>' +
  '<line class="ql-stroke" x1="2" x2="9" y1="11.3" y2="11.3"></line>' +
  '<line class="ql-stroke" x1="11.8" x2="16.2" y1="6.8" y2="11.2"></line>' +
  '<line class="ql-stroke" x1="16.2" x2="11.8" y1="6.8" y2="11.2"></line>' +
  '</svg>';

icons.removeTable =
  '<svg viewBox="0 0 18 18">' +
  '<rect class="ql-stroke" height="7" width="14" x="2" y="2"></rect>' +
  '<line class="ql-stroke" x1="6.7" x2="6.7" y1="2" y2="9"></line>' +
  '<line class="ql-stroke" x1="11.3" x2="11.3" y1="2" y2="9"></line>' +
  '<line class="ql-stroke" x1="6.8" x2="11.2" y1="11.8" y2="16.2"></line>' +
  '<line class="ql-stroke" x1="11.2" x2="6.8" y1="11.8" y2="16.2"></line>' +
  '</svg>';

/**
 * Kept to the marks dompdf renders faithfully. Tables earn their place — a
 * sign-off puts its signatories side by side, and columns are the only honest
 * way to say that. Colours and fonts stay out: they would let someone author a
 * block that looks right here and wrong on paper.
 */
const TOOLBAR = [
  ['bold', 'italic', 'underline'],
  [{ align: '' }, { align: 'center' }, { align: 'right' }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['insertTable', 'insertRow', 'insertColumn', 'removeColumn', 'removeTable'],
  ['clean'],
];

const FORMATS = ['bold', 'italic', 'underline', 'align', 'list', 'table'];

/**
 * Signatories run three across, and a cell holds a single line — pressing enter
 * inside one starts a row rather than a second line. So a new table arrives
 * with a row to sign on and a row to be named on; the row and column buttons
 * take it from there, for a branch that signs with more or fewer than three.
 */
const TABLE_ROWS = 2;
const TABLE_COLUMNS = 3;

type Props = {
  value: string;
  onChange: (html: string) => void;
  /** How tall the sheet starts; it grows with what is written on it. */
  height?: number;
  placeholder?: string;
};

const RichTextEditor: React.FC<Props> = ({
  value,
  onChange,
  height = 140,
  placeholder,
}) => {
  const modules = useMemo(
    () => ({
      toolbar: {
        container: TOOLBAR,
        handlers: {
          insertTable(this: any) {
            const { quill } = this;

            // insertTable reads the selection and gives up without one, which
            // is what an untouched editor has.
            if (!quill.getSelection()) {
              quill.focus();
            }

            quill.getModule('table').insertTable(TABLE_ROWS, TABLE_COLUMNS);
          },

          // Each of these reaches for the cell the cursor sits in and throws
          // when there is none, so the table has to be found first.
          insertRow(this: any) {
            const table = this.quill.getModule('table');
            if (table.getTable()[0]) {
              table.insertRowBelow();
            }
          },

          insertColumn(this: any) {
            const table = this.quill.getModule('table');
            if (table.getTable()[0]) {
              table.insertColumnRight();
            }
          },

          removeColumn(this: any) {
            const table = this.quill.getModule('table');
            if (table.getTable()[0]) {
              table.deleteColumn();
            }
          },

          removeTable(this: any) {
            const table = this.quill.getModule('table');
            if (table.getTable()[0]) {
              table.deleteTable();
            }
          },
        },
      },
      table: {},
    }),
    [],
  );

  return (
    // The frame matches the fields around it; the sheet inside follows the
    // theme too, and the colours for both come from tokens.css by way of the
    // .rich-text-editor rules in style.css.
    <div
      className="rich-text-editor rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-boxdark"
      style={{ '--rte-height': `${height}px` } as React.CSSProperties}
    >
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={FORMATS}
        placeholder={placeholder}
      />
    </div>
  );
};

export default RichTextEditor;
