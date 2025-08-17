// export const API_REMOTE_URL = 'https://rmrs.cashbookbd.com';
// export const API_REMOTE_URL = 'https://mbdpp.cashbookbd.com';
// export const API_REMOTE_URL = 'https://krf.cashbookbd.com';
// export const API_REMOTE_URL = 'http://127.0.0.1:8000';
// export const API_REMOTE_URL = 'https://staging.cashbookbd.com';
export const API_REMOTE_URL = 'http://cashbook_api.test';
// export const API_REMOTE_URL = 'https://mikdad.cashbookbd.com';
// export const API_REMOTE_URL = 'https://kpsnew.cashbookbd.com';
// export const API_REMOTE_URL = 'https://sinthia.cashbookbd.com';
// export const API_REMOTE_URL = 'https://nibirnirman.cashbookbd.com';
// export const API_REMOTE_URL = 'https://gmenterprise.cashbookbd.com';
// export const API_REMOTE_URL  = import.meta.env.VITE_API_BASE_URL;


// let API_REMOTE_URLs = window.location.origin;
// console.log("Test Url", API_REMOTE_URLs ); 

// const localHosts = ['localhost', '127.0.0.1', 'cashbook_api.test'];

// if (localHosts.includes(window.location.hostname)) {
//   API_REMOTE_URL = 'http://cashbook_api.test';
// }

// export { API_REMOTE_URL };



export const API_CSRF_COOKIES = API_REMOTE_URL + '/sanctum/csrf-cookie';
export const API_BASE_URL = API_REMOTE_URL + '/api';
export const API_LOGIN_URL = API_BASE_URL + '/login';
export const API_LOGOUT_URL = API_BASE_URL + '/logout';
export const API_AUTH_CHECK_URL = API_BASE_URL + '/me';

// Customer
export const API_CUSTOMER_BASE_URL = API_REMOTE_URL + '/api/customer';

// Settings url
export const API_APP_SETTING_URL = API_BASE_URL + '/settings/get-settings';
export const API_APP_SETTING_VOCHER_TYPE_URL =  API_BASE_URL + '/settings/voucher-types';

// dashboard Routes
export const API_DASHBOARD_URL = API_BASE_URL + '/dashboard/data';
export const API_BRANCH_TRANSACTION_CHART_URL = API_BASE_URL + '/dashboard/branch/transaction-chart-data';
export const API_HEAD_OFFICE_PAYMENT_CHART_URL = API_BASE_URL + '/dashboard/head-office/payment/transaction-chart-data';
export const API_HEAD_OFFICE_RECEIVED_CHART_URL = API_BASE_URL + '/dashboard/head-office/received/transaction-chart-data';
export const API_RECEIVED_REMITTANCE_URL = API_BASE_URL + '/accounts/payment/specific-item';
// API_PROJECT_RECEIVED_CHART_URL

// User Routes
export const API_USER_LIST_URL = API_BASE_URL + '/user/user-list';
export const API_USER_ADD_URL = API_BASE_URL + '/user/add-user';
export const API_USER_STORE_URL = API_BASE_URL + '/user/store';
export const API_USER_EDIT_URL = API_BASE_URL + '/user/user-edit/';
export const API_USER_UPDATE_URL = API_BASE_URL + '/user/user-update';
export const API_USER_CHECK = API_BASE_URL + '/user/user-check';

// Role Routes
export const API_ROLE_LIST_URL = API_BASE_URL + '/role/role-list';
export const API_DDL_ROLE_LIST_URL = API_BASE_URL + '/ddl/role/role-list';

// Company Routes
export const API_COMPANY_LIST_URL = API_BASE_URL + '/company/company-list';

// Branch Routes
export const API_USER_CURRENT_BRANCH_URL = API_BASE_URL + '/user/current-branch';
export const API_BRANCH_LIST_URL = API_BASE_URL + '/branch/branch-list';
export const API_BRANCH_EDIT_URL = API_BASE_URL + '/branch/branch-edit/';
export const API_BRANCH_UPDATE_URL = API_BASE_URL + '/branch/branch-update';
export const API_BRANCH_STORE_URL = API_BASE_URL + '/branch/branch-store';

export const API_ALL_DDL_BRANCH_URL = API_BASE_URL + '/branch/ddl/all-branch';
export const API_ALL_DDL_PROTECTED_BRANCH_URL = API_BASE_URL + '/branch/ddl/protected-branch';

// Warehouse Routes
export const ACTIVE_WAREHOUSE_DDL_URL = API_BASE_URL + '/active/warehouse';

// Chart of Accounts
// COAL1
export const API_COAL1_LIST_URL = API_BASE_URL + '/coal1/coal1-list';

// COAL2
export const API_COAL2_LIST_URL = API_BASE_URL + '/coal2/coal2-list';

// COAL3
export const API_COAL3_LIST_URL = API_BASE_URL + '/coal3/coal3-list';

// COAL4
export const API_COAL4_LIST_URL = API_BASE_URL + '/coal4/coal4-list';
export const API_COAL4_DDL_URL = API_BASE_URL + '/chart_of_accounts/ddl/l4-list';

