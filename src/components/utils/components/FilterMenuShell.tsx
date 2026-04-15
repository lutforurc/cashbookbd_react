import React from 'react';
import { FiFilter } from 'react-icons/fi';

interface FilterMenuShellProps {
  enabled: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  summaryText?: string;
  menuWidthClassName?: string;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  inlineClassName?: string;
}

const FilterMenuShell = ({
  enabled,
  isOpen,
  onToggle,
  children,
  summaryText = 'Use the filter',
  menuWidthClassName = 'w-[min(92vw,320px)]',
  containerRef,
  inlineClassName = 'grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-4',
}: FilterMenuShellProps) => {
  if (!enabled) {
    return (
      <div className="min-w-[320px] flex-1">
        <div className={inlineClassName}>{children}</div>
      </div>
    );
  }

  return (
    <>
      <div className="relative shrink-0" ref={containerRef}>
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex h-10 w-10 items-center justify-center rounded border text-sm transition ${
            isOpen
              ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300'
              : 'border-blue-500 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-slate-700'
          }`}
          title="Open filters"
          aria-label="Open filters"
        >
          <FiFilter size={16} />
        </button>

        {isOpen && (
          <div
            className={`absolute left-0 top-full z-[1000] mt-2 rounded-md border border-slate-300 bg-white p-4 shadow-2xl dark:border-slate-600 dark:bg-slate-800 ${menuWidthClassName}`}
          >
            <div className="space-y-3">{children}</div>
          </div>
        )}
      </div>

      <div className="hidden min-w-[180px] flex-1 text-sm text-slate-600 md:block dark:text-slate-300">
        {summaryText}
      </div>
    </>
  );
};

export default FilterMenuShell;
