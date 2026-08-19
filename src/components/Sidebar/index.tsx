import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
import {
  dividerLabel,
  isDivider,
  useSidebarCustomization,
  useSidebarSubCustomization,
} from './sidebarCustomization';

/**
 * Every menu that can be moved, in the order the code declares them.
 *
 * The ids are what a user's saved arrangement refers to, so they must not be
 * renamed once a release has shipped -- an id that changes reads as a menu that
 * was removed and a different one added, and the user's position for it is lost.
 * The titles are what the arrange panel shows.
 */
/**
 * The entries inside each menu, in the order the code declares them.
 *
 * Generated from the markup below, so the arrange panel always lists exactly
 * what the sidebar renders. The ids are the route each entry points at -- the
 * one thing about an entry that is unique and does not change when a label is
 * reworded, and what a saved arrangement refers to.
 */
export const SIDEBAR_SUBMENUS: Record<string, { id: string; title: string }[]> = {
  // My Tasks is not here: it lives in the user dropdown beside My Profile, and
  // this list must name exactly what the sidebar renders or the arrange panel
  // offers a row that cannot be moved.
  'dashboard': [
    { id: 'dashboard', title: "Dashboard" },
  ],
  'transaction': [
    { id: 'cash_receive', title: "Cash Received" },
    { id: 'accounts/cash/payment', title: "Cash Payment" },
    { id: 'accounts/bank/receive', title: "Bank Received" },
    { id: 'accounts/bank/payment', title: "Bank Payment" },
    { id: 'installment_list', title: "Installments" },
    { id: 'employee_loan', title: "Employee Loan" },
    { id: 'accounts/journal', title: "Journal" },
  ],
  'invoice': [
    { id: 'invoice/purchase', title: "Purchase" },
    { id: 'inv_purchase_import', title: "Purchase Import" },
    { id: 'invoice/sales', title: "Sales" },
    { id: 'inv_sales_import', title: "Sales Import" },
    { id: 'inv_purchase_return', title: "Purchase Return" },
    { id: 'inv_sales_return', title: "Sales Return" },
    { id: 'invoice/labour-invoice', title: "Labour Invoice" },
    { id: 'inv_trading_combined', title: "Combined Invoice" },
  ],
  'labour_items': [
    { id: 'labour_category', title: "Category" },
    { id: 'labour_item', title: "Item" },
  ],
  'branch-transfer': [
    { id: 'branch_transfer', title: "Branch Issue" },
    { id: 'branch_received', title: "Branch Receive" },
    { id: 'material_issue', title: "Material Issue" },
    { id: 'report_branch_transfer_list', title: "Transfer List" },
    { id: 'report_branch_receive_list', title: "Receive List" },
    { id: 'report_branch_transfer', title: "Issue Report" },
    { id: 'report_branch_receive', title: "Receive Report" },
    { id: 'report_branch_stock', title: "Branch Stock" },
  ],
  'reports': [
    { id: 'reports/cashbook', title: "Cash Book" },
    { id: 'report_bankbook', title: "Bank Book" },
    { id: 'cash_bank_received_payment', title: "Cash &amp; Bank Summary" },
    { id: 'profit_loss', title: "Profit Loss" },
    { id: 'product_profit_loss', title: "Product Profit Loss" },
    { id: 'bank_information', title: "Bank Information" },
    { id: 'connected_member', title: "Connected Member" },
    { id: 'balance_sheet', title: "Balance Sheet" },
    { id: 'trial_balance_level3', title: "Trial Balance Group" },
    { id: 'trial_balance_level4', title: "Trial Balance Details" },
    { id: 'expense_report', title: "Expense Report" },
    { id: 'reports/due-installments', title: "Due Installments" },
    { id: 'reports/employee-installment', title: "Employee Installments" },
    { id: 'reports/ledger', title: "Ledger" },
    { id: 'customer_supplier_statement', title: "Ledger Details" },
    { id: 'product_ledger_data', title: "Product In Out" },
    { id: 'report_date_wise_in_out', title: "Date-wise In\/Out" },
    { id: 'reports/labour/ledger', title: "Labour Ledger" },
    { id: 'reports/due-list', title: "Due List" },
    { id: 'somity_collection_sheet', title: "Collection Sheet" },
    { id: 'somity_monthly_report', title: "Monthly Report" },
    { id: 'reports/date-wise-total-data', title: "Datewise Cash Total" },
    { id: 'reports/product/stock', title: "Product Stock" },
    { id: 'somity_stock_details', title: "Stock Details" },
    { id: 'report_imei_stock', title: "IMEI Stock" },
    { id: 'report_godown_stock', title: "Godown Stock" },
    { id: 'reports/cat-wise/in-out', title: "Cat-wise In\/Out" },
    { id: 'reports/purchase-ledger', title: "Purchase Ledger" },
    { id: 'reports/sales-ledger', title: "Sales Ledger" },
    { id: 'reports/group-report', title: "Group Report" },
    { id: 'reports/mitch-match', title: "Mismatch" },
  ],
  'product_tracking': [
    { id: 'product_tracking_settings', title: "Product Tracking" },
    { id: 'product_financial_statement', title: "Product Statement" },
    { id: 'product_tracking_summary', title: "Product Receivable \/ Payable" },
  ],
  'requisition': [
    { id: 'requisition', title: "Requisitions" },
    { id: 'requisition_create', title: "Create" },
    { id: 'requisition_comparison', title: "Comparison" },
  ],
  'real-estate': [
    { id: 'admin/check-register', title: "Check Register" },
    { id: 'real-estate/area-list', title: "Location" },
    { id: 'real_estate_project_list', title: "Projects" },
    { id: 'real_estate_buildings_list', title: "Buildings" },
    { id: 'real_estate_floor_list', title: "Floor List" },
    { id: 'real_estate_floor_unit_list', title: "Unit List" },
    { id: 'real_estate_unit_types_list', title: "Chareges" },
    { id: 'real-estate/flat-layout', title: "Layout" },
    { id: 'real-estate/unit-sales', title: "Unit Sales" },
    { id: 'real_estate_sold_units', title: "Sold Units" },
    { id: 'report_sales_summary', title: "Sales Summary" },
    { id: 'real_estate_installment_create', title: "Installment Create" },
    { id: 'real_estate_project_expense', title: "Project Expense" },
    { id: 'real_estate_project_income', title: "Project Income" },
    { id: 'real_estate_project_purchase', title: "Project Purchase" },
    { id: 'real_estate_project_labour', title: "Project Labour" },
    { id: 'real_estate_project_summary_report', title: "Project Summary" },
    { id: 'real_estate_project_cost_report', title: "Project Cost Report" },
    { id: 'real_estate_project_income_report', title: "Project Income Report" },
  ],
  'products': [
    { id: 'brand/brand-list', title: "Brand List" },
    { id: 'category/category-list', title: "Category List" },
    { id: 'product/product-list', title: "Product List" },
    { id: 'product_low_stock', title: "Low Stock" },
    { id: 'product_negative_stock', title: "Negative Stock" },
    { id: 'product_slow_moving', title: "Slow Moving" },
    { id: 'product_warehouse_difference', title: "Warehouse Difference" },
    { id: 'product_unit_list', title: "Product Unit" },
  ],
  'admin': [
    { id: 'company_list', title: "Company List" },
    { id: 'branch/branch-list', title: "Branch List" },
    { id: 'software_info', title: "Software Information" },
    { id: 'menu_arrangement', title: "Arrange Menu" },
    { id: 'user_list', title: "User List" },
    { id: 'online_users', title: "Online Users" },
    { id: 'user_login_log', title: "Login History" },
    { id: 'company_user_list', title: "Company User" },
    { id: 'reseller_admin', title: "Resellers" },
    { id: 'admin_notifications', title: "Admin Notifications" },
    { id: 'admin_in_app_messages', title: "In-App Messages" },
    { id: 'inventory_systems', title: "Inventory Systems" },
    { id: 'tutorial_videos', title: "Tutorial Videos" },
    { id: 'highlight_rules', title: "Highlight Rules" },
    { id: 'roles', title: "Roles" },
    { id: 'add_role', title: "Add Roles" },
    { id: 'add_permission', title: "Add Permission" },
    { id: 'admin/dayclose', title: "Day Close" },
    { id: 'group_report_setup', title: "Add Group Report" },
    { id: 'order/order-list', title: "Orders" },
    { id: 'order_with_transaction', title: "Order With Transaction" },
    { id: 'orders/avg-price', title: "Average Price" },
    { id: 'approval_center', title: "Approval Center" },
    { id: 'admin/voucher-approval', title: "Voucher Approval" },
    { id: 'admin/remove-approval', title: "Approval Remove" },
    { id: 'admin/voucher/type-change', title: "Change Voucher Type" },
    { id: 'admin/image-upload', title: "Voucher Upload" },
    { id: 'admin/bulk-upload', title: "Bulk Upload" },
    { id: 'sms_send', title: "SMS Logs" },
    { id: 'sms_template_list', title: "SMS Templates" },
  ],
  'vr_settings': [
    { id: 'vr-settings/voucher-delete', title: "Voucher Delete" },
    { id: 'vr-settings/installment-delete', title: "Installment Delete" },
    { id: 'admin_change_date', title: "Voucher Date Change" },
    { id: 'recyclebin', title: "Recycle Bin" },
    { id: 'voucher_history', title: "History" },
    { id: 'voucher_activity', title: "Log Changes" },
  ],
  'hrm': [
    { id: 'hrms/employees', title: "Employees" },
    { id: 'hrms_designation_level_list', title: "Designation Levels" },
    { id: 'hrms_designation_list', title: "Designations" },
    { id: 'hrms_attendance_entries', title: "Manual Attendance" },
    { id: 'hrms_attendance_report', title: "Attendance Report" },
    { id: 'hrms_attendance_audit_history', title: "Audit History" },
    { id: 'hrms_overtime_report', title: "Overtime Report" },
    { id: 'hrms_attendance_monthly_report', title: "Monthly Attendance" },
    { id: 'hrms_attendance_exception_reports', title: "Attendance Alerts" },
    { id: 'hrms_employee_attendance_report', title: "Employee Attendance" },
    { id: 'hrms_branch_attendance_summary', title: "Branch Attendance" },
    { id: 'hrms_holiday_calendar_report', title: "Holiday Calendar" },
    { id: 'hrms_leave_applications', title: "Leave Applications" },
    { id: 'hrms_attendance_setup', title: "Attendance Setup" },
    { id: 'hrms/salary/salary-generate', title: "Salary Generate" },
    { id: 'hrms_festival_bonus_generate', title: "Bonus Generate" },
    { id: 'employee_loan_balance', title: "Loan Balance" },
    { id: 'employee_loan_ledger', title: "Loan Ledger" },
    { id: 'hrms/salary-sheet', title: "Salary Reports" },
    { id: 'hrm_mismatch_payment', title: "Salary Mismatch" },
    { id: 'hrms_festival_bonus_list', title: "Bonus Reports" },
  ],
  'customer-supplier': [
    { id: 'customer-supplier/list', title: "Customers" },
    { id: 'coal1/coal1-list', title: "CoA L1" },
    { id: 'coal2/coal2-list', title: "CoA L2" },
    { id: 'coal3/coal3-list', title: "CoA L3" },
    { id: 'coal4/coal4-list', title: "CoA L4" },
    { id: 'coal4/opening-balance', title: "Bank Opening" },
  ],
  'al-charts': [
    { id: 'item/item-chart', title: "Comparison" },
  ],
};

