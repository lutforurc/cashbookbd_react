import React from 'react';
import { useSelector } from 'react-redux';

interface ReportFooterProps {
  /** Optional font size (px) to match the surrounding report text. */
  fontSize?: number;
  /** Extra classes for the wrapper. */
  className?: string;
  /**
   * Inline mode: render just the text (no border / centering / margin) so it can
   * sit on the same row as the page number. Used by prints that place the footer
   * on one line: software info on the left, "Page X of Y" on the right.
   */
  inline?: boolean;
}

/**
 * Shared footer shown at the bottom of every report/print document.
 * Displays the software company's name and mobile number, which are
 * configurable from Settings → Software Information and delivered via
 * the `settings.software` payload (see SettingsController::getSettings).
 */
const ReportFooter: React.FC<ReportFooterProps> = ({ fontSize, className, inline }) => {
  const software = useSelector((state: any) => state.settings?.data?.software);

  const name = software?.name?.trim();
  const mobile = software?.mobile?.trim();

  // Nothing configured yet → render nothing.
  if (!name && !mobile) {
    return null;
  }

  const style = fontSize ? { fontSize } : undefined;

  const content = (
    <>
      <span>Software Developed by: </span>
      {name && <span className="font-semibold">{name}</span>}
      {name && mobile && <span> | </span>}
      {mobile && <span>Mobile: {mobile}</span>}
    </>
  );

  // Inline: bare text, no wrapper styling — caller controls the row layout.
  if (inline) {
    return (
      <span style={style} className={className}>
        {content}
      </span>
    );
  }

  // Block (default): its own centered, bordered footer line.
  return (
    <div
      style={style}
      className={
        'report-software-footer mt-2 border-t border-gray-400 pt-1 text-center text-[10px] text-gray-600 ' +
        (className || '')
      }
    >
      {content}
    </div>
  );
};

export default ReportFooter;