// Reports
// Ledger url
export const API_REPORT_LEDGER_URL = API_BASE_URL + '/reports/ledger';

// Purchase Ledger url
export const API_REPORT_PURCHASE_LEDGER_URL = API_BASE_URL + '/reports/purchase/ledger';
// Sales Ledger url
export const API_REPORT_SALES_LEDGER_URL = API_BASE_URL + '/reports/sales/ledger';

// Stock Product url
export const API_REPORT_PRODUCT_STOCK_URL = API_BASE_URL + '/reports/product-stock';

// Categories Wise Products In Out of Stock url
export const API_REPORT_CAT_IN_OUT_URL = API_BASE_URL + '/reports/category-wise-in-out';

// Cash Book url
export const API_REPORT_CASHBOOK_URL = API_BASE_URL + '/reports/cashbook';
// Cash Book url
export const API_REPORT_DUE_LIST_URL = API_BASE_URL + '/reports/duelist';
// Date Wise Report url
export const API_DATE_WISE_TOTAL_URL = API_BASE_URL + '/reports/date-wise-total-data';

// Mitch Match url
export const API_REPORT_MITCH_MATCH_URL = API_BASE_URL + '/reports/mitch-match/data';

// Chart of Accounts
export const API_CHART_OF_ACCOUNTS_L1_URL = API_BASE_URL + '/coal1/coal1-list';
export const API_CHART_OF_ACCOUNTS_L2_URL = API_BASE_URL + '/coal2/coal2-list';
export const API_CHART_OF_ACCOUNTS_L3_URL = API_BASE_URL + '/coal3/coal3-list';
export const API_CHART_OF_ACCOUNTS_L4_URL = API_BASE_URL + '/coal4/coal4-list';
export const API_CHART_OF_ACCOUNTS_DDL_L4_URL =  API_BASE_URL + '/chart_of_accounts/ddl/l4-list';

// Cash Received url
export const API_CASH_RECEIVED_URL = API_BASE_URL + '/trading/cash/received';
export const API_CASH_RECEIVED_EDIT_URL =API_BASE_URL + '/trading/cash/received/api-edit';
export const API_CASH_RECEIVED_UPDATE_URL =API_BASE_URL + '/trading/cash/received/api-update';

// Cash Payment url
export const API_CASH_PAYMENT_STORE_URL = API_BASE_URL + '/trading/cash/payment';
export const API_CASH_PAYMENT_EDIT_URL = API_BASE_URL + '/trading/cash/payment/api-edit';
export const API_CASH_PAYMENT_UPDATE_URL = API_BASE_URL + '/trading/cash/payment/api-update';

// Installment url
export const API_INSTALLMENT_LIST_URL = API_BASE_URL + '/accounts/installment/details';
export const API_FILTER_INSTALLMENT_LIST_URL =API_BASE_URL + '/accounts/installment/filter';
export const API_EMPLOYEES_INSTALLMENT_LIST_URL =API_BASE_URL + '/accounts/installment/employees';
export const API_INSTALLMENT_DETAILS_BY_ID_URL =API_BASE_URL + '/accounts/installment/details';
export const API_INSTALLMENT_RECEIVED_URL =API_BASE_URL + '/accounts/installment/received';

// Products Route
export const API_PRODUCT_LIST_URL = API_BASE_URL + '/product/product-list';
export const API_PRODUCT_DDL_LIST_URL = API_BASE_URL + '/product/ddl/list';
export const API_PRODUCT_ADD_URL = API_BASE_URL + '/product/add-product';
export const API_PRODUCT_STORE_URL = API_BASE_URL + '/product/store';
export const API_PRODUCT_EDIT_URL = API_BASE_URL + '/product/product-edit/';
export const API_PRODUCT_UPDATE_URL = API_BASE_URL + '/product/update';
export const API_PRODUCT_CHECK = API_BASE_URL + '/product/product-check';

// Category Route
export const API_CATEGORY_DDL_URL = API_BASE_URL + '/category/category-ddl';
export const API_CATEGORY_LIST_URL = API_BASE_URL + '/category/category-list';
export const API_CATEGORY_ADD_URL = API_BASE_URL + '/category/add-category';
export const API_CATEGORY_STORE_URL = API_BASE_URL + '/category/api-store';
export const API_CATEGORY_EDIT_URL = API_BASE_URL + '/category/edit/';
export const API_CATEGORY_UPDATE_URL =API_BASE_URL + '/category/category-update';
export const API_CATEGORY_CHECK = API_BASE_URL + '/category/category-check';

// Trading Purchase Route
export const API_TRADING_PURCHASE_STORE_URL =API_BASE_URL + '/trading/purchase/api-store';
export const API_TRADING_PURCHASE_EDIT_URL =API_BASE_URL + '/trading/purchase/api-edit';
export const API_TRADING_PURCHASE_UPDATE_URL =API_BASE_URL + '/trading/purchase/api-update';

