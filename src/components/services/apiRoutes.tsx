// Hosting Server host setup
// REACT_MAIN_HOST
// {
// "kpsnew": "accounts.kps.cashbookbd.com",
//  "gmenterprise": "accounts.gme.cashbookbd.com",
//  "cashbookbd_accounts_krf": "accounts.krf.cashbookbd.com",
//  "accountsmbdpp": "accounts.mbdpp.cashbookbd.com",
//  "accounts_nibirnirman": "accounts.nibirnirman.cashbookbd.com",
//  "accounts_rmr": "accounts.rmr.cashbookbd.com",
//  "accountsscn": "accounts.scn.cashbookbd.com",
//  "accounts_sinthia": "accounts.sinthia.cashbookbd.com"
// }



// REACT_MAIN_REMOTE_DIR
// {
// "kpsnew": "/home/cashbookbd_accounts/htdocs/accounts.kps.cashbookbd.com/",
// "gmenterprise": "/home/accounts_gme/htdocs/accounts.gme.cashbookbd.com/",
// "cashbookbd_accounts_krf": "/home/cashbookbd_accounts_krf/htdocs/accounts.krf.cashbookbd.com/",
// "accountsmbdpp": "/home/accountsmbdpp/htdocs/accounts.mbdpp.cashbookbd.com/",
// "accounts_nibirnirman": "/home/accounts_nibirnirman/htdocs/accounts.nibirnirman.cashbookbd.com/",
// "accounts_rmr": "/home/accounts_rmr/htdocs/accounts.rmr.cashbookbd.com/",
// "accountsscn": "/home/accountsscn/htdocs/accounts.scn.cashbookbd.com/",
// "accounts_sinthia": "/home/accounts_sinthia/htdocs/accounts.sinthia.cashbookbd.com/"
// }

// REACT_MAIN_API_URLS 
// {
// "kpsnew": "https://kpsnew.cashbookbd.com",
//  "gmenterprise": "https://gmenterprise.cashbookbd.com",
//  "cashbookbd_accounts_krf": "https://krf.cashbookbd.com",
//  "accountsmbdpp": "https://mbdpp.cashbookbd.com",
//  "accounts_nibirnirman": "https://nibirnirman.cashbookbd.com",
//  "accounts_rmr": "https://rmrs.cashbookbd.com",
//  "accountsscn": "https://sonycybernet.cashbookbd.com",
//  "accounts_sinthia": "https://sinthia.cashbookbd.com"
// }


//  "newnibirnirman": "/home/newnibirnirman/htdocs/nibirnirman.cashbookbd.com",
// "kpshostingusr": "/home/kpshostingusr/htdocs/kpsnew.cashbookbd.com",

// LARAVEL_MAIN_ROOT_PATHS 
// {
//  "cashbookbd-gme": "/home/cashbookbd-gme/htdocs/gmenterprise.cashbookbd.com",
//  "cashbookbdkrf": "/home/cashbookbdkrf/htdocs/krf.cashbookbd.com",
//  "cashbookbdmbdpp": "/home/cashbookbdmbdpp/htdocs/mbdpp.cashbookbd.com",
//  "cashbookbdrmr": "/home/cashbookbdrmr/htdocs/rmr.cashbookbd.com",
//  "sonycybernet": "/home/sonycybernet/htdocs/sonycybernet.cashbookbd.com",
//  "admin_sinthiacb": "/home/admin_sinthiacb/htdocs/sinthia.cashbookbd.com"
// }



// export const API_BASE_URLs = import.meta.env.VITE_API_URL;


// export const API_REMOTE_URL = 'https://sonycybernet.cashbookbd.com';
// export const API_REMOTE_URL = 'https://rmrs.cashbookbd.com';
// export const API_REMOTE_URL = 'https://mbdpp.cashbookbd.com';
// export const API_REMOTE_URL = 'http://127.0.0.1:8000';
// export const API_REMOTE_URL = 'https://staging.cashbookbd.com';
// export const API_REMOTE_URL = 'http://cashbook_api.test';
// export const API_REMOTE_URL = 'https://krf.cashbookbd.com';
// export const API_REMOTE_URL = 'https://mikdad.cashbookbd.com';
// export const API_REMOTE_URL = 'https://kpsnew.cashbookbd.com';
// export const API_REMOTE_URL = 'https://sinthia.cashbookbd.com';
// export const API_REMOTE_URL = 'https://nibirnirman.cashbookbd.com';
// export const API_REMOTE_URL = 'https://gme.cashbookbd.com';
// export const API_REMOTE_URL  = import.meta.env.VITE_API_BASE_URL;

// let API_REMOTE_URLs = window.location.origin;

// const localHosts = ['localhost', '127.0.0.1', 'cashbook_api.test'];

// if (localHosts.includes(window.location.hostname)) {
//   API_REMOTE_URL = 'http://cashbook_api.test';
// }

// export { API_REMOTE_URL };

// export const API_REMOTE_URL = import.meta.env.VITE_API_URL;



// export const API_CSRF_COOKIES = `${API_BASE_URL}sanctum/csrf-cookie`;

// export const API_LOGIN_URL = `${API_REMOTE_URL}api/user/login`;
// export const API_LOGOUT_URL = `${API_BASE_URL}api/user/logout`;
// export const API_SIGNUP_URL = `${API_BASE_URL}api/user/signup`;

// export const API_REMOTE_URL = 'https://nibirnirman.cashbookbd.com';
const RUNTIME_API_HOST_OVERRIDES: Record<string, string> = {
  'app.cashbookbd.com': 'https://my.cashbookbd.com',
};

const resolveApiRemoteUrl = (): string => {
  if (typeof window !== 'undefined') {
    const runtimeOverride = RUNTIME_API_HOST_OVERRIDES[window.location.hostname];
    if (runtimeOverride) return runtimeOverride;
  }

  return import.meta.env.VITE_API_URL;
};

export const API_REMOTE_URL = resolveApiRemoteUrl();


export const API_CSRF_COOKIES = `${API_REMOTE_URL}/sanctum/csrf-cookie`;
export const API_BASE_URL = `${API_REMOTE_URL}/api`;
export const API_PURCHASE_RETURN_STORE_URL = `${API_BASE_URL}/purchase-return/api-store`;
export const API_SALES_RETURN_STORE_URL = `${API_BASE_URL}/sales-return/api-store`;
// export const API_BASE_URL = API_REMOTE_URL + '/api';
export const API_LOGIN_URL = `${API_BASE_URL}/login`;
export const API_FORGOT_PASSWORD_REQUEST_OTP_URL = `${API_BASE_URL}/forgot-password/request-otp`;
export const API_FORGOT_PASSWORD_VERIFY_OTP_URL = `${API_BASE_URL}/forgot-password/verify-otp`;
export const API_FORGOT_PASSWORD_RESET_URL = `${API_BASE_URL}/forgot-password/reset`;
export const API_REGISTER_REQUEST_OTP_URL = `${API_BASE_URL}/register/request-otp`;
export const API_REGISTER_VERIFY_OTP_URL = `${API_BASE_URL}/register/verify-otp`;
export const API_SUBSCRIPTION_PLANS_URL = `${API_BASE_URL}/subscription/plans`;
export const API_SUBSCRIPTION_CURRENT_URL = `${API_BASE_URL}/subscription/current`;
export const API_SUBSCRIPTION_PAYMENT_HISTORY_URL = `${API_BASE_URL}/subscription/payments`;
export const API_SUBSCRIPTION_PAYMENT_SUBMIT_URL = `${API_BASE_URL}/subscription/manual-payment`;
export const API_SUBSCRIPTION_ADMIN_OVERVIEW_URL = `${API_BASE_URL}/admin/subscription/overview`;
export const API_SUBSCRIPTION_ADMIN_COMPANIES_URL = `${API_BASE_URL}/admin/subscription/companies`;
export const API_SUBSCRIPTION_ADMIN_TENANTS_URL = `${API_BASE_URL}/admin/subscription/tenant-subscriptions`;
export const API_SUBSCRIPTION_ADMIN_PAYMENTS_URL = `${API_BASE_URL}/admin/subscription/payment-requests`;
export const API_SUBSCRIPTION_ADMIN_APPROVE_PAYMENT_URL = `${API_BASE_URL}/admin/subscription/payments`;
export const API_SUBSCRIPTION_ADMIN_ASSIGN_URL = `${API_BASE_URL}/admin/subscription/assign`;
export const API_SUBSCRIPTION_ADMIN_PLANS_URL = `${API_BASE_URL}/admin/subscription/plans`;
export const API_RESELLER_ADMIN_BASE_URL = `${API_BASE_URL}/admin/resellers`;
export const API_RESELLER_ADMIN_OVERVIEW_URL = `${API_RESELLER_ADMIN_BASE_URL}/overview`;
export const API_RESELLER_ADMIN_COMPANIES_URL = `${API_RESELLER_ADMIN_BASE_URL}/companies`;
export const API_RESELLER_ADMIN_PAYMENTS_URL = `${API_RESELLER_ADMIN_BASE_URL}/payments`;
export const API_RESELLER_ADMIN_COMMISSION_LEDGERS_URL = `${API_RESELLER_ADMIN_BASE_URL}/commission-ledgers`;
export const API_RESELLER_ADMIN_PAY_COMMISSION_URL = `${API_RESELLER_ADMIN_BASE_URL}/pay-commission`;
export const API_RESELLER_ADMIN_ASSIGN_COMPANY_URL = `${API_RESELLER_ADMIN_BASE_URL}/assign-company`;
export const API_RESELLER_DASHBOARD_URL = `${API_BASE_URL}/reseller/dashboard`;
export const API_RESELLER_COMPANIES_URL = `${API_BASE_URL}/reseller/companies`;
export const API_RESELLER_PAYMENTS_URL = `${API_BASE_URL}/reseller/payments`;
export const API_RESELLER_COMMISSION_LEDGERS_URL = `${API_BASE_URL}/reseller/commission-ledgers`;
// export const API_LOGIN_URL = API_BASE_URL + '/login';
export const API_LOGOUT_URL = `${API_BASE_URL}/logout`;
export const API_DEVICES_URL = `${API_BASE_URL}/devices`;
export const API_DEVICE_REVOKE_URL = `${API_BASE_URL}/devices`; // + /{tokenId}
export const API_LOGIN_RELEASE_DEVICE_URL = `${API_BASE_URL}/login/release-device`;
// export const API_LOGOUT_URL = API_BASE_URL + '/logout';
export const API_AUTH_CHECK_URL = `${API_BASE_URL}/me`;
// export const API_AUTH_CHECK_URL = API_BASE_URL + '/me';
export const API_NOTIFICATION_SUMMARY_URL = `${API_BASE_URL}/notifications/summary`;
export const API_NOTIFICATION_DISMISS_URL = `${API_BASE_URL}/notifications/dismiss`;

