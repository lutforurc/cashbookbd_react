import routes from './appRoutes';
import type { RouteTab } from '../utils/others/RouteTabs';

// Menus whose screens show as tabs on one page. Each tab is its own route, so
// bookmarks, Global Search, help and tutorial links keep working.

// ---- HRM
export const ATTENDANCE_REPORT_TABS: RouteTab[] = [
  { label: 'Daily', path: routes.hrms_attendance_report, permission: 'hrm.attendance.report.view' },
  { label: 'Monthly', path: routes.hrms_attendance_monthly_report, permission: 'hrm.attendance.monthly.view' },
  { label: 'Overtime', path: routes.hrms_overtime_report, permission: 'hrm.overtime.report.view' },
  { label: 'Employee', path: routes.hrms_employee_attendance_report, permission: 'hrm.attendance.employee.view' },
  { label: 'Branch', path: routes.hrms_branch_attendance_summary, permission: 'hrm.attendance.branch.summary.view' },
  {
    label: 'Alerts',
    path: routes.hrms_attendance_exception_reports,
    permission: 'hrm.attendance.exception.view',
    also: [routes.hrms_absent_report, routes.hrms_late_report, routes.hrms_early_out_report],
  },
  { label: 'Holiday Calendar', path: routes.hrms_holiday_calendar_report, permission: 'hrm.holiday.calendar.view' },
];

export const ATTENDANCE_TABS: RouteTab[] = [
  { label: 'Manual Attendance', path: routes.hrms_attendance_entries, permission: 'hrm.attendance.view' },
  { label: 'Leave Applications', path: routes.hrms_leave_applications, permission: 'hrm.leave.view' },
  { label: 'Unmatched Punches', path: routes.hrms_attendance_unmatched, permission: 'hrm.attendance.view' },
];

export const ATTENDANCE_SETTINGS_TABS: RouteTab[] = [
  { label: 'Attendance Setup', path: routes.hrms_attendance_setup, permission: 'hrm.attendance.setup.view' },
  { label: 'Attendance Devices', path: routes.hrms_attendance_devices, permission: 'hrm.attendance.device.manage' },
  { label: 'Audit History', path: routes.hrms_attendance_audit_history, permission: 'hrm.attendance.audit.view' },
];

export const SALARY_SETUP_TABS: RouteTab[] = [
  { label: 'Salary Components', path: routes.hrms_salary_component_list, permission: 'salary.component.manage', forms: true },
  { label: 'Salary Structures', path: routes.hrms_salary_structure_list, permission: 'salary.structure.manage', forms: true },
];

// Bonus Reports has no `forms`: /hrms/festival-bonus/generate belongs to Generate.
export const SALARY_REPORT_TABS: RouteTab[] = [
  { label: 'Salary Reports', path: routes.hrms_salary_sheet_list, permission: 'salary.sheet.view', forms: true },
  { label: 'Bonus Reports', path: routes.hrms_festival_bonus_list, permission: 'festival.bonus.view' },
  { label: 'Salary Mismatch', path: routes.hrm_mismatch_payment, permission: 'hrm.mismatch.payment.view' },
];

export const SALARY_GENERATE_TABS: RouteTab[] = [
  { label: 'Salary Generate', path: routes.hrms_salary_generate, permission: 'salary.generate' },
  { label: 'Bonus Generate', path: routes.hrms_festival_bonus_generate, permission: 'festival.bonus.generate', also: [routes.hrms_festival_bonus_update] },
];

export const LOAN_TABS: RouteTab[] = [
  { label: 'Loan Balance', path: routes.employee_loan_balance, permission: 'employee.loan.balance.view' },
  { label: 'Loan Ledger', path: routes.employee_loan_ledger, permission: 'employee.loan.ledger.view' },
];

export const DESIGNATION_TABS: RouteTab[] = [
  { label: 'Designations', path: routes.hrms_designation_list, permission: 'hrm.designation.view', forms: true },
  { label: 'Designation Levels', path: routes.hrms_designation_level_list, permission: 'hrm.designation.level.view', forms: true },
];

// ---- Admin
// Approval Center's audit page lives under its path (forms) and stays full-page.
export const DAILY_CONTROL_TABS: RouteTab[] = [
  { label: 'Day Close', path: routes.day_close, permission: 'dayclose.create' },
  { label: 'Approval Center', path: routes.approval_center, permission: 'approval.center', forms: true },
  { label: 'Voucher Approval', path: routes.admin_voucher_approval, permission: 'voucher.approval' },
  { label: 'Approval Remove', path: routes.admin_remove_approval, permission: 'remove.approval' },
  { label: 'Change Voucher Type', path: routes.admin_change_voucher_type, permission: 'change.vourcher.type' },
];

export const ORDER_TABS: RouteTab[] = [
  { label: 'Orders', path: routes.order_list, permission: 'order.view' },
  { label: 'Order With Transaction', path: routes.order_with_transaction, permission: 'order.transaction.view' },
  { label: 'Average Price', path: routes.order_avg_price, permission: 'order.avg.price' },
];

