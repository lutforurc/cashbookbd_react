import HelmetTitle from '../../../utils/others/HelmetTitle';
import ReceiveList from '../../warehouse-received/ReceiveList';

/**
 * The receive vouchers, on a page of their own -- the mirror of the Transfer
 * List report, and split from the Branch Receive form for the same reason.
 *
 * ReceiveList is rendered as it stands rather than copied, so the compare panel
 * and the challan print keep working and keep being fixed in one place.
 */
const BranchReceiveListReport = () => (
  <div>
    <HelmetTitle title="Receive List" />
    <ReceiveList />
  </div>
);

export default BranchReceiveListReport;