// Customer
export const API_CUSTOMER_BASE_URL = `${API_BASE_URL}/customer`;
export const API_CUSTOMER_FROM_UI_URL = `${API_BASE_URL}/contact/customer/update/ui/`;
// Drops the opening balance and sends its journal voucher to the trash.
export const API_CUSTOMER_OPENING_DELETE_URL = `${API_BASE_URL}/contact/customer/opening-balance/delete/`;

// Settings url
export const API_APP_SETTING_URL = `${API_BASE_URL}/settings/get-settings`;
export const API_APP_BRANCH_SETTING_URL = `${API_BASE_URL}/settings/get-branch-settings`;
export const API_APP_SETTING_VOCHER_TYPE_URL = `${API_BASE_URL}/settings/voucher-types`;
export const API_SERVICE_LIST_URL = `${API_BASE_URL}/settings/service-list`;
export const API_SOFTWARE_INFO_URL = `${API_BASE_URL}/settings/software-info`;
export const API_SOFTWARE_INFO_UPDATE_URL = `${API_BASE_URL}/settings/software-info/update`;

// dashboard Routes
export const API_DASHBOARD_URL = `${API_BASE_URL}/dashboard/data`;
export const API_DASHBOARD_SUMMARY_URL = `${API_BASE_URL}/dashboard/summary`;
export const API_BRANCH_TRANSACTION_CHART_URL = `${API_BASE_URL}/dashboard/branch/transaction-chart-data`;
export const API_BRANCH_PURCHASE_SALES_CHART_URL = `${API_BASE_URL}/dashboard/branch/monthly-purchase-sales`;
export const API_HEAD_OFFICE_PAYMENT_CHART_URL = `${API_BASE_URL}/dashboard/head-office/payment/transaction-chart-data`;
export const API_HEAD_OFFICE_RECEIVED_CHART_URL = `${API_BASE_URL}/dashboard/head-office/received/transaction-chart-data`;
export const API_RECEIVED_REMITTANCE_URL = `${API_BASE_URL}/accounts/payment/specific-item`;
// API_PROJECT_RECEIVED_CHART_URL


// Charts
export const API_ITEM_COMPARE_CHART_URL = `${API_BASE_URL}/dashboard/branch/transaction-compare`;



// User Routes
export const API_USER_LIST_URL = `${API_BASE_URL}/user/user-list`;
export const API_ONLINE_USERS_URL = `${API_BASE_URL}/user/online-users`;
// Login history: who signed in, when, and from where.
export const API_USER_LOGIN_LOG_URL = `${API_BASE_URL}/user/login-log`;
export const API_USER_ADD_URL = `${API_BASE_URL}/user/add-user`;
export const API_USER_STORE_URL = `${API_BASE_URL}/user/store`;
export const API_USER_EDIT_URL = `${API_BASE_URL}/user/user-edit/`;
export const API_USER_TEMPORARY_PASSWORD_URL = `${API_BASE_URL}/user/temporary-password/`;
export const API_USER_DASHBOARD_PREFERENCES_URL = `${API_BASE_URL}/user/dashboard-preferences`;
export const API_USER_UPDATE_URL = `${API_BASE_URL}/user/user-update`;
export const API_USER_TOGGLE_STATUS_URL = `${API_BASE_URL}/user/toggle-status`;
export const API_USER_CHECK = `${API_BASE_URL}/user/user-check`;
export const API_PROFILE_PHOTO_URL = `${API_BASE_URL}/user/profile-photo`;
export const API_PROFILE_COVER_URL = `${API_BASE_URL}/user/profile-cover`;

// Admin Notifications (platform admin broadcasts)
export const API_ADMIN_NOTIFICATIONS_URL = `${API_BASE_URL}/admin/notifications`;

// Inventory System lookup (platform admin CRUD + open ddl for branch settings)
export const API_ADMIN_INVENTORY_SYSTEMS_URL = `${API_BASE_URL}/admin/inventory-systems`;
export const API_INVENTORY_SYSTEMS_DDL_URL = `${API_BASE_URL}/inventory-systems/ddl`;
// Editing the walkthrough links. Reading them needs no endpoint -- the settings
// payload already carries the screen_key -> url map every screen looks up.
export const API_ADMIN_TUTORIAL_VIDEOS_URL = `${API_BASE_URL}/admin/tutorial-videos`;

// Highlight Rules (platform admin CRUD + open active list the reports apply)
export const API_ADMIN_HIGHLIGHT_RULES_URL = `${API_BASE_URL}/admin/highlight-rules`;
export const API_HIGHLIGHT_RULES_ACTIVE_URL = `${API_BASE_URL}/highlight-rules/active`;

// Role Routes
export const API_ROLE_LIST_URL = `${API_BASE_URL}/role/role-list`;
export const API_DDL_ROLE_LIST_URL = `${API_BASE_URL}/ddl/role/role-list`;

// Company Routes
export const API_COMPANY_LIST_URL = `${API_BASE_URL}/company/company-list`;
export const API_COMPANY_EDIT_URL = `${API_BASE_URL}/company/company-edit/`;
export const API_COMPANY_UPDATE_URL = `${API_BASE_URL}/company/company-update`;

// Branch Routes
export const API_USER_CURRENT_BRANCH_URL = `${API_BASE_URL}/user/current-branch`;
export const API_BRANCH_LIST_URL = `${API_BASE_URL}/branch/branch-list`;
export const API_BRANCH_EDIT_URL = `${API_BASE_URL}/branch/branch-edit/`;
export const API_BRANCH_UPDATE_URL = `${API_BASE_URL}/branch/branch-update`;
export const API_BRANCH_STORE_URL = `${API_BASE_URL}/branch/branch-store`;
export const API_BRANCH_CLEAR_OPENING_URL = `${API_BASE_URL}/branch/clear-opening`;
export const API_BRANCH_CLEAR_TRANSACTION_URL = `${API_BASE_URL}/branch/clear-transaction`;
export const API_BRANCH_STATUS_URL = `${API_BASE_URL}/branch/branch-status`;
export const API_SEND_SMS_URL = `${API_BASE_URL}/admin/sms/sent-list`;
export const API_SMS_TEMPLATE_LIST_URL = `${API_BASE_URL}/admin/sms/templates`;
export const API_SMS_TEMPLATE_DETAILS_URL = `${API_BASE_URL}/admin/sms/templates/`;
export const API_SMS_TEMPLATE_STORE_URL = `${API_BASE_URL}/admin/sms/templates/store`;
export const API_SMS_TEMPLATE_UPDATE_URL = `${API_BASE_URL}/admin/sms/templates/update/`;
export const API_SMS_TEMPLATE_PREVIEW_URL = `${API_BASE_URL}/admin/sms/templates/preview`;

export const API_ALL_DDL_BRANCH_URL = `${API_BASE_URL}/branch/ddl/all-branch`;
export const API_ALL_DDL_PROTECTED_BRANCH_URL = `${API_BASE_URL}/branch/ddl/protected-branch`;

// Warehouse Routes
export const ACTIVE_WAREHOUSE_DDL_URL = `${API_BASE_URL}/active/warehouse`;
export const API_BRANCH_TRANSFER_LIST_URL = `${API_BASE_URL}/warehouse/transfer/list`;
export const API_BRANCH_TRANSFER_DETAILS_URL = `${API_BASE_URL}/warehouse/transfer/details/`;
export const API_BRANCH_TRANSFER_COMPARISON_URL = `${API_BASE_URL}/warehouse/transfer/comparison/`;
export const API_BRANCH_TRANSFER_DESTROY_URL = `${API_BASE_URL}/warehouse/transfer/destroy/`;
export const API_BRANCH_TRANSFER_UPDATE_URL = `${API_BASE_URL}/warehouse/transfer/update/`;
export const API_BRANCH_RECEIVED_LIST_URL = `${API_BASE_URL}/warehouse/received/list`;
export const API_BRANCH_TRANSFER_STORE_URL = `${API_BASE_URL}/warehouse/transfer/issue`;
export const API_BRANCH_RECEIVED_STORE_URL = `${API_BASE_URL}/warehouse/transfer/receive`;

