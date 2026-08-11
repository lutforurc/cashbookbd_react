import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FaYoutube } from 'react-icons/fa';

import httpService from '../../services/httpService';
import { API_ADMIN_TUTORIAL_VIDEOS_URL } from '../../services/apiRoutes';

interface TutorialVideoLinkProps {
  /** Row key in tutorial_videos. HelmetTitle derives it from the route. */
  screen: string;
  /** Screen name, used for the tooltip and when registering a new row. */
  title?: string;
}

/**
 * The route a screen sits at, reduced to something stable enough to key on.
 *
 * Record ids are folded to `:id` so an edit form is one row rather than one per
 * record it has ever opened.
 */
export const deriveScreenKey = (pathname: string): string => {
  const path = (pathname || '/').replace(/\/+$/, '') || '/';

  return path
    .split('/')
    .map((segment) => (/^\d+$/.test(segment) ? ':id' : segment))
    .join('/');
};

/** First path segment, which is close enough to the module a screen belongs to. */
const deriveGroup = (screenKey: string): string =>
  screenKey.split('/').filter(Boolean)[0] || 'other';

/** "cash-payment.trading" -> "cash payment trading" */
const humanise = (screen: string) =>
  screen.replace(/^\//, '').replace(/[./-]/g, ' ').trim();

/**
 * Screens this session has already offered to the server.
 *
 * Module scope rather than component state: the same screen is mounted again on
 * every visit, and one registration per screen per session is plenty.
 */
const registered = new Set<string>();

/**
 * The walkthrough link beside a screen's title.
 *
 * Three things decide whether it appears: the branch asked for walkthroughs
 * (the per-branch need_demo_tutorial switch), a video has been recorded for
 * this screen, and the screen is on file at all. The URL rides in on the
 * settings payload, which omits rows without one, so a screen with no video
 * simply finds nothing here.
 *
 * A platform operator opening a screen the table has never seen registers it,
 * which is how the list keeps up with the app without a developer adding a row
 * per screen. Nobody else can write to that table, and the new row arrives
 * empty, so nothing changes for anyone until an operator pastes in a URL.
 */
const TutorialVideoLink: React.FC<TutorialVideoLinkProps> = ({ screen, title }) => {
  const settings = useSelector((s: any) => s.settings);

  const data = settings?.data;
  const href = data?.tutorial_videos?.[screen];
  const isOperator = Boolean(data?.is_platform_admin);
  const knownKeys: string[] = data?.tutorial_video_keys || [];

  useEffect(() => {
    if (!isOperator || !screen || registered.has(screen)) return;
    // The keys list only reaches operators, so an empty one here means the
    // settings payload has not landed yet rather than "nothing is on file".
    if (!knownKeys.length || knownKeys.includes(screen)) return;

    // Held back a moment so only a screen actually being looked at registers.
    // A screen passed through on the way somewhere else unmounts first and the
    // timer is cleared, which keeps redirects and stale renders out of the list.
    const timer = window.setTimeout(() => {
      registered.add(screen);

      httpService
        .post(`${API_ADMIN_TUTORIAL_VIDEOS_URL}/register`, {
          screen_key: screen,
          title: title || humanise(screen),
          route_path: screen,
          group_name: deriveGroup(screen),
        })
        // Silent on purpose: discovery is bookkeeping the operator did not ask
        // for, and a failed one costs nothing -- the next visit tries again.
        .catch(() => registered.delete(screen));
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [isOperator, screen, title, knownKeys.length]);

  if (String(data?.branch?.need_demo_tutorial) !== '1') return null;
  if (!href) return null;

  const name = title || humanise(screen);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Watch ${name} video`}
      title={`Watch ${name} video`}
      className="inline-flex h-8 w-8 items-center justify-center text-red-600 transition dark:text-red-400"
    >
      <FaYoutube className="text-base" />
    </a>
  );
};

export default TutorialVideoLink;
