import httpService from '../../services/httpService';
import { API_ADMIN_TUTORIAL_VIDEOS_URL } from '../../services/apiRoutes';

export type TutorialVideo = {
  id: number;
  /**
   * The screen this row belongs to: the route it sits at, or an explicit key
   * where one route renders several forms. Read-only here -- the source is
   * pinned to it.
   */
  screen_key: string;
  group_name: string;
  title: string;
  /** Where the row was discovered. Null on rows that came with the seed. */
  route_path: string | null;
  /** 1 when the row registered itself, 0 when it was seeded. */
  is_auto: number;
  /**
   * One recording per platform, and either may be empty.
   *
   * The web app and the Android app walk through the same job differently, so a
   * single link could only ever be right for one of them. A screen with a web
   * link and no mobile one offers the video on the web and nothing in the app.
   */
  web_url: string | null;
  mobile_url: string | null;
  sort_order: number;
  status: number;
};

/** Only the columns the operator owns; the rest describe the screen. */
export type TutorialVideoEdit = {
  id: number;
  web_url: string | null;
  mobile_url: string | null;
  status: number;
};

// Plain httpService calls, like the inventory-system screen: the page owns its
// own state, so there is no reducer to register.

export const fetchTutorialVideos = async (): Promise<TutorialVideo[]> => {
  const response = await httpService.get(API_ADMIN_TUTORIAL_VIDEOS_URL);
  const rows = response?.data?.data?.data?.tutorial_videos;
  return Array.isArray(rows) ? rows : [];
};

/**
 * Saves the whole list in one request.
 *
 * The screen is a table of URL boxes rather than a form per row, so sending
 * them together is both fewer round trips and one transaction on the server.
 */
export const saveTutorialVideos = (videos: TutorialVideoEdit[]) =>
  httpService.put(API_ADMIN_TUTORIAL_VIDEOS_URL, { videos });

export type NewTutorialVideo = {
  screen_key: string;
  title: string;
  group_name?: string;
  web_url?: string | null;
  mobile_url?: string | null;
};

/**
 * Adds a screen by hand.
 *
 * Most arrive on their own the first time they are opened; this is for the
 * few that render no HelmetTitle and so never announce themselves, and for
 * getting a row ready before its screen has shipped.
 */
export const createTutorialVideo = (payload: NewTutorialVideo) =>
  httpService.post(API_ADMIN_TUTORIAL_VIDEOS_URL, payload);

/**
 * Corrects one row's own details.
 *
 * Distinct from saveTutorialVideos, which writes the URL boxes of the whole
 * table; this is the one that can change what a row is -- its name, heading and
 * the key it answers to.
 */
export const updateTutorialVideo = (id: number, payload: NewTutorialVideo) =>
  httpService.put(`${API_ADMIN_TUTORIAL_VIDEOS_URL}/${id}`, payload);

export const deleteTutorialVideo = (id: number) =>
  httpService.delete(`${API_ADMIN_TUTORIAL_VIDEOS_URL}/${id}`);