export const UPLOAD_TABS: RouteTab[] = [
  { label: 'Voucher Upload', path: routes.image_upload, permission: 'voucher.photo.upload' },
  { label: 'Bulk Upload', path: routes.bulk_upload, permission: 'bulk.photo.upload' },
];

// Paper Layout's paper switcher moves to the order-layout route; the tab stays lit there.
export const COMPANY_BRANCH_TABS: RouteTab[] = [
  { label: 'Company Settings', path: routes.company_list, permission: 'company.view' },
  { label: 'Branch Settings', path: routes.branch_list, permission: 'branch.view' },
  { label: 'Paper Layout', path: routes.print_template_designer, permission: 'print.template.view', also: [routes.order_template_designer] },
  { label: 'Software Information', path: routes.software_info, permission: 'software.information' },
];

export const USER_TABS: RouteTab[] = [
  { label: 'User List', path: routes.user_list, permission: 'all.user.view' },
  { label: 'Company User', path: routes.company_user_list, permission: 'company.user' },
  { label: 'Online Users', path: routes.online_users, permission: 'online.users' },
  { label: 'Login History', path: routes.user_login_log, permission: 'user.login.log' },
];

export const ROLE_TABS: RouteTab[] = [
  { label: 'Roles', path: routes.roles, permission: 'roles.view' },
  { label: 'Add Roles', path: routes.add_role, permission: 'roles.create' },
  { label: 'Add Permission', path: routes.add_permission, permission: 'permission.create' },
];

export const ADMIN_SETTINGS_TABS: RouteTab[] = [
  { label: 'Add Group Report', path: routes.group_report_setup, permission: 'group.report.setup' },
  { label: 'Highlight Rules', path: routes.highlight_rules, permission: 'highlight.rules' },
  { label: 'Arrange Menu', path: routes.menu_arrangement, permission: 'menu.arrangement' },
];

// Website Templates: the platform admin only, whatever the permission says -- its API sits
// behind platform.admin, so a tenant holding the permission would only be refused.
export const PLATFORM_TABS: RouteTab[] = [
  { label: 'Resellers', path: routes.reseller_admin, permission: 'reseller.view' },
  { label: 'Admin Notifications', path: routes.admin_notifications, permission: 'admin.notifications.view' },
  { label: 'In-App Messages', path: routes.admin_in_app_messages, permission: 'admin.in.app.messages.view', forms: true },
  { label: 'Business Types', path: routes.business_types, permission: 'business.create' },
  { label: 'Inventory Systems', path: routes.inventory_systems, permission: 'inventory.systems.view' },
  { label: 'Tutorial Videos', path: routes.tutorial_videos, permission: 'tutorial.videos.manage' },
  { label: 'Website Templates', path: routes.website_templates, permission: 'website.templates.manage', forms: true, platformOnly: true },
];

export const SMS_TABS: RouteTab[] = [
  { label: 'SMS Logs', path: routes.sms_send, permission: 'sms.logs' },
  { label: 'SMS Templates', path: routes.sms_template_list, permission: 'sms.templates', forms: true },
];

// ---- Products
export const PRODUCT_TABS: RouteTab[] = [
  { label: 'Product List', path: routes.product_list, permission: 'products.view' },
  { label: 'Product Statement', path: routes.product_statement, permission: 'product.statement.view' },
  { label: 'Opening Import', path: routes.product_opening_import, permission: 'product.opening.edit' },
];

export const CLASSIFICATION_TABS: RouteTab[] = [
  { label: 'Category', path: routes.category_list, permission: 'category.view' },
  { label: 'Brand', path: routes.brand_list, permission: 'brand.list' },
  { label: 'Product Group', path: routes.product_group_list, permission: 'product_group.view' },
  { label: 'Pack Size', path: routes.pack_size_list, permission: 'package.size.view' },
  { label: 'Product Unit', path: routes.product_unit_list, permission: 'product.unit' },
];

export const STOCK_ALERT_TABS: RouteTab[] = [
  { label: 'Low Stock', path: routes.product_low_stock, permission: 'low.stock' },
  { label: 'Negative Stock', path: routes.product_negative_stock, permission: 'negative.stock' },
  { label: 'Slow Moving', path: routes.product_slow_moving, permission: 'slow.moving' },
  { label: 'Warehouse Difference', path: routes.product_warehouse_difference, permission: 'warehouse.difference' },
];

// ---- VR Settings
export const VR_CORRECTION_TABS: RouteTab[] = [
  { label: 'Voucher Date Change', path: routes.admin_change_date, permission: 'voucher.date.change' },
  { label: 'Voucher Delete', path: routes.voucher_delete, permission: 'voucher.delete' },
  { label: 'Installment Delete', path: routes.installment_delete, permission: 'installment.delete' },
  { label: 'Recycle Bin', path: routes.recyclebin, permission: 'voucher.recycle' },
];

