import { API_REMOTE_URL } from './apiRoutes';

/**
 * Turns a stored upload path into a URL the browser can load.
 *
 * The API stores these paths already prefixed with `public/` — see
 * CompanyController::uploadCompanyLogo, which returns
 * `public/images/company_image/<file>` — because production serves the Laravel
 * project root rather than its public/ directory. Stripping that prefix, as
 * the three copies of this helper used to, produced a 404 for every logo.
 *
 * Absolute URLs and blob/data URLs are passed through untouched, so a local
 * file preview from URL.createObjectURL keeps working.
 */
export const resolveAssetUrl = (path?: string): string => {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;

  return `${API_REMOTE_URL}/${path.replace(/^\/+/, '')}`;
};

export default resolveAssetUrl;
