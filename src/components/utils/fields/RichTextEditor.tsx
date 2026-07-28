import React, { useMemo } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';

/**
 * Quill writes alignment as a CSS class (ql-align-center) by default, and the
 * PDF renderer only reads inline styles — a centred line would come out left
 * aligned on the printed page. Registering the style attributors makes Quill
 * emit `style="text-align:center"` instead, which survives the trip.
 */
const AlignStyle = Quill.import('attributors/style/align');
Quill.register(AlignStyle, true);

/**
 * Deliberately short: these are the marks dompdf renders faithfully. Offering
 * colours, fonts or tables would let someone author a block that looks right
 * here and wrong on paper.
 */
const TOOLBAR = [
  ['bold', 'italic', 'underline'],
  [{ align: '' }, { align: 'center' }, { align: 'right' }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['clean'],
];

const FORMATS = ['bold', 'italic', 'underline', 'align', 'list'];

type Props = {
  value: string;
  onChange: (html: string) => void;
  /** Rows of visible space, roughly. */
  height?: number;
  placeholder?: string;
};

const RichTextEditor: React.FC<Props> = ({
  value,
  onChange,
  height = 140,
  placeholder,
}) => {
  const modules = useMemo(() => ({ toolbar: TOOLBAR }), []);

  return (
    // Kept on a white sheet even in dark mode: what is being edited here is a
    // block that prints on paper, so it should be composed against paper.
    <div className="rounded border border-slate-300 bg-white dark:border-gray-600">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={FORMATS}
        placeholder={placeholder}
        style={{ height, marginBottom: 42 }}
      />
    </div>
  );
};

export default RichTextEditor;