// Material Issue Routes
export const API_MATERIAL_ISSUE_LIST_URL = `${API_BASE_URL}/material-issue/list`;
export const API_MATERIAL_ISSUE_DETAILS_URL = `${API_BASE_URL}/material-issue/details`;
export const API_MATERIAL_ISSUE_STORE_URL = `${API_BASE_URL}/material-issue/store`;

// Chart of Accounts
// COAL1
export const API_COAL1_LIST_URL = `${API_BASE_URL}/coal1/coal1-list`;

// COAL2
export const API_COAL2_LIST_URL = `${API_BASE_URL}/coal2/coal2-list`;

// COAL3
export const API_COAL3_LIST_URL = `${API_BASE_URL}/coal3/coal3-list`;

// COAL4
export const API_COAL4_LIST_URL = `${API_BASE_URL}/coal4/coal4-list`;
export const API_COAL4_DDL_URL = `${API_BASE_URL}/chart_of_accounts/ddl/l4-list`;

// Reports
// Ledger url
export const API_REPORT_LEDGER_URL = `${API_BASE_URL}/reports/api-ledger`;

// Purchase Ledger url
export const API_REPORT_PURCHASE_LEDGER_URL = `${API_BASE_URL}/reports/purchase/ledger`;
// Sales Ledger url
export const API_REPORT_SALES_LEDGER_URL = `${API_BASE_URL}/reports/sales/ledger`;

// Names the driver on a sale before its delivery challan is printed. Writes
// two columns the accounts never read, so it is allowed to whoever may open
// the ledger rather than to whoever may edit a sale.
export const API_SALES_CHALLAN_DRIVER_URL = `${API_BASE_URL}/sales/challan-driver`;
// The challan itself, rendered. Trailing slash: the raw main_trx_id goes on
// the end. HTML rather than PDF -- the template lays out with flexbox and
// pulls Bootstrap from a CDN, neither of which DomPDF does, so a PDF of it
// would be a working download of a broken-looking paper.
export const API_SALES_CHALLAN_URL = `${API_BASE_URL}/sales/challan/`;
// The same challan as data rather than as a rendered page, so the React
// renderer can lay it out the way the branch's saved template says. Trailing
// slash: the raw main_trx_id goes on the end.
export const API_SALES_CHALLAN_DATA_URL = `${API_BASE_URL}/sales/challan-data/`;

// A branch's saved print layout. GET `${url}/{docType}?branch_id=` reads one,
// POST writes one, DELETE puts the branch back on the built-in default.
export const API_PRINT_TEMPLATE_URL = `${API_BASE_URL}/print-templates`;

// Stock Product url
export const API_REPORT_PRODUCT_STOCK_URL = `${API_BASE_URL}/reports/product-stock`;
export const API_REPORT_BRANCH_TRANSFER_URL = `${API_BASE_URL}/reports/branch-transfer`;
export const API_REPORT_BRANCH_RECEIVE_URL = `${API_BASE_URL}/reports/branch-receive`;
export const API_REPORT_BRANCH_STOCK_URL = `${API_BASE_URL}/reports/branch-stock`;
export const API_REPORT_CLOSING_STOCK_URL = `${API_BASE_URL}/reports/closing-stock`;
export const API_REPORT_STOCK_IMEI_DATA_URL = `${API_BASE_URL}/reports/stock-imei-data`;

// Categories Wise Products In Out of Stock url
export const API_REPORT_CAT_IN_OUT_URL = `${API_BASE_URL}/reports/category-wise-in-out`;

// Cash Book url
export const API_REPORT_CASHBOOK_URL = `${API_BASE_URL}/reports/cashbook`;
export const API_REPORT_BANKBOOK_URL = `${API_BASE_URL}/reports/bankbook`;
export const API_REPORT_CASH_BANK_RECEIVED_PAYMENT_URL = `${API_BASE_URL}/reports/cash-bank-received-payment`;
export const API_REPORT_GROUP_DATA_URL = `${API_BASE_URL}/reports/group/report/data`;
export const API_REPORT_GROUP_SETUP_URL = `${API_BASE_URL}/reports/group-report/setup`;

// Profit Loss url
export const API_REPORT_PROFIT_LOSS_URL = `${API_BASE_URL}/reports/profit-loss`;
export const API_REPORT_PROFIT_LOSS_EXPENSE_SUMMARY_URL = `${API_BASE_URL}/reports/profit-loss-expense-summary`;
export const API_REPORT_PRODUCT_PROFIT_LOSS_URL = `${API_BASE_URL}/reports/product-profit-loss`;
export const API_REPORT_PRODUCT_LEDGER_DATA_URL = `${API_BASE_URL}/reports/product-ledger-data`;
export const API_REPORT_DATE_WISE_IN_OUT_URL = `${API_BASE_URL}/reports/in-out/date-wise/data`;
export const API_REPORT_DATE_WISE_IN_OUT_DETAILS_URL = `${API_BASE_URL}/reports/in-out/date-wise/details`;
// Balance Sheet url
export const API_REPORT_BALANCE_SHEET_URL = `${API_BASE_URL}/reports/balance-sheet`;
export const API_REPORT_BANK_INFORMATION_DATA_URL = `${API_BASE_URL}/reports/bank-information-data`;
export const API_REPORT_CONNECTED_MEMBER_DATA_URL = `${API_BASE_URL}/reports/connected-member-data`;
// Trial Balance Group url
export const API_REPORT_TRIAL_BALANCE_LEVEL3_URL = `${API_BASE_URL}/reports/trialbalance-level3`;
// Trial Balance Details url
export const API_REPORT_TRIAL_BALANCE_LEVEL4_URL = `${API_BASE_URL}/reports/trialbalance-level4`;
// Expense Report url
export const API_REPORT_EXPENSE_URL = `${API_BASE_URL}/reports/expense-report`;
// Expense Report details url
export const API_REPORT_EXPENSE_DETAILS_URL = `${API_BASE_URL}/reports/expense-report-details`;
// Cash Book url
export const API_REPORT_DUE_LIST_URL = `${API_BASE_URL}/reports/duelist`;
export const API_REPORT_CUSTOMER_SUPPLIER_STATEMENT_URL = `${API_BASE_URL}/reports/ledger-with-product`;
// Company & Product-wise financial tracking
export const API_PRODUCT_TRACKING_SETTINGS_URL = `${API_BASE_URL}/product-tracking/settings`;
export const API_PRODUCT_TRACKING_AVAILABLE_PRODUCTS_URL = `${API_BASE_URL}/product-tracking/available-products`;
export const API_PRODUCT_TRACKING_PRODUCTS_URL = `${API_BASE_URL}/product-tracking/products`;
export const API_PRODUCT_FINANCIAL_STATEMENT_URL = `${API_BASE_URL}/reports/product-financial-statement`;
export const API_PRODUCT_TRACKING_SUMMARY_URL = `${API_BASE_URL}/reports/product-tracking-summary`;
// Date Wise Report url
export const API_DATE_WISE_TOTAL_URL = `${API_BASE_URL}/reports/date-wise-total-data`;
export const API_SOMITY_COLLECTION_SHEET_URL = `${API_BASE_URL}/somity-report/collection-sheet`;
export const API_SOMITY_MONTHLY_REPORT_DATA_URL = `${API_BASE_URL}/somity-report/monthly-report/data`;

// Mitch Match url
export const API_REPORT_MITCH_MATCH_URL = `${API_BASE_URL}/reports/mitch-match/data`;
// HRMS Mismatch Payment url
export const API_REPORT_HRM_MISMATCH_PAYMENT_URL = `${API_BASE_URL}/reports/hrm-mismatch-payment/data`;
export const API_REPORT_HRM_MISMATCH_PAYMENT_DELETE_URL = `${API_BASE_URL}/reports/hrm-mismatch-payment/delete`;

// Chart of Accounts
export const API_CHART_OF_ACCOUNTS_L1_URL = `${API_BASE_URL}/coal1/coal1-list`;
export const API_CHART_OF_ACCOUNTS_L2_URL = `${API_BASE_URL}/coal2/coal2-list`;
export const API_CHART_OF_ACCOUNTS_L3_URL = `${API_BASE_URL}/coal3/coal3-list`;
export const API_CHART_OF_ACCOUNTS_L3_STORE_URL = `${API_BASE_URL}/coal3/store`;
export const API_CHART_OF_ACCOUNTS_L3_UPDATE_URL = `${API_BASE_URL}/coal3/update`;
export const API_CHART_OF_ACCOUNTS_DDL_L3_URL = `${API_BASE_URL}/chart_of_accounts/ddl/l3-list`;
export const API_COAL3_ID_BY_L4_URL = `${API_BASE_URL}/coal3/l4-list/`;
export const API_CHART_OF_ACCOUNTS_BY_ID_L3_URL = `${API_BASE_URL}/coal3/`;
export const API_CHART_OF_ACCOUNTS_L4_URL = `${API_BASE_URL}/coal4/coal4-list`;
export const API_CHART_OF_ACCOUNTS_L4_STORE_URL = `${API_BASE_URL}/coal4/store`;
export const API_CHART_OF_ACCOUNTS_L4_UPDATE_URL = `${API_BASE_URL}/coal4/update`;
export const API_CHART_OF_ACCOUNTS_DDL_L4_URL = `${API_BASE_URL}/chart_of_accounts/ddl/l4-list`;
export const API_CHART_OF_ACCOUNTS_BY_ID_L4_URL = `${API_BASE_URL}/coal4/`;

