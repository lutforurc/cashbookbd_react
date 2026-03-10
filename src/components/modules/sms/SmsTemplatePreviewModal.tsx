import React from 'react';
import { FiX } from 'react-icons/fi';

interface SmsTemplatePreviewModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  content: string;
  title?: string;
}

const SmsTemplatePreviewModal: React.FC<SmsTemplatePreviewModalProps> = ({
  open,
  onClose,
  loading,
  error,
  content,
  title = 'SMS Preview',
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-strokedark">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-slate-300 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {loading ? (
            <div className="rounded-sm border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Preview loading...
            </div>
          ) : error ? (
            <div className="rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-700/50 dark:bg-rose-900/20 dark:text-rose-200">
              {error}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Rendered Message
                </div>
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-700 dark:text-slate-100">
                  {content || 'No preview content returned from API.'}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmsTemplatePreviewModal;
