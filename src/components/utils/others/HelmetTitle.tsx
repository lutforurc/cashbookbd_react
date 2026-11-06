import React from 'react';
import { useLocation } from 'react-router-dom';
import TutorialVideoLink, { deriveScreenKey } from './TutorialVideoLink';
import HelpButton from '../../help/HelpButton';
import { helpTopicForPath } from '../../help/helpTopicForPath';

interface HelmetParam {
  title: string | null;
  /**
   * Anything that belongs beside the heading -- a screen's own switch, say.
   * It rides in the same centred row, immediately to the right of the text,
   * rather than among the toolbar fields below where its caption reads as if
   * it labelled the neighbouring field.
   */
  children?: React.ReactNode;
  /**
   * Overrides the route-derived key for the walkthrough link.
   *
   * Needed only where one route renders several different forms -- a cash
   * payment is a trading, general or head-office screen depending on the
   * branch, and each earns its own recording. Everywhere else the route is
   * the screen, and leaving this off is right.
   */
  screen?: string;
  /**
   * Names the help topic when the route alone cannot.
   *
   * A tabbed screen (Assets) holds several topics on one route; it passes the
   * one its open tab belongs to. Left off, the topic is read from the route.
   */
  helpTopic?: string;
}

/**
 * A screen's heading, its browser tab title, and its walkthrough link.
 *
 * The link lives here rather than in each screen because every screen already
 * renders this: adding one to a new form is nothing to remember, and a screen
 * the video list has never seen registers itself the first time a platform
 * operator opens it. See TutorialVideoLink.
 */
const HelmetTitle: React.FC<HelmetParam> = ({ title = '', screen, children, helpTopic }) => {
  // useLocation, not window.location. The browser URL changes the moment a
  // navigation starts, so a screen that navigates away -- a form redirecting to
  // its list after a save -- could render once more and read the path it was
  // leaving for. The router hands the path over with the element swap instead,
  // which is what registered "Edit Branch" against the branch list route once.
  const { pathname } = useLocation();
  const screenKey = screen || deriveScreenKey(pathname);
  const topic = helpTopic ?? helpTopicForPath(pathname);

  return (
    <div>

      {title !== 'Dashboard' && title !== 'Construction Dashboard' &&
        (<div className="flex items-center justify-center gap-2">
          <h1 className="text-xl text-black-2 dark:text-[rgb(var(--c-text))] font-bold">
            {title}
          </h1>
          <TutorialVideoLink screen={screenKey} title={String(title || '')} />
          {/* One help button for every screen, in the title row beside the
              video link. The dialog it opens is the layout's single modal. */}
          {topic ? <HelpButton topic={topic} /> : null}
          {children}
        </div>)
      }

      <span>
        <title>{title}</title>
      </span>
    </div>
  );
};

export default HelmetTitle;
