import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import SignIn from './pages/Authentication/SignIn';
import ForgotPassword from './pages/Authentication/ForgotPassword';
import PublicRegistration from './pages/Authentication/PublicRegistration';
import PublicRegistrationOtp from './pages/Authentication/PublicRegistrationOtp';
import Calendar from './pages/Calendar';
import FormElements from './pages/Form/FormElements';
import FormLayout from './pages/Form/FormLayout';
import Profile from './pages/Profile';
import Alerts from './pages/UiElements/Alerts';
import Buttons from './pages/UiElements/Buttons';
import DefaultLayout from './layout/DefaultLayout';
import { authCheck } from './features/authReducer';
import { useDispatch, useSelector } from 'react-redux';
import routes from './components/services/appRoutes';
import BranchList from './components/modules/branch/BranchList';
import UserList from './components/modules/user/UserList';
import AddUser from './components/modules/user/AddUser';
import Product from './components/modules/product/Product';
import DateWiseData from './components/modules/reports/datewisedata/DateWiseData';
import AddProduct from './components/modules/product/AddProduct';
import Category from './components/modules/category/Category';
import AddCategory from './components/modules/category/AddCategory';
import EditCategory from './components/modules/category/EditCategory';
import CashBook from './components/modules/reports/cashbook/CashBook';
import Ledger from './components/modules/reports/ledger/Ledger';
import CoaL4 from './components/modules/chartofaccounts/levelfour/CoaL4';
import AddCoaL4 from './components/modules/chartofaccounts/levelfour/AddCoaL4';
import CoaL3 from './components/modules/chartofaccounts/levelthree/CoaL3';
import CoaL2 from './components/modules/chartofaccounts/leveltwo/CoaL2';
import CoaL1 from './components/modules/chartofaccounts/levelone/CoaL1';
import DueList from './components/modules/reports/duelist/DueList';
import ProductStock from './components/modules/reports/productstock/ProductStock';
import CatWiseInOut from './components/modules/reports/catwiseinout/CatWiseInOut';
import EditUser from './components/modules/user/EditUser';
import PurchaseLedger from './components/modules/reports/purchaseledger/PurchaseLedger';
import SalesLedger from './components/modules/reports/salesledger/SalesLedger';
import BankReceived from './components/modules/transactions/bankreceived/BankReceived';
import BankPayment from './components/modules/transactions/bankpayment/BankPayment';
import Journal from './components/modules/transactions/journal/Journal';
import Dayclose from './components/modules/dayclose/Dayclose';
import Orders from './components/modules/orders/Orders';
import AddOrder from './components/modules/orders/AddOrder';
import AveragePrice from './components/modules/orders/AveragePrice';
import MitchMatch from './components/modules/reports/mitchmatch/MitchMatch';
import AddBranch from './components/modules/branch/AddBranch';
import Roles from './components/modules/user-management/Roles';
import AddRole from './components/modules/user-management/AddRole';
import JumpDate from './components/modules/dayclose/JumpDate';
import VoucherApproval from './components/modules/voucher_approval/VoucherApproval';
import PurchaseIndex from './components/modules/invoices/purchase/PurchaseIndex';
import SalesIndex from './components/modules/invoices/sales/SalesIndex';
import CashReceivedIndex from './components/modules/transactions/cashreceived/CashReceivedIndex';
import CashPaymentIndex from './components/modules/transactions/cashpayment/CashPaymentIndex';
import ChangeVoucherType from './components/modules/change_voucher_type/ChangeVoucherType';
import CustomerSupplier from './components/modules/customer-supplier/CustomerSupplier';
import MultipleImageUpload from './components/modules/image-upload/MultipleImageUpload';
import InstallmentDetails from './components/modules/installment/InstallmentDetails';
import DueInstallment from './components/modules/installment/DueInstallment';
import CustomerDashboard from './components/modules/Customers/Dashboard/CustomerDashboard';
import CustomerLogin from './pages/CustomerAuth/CustomerLogin';
import CustomerLayout from './layout/CustomerLayout';
import AddCustomerSupplier from './components/modules/customer-supplier/AddCustomerSupplier';
import ChangeDate from './components/modules/change_date/ChangeDate';
import ReportComponent from './components/modules/reports/test/ReportComponent';
import StaffWiseDueInstallment from './components/modules/installment/StaffWiseDueInstallment';
import LabourLedger from './components/modules/reports/ledger-labour/LabourLedger';
import ConstructionLabourInvoice from './components/modules/invoices/labour/ConstructionLabourInvoice';
import RemoveApproval from './components/modules/voucher_approval/RemoveApproval';
import FaviconUpdater from './components/utils/components/FaviconUpdater';
import BulkImageUpload from './components/modules/image-upload/BulkImageUpload';
import GroupPurchaseSales from './components/modules/reports/group-report/GroupPurchaseSales';
import RequisitionForm from './components/modules/Requisition/RequisitionForm';
import VoucherDelete from './components/modules/vr_settings/VoucherDelete';
import Comparison from './components/modules/Requisition/Comparison';
import Requisitions from './components/modules/Requisition/Requisitions';
import AreaAdd from './components/modules/real-estate/area/AreaAdd';
import AreaList from './components/modules/real-estate/area/AreaList';
import DashboardIndex from './components/modules/dashboard/DashboardIndex';
import ItemChart from './components/modules/charts/item-char/ItemChart';
import InstallmentDelete from './components/modules/vr_settings/InstallmentDelete';
import Recyclebin from './components/modules/vr_settings/Recyclebin';
import ChangeHistory from './components/modules/history/ChangeHistory';
import EmployeeCreate from './components/modules/hrms/employee/EmployeeCreate';
import Employees from './components/modules/hrms/employee/Employees';
import EmployeeEdit from './components/modules/hrms/employee/EmployeeEdit';
import DesignationLevels from './components/modules/hrms/designation-level/DesignationLevels';
import AddDesignationLevel from './components/modules/hrms/designation-level/AddDesignationLevel';
import HrmDesignations from './components/modules/hrms/designation/HrmDesignations';
import AddHrmDesignation from './components/modules/hrms/designation/AddHrmDesignation';
import SalarySheetGenerate from './components/modules/hrms/salary/SalarySheetGenerate';
import SalarySheet from './components/modules/hrms/salary/SalarySheet';
import SalarySheetUpdate from './components/modules/hrms/salary/SalarySheetUpdate';
import FestivalBonusGenerate from './components/modules/hrms/bonus/FestivalBonusGenerate';
import FestivalBonus from './components/modules/hrms/bonus/FestivalBonus';
import EmployeeLoan from './components/modules/hrms/loan/EmployeeLoan';
import ChangeList from './components/modules/history/ChangeList';
import AddEditProject from './components/modules/real-estate/project/AddEditProject';
import FlatLayout from './components/modules/real-estate/building-flat/FlatLayout';
import AddEditBuilding from './components/modules/real-estate/buildings/AddEditBuilding';
import AddEditFlat from './components/modules/real-estate/building-flat/AddEditFlat';
import AddEditUnit from './components/modules/real-estate/units/AddEditUnit';
import ProjectsList from './components/modules/real-estate/project/ProjectsList';
import BuildingList from './components/modules/real-estate/buildings/BuildingList';
import BuildingUnitsList from './components/modules/real-estate/units/BuildingUnitsList';
import FloorList from './components/modules/real-estate/building-flat/FloorList';
import AddEditUnitChargeType from './components/modules/real-estate/units/AddEditUnitChargeType';
import ChargeTypeList from './components/modules/real-estate/charge-types/ChargeTypeList';
import AddBranding from './components/modules/product/brand/AddBranding';
import Brands from './components/modules/product/brand/Brands';
import AddProductUnit from './components/modules/product/unit/AddProductUnit';
import ProductUnits from './components/modules/product/unit/ProductUnits';
import EditCustomerSupplier from './components/modules/customer-supplier/EditCustomerSupplier';
import UnitSalePage from './components/modules/real-estate/sales/UnitSalePage';
import RequirePermission from "./components/auth/RequirePermission";
import NoAccess from './components/modules/pages/NoAccess';
import { MENU_PERMISSIONS } from './components/Sidebar/menuPermissions';
import LoanLedger from './components/modules/hrms/loan/LoanLedger';
import LoanBalance from './components/modules/hrms/loan/LoanBalance';
import UnitSalePaymentList from './components/modules/real-estate/checks/UnitSalePaymentList';
import UnitSalePaymentEdit from './components/modules/real-estate/checks/UnitSalePaymentEdit';
import UnitSalePaymentEntry from './components/modules/real-estate/checks/UnitSalePaymentEntry';
import ProductStockIndex from './components/modules/reports/productstock/ProductStockIndex';
import ProfitLoss from './components/modules/reports/profit-loss/ProfitLoss';
import BalanceSheet from './components/modules/reports/balance-sheet/BalanceSheet';
import TrialBalanceLevel3 from './components/modules/reports/trial-balance-level3/TrialBalanceLevel3';
import TrialBalanceLevel4 from './components/modules/reports/trial-balance-level4/TrialBalanceLevel4';
import LedgerWithProduct from './components/modules/reports/ledger-with-product/LedgerWithProduct';
import BranchTransfer from './components/modules/warehouse-transfer/WarehouseTransfer';
import WarehouseReceived from './components/modules/warehouse-received/WarehouseReceived';
import SendSms from './components/modules/sms/SendSms';
import SmsTemplateList from './components/modules/sms/SmsTemplateList';
import SmsTemplateCreate from './components/modules/sms/SmsTemplateCreate';
import SmsTemplateEdit from './components/modules/sms/SmsTemplateEdit';
import RequireSubscription from './components/auth/RequireSubscription';
import Pricing from './components/modules/subscription/Pricing';
import MySubscription from './components/modules/subscription/MySubscription';
import PaymentSubmit from './components/modules/subscription/PaymentSubmit';
import BillingHistory from './components/modules/subscription/BillingHistory';
import SubscriptionAdmin from './components/modules/subscription/SubscriptionAdmin';
import SubscriptionPlanList from './components/modules/subscription/SubscriptionPlanList';
import SubscriptionPlanForm from './components/modules/subscription/SubscriptionPlanForm';
import RequireUserQuota from './components/auth/RequireUserQuota';

