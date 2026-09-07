import { SalesSummaryUnit } from "./salesSummarySlice";

/**
 * How a buyer's flat is written, on screen and on paper alike.
 *
 * Kept out of the screen component so the print sheet can say it the same way.
 * Two copies of these two lines is how a report and its printout drift: the
 * screen gains a separator or drops the parking number and the paper does not,
 * and the difference is only found once a customer is holding both.
 */

/**
 * "Sherpur, Bogura → Baganbari → Shantipark Tower"
 *
 * An arrow rather than a chevron, as the cash book names its bank accounts: the
 * three parts narrow from the town to the project to the building, and an arrow
 * is read as that journey where a lone "›" reads as punctuation nobody placed.
 */
export const placeOf = (unit: SalesSummaryUnit) =>
  [unit.area_name, unit.project_name, unit.building_name].filter(Boolean).join(" → ");

/**
 * "4th Floor · Unit# 4/A"
 *
 * The unit and parking numbers are printed as they are stored -- they already
 * read "Unit# 4/A", and labelling them again gave "Unit# Unit# 4/A".
 */
export const unitOf = (unit: SalesSummaryUnit) =>
  [unit.floor_name, unit.unit_no, unit.parking_no].filter(Boolean).join(" · ");
