import routes from '../services/appRoutes';

/**
 * Which screens belong to which sidebar group.
 *
 * The groups used to answer "am I the open one?" from a hand-written list of
 * paths inside the sidebar -- two lists per group, in fact, one for the
 * highlight and one for the arrow, and they had drifted apart. A screen missing
 * from a list simply lost the mark: clicking Bank Book took the blue bar off
 * Reports, because Bank Book was in the menu but not in the list.
 *
 * This is that answer in one place, and it was read from the sidebar itself, so
 * it starts out matching what the menu actually links to. A screen added to a
 * group belongs here too -- one line, next to the link.
 */
export const MENU_ROUTES: Record<string, string[]> = {
  'dashboard': [
    '/dashboard',
  ],
  'transaction': [
    routes.cash_receive,
    '/accounts/cash/payment',
    '/accounts/bank/receive',
    '/accounts/bank/payment',
    routes.installment_list,
    routes.employee_loan,
    '/accounts/journal',
  ],
  'invoice': [
    '/invoice/purchase',
    routes.inv_purchase_import,
    '/invoice/sales',
    routes.inv_sales_import,
    routes.inv_purchase_return,
    routes.inv_sales_return,
    '/invoice/labour-invoice',
    routes.inv_trading_combined,
  ],
  'branch-transfer': [
    routes.branch_transfer,
    routes.branch_received,
    routes.report_branch_transfer_list,
    routes.report_branch_receive_list,
    routes.report_branch_transfer,
    routes.report_branch_receive,
    routes.report_branch_stock,
    routes.material_issue,
  ],
  'reports': [
    '/reports/cashbook',
    routes.report_bankbook,
    routes.cash_bank_received_payment,
    routes.profit_loss,
    routes.product_profit_loss,
    routes.bank_information,
    routes.connected_member,
    routes.balance_sheet,
    routes.trial_balance_level3,
    routes.trial_balance_level4,
    routes.expense_report,
    '/reports/due-installments',
    '/reports/employee-installment',
    '/reports/ledger',
    routes.customer_supplier_statement,
    routes.product_ledger_data,
    routes.report_date_wise_in_out,
    '/reports/labour/ledger',
    '/reports/due-list',
    routes.somity_collection_sheet,
    routes.somity_monthly_report,
    '/reports/date-wise-total-data',
    '/reports/product/stock',
    routes.somity_stock_details,
    routes.report_imei_stock,
    routes.report_godown_stock,
    '/reports/cat-wise/in-out',
    '/reports/purchase-ledger',
    '/reports/sales-ledger',
    '/reports/group-report',
    '/reports/mitch-match',
    // Reached from a list on one of the screens above rather than from the menu
    // itself; the old hand-written condition knew about it and this keeps that.
    '/reports/closing-stock',
  ],
  'product_tracking': [
    routes.product_tracking_settings,
    routes.product_financial_statement,
    routes.product_tracking_summary,
  ],
  'requisition': [
    routes.requisition,
    routes.requisition_create,
    routes.requisition_comparison,
  ],
  'real-estate': [
    '/admin/check-register',
    routes.unit_payment_list,
    '/real-estate/area-list',
    routes.real_estate_project_list,
    routes.real_estate_buildings_list,
    routes.real_estate_floor_list,
    routes.real_estate_floor_unit_list,
    routes.real_estate_unit_types_list,
    '/real-estate/flat-layout',
    '/real-estate/unit-sales',
    routes.real_estate_sold_units,
    routes.report_sales_summary,
    routes.real_estate_installment_create,
    routes.real_estate_project_expense,
    routes.real_estate_project_income,
    routes.real_estate_project_purchase,
    routes.real_estate_project_labour,
    routes.real_estate_project_summary_report,
    routes.real_estate_project_cost_report,
    routes.real_estate_project_income_report,
    // Reached from a list on one of the screens above rather than from the menu
    // itself; the old hand-written condition knew about it and this keeps that.
    '/real-estate/add-area',
    '/real-estate/add-unit',
    '/real-estate/buildings',
    '/real-estate/project-activities',
    '/real-estate/unit-types/create',
  ],
  'hotel': [
    routes.hotel_setup,
    routes.hotel_bookings,
    routes.hotel_reports,
    routes.hotel_calendar,
    routes.hotel_housekeeping,
    // No menu entry of its own -- it is reached from a booking. Listed so the
    // Hotel menu stays open and marked while somebody is on it.
    routes.hotel_booking_check_in,
    // Reached from a booking too, and listed for the same reason.
    routes.hotel_booking_check_out,
  ],
  'products': [
    '/brand/brand-list',
    '/category/category-list',
    '/product/product-list',
    routes.product_low_stock,
    routes.product_negative_stock,
    routes.product_slow_moving,
    routes.product_warehouse_difference,
    routes.product_unit_list,
    // Reached from a list on one of the screens above rather than from the menu
    // itself; the old hand-written condition knew about it and this keeps that.
    '/category/edit',
    '/product/edit',
    '/product-unit/unit-create',
  ],
  'labour_items': [
    routes.labour_category,
    routes.labour_item,
  ],
  'admin': [
    routes.company_list,
    '/branch/branch-list',
    routes.print_template_designer,
    routes.order_template_designer,
    routes.software_info,
    routes.menu_arrangement,
    routes.user_list,
    routes.online_users,
    routes.user_login_log,
    routes.company_user_list,
    routes.reseller_admin,
    routes.admin_notifications,
    routes.admin_in_app_messages,
    routes.business_types,
    routes.inventory_systems,
    routes.tutorial_videos,
    routes.highlight_rules,
    routes.roles,
    routes.add_role,
    routes.add_permission,
    '/admin/dayclose',
    routes.group_report_setup,
    '/order/order-list',
    routes.order_with_transaction,
    '/orders/avg-price',
    routes.approval_center,
    '/admin/voucher-approval',
    '/admin/remove-approval',
    '/admin/voucher/type-change',
    '/admin/image-upload',
    '/admin/bulk-upload',
    routes.sms_send,
    routes.sms_template_list,
    // Reached from a list on one of the screens above rather than from the menu
    // itself; the old hand-written condition knew about it and this keeps that.
    '/admin/jumpdate',
  ],
  'vr_settings': [
    '/vr-settings/voucher-delete',
    '/vr-settings/installment-delete',
    routes.admin_change_date,
    routes.recyclebin,
    routes.voucher_history,
    routes.voucher_activity,
  ],
  'hrm': [
    '/hrms/employees',
    routes.hrms_designation_level_list,
    routes.hrms_designation_list,
    routes.hrms_attendance_entries,
    routes.hrms_attendance_report,
    routes.hrms_attendance_audit_history,
    routes.hrms_overtime_report,
    routes.hrms_attendance_monthly_report,
    routes.hrms_attendance_exception_reports,
    routes.hrms_employee_attendance_report,
    routes.hrms_branch_attendance_summary,
    routes.hrms_holiday_calendar_report,
    routes.hrms_leave_applications,
    routes.hrms_attendance_setup,
    '/hrms/salary/salary-generate',
    routes.hrms_festival_bonus_generate,
    routes.employee_loan_balance,
    routes.employee_loan_ledger,
    '/hrms/salary-sheet',
    routes.hrm_mismatch_payment,
    routes.hrms_festival_bonus_list,
  ],
  'customer-supplier': [
    '/customer-supplier/list',
    '/coal1/coal1-list',
    '/coal2/coal2-list',
    '/coal3/coal3-list',
    '/coal4/coal4-list',
    '/coal4/opening-balance',
  ],
  'al-charts': [
    '/item/item-chart',
  ],
};

/**
 * Whether a group holds the screen on show.
 *
 * A child path counts when it is the whole path or the start of one, so an
 * edit screen sitting under its list -- /reports/ledger/42 -- keeps its group
 * lit rather than dropping the mark the moment a row is opened.
 */
export const isMenuActive = (menuId: string, pathname: string): boolean =>
  (MENU_ROUTES[menuId] ?? []).some(
    (path) => Boolean(path) && (pathname === path || pathname.startsWith(path + '/')),
  );