// Construction Purchase Route
export const API_CONSTRUCTION_PURCHASE_STORE_URL =API_BASE_URL + '/construction/purchase/api-store';
export const API_CONSTRUCTION_PURCHASE_EDIT_URL =API_BASE_URL + '/construction/purchase/api-edit';
export const API_CONSTRUCTION_PURCHASE_UPDATE_URL =API_BASE_URL + '/construction/purchase/api-update';



// Electronics Purchase Route
export const API_ELECTRONICS_PURCHASE_STORE_URL =API_BASE_URL + '/electronics/purchase/store';
export const API_ELECTRONICS_PURCHASE_EDIT_URL =API_BASE_URL + '/electronics/purchase/edit';
export const API_ELECTRONICS_PURCHASE_UPDATE_URL =API_BASE_URL + '/electronics/purchase/update';

// Trading Sales Route
export const API_TRADING_SALES_STORE_URL =  API_BASE_URL + '/trading/sales/api-store';
export const API_TRADING_SALES_EDIT_URL =  API_BASE_URL + '/trading/sales/api-edit';
export const API_TRADING_SALES_UPDATE_URL =  API_BASE_URL + '/trading/sales/api-update';

// Trading Sales Route
export const API_ELECTRONICS_SALES_STORE_URL = API_BASE_URL + '/electronics/sales/store';
export const API_ELECTRONICS_SALES_EDIT_URL = API_BASE_URL + '/electronics/sales/edit';
export const API_ELECTRONICS_SALES_UPDATE_URL = API_BASE_URL + '/electronics/sales/update';

//
export const API_CONSTRUCTION_DDL_LABOUR_URL =  API_BASE_URL + '/construction/ddl/labour-list';
// Purchase Route
export const API_CONSTRUCTION_LABOUR_STORE_URL =API_BASE_URL + '/construction/labour/api-store';
export const API_CONSTRUCTION_LABOUR_EDIT_URL =API_BASE_URL + '/construction/labour/api-edit';
export const API_CONSTRUCTION_LABOUR_UPDATE_URL =API_BASE_URL + '/construction/labour/api-update';

// Orders Route
export const API_ORDERS_DDL_URL = API_BASE_URL + '/invoice/order/search';
export const API_ORDERS_LIST_URL = API_BASE_URL + '/invoice/order/list';
export const API_ORDERS_STORE_URL = API_BASE_URL + '/invoice/order/store';
export const API_ORDERS_AVERAGE_URL = API_BASE_URL + '/invoice/order/avg-price';

// Day Close Route
export const API_DAYCLOSE_STORE_URL = API_BASE_URL + '/admin/dayclose';

// Contact Details Route
export const API_CONTACT_DETAILS_LIST_URL = API_BASE_URL + '/contact/details';
export const API_STORE_CUSTOMER_URL = API_BASE_URL + '/contact/store';

// Area Route
export const API_DDL_AREA_LIST_URL = API_BASE_URL + '/area/ddl-list';

// Image Upload Route
// /admin/voucher/upload/{id}

export const API_IMAGE_UPLOAD_URL = API_BASE_URL + '/admin/voucher/upload/';
export const API_BULK_IMAGE_UPLOAD_URL = API_BASE_URL + '/admin/bulk-image/upload';

// User management Routes
export const API_GET_ROLES_URL = API_BASE_URL + '/role/role-list';
export const API_ROLE_STORE_URL = API_BASE_URL + '/role/create/new';
export const API_GET_PERMISSIONS_URL = API_BASE_URL + '/role/permission-list';
export const API_GET_SELECTED_PERMISSIONS_URL = API_BASE_URL + '/role/selected-permissions';
export const API_UPDATE_ROLE_PERMISSIONS_URL = API_BASE_URL + '/role/role-permission-assign';

// Voucher Approval Routes
export const API_VOUCHER_APPROVAL_STORE_URL = API_BASE_URL + '/admin/voucher/voucher-approval-all';

export const API_VOUCHER_APPROVAL_REMOVE_URL = API_BASE_URL + '/admin/voucher/remove-approval';
export const API_VOUCHER_TYPE_CHANGE_STORE_URL = API_BASE_URL + '/admin/voucher/voucher-type-change';
export const API_VOUCHER_TYPE_URL = API_BASE_URL + '/settings/voucher-types';

export const API_VOUCHER_DATE_CHANGE_URL = API_BASE_URL + '/admin/voucher/date-change';

// Image Upload Route
export const API_VOUCHER_IMAGE_FOR_UPLOAD_URL = API_BASE_URL + '/admin/voucher-list/for-image-upload';

// Customer Routes
export const API_CUSTOMER_LOGIN_URL = API_CUSTOMER_BASE_URL + '/login';
export const API_CUSTOMER_AUTH_CHECK_URL = API_CUSTOMER_BASE_URL + '/me';


// Employee Routes
export const API_EMPLOYEE_DDL_LIST_URL = API_BASE_URL + '/hrms/employee/ddl-list';



// Labour Ledger Routes
export const API_LABOUR_LEDGER_URL = API_BASE_URL + '/reports/labour/ledger';
export const API_LABOUR_ITEMS_URL = API_BASE_URL + '/labour/items';