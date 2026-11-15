import { useSelector } from 'react-redux';
import { resolveAssetUrl } from '../../services/resolveAssetUrl';

/**
 * The company logo on a pad head.
 *
 * The image belongs to the company -- it is uploaded once on the Company screen
 * and every branch prints that same mark. What a branch decides, under Branch
 * Setup -> Print Setup -> Pad Logo, is whether the mark is printed at all, which
 * side of the head it takes, how large it is and how far it sits from the edges.
 * Those answers are branch metas, saved with the rest of the branch.
 *
 * ⚠️ ONE RULE LIVES HERE RATHER THAN IN THE TWO HEAD COMPONENTS: a pad that is
 * not drawn by the software gets no logo. Pre-printed stationery already carries
 * the mark, and the Custom Image Pad is itself a letterhead; printing a logo on
 * top of either would put it on the paper twice or in the wrong place.
 */
export type PadLogoPosition = 'right' | 'left' | 'top';

export type PadLogoConfig = {
  /** The resolved URL, never the stored path. */
  src: string;
  alt: string;
  position: PadLogoPosition;
  /** The box the mark is drawn in, in CSS px -- the same unit the margins use. */
  width: number;
  height: number;
  /** Distance from the top of the pad head, in px. */
  marginTop: number;
  /** Distance from the right edge -- read only when the logo sits on the right. */
  marginRight: number;
  /** Distance from the left edge -- read only when the logo sits on the left. */
  marginLeft: number;
};

export const PAD_LOGO_DEFAULT_WIDTH = 96;
export const PAD_LOGO_DEFAULT_HEIGHT = 56;
export const PAD_LOGO_DEFAULT_MARGIN = 8;
export const PAD_LOGO_MIN_WIDTH = 8;
export const PAD_LOGO_MAX_WIDTH = 600;
export const PAD_LOGO_MIN_HEIGHT = 8;
export const PAD_LOGO_MAX_HEIGHT = 400;
export const PAD_LOGO_MAX_MARGIN = 400;
/**
 * Margins may go below zero: a negative margin pulls the logo past the edge it
 * is measured from -- up into the top of the page, or out towards the paper's
 * side -- for a mark that must sit tighter than the pad head allows.
 */
export const PAD_LOGO_MIN_MARGIN = -400;

const clamp = (value: unknown, fallback: number, min: number, max: number): number => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return fallback;

  return Math.min(max, Math.max(min, parsed));
};

export const padLogoWidth = (value: unknown): number =>
  clamp(value, PAD_LOGO_DEFAULT_WIDTH, PAD_LOGO_MIN_WIDTH, PAD_LOGO_MAX_WIDTH);

export const padLogoHeight = (value: unknown): number =>
  clamp(value, PAD_LOGO_DEFAULT_HEIGHT, PAD_LOGO_MIN_HEIGHT, PAD_LOGO_MAX_HEIGHT);

export const padLogoMargin = (value: unknown): number =>
  clamp(value, PAD_LOGO_DEFAULT_MARGIN, PAD_LOGO_MIN_MARGIN, PAD_LOGO_MAX_MARGIN);

/** Anything a saved meta may hold, read as one of the three places. */
export const normalizePadLogoPosition = (value: unknown): PadLogoPosition => {
  const text = String(value ?? '').toLowerCase();

  if (text === 'left' || text === 'top') return text;

  return 'right';
};

export const padLogoIsSide = (config: PadLogoConfig): boolean => config.position !== 'top';

const isFlagOn = (value: unknown): boolean =>
  value === true || value === 1 || value === '1' || value === 'true';

/**
 * The pad logo the logged-in branch prints, or null when it prints none.
 *
 * Read from the session settings rather than from the branch a report is about,
 * the same way the pad heading (`pad_heading_print`) has always been read: a
 * head-office user printing another branch's report gets their own branch's pad
 * arrangement.
 */
export const usePadLogo = (): PadLogoConfig | null => {
  const settings = useSelector((state: any) => state.settings?.data);
  const currentBranch = useSelector((state: any) => state.branchList?.currentBranch);
  const branch = settings?.branch;

  if (!branch || !isFlagOn(branch.pad_logo_enabled)) return null;

  // Stationery that already carries the mark, or an uploaded letterhead, draws
  // no logo at all. See the note at the top of this file.
  if (branch.pad_print_mode === 'preprinted') return null;
  if (Number(branch.pad_heading_print) === 3) return null;

  const logoPath =
    settings?.company?.company_logo ||
    currentBranch?.company?.company_logo ||
    branch?.company?.company_logo ||
    '';

  if (!logoPath) return null;

  return {
    src: resolveAssetUrl(logoPath, settings?.env),
    alt:
      settings?.company?.name ||
      currentBranch?.company?.name ||
      branch?.name ||
      'Company logo',
    position: normalizePadLogoPosition(branch.pad_logo_position),
    width: padLogoWidth(branch.pad_logo_width),
    height: padLogoHeight(branch.pad_logo_height),
    marginTop: padLogoMargin(branch.pad_logo_margin_top),
    marginRight: padLogoMargin(branch.pad_logo_margin_right),
    marginLeft: padLogoMargin(branch.pad_logo_margin_left),
  };
};
