import React from 'react';
import { useSelector } from 'react-redux';

interface ReportFooterProps {
  /** Optional font size (px) to match the surrounding report text. */
  fontSize?: number;
  /** Extra classes for the wrapper. */
  className?: string;
}

/**
 * Shared footer shown at the bottom of every report/print document.
 * Displays the software company's name and mobile number, which are
 * configurable from Settings → Software Information and delivered via
 * the `settings.software` payload (see SettingsController::getSettings).
 */
const ReportFooter: React.FC<ReportFooterProps> = ({ fontSize, className }) => {
  const software = useSelector((state: any) => state.settings?.data?.software);

  const name = software?.name?.trim();
  const mobile = software?.mobile?.trim();

  // Nothing configured yet → render nothing.
  if (!name && !mobile) {
    return null;
  }

  const style = fontSize ? { fontSize } : undefined;

  return (
    <>
      {/*
        On print, pin the footer to the bottom of the page instead of letting it
        sit right below the content. `position: fixed` repeats it at the bottom
        of every printed page. On screen it stays in normal flow.
      */}
      <style>{`
        @media print {
          .report-software-footer {
            position: fixed;
            bottom: 6px;
            left: 0;
            right: 0;
            margin-top: 0;
            background: #fff;
          }
        }
      `}</style>
      <div
        style={style}
        className={
          'report-software-footer mt-2 border-t border-gray-400 pt-1 text-center text-[10px] text-gray-600 ' +
          (className || '')
        }
      >
        <span>Software Developed by: </span>
        {name && <span className="font-semibold">{name}</span>}
        {name && mobile && <span> | </span>}
        {mobile && <span>Mobile: {mobile}</span>}
      </div>
    </>
  );
};

export default ReportFooter;
