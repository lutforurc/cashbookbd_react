import routes from '../services/appRoutes';
import { MENU_PERMISSIONS } from '../Sidebar/menuPermissions';

/**
 * A condition beyond permissions that the sidebar also applies, read from the
 * branch the user is working in. GlobalSearch decides each one exactly as the
 * sidebar does, so search never offers a screen the menu hides.
 */
export type GlobalSearchCondition = 'deliveryStock' | 'yearClosing' | 'tradingCombined' | 'tilesCombined' | 'installmentTrade' | 'platformAdmin' | 'separateReceived' | 'unifiedReceived' | 'separatePayment' | 'unifiedPayment';

export type GlobalSearchItem = {
  title: string;
  path: string;
  group: string;
  keywords?: string[];
  /**
   * Any one of these opens the item -- the same list the page's route guard
   * in App.tsx accepts, so a result can never land on No Access.
   */
  permissions?: string[];
  when?: GlobalSearchCondition;
};

const globalSearchItems: GlobalSearchItem[] = [
  { title: 'Dashboard', path: routes.dashboard, group: 'Dashboard', keywords: ['home'] },

  { title: 'Profile', path: routes.profile, group: 'Account' },

  { title: 'Reseller Dashboard', path: routes.reseller_dashboard, group: 'Reseller', permissions: ['reseller.dashboard.view'] },

  { title: 'Cash Received', path: routes.cash_receive, group: 'Transaction', keywords: ['cash receive', 'new cash receive', 'money received'], permissions: ['cash.received.create'], when: 'separateReceived' },
  { title: 'Cash Payment', path: routes.cash_payment, group: 'Transaction', keywords: ['new cash payment', 'pay cash'], permissions: ['cash.payment.create'], when: 'separatePayment' },
  { title: 'Bank Received', path: routes.bank_receive, group: 'Transaction', permissions: ['bank.received.create'], when: 'separateReceived' },
  { title: 'Bank Payment', path: routes.bank_payment, group: 'Transaction', permissions: ['bank.payment.create'], when: 'separatePayment' },
  { title: 'Employee Loan', path: routes.employee_loan, group: 'Transaction', permissions: ['hrm.loan.create'] },
  { title: 'Journal', path: routes.journal, group: 'Transaction', permissions: ['journal.create'] },

  { title: 'Branch Transfer', path: routes.branch_transfer, group: 'Inventory', permissions: ['branch.transfer.create', 'inventory.transfer.create', 'product.transfer.create', 'purchase.create', 'branch.issue.create'] },
  { title: 'Branch Received', path: routes.branch_received, group: 'Inventory', permissions: ['branch.received.create', 'inventory.received.create', 'product.received.create'] },

  { title: 'Transfer List', path: routes.report_branch_transfer_list, group: 'Report', keywords: ['challan list', 'issued challans', 'branch transfer list'], permissions: ['branch.issue.create', 'branch.transfer.create', 'inventory.transfer.create', 'product.transfer.create', 'product.stock.view'] },
  { title: 'Receive List', path: routes.report_branch_receive_list, group: 'Report', keywords: ['received challans', 'branch receive list'], permissions: ['branch.received.create', 'inventory.received.create', 'product.received.create', 'product.stock.view'] },

  { title: 'Trading Combined', path: routes.inv_trading_combined, group: 'Invoice', permissions: ['purchase.create', 'sales.create'], when: 'tradingCombined' },
  { title: 'Combined Invoice', path: routes.inv_tiles_combined, group: 'Invoice', keywords: ['tiles combined', 'tiles and sanitary'], permissions: ['purchase.create', 'sales.create'], when: 'tilesCombined' },
  { title: 'Purchase Invoice', path: routes.inv_purchase, group: 'Invoice', keywords: ['new purchase', 'buy', 'purchase entry'], permissions: ['purchase.create'] },
  { title: 'Purchase Import', path: routes.inv_purchase_import, group: 'Invoice', permissions: ['purchase.create', 'purchase.import'] },
  { title: 'Purchase Return', path: routes.inv_purchase_return, group: 'Invoice', permissions: ['purchase.create', 'purchase.return.view'] },
  { title: 'Sales Invoice', path: routes.inv_sales, group: 'Invoice', keywords: ['new sale', 'sell', 'sales entry'], permissions: ['sales.create'] },
  { title: 'Sales Import', path: routes.inv_sales_import, group: 'Invoice', permissions: ['sales.create', 'sales.import'] },
  { title: 'Sales Return', path: routes.inv_sales_return, group: 'Invoice', permissions: ['sales.create', 'sales.return'] },
  { title: 'Labour Invoice', path: routes.inv_labour, group: 'Invoice', permissions: ['labour.invoice.create'] },

  { title: 'Product List', path: routes.product_list, group: 'Products', permissions: ['products.view'] },
  { title: 'Add Product', path: routes.product_create, group: 'Products', keywords: ['new product', 'create product'], permissions: ['products.view'] },
  { title: 'Product Opening Import', path: routes.product_opening_import, group: 'Products', keywords: ['opening stock', 'excel', 'import', 'upload'], permissions: ['product.opening.edit', 'products.edit'] },

  { title: 'Customer Opening Import', path: routes.customer_opening_import, group: 'Customer & Supplier', keywords: ['opening balance', 'due', 'excel', 'import', 'upload'], permissions: ['party.opening.edit', 'cs.edit'] },

  { title: 'Low Stock Products', path: routes.product_low_stock, group: 'Products', permissions: ['products.view', 'low.stock'] },
  { title: 'Negative Stock Products', path: routes.product_negative_stock, group: 'Products', permissions: ['products.view', 'negative.stock'] },
  { title: 'Slow Moving Products', path: routes.product_slow_moving, group: 'Products', permissions: ['products.view', 'slow.moving'] },
  { title: 'Warehouse Difference', path: routes.product_warehouse_difference, group: 'Products', permissions: ['products.view', 'warehouse.difference'] },
  { title: 'Brand List', path: routes.brand_list, group: 'Products', permissions: ['products.view'] },
  { title: 'Product Units', path: routes.product_unit_list, group: 'Products', permissions: ['products.view', 'product.unit'] },
  { title: 'Category List', path: routes.category_list, group: 'Products', permissions: ['category.view'] },
  { title: 'Product Group', path: routes.product_group_list, group: 'Products', permissions: ['product_group.view'] },
  { title: 'Pack Size', path: routes.pack_size_list, group: 'Products', permissions: ['package.size.view'] },

  { title: 'Customer & Supplier List', path: routes.supplier_customer_list, group: 'Customer & Supplier', permissions: ['cs.delete', 'cs.edit', 'cs.information', 'cs.ledger', 'cs.photo.delete', 'cs.photo.edit', 'cs.photo.update', 'cs.photo.view', 'cs.update', 'cs.view', 'coa.l1.view', 'coa.l2.view', 'coa.l3.view', 'coa.l4.view', 'bank.opening.view', 'party.opening.view', 'party.opening.edit'] },
  { title: 'Add Customer & Supplier', path: routes.supplier_customer_add, group: 'Customer & Supplier', keywords: ['new customer', 'new supplier', 'create customer'], permissions: ['cs.delete', 'cs.edit', 'cs.information', 'cs.ledger', 'cs.photo.delete', 'cs.photo.edit', 'cs.photo.update', 'cs.photo.view', 'cs.update', 'cs.view', 'coa.l1.view', 'coa.l2.view', 'coa.l3.view', 'coa.l4.view', 'bank.opening.view', 'party.opening.view', 'party.opening.edit'] },

  { title: 'CoA L1', path: routes.coal1_list, group: 'Chart of Accounts', keywords: ['chart accounts level 1'], permissions: ['coa.l1.view'] },
  { title: 'CoA L2', path: routes.coal2_list, group: 'Chart of Accounts', keywords: ['chart accounts level 2'], permissions: ['coa.l2.view'] },
  { title: 'CoA L3', path: routes.coal3_list, group: 'Chart of Accounts', keywords: ['chart accounts level 3'], permissions: ['coa.l3.view'] },
  { title: 'CoA L4', path: routes.coal4_list, group: 'Chart of Accounts', keywords: ['chart accounts level 4'], permissions: ['coa.l4.view'] },
  { title: 'Account Opening Balance', path: routes.account_opening_balance, group: 'Chart of Accounts', keywords: ['bank opening balance', 'cash opening', 'mobile banking opening'], permissions: ['bank.opening.view'] },

  { title: 'Date Wise Total', path: routes.report_date_wise_total, group: 'Reports', permissions: ['date.wise.total'] },
  { title: 'Cashbook', path: routes.report_cashbook, group: 'Reports', permissions: ['cashbook.view'] },
  { title: 'Bank Book', path: routes.report_bankbook, group: 'Reports', permissions: ['cashbook.view', 'bank.book'] },
  { title: 'Profit Loss', path: routes.profit_loss, group: 'Reports', permissions: ['cashbook.view', 'profit.loss'] },
  { title: 'Balance Sheet', path: routes.balance_sheet, group: 'Reports', permissions: ['cashbook.view', 'balancesheet.view'] },
  { title: 'Trial Balance Level 3', path: routes.trial_balance_level3, group: 'Reports', permissions: ['cashbook.view', 'trial.balance.l3'] },
  { title: 'Trial Balance Level 4', path: routes.trial_balance_level4, group: 'Reports', permissions: ['cashbook.view', 'trial.balance.l4'] },
  { title: 'Bank Information', path: routes.bank_information, group: 'Reports', permissions: ['bank.information'] },
  { title: 'Connected Member', path: routes.connected_member, group: 'Reports', permissions: ['connected.member.view'] },
  { title: 'Product Profit Loss', path: routes.product_profit_loss, group: 'Reports', permissions: ['productwise.profit'] },
  { title: 'Customer Supplier Statement', path: routes.customer_supplier_statement, group: 'Reports', permissions: ['ledger.customer', 'ledger.details'] },
  { title: 'Due Installments', path: routes.due_installment_list, group: 'Reports', permissions: ['installment.create'], when: 'installmentTrade' },
  { title: 'Employee Installments', path: routes.employee_wise_installment, group: 'Reports', permissions: ['installment.create'], when: 'installmentTrade' },
  { title: 'Due List', path: routes.report_due_list, group: 'Reports', permissions: ['due.list', 'ledger.due.view'] },
  { title: 'Ledger', path: routes.report_ledger, group: 'Reports', permissions: ['ledger.view', 'ledger.customer'] },
  { title: 'Product In Out', path: routes.product_ledger_data, group: 'Reports', permissions: ['ledger.view', 'ledger.customer', 'product.in.out'] },
  { title: 'Labour Ledger', path: routes.report_labour_ledger, group: 'Reports', permissions: ['ledger.labour'] },
  { title: 'Purchase Ledger', path: routes.purchase_ledger, group: 'Reports', permissions: ['purchase.ledger'] },
  { title: 'Sales Ledger', path: routes.sales_ledger, group: 'Reports', permissions: ['sales.ledger'] },
  { title: 'Mitch Match', path: routes.mitch_match, group: 'Reports', keywords: ['mismatch'], permissions: ['mitch.match'] },
  { title: 'Group Report', path: routes.group_report, group: 'Reports', permissions: ['group.report'] },
  { title: 'Collection Sheet', path: routes.somity_collection_sheet, group: 'Reports', permissions: ['group.report', 'ledger.due.view', 'cashbook.view', 'collection.sheet'] },
  { title: 'Monthly Report', path: routes.somity_monthly_report, group: 'Reports', permissions: ['monthly.report'] },
  { title: 'Closing Stock', path: routes.report_closing_stock, group: 'Reports', permissions: ['product.stock.view'] },
  { title: 'Stock Details', path: routes.somity_stock_details, group: 'Reports', permissions: ['product.stock.view', 'product.stock.details'] },
  { title: 'Product Stock', path: routes.report_product_stock, group: 'Reports', permissions: ['product.stock.view'] },
  { title: 'IMEI Stock', path: routes.report_imei_stock, group: 'Reports', permissions: ['product.stock.view', 'imei.stock'] },
  { title: 'Category Wise In Out', path: routes.cat_wise_in_out, group: 'Reports', permissions: ['product.in.out'] },
  { title: 'Date Wise In Out', path: routes.report_date_wise_in_out, group: 'Reports', permissions: ['product.in.out'] },

  { title: 'Orders', path: routes.order_list, group: 'Orders', permissions: ['order.view'] },
  { title: 'Average Price', path: routes.order_avg_price, group: 'Orders', permissions: ['order.avg.price'] },
  { title: 'Order With Transaction', path: routes.order_with_transaction, group: 'Orders', permissions: ['order.view'] },

  { title: 'Day Close', path: routes.day_close, group: 'Admin', permissions: ['dayclose.create'] },
  { title: 'Jump Date', path: routes.day_jump, group: 'Admin', permissions: ['dayclose.jumpdate'] },
  { title: 'Branch List', path: routes.branch_list, group: 'Admin', permissions: ['branch.view'] },
  { title: 'Company List', path: routes.company_list, group: 'Admin', permissions: ['branch.view', 'company.view'] },
  { title: 'Users', path: routes.user_list, group: 'Admin', permissions: ['all.user.view', 'user.view'] },
  { title: 'Online Users', path: routes.online_users, group: 'Admin', permissions: ['all.user.view', 'user.view', 'online.users'] },
  { title: 'Check Register', path: routes.unit_payment_list, group: 'Admin', permissions: ['check.register.view'] },
  { title: 'Voucher Approval', path: routes.admin_voucher_approval, group: 'Admin', permissions: ['voucher.approval'] },
  { title: 'Remove Approval', path: routes.admin_remove_approval, group: 'Admin', permissions: ['remove.approval'] },
  { title: 'Change Voucher Type', path: routes.admin_change_voucher_type, group: 'Admin', permissions: ['change.vourcher.type'] },
  { title: 'Change Voucher Date', path: routes.admin_change_date, group: 'Admin', permissions: ['voucher.date.change'] },
  { title: 'Image Upload', path: routes.image_upload, group: 'Admin', permissions: ['voucher.photo.upload'] },
  { title: 'Bulk Upload', path: routes.bulk_upload, group: 'Admin', permissions: ['bulk.photo.upload'] },

  { title: 'Roles', path: routes.roles, group: 'User Management', permissions: ['roles.view', 'roles.create', 'roles.edit', 'roles.delete'] },
  { title: 'User Management', path: routes.user_management_list, group: 'User Management', permissions: ['roles.view'] },

  { title: 'Requisitions', path: routes.requisition, group: 'Requisition', permissions: ['requisition.view'] },
  { title: 'Create Requisition', path: routes.requisition_create, group: 'Requisition', permissions: ['requisition.create'] },
  { title: 'Requisition Comparison', path: routes.requisition_comparison, group: 'Requisition', permissions: ['requisition.comparison'] },

  { title: 'Voucher Delete', path: routes.voucher_delete, group: 'VR Settings', permissions: ['voucher.delete'] },
  { title: 'Installment Delete', path: routes.installment_delete, group: 'VR Settings', permissions: ['installment.delete'] },
  { title: 'Recycle Bin', path: routes.recyclebin, group: 'VR Settings', permissions: ['voucher.recycle'] },
  { title: 'Voucher History', path: routes.voucher_history, group: 'VR Settings', permissions: ['voucher.history'] },
  { title: 'Voucher Activity', path: routes.voucher_activity, group: 'VR Settings', permissions: ['log.changes'] },
  { title: 'Report Mismatch', path: routes.report_mismatch, group: 'VR Settings', keywords: ['company', 'balance sheet', 'difference'], permissions: ['mitmatch.report'] },

  { title: 'Employees', path: routes.hrms_employee_list, group: 'HRM', permissions: ['employee.view'] },
  { title: 'Designation Levels', path: routes.hrms_designation_level_list, group: 'HRM', permissions: ['employee.view'] },
  { title: 'Designations', path: routes.hrms_designation_list, group: 'HRM', permissions: ['employee.view'] },
  { title: 'Manual Attendance', path: routes.hrms_attendance_entries, group: 'HRM', keywords: ['attendance entry in out'], permissions: ['attendance.view', 'employee.view'] },
  { title: 'Attendance Report', path: routes.hrms_attendance_report, group: 'HRM', keywords: ['present absent attendance summary'], permissions: ['attendance.view', 'employee.view'] },
  { title: 'Overtime Report', path: routes.hrms_overtime_report, group: 'HRM', keywords: ['ot overtime eligible amount minutes attendance'], permissions: ['attendance.view', 'employee.view'] },
  { title: 'Attendance Alerts', path: routes.hrms_attendance_exception_reports, group: 'HRM', keywords: ['absent missing late early out exception report employee attendance deduction'], permissions: ['attendance.view', 'employee.view'] },
  { title: 'Employee Attendance', path: routes.hrms_employee_attendance_report, group: 'HRM', keywords: ['employee attendance history present absent leave late'], permissions: ['attendance.view', 'employee.view'] },
  { title: 'Branch Attendance Summary', path: routes.hrms_branch_attendance_summary, group: 'HRM', keywords: ['branch project attendance summary present absent late'], permissions: ['attendance.view', 'employee.view'] },
  { title: 'Holiday Calendar', path: routes.hrms_holiday_calendar_report, group: 'HRM', keywords: ['holiday calendar weekly holiday attendance'], permissions: ['attendance.view', 'employee.view'] },
  { title: 'Monthly Attendance', path: routes.hrms_attendance_monthly_report, group: 'HRM', keywords: ['attendance matrix monthly project'], permissions: ['attendance.view', 'employee.view'] },
  { title: 'Leave Applications', path: routes.hrms_leave_applications, group: 'HRM', keywords: ['leave approval application'], permissions: ['attendance.view', 'employee.view', 'leave.view'] },
  { title: 'Attendance Setup', path: routes.hrms_attendance_setup, group: 'HRM', keywords: ['shift holiday leave'], permissions: ['attendance.view', 'employee.view'] },
  { title: 'Salary Generate', path: routes.hrms_salary_generate, group: 'HRM', permissions: ['salary.generate'] },
  { title: 'Bonus Generate', path: routes.hrms_festival_bonus_generate, group: 'HRM', permissions: ['salary.generate'] },
  { title: 'Loan Balance', path: routes.employee_loan_balance, group: 'HRM', permissions: ['employee.loan.ledger.view', 'hrm.loan.create'] },
  { title: 'Loan Ledger', path: routes.employee_loan_ledger, group: 'HRM', permissions: ['employee.loan.ledger.view'] },
  { title: 'Salary Reports', path: routes.hrms_salary_sheet_list, group: 'HRM', permissions: ['salary.sheet.view'] },
  { title: 'Bonus Reports', path: routes.hrms_festival_bonus_list, group: 'HRM', permissions: ['salary.generate', 'salary.sheet.view'] },

  { title: 'Comparison', path: routes.item_chart, group: 'Analytics', permissions: ['analytics.comparison'] },

  { title: 'Customer Dashboard', path: routes.customer_dashboard, group: 'Customer', permissions: ['cs.view', 'ledger.customer', 'ledger.due.view', 'installment.create'] },

  // Every other screen the sidebar opens. Permissions are the page's own
  // route guard in App.tsx, so whatever search offers will open.
  { title: 'Delivery Dashboard', path: routes.delivery_dashboard, group: 'Dashboard', permissions: ['delivery.view'], when: 'deliveryStock' },

  { title: 'Bank Reconciliation', path: routes.bank_reconciliation, group: 'Transaction', keywords: ['bank statement match'], permissions: ['bank.reconciliation.view'] },
  { title: 'Cheque Register', path: routes.cheque_register, group: 'Transaction', permissions: ['cheque.register.view'] },
  { title: 'Year Closing', path: routes.year_closing, group: 'Transaction', keywords: ['close year', 'financial year end'], permissions: ['year.closing.run'], when: 'yearClosing' },
  { title: 'Budget', path: routes.budget, group: 'Transaction', permissions: ['budget.view'] },
  { title: 'Installments', path: routes.installment_list, group: 'Transaction', permissions: ['installment.create'] },

  { title: 'Delivery', path: routes.inv_delivery, group: 'Invoice', keywords: ['challan', 'deliver goods'], permissions: ['delivery.view'], when: 'deliveryStock' },

  { title: 'Branch Issue Report', path: routes.report_branch_transfer, group: 'Branch Transfer', permissions: ['branch.transfer.create', 'inventory.transfer.create', 'product.transfer.create', 'product.stock.view'] },
  { title: 'Branch Receive Report', path: routes.report_branch_receive, group: 'Branch Transfer', permissions: ['branch.received.create', 'inventory.received.create', 'product.received.create', 'product.stock.view'] },
  { title: 'Branch Stock', path: routes.report_branch_stock, group: 'Branch Transfer', permissions: ['product.stock.view', 'branch.transfer.create', 'branch.received.create'] },
  { title: 'Material Issue', path: routes.material_issue, group: 'Branch Transfer', permissions: ['material.issue.create', 'inventory.issue.create', 'purchase.create'] },
  { title: 'Product Out', path: routes.product_out, group: 'Branch Transfer', keywords: ['damage', 'lost', 'write off', 'stock out'], permissions: ['product.out.create'] },
  { title: 'Product Out Register', path: routes.product_out_report, group: 'Branch Transfer', keywords: ['write-off register', 'damage list'], permissions: ['product.out.report.view'] },
  { title: 'Product Out Reasons', path: routes.product_out_reason, group: 'Branch Transfer', permissions: ['product.out.reason.manage'] },
  { title: 'Product In', path: routes.product_in, group: 'Branch Transfer', keywords: ['stock in', 'found', 'return in'], permissions: ['product.in.create'] },
  { title: 'Product In Register', path: routes.product_in_report, group: 'Branch Transfer', keywords: ['stock in register'], permissions: ['product.in.report.view'] },
  { title: 'Product In Reasons', path: routes.product_in_reason, group: 'Branch Transfer', permissions: ['product.in.reason.manage'] },

  { title: 'Cash & Bank Book', path: routes.report_cashbook_two_column, group: 'Reports', keywords: ['two column', 'cash bank book'], permissions: ['cashbook.view'] },
  { title: 'Daily Account Book', path: routes.report_daily_account_book, group: 'Reports', permissions: ['cashbook.view'] },
  { title: 'Voucher Register', path: routes.report_voucher_register, group: 'Reports', keywords: ['all vouchers', 'voucher list'], permissions: ['voucher.register'] },
  { title: 'Sales Referrer', path: routes.report_referrer, group: 'Reports', permissions: ['sales.referrer'] },
  { title: 'Ageing', path: routes.ageing_report, group: 'Reports', keywords: ['due age', 'receivable ageing'], permissions: ['ageing.report.view'] },
  { title: 'Audit Trail', path: routes.audit_trail, group: 'Reports', keywords: ['who changed', 'activity log'], permissions: ['audit.trail.view'] },
  { title: 'Cash & Bank Summary', path: routes.cash_bank_received_payment, group: 'Reports', permissions: ['cashbook.view', 'cash.bank.summery'] },
  { title: 'Expense Report', path: routes.expense_report, group: 'Reports', permissions: ['cashbook.view', 'expense.report'] },
  { title: 'Godown Stock', path: routes.report_godown_stock, group: 'Reports', permissions: ['godown.stock'] },
  { title: 'Purchase Return', path: routes.purchase_return_ledger, group: 'Reports', permissions: ['purchase.ledger'] },
  { title: 'Sales Return', path: routes.sales_return_ledger, group: 'Reports', permissions: ['sales.ledger'] },
  { title: 'Delivery Report', path: routes.report_delivery, group: 'Reports', keywords: ['delivery list', 'challan report'], permissions: ['delivery.view'] },
  { title: 'Customer Sales', path: routes.report_customer_sales, group: 'Reports', permissions: ['sales.ledger'] },

  { title: 'Old ERP Record', path: routes.legacy_record, group: 'Old Software', permissions: ['legacy.record.view'] },
  { title: 'Old ERP Record (Old Version)', path: routes.legacy_old_record, group: 'Old Software', permissions: ['legacy.old.record.view'] },
  { title: 'Old ERP Account', path: routes.legacy_accounts, group: 'Old Software', permissions: ['legacy.record.view'] },

  { title: 'Product Tracking Settings', path: routes.product_tracking_settings, group: 'Product Tracking', permissions: ['product.tracking.settings.view'] },
  { title: 'Product Financial Statement', path: routes.product_financial_statement, group: 'Product Tracking', permissions: ['product.tracking.report.view'] },
  { title: 'Product Receivable & Payable', path: routes.product_tracking_summary, group: 'Product Tracking', permissions: ['product.tracking.report.view'] },

  { title: 'Company Scheme Receivable', path: routes.company_scheme_receivable, group: 'Company Scheme', permissions: ['company.scheme.view'] },
  { title: 'Company Scheme Receipts', path: routes.company_scheme_receipts, group: 'Company Scheme', permissions: ['company.scheme.view'] },

  { title: 'Real Estate Location', path: routes.real_estate_area_list, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Projects', path: routes.real_estate_project_list, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Buildings', path: routes.real_estate_buildings_list, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Floor List', path: routes.real_estate_floor_list, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Unit List', path: routes.real_estate_floor_unit_list, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Real Estate Charges', path: routes.real_estate_unit_types_list, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Layout', path: routes.real_estate_flat_layout, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Unit Sales', path: routes.real_estate_unit_sales, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Sold Units', path: routes.real_estate_sold_units, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Sales Summary', path: routes.report_sales_summary, group: 'Real Estate', permissions: ['real.estate.sales.summary'] },
  { title: 'Installment Create', path: routes.real_estate_installment_create, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Project Expense', path: routes.real_estate_project_expense, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Project Income', path: routes.real_estate_project_income, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Project Purchase', path: routes.real_estate_project_purchase, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Project Labour', path: routes.real_estate_project_labour, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Project Summary', path: routes.real_estate_project_summary_report, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Project Cost Report', path: routes.real_estate_project_cost_report, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Project Income Report', path: routes.real_estate_project_income_report, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },

  { title: 'Assets', path: routes.asset_setup, group: 'Assets', keywords: ['fixed asset', 'depreciation', 'asset register'], permissions: ['asset.category.view', 'asset.register.view'] },

  { title: 'Hotel Bookings', path: routes.hotel_bookings, group: 'Hotel', keywords: ['room booking', 'guest', 'check in', 'check out'], permissions: ['hotel.booking.view'] },
  { title: 'Hotel Calendar', path: routes.hotel_calendar, group: 'Hotel', keywords: ['tape chart', 'room availability'], permissions: ['hotel.booking.view'] },
  { title: 'Housekeeping', path: routes.hotel_housekeeping, group: 'Hotel', permissions: ['hotel.housekeeping.view'] },
  { title: 'Amenity Issue & Stock', path: routes.hotel_amenity_issue, group: 'Hotel', permissions: ['hotel.housekeeping.view'] },
  { title: 'Hotel Asset Purchase', path: routes.hotel_asset_purchase, group: 'Hotel', permissions: ['hotel.building.view', 'hotel.floor.view', 'hotel.room.type.view', 'hotel.resource.view', 'hotel.booking.view'] },
  { title: 'Hotel Payment Entry', path: routes.hotel_payment_entry, group: 'Transaction', permissions: ['transaction.payment.create'], when: 'unifiedPayment' },
  { title: 'Hotel Received Entry', path: routes.hotel_received_entry, group: 'Transaction', permissions: ['transaction.received.create'], when: 'unifiedReceived' },
  { title: 'Hotel Reports', path: routes.hotel_reports, group: 'Hotel', permissions: ['hotel.report.view'] },
  { title: 'Booking-wise Due', path: routes.hotel_booking_due, group: 'Hotel', keywords: ['hotel due', 'guest owes', 'outstanding'], permissions: ['hotel.booking.view'] },
  { title: 'Hotel Setup', path: routes.hotel_setup, group: 'Hotel', keywords: ['rooms', 'halls', 'floors', 'room types', 'shift'], permissions: ['hotel.building.view', 'hotel.floor.view', 'hotel.room.type.view', 'hotel.resource.view'] },

  { title: 'Product Statement', path: routes.product_statement, group: 'Products', permissions: ['products.view'] },

  { title: 'Labour Category', path: routes.labour_category, group: 'Labour Items', permissions: ['labour.category.view'] },
  { title: 'Labour Item', path: routes.labour_item, group: 'Labour Items', permissions: ['labour.item.view'] },

  { title: 'Print Template Designer', path: routes.print_template_designer, group: 'Admin', permissions: ['branch.view'] },
  { title: 'Software Information', path: routes.software_info, group: 'Admin', permissions: ['branch.view', 'software.information'] },
  { title: 'Arrange Menu', path: routes.menu_arrangement, group: 'Admin' },
  { title: 'Login History', path: routes.user_login_log, group: 'Admin', permissions: ['all.user.view', 'user.view', 'user.login.log'] },
  { title: 'Company User', path: routes.company_user_list, group: 'Admin', permissions: ['all.user.view', 'user.view', 'company.user'] },
  { title: 'Resellers', path: routes.reseller_admin, group: 'Admin', permissions: ['reseller.view', 'subscription.view', 'all.user.view'] },
  { title: 'Admin Notifications', path: routes.admin_notifications, group: 'Admin', permissions: ['reseller.view', 'subscription.view', 'all.user.view'] },
  { title: 'In-App Messages', path: routes.admin_in_app_messages, group: 'Admin', permissions: ['reseller.view', 'subscription.view', 'all.user.view'] },
  { title: 'Business Types', path: routes.business_types, group: 'Admin', permissions: ['reseller.view', 'subscription.view', 'all.user.view'] },
  { title: 'Inventory Systems', path: routes.inventory_systems, group: 'Admin', permissions: ['reseller.view', 'subscription.view', 'all.user.view'] },
  { title: 'Tutorial Videos', path: routes.tutorial_videos, group: 'Admin', permissions: ['reseller.view', 'subscription.view', 'all.user.view'] },
  { title: 'Website Templates', path: routes.website_templates, group: 'Admin', permissions: ['reseller.view', 'subscription.view', 'all.user.view'], when: 'platformAdmin' },
  { title: 'Highlight Rules', path: routes.highlight_rules, group: 'Admin', permissions: ['highlight.rules'] },
  { title: 'Add Role', path: routes.add_role, group: 'Admin', permissions: ['roles.view', 'roles.create', 'roles.edit', 'roles.delete'] },
  { title: 'Add Permission', path: routes.add_permission, group: 'Admin', permissions: ['roles.view', 'roles.create', 'roles.edit', 'roles.delete'] },
  { title: 'Add Group Report', path: routes.group_report_setup, group: 'Admin', permissions: ['group.report'] },
  { title: 'Approval Center', path: routes.approval_center, group: 'Admin', permissions: ['voucher.approval', 'attendance.view', 'approval.center'] },
  { title: 'SMS Logs', path: routes.sms_send, group: 'Admin', permissions: ['sms.logs'] },
  { title: 'SMS Templates', path: routes.sms_template_list, group: 'Admin', permissions: ['sms.templates'] },

  { title: 'Attendance Audit History', path: routes.hrms_attendance_audit_history, group: 'HRM', permissions: ['attendance.view', 'employee.view'] },
  { title: 'Salary Mismatch', path: routes.hrm_mismatch_payment, group: 'HRM', permissions: ['salary.sheet.view'] },

  // Forms and pages reached from inside another screen rather than the
  // sidebar -- the "+ Add" behind a list, the account pages behind the user
  // menu. Same rule: the page's own route guard. Pages that only work when
  // opened from a row (an edit, an update) are left out.
  { title: 'New Hotel Booking', path: routes.hotel_booking_new, group: 'Hotel', keywords: ['add booking', 'guest check in'], permissions: ['hotel.booking.view'] },
  { title: 'Hall Booking', path: routes.hotel_hall_bookings, group: 'Hotel', keywords: ['hall', 'community centre', 'shift'], permissions: ['hotel.booking.view'] },
  { title: 'New Amenity Issue', path: routes.hotel_amenity_issue_new, group: 'Hotel', permissions: ['hotel.housekeeping.view'] },
  { title: 'Add Category', path: routes.category_create, group: 'Products', keywords: ['new category'], permissions: ['category.view'] },
  { title: 'Add Brand', path: routes.brand_create, group: 'Products', keywords: ['new brand'], permissions: ['products.view'] },
  { title: 'Add Product Unit', path: routes.product_unit_create, group: 'Products', keywords: ['new unit'], permissions: ['products.view'] },
  { title: 'Add Labour Category', path: routes.labour_category_create, group: 'Labour Items', permissions: ['labour.category.view'] },
  { title: 'Add Labour Item', path: routes.labour_item_create, group: 'Labour Items', permissions: ['labour.item.view'] },
  { title: 'Add CoA L3', path: routes.coal3_add, group: 'Chart of Accounts', keywords: ['new account group'], permissions: ['coa.l3.view'] },
  { title: 'Add CoA L4', path: routes.coal4_add, group: 'Chart of Accounts', keywords: ['new account', 'new ledger head'], permissions: ['coa.l4.view'] },
  { title: 'Add Branch', path: routes.branch_add, group: 'Admin', keywords: ['new branch'], permissions: ['branch.view'] },
  { title: 'Add User', path: routes.user_add, group: 'Admin', keywords: ['new user'], permissions: ['all.user.create', 'user.create', 'user.store'] },
  { title: 'Add Order', path: routes.order_add, group: 'Orders', keywords: ['new order'], permissions: ['order.view'] },
  { title: 'Received Entry (Check Register)', path: routes.unit_payment_entry, group: 'Admin', permissions: ['check.register.view'] },
  { title: 'Order Print Template Designer', path: routes.order_template_designer, group: 'Admin', permissions: ['branch.view'] },
  { title: 'Approval Audit', path: routes.approval_center_audit, group: 'Admin', permissions: ['voucher.approval', 'attendance.view'] },
  { title: 'Add SMS Template', path: routes.sms_template_create, group: 'Admin', permissions: ['sms.templates'] },
  { title: 'Add Employee', path: routes.hrms_employee_add, group: 'HRM', keywords: ['new employee'], permissions: ['employee.view'] },
  { title: 'Add Designation Level', path: routes.hrms_designation_level_create, group: 'HRM', permissions: ['employee.view'] },
  { title: 'Add Designation', path: routes.hrms_designation_create, group: 'HRM', permissions: ['employee.view'] },
  { title: 'Absent Report', path: routes.hrms_absent_report, group: 'HRM', permissions: ['attendance.view', 'employee.view'] },
  { title: 'Late Report', path: routes.hrms_late_report, group: 'HRM', permissions: ['attendance.view', 'employee.view'] },
  { title: 'Early Out Report', path: routes.hrms_early_out_report, group: 'HRM', permissions: ['attendance.view', 'employee.view'] },
  { title: 'Add Real Estate Location', path: routes.real_estate_area_add, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Project Activities', path: routes.real_estate_project_activities, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Add Unit', path: routes.real_estate_add_floor_unit, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Add Charge', path: routes.real_estate_unit_types_create, group: 'Real Estate', permissions: MENU_PERMISSIONS.real_estate },
  { title: 'Switch Branch', path: routes.switch_branch, group: 'Account' },
  { title: 'Change Password', path: routes.change_password, group: 'Account' },
  { title: 'My Devices', path: routes.my_devices, group: 'Account' },
  { title: 'My Tasks', path: routes.my_tasks, group: 'Account', keywords: ['todo'] },
  { title: 'My Subscription', path: routes.my_subscription, group: 'Account', keywords: ['plan', 'package'] },
  { title: 'Billing History', path: routes.subscription_billing_history, group: 'Account', keywords: ['payment', 'invoice'] },
  { title: 'Pricing', path: routes.subscription_pricing, group: 'Account', keywords: ['upgrade', 'plans'] },
];

export default globalSearchItems;