const extractRoleNames = (value: any): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => extractRoleNames(typeof item === 'string' ? item : item?.name ?? item))
      .filter(Boolean);
  }

  if (typeof value === 'object') {
    return extractRoleNames(value?.name ?? '');
  }

  return String(value)
    .split(',')
    .map((item) => item.replace(/<[^>]+>/g, '').trim().toLowerCase())
    .filter(Boolean);
};

const PRIVILEGED_ROLE_NAMES = ['super administrator', 'administrator', 'dba'];
const PRIVILEGED_ROLE_IDS = [1, 2];
const SUBSCRIPTION_EXEMPT_COMPANY_IDS = new Set([1]);




function App() {
  const dispatch = useDispatch();

  const { isLoggedIn, isLoading, me } = useSelector((s: any) => s.auth);
  const currentBranch = useSelector((s: any) => s.branchList);
  const companyName = currentBranch?.currentBranch?.company?.name;
  const settings = useSelector((s: any) => s.settings);
  const subscription = useSelector((s: any) => s.subscription);
  const authRoleNames = [
    ...extractRoleNames(me?.role_name),
    ...extractRoleNames(me?.role),
    ...extractRoleNames(me?.roles),
  ];
  const currentCompanyId = Number(me?.company_id || 0);
  const isPrivilegedUser =
    authRoleNames.some((roleName) => PRIVILEGED_ROLE_NAMES.includes(roleName)) ||
    PRIVILEGED_ROLE_IDS.includes(Number(me?.role_id));
  const bypassSubscriptionEnforcement = SUBSCRIPTION_EXEMPT_COMPANY_IDS.has(currentCompanyId);

  const userPermissions = isPrivilegedUser
    ? [{ id: 0, name: '*', group_name: '*', guard_name: 'web', created_at: '', updated_at: '' }]
    : settings?.data?.permissions ?? [];
  const permissionsLoading = settings?.loading ?? false;
  const userCreatePermissions = ['all.user.create', 'user.create', 'user.store', 'all.user.add'];
  const subscriptionSafeRoutes = [
    routes.my_subscription,
    routes.subscription_pricing,
    routes.subscription_payment_submit,
    routes.subscription_billing_history,
  ];


  useEffect(() => {
    dispatch(authCheck());
  }, []);



  return (
    <>
      <BrowserRouter>
        {/* You can show loader if needed: */}
        {/* {currentBranch.loading && <Loader />} */}
        {/* Favicon */}
        <FaviconUpdater companyName={companyName} />
        <Routes>
          {/* Customer Section */}
          {/* <Route path="/customer" element={<CustomerLayout isLoggedIn={isLoggedIn} isLoading={isLoading} />}> */}
          <Route path="/customer" element={<CustomerLayout />}>
            <Route path={routes.customerHome} element={<CustomerDashboard />} />
          </Route>

          {/* Admin + Authenticated User Section */}
          <Route path="/" element={<DefaultLayout isLoggedIn={isLoggedIn} isLoading={isLoading} user={me} />}>
            <Route path={routes.subscription_pricing} element={<Pricing />} />
            <Route path={routes.my_subscription} element={<MySubscription />} />
            <Route path={routes.subscription_payment_submit} element={<PaymentSubmit />} />
            <Route path={routes.subscription_billing_history} element={<BillingHistory />} />

            <Route
              element={
                <RequireSubscription
                  loading={subscription.loadingCurrent}
                  initialized={subscription.initialized}
                  error={subscription.error}
                  bypass={bypassSubscriptionEnforcement}
                  current={subscription.current}
                  allowedPaths={subscriptionSafeRoutes}
                />
              }
            >
              <Route path={routes.main} element={<DashboardIndex />} />
              <Route path={routes.dashboard} element={<DashboardIndex />} />
              <Route path={routes.profile} element={<Profile />} />
              <Route path={routes.subscription_admin} element={<SubscriptionAdmin />} />
              <Route path={routes.subscription_plan_list} element={<SubscriptionPlanList />} />
              <Route path={routes.subscription_plan_entry} element={<SubscriptionPlanForm />} />
              <Route path={routes.subscription_plan_edit} element={<SubscriptionPlanForm />} />
              <Route path={routes.calendar} element={<Calendar />} />
              <Route path={routes.formElements} element={<FormElements />} />
              <Route path={routes.formLayout} element={<FormLayout />} />
              <Route path={'hello-bangladesh'} element={<ReportComponent />} />

              {/* Chart of Accounts */}
              <Route element={<RequirePermission permissions={userPermissions} anyOf={['coa.l1.view']} loading={permissionsLoading} />}>
                <Route path={routes.coal1_list} element={<CoaL1 />} />
              </Route>
              <Route element={<RequirePermission permissions={userPermissions} anyOf={['coa.l2.view']} loading={permissionsLoading} />}>
                <Route path={routes.coal2_list} element={<CoaL2 />} />
              </Route>
              <Route element={<RequirePermission permissions={userPermissions} anyOf={['coa.l3.view']} loading={permissionsLoading} />}>
                <Route path={routes.coal3_list} element={<CoaL3 />} />
              </Route>
              <Route element={<RequirePermission permissions={userPermissions} anyOf={['coa.l4.view']} loading={permissionsLoading} />}>
                <Route path={routes.coal4_list} element={<CoaL4 />} />
                <Route path={routes.coal4_add} element={<AddCoaL4 />} />
              </Route>
              <Route element={<RequirePermission permissions={userPermissions} anyOf={MENU_PERMISSIONS.customer} loading={permissionsLoading} />}>
                <Route path={routes.supplier_customer_list} element={<CustomerSupplier />} />
                <Route path={routes.supplier_customer_add} element={<AddCustomerSupplier />} />
                <Route path={routes.supplier_customer_edit} element={<EditCustomerSupplier />} />
              </Route>

              {/* UI */}
              <Route path={routes.buttons} element={<Buttons />} />
              <Route path={routes.alert} element={<Alerts />} />

              {/* Settings */}
              <Route element={<RequirePermission permissions={userPermissions} anyOf={['branch.view']} loading={permissionsLoading} />}>
                <Route path={routes.branch_list} element={<BranchList />} />
                <Route path={routes.branch_add} element={<AddBranch />} />
                <Route path={routes.branch_edit} element={<AddBranch />} />
              </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['all.user.view', 'user.view']} loading={permissionsLoading} />}>
              <Route path={routes.user_list} element={<UserList />} />
              <Route path={routes.user_edit} element={<EditUser user={me} />} />
            </Route>
            <Route
              element={
                <RequirePermission
                  permissions={userPermissions}
                  anyOf={userCreatePermissions}
                  loading={permissionsLoading}
                />
              }
            >
              <Route element={<RequireUserQuota />}>
                <Route path={routes.user_add} element={<AddUser />} />
              </Route>
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['installment.create']} loading={permissionsLoading} />}>
              <Route path={routes.installment_list} element={<InstallmentDetails />} />
            </Route>
              <Route path={routes.sms_send} element={<SendSms user={me} />} />
              <Route path={routes.sms_template_list} element={<SmsTemplateList />} />
              <Route path={routes.sms_template_create} element={<SmsTemplateCreate />} />
              <Route path={routes.sms_template_edit} element={<SmsTemplateEdit />} />

            <Route element={<RequirePermission permissions={userPermissions} anyOf={['check.register.view']} loading={permissionsLoading} />}>
              <Route path={routes.unit_payment_list} element={<UnitSalePaymentList />} />
              <Route path={routes.unit_payment_edit} element={<UnitSalePaymentEdit />} />
              <Route path={routes.unit_payment_entry} element={<UnitSalePaymentEntry />} />
            </Route>

            {/* Day Close */}
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['dayclose.create']} loading={permissionsLoading} />}>
              <Route path={routes.day_close} element={<Dayclose />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['dayclose.jumpdate']} loading={permissionsLoading} />}>
              <Route path={routes.day_jump} element={<JumpDate />} />
            </Route>

            {/* Category */}
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['category.view']} loading={permissionsLoading} />}>
              <Route path={routes.category_list} element={<Category />} />
              <Route path={routes.category_create} element={<AddCategory />} />
              <Route path={routes.category_edit} element={<EditCategory />} />
            </Route>

            {/* Transactions */}
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['cash.received.create']} loading={permissionsLoading} />}>
              <Route path={routes.cash_received} element={<CashReceivedIndex />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['cash.payment.create']} loading={permissionsLoading} />}>
              <Route path={routes.cash_payment} element={<CashPaymentIndex />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['bank.received.create']} loading={permissionsLoading} />}>
              <Route path={routes.bank_receive} element={<BankReceived />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['bank.payment.create']} loading={permissionsLoading} />}>
              <Route path={routes.bank_payment} element={<BankPayment />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['hrm.loan.create']} loading={permissionsLoading} />}>
              <Route path={routes.employee_loan} element={<EmployeeLoan />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['employee.loan.ledger.view']} loading={permissionsLoading} />}>
              <Route path={routes.employee_loan_ledger} element={<LoanLedger user={me} />} />
              <Route path={routes.employee_loan_balance} element={<LoanBalance user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['journal.create']} loading={permissionsLoading} />}>
              <Route path={routes.journal} element={<Journal />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['branch.transfer.create', 'inventory.transfer.create', 'product.transfer.create']} loading={permissionsLoading} />}>
              <Route path={routes.branch_transfer} element={<BranchTransfer />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['branch.received.create', 'inventory.received.create', 'product.received.create']} loading={permissionsLoading} />}>
              <Route path={routes.branch_received} element={<WarehouseReceived />} />
            </Route>

            {/* Products */}
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['products.view']} loading={permissionsLoading} />}>
              <Route path={routes.product_list} element={<Product user={me} />} />
              <Route path={routes.product_create} element={<AddProduct />} />
              <Route path={routes.product_edit} element={<AddProduct />} />
              <Route path={routes.brand_create} element={<AddBranding />} />
              <Route path={routes.brand_list} element={<Brands />} />
              <Route path={routes.product_unit_list} element={<ProductUnits />} />
              <Route path={routes.product_unit_create} element={<AddProductUnit />} />
              <Route path={routes.product_unit_edit} element={<AddProductUnit />} />
            </Route>

            {/* Reports */}
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['date.wise.total']} loading={permissionsLoading} />}>
              <Route path={routes.report_date_wise_total} element={<DateWiseData user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['cashbook.view']} loading={permissionsLoading} />}>
              <Route path={routes.report_cashbook} element={<CashBook user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['cashbook.view']} loading={permissionsLoading} />}>
              <Route path={routes.profit_loss} element={<ProfitLoss user={me} />} />
              <Route path={routes.balance_sheet} element={<BalanceSheet user={me} />} />
              <Route path={routes.trial_balance_level3} element={<TrialBalanceLevel3 user={me} />} />
              <Route path={routes.trial_balance_level4} element={<TrialBalanceLevel4 user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['ledger.customer']} loading={permissionsLoading} />}>
              <Route path={routes.customer_supplier_statement} element={<LedgerWithProduct user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['installment.create']} loading={permissionsLoading} />}>
              <Route path={routes.due_installment_list} element={<DueInstallment user={me} />} />
              <Route path={routes.employee_wise_installment} element={<StaffWiseDueInstallment user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['ledger.due.view']} loading={permissionsLoading} />}>
              <Route path={routes.report_due_list} element={<DueList user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['ledger.view', 'ledger.customer']} loading={permissionsLoading} />}>
              <Route path={routes.report_ledger} element={<Ledger user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['ledger.labour']} loading={permissionsLoading} />}>
              <Route path={routes.report_labour_ledger} element={<LabourLedger user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['purchase.ledger']} loading={permissionsLoading} />}>
              <Route path={routes.purchase_ledger} element={<PurchaseLedger user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['sales.ledger']} loading={permissionsLoading} />}>
              <Route path={routes.sales_ledger} element={<SalesLedger user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['mitch.match']} loading={permissionsLoading} />}>
              <Route path={routes.mitch_match} element={<MitchMatch user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['group.report']} loading={permissionsLoading} />}>
              <Route path={routes.group_report} element={<GroupPurchaseSales user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['product.stock.view']} loading={permissionsLoading} />}>
              <Route path={routes.report_product_stock} element={<ProductStockIndex user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['product.in.out']} loading={permissionsLoading} />}>
              <Route path={routes.cat_wise_in_out} element={<CatWiseInOut user={me} />} />
            </Route>

            {/* Orders */}
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['order.view']} loading={permissionsLoading} />}>
              <Route path={routes.order_list} element={<Orders />} />
              <Route path={routes.order_add} element={<AddOrder user={me} />} />
              <Route path={routes.order_edit} element={<AddOrder user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['order.avg.price']} loading={permissionsLoading} />}>
              <Route path={routes.order_avg_price} element={<AveragePrice user={me} />} />
            </Route>

            {/* Utilities */}
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['voucher.photo.upload']} loading={permissionsLoading} />}>
              <Route path={routes.image_upload} element={<MultipleImageUpload user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['bulk.photo.upload']} loading={permissionsLoading} />}>
              <Route path={routes.bulk_upload} element={<BulkImageUpload user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['voucher.approval']} loading={permissionsLoading} />}>
              <Route path={routes.admin_voucher_approval} element={<VoucherApproval />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['remove.approval']} loading={permissionsLoading} />}>
              <Route path={routes.admin_remove_approval} element={<RemoveApproval />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['change.vourcher.type']} loading={permissionsLoading} />}>
              <Route path={routes.admin_change_voucher_type} element={<ChangeVoucherType />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['voucher.date.change']} loading={permissionsLoading} />}>
              <Route path={routes.admin_change_date} element={<ChangeDate />} />
            </Route>

            {/* Roles & Permissions */}
            {/* Fully menu protected, please implement for all menus */}
            <Route element={<RequirePermission permissions={userPermissions} anyOf={MENU_PERMISSIONS.roles} loading={permissionsLoading} />}>
              <Route path={routes.roles} element={<Roles />} />
              <Route path={routes.add_role} element={<AddRole />} />
            </Route>


            <Route element={<RequirePermission permissions={userPermissions} anyOf={['requisition.create']} loading={permissionsLoading} />}>
              <Route path={routes.requisition} element={<Requisitions user={me} />} />
              <Route path={routes.requisition_create} element={<RequisitionForm />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['requisition.comparison']} loading={permissionsLoading} />}>
              <Route path={routes.requisition_comparison} element={<Comparison user={me} />} />
            </Route>


            {/* Voucher Delete */}
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['installment.delete']} loading={permissionsLoading} />}>
              <Route path={routes.installment_delete} element={<InstallmentDelete />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['voucher.delete']} loading={permissionsLoading} />}>
              <Route path={routes.voucher_delete} element={<VoucherDelete />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['voucher.recycle']} loading={permissionsLoading} />}>
              <Route path={routes.recyclebin} element={<Recyclebin />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['voucher.history']} loading={permissionsLoading} />}>
              <Route path={routes.voucher_history} element={<ChangeHistory user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['voucher.changes']} loading={permissionsLoading} />}>
              <Route path={routes.voucher_activity} element={<ChangeList user={me} />} />
            </Route>
            {/* voucher_activity: '/vr-settings/voucher-activity', */}

            {/* Invoices */}
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['purchase.create']} loading={permissionsLoading} />}>
              <Route path={routes.inv_purchase} element={<PurchaseIndex />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['sales.create']} loading={permissionsLoading} />}>
              <Route path={routes.inv_sales} element={<SalesIndex />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['labour.invoice.create']} loading={permissionsLoading} />}>
              <Route path={routes.inv_labour} element={<ConstructionLabourInvoice />} />
            </Route>

            {/* Also show customer dashboard if admin wants */}
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['cs.view', 'ledger.customer', 'ledger.due.view', 'installment.create']} loading={permissionsLoading} />}>
              <Route path={routes.customer_dashboard} element={<CustomerDashboard />} />
            </Route>


            {/* <Route path={routes.real_estate_area_list} element={<RealEstateAreaList />} /> */}
            <Route path={routes.real_estate_area_add} element={<AreaAdd />} />
            <Route path={routes.real_estate_area_list} element={<AreaList />} />

            <Route path={routes.real_estate_project_activities} element={<AddEditProject user={me} />} />
            <Route path={routes.real_estate_project_list} element={<ProjectsList user={me} />} />


            <Route path={routes.real_estate_buildings} element={<AddEditBuilding />} />
            <Route path={routes.real_estate_buildings_list} element={<BuildingList user={me} />} />

            <Route path={routes.real_estate_floor_list} element={<FloorList user={me} />} />
            <Route path={routes.real_estate_add_building_floor} element={<AddEditFlat />} />
            <Route path={routes.real_estate_flat_layout} element={<FlatLayout />} />

            <Route path={routes.real_estate_floor_unit_list} element={<BuildingUnitsList user={me} />} />
            <Route path={routes.real_estate_add_floor_unit} element={<AddEditUnit />} />
            <Route path={routes.real_estate_add_floor_unit_edit} element={<AddEditUnit />} /> 
            <Route path={routes.real_estate_unit_types_create} element={<AddEditUnitChargeType />} />

            <Route path={routes.real_estate_unit_types_list} element={<ChargeTypeList user={me} />} />
            <Route path={routes.real_estate_unit_sales} element={<UnitSalePage />} />


            {/* HRM */}
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['employee.view']} loading={permissionsLoading} />}>
              <Route path={routes.hrms_employee_add} element={<EmployeeCreate user={me} />} />
              <Route path={routes.hrms_employee_list} element={<Employees user={me} />} />
              <Route path={routes.hrms_designation_level_list} element={<DesignationLevels />} />
              <Route path={routes.hrms_designation_level_create} element={<AddDesignationLevel />} />
              <Route path={routes.hrms_designation_level_edit} element={<AddDesignationLevel />} />
              <Route path={routes.hrms_designation_list} element={<HrmDesignations />} />
              <Route path={routes.hrms_designation_create} element={<AddHrmDesignation />} />
              <Route path={routes.hrms_designation_edit} element={<AddHrmDesignation />} />
              <Route path="/hrms/employee/edit/:id" element={<EmployeeEdit />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['salary.generate']} loading={permissionsLoading} />}>
              <Route path={routes.hrms_salary_generate} element={<SalarySheetGenerate user={me} />} />
              <Route path={routes.hrms_festival_bonus_generate} element={<FestivalBonusGenerate user={me} />} />
              <Route path={routes.hrms_festival_bonus_list} element={<FestivalBonus user={me} />} />
            </Route>
            <Route element={<RequirePermission permissions={userPermissions} anyOf={['salary.sheet.view']} loading={permissionsLoading} />}>
              <Route path={routes.hrms_salary_sheet_update} element={<SalarySheetUpdate user={me} />} />
              <Route path={routes.hrms_salary_sheet_list} element={<SalarySheet user={me} />} />
            </Route>

              {/* All Cart */}
              <Route element={<RequirePermission permissions={userPermissions} anyOf={['product.stock.view', 'product.in.out', 'group.report']} loading={permissionsLoading} />}>
                <Route path={routes.item_chart} element={<ItemChart user={me} />} />
              </Route>
            </Route>

          </Route>

          {/* Public Routes */}
          <Route path={routes.login} element={<SignIn />} />
          <Route path={routes.forgot_password} element={<ForgotPassword />} />
          <Route path={routes.public_register} element={<PublicRegistration />} />
          <Route path={routes.public_register_otp} element={<PublicRegistrationOtp />} />
          <Route path={routes.customerLogin} element={<CustomerLogin />} />

          {/* No Access Route */}
          <Route path="no-access" element={<NoAccess />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;




