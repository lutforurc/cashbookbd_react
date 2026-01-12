import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import SignIn from './pages/Authentication/SignIn';
import Calendar from './pages/Calendar';
import FormElements from './pages/Form/FormElements';
import FormLayout from './pages/Form/FormLayout';
import Profile from './pages/Profile';
import Alerts from './pages/UiElements/Alerts';
import Buttons from './pages/UiElements/Buttons';
import DefaultLayout from './layout/DefaultLayout';
import { authCheck } from './features/authReducer';
import Dashboard from './components/modules/dashboard/ConstructionDashboard';
import { useDispatch, useSelector } from 'react-redux';
import routes from './components/services/appRoutes';
import BranchList from './components/modules/branch/BranchList';
import UserList from './components/modules/user/UserList';
import Product from './components/modules/product/Product';
import DateWiseData from './components/modules/reports/datewisedata/DateWiseData';
import AddProduct from './components/modules/product/AddProduct';
import Category from './components/modules/category/Category';
import AddCategory from './components/modules/category/AddCategory';
import EditCategory from './components/modules/category/EditCategory';
import CashBook from './components/modules/reports/cashbook/CashBook';
import Ledger from './components/modules/reports/ledger/Ledger';
import CoaL4 from './components/modules/chartofaccounts/levelfour/CoaL4';
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
import Requisition from './components/modules/Requisition/Comparison';
import RequisitionForm from './components/modules/Requisition/RequisitionForm';
import VoucherDelete from './components/modules/vr_settings/VoucherDelete';
import Comparison from './components/modules/Requisition/Comparison';
import RequisitionList from './components/modules/Requisition/Requisitions';
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
import SalarySheetGenerate from './components/modules/hrms/salary/SalarySheetGenerate';
import SalarySheet from './components/modules/hrms/salary/SalarySheet';
import EmployeeLoan from './components/modules/hrms/loan/EmployeeLoan';
import ChangeList from './components/modules/history/ChangeList';