export const SIDEBAR_MENUS = [
  { id: 'dashboard', title: 'Dashboard' },
  { id: 'reseller', title: 'Reseller Dashboard' },
  { id: 'transaction', title: 'Transaction' },
  { id: 'invoice', title: 'Invoice' },
  { id: 'branch-transfer', title: 'Branch Transfer' },
  { id: 'reports', title: 'Reports' },
  { id: 'product_tracking', title: 'Product Tracking' },
  { id: 'requisition', title: 'Requisition' },
  { id: 'real-estate', title: 'Real Estate' },
  { id: 'products', title: 'Products' },
  { id: 'labour_items', title: 'Labour Items' },
  { id: 'admin', title: 'Admin' },
  { id: 'vr_settings', title: 'VR Settings' },
  { id: 'hrm', title: 'HRM' },
  { id: 'customer-supplier', title: 'Customer & Supplier' },
  { id: 'al-charts', title: 'Analytics' },
  { id: 'customer_dashboard', title: 'Customer Dashboard' },
];
import {
  FiActivity,
  FiBarChart2,
  FiBook,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronUp,
  FiEye,
  FiEyeOff,
  FiMenu,
  FiClipboard,
  FiGrid,
  FiHome,
  FiLayers,
  FiMapPin,
  FiPieChart,
  FiServer,
  FiSettings,
  FiShoppingCart,
  FiTag,
  FiTrendingUp,
  FiTruck,
  FiUsers,
} from 'react-icons/fi';
import { FaBluetooth, FaGear, FaRegStar } from 'react-icons/fa6';
import { hasPermission } from '../utils/permissionChecker';
import { useSelector } from 'react-redux';
import './Sidebar.css';
import routes from '../services/appRoutes';
import { resolveAssetUrl } from '../services/resolveAssetUrl';
import { hasMenuPermission } from './hasMenuPermission';
import DropdownUser from '../Header/DropdownUser';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
  mode?: 'sidebar' | 'topbar';
}

