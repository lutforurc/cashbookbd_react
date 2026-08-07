import { API_REMOTE_URL } from './apiRoutes';

/**
 * Turns a stored upload path into a URL the browser can load.
 *
 * The API stores these paths inconsistently — CompanyController saves
 * `company_image/<file>` while BranchController saves
 * `public/images/company_image/<file>` — so the stored prefix cannot be
 * trusted. Instead the URL is built the way ImagePopup builds voucher-image
 * URLs: strip any `public/` prefix, then add it back unless the API runs
 * locally. Production serves the Laravel project root, so the browser needs
 * `public/` in the path; `php artisan serve` serves public/ itself as the web
 * root, so there it must be absent. Pass `state.settings?.data?.env` as
 * `environment`.
 *
 * Absolute URLs and blob/data URLs are passed through untouched, so a local
 * file preview from URL.createObjectURL keeps working.
 */
export const resolveAssetUrl = (path?: string, environment?: string): string => {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;

  const cleanPath = path.replace(/^\/+/, '').replace(/^public\//, '');
  const prefix = environment === 'local' ? '' : 'public/';

  return `${API_REMOTE_URL}/${prefix}${cleanPath}`;
};

export default resolveAssetUrl;