function App() {
  const [loading, setLoading] = useState<boolean>(true);
  const dispatch = useDispatch();

  const { isLoggedIn, isLoading, me } = useSelector((s: any) => s.auth);
  const currentBranch = useSelector((s: any) => s.branchList);
  const companyName = currentBranch?.currentBranch?.company?.name;

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
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
            <Route path={routes.main} element={<DashboardIndex />} />
            <Route path={routes.dashboard} element={<DashboardIndex />} />
            <Route path={routes.calendar} element={<Calendar />} />
            <Route path={routes.profile} element={<Profile />} />
            <Route path={routes.formElements} element={<FormElements />} />
            <Route path={routes.formLayout} element={<FormLayout />} />
            <Route path={'hello-bangladesh'} element={<ReportComponent />} />

            {/* Chart of Accounts */}
            <Route path={routes.coal1_list} element={<CoaL1 />} />
            <Route path={routes.coal2_list} element={<CoaL2 />} />
            <Route path={routes.coal3_list} element={<CoaL3 />} />
            <Route path={routes.coal4_list} element={<CoaL4 />} />
            <Route path={routes.supplier_customer_list} element={<CustomerSupplier />} />
            <Route path={routes.supplier_customer_add} element={<AddCustomerSupplier />} />

            {/* UI */}
            <Route path={routes.buttons} element={<Buttons />} />
            <Route path={routes.alert} element={<Alerts />} />

            {/* Settings */}
            <Route path={routes.branch_list} element={<BranchList />} />
            <Route path={routes.branch_add} element={<AddBranch />} />
            <Route path={routes.branch_edit} element={<AddBranch />} />
            <Route path={routes.user_list} element={<UserList />} />
            <Route path={routes.user_edit} element={<EditUser user={me} />} />
            <Route path={routes.installment_list} element={<InstallmentDetails />} />

            {/* Day Close */}
            <Route path={routes.day_close} element={<Dayclose />} />
            <Route path={routes.day_jump} element={<JumpDate />} />

            {/* Category */}
            <Route path={routes.category_list} element={<Category />} />
            <Route path={routes.category_create} element={<AddCategory />} />
            <Route path={routes.category_edit} element={<EditCategory />} />

            {/* Transactions */}
            <Route path={routes.cash_received} element={<CashReceivedIndex />} />
            <Route path={routes.cash_payment} element={<CashPaymentIndex />} />
            <Route path={routes.bank_receive} element={<BankReceived />} />
            <Route path={routes.bank_payment} element={<BankPayment />} />
            <Route path={routes.employee_loan} element={<EmployeeLoan />} />
            <Route path={routes.journal} element={<Journal />} />

            {/* Products */}
            <Route path={routes.product_list} element={<Product />} />
            <Route path={routes.product_create} element={<AddProduct />} />
            <Route path={routes.product_edit} element={<AddProduct />} />

            {/* Reports */}
            <Route path={routes.report_date_wise_total} element={<DateWiseData user={me} />} />
            <Route path={routes.report_cashbook} element={<CashBook user={me} />} />
            <Route path={routes.due_installment_list} element={<DueInstallment user={me} />} />
            <Route path={routes.employee_wise_installment} element={<StaffWiseDueInstallment user={me} />} />
            <Route path={routes.report_due_list} element={<DueList user={me} />} />
            <Route path={routes.report_ledger} element={<Ledger user={me} />} />
            <Route path={routes.report_labour_ledger} element={<LabourLedger user={me} />} />
            <Route path={routes.purchase_ledger} element={<PurchaseLedger user={me} />} />
            <Route path={routes.sales_ledger} element={<SalesLedger user={me} />} />
            <Route path={routes.mitch_match} element={<MitchMatch user={me} />} />
            <Route path={routes.group_report} element={<GroupPurchaseSales user={me} />} />
            <Route path={routes.report_product_stock} element={<ProductStock user={me} />} />
            <Route path={routes.cat_wise_in_out} element={<CatWiseInOut user={me} />} />

            {/* Orders */}
            <Route path={routes.order_list} element={<Orders />} />
            <Route path={routes.order_add} element={<AddOrder user={me} />} />
            <Route path={routes.order_avg_price} element={<AveragePrice user={me} />} />

            {/* Utilities */}
            <Route path={routes.image_upload} element={<MultipleImageUpload user={me} />} />
            <Route path={routes.bulk_upload} element={<BulkImageUpload user={me} />} />
            <Route path={routes.admin_voucher_approval} element={<VoucherApproval />} />


            <Route path={routes.admin_remove_approval} element={<RemoveApproval />} />
            <Route path={routes.admin_change_voucher_type} element={<ChangeVoucherType />} />
            <Route path={routes.admin_change_date} element={<ChangeDate />} />

            {/* Roles & Permissions */}
            <Route path={routes.roles} element={<Roles />} />
            <Route path={routes.add_role} element={<AddRole />} />


            <Route path={routes.requisition} element={<Requisitions user={me} />} />
            <Route path={routes.requisition_create} element={<RequisitionForm />} />
            <Route path={routes.requisition_comparison} element={<Comparison user={me} />} />


            {/* Voucher Delete */}
            <Route path={routes.installment_delete} element={<InstallmentDelete />} />
            <Route path={routes.voucher_delete} element={<VoucherDelete />} />
            <Route path={routes.recyclebin} element={<Recyclebin />} />
            <Route path={routes.voucher_history} element={<ChangeHistory user={me} />} />
            <Route path={routes.voucher_activity} element={<ChangeList  user={me} />} />
 {/* voucher_activity: '/vr-settings/voucher-activity', */}

            {/* Invoices */}
            <Route path={routes.inv_purchase} element={<PurchaseIndex />} />
            <Route path={routes.inv_sales} element={<SalesIndex />} />
            <Route path={routes.inv_labour} element={<ConstructionLabourInvoice />} />

            {/* Also show customer dashboard if admin wants */}
            <Route path={routes.customer_dashboard} element={<CustomerDashboard />} />


            {/* <Route path={routes.real_estate_area_list} element={<RealEstateAreaList />} /> */}
            <Route path={routes.real_estate_area_add} element={<AreaAdd />} />
            <Route path={routes.real_estate_area_list} element={<AreaList />} />

            {/* HRM */}
            <Route path={routes.hrms_employee_add} element={<EmployeeCreate user={me} />} />
            <Route path={routes.hrms_employee_list} element={<Employees user={me} />} />
            <Route path={routes.hrms_salary_generate} element={<SalarySheetGenerate user={me} />} />
            <Route path={routes.hrms_salary_sheet_list} element={<SalarySheet user={me} />} />

 

            <Route path="/hrms/employee/edit/:id" element={<EmployeeEdit />} />

            {/* All Cart */}

            <Route path={routes.item_chart} element={<ItemChart user={me} />} />

          </Route>

          {/* Public Routes */}
          <Route path={routes.login} element={<SignIn />} />
          <Route path={routes.customerLogin} element={<CustomerLogin />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