// Opening balances for the money accounts -- cash, banks, mobile banking.
// Deliberately not part of the COA L4 screen: most of the chart is expense and
// sales heads, which open at nothing.
export const API_ACCOUNT_OPENING_LIST_URL = `${API_BASE_URL}/account/opening-balance/list`;
export const API_ACCOUNT_OPENING_UPDATE_URL = `${API_BASE_URL}/account/opening-balance/update/`;
export const API_ACCOUNT_OPENING_DELETE_URL = `${API_BASE_URL}/account/opening-balance/delete/`;


// Cash Received url
export const API_CASH_RECEIVED_URL = `${API_BASE_URL}/trading/cash/received`;
export const API_CASH_RECEIVED_EDIT_URL = `${API_BASE_URL}/trading/cash/received/api-edit`;
export const API_CASH_RECEIVED_UPDATE_URL = `${API_BASE_URL}/trading/cash/received/api-update`;
export const API_CASH_RECEIVED_SUGGESTIONS_URL = `${API_BASE_URL}/cash/remarks/suggestions`;
export const API_HEAD_OFFICE_CASH_RECEIVED_STORE_URL = `${API_BASE_URL}/accounts/received`;
export const API_HEAD_OFFICE_CASH_RECEIVED_EDIT_URL = `${API_BASE_URL}/accounts/received/api-edit`;
export const API_HEAD_OFFICE_CASH_RECEIVED_UPDATE_URL = `${API_BASE_URL}/accounts/received/api-update`;
export const API_HEAD_OFFICE_CASH_RECEIVED_APPROVE_URL = `${API_BASE_URL}/accounts/voucher/approved`;

// Cash Payment url
export const API_CASH_PAYMENT_STORE_URL = `${API_BASE_URL}/trading/cash/payment`;
export const API_CASH_PAYMENT_EDIT_URL = `${API_BASE_URL}/trading/cash/payment/api-edit`;
export const API_CASH_PAYMENT_UPDATE_URL = `${API_BASE_URL}/trading/cash/payment/api-update`;
export const API_HEAD_OFFICE_CASH_PAYMENT_STORE_URL = `${API_BASE_URL}/accounts/payment`;
export const API_HEAD_OFFICE_CASH_PAYMENT_EDIT_URL = `${API_BASE_URL}/accounts/payment/api-edit`;
export const API_HEAD_OFFICE_CASH_PAYMENT_UPDATE_URL = `${API_BASE_URL}/accounts/payment/api-update`;

// Journal url
export const API_JOURNAL_STORE_URL = `${API_BASE_URL}/accounts/journal/store`;


// Bank Received url
export const API_BANK_RECEIVED_URL = `${API_BASE_URL}/general/bank/received`;
export const API_BANK_GENERAL_EDIT_URL = `${API_BASE_URL}/general/bank/general/edit`;
export const API_BANK_GENERAL_UPDATE_URL = `${API_BASE_URL}/general/bank/update`;
export const API_BANK_RECEIVED_LIST_URL = `${API_BASE_URL}/general/bank/received/list`;


// Bank Payment url
export const API_BANK_PAYMENT_URL = `${API_BASE_URL}/general/bank/payment`;
export const API_BANK_PAYMENT_EDIT_URL = `${API_BASE_URL}/general/bank/payment/edit`;
export const API_BANK_PAYMENT_UPDATE_URL = `${API_BASE_URL}/general/bank/payment/update`;
export const API_BANK_PAYMENT_LIST_URL = `${API_BASE_URL}/general/bank/payment/list`;



// Real Estate Area url
export const API_AREA_SAVE_URL = `${API_BASE_URL}/real-estate/area/store`;
export const API_AREA_EDIT_URL = `${API_BASE_URL}/real-estate/area/edit`;
export const API_AREA_UPDATE_URL = `${API_BASE_URL}/real-estate/area/update`;
export const API_AREA_DELETE_URL = `${API_BASE_URL}/real-estate/area/delete`;
export const API_AREA_LIST_URL = `${API_BASE_URL}/real-estate/area/list`;
export const API_AREA_DDL_URL = `${API_BASE_URL}/real-estate/project-areas/ddl`;


// Installment url
export const API_INSTALLMENT_LIST_URL = `${API_BASE_URL}/accounts/installment/details`;
export const API_FILTER_INSTALLMENT_LIST_URL = `${API_BASE_URL}/accounts/installment/filter`;
export const API_EMPLOYEES_INSTALLMENT_LIST_URL = `${API_BASE_URL}/accounts/installment/employees`;
export const API_INSTALLMENT_DETAILS_BY_ID_URL = `${API_BASE_URL}/accounts/installment/details`;
export const API_INSTALLMENT_RECEIVED_URL = `${API_BASE_URL}/accounts/installment/received`;
export const API_INSTALLMENT_EARLY_PAYMENT_APPLY_URL = `${API_BASE_URL}/accounts/installment/early-payment/apply`;

// Products Route
export const API_PRODUCT_LIST_URL = `${API_BASE_URL}/product/product-list`;
export const API_PRODUCT_DDL_LIST_URL = `${API_BASE_URL}/product/ddl/list`;
export const API_PRODUCT_LOW_STOCK_URL = `${API_BASE_URL}/product/low-stock`;
export const API_PRODUCT_NEGATIVE_STOCK_URL = `${API_BASE_URL}/product/negative-stock`;
export const API_PRODUCT_SLOW_MOVING_URL = `${API_BASE_URL}/product/slow-moving`;
export const API_PRODUCT_WAREHOUSE_DIFFERENCE_URL = `${API_BASE_URL}/product/warehouse-difference`;
export const API_PRODUCT_ADD_URL = `${API_BASE_URL}/product/add-product`;
export const API_PRODUCT_STORE_URL = `${API_BASE_URL}/product/store`;
export const API_PRODUCT_EDIT_URL = `${API_BASE_URL}/product/product-edit/`;
export const API_PRODUCT_UPDATE_URL = `${API_BASE_URL}/product/update`;
export const API_PRODUCT_CHECK = `${API_BASE_URL}/product/product-check`;
export const API_PRODUCT_UPDATE_BY_RATE_URL = `${API_BASE_URL}/product/update-qty-rate`;
// Drops the opening stock and sends its voucher to the trash.
export const API_PRODUCT_OPENING_DELETE_URL = `${API_BASE_URL}/product/opening/delete`;
export const API_PRODUCT_DELETE_URL = `${API_BASE_URL}/product/delete`;


// Brand Route
export const API_BRAND_LIST_URL = `${API_BASE_URL}/product/brand/list`;
export const API_BRAND_SAVE_URL = `${API_BASE_URL}/product/brand/store`;
export const API_BRAND_EDIT_URL = `${API_BASE_URL}/product/brand/edit`;
export const API_BRAND_UPDATE_URL = `${API_BASE_URL}/product/brand/update`;
export const API_BRAND_DDL_URL = `${API_BASE_URL}/product/brand/ddl`;
export const API_BRAND_DELETE_URL = `${API_BASE_URL}/product/brand/delete/`;

// Product Unit Route
export const API_PRODUCT_UNIT_LIST_URL = `${API_BASE_URL}/product/unit/list`;
export const API_PRODUCT_UNIT_SAVE_URL = `${API_BASE_URL}/product/unit/store`;
export const API_PRODUCT_UNIT_EDIT_URL = `${API_BASE_URL}/product/unit/edit`;
export const API_PRODUCT_UNIT_UPDATE_URL = `${API_BASE_URL}/product/unit/update`;
export const API_PRODUCT_UNIT_DDL_URL = `${API_BASE_URL}/product/unit/ddl`;
// Category Route
export const API_CATEGORY_DDL_URL = `${API_BASE_URL}/category/category-ddl`;
export const API_CATEGORY_LIST_URL = `${API_BASE_URL}/category/category-list`;
export const API_CATEGORY_ADD_URL = `${API_BASE_URL}/category/add-category`;
export const API_CATEGORY_STORE_URL = `${API_BASE_URL}/category/api-store`;
export const API_CATEGORY_DELETE_URL = `${API_BASE_URL}/category/delete`;
export const API_CATEGORY_EDIT_URL = `${API_BASE_URL}/category/edit/`;
export const API_CATEGORY_UPDATE_URL = `${API_BASE_URL}/category/category-update`;
export const API_CATEGORY_CHECK = `${API_BASE_URL}/category/category-check`;

// Trading Purchase Route
export const API_TRADING_PURCHASE_STORE_URL = `${API_BASE_URL}/trading/purchase/api-store`;
export const API_TRADING_PURCHASE_EDIT_URL = `${API_BASE_URL}/trading/purchase/api-edit`;
export const API_TRADING_PURCHASE_UPDATE_URL = `${API_BASE_URL}/trading/purchase/api-update`;
export const API_TRADING_PURCHASE_SUGGESTIONS_URL = `${API_BASE_URL}/trading/purchase/suggestions`;
export const API_TRADING_COMBINED_STORE_URL = `${API_BASE_URL}/trading/combined/api-store`;
export const API_TRADING_COMBINED_EDIT_URL = `${API_BASE_URL}/trading/combined/api-edit`;
export const API_TRADING_COMBINED_UPDATE_URL = `${API_BASE_URL}/trading/combined/api-update`;
export const API_TRADING_COMBINED_SUGGESTIONS_URL = `${API_BASE_URL}/trading/combined/suggestions`;

