import type { ReactNode } from 'react';

/**
 * The mobile app's navigation-drawer glyphs, so the web sidebar shows one icon
 * per menu rather than two ideas of one.
 *
 * Each figure is the mobile ImageVector's own path, stroked with currentColor
 * and sized in `em`, like the react-icons it replaces.
 *
 * ⚠️ Every glyph carries its own square viewBox, cropped to its own artwork and
 * cut to 1.2x that artwork's longest side. The mobile figures were drawn loose
 * inside a fixed 24-unit box, so a fixed viewBox left some of them filling a
 * third of the icon while the Feather glyphs beside them (the Financial
 * Statement pie, say) fill about twenty of twenty-four units. Cropping to the
 * content puts every menu icon on that same footing: same drawn size, and the
 * stroke lands at the same weight, at whatever size the sidebar renders.
 */
type GlyphProps = { className?: string };

const MenuGlyph = ({
  className,
  viewBox,
  children,
}: GlyphProps & { viewBox: string; children: ReactNode }) => (
  <svg
    className={className}
    width="1em"
    height="1em"
    viewBox={viewBox}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {children}
  </svg>
);

/** A shopfront with an awning — the mobile app's Reseller Dashboard. */
export const ResellerMenuIcon = ({ className }: GlyphProps) => (
  <MenuGlyph className={className} viewBox="0.6 1.6 22.8 22.8">
    <path
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.3 5.5H19.7Q21.5 5.5 21.5 7.3V8.4Q21.5 9.8 20.1 9.8H3.9Q2.5 9.8 2.5 8.4V7.3Q2.5 5.5 4.3 5.5ZM4.2 9.8V19.4Q4.2 20.5 5.3 20.5H18.7Q19.8 20.5 19.8 19.4V9.8M10 20.5V14.6Q10 13.6 11 13.6H13Q14 13.6 14 14.6V20.5"
    />
  </MenuGlyph>
);

/** Two documents with opposing arrows — the mobile app's Transaction. */
export const TransactionMenuIcon = ({ className }: GlyphProps) => (
  <MenuGlyph className={className} viewBox="1.8 1.3 20.4 20.4">
    <path
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.5 8V5Q8.5 3 10.5 3H18Q20 3 20 5V13Q20 15 18 15H15.5M6 8H14Q16 8 16 10V18Q16 20 14 20H6Q4 20 4 18V10Q4 8 6 8ZM6.6 12.4H12.6M10.9 10.8L12.6 12.4L10.9 14M13.4 16.4H7.4M9.1 14.8L7.4 16.4L9.1 18"
    />
  </MenuGlyph>
);

/** A receipt with a torn bottom and line items — the mobile app's Invoice. */
export const InvoiceMenuIcon = ({ className }: GlyphProps) => (
  <MenuGlyph className={className} viewBox="1.9 1.3 20.2 20.2">
    <path
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 3H17Q18.5 3 18.5 4.5V19.8L15.25 18.3L12 19.8L8.75 18.3L5.5 19.8V4.5Q5.5 3 7 3ZM8.5 7.6H15.5M8.5 10.6H15.5M8.5 13.6H12.5"
    />
  </MenuGlyph>
);

/** Two branch blocks joined by a two-headed arrow — Branch Transfer. */
export const BranchTransferMenuIcon = ({ className }: GlyphProps) => (
  <MenuGlyph className={className} viewBox="0.6 0.6 22.8 22.8">
    <path
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 8H7Q8.5 8 8.5 9.5V14.5Q8.5 16 7 16H4Q2.5 16 2.5 14.5V9.5Q2.5 8 4 8ZM17 8H20Q21.5 8 21.5 9.5V14.5Q21.5 16 20 16H17Q15.5 16 15.5 14.5V9.5Q15.5 8 17 8ZM9.6 12H14.4M11.3 10.3L9.6 12L11.3 13.7M12.7 10.3L14.4 12L12.7 13.7"
    />
  </MenuGlyph>
);

/** A document with a bar chart and a magnifier — the mobile app's Reports. */
export const ReportsMenuIcon = ({ className }: GlyphProps) => (
  <MenuGlyph className={className} viewBox="0.6 0.1 23.4 23.4">
    <path
      stroke="currentColor"
      strokeWidth="1.95"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 3H10.5Q12.5 3 12.5 5V18.5Q12.5 20.5 10.5 20.5H4.5Q2.5 20.5 2.5 18.5V5Q2.5 3 4.5 3Z"
    />
    <path
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      d="M5.2 17.6V13.6M7.5 17.6V10.6M9.8 17.6V8.2"
    />
    <path
      stroke="currentColor"
      strokeWidth="1.95"
      strokeLinecap="round"
      d="M21.8 14.8a4.6 4.6 0 0 1-9.2 0a4.6 4.6 0 0 1 9.2 0ZM20.45 18.05L22 19.6"
    />
  </MenuGlyph>
);

/** A parcel with a location pin — the mobile app's Product Tracking. */
export const ProductTrackingMenuIcon = ({ className }: GlyphProps) => (
  <MenuGlyph className={className} viewBox="1.8 1.9 21 21">
    <path
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 9H14Q15.5 9 15.5 10.5V19Q15.5 20.5 14 20.5H5Q3.5 20.5 3.5 19V10.5Q3.5 9 5 9ZM3.5 13.6H15.5M21 6.6a2.4 2.4 0 0 1-4.8 0a2.4 2.4 0 0 1 4.8 0ZM16.8 8.2L18.6 10.6L20.4 8.2"
    />
  </MenuGlyph>
);

