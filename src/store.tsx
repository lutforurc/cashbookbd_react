import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/authReducer';
import branchReducer from './components/modules/branch/branchSlice';
import dashboardReducer from './components/modules/dashboard/dashboardSlice';
import userReducer from './components/modules/user/userSlice';
import productReducer from './components/modules/product/productSlice';
import dateWiseTotalReducer from './components/modules/reports/datewisedata/dateWiseDataSlice';
import branchDdlReducer from './components/modules/branch/ddlBranchSlider';
import categoryReducer from './components/modules/category/categorySlice';
import cashBookReducer from './components/modules/reports/cashbook/cashBookSlice';
import ledgerReducer from './components/modules/reports/ledger/ledgerSlice';
import coal4Reducer from './components/modules/chartofaccounts/levelfour/coal4Sliders';
import coal3Reducer from './components/modules/chartofaccounts/levelthree/coal3Sliders';
import coal2Reducer from './components/modules/chartofaccounts/leveltwo/coal2Sliders';
import coal1Reducer from './components/modules/chartofaccounts/levelone/coal1Sliders';
import coal4DdlSlicer from './components/modules/chartofaccounts/levelfour/coal4DdlSlicer';
import dueListReducer from './components/modules/reports/duelist/dueListSlice';
import productStockReducer from './components/modules/reports/productstock/productStockSlice';
import catWiseInOutReducer from './components/modules/reports/catwiseinout/catWiseInOutSlice';
import purchaseLedgerReducer from './components/modules/reports/purchaseledger/purchaseLedgerSlice';
import salesLedgerReducer from './components/modules/reports/salesledger/salesLedgerSlice';
import cashReceivedReducer from './components/modules/transactions/cashreceived/cashReceivedSlice';
import cashPaymentReducer from './components/modules/transactions/cashpayment/cashPaymentSlice';
import warehouseDdlReducer from './components/modules/warehouse/ddlWarehouseSlider';
import tradingPurchaseReducer from './components/modules/invoices/purchase/tradingPurchaseSlice';
import tradingSalesReducer from './components/modules/invoices/sales/tradingSalesSlice';
import dayCloseReducer from './components/modules/dayclose/daycloseSlice';
import orderReducer from './components/modules/orders/ordersSlice';
import settingsReducer from './components/modules/settings/settingsSlice';
import mitchMatchReducer from './components/modules/reports/mitchmatch/mitchMatchSlice';
import rolesSlice from './components/modules/roles/rolesSlice';
import constructionPurchaseReducer from './components/modules/invoices/purchase/constructionPurchaseSlice';
import userManagementSlice from './components/modules/user-management/userManagementSlice';
import chartSlice from './components/modules/dashboard/chartSlice';
import voucherApprovalReducer from './components/modules/voucher_approval/voucherApprovalSlice';
import generalSalesSlice from './components/modules/invoices/sales/generalSalesSlice';
import labourInvoiceSlice from './components/modules/invoices/labour/labourInvoiceSlice';
import changeVoucherTypeReducer from './components/modules/change_voucher_type/changeVoucherTypeSlice';
import imageUploadSlice from './components/modules/image-upload/imageUploadSlice';
import installmentSlice from './components/modules/installment/installmentSlice';
import customerSlice from './components/modules/customer-supplier/customerSlice';
import areaSlice from './components/modules/area/areaSlice';
import changeVoucherDateSlice from './components/modules/change_date/changeVoucherDateSlice';
import customerAuthReducer from './features/customerAuthReducer';
import employeeSlice from './components/modules/hrms/employee/employeeSlice';
import electronicsSalesSlice from './components/modules/invoices/sales/electronicsSalesSlice';
import labourLedgerSlice from './components/modules/reports/ledger-labour/labourLedgerSlice';
import requisitionSlice from './components/modules/Requisition/requisitionSlice';
import bankReceivedReducer from './components/modules/transactions/bankreceived/bankReceivedSlice';
import realEstateArea from './components/modules/real-estate/area/areaSlice';
import voucherSettings from './components/modules/vr_settings/voucherSettingsSlice';
import historySlice from './components/modules/history/historySlice';
import salarySlice from './components/modules/hrms/salary/salarySlice';
import employeeLoanSlice from './components/modules/hrms/loan/employeeLoanSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    customerAuth: customerAuthReducer,
    users: userReducer,
    settings: settingsReducer,
    branchList: branchReducer,
    dashboard: dashboardReducer,
    product: productReducer,
    category: categoryReducer,
    dateWiseTotal: dateWiseTotalReducer,
    branchDdl: branchDdlReducer,
    cashBook: cashBookReducer,
    ledger: ledgerReducer,
    labourLedger: labourLedgerSlice,
    coal1: coal1Reducer,
    coal2: coal2Reducer,
    coal3: coal3Reducer,
    coal4: coal4Reducer,
    coal4ddl: coal4DdlSlicer,
    dueList: dueListReducer,
    stock: productStockReducer,
    catWiseInOut: catWiseInOutReducer,
    purchaseLedger: purchaseLedgerReducer,
    salesLedger: salesLedgerReducer,
    cashReceived: cashReceivedReducer,
    cashPayment: cashPaymentReducer,
    bankReceived: bankReceivedReducer,
    activeWarehouse: warehouseDdlReducer,
    tradingPurchase: tradingPurchaseReducer,
    constructionPurchase: constructionPurchaseReducer,
    trasingSales: tradingSalesReducer,
    generalSales: generalSalesSlice,
    electronicsSales: electronicsSalesSlice,
    dayclose: dayCloseReducer,
    orders: orderReducer,
    mitchMatch: mitchMatchReducer,
    roles: rolesSlice,
    userManagement: userManagementSlice,
    charts: chartSlice,
    voucherApproval: voucherApprovalReducer,
    labourInvoice: labourInvoiceSlice,
    changeVoucherType: changeVoucherTypeReducer,
    imageUpload: imageUploadSlice,
    customers: customerSlice,
    area: areaSlice,
    installment: installmentSlice,
    changeDate: changeVoucherDateSlice,
    employees: employeeSlice,
    requisition: requisitionSlice,
    realEstateArea: realEstateArea,
    voucherSettings: voucherSettings,
    history: historySlice,
    salary: salarySlice,
    employeeLoan: employeeLoanSlice,
  },
});

export default store;