// Construction Purchase Route
export const API_CONSTRUCTION_PURCHASE_STORE_URL = `${API_BASE_URL}/construction/purchase/api-store`;
export const API_CONSTRUCTION_PURCHASE_EDIT_URL = `${API_BASE_URL}/construction/purchase/api-edit`;
export const API_CONSTRUCTION_PURCHASE_UPDATE_URL = `${API_BASE_URL}/construction/purchase/api-update`;



// Electronics Purchase Route
export const API_ELECTRONICS_PURCHASE_STORE_URL = `${API_BASE_URL}/electronics/purchase/store`;
export const API_ELECTRONICS_PURCHASE_EDIT_URL = `${API_BASE_URL}/electronics/purchase/edit`;
export const API_ELECTRONICS_PURCHASE_UPDATE_URL = `${API_BASE_URL}/electronics/purchase/update`;

// Trading Sales Route
export const API_TRADING_SALES_STORE_URL = `${API_BASE_URL}/trading/sales/api-store`;
export const API_TRADING_SALES_EDIT_URL = `${API_BASE_URL}/trading/sales/api-edit`;
export const API_TRADING_SALES_UPDATE_URL = `${API_BASE_URL}/trading/sales/api-update`;
export const API_TRADING_SALES_SUGGESTIONS_URL = `${API_BASE_URL}/trading/sales/suggestions`;

// Trading Sales Route
export const API_ELECTRONICS_SALES_STORE_URL = `${API_BASE_URL}/electronics/sales/store`;
export const API_ELECTRONICS_SALES_EDIT_URL = `${API_BASE_URL}/electronics/sales/edit`;
export const API_ELECTRONICS_SALES_UPDATE_URL = `${API_BASE_URL}/electronics/sales/update`;
export const API_ELECTRONICS_SALES_INVOICE_PRINT_URL = `${API_BASE_URL}/electronics/sales/invoice-print`;

//
export const API_CONSTRUCTION_DDL_LABOUR_URL = `${API_BASE_URL}/construction/ddl/labour-list`;
// Purchase Route
export const API_CONSTRUCTION_LABOUR_STORE_URL = `${API_BASE_URL}/construction/labour/api-store`;
export const API_CONSTRUCTION_LABOUR_EDIT_URL = `${API_BASE_URL}/construction/labour/api-edit`;
export const API_CONSTRUCTION_LABOUR_UPDATE_URL = `${API_BASE_URL}/construction/labour/api-update`;

// Orders Route
export const API_ORDERS_DDL_URL = `${API_BASE_URL}/invoice/order/search`;
export const API_ORDERS_LIST_URL = `${API_BASE_URL}/invoice/order/list`;
export const API_ORDERS_TRANSACTION_URL = `${API_BASE_URL}/invoice/order/transaction`;
export const API_ADMIN_ORDERS_TRANSACTION_URL = `${API_BASE_URL}/admin/order/transaction`;
export const API_ORDERS_EDIT_URL = `${API_BASE_URL}/invoice/order/edit/`;
export const API_ORDERS_STORE_URL = `${API_BASE_URL}/invoice/order/store`;
export const API_ORDERS_UPDATE_URL = `${API_BASE_URL}/invoice/order/update`;
export const API_ORDERS_STATUS_URL = `${API_BASE_URL}/invoice/order/status`;
export const API_ORDERS_AVERAGE_URL = `${API_BASE_URL}/invoice/order/avg-price`;

// Day Close Route
export const API_DAYCLOSE_STORE_URL = `${API_BASE_URL}/admin/dayclose`;

// Contact Details Route
export const API_CONTACT_DETAILS_LIST_URL = `${API_BASE_URL}/contact/details`;
export const API_STORE_CUSTOMER_URL = `${API_BASE_URL}/contact/store`;
export const API_CUSTOMER_MOBILE_CHECK_URL = `${API_BASE_URL}/contact/mobile-check`;
export const API_CONTACT_EDIT_URL = `${API_BASE_URL}/contact/edit/`;
export const API_CONTACT_UPDATE_URL = `${API_BASE_URL}/contact/update/`;
export const API_CONTACT_DELETE_URL = `${API_BASE_URL}/contact/delete/`;


// Area Route
export const API_DDL_AREA_LIST_URL = `${API_BASE_URL}/area/ddl-list`;

// Image Upload Route
// /admin/voucher/upload/{id}

export const API_IMAGE_UPLOAD_URL = `${API_BASE_URL}/admin/voucher/upload/`;
export const API_DELETE_VOUCHER_IMAGE_URL = `${API_BASE_URL}/admin/voucher/image/delete/`;
export const API_BULK_IMAGE_UPLOAD_URL = `${API_BASE_URL}/admin/bulk-image/upload`;

// User management Routes
export const API_GET_ROLES_URL = `${API_BASE_URL}/role/role-list`;
export const API_ROLE_STORE_URL = `${API_BASE_URL}/role/create/new`;
export const API_GET_PERMISSIONS_URL = `${API_BASE_URL}/role/permission-list`;
export const API_GET_PERMISSION_GROUPS_URL = `${API_BASE_URL}/role/permission-groups`;
export const API_PERMISSION_STORE_URL = `${API_BASE_URL}/role/permission/create/new`;
export const API_PERMISSION_UPDATE_URL = `${API_BASE_URL}/role/permission/update`;
export const API_GET_SELECTED_PERMISSIONS_URL = `${API_BASE_URL}/role/selected-permissions`;
export const API_UPDATE_ROLE_PERMISSIONS_URL = `${API_BASE_URL}/role/role-permission-assign`;
export const API_OWNER_ROLE_GROUP_URL = `${API_BASE_URL}/admin/owner-role-group`;
export const API_OWNER_ROLE_GROUP_SYNC_URL = `${API_BASE_URL}/admin/owner-role-group/sync`;

// Voucher Approval Routes
export const API_VOUCHER_APPROVAL_STORE_URL = `${API_BASE_URL}/admin/voucher/voucher-approval-all`;

export const API_VOUCHER_APPROVAL_REMOVE_URL = `${API_BASE_URL}/admin/voucher/remove-approval`;
export const API_VOUCHER_APPROVAL_REMOVE_BY_ID_URL = `${API_BASE_URL}/admin/voucher/remove/approval`;

export const API_APPROVAL_CENTER_SUMMARY_URL = `${API_BASE_URL}/approval-center/summary`;
export const API_APPROVAL_CENTER_AUDIT_URL = `${API_BASE_URL}/approval-center/audit`;
export const API_APPROVAL_CENTER_ACTION_URL = `${API_BASE_URL}/approval-center/action`;
export const API_VOUCHER_TYPE_CHANGE_STORE_URL = `${API_BASE_URL}/admin/voucher/voucher-type-change`;
export const API_VOUCHER_TYPE_URL = `${API_BASE_URL}/settings/voucher-types`;

export const API_VOUCHER_DATE_CHANGE_URL = `${API_BASE_URL}/admin/voucher/date-change`;

// Image Upload Route
export const API_VOUCHER_IMAGE_FOR_UPLOAD_URL = `${API_BASE_URL}/admin/voucher-list/for-image-upload`;

// Customer Routes
export const API_CUSTOMER_LOGIN_URL = `${API_CUSTOMER_BASE_URL}/login`;
export const API_CUSTOMER_LOGOUT_URL = `${API_CUSTOMER_BASE_URL}/logout`;
export const API_CUSTOMER_AUTH_CHECK_URL = `${API_CUSTOMER_BASE_URL}/me`;
export const API_CUSTOMER_CHANGE_PASSWORD_URL = `${API_CUSTOMER_BASE_URL}/change-password`;
export const API_CUSTOMER_STATEMENT_URL = `${API_CUSTOMER_BASE_URL}/statement`;
export const API_CUSTOMER_DUES_URL = `${API_CUSTOMER_BASE_URL}/dues`;
export const API_CUSTOMER_SUMMARY_URL = `${API_CUSTOMER_BASE_URL}/summary`;
export const API_CUSTOMER_VOUCHER_URL = `${API_CUSTOMER_BASE_URL}/voucher/`;

// Admin-side: set/reset a customer's portal password
export const API_CUSTOMER_SET_PASSWORD_URL = `${API_BASE_URL}/contact/customer/set-password/`;
// Streams the printable customer profile sheet as a PDF.
export const API_CUSTOMER_PROFILE_PDF_URL = `${API_BASE_URL}/contact/customer/pdf/`;






// Labour Ledger Routes
export const API_LABOUR_LEDGER_URL = `${API_BASE_URL}/reports/labour/ledger`;
export const API_LABOUR_ITEMS_URL = `${API_BASE_URL}/labour/items`;


// Requisition Routes
export const API_REQUISITION_COMPARISONS_URL = `${API_BASE_URL}/requisition/comparison`;
export const API_REQUISITION_ITEMS_URL = `${API_BASE_URL}/requisition/items`;
export const API_REQUISITION_STORE_URL = `${API_BASE_URL}/requisition/store`;
export const API_REQUISITION_LIST_URL = `${API_BASE_URL}/requisition/list`;



