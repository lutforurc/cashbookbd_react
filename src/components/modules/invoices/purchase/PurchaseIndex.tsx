import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import TradingBusinessPurchase from './TradingBusinessPurchase';
import ConstructionBusinessPurchase from './ConstructionBusinessPurchase';
import { useEffect } from 'react';
import { userCurrentBranch } from '../../branch/branchSlice';
import Loader from '../../../../common/Loader';
import ElectronicsBusinessPurchase from './ElectronicsBusinessPurchase';
import TilesBusinessPurchase from './TilesBusinessPurchase';
import { branchInvoiceVariant } from '../../../utils/userFeatureSettings';
import InvoiceWorkflowSwitch from '../shared/InvoiceWorkflowSwitch';
import {
  INVOICE_WORKFLOW_OWN,
  INVOICE_WORKFLOW_TILES,
  isInvoiceWorkflow,
  ownInvoiceWorkflow,
  pickInvoiceForm,
  type InvoiceWorkflow,
} from '../shared/invoiceWorkflow';

const PurchaseIndex = () => {
  const dispatch = useDispatch();
  const currentBranch = useSelector(
    (state: any) => state.branchList.currentBranch,
  );
  const settings = useSelector((state: any) => state.settings);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Branch Setup -> Forms Setup: the branch's own choice, when it has made
  // one, opens before anything the business type would decide. An empty
  // preference is Automatic and falls through to the logic below, unchanged.
  const preferred = branchInvoiceVariant(settings, 'invoice_variant_purchase');

  // The workflow this visit is for -- the switch's query first, then a report's
  // Edit link. pickInvoiceForm checks it against the two known words and
  // against what this branch is set up for. Same rules as Sales Invoice.
  const routerState = location.state as
    | { invoiceWorkflow?: string; voucherAutoEdit?: boolean }
    | null;
  const requestedWorkflow =
    searchParams.get('workflow') || routerState?.invoiceWorkflow || '';
  const pick = pickInvoiceForm({
    preferred,
    requested: requestedWorkflow,
    // An Edit link whose row named no workflow: an invoice older than it.
    legacyEdit: routerState?.voucherAutoEdit === true && !isInvoiceWorkflow(requestedWorkflow),
    ownWorkflow: ownInvoiceWorkflow(
      preferred,
      currentBranch?.is_tiles_and_sanitary,
      currentBranch?.inventory_system_id,
    ),
    isTilesAndSanitary: currentBranch?.is_tiles_and_sanitary,
  });

  // A legacy invoice kept on the branch's own form in Both mode: pin it in the
  // query, because the edit screen clears the router state once its search
  // has run, and without the pin this screen would swap forms mid-edit.
  const pinOwnForm =
    preferred === 'both' && pick.form === 'own' && requestedWorkflow !== INVOICE_WORKFLOW_OWN;

  useEffect(() => {
    if (!currentBranch?.inventory_system_id) {
      dispatch(userCurrentBranch());
    }
  }, [dispatch, currentBranch?.inventory_system_id]);

  useEffect(() => {
    if (!pinOwnForm) return;
    const params = new URLSearchParams(searchParams);
    params.set('workflow', INVOICE_WORKFLOW_OWN);
    navigate(
      { pathname: location.pathname, search: params.toString() },
      { replace: true, state: location.state },
    );
  }, [pinOwnForm, searchParams, navigate, location.pathname, location.state]);

  if (!currentBranch?.inventory_system_id) {
    return <Loader />;
  }

  const chooseWorkflow = (next: InvoiceWorkflow) => {
    const params = new URLSearchParams(searchParams);
    params.set('workflow', next);
    // The query is the durable copy; the one-shot edit state goes, so switching
    // never carries the voucher that was open onto the other form.
    navigate(
      { pathname: location.pathname, search: params.toString() },
      { replace: true, state: null },
    );
  };

  if (pick.form !== 'own') {
    const form = pick.form === INVOICE_WORKFLOW_TILES ? <TilesBusinessPurchase /> : <TradingBusinessPurchase />;

    // "Both" is the only mode that shows the switch. Outside it, an Edit link
    // that names the other of the two forms opens that form on its own: the
    // stored invoice is the truth about which screen can edit it.
    return pick.showSwitch ? (
      <>
        <InvoiceWorkflowSwitch value={pick.form} onChange={chooseWorkflow} />
        {form}
      </>
    ) : (
      form
    );
  }

  if (preferred === 'tiles') return <TilesBusinessPurchase />;
  if (preferred === 'electronics') return <ElectronicsBusinessPurchase />;
  if (preferred === 'construction') return <ConstructionBusinessPurchase />;
  if (preferred === 'trading') return <TradingBusinessPurchase />;

  // ⚠️ Before the map, and by the branch flag rather than the system id: a
  // Tiles and Sanitary branch runs inventory_system_id 4, which is Trading's
  // row, so without this check it would fall straight back to the screen it
  // uses today and never see its own four figures.
  if (currentBranch?.is_tiles_and_sanitary) {
    return <TilesBusinessPurchase />;
  }

  const components: { [key: number]: JSX.Element } = {
    2: <ElectronicsBusinessPurchase />,
    3: <ConstructionBusinessPurchase />,
    4: <TradingBusinessPurchase />,
  };

  return (
    components[currentBranch?.inventory_system_id] || (
      <ConstructionBusinessPurchase />
    )
  );
};

export default PurchaseIndex;
