import HelmetTitle from '../../../utils/others/HelmetTitle';
import TransferList from '../../warehouse-transfer/TransferList';

/**
 * The issue vouchers, on a page of their own.
 *
 * The list used to sit under the Branch Issue form, which was convenient while
 * there were four challans and unworkable once there are four thousand: every
 * visit to the entry form paid for a page of history nobody had asked to see.
 * Splitting them lets each answer one question -- the form raises a challan,
 * this reads them back.
 *
 * TransferList is rendered as it stands rather than copied, so the compare
 * panel, the challan print and the receive action all keep working and keep
 * being fixed in one place. Its refreshKey exists for the form that used to
 * host it; nothing here changes the data, so it is left at its default.
 */
const BranchTransferListReport = () => (
  <div>
    <HelmetTitle title="Transfer List" />
    <TransferList />
  </div>
);

export default BranchTransferListReport;