// Voucher Settings Routes
// Voucher Delete URL
export const API_VOUCHER_DELETE_URL = `${API_BASE_URL}/voucher-settings/destroy`;
export const API_INSTALLMENT_DELETE_URL = `${API_BASE_URL}/voucher-settings/installment-destroy`;
export const API_VOUCHER_RECYCLEBIN_URL = `${API_BASE_URL}/voucher-settings/recyclebin`;
export const API_REMOVE_RECYCLEBIN_URL = `${API_BASE_URL}/voucher-settings/remove-recyclebin`;
export const API_RESTORE_RECYCLEBIN_URL = `${API_BASE_URL}/voucher-settings/restore-recyclebin`;




export const API_CHANGE_HISTORY_URL = `${API_BASE_URL}/history/information`;
export const API_TRANSACTION_HISTORY_URL = `${API_BASE_URL}/history/log-activities`;


// Employee Routes
// Dropdown List URL
export const API_EMPLOYEE_DDL_LIST_URL = `${API_BASE_URL}/hrms/employee/ddl-list`;
export const API_EMPLOYEE_DDL_SEARCH_URL = `${API_BASE_URL}/hrms/employee/ddl/list`;

export const API_EMPLOYEE_LIST_URL = `${API_BASE_URL}/hrms/employees`;
export const API_EMPLOYEE_SETTINGS_URL = `${API_BASE_URL}/hrms/employee/settings`;
export const API_EMPLOYEE_STORE_URL = `${API_BASE_URL}/hrms/employee/store`;
export const API_EMPLOYEE_EDIT_URL = `${API_BASE_URL}/hrms/employee/edit/`;
export const API_EMPLOYEE_UPDATE_URL = `${API_BASE_URL}/hrms/employee/update/`;
export const API_EMPLOYEE_FROM_UI_URL = `${API_BASE_URL}/hrms/employee/update/ui/`;
export const API_EMPLOYEE_STATUS_URL = `${API_BASE_URL}/hrms/employee/status`;
export const API_HRMS_DESIGNATION_LEVEL_LIST_URL = `${API_BASE_URL}/hrms/designation-levels/list`;
export const API_HRMS_DESIGNATION_LEVEL_STORE_URL = `${API_BASE_URL}/hrms/designation-levels/store`;
export const API_HRMS_DESIGNATION_LEVEL_EDIT_URL = `${API_BASE_URL}/hrms/designation-levels/edit`;
export const API_HRMS_DESIGNATION_LEVEL_UPDATE_URL = `${API_BASE_URL}/hrms/designation-levels/update`;
export const API_HRMS_DESIGNATION_LEVEL_DELETE_URL = `${API_BASE_URL}/hrms/designation-levels/delete`;
export const API_HRMS_DESIGNATION_LEVEL_DDL_URL = `${API_BASE_URL}/hrms/designation-levels/ddl`;
export const API_HRMS_DESIGNATION_LIST_URL = `${API_BASE_URL}/hrms/designations/list`;
export const API_HRMS_DESIGNATION_STORE_URL = `${API_BASE_URL}/hrms/designations/store`;
export const API_HRMS_DESIGNATION_EDIT_URL = `${API_BASE_URL}/hrms/designations/edit`;
export const API_HRMS_DESIGNATION_UPDATE_URL = `${API_BASE_URL}/hrms/designations/update`;
export const API_HRMS_DESIGNATION_DELETE_URL = `${API_BASE_URL}/hrms/designations/delete`;
export const API_HRMS_DESIGNATION_DDL_URL = `${API_BASE_URL}/hrms/designations/ddl`;
export const API_FULL_SALARY_PAYMENT_URL = `${API_BASE_URL}/hrms/salary-payment-full`;

// Employee Loan Routes
export const API_EMPLOYEE_LOAN_DISBURSEMENT_URL = `${API_BASE_URL}/hrms/loan/disbursement`;
export const API_EMPLOYEE_LOAN_SEARCH_URL = `${API_BASE_URL}/hrms/loan/search`;
export const API_EMPLOYEE_LOAN_UPDATE_URL = `${API_BASE_URL}/hrms/loan/update`;
export const API_EMPLOYEE_LOAN_LEDGER_URL = `${API_BASE_URL}/hrms/loan/ledger`;
export const API_EMPLOYEE_LOAN_BALANCE_URL = `${API_BASE_URL}/hrms/loan/balance`;



// Salary Routes
export const API_SALARY_VIEW_URL = `${API_BASE_URL}/hrms/salary-view`;
export const API_SALARY_GENERATE_URL = `${API_BASE_URL}/hrms/salary-generate`;
export const API_SALARY_SHEET_URL = `${API_BASE_URL}/hrms/salary-sheet`;
export const API_SALARY_SHEET_PRINT_URL = `${API_BASE_URL}/hrms/salary-sheet-print`;
export const API_SALARY_SHEET_UPDATE_URL = `${API_BASE_URL}/hrms/salary-sheet-update`;
export const API_SALARY_SHEET_ROW_DELETE_URL = `${API_BASE_URL}/hrms/salary-sheet-row-delete`;
export const API_FESTIVAL_BONUS_VIEW_URL = `${API_BASE_URL}/hrms/festival-bonus-view`;
export const API_FESTIVAL_BONUS_GENERATE_URL = `${API_BASE_URL}/hrms/festival-bonus-generate`;
export const API_FESTIVAL_BONUS_SHEET_URL = `${API_BASE_URL}/hrms/festival-bonus-sheet`;
export const API_FESTIVAL_BONUS_SHEET_PRINT_URL = `${API_BASE_URL}/hrms/festival-bonus-sheet-print`;
export const API_FESTIVAL_BONUS_SHEET_UPDATE_URL = `${API_BASE_URL}/hrms/festival-bonus-sheet-update`;
export const API_FESTIVAL_BONUS_PAYMENT_URL = `${API_BASE_URL}/hrms/festival-bonus-payment`;

// Attendance Management Routes
export const API_ATTENDANCE_SHIFT_LIST_URL = `${API_BASE_URL}/hrms/attendance/shifts`;
export const API_ATTENDANCE_SHIFT_STORE_URL = `${API_BASE_URL}/hrms/attendance/shifts/store`;
export const API_ATTENDANCE_SHIFT_UPDATE_URL = `${API_BASE_URL}/hrms/attendance/shifts/update`;
export const API_ATTENDANCE_POLICY_LIST_URL = `${API_BASE_URL}/hrms/attendance/policies`;
export const API_ATTENDANCE_POLICY_STORE_URL = `${API_BASE_URL}/hrms/attendance/policies/store`;
export const API_ATTENDANCE_POLICY_UPDATE_URL = `${API_BASE_URL}/hrms/attendance/policies/update`;
export const API_ATTENDANCE_SHIFT_ROSTER_LIST_URL = `${API_BASE_URL}/hrms/attendance/shift-rosters`;
export const API_ATTENDANCE_SHIFT_ROSTER_STORE_URL = `${API_BASE_URL}/hrms/attendance/shift-rosters/store`;
export const API_ATTENDANCE_SHIFT_ROSTER_UPDATE_URL = `${API_BASE_URL}/hrms/attendance/shift-rosters/update`;
export const API_ATTENDANCE_WEEKLY_HOLIDAY_LIST_URL = `${API_BASE_URL}/hrms/attendance/weekly-holidays`;
export const API_ATTENDANCE_WEEKLY_HOLIDAY_STORE_URL = `${API_BASE_URL}/hrms/attendance/weekly-holidays/store`;
export const API_ATTENDANCE_WEEKLY_HOLIDAY_UPDATE_URL = `${API_BASE_URL}/hrms/attendance/weekly-holidays/update`;
export const API_ATTENDANCE_HOLIDAY_LIST_URL = `${API_BASE_URL}/hrms/attendance/holidays`;
export const API_ATTENDANCE_HOLIDAY_STORE_URL = `${API_BASE_URL}/hrms/attendance/holidays/store`;
export const API_ATTENDANCE_HOLIDAY_UPDATE_URL = `${API_BASE_URL}/hrms/attendance/holidays/update`;
export const API_ATTENDANCE_LEAVE_TYPE_LIST_URL = `${API_BASE_URL}/hrms/attendance/leave-types`;
export const API_ATTENDANCE_LEAVE_TYPE_STORE_URL = `${API_BASE_URL}/hrms/attendance/leave-types/store`;
export const API_ATTENDANCE_LEAVE_TYPE_UPDATE_URL = `${API_BASE_URL}/hrms/attendance/leave-types/update`;
export const API_ATTENDANCE_ENTRY_LIST_URL = `${API_BASE_URL}/hrms/attendance/entries`;
export const API_ATTENDANCE_ENTRY_REPORT_URL = `${API_BASE_URL}/hrms/attendance/entries/report`;
export const API_ATTENDANCE_AUDIT_HISTORY_URL = `${API_BASE_URL}/hrms/attendance/entries/audit-history`;
export const API_ATTENDANCE_MONTHLY_SUMMARY_URL = `${API_BASE_URL}/hrms/attendance/monthly-summary`;
export const API_ATTENDANCE_ENTRY_STORE_URL = `${API_BASE_URL}/hrms/attendance/entries/store`;
export const API_ATTENDANCE_ENTRY_BULK_STORE_URL = `${API_BASE_URL}/hrms/attendance/entries/bulk-store`;
export const API_ATTENDANCE_ENTRY_UPDATE_URL = `${API_BASE_URL}/hrms/attendance/entries/update`;
export const API_ATTENDANCE_ENTRY_APPROVE_URL = `${API_BASE_URL}/hrms/attendance/entries/approve`;
export const API_ATTENDANCE_ENTRY_BULK_CLEAR_URL = `${API_BASE_URL}/hrms/attendance/entries/bulk-clear`;
export const API_ATTENDANCE_ENTRY_DELETE_URL = `${API_BASE_URL}/hrms/attendance/entries/delete`;
export const API_ATTENDANCE_LEAVE_APPLICATION_LIST_URL = `${API_BASE_URL}/hrms/attendance/leave-applications`;
export const API_ATTENDANCE_LEAVE_APPLICATION_STORE_URL = `${API_BASE_URL}/hrms/attendance/leave-applications/store`;
export const API_ATTENDANCE_LEAVE_APPLICATION_APPROVE_URL = `${API_BASE_URL}/hrms/attendance/leave-applications/approve`;


