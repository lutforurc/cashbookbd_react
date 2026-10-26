import { useSelector } from 'react-redux';
import routes from '../../services/appRoutes';
import { branchInvoiceVariant, combinedScreenFor } from '../userFeatureSettings';

/**
 * Which Combined Invoice screen a `combined_number` row opens on.
 *
 * A combined entry is one save writing two vouchers under a shared
 * combined_number, and the reports -- Ledger, Cash Book, Bank Book, the two
 * ledgers -- each carry an Edit button that opens the pair by that number.
 * There are two such screens now: Trading's (one amount) and Tiles and
 * Sanitary's (two money boxes), and the row itself cannot say which branch wrote
 * it. So the branch answers, exactly as it answers every other trade question:
 * by the flag the server sends, never by a business-type id that differs from
 * install to install.
 *
 * One definition rather than the same branch test copied into six report
 * screens, where a seventh would eventually disagree with the six.
 */
export const useCombinedEntryRoute = (): string => {
  const currentBranch = useSelector((s: any) => s.branchList?.currentBranch);
  const settings = useSelector((s: any) => s.settings);

  // Branch Setup -> Invoice Setup: a chosen combined form opens its own screen.
  // Automatic and Not Applicable both resolve by the branch flag -- see
  // combinedScreenFor() -- so the reports' Edit button always opens a real
  // screen and never builds an invalid link. Not Applicable only keeps the
  // entry out of the menu and the search; it does not hide a combined voucher
  // written before it was chosen.
  const screen = combinedScreenFor(
    branchInvoiceVariant(settings, 'invoice_variant_combined'),
    Boolean(currentBranch?.is_tiles_and_sanitary),
  );

  return screen === 'tiles' ? routes.inv_tiles_combined : routes.inv_trading_combined;
};
