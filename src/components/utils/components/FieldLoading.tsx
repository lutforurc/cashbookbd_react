import { FIELD_BASE } from '../../../theme/fieldStyles';

/**
 * The empty box a filter cell shows while its options are still on the way.
 *
 * ⚠️ Not the app's `Loader`. That one is `fixed w-full h-full z-999` -- a
 * full-screen overlay. Three of these sit side by side in one filter row, so
 * using it here stacked three overlays over the screen and hid the very
 * dropdowns that had already arrived.
 *
 * It borrows FIELD_BASE rather than naming a height: the row must not jump when
 * the dropdown replaces it, and FIELD_BASE is the one place a field's height,
 * border and surface are written down.
 */
const FieldLoading = ({ className = 'w-full' }: { className?: string }) => (
  <div className={`${FIELD_BASE} ${className} flex items-center justify-center`}>
    <span
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500/30 border-t-blue-500"
      role="status"
      aria-label="Loading"
    />
  </div>
);

export default FieldLoading;