// Real Estate Area url
export const API_PROJECT_STORE_URL = `${API_BASE_URL}/real-estate/projects`;
export const API_PROJECT_EDIT_URL = `${API_BASE_URL}/real-estate/projects/edit`;
export const API_PROJECT_UPDATE_URL = `${API_BASE_URL}/real-estate/projects/update`;
export const API_PROJECT_DELETE_URL = `${API_BASE_URL}/real-estate/projects/delete`;
export const API_PROJECT_LIST_URL = `${API_BASE_URL}/real-estate/projects/list`;
export const API_PROJECT_DDL_LIST_URL = `${API_BASE_URL}/real-estate/projects/ddl`;

// Real Estate Building url
export const API_BUILDING_STORE_URL = `${API_BASE_URL}/real-estate/buildings`;
export const API_BUILDING_EDIT_URL = `${API_BASE_URL}/real-estate/buildings/edit`;
export const API_BUILDING_UPDATE_URL = `${API_BASE_URL}/real-estate/buildings/update`;
export const API_BUILDING_DELETE_URL = `${API_BASE_URL}/real-estate/buildings/delete`;
export const API_BUILDING_LIST_URL = `${API_BASE_URL}/real-estate/buildings/list`;
export const API_BUILDING_DDL_LIST_URL = `${API_BASE_URL}/real-estate/buildings/ddl`;

// Project expense — a cash payment that says which project and which building
// the money went to. Its own endpoints; the ordinary payment screens are
// untouched by it.
export const API_PROJECT_EXPENSE_ACCOUNTS_DDL_URL = `${API_BASE_URL}/real-estate/project-expense/accounts/ddl`;
export const API_PROJECT_EXPENSE_PROJECTS_DDL_URL = `${API_BASE_URL}/real-estate/project-expense/projects/ddl`;
export const API_PROJECT_EXPENSE_BUILDINGS_DDL_URL = `${API_BASE_URL}/real-estate/project-expense/buildings/ddl`;
export const API_PROJECT_EXPENSE_STORE_URL = `${API_BASE_URL}/real-estate/project-expense/store`;
export const API_PROJECT_EXPENSE_EDIT_URL = `${API_BASE_URL}/real-estate/project-expense/edit`;
export const API_PROJECT_EXPENSE_UPDATE_URL = `${API_BASE_URL}/real-estate/project-expense/update`;

// Project income — a cash receipt that says which project and which building
// earned the money. The mirror of project expense, and its own screen rather
// than a variant of Cash Received, which is left exactly as it is.
export const API_PROJECT_INCOME_ACCOUNTS_DDL_URL = `${API_BASE_URL}/real-estate/project-income/accounts/ddl`;
export const API_PROJECT_INCOME_PROJECTS_DDL_URL = `${API_BASE_URL}/real-estate/project-income/projects/ddl`;
export const API_PROJECT_INCOME_BUILDINGS_DDL_URL = `${API_BASE_URL}/real-estate/project-income/buildings/ddl`;
export const API_PROJECT_INCOME_STORE_URL = `${API_BASE_URL}/real-estate/project-income/store`;
export const API_PROJECT_INCOME_EDIT_URL = `${API_BASE_URL}/real-estate/project-income/edit`;
export const API_PROJECT_INCOME_UPDATE_URL = `${API_BASE_URL}/real-estate/project-income/update`;

// Project purchase — material bought for a project and its buildings. One
// Purchase ledger line per building, so a building can be asked what it cost.
export const API_PROJECT_PURCHASE_STORE_URL = `${API_BASE_URL}/real-estate/project-purchase/store`;
export const API_PROJECT_PURCHASE_EDIT_URL = `${API_BASE_URL}/real-estate/project-purchase/edit`;
export const API_PROJECT_PURCHASE_UPDATE_URL = `${API_BASE_URL}/real-estate/project-purchase/update`;
export const API_PROJECT_LABOUR_STORE_URL = `${API_BASE_URL}/real-estate/project-labour/store`;
export const API_PROJECT_LABOUR_EDIT_URL = `${API_BASE_URL}/real-estate/project-labour/edit`;
export const API_PROJECT_LABOUR_UPDATE_URL = `${API_BASE_URL}/real-estate/project-labour/update`;

// What each project and each building has cost. Under the real-estate prefix
// rather than with the other reports, because they read the real-estate
// dimension tables and mean nothing to a branch that has none.
export const API_REPORT_PROJECT_SUMMARY_URL = `${API_BASE_URL}/real-estate/reports/project-summary`;
export const API_REPORT_PROJECT_BUILDING_DETAIL_URL = `${API_BASE_URL}/real-estate/reports/building-detail`;
export const API_REPORT_PROJECT_UNTAGGED_URL = `${API_BASE_URL}/real-estate/reports/untagged-expense`;

// What each project has earned. A report of its own rather than columns on the
// cost one, where every figure is something spent.
export const API_REPORT_PROJECT_INCOME_SUMMARY_URL = `${API_BASE_URL}/real-estate/reports/income-summary`;
export const API_REPORT_PROJECT_INCOME_DETAIL_URL = `${API_BASE_URL}/real-estate/reports/income-detail`;
export const API_REPORT_PROJECT_INCOME_UNTAGGED_URL = `${API_BASE_URL}/real-estate/reports/untagged-income`;

// Real Estate Flat url
export const API_FLAT_STORE_URL = `${API_BASE_URL}/real-estate/flats`;
export const API_FLAT_EDIT_URL = `${API_BASE_URL}/real-estate/flats/edit`;
export const API_FLAT_UPDATE_URL = `${API_BASE_URL}/real-estate/flats/update`;
export const API_FLAT_DELETE_URL = `${API_BASE_URL}/real-estate/flats/delete`;
export const API_FLAT_LIST_URL = `${API_BASE_URL}/real-estate/flats/list`;
export const API_FLAT_DDL_LIST_URL = `${API_BASE_URL}/real-estate/flats/ddl`;
export const API_FLAT_LAYOUT_URL = `${API_BASE_URL}/real-estate/buildings/`;

// Real Estate Flat url
export const API_UNIT_LIST_URL = `${API_BASE_URL}/real-estate/units/list`;
export const API_UNIT_STORE_URL = `${API_BASE_URL}/real-estate/units`;
export const API_UNIT_EDIT_URL = `${API_BASE_URL}/real-estate/units/edit`;
export const API_UNIT_UPDATE_URL = `${API_BASE_URL}/real-estate/units/update`;
export const API_UNIT_DELETE_URL = `${API_BASE_URL}/real-estate/units/delete`;
export const API_UNIT_DDL_LIST_URL = `${API_BASE_URL}/real-estate/units/ddl`;
export const API_PARKING_DDL_LIST_URL = `${API_BASE_URL}/real-estate/parking/ddl`;
export const API_UNIT_CHARGE_DDL_LIST_URL = `${API_BASE_URL}/real-estate/units/charge-types/ddl`;

// Real Estate Unit Charge Types url
export const API_UNIT_CHARGE_TYPE_STORE_URL = `${API_BASE_URL}/real-estate/units/unit-charge-types`;
export const API_UNIT_CHARGE_TYPE_LIST_URL = `${API_BASE_URL}/real-estate/units/unit-charge-types/list`;
export const API_UNIT_CHARGE_TYPE_EDIT_URL = `${API_BASE_URL}/real-estate/units/unit-charge-types/edit`;
// export const API_UNIT_STORE_URL = `${API_BASE_URL}/real-estate/units`;
// export const API_UNIT_EDIT_URL = `${API_BASE_URL}/real-estate/units/edit`;
// export const API_UNIT_UPDATE_URL = `${API_BASE_URL}/real-estate/units/update`;
// export const API_UNIT_DDL_LIST_URL = `${API_BASE_URL}/real-estate/units/ddl`; 