const Sidebar = ({ sidebarOpen, setSidebarOpen, mode = 'sidebar' }: SidebarProps) => {
  const location = useLocation();
  const { pathname } = location;
  const isTopbar = mode === 'topbar';
  const [permissions, setPermissions] = useState<any>([]);
  const settings = useSelector((s: any) => s.settings);
  const currentBranch = useSelector((s: any) => s.branchList.currentBranch);
  const companyName =
    settings?.data?.company?.name ||
    currentBranch?.company?.name ||
    settings?.data?.branch?.name ||
    'CashbookBD';
  // Empty when the company has not uploaded one. Falling back to the bundled
  // logo.svg would brand every such tenant "TailAdmin", so show the company
  // name as text instead. Each theme variant falls back to the other, so a
  // tenant with a single logo still sees it in both modes.
  const lightLogoPath =
    settings?.data?.company?.company_logo || currentBranch?.company?.company_logo;
  const darkLogoPath =
    settings?.data?.company?.company_logo_dark || currentBranch?.company?.company_logo_dark;
  const companyLogo = resolveAssetUrl(
    lightLogoPath || darkLogoPath,
    settings?.data?.env,
  );
  const companyLogoDark = resolveAssetUrl(
    darkLogoPath || lightLogoPath,
    settings?.data?.env,
  );
  const [logoFailed, setLogoFailed] = useState(false);
  const showCompanyName = !companyLogo || logoFailed;
  // Stand-in mark for tenants with no logo: initials of the first two words,
  // so the name never sits against the sidebar edge on its own.
  const companyInitials = companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word: string) => word[0])
    .join('')
    .toUpperCase();
  const trigger = useRef<any>(null);
  const sidebar = useRef<any>(null);

  const storedSidebarExpanded = localStorage.getItem('sidebar-expanded');
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === 'true',
  );
  const storedSidebarCollapsed = localStorage.getItem('sidebar-collapsed');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    storedSidebarCollapsed === null ? false : storedSidebarCollapsed === 'true',
  );

  // State to track which menu is open (null means no menu is open)
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    if (isTopbar) {
      setOpenMenu(null);
    }
  }, [isTopbar, pathname]);

  // Handler to toggle menu
  const handleMenuClick = (menuId: string) => {
    setOpenMenu(openMenu === menuId ? null : menuId); // Toggle the clicked menu, close others
  };

  /**
   * The menus in the order the code declares them. The user's own order is laid
   * over this, and anything they have not moved stays where it is here -- so a
   * menu added in a later release appears in its natural place rather than
   * being lost or jumping to the top.
   */
  // Only what is needed to draw the arrangement. Changing it belongs to the
  // Arrange Menu page; this reads the result. Both hooks re-read when that page
  // saves, so the sidebar follows along while it is open beside it.
  const { ordered: orderedMenus, isHidden: isMenuHidden } = useSidebarCustomization(
    'sidebar-menu-order',
    SIDEBAR_MENUS,
  );

  const { slot: subSlot, idsOf: subIdsOf } = useSidebarSubCustomization('sidebar-sub-order');

  /**
   * Where a menu sits, as a flex `order`, plus its hidden state.
   *
   * Ordering this way means the JSX below never moves: each menu keeps the
   * place it was written in and simply renders in the user's position, which is
   * what kept a rearrangeable sidebar from becoming a rewrite of this file.
   */
  const menuSlot = (id: string): CSSProperties => {
    const position = orderedMenus.findIndex((menu) => menu.id === id);

    return {
      order: position < 0 ? 999 : position,
      display: isMenuHidden(id) ? 'none' : undefined,
    };
  };

  /**
   * The dividers the user has put inside one menu, each with the position it
   * should take among that menu's entries.
   *
   * Declared entries get their position from subSlot the same way, so a divider
   * and the entries around it are ordered by the same numbers and land where
   * the arrange page showed them.
   */
  const subDividers = (menuId: string) => {
    const declared = (SIDEBAR_SUBMENUS[menuId] ?? []).map((entry) => entry.id);

    return subIdsOf(menuId, declared)
      .map((id, index) => ({ id, index }))
      .filter((entry) => isDivider(entry.id))
      .map((entry) => ({
        id: entry.id,
        title: dividerLabel(entry.id),
        style: { order: entry.index } as CSSProperties,
      }));
  };
  useEffect(() => {
    setPermissions(settings.data.permissions ?? []);
  }, [settings.data.permissions]);

  useEffect(() => {
    if (isTopbar) {
      setSidebarExpanded(true);
    }
  }, [isTopbar]);

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current) return;

      if (isTopbar) {
        if (sidebar.current.contains(target)) return;
        setOpenMenu(null);
        return;
      }

      if (!trigger.current) return;
      if (!sidebarOpen || sidebar.current.contains(target) || trigger.current.contains(target)) return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, [isTopbar, sidebarOpen, setSidebarOpen]);

  useEffect(() => {
    if (isTopbar) return;
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });



  useEffect(() => {
    localStorage.setItem('sidebar-expanded', sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector('body')?.classList.add('sidebar-expanded');
    } else {
      document.querySelector('body')?.classList.remove('sidebar-expanded');
    }
  }, [isTopbar, sidebarExpanded]);

  useEffect(() => {
    if (isTopbar) return;
    localStorage.setItem('sidebar-collapsed', sidebarCollapsed.toString());
  }, [isTopbar, sidebarCollapsed]);

  return (
    <aside
      ref={sidebar}
      className={
        isTopbar
          ? 'topbar-menu sticky top-0 isolate z-[9998] w-full border-b border-stroke bg-white dark:border-strokedark dark:bg-boxdark'
          : `app-sidebar-menu w-72.5 ${sidebarCollapsed ? 'app-sidebar-collapsed lg:w-20' : ''} absolute left-0 top-0 z-9999 flex h-screen flex-col overflow-y-hidden duration-300 ease-linear bg-white dark:bg-boxdark lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
      }
    >
      {!isTopbar ? (
        <div className={`flex items-center justify-between gap-2 px-6 py-3 lg:py-3 ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}>
          <NavLink
            to="/"
            className={`flex min-w-0 flex-1 items-center ${sidebarCollapsed ? 'lg:hidden' : ''}`}
            title={companyName}
          >
            {/* Mark on the left, company name on its right — with the uploaded
                logo when there is one, initials when there is not. */}
            <span className={`flex min-w-0 items-center gap-2.5 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              {showCompanyName ? (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
                  {companyInitials}
                </span>
              ) : companyLogo === companyLogoDark ? (
                <img
                  src={companyLogo}
                  alt=""
                  className="block h-9 w-9 shrink-0 rounded-lg object-contain"
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <>
                  <img
                    src={companyLogo}
                    alt=""
                    className="block h-9 w-9 shrink-0 rounded-lg object-contain dark:hidden"
                    onError={() => setLogoFailed(true)}
                  />
                  <img
                    src={companyLogoDark}
                    alt=""
                    className="hidden h-9 w-9 shrink-0 rounded-lg object-contain dark:block"
                    onError={() => setLogoFailed(true)}
                  />
                </>
              )}
              <span className="block truncate text-lg font-bold leading-tight text-black dark:text-white">
                {companyName}
              </span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={() => {
              setSidebarCollapsed((current) => !current);
              setOpenMenu(null);
            }}
            className={`hidden h-9 w-9 items-center justify-center rounded-sm border border-stroke bg-white text-slate-600 shadow-sm transition hover:bg-gray-100 hover:text-slate-900 dark:border-strokedark dark:bg-boxdark dark:text-slate-300 dark:hover:bg-meta-4 lg:flex ${sidebarCollapsed ? 'lg:h-8 lg:w-8 lg:flex-none' : ''}`}
            title={sidebarCollapsed ? 'Show menu labels' : 'Show icons only'}
            aria-label={sidebarCollapsed ? 'Show menu labels' : 'Show icons only'}
          >
            {sidebarCollapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
          </button>
          <button
            ref={trigger}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-controls="sidebar"
            aria-expanded={sidebarOpen}
            className="block lg:hidden"
          >
            <svg
              className="fill-current"
              width="20"
              height="18"
              viewBox="0 0 20 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19 8.175H2.98748L9.36248 1.6875C9.69998 1.35 9.69998 0.825 9.36248 0.4875C9.02498 0.15 8.49998 0.15 8.16248 0.4875L0.399976 8.3625C0.0624756 8.7 0.0624756 9.225 0.399976 9.5625L8.16248 17.4375C8.31248 17.5875 8.53748 17.7 8.76248 17.7C8.98748 17.7 9.17498 17.625 9.36248 17.475C9.69998 17.1375 9.69998 16.6125 9.36248 16.275L3.02498 9.8625H19C19.45 9.8625 19.825 9.4875 19.825 9.0375C19.825 8.55 19.45 8.175 19 8.175Z"
                fill=""
              />
            </svg>
          </button>
        </div>
      ) : null}

      <div className={isTopbar ? 'no-scrollbar overflow-visible' : 'no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear'}>
        <nav
          className={isTopbar ? 'overflow-visible px-2 py-2 md:px-4' : 'py-2 px-4 lg:mt-1 lg:px-6'}
          onClick={(event) => {
            if (isTopbar || !sidebarCollapsed) return;
            const target = event.target as HTMLElement;
            const submenuLink = target.closest('li > div a');
            if (submenuLink) {
              setOpenMenu(null);
              return;
            }

            const topLevelLink = target.closest('nav > div > ul > li > a') as HTMLElement | null;
            if (topLevelLink && sidebar.current) {
              const rect = topLevelLink.getBoundingClientRect();
              const flyoutTop = Math.max(8, Math.min(rect.top, window.innerHeight - 96));
              sidebar.current.style.setProperty('--sidebar-flyout-left', `${rect.right + 12}px`);
              sidebar.current.style.setProperty('--sidebar-flyout-top', `${flyoutTop}px`);
            }
          }}
        >
          <div className={isTopbar ? 'flex flex-wrap items-start gap-3' : ''}>
            {/* The controls live on their own page now. A column this narrow
                could not show sixteen menus and the entries beneath them at
                once, and the panel pushed the very menus being arranged out of
                sight. The sidebar still renders whatever was arranged there --
                it just no longer hosts the arranging. */}
            <ul className={isTopbar ? 'flex min-w-0 flex-1 flex-wrap items-stretch gap-1.5 pb-1' : 'flex flex-col gap-1.5'}>
              {/* The user's own dividers. They can be written here, in one place
                  and out of the way, because the list is ordered by flex `order`
                  rather than by where things sit in the markup -- so a divider
                  declared last can still render third. Not shown across the top,
                  where the menus wrap and a heading would land mid-row. */}
              {!isTopbar
                ? orderedMenus.map((entry, index) =>
                    isDivider(entry.id) ? (
                      <li
                        key={entry.id}
                        style={{ order: index }}
                        className="mt-3 flex items-center gap-2 px-4 first:mt-0"
                      >
                        {/* A divider with no name is a plain rule. The heading
                            and the line share one row, so the line simply takes
                            the whole width when there is no heading beside it. */}
                        {entry.title ? (
                          <span className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-wider text-bodydark2">
                            {entry.title}
                          </span>
                        ) : null}
                        <span className="h-px min-w-0 flex-1 bg-stroke dark:bg-strokedark" />
                      </li>
                    ) : null,
                  )
                : null}

              {/* Dashboard */}
              {!isTopbar ? (
                <SidebarLinkGroup
                  activeCondition={
                    pathname === '/dashboard' || pathname.includes('dashboard')
                  }
                  menuId="dashboard"
                  style={menuSlot('dashboard')}
                  open={openMenu === 'dashboard'}
                  handleClick={() => handleMenuClick('dashboard')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="/dashboard"
                        className={`group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === '/' || pathname.includes('dashboard')) && 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'}`}
                        onClick={(e) => {
                          // e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <FiGrid />
                        Dashboard
                      </NavLink>
                      <div
                      className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-180' : 'max-h-0'
                        }`}
                    >
                      <ul className="mt-2 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {subDividers('dashboard').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              className="mt-2 flex items-center gap-2 first:mt-0"
                            >
                              {entry.title ? (
                                <span className="shrink-0 pl-4 text-[0.6rem] font-semibold uppercase tracking-wider text-bodydark2">
                                  {entry.title}
                                </span>
                              ) : null}
                              <span className="h-px min-w-0 flex-1 bg-stroke dark:bg-strokedark" />
                            </li>
                          ))}
                        <li style={subSlot('dashboard', 'dashboard')}>
                          <NavLink
                            to="/dashboard"
                            className={({ isActive }) =>
                              'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                              (isActive && 'text-gray-900 font-bold dark:text-white')
                            }
                          >
                            Dashboard
                          </NavLink>
                        </li>
                      </ul>
                    </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              ) : null}
              {hasMenuPermission(permissions, 'reseller') && (
                <li style={menuSlot('reseller')}>
                  <NavLink
                    to={routes.reseller_dashboard}
                    className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${pathname === routes.reseller_dashboard &&
                      'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                      }`}
                  >
                    <FiUsers />
                    Reseller Dashboard
                  </NavLink>
                </li>
              )}
              {/* Transaction */}
              {hasMenuPermission(permissions, 'transaction') && (
                <SidebarLinkGroup
                  activeCondition={
                    pathname === '/accounts/cash/receive' ||
                    pathname === '/accounts/cash/payment' ||
                    pathname === '/accounts/bank/receive' ||
                    pathname === '/accounts/bank/payment' ||
                    pathname === routes.employee_loan ||

                    pathname === '/accounts/journal' ||


                    pathname.includes('forms')
                  }
                  menuId="transaction"
                  style={menuSlot('transaction')}
                  open={openMenu === 'transaction'}
                  handleClick={() => handleMenuClick('transaction')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === '/accounts/cash/receive' ||
                          pathname === '/accounts/cash/payment' ||
                          pathname === '/admin/installment-details' ||
                          pathname === '/accounts/bank/receive' ||
                          pathname === '/accounts/bank/payment' ||
                          pathname === '/accounts/employee-loan' ||
                          pathname === '/accounts/journal' ||
                          pathname.includes('/accounts/cash/receive')) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <FaGear />
                        Transaction
                      </NavLink>
                      <div
                        className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-180' : 'max-h-0'
                          }`}
                      >
                        <ul className="mt-2 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {subDividers('transaction').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              className="mt-2 flex items-center gap-2 first:mt-0"
                            >
                              {entry.title ? (
                                <span className="shrink-0 pl-4 text-[0.6rem] font-semibold uppercase tracking-wider text-bodydark2">
                                  {entry.title}
                                </span>
                              ) : null}
                              <span className="h-px min-w-0 flex-1 bg-stroke dark:bg-strokedark" />
                            </li>
                          ))}
                          {hasPermission(permissions, 'cash.received.create') && (
                            <li style={subSlot('transaction', 'cash_receive')}>
                              <NavLink
                                to={routes.cash_receive}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Cash Received
                              </NavLink>
                            </li>
                          )}
                          

                          {hasPermission(permissions, 'cash.payment.create') && (
                            <li style={subSlot('transaction', 'accounts/cash/payment')}>
                              <NavLink
                                to="/accounts/cash/payment"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Cash Payment
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'bank.received.create') && (
                            <li style={subSlot('transaction', 'accounts/bank/receive')}>
                              <NavLink
                                to="/accounts/bank/receive"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Bank Received
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'bank.payment.create') && (
                            <li style={subSlot('transaction', 'accounts/bank/payment')}>
                              <NavLink
                                to="/accounts/bank/payment"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Bank Payment
                              </NavLink>
                            </li>
                          )}
                          
                          {hasPermission(permissions, 'installment.create') && (
                            <li style={subSlot('transaction', 'installment_list')}>
                              <NavLink
                                to={routes.installment_list}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Installments
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'hrm.loan.create') && (
                            <li style={subSlot('transaction', 'employee_loan')}>
                              <NavLink
                                to={routes.employee_loan}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Employee Loan
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'journal.create') && (
                            <li style={subSlot('transaction', 'accounts/journal')}>
                              <NavLink
                                to="/accounts/journal"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Journal
                              </NavLink>
                            </li>
                          )}
                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}

              {/* Invoice */}
              {hasMenuPermission(permissions, 'invoice') && (
                <SidebarLinkGroup
                  activeCondition={
                    pathname === routes.inv_trading_combined ||
                    pathname === '/invoice/purchase' ||
                    pathname === routes.inv_purchase_import ||
                    pathname === '/invoice/sales' ||
                    pathname.includes('forms')
                  }
                  menuId="invoice"
                  style={menuSlot('invoice')}
                  open={openMenu === 'invoice'}
                  handleClick={() => handleMenuClick('invoice')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === '/invoice/purchase' ||
                          pathname === routes.inv_trading_combined ||
                          pathname === '/invoice/purchase-return' ||
                          pathname === routes.inv_purchase_import ||
                          pathname === '/invoice/sales' ||
                          pathname === '/invoice/sales-return' ||
                          pathname === '/invoice/labour-invoice' ||
                          pathname.includes('/invoice/sales')) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <FiShoppingCart />
                        Invoice
                      </NavLink>
                      <div
                        className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-180' : 'max-h-0'
                          }`}
                      >
                        <ul className="mt-2 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {subDividers('invoice').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              className="mt-2 flex items-center gap-2 first:mt-0"
                            >
                              {entry.title ? (
                                <span className="shrink-0 pl-4 text-[0.6rem] font-semibold uppercase tracking-wider text-bodydark2">
                                  {entry.title}
                                </span>
                              ) : null}
                              <span className="h-px min-w-0 flex-1 bg-stroke dark:bg-strokedark" />
                            </li>
                          ))}
                          {hasPermission(permissions, 'purchase.create') && (
                            <li style={subSlot('invoice', 'invoice/purchase')}>
                              <NavLink
                                to="/invoice/purchase"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Purchase
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'purchase.import') && (
                            <li style={subSlot('invoice', 'inv_purchase_import')}>
                              <NavLink
                                to={routes.inv_purchase_import}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Purchase Import
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'sales.create') && (
                            <li style={subSlot('invoice', 'invoice/sales')}>
                              <NavLink
                                to="/invoice/sales"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Sales
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'sales.import') && (
                            <li style={subSlot('invoice', 'inv_sales_import')}>
                              <NavLink
                                to={routes.inv_sales_import}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Sales Import
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'purchase.return.view') && (
                            <li style={subSlot('invoice', 'inv_purchase_return')}>
                              <NavLink
                                to={routes.inv_purchase_return}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Purchase Return
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'sales.return') && (
                            <li style={subSlot('invoice', 'inv_sales_return')}>
                              <NavLink
                                to={routes.inv_sales_return}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Sales Return
                              </NavLink>
                            </li>
                          )}


                          {hasPermission(permissions, 'labour.invoice.create') && (
                            <li style={subSlot('invoice', 'invoice/labour-invoice')}>
                              <NavLink
                                to="/invoice/labour-invoice"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Labour Invoice
                              </NavLink>
                            </li>
                          )}

                          {currentBranch?.business_type_id === 8 &&
                            hasPermission(permissions, 'purchase.create') &&
                            hasPermission(permissions, 'sales.create') && (
                              <li style={subSlot('invoice', 'inv_trading_combined')}>
                                <NavLink
                                  to={routes.inv_trading_combined}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Combined Invoice
                                </NavLink>
                              </li>
                            )}
                          {/* Branch Issue and Branch Receive moved to the
                              Branch Transfer menu, next to the reports that
                              read them back. */}
                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}

              {/* Branch Transfer — the two forms and the two reports that read
                  them back, gathered in one place. They were split between the
                  entry menu and the reports menu, so following a consignment
                  from issue to arrival meant crossing the sidebar. */}
              {(hasPermission(permissions, 'branch.issue.create') ||
                hasPermission(permissions, 'branch.received.create') ||
                hasPermission(permissions, 'inventory.received.create') ||
                hasPermission(permissions, 'product.received.create')) && (
                <SidebarLinkGroup
                  activeCondition={
                    pathname === routes.branch_transfer ||
                    pathname === routes.branch_received ||
                    pathname === routes.material_issue ||
                    pathname.includes(routes.report_branch_transfer) ||
                    pathname.includes(routes.report_branch_receive) ||
                    pathname.includes(routes.report_branch_stock)
                  }
                  menuId="branch-transfer"
                  style={menuSlot('branch-transfer')}
                  open={openMenu === 'branch-transfer'}
                  handleClick={() => handleMenuClick('branch-transfer')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === routes.branch_transfer ||
                          pathname === routes.branch_received ||
                          pathname === routes.material_issue ||
                          pathname.includes(routes.report_branch_transfer) ||
                          pathname.includes(routes.report_branch_receive) ||
                          pathname.includes(routes.report_branch_stock)) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded ? handleClick() : setSidebarExpanded(true);
                        }}
                      >
                        <FiTruck />
                        Branch Transfer
                        <FiChevronRight
                          className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform duration-200 ${open ? 'rotate-90' : ''
                            }`}
                        />
                      </NavLink>

                      <div
                        className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-180' : 'max-h-0'
                          }`}
                      >
                        <ul className="mt-2 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {subDividers('branch-transfer').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              className="mt-2 flex items-center gap-2 first:mt-0"
                            >
                              {entry.title ? (
                                <span className="shrink-0 pl-4 text-[0.6rem] font-semibold uppercase tracking-wider text-bodydark2">
                                  {entry.title}
                                </span>
                              ) : null}
                              <span className="h-px min-w-0 flex-1 bg-stroke dark:bg-strokedark" />
                            </li>
                          ))}
                          {/* Issue first, then receive, then what each looks
                              like afterwards -- the order a consignment moves. */}
                          {hasPermission(permissions, 'branch.issue.create') && (
                            <li style={subSlot('branch-transfer', 'branch_transfer')}>
                              <NavLink
                                to={routes.branch_transfer}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Branch Issue
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'branch.received.create') ||
                            hasPermission(permissions, 'inventory.received.create') ||
                            hasPermission(permissions, 'product.received.create')) && (
                              <li style={subSlot('branch-transfer', 'branch_received')}>
                                <NavLink
                                  to={routes.branch_received}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Branch Receive
                                </NavLink>
                              </li>
                            )}
                          
                          {/* The voucher lists, ahead of the product-wise
                              reports: "which challans" is asked far oftener
                              than "how much of each product". */}
                          {hasPermission(permissions, 'branch.issue.create') && (
                            <li style={subSlot('branch-transfer', 'report_branch_transfer_list')}>
                              <NavLink
                                to={routes.report_branch_transfer_list}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Transfer List
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'branch.received.create') ||
                            hasPermission(permissions, 'inventory.received.create') ||
                            hasPermission(permissions, 'product.received.create')) && (
                              <li style={subSlot('branch-transfer', 'report_branch_receive_list')}>
                                <NavLink
                                  to={routes.report_branch_receive_list}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Receive List
                                </NavLink>
                              </li>
                            )}
                          {hasPermission(permissions, 'branch.transfer.create') && (
                            <li style={subSlot('branch-transfer', 'report_branch_transfer')}>
                              <NavLink
                                to={routes.report_branch_transfer}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Issue Report
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'branch.received.create') && (
                            <li style={subSlot('branch-transfer', 'report_branch_receive')}>
                              <NavLink
                                to={routes.report_branch_receive}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Receive Report
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'product.stock.view') && (
                            <li style={subSlot('branch-transfer', 'report_branch_stock')}>
                              <NavLink
                                to={routes.report_branch_stock}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Branch Stock
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'material.issue.create') && (
                            <li style={subSlot('branch-transfer', 'material_issue')}>
                              <NavLink
                                to={routes.material_issue}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Material Issue
                              </NavLink>
                            </li>
                          )}
                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}

              {/* Reports */}
              {hasMenuPermission(permissions, 'reports') && (
                <SidebarLinkGroup
                  activeCondition={
                    pathname === '/reports/cashbook' ||
                    pathname === routes.cash_bank_received_payment ||
                    pathname === routes.profit_loss || //'/reports/profit-loss' ||
                    pathname === routes.product_profit_loss ||
                    pathname === routes.bank_information ||
                    pathname === routes.connected_member ||
                    pathname === routes.balance_sheet ||
                    pathname === routes.trial_balance_level3 ||
                    pathname === routes.trial_balance_level4 ||
                    pathname === routes.expense_report ||
                    pathname === routes.customer_supplier_statement ||
                    pathname === routes.product_ledger_data ||
                    pathname === '/reports/employee-installment' ||
                    pathname === '/reports/ledger' ||
                    pathname === '/reports/due-installments' ||
                    pathname === '/reports/date-wise-total-data' ||
                    pathname === routes.report_date_wise_in_out ||
                    pathname === routes.report_closing_stock ||
                    pathname === routes.somity_stock_details ||
                    pathname === routes.report_imei_stock ||
                    pathname === routes.report_godown_stock ||
                    pathname === '/reports/due-list' ||
                    pathname === '/reports/purchase-ledger' ||
                    pathname === '/reports/sales-ledger' ||
                    pathname === '/reports/group-report' ||
                    pathname === routes.somity_collection_sheet ||
                    pathname === routes.somity_monthly_report ||
                    pathname === '/reports/mitch-match' ||
                    pathname.includes('forms')
                  }
                  menuId="reports"
                  style={menuSlot('reports')}
                  open={openMenu === 'reports'}
                  handleClick={() => handleMenuClick('reports')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === '/reports/date-wise-total-data' ||
                          pathname.includes('reports/cashbook') ||
                          pathname === '/reports/employee-installment' ||
                          pathname === '/reports/due-installments' ||
                          pathname.includes('/reports/due-list') ||
                          pathname.includes('/reports/product/stock') ||
                          pathname.includes(routes.report_closing_stock) ||
                          pathname.includes(routes.somity_stock_details) ||
                          pathname.includes(routes.report_imei_stock) ||
                          pathname.includes(routes.report_godown_stock) ||
                          pathname.includes(routes.report_date_wise_in_out) ||
                          pathname.includes('/reports/cat-wise/in-out') ||
                          pathname.includes('/reports/purchase-ledger') ||
                          pathname.includes('/reports/sales-ledger') ||
                          pathname === routes.group_report ||
                          pathname.includes(routes.somity_collection_sheet) ||
                          pathname.includes(routes.somity_monthly_report) ||
                          pathname.includes('/reports/labour/ledger') ||
                          pathname.includes('/reports/mitch-match') ||
                          pathname.includes(routes.profit_loss) ||
                          pathname.includes(routes.product_profit_loss) ||
                          pathname.includes(routes.bank_information) ||
                          pathname.includes(routes.connected_member) ||
                          pathname.includes(routes.balance_sheet) ||
                          pathname.includes(routes.trial_balance_level3) ||
                          pathname.includes(routes.trial_balance_level4) ||
                          pathname.includes(routes.expense_report) ||
                          pathname.includes(routes.customer_supplier_statement) ||
                          pathname.includes(routes.product_ledger_data) ||
                          pathname.includes('reports/ledger')) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <FiBook />
                        Reports
                      </NavLink>
                      <div
                        className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-180' : 'max-h-0'
                          }`}
                      >
                        <ul className="mt-2 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {subDividers('reports').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              className="mt-2 flex items-center gap-2 first:mt-0"
                            >
                              {entry.title ? (
                                <span className="shrink-0 pl-4 text-[0.6rem] font-semibold uppercase tracking-wider text-bodydark2">
                                  {entry.title}
                                </span>
                              ) : null}
                              <span className="h-px min-w-0 flex-1 bg-stroke dark:bg-strokedark" />
                            </li>
                          ))}
                          {hasPermission(permissions, 'cashbook.view') && (
                            <li style={subSlot('reports', 'reports/cashbook')}>
                              <NavLink
                                to="/reports/cashbook"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Cash Book
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'bank.book') && (
                            <li style={subSlot('reports', 'report_bankbook')}>
                              <NavLink
                                to={routes.report_bankbook}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Bank Book
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'cash.bank.summery') && (
                            <li style={subSlot('reports', 'cash_bank_received_payment')}>
                              <NavLink
                                to={routes.cash_bank_received_payment}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Cash &amp; Bank Summary
                              </NavLink>
                            </li>
                          )}


                          {hasPermission(permissions, 'profit.loss') && (
                            <li style={subSlot('reports', 'profit_loss')}>
                              <NavLink
                                to={routes.profit_loss} //"/reports/profit-loss"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Profit Loss
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'productwise.profit') && (
                            <li style={subSlot('reports', 'product_profit_loss')}>
                              <NavLink
                                to={routes.product_profit_loss}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Product Profit Loss
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'bank.information') && (
                            <li style={subSlot('reports', 'bank_information')}>
                              <NavLink
                                to={routes.bank_information}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Bank Information
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'connected.member.view') && (
                            <li style={subSlot('reports', 'connected_member')}>
                              <NavLink
                                to={routes.connected_member}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Connected Member
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'balancesheet.view') && (
                            <li style={subSlot('reports', 'balance_sheet')}>
                              <NavLink
                                to={routes.balance_sheet}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Balance Sheet
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'trial.balance.l3') && (
                            <li style={subSlot('reports', 'trial_balance_level3')}>
                              <NavLink
                                to={routes.trial_balance_level3}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Trial Balance Group
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'trial.balance.l4') && (
                            <li style={subSlot('reports', 'trial_balance_level4')}>
                              <NavLink
                                to={routes.trial_balance_level4}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Trial Balance Details
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'expense.report') && (
                            <li style={subSlot('reports', 'expense_report')}>
                              <NavLink
                                to={routes.expense_report}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Expense Report
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'installment.create') && currentBranch?.business_type_id == 4 && (
                            <li style={subSlot('reports', 'reports/due-installments')}>
                              <NavLink
                                to="/reports/due-installments"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Due Installments
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'installment.create') && currentBranch?.business_type_id == 4 && (
                            <li style={subSlot('reports', 'reports/employee-installment')}>
                              <NavLink
                                to="/reports/employee-installment"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Employee Installments
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'ledger.view') ||
                            hasPermission(permissions, 'ledger.customer')) && (
                              <li style={subSlot('reports', 'reports/ledger')}>
                                <NavLink
                                  to="/reports/ledger"
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Ledger
                                </NavLink>
                              </li>
                            )}
                          {/* Product Statement and Product Receivable / Payable
                              moved out to the Product Tracking menu, next to the
                              settings screen that decides what they report on. */}
                          {hasPermission(permissions, 'ledger.details') && (
                            <li style={subSlot('reports', 'customer_supplier_statement')}>
                              <NavLink
                                to={routes.customer_supplier_statement}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Ledger Details
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'product.in.out') && (
                            <li style={subSlot('reports', 'product_ledger_data')}>
                              <NavLink
                                to={routes.product_ledger_data}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Product In Out
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'product.in.out') && (
                            <li style={subSlot('reports', 'report_date_wise_in_out')}>
                              <NavLink
                                to={routes.report_date_wise_in_out}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Date-wise In/Out
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'ledger.labour') && (
                            <li style={subSlot('reports', 'reports/labour/ledger')}>
                              <NavLink
                                to="/reports/labour/ledger"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Labour Ledger
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'due.list') && (
                            <li style={subSlot('reports', 'reports/due-list')}>
                              <NavLink
                                to="/reports/due-list"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Due List
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'collection.sheet')) && (
                            <li style={subSlot('reports', 'somity_collection_sheet')}>
                              <NavLink
                                to={routes.somity_collection_sheet}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Collection Sheet
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'monthly.report') && (
                            <li style={subSlot('reports', 'somity_monthly_report')}>
                              <NavLink
                                to={routes.somity_monthly_report}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Monthly Report
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'date.wise.total') && (
                            <li style={subSlot('reports', 'reports/date-wise-total-data')}>
                              <NavLink
                                to="/reports/date-wise-total-data"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Datewise Cash Total
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'product.stock.view') && (
                            <li style={subSlot('reports', 'reports/product/stock')}>
                              <NavLink
                                to="/reports/product/stock"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Product Stock
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'product.stock.details') && (
                            <li style={subSlot('reports', 'somity_stock_details')}>
                              <NavLink
                                to={routes.somity_stock_details}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Stock Details
                              </NavLink>
                            </li>
                          )}
                          {/* The two branch transfer reports moved to the
                              Branch Transfer menu, beside the forms they read. */}
                          {hasPermission(permissions, 'imei.stock') && (
                            <li style={subSlot('reports', 'report_imei_stock')}>
                              <NavLink
                                to={routes.report_imei_stock}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                IMEI Stock
                              </NavLink>
                            </li>
                          )}
                          {/* Godown Stock */}
                          {hasPermission(permissions, 'godown.stock') && (
                            <li style={subSlot('reports', 'report_godown_stock')}>
                              <NavLink
                                to={routes.report_godown_stock}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Godown Stock
                              </NavLink>
                            </li>
                          )}
                          {/* product.in.out */}
                          {hasPermission(permissions, 'product.in.out') && (
                            <li style={subSlot('reports', 'reports/cat-wise/in-out')}>
                              <NavLink
                                to="/reports/cat-wise/in-out"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Cat-wise In/Out
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'purchase.ledger') && (
                            <li style={subSlot('reports', 'reports/purchase-ledger')}>
                              <NavLink
                                to="/reports/purchase-ledger"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Purchase Ledger
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'sales.ledger') && (
                            <li style={subSlot('reports', 'reports/sales-ledger')}>
                              <NavLink
                                to="/reports/sales-ledger"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Sales Ledger
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'group.report') && (
                            <li style={subSlot('reports', 'reports/group-report')}>
                              <NavLink
                                to="/reports/group-report"
                                end
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Group Report
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'mitch.match') && (
                            <li style={subSlot('reports', 'reports/mitch-match')}>
                              <NavLink
                                to="/reports/mitch-match"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Mismatch
                              </NavLink>
                            </li>
                          )}
                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}



              {/* Requisition */}
              {/* Product Tracking. The three screens used to sit apart -- the
                  settings under Admin, the two reports under Reports -- so
                  setting a product up and then reading it back meant crossing
                  the sidebar. They are one subject, and now one menu. */}
              {hasMenuPermission(permissions, 'product_tracking') && (
                <SidebarLinkGroup
                  activeCondition={
                    pathname === routes.product_tracking_settings ||
                    pathname === routes.product_financial_statement ||
                    pathname === routes.product_tracking_summary
                  }
                  menuId="product_tracking"
                  style={menuSlot('product_tracking')}
                  open={openMenu === 'product_tracking'}
                  handleClick={() => handleMenuClick('product_tracking')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(
                          pathname === routes.product_tracking_settings ||
                          pathname === routes.product_financial_statement ||
                          pathname === routes.product_tracking_summary) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <FiTag />
                        Product Tracking
                      </NavLink>
                      <div
                        className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-180' : 'max-h-0'
                          }`}
                      >
                        <ul className="mt-2 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {subDividers('product_tracking').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              className="mt-2 flex items-center gap-2 first:mt-0"
                            >
                              {entry.title ? (
                                <span className="shrink-0 pl-4 text-[0.6rem] font-semibold uppercase tracking-wider text-bodydark2">
                                  {entry.title}
                                </span>
                              ) : null}
                              <span className="h-px min-w-0 flex-1 bg-stroke dark:bg-strokedark" />
                            </li>
                          ))}
                          {hasPermission(permissions, 'product.tracking.settings.view') && (
                            <li style={subSlot('product_tracking', 'product_tracking_settings')}>
                              <NavLink
                                to={routes.product_tracking_settings}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Tracking
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'product.tracking.report.view') && (
                            <li style={subSlot('product_tracking', 'product_financial_statement')}>
                              <NavLink
                                to={routes.product_financial_statement}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Statement
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'product.tracking.report.view') && (
                            <li style={subSlot('product_tracking', 'product_tracking_summary')}>
                              <NavLink
                                to={routes.product_tracking_summary}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Receivable & Payable
                              </NavLink>
                            </li>
                          )}
                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}

              {hasMenuPermission(permissions, 'requisition') && (
                <SidebarLinkGroup
                  activeCondition={
                    pathname === '/requisition/comparison' ||
                    pathname === '/requisition/create' ||
                    pathname.includes('forms')
                  }
                  menuId="requisition"
                  style={menuSlot('requisition')}
                  open={openMenu === 'requisition'}
                  handleClick={() => handleMenuClick('requisition')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(
                          pathname === '/requisitions' ||
                          pathname === '/requisition/create' ||
                          pathname === '/requisition/comparison' ||
                          pathname.includes('/requisition/comparison')) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                          }`}

                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <FiServer />
                        Requisition
                      </NavLink>
                      <div
                        className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-180' : 'max-h-0'
                          }`}
                      >
                        <ul className="mt-2 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {subDividers('requisition').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              className="mt-2 flex items-center gap-2 first:mt-0"
                            >
                              {entry.title ? (
                                <span className="shrink-0 pl-4 text-[0.6rem] font-semibold uppercase tracking-wider text-bodydark2">
                                  {entry.title}
                                </span>
                              ) : null}
                              <span className="h-px min-w-0 flex-1 bg-stroke dark:bg-strokedark" />
                            </li>
                          ))}
                          {hasPermission(permissions, 'requisition.view') && (
                            <li style={subSlot('requisition', 'requisition')}>
                              <NavLink
                                to={routes.requisition}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Requisitions
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'requisition.create') && (
                            <li style={subSlot('requisition', 'requisition_create')}>
                              <NavLink
                                to={routes.requisition_create}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Create
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'requisition.comparison') && (
                            <li style={subSlot('requisition', 'requisition_comparison')}>
                              <NavLink
                                to={routes.requisition_comparison}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Comparison
                              </NavLink>
                            </li>
                          )}
                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}

              {/* Real Estate */}

              {settings?.data?.branch?.business_type_id == 9 &&
                hasMenuPermission(permissions, 'real_estate') && (
                  <SidebarLinkGroup
                    activeCondition={
                      pathname === '/real-estate/add-area' ||
                      pathname === '/real-estate/area-list' ||
                      pathname === '/real-estate/project-activities' ||
                      pathname === '/real-estate/flat-layout' ||
                      pathname === '/real-estate/unit-sales' ||
                      pathname === routes.real_estate_sold_units ||
                      pathname === routes.report_sales_summary ||
                      pathname === routes.real_estate_installment_create ||
                      pathname === routes.real_estate_project_expense ||
                      pathname === routes.real_estate_project_purchase ||
                      pathname === routes.real_estate_project_labour ||
                      pathname === routes.real_estate_project_summary_report ||
                      pathname === routes.real_estate_project_cost_report ||
                      pathname.includes('forms')
                    }
                    menuId="real-estate"
                  style={menuSlot('real-estate')}
                    open={openMenu === 'real-estate'}
                    handleClick={() => handleMenuClick('real-estate')}
                  >
                    {(handleClick, open) => (
                      <React.Fragment>
                        <NavLink
                          to="#"
                          className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 
                        ${(
                              pathname === '/real-estate/area-list' ||
                              pathname === '/real-estate/project-activities' ||
                              pathname === '/real-estate/buildings' ||
                              pathname === '/real-estate/flat-layout' ||
                              pathname === '/real-estate/building/floor' ||
                              pathname === '/real-estate/add-unit' ||
                              pathname === '/real-estate/unit-sales' ||
                              pathname === routes.real_estate_sold_units ||
                      pathname === routes.report_sales_summary ||
                              pathname === routes.real_estate_installment_create ||
                              pathname === routes.real_estate_project_expense ||
                              pathname === routes.real_estate_project_purchase ||
                              pathname === routes.real_estate_project_labour ||
                              pathname === routes.real_estate_project_cost_report ||
                      pathname === routes.real_estate_project_cost_report ||
                      pathname === routes.real_estate_project_purchase ||
                      pathname === routes.real_estate_project_cost_report ||
                              pathname === routes.real_estate_unit_types_create ||
                              pathname === routes.real_estate_buildings_list ||
                              pathname === routes.real_estate_floor_list ||
                              pathname === routes.real_estate_unit_types_list ||
                              pathname === routes.real_estate_floor_unit_list ||
                              pathname === routes.unit_payment_list ||
                              pathname === routes.real_estate_floor_unit_list ||
                              pathname === '/real-estate/project-list' ||
                              pathname.includes('/real-estate/add-area')) &&
                            'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                            }`}
                          onClick={(e) => {
                            e.preventDefault();
                            sidebarExpanded
                              ? handleClick()
                              : setSidebarExpanded(true);
                          }}
                        >
                          <FiMapPin className='-ml-1' />
                          Real Estate
                        </NavLink>
                        <div
                          className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-180' : 'max-h-0'
                            }`}
                        >
                          <ul className="mt-2 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {subDividers('real-estate').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              className="mt-2 flex items-center gap-2 first:mt-0"
                            >
                              {entry.title ? (
                                <span className="shrink-0 pl-4 text-[0.6rem] font-semibold uppercase tracking-wider text-bodydark2">
                                  {entry.title}
                                </span>
                              ) : null}
                              <span className="h-px min-w-0 flex-1 bg-stroke dark:bg-strokedark" />
                            </li>
                          ))}

                            {hasPermission(permissions, 'check.register.view') && (
                              <li style={subSlot('real-estate', 'admin/check-register')}>
                                <NavLink
                                  // to="/admin/check-register"
                                  to={routes.unit_payment_list}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Check Register
                                </NavLink>
                              </li>
                            )}

                            <li style={subSlot('real-estate', 'real-estate/area-list')}>
                              <NavLink
                                to="/real-estate/area-list"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Location
                              </NavLink>
                            </li>
                            {hasPermission(permissions, 'real.estate.project.view') && (
                              <li style={subSlot('real-estate', 'real_estate_project_list')}>
                                <NavLink
                                  to={routes.real_estate_project_list}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Projects
                                </NavLink>
                              </li>
                            )}
                            {hasPermission(permissions, 'real.estate.building.view') && (
                              <li style={subSlot('real-estate', 'real_estate_buildings_list')}>
                                <NavLink
                                  to={routes.real_estate_buildings_list}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Buildings
                                </NavLink>
                              </li>
                            )}

                            {hasPermission(permissions, 'real.estate.floor.view') && (
                              <li style={subSlot('real-estate', 'real_estate_floor_list')}>
                                <NavLink
                                  to={routes.real_estate_floor_list}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Floor List
                                </NavLink>
                              </li>
                            )}
                            {hasPermission(permissions, 'real.estate.unit.view') && (
                              <li style={subSlot('real-estate', 'real_estate_floor_unit_list')}>
                                <NavLink
                                  to={routes.real_estate_floor_unit_list}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Unit List
                                </NavLink>
                              </li>
                            )}
                            {hasPermission(permissions, 'real.estate.charge.view') && (
                              <li style={subSlot('real-estate', 'real_estate_unit_types_list')}>
                                <NavLink
                                  to={routes.real_estate_unit_types_list}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Chareges
                                </NavLink>
                              </li>
                            )}

                            {hasPermission(permissions, 'real.estate.layout.view') && (
                              <li style={subSlot('real-estate', 'real-estate/flat-layout')}>
                                <NavLink
                                  to="/real-estate/flat-layout"
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Layout
                                </NavLink>
                              </li>
                            )}

                            {hasPermission(permissions, 'real.estate.unit.sale.view') && (
                              <li style={subSlot('real-estate', 'real-estate/unit-sales')}>
                                <NavLink
                                  to="/real-estate/unit-sales"
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Unit Sales
                                </NavLink>
                              </li>
                            )}
                            {hasPermission(permissions, 'real.estate.sold.unit.view') && (
                              <li style={subSlot('real-estate', 'real_estate_sold_units')}>
                                <NavLink
                                  to={routes.real_estate_sold_units}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Sold Units
                                </NavLink>
                              </li>
                            )}
                            {hasPermission(permissions, 'real.estate.sales.summary') && (
                              <li style={subSlot('real-estate', 'report_sales_summary')}>
                                <NavLink
                                  to={routes.report_sales_summary}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Sales Summary
                                </NavLink>
                              </li>
                            )}
                            <li style={subSlot('real-estate', 'real_estate_installment_create')}>
                              <NavLink
                                to={routes.real_estate_installment_create}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Installment Create
                              </NavLink>
                            </li>
                            {hasPermission(permissions, 'real.estate.project.expense.view') && (
                              <li style={subSlot('real-estate', 'real_estate_project_expense')}>
                                <NavLink
                                  to={routes.real_estate_project_expense}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Project Expense
                                </NavLink>
                              </li>
                            )}
                            {hasPermission(permissions, 'real.estate.project.income.view') && (
                              <li style={subSlot('real-estate', 'real_estate_project_income')}>
                                <NavLink
                                  to={routes.real_estate_project_income}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Project Income
                                </NavLink>
                              </li>
                            )}
                            {hasPermission(permissions, 'real.estate.project.purchase.view') && (
                              <li style={subSlot('real-estate', 'real_estate_project_purchase')}>
                                <NavLink
                                  to={routes.real_estate_project_purchase}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Project Purchase
                                </NavLink>
                              </li>
                            )}
                            {hasPermission(permissions, 'real.estate.project.labour.view') && (
                              <li style={subSlot('real-estate', 'real_estate_project_labour')}>
                                <NavLink
                                  to={routes.real_estate_project_labour}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Project Labour
                                </NavLink>
                              </li>
                            )}
                            {hasPermission(permissions, 'real.estate.project.summary.view') && (
                              <li style={subSlot('real-estate', 'real_estate_project_summary_report')}>
                                <NavLink
                                  to={routes.real_estate_project_summary_report}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Project Summary
                                </NavLink>
                              </li>
                            )}
                            {hasPermission(permissions, 'real.estate.project.cost.view') && (
                              <li style={subSlot('real-estate', 'real_estate_project_cost_report')}>
                                <NavLink
                                  to={routes.real_estate_project_cost_report}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Project Cost Report
                                </NavLink>
                              </li>
                            )}
                            {hasPermission(permissions, 'real.estate.project.income.report.view') && (
                              <li style={subSlot('real-estate', 'real_estate_project_income_report')}>
                                <NavLink
                                  to={routes.real_estate_project_income_report}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Project Income Report
                                </NavLink>
                              </li>
                            )}

                          </ul>
                        </div>
                      </React.Fragment>
                    )}
                  </SidebarLinkGroup>
                )}


              {/* Products */}
              {hasMenuPermission(permissions, 'products') && (
                <SidebarLinkGroup
                  activeCondition={
                    pathname === '/category/category-list' ||
                    pathname === '/category/edit' ||
                    pathname === '/product/product-list' ||
                    pathname === routes.product_low_stock ||
                    pathname === routes.product_negative_stock ||
                    pathname === routes.product_slow_moving ||
                    pathname === routes.product_warehouse_difference ||
                    pathname === '/brand/brand-list' ||
                    pathname === routes.product_unit_list ||
                    pathname === routes.product_unit_create ||
                    pathname.includes('/product-unit/unit-edit/') ||
                    pathname === '/product/edit' ||
                    pathname.includes('forms')
                  }
                  menuId="products"
                  style={menuSlot('products')}
                  open={openMenu === 'products'}
                  handleClick={() => handleMenuClick('products')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 
                          ${(
                            pathname === '/product/product-list' ||
                            pathname === routes.product_low_stock ||
                            pathname === routes.product_negative_stock ||
                            pathname === routes.product_slow_moving ||
                            pathname === routes.product_warehouse_difference ||
                            pathname === '/brand/brand-list' ||
                            pathname === routes.product_unit_list ||
                            pathname === routes.product_unit_create ||
                            pathname.includes('/product-unit/unit-edit/') ||
                            pathname === '/category/category-list') &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <FiLayers />
                        Products
                      </NavLink>
                      <div
                        className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-180' : 'max-h-0'
                          }`}
                      >
                        <ul className="mt-2 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {subDividers('products').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              className="mt-2 flex items-center gap-2 first:mt-0"
                            >
                              {entry.title ? (
                                <span className="shrink-0 pl-4 text-[0.6rem] font-semibold uppercase tracking-wider text-bodydark2">
                                  {entry.title}
                                </span>
                              ) : null}
                              <span className="h-px min-w-0 flex-1 bg-stroke dark:bg-strokedark" />
                            </li>
                          ))}
                          {hasPermission(permissions, 'brand.list') && (
                            <li style={subSlot('products', 'brand/brand-list')}>
                              <NavLink
                                to="/brand/brand-list"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Brand List
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'category.view') && (
                            <li style={subSlot('products', 'category/category-list')}>
                              <NavLink
                                to="/category/category-list"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Category List
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'products.view') && (
                            <li style={subSlot('products', 'product/product-list')}>
                              <NavLink
                                to="/product/product-list"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Product List
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'low.stock') && (
                            <li style={subSlot('products', 'product_low_stock')}>
                              <NavLink
                                to={routes.product_low_stock}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Low Stock
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'negative.stock') && (
                            <li style={subSlot('products', 'product_negative_stock')}>
                              <NavLink
                                to={routes.product_negative_stock}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Negative Stock
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'slow.moving') && (
                            <li style={subSlot('products', 'product_slow_moving')}>
                              <NavLink
                                to={routes.product_slow_moving}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Slow Moving
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'warehouse.difference') && (
                            <li style={subSlot('products', 'product_warehouse_difference')}>
                              <NavLink
                                to={routes.product_warehouse_difference}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Warehouse Difference
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'product.unit') && (
                            <li style={subSlot('products', 'product_unit_list')}>
                              <NavLink
                                to={routes.product_unit_list}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Product Unit
                              </NavLink>
                            </li>
                          )}
                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}

              {/* Labour Items — the category and item lists a labour bill is
                  built from. Down here with Products rather than up among the
                  daily entries: it is master data, set up once and opened
                  rarely, and the menus near the top should be the ones reached
                  every day. */}
              {hasMenuPermission(permissions, 'labour_items') && (
                <SidebarLinkGroup
                  activeCondition={pathname.includes('/labour-items')}
                  menuId="labour_items"
                  style={menuSlot('labour_items')}
                  open={openMenu === 'labour_items'}
                  handleClick={() => handleMenuClick('labour_items')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${pathname.includes('/labour-items') && 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'}`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded ? handleClick() : setSidebarExpanded(true);
                        }}
                      >
                        <FiUsers />
                        Labour Items
                      </NavLink>

                      <div
                        className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-180' : 'max-h-0'}`}
                      >
                        <ul className="mt-2 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {subDividers('labour_items').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              className="mt-2 flex items-center gap-2 first:mt-0"
                            >
                              {entry.title ? (
                                <span className="shrink-0 pl-4 text-[0.6rem] font-semibold uppercase tracking-wider text-bodydark2">
                                  {entry.title}
                                </span>
                              ) : null}
                              <span className="h-px min-w-0 flex-1 bg-stroke dark:bg-strokedark" />
                            </li>
                          ))}

                          {hasPermission(permissions, 'labour.category.view') && (
                            <li style={subSlot('labour_items', 'labour_category')}>
                              <NavLink
                                to={routes.labour_category}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Category
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'labour.item.view') && (
                            <li style={subSlot('labour_items', 'labour_item')}>
                              <NavLink
                                to={routes.labour_item}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Item
                              </NavLink>
                            </li>
                          )}
                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}

              {/* Admin */}
              {hasMenuPermission(permissions, 'admin') && (
                <SidebarLinkGroup
                  activeCondition={
                    pathname === '/branch/branch-list' ||
                    pathname === '/user/user-list' ||
                    pathname === routes.online_users ||
                    pathname === routes.company_user_list ||
                    pathname === routes.reseller_admin ||
                    pathname === routes.roles ||
                    pathname === routes.add_role ||
                    pathname === routes.add_permission ||
                    pathname === routes.group_report_setup ||
                    pathname === '/admin/dayclose' ||
                    pathname === '/order/order-list' ||
                    pathname === routes.sms_send ||
                    pathname === routes.sms_template_list ||
                    pathname === routes.sms_template_create ||
                    pathname.includes('/sms/templates/edit/') ||
                    pathname.includes('forms')
                  }
                  menuId="admin"
                  style={menuSlot('admin')}
                  open={openMenu === 'admin'}
                  handleClick={() => handleMenuClick('admin')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === '/branch/branch-list' ||
                          pathname === routes.company_list ||
                          pathname.includes('/company/company-edit/') ||
                          pathname === '/user/user-list' ||
                          pathname === routes.online_users ||
                          pathname === routes.company_user_list ||
                          pathname === routes.reseller_admin ||
                          pathname === routes.roles ||
                          pathname === routes.add_role ||
                          pathname === routes.add_permission ||
                          pathname === routes.group_report_setup ||
                          pathname === '/admin/dayclose' ||
                          pathname === '/order/order-list' ||
                          pathname === '/admin/voucher-approval' ||
                          pathname === routes.approval_center ||
                          pathname === '/admin/remove-approval' ||
                          pathname === '/admin/voucher/type-change' ||
                          pathname === '/admin/image-upload' ||
                          pathname === '/admin/bulk-upload' ||
                          pathname === routes.sms_send ||
                          pathname === routes.sms_template_list ||
                          pathname === routes.sms_template_create ||
                          pathname.includes('/sms/templates/edit/') ||
                          pathname === '/admin/jumpdate' ||
                          pathname === '/orders/avg-price' ||
                          pathname === routes.order_with_transaction ||
                          pathname.includes('/branch/branch-list')) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <FaGear />
                        Admin
                      </NavLink>
                      <div
                        className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-180' : 'max-h-0'
                          }`}
                      >
                        <ul className="mt-2 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {subDividers('admin').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              className="mt-2 flex items-center gap-2 first:mt-0"
                            >
                              {entry.title ? (
                                <span className="shrink-0 pl-4 text-[0.6rem] font-semibold uppercase tracking-wider text-bodydark2">
                                  {entry.title}
                                </span>
                              ) : null}
                              <span className="h-px min-w-0 flex-1 bg-stroke dark:bg-strokedark" />
                            </li>
                          ))}

                          {hasPermission(permissions, 'company.view') && (
                            <li style={subSlot('admin', 'company_list')}>
                              <NavLink
                                to={routes.company_list}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Company List
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'branch.view') && (
                            <li style={subSlot('admin', 'branch/branch-list')}>
                              <NavLink
                                to="/branch/branch-list"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Branch List
                              </NavLink>
                            </li>
                          )}
                          {/* Product Tracking moved out to its own menu, with the
                              two reports that read what is configured here. */}
                          {hasPermission(permissions, 'software.information') && (
                            <li style={subSlot('admin', 'software_info')}>
                              <NavLink
                                to={routes.software_info}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Software Information
                              </NavLink>
                            </li>
                          )}
                          {/* No permission check. Arranging one's own sidebar
                              changes nothing anyone else can see, so every user
                              gets it -- the same reasoning as Profile. */}
                          <li style={subSlot('admin', 'menu_arrangement')}>
                            <NavLink
                              to={routes.menu_arrangement}
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                (isActive && 'text-gray-900 font-bold dark:text-white')
                              }
                            >
                              Arrange Menu
                            </NavLink>
                          </li>

                          {(hasPermission(permissions, 'all.user.view') || hasPermission(permissions, 'user.view')) && (
                            <li style={subSlot('admin', 'user_list')}>
                              <NavLink
                                to={routes.user_list}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                User List
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'online.users') || hasPermission(permissions, 'user.view')) && (
                            <li style={subSlot('admin', 'online_users')}>
                              <NavLink
                                to={routes.online_users}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Online Users
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'user.login.log') && (
                            <li style={subSlot('admin', 'user_login_log')}>
                              <NavLink
                                to={routes.user_login_log}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Login History
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'company.user') || hasPermission(permissions, 'user.view')) && (
                            <li style={subSlot('admin', 'company_user_list')}>
                              <NavLink
                                to={routes.company_user_list}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Company User
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'reseller.view') ||
                            hasPermission(permissions, 'subscription.view') ||
                            hasPermission(permissions, 'all.user.view')) && (
                              <li style={subSlot('admin', 'reseller_admin')}>
                                <NavLink
                                  to={routes.reseller_admin}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Resellers
                                </NavLink>
                              </li>
                            )}
                          {(hasPermission(permissions, 'reseller.view') ||
                            hasPermission(permissions, 'subscription.view') ||
                            hasPermission(permissions, 'all.user.view')) && (
                              <li style={subSlot('admin', 'admin_notifications')}>
                                <NavLink
                                  to={routes.admin_notifications}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Admin Notifications
                                </NavLink>
                              </li>
                            )}
                          {(hasPermission(permissions, 'reseller.view') ||
                            hasPermission(permissions, 'subscription.view') ||
                            hasPermission(permissions, 'all.user.view')) && (
                              <li style={subSlot('admin', 'admin_in_app_messages')}>
                                <NavLink
                                  to={routes.admin_in_app_messages}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  In-App Messages
                                </NavLink>
                              </li>
                            )}
                          {(hasPermission(permissions, 'reseller.view') ||
                            hasPermission(permissions, 'subscription.view') ||
                            hasPermission(permissions, 'all.user.view')) && (
                              <li style={subSlot('admin', 'inventory_systems')}>
                                <NavLink
                                  to={routes.inventory_systems}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Inventory Systems
                                </NavLink>
                              </li>
                            )}
                          {(hasPermission(permissions, 'reseller.view') ||
                            hasPermission(permissions, 'subscription.view') ||
                            hasPermission(permissions, 'all.user.view')) && (
                              <li style={subSlot('admin', 'tutorial_videos')}>
                                <NavLink
                                  to={routes.tutorial_videos}
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Tutorial Videos
                                </NavLink>
                              </li>
                            )}
                          {hasPermission(permissions, 'highlight.rules') && (
                            <li style={subSlot('admin', 'highlight_rules')}>
                              <NavLink
                                to={routes.highlight_rules}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Highlight Rules
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'roles.view') && (
                            <li style={subSlot('admin', 'roles')}>
                              <NavLink
                                to={routes.roles}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Roles
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'roles.create') && (
                            <li style={subSlot('admin', 'add_role')}>
                              <NavLink
                                to={routes.add_role}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Add Roles
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'roles.create') && (
                            <li style={subSlot('admin', 'add_permission')}>
                              <NavLink
                                to={routes.add_permission}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Add Permission
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'dayclose.create') && (
                            <li style={subSlot('admin', 'admin/dayclose')}>
                              <NavLink
                                to="/admin/dayclose"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Day Close
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'group.report') && (
                            <li style={subSlot('admin', 'group_report_setup')}>
                              <NavLink
                                to={routes.group_report_setup}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Add Group Report
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'order.view') && (
                            <li style={subSlot('admin', 'order/order-list')}>
                              <NavLink
                                to="/order/order-list"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Orders
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'order.view') && (
                            <li style={subSlot('admin', 'order_with_transaction')}>
                              <NavLink
                                to={routes.order_with_transaction}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Order With Transaction
                              </NavLink>
                            </li>
                          )}
                          {/* order.avg.price */}
                          {hasPermission(permissions, 'order.avg.price') && (
                            <li style={subSlot('admin', 'orders/avg-price')}>
                              <NavLink
                                to="/orders/avg-price"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Average Price
                              </NavLink>
                            </li>
                          )}
                          {/* voucher.approval */}
                          {(hasPermission(permissions, 'approval.center')) && (
                            <li style={subSlot('admin', 'approval_center')}>
                              <NavLink
                                to={routes.approval_center}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Approval Center
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'voucher.approval') && (
                            <li style={subSlot('admin', 'admin/voucher-approval')}>
                              <NavLink
                                to="/admin/voucher-approval"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Voucher Approval
                              </NavLink>
                            </li>
                          )}
                          {/* remove.approval */}
                          {hasPermission(permissions, 'remove.approval') && (
                            <li style={subSlot('admin', 'admin/remove-approval')}>
                              <NavLink
                                to="/admin/remove-approval"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Approval Remove
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'change.vourcher.type') && (
                            <li style={subSlot('admin', 'admin/voucher/type-change')}>
                              <NavLink
                                to="/admin/voucher/type-change"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Change Voucher Type
                              </NavLink>
                            </li>
                          )}

                          {/* voucher.photo.upload */}
                          {hasPermission(permissions, 'voucher.photo.upload') && (
                            <li style={subSlot('admin', 'admin/image-upload')}>
                              <NavLink
                                to="/admin/image-upload"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Voucher Upload
                              </NavLink>
                            </li>
                          )}
                          {/* bulk.photo.upload */}
                          {hasPermission(permissions, 'bulk.photo.upload') && (
                            <li style={subSlot('admin', 'admin/bulk-upload')}>
                              <NavLink
                                to="/admin/bulk-upload"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Bulk Upload
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'sms.logs') && (
                            <li style={subSlot('admin', 'sms_send')}>
                              <NavLink
                                to={routes.sms_send}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                SMS Logs
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'sms.templates') && (
                            <li style={subSlot('admin', 'sms_template_list')}>
                              <NavLink
                                to={routes.sms_template_list}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                SMS Templates
                              </NavLink>
                            </li>
                          )}



                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}
              {/* VR Settings */}
              {hasMenuPermission(permissions, 'voucher_settings') && (
                <SidebarLinkGroup
                  activeCondition={
                    pathname === '/vr-settings/voucher-delete' ||
                    pathname === '/admin/voucher/date-change' ||
                    pathname.includes('forms')
                  }
                  menuId="vr_settings"
                  style={menuSlot('vr_settings')}
                  open={openMenu === 'vr_settings'}
                  handleClick={() => handleMenuClick('vr_settings')}
                >

                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(
                          pathname === '/vr-settings/voucher-delete' ||
                          pathname === '/vr-settings/installment-delete' ||
                          pathname === '/admin/voucher/date-change' ||
                          pathname === '/vr-settings/recyclebin' ||
                          pathname === '/vr-settings/voucher-history' ||
                          pathname === '/vr-settings/voucher-activity' ||
                          pathname.includes('/vr-settings/voucher-delete')
                        ) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <FiLayers />
                        VR Settings
                      </NavLink>
                      <div
                        className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-180' : 'max-h-0'
                          }`}
                      >
                        <ul className="mt-2 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {subDividers('vr_settings').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              className="mt-2 flex items-center gap-2 first:mt-0"
                            >
                              {entry.title ? (
                                <span className="shrink-0 pl-4 text-[0.6rem] font-semibold uppercase tracking-wider text-bodydark2">
                                  {entry.title}
                                </span>
                              ) : null}
                              <span className="h-px min-w-0 flex-1 bg-stroke dark:bg-strokedark" />
                            </li>
                          ))}
                          {hasPermission(permissions, 'voucher.delete') && (
                            <li style={subSlot('vr_settings', 'vr-settings/voucher-delete')}>
                              <NavLink
                                to="/vr-settings/voucher-delete"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Voucher Delete
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'installment.delete') && (
                            <li style={subSlot('vr_settings', 'vr-settings/installment-delete')}>
                              <NavLink
                                to="/vr-settings/installment-delete"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Installment Delete
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'voucher.date.change') && (
                            <li style={subSlot('vr_settings', 'admin_change_date')}>
                              <NavLink
                                to={routes.admin_change_date}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Voucher Date Change
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'voucher.recycle') && (
                            <li style={subSlot('vr_settings', 'recyclebin')}>
                              <NavLink
                                to={routes.recyclebin}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Recycle Bin
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'voucher.history') && (
                            <li style={subSlot('vr_settings', 'voucher_history')}>
                              <NavLink
                                to={routes.voucher_history}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                History
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'log.changes') && (
                            <li style={subSlot('vr_settings', 'voucher_activity')}>
                              <NavLink
                                to={routes.voucher_activity}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >

                                Log Changes
                              </NavLink>
                            </li>
                          )}
                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}
              {/* HRM */}
              {hasMenuPermission(permissions, 'hrm') && (
                <SidebarLinkGroup
                  activeCondition={
                    pathname === '/hrms/employees' ||
                    pathname.includes('/hrms/designation-levels') ||
                    pathname.includes('/hrms/designations') ||
                    pathname.includes('/hrms/attendance') ||
                    pathname === '/hrms/salary/salary-generate' ||
                    pathname === routes.employee_loan_balance ||
                    pathname.includes('/hrms/salary-sheet') ||
                    pathname === routes.hrms_festival_bonus_generate ||
                    pathname.includes('/hrms/festival-bonus')
                  }
                  menuId="hrm"
                  style={menuSlot('hrm')}
                  open={openMenu === 'hrm'}
                  handleClick={() => handleMenuClick('hrm')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(
                          pathname === '/hrms/employees' ||
                          pathname.includes('/hrms/designation-levels') ||
                          pathname.includes('/hrms/designations') ||
                          pathname.includes('/hrms/attendance') ||
                          pathname === '/hrms/salary/salary-generate' ||
                          pathname === routes.employee_loan_balance ||
                          pathname === routes.employee_loan_ledger ||
                          pathname.includes('/hrms/salary-sheet') ||
                          pathname === routes.hrms_festival_bonus_generate ||
                          pathname.includes('/hrms/festival-bonus')
                        ) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded ? handleClick() : setSidebarExpanded(true);
                        }}
                      >
                        <FiClipboard />
                        HRM
                      </NavLink>
                      <div
                        className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-180' : 'max-h-0'
                          }`}
                      >
                        <ul className="mt-2 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {subDividers('hrm').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              className="mt-2 flex items-center gap-2 first:mt-0"
                            >
                              {entry.title ? (
                                <span className="shrink-0 pl-4 text-[0.6rem] font-semibold uppercase tracking-wider text-bodydark2">
                                  {entry.title}
                                </span>
                              ) : null}
                              <span className="h-px min-w-0 flex-1 bg-stroke dark:bg-strokedark" />
                            </li>
                          ))}
                          {hasPermission(permissions, 'employee.view') && (
                            <li style={subSlot('hrm', 'hrms/employees')}>
                              <NavLink
                                to="/hrms/employees"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Employees
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'employee.view') && (
                            <li style={subSlot('hrm', 'hrms_designation_level_list')}>
                              <NavLink
                                to={routes.hrms_designation_level_list}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Designation Levels
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'employee.view') && (
                            <li style={subSlot('hrm', 'hrms_designation_list')}>
                              <NavLink
                                to={routes.hrms_designation_list}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Designations
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'attendance.view') || hasPermission(permissions, 'employee.view')) && (
                            <li style={subSlot('hrm', 'hrms_attendance_entries')}>
                              <NavLink
                                to={routes.hrms_attendance_entries}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Manual Attendance
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'attendance.view') || hasPermission(permissions, 'employee.view')) && (
                            <li style={subSlot('hrm', 'hrms_attendance_report')}>
                              <NavLink
                                to={routes.hrms_attendance_report}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Attendance Report
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'attendance.view') || hasPermission(permissions, 'employee.view')) && (
                            <li style={subSlot('hrm', 'hrms_attendance_audit_history')}>
                              <NavLink
                                to={routes.hrms_attendance_audit_history}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Audit History
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'attendance.view') || hasPermission(permissions, 'employee.view')) && (
                            <li style={subSlot('hrm', 'hrms_overtime_report')}>
                              <NavLink
                                to={routes.hrms_overtime_report}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Overtime Report
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'attendance.view') || hasPermission(permissions, 'employee.view')) && (
                            <li style={subSlot('hrm', 'hrms_attendance_monthly_report')}>
                              <NavLink
                                to={routes.hrms_attendance_monthly_report}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Monthly Attendance
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'attendance.view') || hasPermission(permissions, 'employee.view')) && (
                            <li style={subSlot('hrm', 'hrms_attendance_exception_reports')}>
                              <NavLink
                                to={routes.hrms_attendance_exception_reports}
                                className={() =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  ([
                                    routes.hrms_attendance_exception_reports,
                                    routes.hrms_absent_report,
                                    routes.hrms_late_report,
                                    routes.hrms_early_out_report,
                                  ].includes(pathname) ? 'text-gray-900 font-bold dark:text-white' : '')
                                }
                              >
                                Attendance Alerts
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'attendance.view') || hasPermission(permissions, 'employee.view')) && (
                            <li style={subSlot('hrm', 'hrms_employee_attendance_report')}>
                              <NavLink
                                to={routes.hrms_employee_attendance_report}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Employee Attendance
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'attendance.view') || hasPermission(permissions, 'employee.view')) && (
                            <li style={subSlot('hrm', 'hrms_branch_attendance_summary')}>
                              <NavLink
                                to={routes.hrms_branch_attendance_summary}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Branch Attendance
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'attendance.view') || hasPermission(permissions, 'employee.view')) && (
                            <li style={subSlot('hrm', 'hrms_holiday_calendar_report')}>
                              <NavLink
                                to={routes.hrms_holiday_calendar_report}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Holiday Calendar
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'leave.view') || hasPermission(permissions, 'attendance.view') || hasPermission(permissions, 'employee.view')) && (
                            <li style={subSlot('hrm', 'hrms_leave_applications')}>
                              <NavLink
                                to={routes.hrms_leave_applications}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Leave Applications
                              </NavLink>
                            </li>
                          )}
                          {(hasPermission(permissions, 'attendance.view') || hasPermission(permissions, 'employee.view')) && (
                            <li style={subSlot('hrm', 'hrms_attendance_setup')}>
                              <NavLink
                                to={routes.hrms_attendance_setup}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Attendance Setup
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'salary.generate') && (
                            <li style={subSlot('hrm', 'hrms/salary/salary-generate')}>
                              <NavLink
                                to="/hrms/salary/salary-generate"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Salary Generate
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'salary.generate') && (
                            <li style={subSlot('hrm', 'hrms_festival_bonus_generate')}>
                              <NavLink
                                to={routes.hrms_festival_bonus_generate}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Bonus Generate
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'hrm.loan.create') && (
                            <li style={subSlot('hrm', 'employee_loan_balance')}>
                              <NavLink
                                to={routes.employee_loan_balance}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Loan Balance
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'employee.loan.ledger.view') && (
                            <li style={subSlot('hrm', 'employee_loan_ledger')}>
                              <NavLink
                                to={routes.employee_loan_ledger}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Loan Ledger
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'salary.sheet.view') && (
                            <li style={subSlot('hrm', 'hrms/salary-sheet')}>
                              <NavLink
                                to="/hrms/salary-sheet"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Salary Reports
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'salary.sheet.view') && (
                            <li style={subSlot('hrm', 'hrm_mismatch_payment')}>
                              <NavLink
                                to={routes.hrm_mismatch_payment}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Salary Mismatch
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'salary.sheet.view') && (
                            <li style={subSlot('hrm', 'hrms_festival_bonus_list')}>
                              <NavLink
                                to={routes.hrms_festival_bonus_list}
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Bonus Reports
                              </NavLink>
                            </li>
                          )}
                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}

              {/* Customer & Supplier */}
              {hasMenuPermission(permissions, 'customer') && (
                <>
                  <SidebarLinkGroup
                    activeCondition={
                      pathname === '/customer-supplier/list' ||
                      pathname === '/coal1/coal1-list' ||
                      pathname === '/coal2/coal2-list' ||
                      pathname === '/coal3/coal3-list' ||
                      pathname === '/coal4/coal4-list' ||
                      pathname === '/coal4/opening-balance' ||
                      pathname.includes('forms')
                    }
                    menuId="customer-supplier"
                  style={menuSlot('customer-supplier')}
                    open={openMenu === 'customer-supplier'}
                    handleClick={() => handleMenuClick('customer-supplier')}
                  >
                    {(handleClick, open) => (
                      <React.Fragment>
                        <NavLink
                          to="#"
                          className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(pathname === '/customer-supplier/list' ||
                            pathname.includes('/customer-supplier/list') ||
                            pathname === '/coal1/coal1-list' ||
                            pathname === '/coal2/coal2-list' ||
                            pathname === '/coal3/coal3-list' ||
                            pathname === '/coal4/coal4-list' ||
                            pathname === '/coal4/opening-balance' ||
                            pathname.includes('/coal4/coal4-list')) &&
                            'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                            }`}
                          onClick={(e) => {
                            e.preventDefault();
                            sidebarExpanded
                              ? handleClick()
                              : setSidebarExpanded(true);
                          }}
                        >
                          <FiUsers />
                          Customers
                        </NavLink>
                        <div
                          className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-180' : 'max-h-0'
                            }`}
                        >
                          <ul className="mt-2 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {subDividers('customer-supplier').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              className="mt-2 flex items-center gap-2 first:mt-0"
                            >
                              {entry.title ? (
                                <span className="shrink-0 pl-4 text-[0.6rem] font-semibold uppercase tracking-wider text-bodydark2">
                                  {entry.title}
                                </span>
                              ) : null}
                              <span className="h-px min-w-0 flex-1 bg-stroke dark:bg-strokedark" />
                            </li>
                          ))}
                            {hasPermission(permissions, 'cs.view') && (
                              <li style={subSlot('customer-supplier', 'customer-supplier/list')}>
                                <NavLink
                                  to="/customer-supplier/list"
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Customers
                                </NavLink>
                              </li>
                            )}
                            {hasPermission(permissions, 'coa.l1.view') && (
                              <li style={subSlot('customer-supplier', 'coal1/coal1-list')}>
                                <NavLink
                                  to="/coal1/coal1-list"
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  CoA L1
                                </NavLink>
                              </li>
                            )}
                            {hasPermission(permissions, 'coa.l2.view') && (
                              <li style={subSlot('customer-supplier', 'coal2/coal2-list')}>
                                <NavLink
                                  to="/coal2/coal2-list"
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  CoA L2
                                </NavLink>
                              </li>
                            )}
                            {hasPermission(permissions, 'coa.l3.view') && (
                              <li style={subSlot('customer-supplier', 'coal3/coal3-list')}>
                                <NavLink
                                  to="/coal3/coal3-list"
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  CoA L3
                                </NavLink>
                              </li>
                            )}
                            {hasPermission(permissions, 'coa.l4.view') && (
                              <li style={subSlot('customer-supplier', 'coal4/coal4-list')}>
                                <NavLink
                                  to="/coal4/coal4-list"
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  CoA L4
                                </NavLink>
                              </li>
                            )}
                            {/* Opening balances for cash, the banks and mobile
                                banking. Kept off the CoA L4 list itself, where
                                most rows are expense and sales heads that open
                                at nothing -- and behind its own permission,
                                since opening an account with a figure writes a
                                journal voucher while reading the chart does not. */}
                            {hasPermission(permissions, 'bank.opening.view') && (
                              <li style={subSlot('customer-supplier', 'coal4/opening-balance')}>
                                <NavLink
                                  to="/coal4/opening-balance"
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                    (isActive && 'text-gray-900 font-bold dark:text-white')
                                  }
                                >
                                  Bank Opening
                                </NavLink>
                              </li>
                            )}
                          </ul>
                        </div>
                      </React.Fragment>
                    )}
                  </SidebarLinkGroup>

                </>
              )}

              {/* Analytics */}
              {hasMenuPermission(permissions, 'analytics') && (
                <SidebarLinkGroup
                  activeCondition={
                    pathname === '/item/item-chart' || pathname.includes('forms')
                  }
                  menuId="al-charts"
                  style={menuSlot('al-charts')}
                  open={openMenu === 'al-charts'}
                  handleClick={() => handleMenuClick('al-charts')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${(
                          pathname === '/item/item-chart' ||
                          pathname.includes('/item/item-chart')
                        ) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <FiBarChart2 />
                        Analytics
                      </NavLink>
                      <div
                        className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-180' : 'max-h-0'
                          }`}
                      >
                        <ul className="mt-2 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {subDividers('al-charts').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              className="mt-2 flex items-center gap-2 first:mt-0"
                            >
                              {entry.title ? (
                                <span className="shrink-0 pl-4 text-[0.6rem] font-semibold uppercase tracking-wider text-bodydark2">
                                  {entry.title}
                                </span>
                              ) : null}
                              <span className="h-px min-w-0 flex-1 bg-stroke dark:bg-strokedark" />
                            </li>
                          ))}
                          {hasPermission(permissions, 'analytics.comparison') && (
                            <li style={subSlot('al-charts', 'item/item-chart')}>
                              <NavLink
                                to="/item/item-chart"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md px-4 font-medium  duration-300 ease-in-out hover:text-gray-900 dark:hover:text-white ' +
                                  (isActive && 'text-gray-900 font-bold dark:text-white')
                                }
                              >
                                Comparison
                              </NavLink>
                            </li>
                          )}
                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}
              {/* Customer Dashboard */}


              {hasPermission(permissions, 'customer.dashboard') && (
                <li style={menuSlot('customer_dashboard')}>
                  <NavLink
                    to="/customer-dashboard"
                    className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${pathname === '/customer-dashboard' &&
                      'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-l-4 border-blue-500'
                      }`}
                  >
                    <svg
                      className="fill-current"
                      width="18"
                      height="19"
                      viewBox="0 0 18 19"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g clipPath="url(#clip0_130_9801)">
                        <path
                          d="M10.8563 0.55835C10.5188 0.55835 10.2095 0.8396 10.2095 1.20522V6.83022C10.2095 7.16773 10.4907 7.4771 10.8563 7.4771H16.8751C17.0438 7.4771 17.2126 7.39272 17.3251 7.28022C17.4376 7.1396 17.4938 6.97085 17.4938 6.8021C17.2688 3.28647 14.3438 0.55835 10.8563 0.55835ZM11.4751 6.15522V1.8521C13.8095 2.13335 15.6938 3.8771 16.1438 6.18335H11.4751V6.15522Z"
                          fill=""
                        />
                        <path
                          d="M15.3845 8.7427H9.1126V2.69582C9.1126 2.35832 8.83135 2.07707 8.49385 2.07707C8.40947 2.07707 8.3251 2.07707 8.24072 2.07707C3.96572 2.04895 0.506348 5.53645 0.506348 9.81145C0.506348 14.0864 3.99385 17.5739 8.26885 17.5739C12.5438 17.5739 16.0313 14.0864 16.0313 9.81145C16.0313 9.6427 16.0313 9.47395 16.0032 9.33332C16.0032 8.99582 15.722 8.7427 15.3845 8.7427ZM8.26885 16.3083C4.66885 16.3083 1.77197 13.4114 1.77197 9.81145C1.77197 6.3802 4.47197 3.53957 7.8751 3.3427V9.36145C7.8751 9.69895 8.15635 10.0083 8.52197 10.0083H14.7938C14.6813 13.4958 11.7845 16.3083 8.26885 16.3083Z"
                          fill=""
                        />
                      </g>
                      <defs>
                        <clipPath id="clip0_130_9801">
                          <rect
                            width="18"
                            height="18"
                            fill="white"
                            transform="translate(0 0.052124)"
                          />
                        </clipPath>
                      </defs>
                    </svg>
                    Customer Dashboard
                  </NavLink>
                </li>
              )}
            </ul>
            {isTopbar ? (
              <div className="mb-1 flex shrink-0 items-center">
                <DropdownUser />
              </div>
            ) : null}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
