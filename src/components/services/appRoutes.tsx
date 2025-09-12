const ROUTES = {
  login: '/login',
  logout: '/logout',

  // Customer Login
  customerLogin: '/customer/login',
  customerHome: '/customer',

  // User Routes
  user_list: '/user/user-list',
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

  journal: '/accounts/journal',

  // Role Routes
  role_list: '/role/role-list',
  role_ddl_list: '/role/ddl-role-list',

  // Company Routes
  company_list: '/company/company-list',

  // Branch routes
  branch_list: '/branch/branch-list',
  branch_add: '/branch/add-branch',
  branch_edit: '/branch/edit/:id',
  branch_update: '/branch/branch-update',
  branch_store: '/branch/branch-store',
  branch_all_ddl_list: '/branch/ddl/all-branch',
  branch_ddl_protected_list: '/branch/ddl/protected-branch',

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

  // COA L4
  coal4_ddl_list: '/coal4/coal4-list',
  coal4_list: '/coal4/coal4-list',
  coal4_add: '/coal4/add-coal4',

  report_ledger         : '/reports/ledger',
  report_cashbook       : '/reports/cashbook',
  report_due_list       : '/reports/due-list',
  report_date_wise_total: '/reports/date-wise-total-data',
  report_product_stock  : '/reports/product/stock',
  cat_wise_in_out       : '/reports/cat-wise/in-out',
  purchase_ledger       : '/reports/purchase-ledger',
  sales_ledger          : '/reports/sales-ledger',
  mitch_match           : '/reports/mitch-match',
  report_labour_ledger  : '/reports/labour/ledger',
  group_report          : '/reports/group-report',

  // Cash Received',
  cash_received: '/accounts/cash/receive',

  // Products Route
  product_list: '/product/product-list',
  product_create: '/product/add-product',
  product_edit: '/product/edit/:id',
  product_store: '/product/store', 

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
  admin_change_voucher_type: '/admin/voucher/type-change',
  admin_change_date: '/admin/voucher/date-change',

  image_upload: '/admin/image-upload',
  bulk_upload: '/admin/bulk-upload',

  // Invoices
  // Purchase
  inv_purchase: '/invoice/purchase',
  // Sales
  inv_sales: '/invoice/sales',

  // Installment Routes
  installment_list: '/admin/installment-details',
  due_installment_list: '/reports/due-installments',
  employee_wise_installment: '/reports/employee-installment',

  // Invoice Routes
  inv_labour: '/invoice/labour-invoice',

  // Orders Route
  order_list: '/order/order-list',
  order_add: '/orders/add-order',
  order_avg_price: '/orders/avg-price',

  // User Management Routes
  roles: '/user-management/roles',
  add_role: '/user-management/create-role',
  user_management_list: '/user-management/user-list',
  user_management_add: '/user-management/add-user',
  user_management_edit: '/user-management/edit-user',

  // Customer and Supplier Routes
  supplier_customer_list: '/customer-supplier/list',
  supplier_customer_add: '/customer-supplier/create',

  customer_dashboard: '/customer-dashboard',



  // Requisition
  requisition: '/requisition/comparison',
  requisition_create: '/requisition/create',

  notFound: '*',
};

export default ROUTES;