// Unit Sale Routes
export const API_UNIT_SALE_STORE_URL = `${API_BASE_URL}/real-estate/unit/sales`;
export const API_UNIT_SALE_DDL_URL = `${API_BASE_URL}/real-estate/unit-sale/ddl`;
export const API_UNIT_SALE_SUMMARY_URL = `${API_BASE_URL}/real-estate/unit-sale/summary`;
// Correcting a sale already on the books — suffix the sale id. The buyer and
// the flat are not sent back: the server reads those off the sale, because both
// are printed on papers the buyer already holds.
export const API_UNIT_SALE_EDIT_URL = `${API_BASE_URL}/real-estate/unit-sale/edit/`;
export const API_UNIT_SALE_UPDATE_URL = `${API_BASE_URL}/real-estate/unit-sale/update/`;
// Withdrawing a sale — the wrong buyer or the wrong flat, which the edit above
// refuses. Suffix the sale id. Sends the voucher to the recycle bin, so it is
// undone by restoring the voucher rather than by another call here.
export const API_UNIT_SALE_CANCEL_URL = `${API_BASE_URL}/real-estate/unit-sale/cancel/`;
export const API_UNIT_SALE_SOLD_UNITS_URL = `${API_BASE_URL}/real-estate/unit-sale/sold-units`;
// The sales summary report. Its own endpoint rather than the sold-units list
// above, because it answers to its own permission: reading what every buyer of
// a project paid is not handed out with the right to enter a sale.
export const API_REAL_ESTATE_SALES_SUMMARY_URL = `${API_BASE_URL}/real-estate/reports/sales-summary`;
export const API_UNIT_SALE_ALLOTMENT_LETTER_URL = `${API_BASE_URL}/real-estate/unit-sale/allotment-letter/`;
// One buyer's nominee list while the booking is still being typed — suffix the
// customer's chart-of-account id, the same value the sale is saved with.
export const API_UNIT_SALE_CUSTOMER_NOMINEES_URL = `${API_BASE_URL}/real-estate/unit-sale/customer/`;
// The booking form of one sale, versioned on its own series: suffix the sale id
// for the DEMO, 'generate/<id>' to issue, '<id>/print/<n>' to reprint B-n.
export const API_UNIT_SALE_BOOKING_FORM_URL = `${API_BASE_URL}/real-estate/unit-sale/booking-form/`;
// The scanned deed of one sale: POST to attach or replace, GET to read, DELETE
// to remove. Suffix the sale id, then '/documents'. Also the stem for a sale's
// nominees -- suffix the sale id, then '/nominees'.
export const API_UNIT_SALE_DOCUMENTS_URL = `${API_BASE_URL}/real-estate/unit-sale/`;

// In-app pop-up messaging
export const API_IN_APP_MESSAGE_SYNC_URL = `${API_BASE_URL}/in-app-messages/sync`;
export const API_IN_APP_MESSAGE_EVENTS_URL = `${API_BASE_URL}/in-app-messages/events`;
export const API_ADMIN_IN_APP_MESSAGE_URL = `${API_BASE_URL}/admin/in-app-messages`;
export const API_ADMIN_IN_APP_MESSAGE_UPLOAD_URL = `${API_BASE_URL}/admin/in-app-messages/upload-image`;
export const API_UNIT_SALE_INSTALLMENT_CREATE_URL = `${API_BASE_URL}/real-estate/unit-sale/installment-create`;
export const API_UNIT_SALE_INSTALLMENT_UPDATE_URL = `${API_BASE_URL}/real-estate/unit-sale/installment-update`;







// Labour setup — the categories and items a labour bill is built from.
export const API_LABOUR_CATEGORY_LIST_URL = `${API_BASE_URL}/labour-setup/categories`;
export const API_LABOUR_CATEGORY_DDL_URL = `${API_BASE_URL}/labour-setup/categories/ddl`;
export const API_LABOUR_CATEGORY_STORE_URL = `${API_BASE_URL}/labour-setup/categories/store`;
export const API_LABOUR_CATEGORY_UPDATE_URL = `${API_BASE_URL}/labour-setup/categories/update`;
export const API_LABOUR_CATEGORY_DELETE_URL = `${API_BASE_URL}/labour-setup/categories/delete`;
export const API_LABOUR_CATEGORY_STATUS_URL = `${API_BASE_URL}/labour-setup/categories/status`;
export const API_LABOUR_ITEM_LIST_URL = `${API_BASE_URL}/labour-setup/items`;
export const API_LABOUR_ITEM_STORE_URL = `${API_BASE_URL}/labour-setup/items/store`;
export const API_LABOUR_ITEM_UPDATE_URL = `${API_BASE_URL}/labour-setup/items/update`;
export const API_LABOUR_ITEM_DELETE_URL = `${API_BASE_URL}/labour-setup/items/delete`;
export const API_LABOUR_ITEM_STATUS_URL = `${API_BASE_URL}/labour-setup/items/status`;


// Hotel setup — buildings, floors, room types, and the rooms and seats inside
// them. One stem per table; the screens suffix /ddl, /store, /update/{id},
// /delete/{id} and /edit/{id} onto it, the way the labour setup screens do.
export const API_HOTEL_BUILDING_URL = `${API_BASE_URL}/hotel-setup/buildings`;
export const API_HOTEL_FLOOR_URL = `${API_BASE_URL}/hotel-setup/floors`;
export const API_HOTEL_ROOM_TYPE_URL = `${API_BASE_URL}/hotel-setup/room-types`;
// Also the stem for /types (the kinds a resource may be), /{id}/seats,
// /seats/update/{id} — where one bed is priced on its own — and /bulk-store,
// which is the same form as /store with a run of numbers in place of one.
export const API_HOTEL_RESOURCE_URL = `${API_BASE_URL}/hotel-setup/resources`;
// The whole property in one answer, for the elevation grid. Its own endpoint
// because the resources list paginates at ten, and a floor plan cannot be read
// ten rooms at a time.
export const API_HOTEL_LAYOUT_URL = `${API_BASE_URL}/hotel-setup/layout`;

// Bookings. The stem suffixes /store, /edit/{id}, /cancel/{id}, and — for the
// second stage of the form, on the day the guests arrive — /allotment/{id} and
// /allot/{id}.
export const API_HOTEL_BOOKING_URL = `${API_BASE_URL}/hotel-setup/bookings`;
// ⚠️ ADVISORY. What is free at the moment it is asked, and never a hold on
// anything — two clerks can both be told the same room is free and both be
// right. The bed is claimed by a unique key when the booking is saved.
export const API_HOTEL_BOOKING_AVAILABILITY_URL = `${API_BASE_URL}/hotel-setup/bookings/availability`;
// The folio — screen 5. The stem suffixes /{id}, /{id}/bill, /{id}/charge and
// /{id}/receive.
//
// ⚠️ Every one of the three writes answers with the WHOLE folio again rather
// than with what it wrote. What was charged and what was paid are two different
// questions, and a screen that patched one of them in place would eventually
// show a bill and a balance from two different moments.
export const API_HOTEL_FOLIO_URL = `${API_BASE_URL}/hotel-setup/bookings/folio`;

// Check-out — screen 6. The stem suffixes /{id}, read and written.
//
// ⚠️ The GET is a PLAN, not a record: it says what the button would do on the
// departure date it is given, and its balance counts the nights that are not
// on the bill yet. Read it again whenever that date changes, or the desk is
// shown a figure for a day the guest is not leaving on.
export const API_HOTEL_CHECKOUT_URL = `${API_BASE_URL}/hotel-setup/bookings/checkout`;

// Who an unpaid balance can be carried to.
//
// ⚠️ Answers cust_party_infos.id. NOT interchangeable with the coa4 ids the
// chart dropdowns return — billed_to_party_id points at the party master.
export const API_HOTEL_PARTY_URL = `${API_BASE_URL}/hotel-setup/bookings/parties`;

// Where money may be taken — this company's own cash and bank heads.
//
// ⚠️ Answers acc_coa_level4s.id, which is what `coa4_id` on a payment wants —
// the opposite of the line above, and the two must not be crossed. Required on
// every receipt since the §5 vouchers were written: a voucher cannot say which
// drawer the money went into if nobody said.
export const API_HOTEL_TILL_URL = `${API_BASE_URL}/hotel-setup/bookings/folio/tills`;

// What cancelling a booking would do to the money, before it is done — how much
// is held, whether it has been billed (which forbids cancelling at all), and
// which tills a refund could come out of.
export const API_HOTEL_CANCELLATION_URL = `${API_BASE_URL}/hotel-setup/bookings/cancellation`;

// Who was in the building on a given night, and who is arriving or leaving.
//
// ⚠️ It reads the NIGHTS, not the booking's own dates. Check-out deletes the
// nights a guest did not sleep, so "holds a night on the 25th" is the only
// expression in the schema that means "was here on the 25th" — and a register a
// police officer reads has to mean that.
export const API_HOTEL_REGISTER_URL = `${API_BASE_URL}/hotel-setup/reports/register`;

// What money came in between two dates, and whether it reached the ledger.
//
// ⚠️ Every total is NETTED. A refund is stored positive — the direction lives in
// the purpose — so a report that summed the column would say the day took more
// than the drawer holds.
export const API_HOTEL_COLLECTION_URL = `${API_BASE_URL}/hotel-setup/reports/collection`;

// How full a month was, night by night, with ADR and RevPAR against it.
//
// ⚠️ ADR and RevPAR are different divisions — per bed SOLD and per bed the
// property HAS. Quoting one for the other reports an empty month as a full one.
export const API_HOTEL_MONTH_URL = `${API_BASE_URL}/hotel-setup/calendar/month`;

// The tape chart: rooms down the side, nights across the top. What it is read
// for is the HOLES, which a list of bookings never shows.
export const API_HOTEL_TIMELINE_URL = `${API_BASE_URL}/hotel-setup/calendar/timeline`;

// Who owes this bill, and moving it to somebody else — §6.4.
//
// ⚠️ NOT a field edit. The money owed moves from one party's account to
// another's with a voucher against it, and only the OUTSTANDING balance moves:
// money already received stays with whoever paid it. Nothing is re-priced.
export const API_HOTEL_BILL_URL = `${API_BASE_URL}/hotel-setup/bookings/bill`;
