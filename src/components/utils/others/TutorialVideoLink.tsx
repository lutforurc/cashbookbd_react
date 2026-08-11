import React from 'react';
import { useSelector } from 'react-redux';
import { FaYoutube } from 'react-icons/fa';

/** The one walkthrough that covers all four cash and bank entry screens. */
export const CASH_BANK_ENTRY_VIDEO =
  'https://www.youtube.com/watch?v=Mzpdq5OX478';

interface TutorialVideoLinkProps {
  /** Full YouTube watch URL for this screen's walkthrough. */
  href: string;
  /** Names the screen in the tooltip and for screen readers. */
  label: string;
}

/**
 * The walkthrough link that sits at the top of a screen.
 *
 * Shown only where the branch turned "Need Demo Tutorial?" on — a team that
 * already knows its way around switches the links off, and every video link in
 * the app reads that one flag.
 *
 * It renders the icon alone, with no row of its own: HelmetTitle already prints
 * a centred heading, and the caller sits the two in one flex row so the icon
 * lands to the right of the title rather than on a line beneath it.
 *
 * The markup is the one BranchList, CompanyList and CustomerSupplier already
 * hold inline. Those copies predate this component and still work, so they were
 * left where they are.
 */
const TutorialVideoLink: React.FC<TutorialVideoLinkProps> = ({ href, label }) => {
  const settings = useSelector((s: any) => s.settings);

  if (String(settings?.data?.branch?.need_demo_tutorial) !== '1') return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Watch ${label} video`}
      title={`Watch ${label} video`}
      className="inline-flex h-8 w-8 items-center justify-center text-red-600 transition dark:text-red-400"
    >
      <FaYoutube className="text-base" />
    </a>
  );
};

export default TutorialVideoLink;
