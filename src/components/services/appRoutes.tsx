const ROUTES = {
  login: '/login',
  forgot_password: '/forgot-password',
  public_register: '/register',
  public_register_otp: '/register/otp',
  logout: '/logout',
  subscription_pricing: '/subscription/pricing',
  my_subscription: '/subscription/my-plan',
  subscription_payment_submit: '/subscription/payment-submit',
  subscription_billing_history: '/subscription/billing-history',
  subscription_admin: '/subscription/admin',
  subscription_plan_list: '/subscription/admin/plans',
  subscription_plan_entry: '/subscription/admin/plans/entry',
  subscription_plan_edit: '/subscription/admin/plans/edit/:id',
  reseller_admin: '/admin/resellers',
  admin_notifications: '/admin/notifications',
  admin_in_app_messages: '/admin/in-app-messages',
  admin_in_app_message_create: '/admin/in-app-messages/create',
  admin_in_app_message_edit: '/admin/in-app-messages/edit/:id',
  inventory_systems: '/admin/inventory-systems',
  tutorial_videos: '/admin/tutorial-videos',
  highlight_rules: '/admin/highlight-rules',
  reseller_dashboard: '/reseller/dashboard',

  // Customer Login
  customerLogin: '/customer/login',
  customerHome: '/customer',
  customerChangePassword: '/customer/change-password',

  // User Routes
  user_list: '/user/user-list',
  online_users: '/user/online-users',
  user_login_log: '/user/login-log',
  company_user_list: '/user/company-users',
  user_add: '/user/add-user',
  user_check: '/user/user-check',
  user_edit: '/user/user-edit/:id',
  user_update: '/user/user-update',

  // Dashboard
  main: '/',
  dashboard: '/dashboard',
  dashboard_two: '/dashboard-two',
  calendar: '/calendar',
  profile: '/profile',
  menu_arrangement: '/settings/menu-arrangement',
  my_devices: '/my-devices',
  formElements: '/forms/form-elements',
  formLayout: '/forms/form-layout',
  ecommers: '/ecommers',
  buttons: '/ui/buttons',
  alert: '/ui/alerts',

  // Transactions
  cash_receive: '/accounts/cash/receive',
  bank_receive: '/accounts/bank/receive',

  cash_payment: '/accounts/cash/payment',
  bank_payment: '/accounts/bank/payment',

  employee_loan: '/accounts/employee-loan', 
  employee_loan_ledger: '/accounts/employee-loan/ledger', 
  employee_loan_balance: '/accounts/employee-loan/balance',
  branch_transfer: '/inventory/branch-transfer',
  branch_received: '/inventory/branch-received',
  material_issue: '/inventory/material-issue',

  journal: '/accounts/journal',

  // Role Routes
  role_list: '/role/role-list',
  role_ddl_list: '/role/ddl-role-list',

  // Company Routes
  company_list: '/company/company-list',
  company_edit: '/company/company-edit/:id',
  software_info: '/settings/software-info',

  // Company & Product-wise financial tracking
  product_tracking_settings: '/settings/product-tracking',
  product_financial_statement: '/reports/product-financial-statement',
  product_tracking_summary: '/reports/product-receivable-payable',

  // Branch routes
  branch_list: '/branch/branch-list',
  branch_add: '/branch/add-branch',
  branch_edit: '/branch/branch-edit/:id',
  branch_update: '/branch/branch-update',
  branch_store: '/branch/branch-store',
  branch_all_ddl_list: '/branch/ddl/all-branch',
  branch_ddl_protected_list: '/branch/ddl/protected-branch',
  sms_send: '/sms/send',
  sms_template_list: '/sms/templates',
  sms_template_create: '/sms/templates/create',
  sms_template_edit: '/sms/templates/edit/:id',

  // Nav Switcher
  nav_vertical: '/nav-vertical',
  nav_horizontal: '/nav-horizontal',

  // Chart of Accounts
  // COA L1
  coal1_list: '/coal1/coal1-list',
  coal1_add: '/coal1/add-coal1',

  // COA L2
  coal2_list: '/coal2/coal2-list',
  coal2_add: '/coal2/add-coal2',

  // COA L3
  coal3_list: '/coal3/coal3-list',
  coal3_add: '/coal3/add-coal3',
  coal3_edit: '/coal3/edit-coal3/:id',

  // COA L4
  coal4_ddl_list: '/coal4/coal4-list',
  coal4_list: '/coal4/coal4-list',
  coal4_add: '/coal4/add-coal4',
  coal4_edit: '/coal4/edit-coal4/:id',

  // Opening balances for cash, the banks and mobile banking. A screen of its
  // own rather than a column on the COA L4 list.
  account_opening_balance: '/coal4/opening-balance',

  report_ledger: '/reports/ledger',
  report_cashbook: '/reports/cashbook',
  report_bankbook: '/reports/bankbook',
  cash_bank_received_payment: '/reports/cash-bank-received-payment',
  profit_loss: '/reports/profit-loss',
  product_profit_loss: '/reports/product-profit-loss',
  product_ledger_data: '/reports/product-ledger-data',
  bank_information: '/reports/bank-information',
  connected_member: '/reports/connected-member',
  balance_sheet: '/reports/balance-sheet',
  trial_balance_level3: '/reports/trialbalance-level3',
  trial_balance_level4: '/reports/trialbalance-level4',
  expense_report: '/reports/expense-report',
  customer_supplier_statement: '/reports/ledger-with-product',
  report_due_list: '/reports/due-list',
  report_date_wise_total: '/reports/date-wise-total-data',
  report_date_wise_in_out: '/reports/in-out/date-wise',
  report_product_stock: '/reports/product/stock',
  report_branch_transfer: '/reports/branch-transfer',
  report_branch_receive: '/reports/branch-receive',
  report_branch_stock: '/reports/branch-stock',
  report_closing_stock: '/reports/closing-stock',
  somity_stock_details: '/somity-report/stock-details',
  report_imei_stock: '/reports/stock-imei',
  cat_wise_in_out: '/reports/cat-wise/in-out',
  purchase_ledger: '/reports/purchase-ledger',
  sales_ledger: '/reports/sales-ledger',
  mitch_match: '/reports/mitch-match',
  hrm_mismatch_payment: '/reports/hrm-mismatch-payment',
  report_labour_ledger: '/reports/labour/ledger',
  group_report: '/reports/group-report',
  group_report_setup: '/reports/group-report/setup',
  somity_collection_sheet: '/somity-report/collection-sheet',
  somity_monthly_report: '/somity-report/monthly-report',

  // Cash Received',
  cash_received: '/accounts/cash/receive',

  // Products Route
  product_list: '/product/product-list',
  product_low_stock: '/product/low-stock',
  product_negative_stock: '/product/negative-stock',
  product_slow_moving: '/product/slow-moving',
  product_warehouse_difference: '/product/warehouse-difference',
  product_create: '/product/add-product',
  product_edit: '/product/edit/:id',
  product_store: '/product/store',


  // Brand Route
  brand_list: '/brand/brand-list',
  brand_create: '/brand/brand-create',

  // Product Unit Route
  product_unit_list: '/product-unit/unit-list',
  product_unit_create: '/product-unit/unit-create',
  product_unit_edit: '/product-unit/unit-edit/:id',

  // Category Route
  category_list: '/category/category-list',
  category_create: '/category/create',
  category_edit: '/category/edit',
  category_store: '/category/store',

  // Day Close
  day_close: '/admin/dayclose',
  day_jump: '/admin/jumpdate',

  // Voucher Approval
  admin_voucher_approval: '/admin/voucher-approval',
  admin_remove_approval: '/admin/remove-approval',
  approval_center: '/approval-center',
  approval_center_audit: '/approval-center/audit',
  admin_change_voucher_type: '/admin/voucher/type-change',
  admin_change_date: '/admin/voucher/date-change',

  image_upload: '/admin/image-upload',
  bulk_upload: '/admin/bulk-upload',

  // Invoices
  // Purchase
  inv_purchase: '/invoice/purchase',
  inv_purchase_import: '/invoice/purchase-import',
  inv_trading_combined: '/invoice/trading-combined',
  inv_purchase_return: '/invoice/purchase-return',
  // Sales
  inv_sales: '/invoice/sales',
  inv_sales_import: '/invoice/sales-import',
  inv_sales_return: '/invoice/sales-return',

  // Installment Routes
  installment_list: '/admin/installment-details',
  due_installment_list: '/reports/due-installments',
  employee_wise_installment: '/reports/employee-installment',


  unit_payment_list: '/admin/unit-payment-list', 
  unit_payment_edit: '/admin/unit-payment/edit/:id', 
  unit_payment_entry: '/admin/unit-payment/entry',

  // Invoice Routes
  inv_labour: '/invoice/labour-invoice',

  // Orders Route
  order_list: '/order/order-list',
  order_add: '/orders/add-order',
  order_edit: '/orders/edit/:id',
  order_avg_price: '/orders/avg-price',
  order_with_transaction: '/orders/with-transaction',

  // User Management Routes
  roles: '/user-management/roles',
  add_role: '/user-management/create-role',
  add_permission: '/user-management/create-permission',
  user_management_list: '/user-management/user-list',
  user_management_add: '/user-management/add-user',
  user_management_edit: '/user-management/edit-user',

  // Customer and Supplier Routes
  supplier_customer_list: '/customer-supplier/list',
  supplier_customer_add: '/customer-supplier/create',
  supplier_customer_edit: '/customer-supplier/edit/:id', 

  customer_dashboard: '/customer-dashboard',

  // Requisition
  requisition: '/requisitions',
  requisition_comparison: '/requisition/comparison',
  requisition_create: '/requisition/create',

  // VR Settings
  voucher_delete: '/vr-settings/voucher-delete',
  installment_delete: '/vr-settings/installment-delete',
  recyclebin: '/vr-settings/recyclebin',

  // Voucher history
  voucher_history: '/vr-settings/voucher-history',
  voucher_activity: '/vr-settings/voucher-activity',

  // Real Estate Area
  real_estate_area_list: '/real-estate/area-list',
  real_estate_area_add: '/real-estate/add-area',
  real_estate_area_edit: '/real-estate/area-edit',
  real_estate_project_activities: '/real-estate/project-activities',
  real_estate_project_edit: '/real-estate/project-edit',
  real_estate_project_list: '/real-estate/project-list',
  real_estate_buildings: '/real-estate/buildings',
  real_estate_building_edit: '/real-estate/building-edit',
  real_estate_buildings_list: '/real-estate/building/list',
  real_estate_flat_layout: '/real-estate/flat-layout', 
  real_estate_add_building_floor: '/real-estate/building/floor',
  real_estate_floor_edit: '/real-estate/building/floor-edit',
  real_estate_floor_list: '/real-estate/building/floor/list',
  real_estate_add_floor_unit: '/real-estate/add-unit',
  real_estate_add_floor_unit_edit: "/real-estate/add-floor-unit/:id",
  real_estate_floor_unit_list: '/real-estate/unit/list',  
  real_estate_unit_types_create: '/real-estate/unit-types/create',
  real_estate_charge_type_edit: '/real-estate/charge-types/edit',
  real_estate_unit_types_list: '/real-estate/unit-types/list',
  real_estate_unit_sales: '/real-estate/unit-sales',
  // The same pricing screen, opened on a sale that already exists. Reached from
  // the sold-units report, which is where a wrong figure is noticed.
  real_estate_unit_sale_edit: '/real-estate/unit-sales/edit/:id',
  real_estate_sold_units: '/real-estate/sold-units',
  real_estate_installment_create: '/real-estate/installment-create',
  real_estate_project_expense: '/real-estate/project-expense',
  real_estate_project_income: '/real-estate/project-income',
  real_estate_project_purchase: '/real-estate/project-purchase',
  real_estate_project_labour: '/real-estate/project-labour',
  real_estate_project_cost_report: '/real-estate/project-cost-report',
  real_estate_project_income_report: '/real-estate/project-income-report',
  
  // HRM
  hrms_employee_list: '/hrms/employees',
  hrms_employee_add: '/hrms/employee/add', 
  hrms_employee_edit: '/hrms/employee/edit/:id', 
  hrms_designation_level_list: '/hrms/designation-levels',
  hrms_designation_level_create: '/hrms/designation-levels/create',
  hrms_designation_level_edit: '/hrms/designation-levels/edit/:id',
  hrms_designation_level_edit_base: '/hrms/designation-levels/edit',
  hrms_designation_list: '/hrms/designations',
  hrms_designation_create: '/hrms/designations/create',
  hrms_designation_edit: '/hrms/designations/edit/:id',
  hrms_designation_edit_base: '/hrms/designations/edit',
  hrms_attendance_entries: '/hrms/attendance/entries',
  hrms_attendance_report: '/hrms/attendance/report',
  hrms_attendance_audit_history: '/hrms/attendance/audit-history',
  hrms_overtime_report: '/hrms/attendance/overtime-report',
  hrms_attendance_exception_reports: '/hrms/attendance/exception-reports',
  hrms_absent_report: '/hrms/attendance/absent-report',
  hrms_late_report: '/hrms/attendance/late-report',
  hrms_early_out_report: '/hrms/attendance/early-out-report',
  hrms_employee_attendance_report: '/hrms/attendance/employee-report',
  hrms_branch_attendance_summary: '/hrms/attendance/branch-summary',
  hrms_holiday_calendar_report: '/hrms/attendance/holiday-calendar',
  hrms_attendance_monthly_report: '/hrms/attendance/monthly-report',
  hrms_leave_applications: '/hrms/attendance/leaves',
  hrms_attendance_setup: '/hrms/attendance/setup',
  
  hrms_salary_sheet_list: '/hrms/salary-sheet',
  hrms_salary_generate: '/hrms/salary/salary-generate',
  hrms_salary_sheet_update: '/hrms/salary-sheet/update',
  hrms_festival_bonus_generate: '/hrms/festival-bonus/generate',
  hrms_festival_bonus_update: '/hrms/festival-bonus/update',
  hrms_festival_bonus_list: '/hrms/festival-bonus',

  item_chart: '/item/item-chart',

  notFound: '*',
};

export default ROUTES;