export const VR_AUDIT_TABS: RouteTab[] = [
  { label: 'History', path: routes.voucher_history, permission: 'voucher.history' },
  { label: 'Log Changes', path: routes.voucher_activity, permission: 'log.changes' },
  { label: 'Report Mismatch', path: routes.report_mismatch, permission: 'mitmatch.report' },
  { label: 'Audit Trail', path: routes.audit_trail, permission: 'audit.trail.view' },
  { label: 'Mismatch', path: routes.mitch_match, permission: 'mitch.match' },
];

// ---- Customer & Supplier
export const PARTY_TABS: RouteTab[] = [
  { label: 'Customers', path: routes.supplier_customer_list, permission: 'cs.view' },
  { label: 'Opening Import', path: routes.customer_opening_import, permission: 'party.opening.edit' },
];

export const COA_TABS: RouteTab[] = [
  { label: 'CoA L1', path: routes.coal1_list, permission: 'coa.l1.view' },
  { label: 'CoA L2', path: routes.coal2_list, permission: 'coa.l2.view' },
  { label: 'CoA L3', path: routes.coal3_list, permission: 'coa.l3.view' },
  { label: 'Accounts Head List', path: routes.coal4_list, permission: 'coa.l4.view' },
  { label: 'Bank Opening', path: routes.account_opening_balance, permission: 'bank.opening.view' },
];

// ---- Reports (each tab keeps the permission its sidebar entry checked)
export const REPORT_CASH_BANK_TABS: RouteTab[] = [
  { label: 'Cash Book', path: routes.report_cashbook, permission: 'cashbook.view' },
  { label: 'Cash & Bank Book', path: routes.report_cashbook_two_column, permission: 'bankbook.view' },
  { label: 'Daily Account Book', path: routes.report_daily_account_book, permission: 'daily.accounts.book' },
  { label: 'Bank Book', path: routes.report_bankbook, permission: 'bank.book' },
  { label: 'Cash & Bank Summary', path: routes.cash_bank_received_payment, permission: 'cash.bank.summery' },
  { label: 'Bank Information', path: routes.bank_information, permission: 'bank.information' },
  { label: 'Datewise Cash Total', path: routes.report_date_wise_total, permission: 'date.wise.total' },
  { label: 'Voucher Register', path: routes.report_voucher_register, permission: 'voucher.register' },
];

export const REPORT_LEDGER_TABS: RouteTab[] = [
  { label: 'Ledger', path: routes.report_ledger, permission: 'ledger.customer' },
  { label: 'Ledger Details', path: routes.customer_supplier_statement, permission: 'ledger.details' },
  { label: 'Labour Ledger', path: routes.report_labour_ledger, permission: 'ledger.labour' },
  { label: 'Due List', path: routes.report_due_list, permission: 'due.list' },
  { label: 'Ageing', path: routes.ageing_report, permission: 'ageing.report.view' },
  { label: 'Connected Member', path: routes.connected_member, permission: 'connected.member.view' },
  { label: 'Group Report', path: routes.group_report, permission: 'group.report' },
];

export const REPORT_SALES_TABS: RouteTab[] = [
  { label: 'Purchase Ledger', path: routes.purchase_ledger, permission: 'purchase.ledger' },
  { label: 'Tiles Purchase', path: routes.report_tiles_purchase, permission: 'tiles.purchase.report' },
  { label: 'Sales Ledger', path: routes.sales_ledger, permission: 'sales.ledger' },
  { label: 'Purchase Return', path: routes.purchase_return_ledger, permission: 'purchase.return.ledger' },
  { label: 'Sales Return', path: routes.sales_return_ledger, permission: 'sales.return.ledger' },
  { label: 'Customer Sales', path: routes.report_customer_sales, permission: 'customer.sales.report' },
  { label: 'Delivery Report', path: routes.report_delivery, permission: 'delivery.report.view' },
  { label: 'Referer', path: routes.report_referrer, permission: 'sales.referrer' },
];

export const REPORT_STOCK_TABS: RouteTab[] = [
  { label: 'Product Stock', path: routes.report_product_stock, permission: 'product.stock.view' },
  { label: 'Stock Details', path: routes.somity_stock_details, permission: 'product.stock.details' },
  { label: 'Godown Stock', path: routes.report_godown_stock, permission: 'godown.stock' },
  { label: 'IMEI Stock', path: routes.report_imei_stock, permission: 'imei.stock' },
  { label: 'Product In Out', path: routes.product_ledger_data, permission: 'product.in.out' },
  { label: 'Date-wise In/Out', path: routes.report_date_wise_in_out, permission: 'product.in.out.datewise' },
  { label: 'Cat-wise In/Out', path: routes.cat_wise_in_out, permission: 'product.in.out.catwise' },
];

// The two installment reports exist only on business type 4 (real estate) branches.
export const REPORT_INSTALLMENT_TABS: RouteTab[] = [
  { label: 'Due Installments', path: routes.due_installment_list, permission: 'installment.due.view', businessType: 4 },
  { label: 'Employee Installments', path: routes.employee_wise_installment, permission: 'installment.employee.view', businessType: 4 },
  { label: 'Collection Sheet', path: routes.somity_collection_sheet, permission: 'collection.sheet' },
  { label: 'Monthly Report', path: routes.somity_monthly_report, permission: 'monthly.report' },
];