/** A rosette badge with ribbon tails — the mobile app's Company Scheme. */
export const CompanySchemeMenuIcon = ({ className }: GlyphProps) => (
  <MenuGlyph className={className} viewBox="2.3 2.8 19.4 19.4">
    <path
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.4 8.8a4.4 4.4 0 0 1-8.8 0a4.4 4.4 0 0 1 8.8 0ZM9.5 12.4L8.1 20.6L12 18.4L15.9 20.6L14.5 12.4"
    />
  </MenuGlyph>
);

/** A reception desk with a receptionist and a suitcase — the Hotel menu. */
export const HotelMenuIcon = ({ className }: GlyphProps) => (
  <MenuGlyph className={className} viewBox="1.7 2.9 20.9 20.9">
    <path
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 7.4a2 2 0 0 1 4 0a2 2 0 0 1-4 0ZM5.9 13.6a3.1 3.1 0 0 1 6.2 0M16.8 16.8a1 1 0 0 1 2 0M16 16.8H19.6Q20.8 16.8 20.8 18V20Q20.8 21.2 19.6 21.2H16Q14.8 21.2 14.8 20V18Q14.8 16.8 16 16.8Z"
    />
    <path stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" d="M3.4 14.2H20.6" />
  </MenuGlyph>
);

/** A safe with a dial and feet — the mobile app's Assets. */
export const AssetsMenuIcon = ({ className }: GlyphProps) => (
  <MenuGlyph className={className} viewBox="2.2 2.4 19.7 19.7">
    <path
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 4H18Q20 4 20 6V16Q20 18 18 18H6Q4 18 4 16V6Q4 4 6 4ZM7.5 18V20.4M16.5 18V20.4M13.4 11a2.9 2.9 0 0 1-5.8 0a2.9 2.9 0 0 1 5.8 0ZM16.6 9V13"
    />
  </MenuGlyph>
);

/** An isometric parcel box — the mobile app's Products. */
export const ProductsMenuIcon = ({ className }: GlyphProps) => (
  <MenuGlyph className={className} viewBox="2.4 3.4 19.2 19.2">
    <path
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 9.6L9.6 6H20L14.4 9.6ZM4 9.6H14.4V20H4ZM14.4 9.6L20 6V16.4L14.4 20"
    />
  </MenuGlyph>
);

/** A hard hat — the mobile app's Labour Items. */
export const LabourItemsMenuIcon = ({ className }: GlyphProps) => (
  <MenuGlyph className={className} viewBox="1.4 0.8 21.1 21.1">
    <path
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.6 15Q5.6 7.6 12 7.6Q18.4 7.6 18.4 15"
    />
    <path stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" d="M3.2 15.2H20.8" />
  </MenuGlyph>
);

/** A shield with a tick — the mobile app's Admin. */
export const AdminMenuIcon = ({ className }: GlyphProps) => (
  <MenuGlyph className={className} viewBox="1.3 1.2 21.4 21.4">
    <path
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3L18.8 5.8V11.5Q18.8 17.2 12 20.8Q5.2 17.2 5.2 11.5V5.8ZM9.4 11.6L11.4 13.6L15.2 9.6"
    />
  </MenuGlyph>
);

/** A gear with a sliders panel — the mobile app's VR Settings. */
export const VrSettingsMenuIcon = ({ className }: GlyphProps) => (
  <MenuGlyph className={className} viewBox="0 -0.1 24 24">
    <path
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.3 7.4a3.8 3.8 0 0 1-7.6 0a3.8 3.8 0 0 1 7.6 0ZM19.5 7.4H20.9M18.33 10.23L19.33 11.23M15.5 11.4V12.8M12.67 10.23L11.67 11.23M11.5 7.4H10.1M12.67 4.57L11.67 3.57M15.5 3.4V2M18.33 4.57L19.33 3.57"
    />
    <path
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.8 12H10.2Q13 12 13 14.8V19Q13 21.8 10.2 21.8H4.8Q2 21.8 2 19V14.8Q2 12 4.8 12Z"
    />
    <path stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" d="M3.8 15.7H11.2M3.8 18.5H11.2" />
    <path
      fill="currentColor"
      d="M6.2 15.7a1.6 1.6 0 1 1 3.2 0a1.6 1.6 0 1 1-3.2 0ZM4 18.5a1.6 1.6 0 1 1 3.2 0a1.6 1.6 0 1 1-3.2 0Z"
    />
  </MenuGlyph>
);

/** Two people over a shared shoulder line — the mobile app's HRM. */
export const HrmMenuIcon = ({ className }: GlyphProps) => (
  <MenuGlyph className={className} viewBox="2.2 1.7 19.7 19.7">
    <path
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.7 8.4a2.2 2.2 0 0 1-4.4 0a2.2 2.2 0 0 1 4.4 0ZM17.7 8.4a2.2 2.2 0 0 1-4.4 0a2.2 2.2 0 0 1 4.4 0ZM3.8 16.8a8.2 4.2 0 0 1 16.4 0"
    />
  </MenuGlyph>
);
