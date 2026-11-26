import React, { CSSProperties, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
import {
  AdminMenuIcon,
  AssetsMenuIcon,
  BranchTransferMenuIcon,
  CompanySchemeMenuIcon,
  HotelMenuIcon,
  HrmMenuIcon,
  InvoiceMenuIcon,
  LabourItemsMenuIcon,
  ProductsMenuIcon,
  ProductTrackingMenuIcon,
  ReportsMenuIcon,
  RequisitionMenuIcon,
  ResellerMenuIcon,
  TransactionMenuIcon,
  VrSettingsMenuIcon,
} from './mobileMenuIcons';
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
    { id: 'delivery_dashboard', title: "Delivery System" },
  ],
  'transaction': [
    { id: 'cash_receive', title: "Cash Received" },
    { id: 'accounts/cash/payment', title: "Cash Payment" },
    { id: 'accounts/bank/receive', title: "Bank Received" },
    { id: 'accounts/bank/payment', title: "Bank Payment" },
    { id: 'accounts/bank/reconciliation', title: "Bank Reconciliation" },
    { id: 'accounts/cheque-register', title: "Cheque Register" },
    { id: 'hotel_received_entry', title: "Received Entry" },
    { id: 'hotel_payment_entry', title: "Payment Entry" },
    // ⚠️ MOVED HERE from Assets (2026-11-14), which had it from Hotel. The id
    // and permission keep their `hotel_` spelling: saved arrangements and
    // granted permissions refer to them by name.
    { id: 'hotel_asset_purchase', title: "Accounts Transaction" },
    { id: 'accounts/year-closing', title: "Year Closing" },
    { id: 'accounts/budget', title: "Budget" },
    { id: 'installment_list', title: "Installments" },
    { id: 'employee_loan', title: "Employee Loan" },
    { id: 'purchase_advance', title: "Advance for Purchase" },
    { id: 'accounts/journal', title: "Journal" },
    { id: 'accounts/inter-branch', title: "Inter-Branch Transfers" },
  ],
  'invoice': [
    { id: 'invoice/purchase', title: "Purchase" },
    { id: 'inv_purchase_import', title: "Purchase Import" },
    { id: 'invoice/sales', title: "Sales" },
    { id: 'inv_sales_import', title: "Sales Import" },
    { id: 'inv_purchase_return', title: "Purchase Return" },
    { id: 'inv_sales_return', title: "Sales Return" },
    { id: 'inv_delivery', title: "Delivery" },
    { id: 'invoice/labour-invoice', title: "Labour Invoice" },
    { id: 'inv_trading_combined', title: "Combined Invoice" },
    { id: 'inv_tiles_combined', title: "Combined Invoice" },
  ],
  'labour_items': [
    { id: 'labour_category', title: "Category" },
    { id: 'labour_item', title: "Item" },
  ],
  'production': [
    { id: 'production_entry', title: "Production Entry" },
    { id: 'production_sales', title: "Production Sales" },
    { id: 'production_purchase', title: "Production Purchase" },
    { id: 'production_sales_return', title: "Production Sales Return" },
    { id: 'production_scheme', title: "Scheme" },
    { id: 'production_recipe', title: "Recipe" },
    { id: 'production_register', title: "Production Register" },
    { id: 'production_free_goods', title: "Free Goods" },
    { id: 'production_expiry', title: "Near Expiry" },
  ],
  // Four tab groups, the way Financial Statement does it.
  'branch-transfer': [
    { id: 'branch_transfer', title: "Transfer" },
    { id: 'report_branch_transfer', title: "Transfer Reports" },
    { id: 'material_issue', title: "Product Out" },
    { id: 'product_in', title: "Product In" },
  ],
  'reports': [
    { id: 'reports/cashbook', title: "Cash & Bank" },
    { id: 'reports/due-installments', title: "Installment & Somity" },
    { id: 'reports/ledger', title: "Ledger & Due" },
    { id: 'reports/product/stock', title: "Stock" },
    { id: 'reports/purchase-ledger', title: "Purchase & Sales" },
  ],
  // The statements render as tabs in four groups, the way Reports does, so the
  // menu offers each group rather than each screen. This list must name what
  // the sidebar draws.
  'financial_statement': [
    { id: 'product_profit_loss', title: "Profit Analysis" },
    { id: 'profit_loss_date_wise', title: "Periodic Statements" },
    { id: 'trial_balance_level4', title: "Trial Balance" },
    { id: 'profit_loss', title: "Final Accounts" },
  ],
  'legacy': [
    { id: 'legacy/records', title: "Old ERP Record" },
    { id: 'legacy/old-records', title: "Old ERP Record (পুরনো ভার্সন)" },
    { id: 'legacy/accounts', title: "Old ERP Account" },
  ],
  'product_tracking': [
    { id: 'product_tracking_settings', title: "Product Tracking" },
    { id: 'product_financial_statement', title: "Product Statement" },
    { id: 'product_tracking_summary', title: "Product Receivable \/ Payable" },
  ],
  'company_scheme': [
    { id: 'company_scheme_receivable', title: "Receivable" },
    { id: 'company_scheme_receipts', title: "Receipts" },
  ],
  'requisition': [
    { id: 'requisition', title: "Requisitions" },
    { id: 'requisition_create', title: "Create" },
    { id: 'requisition_comparison', title: "Comparison" },
  ],
  // Four tab groups, the way Financial Statement does it.
  'real-estate': [
    { id: 'real-estate/area-list', title: "Setup" },
    { id: 'real-estate/unit-sales', title: "Sales" },
    { id: 'real_estate_project_expense', title: "Project Entry" },
    { id: 'real_estate_project_summary_report', title: "Project Reports" },
  ],
  'asset': [
    { id: 'asset_setup', title: "Assets" },
  ],
  'hotel': [
    { id: 'hotel_bookings', title: "Bookings" },
    { id: 'hotel_hall_bookings', title: "Hall Booking" },
    { id: 'hotel_calendar', title: "Calendar" },
    { id: 'hotel_housekeeping', title: "Housekeeping" },
    { id: 'hotel_amenity_issue', title: "Amenity Issue & Stock" },
    { id: 'hotel_reports', title: "Reports" },
    { id: 'hotel_booking_due', title: "Booking-wise Due" },
    { id: 'hotel_setup', title: "Rooms & Seats Setup" },
  ],
  'products': [
    { id: 'category/category-list', title: "Classification" },
    { id: 'product/product-list', title: "Products" },
    { id: 'product_low_stock', title: "Stock Alerts" },
  ],
  'admin': [
    { id: 'company_list', title: "Company & Branch" },
    { id: 'menu_arrangement', title: "Settings" },
    { id: 'user_list', title: "Users" },
    { id: 'reseller_admin', title: "Platform" },
    { id: 'roles', title: "Roles & Permissions" },
    { id: 'admin/dayclose', title: "Daily Control" },
    { id: 'order/order-list', title: "Orders" },
    { id: 'admin/image-upload', title: "Uploads" },
    { id: 'sms_send', title: "SMS" },
  ],
  'vr_settings': [
    { id: 'admin_change_date', title: "Corrections" },
    { id: 'voucher_history', title: "Audit" },
  ],
  'hrm': [
    { id: 'hrms/employees', title: "Employees" },
    { id: 'hrms_designation_list', title: "Structure" },
    { id: 'hrms_attendance_entries', title: "Attendance" },
    { id: 'hrms_attendance_report', title: "Attendance Reports" },
    { id: 'hrms_attendance_setup', title: "Attendance Settings" },
    { id: 'hrms/salary/salary-generate', title: "Salary & Bonus Generate" },
    { id: 'hrms_salary_component_list', title: "Salary Setup" },
    { id: 'employee_loan_balance', title: "Loan" },
    { id: 'hrms/salary-sheet', title: "Salary Reports" },
  ],
  'customer-supplier': [
    { id: 'customer-supplier/list', title: "Customers" },
    { id: 'coal1/coal1-list', title: "Chart of Accounts" },
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
  { id: 'financial_statement', title: 'Financial Statement' },
  { id: 'product_tracking', title: 'Product Tracking' },
  { id: 'company_scheme', title: 'Company Scheme' },
  { id: 'requisition', title: 'Requisition' },
  { id: 'production', title: 'Production' },
  { id: 'real-estate', title: 'Real Estate' },
  { id: 'hotel', title: 'Hotel' },
  { id: 'asset', title: 'Assets' },
  { id: 'products', title: 'Products' },
  { id: 'labour_items', title: 'Labour Items' },
  { id: 'admin', title: 'Admin' },
  { id: 'vr_settings', title: 'VR Settings' },
  { id: 'hrm', title: 'HRM' },
  { id: 'customer-supplier', title: 'Customer & Supplier' },
  { id: 'al-charts', title: 'Analytics' },
  { id: 'legacy', title: 'Old Software' },
  { id: 'customer_dashboard', title: 'Customer Dashboard' },
  // The manual: every signed-in user, so it sits at the end of the list and
  // carries no permission gate.
  { id: 'help', title: 'Help' },
];
import {
  FiArchive,
  FiBarChart2,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiChevronUp,
  FiEye,
  FiEyeOff,
  FiMenu,
  FiGrid,
  FiHelpCircle,
  FiHome,
  FiMapPin,
  FiPieChart,
  FiTool,
  FiTrendingUp,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import { FaBluetooth, FaRegStar } from 'react-icons/fa6';
import { hasPermission } from '../utils/permissionChecker';
import { inTabGroup, tabsFor, useTabOrder } from '../utils/others/RouteTabs';
import { ATTENDANCE_REPORT_TABS, ATTENDANCE_SETTINGS_TABS, ATTENDANCE_TABS, DESIGNATION_TABS, LOAN_TABS, SALARY_GENERATE_TABS, SALARY_REPORT_TABS, SALARY_SETUP_TABS, DAILY_CONTROL_TABS, ORDER_TABS, UPLOAD_TABS, COMPANY_BRANCH_TABS, USER_TABS, ROLE_TABS, ADMIN_SETTINGS_TABS, PLATFORM_TABS, SMS_TABS, PRODUCT_TABS, CLASSIFICATION_TABS, STOCK_ALERT_TABS, VR_CORRECTION_TABS, VR_AUDIT_TABS, PARTY_TABS, COA_TABS, REPORT_CASH_BANK_TABS, REPORT_LEDGER_TABS, REPORT_SALES_TABS, REPORT_STOCK_TABS, REPORT_INSTALLMENT_TABS, FIN_PROFIT_TABS, FIN_PERIODIC_TABS, FIN_TRIAL_BALANCE_TABS, FIN_FINAL_ACCOUNTS_TABS, RE_SETUP_TABS, RE_SALES_TABS, RE_PROJECT_ENTRY_TABS, RE_PROJECT_REPORT_TABS, BT_TRANSFER_TABS, BT_REPORT_TABS, BT_PRODUCT_OUT_TABS, BT_PRODUCT_IN_TABS } from '../services/tabGroups';
import { branchFormVariant, branchInvoiceVariant, separateEntriesShown, unifiedEntryShown } from '../utils/userFeatureSettings';
import { useSelector } from 'react-redux';
import { useMenuLabel } from '../../i18n/menuLabel';
import { getCurrentLanguage } from '../../i18n/currentLanguage';
import './Sidebar.css';
import routes from '../services/appRoutes';
import { isMenuActive } from './menuRoutes';
import { subMenuLinkClass } from './sidebarStyles';
import { resolveAssetUrl } from '../services/resolveAssetUrl';
import { hasMenuPermission } from './hasMenuPermission';
import DropdownUser from '../Header/DropdownUser';
import { Button } from '../../pages/UiElements/CustomButtons';

/**
 * The glyph each menu carries, declared once.
 *
 * The Help page draws the same menus; reading this map instead of repeating the
 * icon list there is what keeps the two from drifting apart.
 */
export const SIDEBAR_MENU_ICONS: Record<string, React.ReactNode> = {
  dashboard: <FiGrid />,
  reseller: <ResellerMenuIcon />,
  transaction: <TransactionMenuIcon />,
  invoice: <InvoiceMenuIcon />,
  'branch-transfer': <BranchTransferMenuIcon />,
  reports: <ReportsMenuIcon />,
  financial_statement: <FiPieChart />,
  product_tracking: <ProductTrackingMenuIcon />,
  company_scheme: <CompanySchemeMenuIcon />,
  requisition: <RequisitionMenuIcon />,
  'real-estate': <FiMapPin />,
  hotel: <HotelMenuIcon />,
  asset: <AssetsMenuIcon />,
  products: <ProductsMenuIcon />,
  labour_items: <LabourItemsMenuIcon />,
  admin: <AdminMenuIcon />,
  vr_settings: <VrSettingsMenuIcon />,
  hrm: <HrmMenuIcon />,
  'customer-supplier': <FiUsers />,
  'al-charts': <FiBarChart2 />,
  legacy: <FiArchive />,
  customer_dashboard: <FiUser />,
  help: <FiHelpCircle />,
};

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
  mode?: 'sidebar' | 'topbar';
}

const Sidebar = ({ sidebarOpen, setSidebarOpen, mode = 'sidebar' }: SidebarProps) => {
  const location = useLocation();
  const { pathname } = location;
  const isTopbar = mode === 'topbar';
  // Menu names follow the screen's language; English reads back unchanged.
  const ml = useMenuLabel();
  const [permissions, setPermissions] = useState<any>([]);
  const settings = useSelector((s: any) => s.settings);
  // The API's own verdict on whether this account may use the platform tools
  // (SettingsController sends it, from the same predicate PlatformAdmin
  // enforces). The menu reads it instead of guessing from permissions, so a
  // tenant user is never shown a platform screen the API would refuse.
  const isPlatformAdmin = Boolean(settings?.data?.is_platform_admin);
  // Each tab-group link opens the user's first tab, in their own order.
  const { sort: sortTabs } = useTabOrder();
  const currentBranch = useSelector((s: any) => s.branchList.currentBranch);
  // Whether the branch the books are in offers "Deduct stock on delivery". The
  // Delivery menu and the dashboard's Delivery System entry exist only where it
  // does; a branch without it reads exactly as it did before the feature. The
  // value is the CURRENT branch's, so switching branches (which reloads) shows
  // or hides them with the branch.
  const deductStockOnDelivery =
    Number(settings?.data?.branch?.deduct_stock_on_delivery) === 1;

  // Branch Setup -> Invoice Setup: the combined form this branch has chosen.
  // Blank is Automatic, and the business type decides exactly as before; an
  // explicit choice shows only its own entry.
  const combinedVariant = branchInvoiceVariant(settings, 'invoice_variant_combined');
  const showTradingCombined = combinedVariant
    ? combinedVariant === 'trading'
    : currentBranch?.business_type_id === 8;
  const showTilesCombined = combinedVariant
    ? combinedVariant === 'tiles'
    : Boolean(currentBranch?.is_tiles_and_sanitary);

  // Branch Setup -> Forms Setup: which way this branch takes its received and
  // payment entries. Automatic (blank) leaves both the separate cash/bank
  // entries and the unified entry on offer, exactly as before. The two sides
  // are chosen independently.
  const receivedMode = branchFormVariant(settings, 'received_entry_mode');
  const paymentMode = branchFormVariant(settings, 'payment_entry_mode');
  const showSeparateReceived = separateEntriesShown(receivedMode);
  const showUnifiedReceived = unifiedEntryShown(receivedMode);
  const showSeparatePayment = separateEntriesShown(paymentMode);
  const showUnifiedPayment = unifiedEntryShown(paymentMode);

  // ⚠️ THE INVOICE MENU OPENS ON EXACTLY WHAT ITS ITEMS SHOW ON. The generic
  // list (MENU_PERMISSIONS.invoice) counted delivery.view on its own, so on a
  // branch without "Deduct stock on delivery" a user holding it for the
  // Delivery Report -- a hotel manager -- got an Invoice menu with nothing in
  // it. And it left out the import and return keys, so a user holding only
  // Sales Return could never reach the item. Read off the items below instead.
  const showInvoiceMenu =
    [
      'purchase.create',
      'purchase.import',
      'sales.create',
      'sales.import',
      'purchase.return.view',
      'sales.return',
      'labour.invoice.create',
      'trading.combined.create',
      'tiles.combined.create',
    ].some((key) => hasPermission(permissions, key)) ||
    (deductStockOnDelivery && hasPermission(permissions, 'delivery.view'));
  const companyNameEn =
    settings?.data?.company?.name ||
    currentBranch?.company?.name ||
    settings?.data?.branch?.name ||
    'CashbookBD';
  const companyNameLocal =
    settings?.data?.company?.name_local ||
    currentBranch?.company?.name_local ||
    settings?.data?.branch?.name_local;
  const companyName =
    getCurrentLanguage() !== 'en' && companyNameLocal ? companyNameLocal : companyNameEn;
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
        dataKey: `${menuId}/${entry.id}`,
        style: {
          order: entry.index,
          display: emptyDividers.includes(`${menuId}/${entry.id}`) ? 'none' : undefined,
        } as CSSProperties,
      }));
  };

  /**
   * Headings with nothing under them, hidden.
   *
   * Which entries show is decided inline, one condition per entry -- a
   * permission, a trade, a branch setting -- so the only place that knows
   * whether a group came out empty is the list as drawn. Read after every
   * render: entries in display order (flex order, then document order),
   * and a heading counts as empty when no visible entry follows it before
   * the next heading. Stored as one string so an unchanged answer does not
   * render again.
   */
  const [emptyDividersKey, setEmptyDividersKey] = useState('');
  const emptyDividers = emptyDividersKey ? emptyDividersKey.split('|') : [];

  useLayoutEffect(() => {
    const root = sidebar.current;
    if (!root) return;

    const lists = new Set<HTMLElement>();
    root.querySelectorAll<HTMLElement>('li[data-divider]').forEach((li) => {
      if (li.parentElement) lists.add(li.parentElement);
    });

    const empty: string[] = [];
    lists.forEach((list) => {
      const rows = (Array.from(list.children) as HTMLElement[])
        .map((el, index) => ({ el, index, order: Number(el.style.order || 0), divider: el.dataset.divider }))
        .sort((a, b) => a.order - b.order || a.index - b.index);

      let heading: string | undefined;
      let filled = false;
      const close = () => {
        if (heading && !filled) empty.push(heading);
      };

      rows.forEach((row) => {
        if (row.divider) {
          close();
          heading = row.divider;
          filled = false;
        } else if (row.el.style.display !== 'none') {
          filled = true;
        }
      });
      close();
    });

    const next = empty.sort().join('|');
    setEmptyDividersKey((current) => (current === next ? current : next));
  });
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
          ? 'topbar-menu sticky top-0 isolate z-9998 w-full border-b border-stroke bg-[rgb(var(--c-sidebar))] dark:border-strokedark'
          : `app-sidebar-menu w-72.5 ${sidebarCollapsed ? 'app-sidebar-collapsed lg:w-20' : ''} absolute left-0 top-0 z-9999 flex h-screen flex-col overflow-y-hidden duration-300 ease-linear bg-[rgb(var(--c-sidebar))] lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
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
              <span className="block truncate text-lg font-bold leading-tight text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                {companyName}
              </span>
            </span>
          </NavLink>
          <Button
            type="button"
            onClick={() => {
              setSidebarCollapsed((current) => !current);
              setOpenMenu(null);
            }}
            className={`hidden w-9 items-center justify-center rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-slate-600 shadow-sm transition hover:bg-gray-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-meta-4 lg:flex ${sidebarCollapsed ?'lg: lg:w-8 lg:flex-none':''}`}
            title={sidebarCollapsed ? 'Show menu labels' : 'Show icons only'}
            aria-label={sidebarCollapsed ? 'Show menu labels' : 'Show icons only'}
          >
            {sidebarCollapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
          </Button>
          <Button
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
          </Button>
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
                  activeCondition={isMenuActive('dashboard', pathname)}
                  menuId="dashboard"
                  style={menuSlot('dashboard')}
                  open={openMenu === 'dashboard'}
                  handleClick={() => handleMenuClick('dashboard')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="/dashboard"
                        className={`group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${isMenuActive('dashboard', pathname) && 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'}`}
                        onClick={(e) => {
                          // e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <FiGrid />
                        {ml("Dashboard")}
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
                          {subDividers('dashboard').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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
                            className={subMenuLinkClass}
                          >
                            {ml("Dashboard")}
                          </NavLink>
                        </li>
                        {deductStockOnDelivery && hasPermission(permissions, 'delivery.dashboard.view') && (
                          <li style={subSlot('dashboard', 'delivery_dashboard')}>
                            <NavLink
                              to={routes.delivery_dashboard}
                              className={subMenuLinkClass}
                            >
                              {ml("Delivery System")}
                            </NavLink>
                          </li>
                        )}
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
                      'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                      }`}
                  >
                    <ResellerMenuIcon />
                    {ml("Reseller Dashboard")}
                  </NavLink>
                </li>
              )}
              {/* Transaction */}
              {hasMenuPermission(permissions, 'transaction') && (
                <SidebarLinkGroup
                  activeCondition={isMenuActive('transaction', pathname)}
                  menuId="transaction"
                  style={menuSlot('transaction')}
                  open={openMenu === 'transaction'}
                  handleClick={() => handleMenuClick('transaction')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${isMenuActive('transaction', pathname) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <TransactionMenuIcon />
                        {ml("Transaction")}
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
                          {subDividers('transaction').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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
                          {hasPermission(permissions, 'cash.received.create') && showSeparateReceived && (
                            <li style={subSlot('transaction', 'cash_receive')}>
                              <NavLink
                                to={routes.cash_receive}
                                className={subMenuLinkClass}
                              >
                                {ml("Cash Received")}
                              </NavLink>
                            </li>
                          )}
                          

                          {hasPermission(permissions, 'cash.payment.create') && showSeparatePayment && (
                            <li style={subSlot('transaction', 'accounts/cash/payment')}>
                              <NavLink
                                to="/accounts/cash/payment"
                                className={subMenuLinkClass}
                              >
                                {ml("Cash Payment")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'bank.received.create') && showSeparateReceived && (
                            <li style={subSlot('transaction', 'accounts/bank/receive')}>
                              <NavLink
                                to="/accounts/bank/receive"
                                className={subMenuLinkClass}
                              >
                                {ml("Bank Received")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'bank.payment.create') && showSeparatePayment && (
                            <li style={subSlot('transaction', 'accounts/bank/payment')}>
                              <NavLink
                                to="/accounts/bank/payment"
                                className={subMenuLinkClass}
                              >
                                {ml("Bank Payment")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'bank.reconciliation.view') && (
                            <li style={subSlot('transaction', 'accounts/bank/reconciliation')}>
                              <NavLink
                                to={routes.bank_reconciliation}
                                className={subMenuLinkClass}
                              >
                                {ml("Bank Reconciliation")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'cheque.register.view') && (
                            <li style={subSlot('transaction', 'accounts/cheque-register')}>
                              <NavLink
                                to={routes.cheque_register}
                                className={subMenuLinkClass}
                              >
                                {ml("Cheque Register")}
                              </NavLink>
                            </li>
                          )}
                          {/* Permission says who may; the company switch says
                              whether this company closes years at all (§42).
                              Both, or the item is not there. */}
                          {hasPermission(permissions, 'year.closing.run')
                          && Number(currentBranch?.company?.year_closing_enabled) === 1 && (
                            <li style={subSlot('transaction', 'accounts/year-closing')}>
                              <NavLink
                                to={routes.year_closing}
                                className={subMenuLinkClass}
                              >
                                {ml("Year Closing")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'budget.view') && (
                            <li style={subSlot('transaction', 'accounts/budget')}>
                              <NavLink
                                to={routes.budget}
                                className={subMenuLinkClass}
                              >
                                {ml("Budget")}
                              </NavLink>
                            </li>
                          )}
                          
                          {hasPermission(permissions, 'installment.create') && (
                            <li style={subSlot('transaction', 'installment_list')}>
                              <NavLink
                                to={routes.installment_list}
                                className={subMenuLinkClass}
                              >
                                {ml("Installments")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'hrm.loan.create') && (
                            <li style={subSlot('transaction', 'employee_loan')}>
                              <NavLink
                                to={routes.employee_loan}
                                className={subMenuLinkClass}
                              >
                                {ml("Employee Loan")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'purchase.advance.view') && (
                            <li style={subSlot('transaction', 'purchase_advance')}>
                              <NavLink
                                to={routes.purchase_advance}
                                className={subMenuLinkClass}
                              >
                                {ml("Advance for Purchase")}
                              </NavLink>
                            </li>
                          )}

                          {/* The unified entries. Offered unless the branch has
                              chosen the separate cash/bank way; Automatic shows
                              them, as before. ⚠️ Each on its OWN key now -- the
                              same one its route guard and search entry ask for.
                              No Hotel permission: these are general Transaction
                              features, and a shop that never ran a hotel can be
                              given them. */}
                          {showUnifiedReceived && hasPermission(permissions, 'received.entry.create') && (
                            <li style={subSlot('transaction', 'hotel_received_entry')}>
                              <NavLink to={routes.hotel_received_entry} className={subMenuLinkClass}>
                                {ml("Received Entry")}
                              </NavLink>
                            </li>
                          )}

                          {showUnifiedPayment && hasPermission(permissions, 'payment.entry.create') && (
                            <li style={subSlot('transaction', 'hotel_payment_entry')}>
                              <NavLink to={routes.hotel_payment_entry} className={subMenuLinkClass}>
                                {ml("Payment Entry")}
                              </NavLink>
                            </li>
                          )}

                          {/* Buying assets and expense items against an accounts
                              head -- not a purchase invoice, nothing lands in
                              stock. Moved here from Assets on 2026-11-14. Its
                              own key, hotel.accounts.transaction.create. */}
                          {hasPermission(permissions, 'hotel.accounts.transaction.create') && (
                            <li style={subSlot('transaction', 'hotel_asset_purchase')}>
                              <NavLink to={routes.hotel_asset_purchase} className={subMenuLinkClass}>
                                {ml("Accounts Transaction")}
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'journal.create') && (
                            <li style={subSlot('transaction', 'accounts/journal')}>
                              <NavLink
                                to="/accounts/journal"
                                className={subMenuLinkClass}
                              >
                                {ml("Journal")}
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'interbranch.transfer.view') && (
                            <li style={subSlot('transaction', 'accounts/inter-branch')}>
                              <NavLink
                                to={routes.inter_branch}
                                className={subMenuLinkClass}
                              >
                                {ml("Inter-Branch Transfers")}
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
              {showInvoiceMenu && (
                <SidebarLinkGroup
                  activeCondition={isMenuActive('invoice', pathname)}
                  menuId="invoice"
                  style={menuSlot('invoice')}
                  open={openMenu === 'invoice'}
                  handleClick={() => handleMenuClick('invoice')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${isMenuActive('invoice', pathname) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <InvoiceMenuIcon />
                        {ml("Invoice")}
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
                          {subDividers('invoice').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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
                                className={subMenuLinkClass}
                              >
                                {ml("Purchase")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'purchase.import') && (
                            <li style={subSlot('invoice', 'inv_purchase_import')}>
                              <NavLink
                                to={routes.inv_purchase_import}
                                className={subMenuLinkClass}
                              >
                                {ml("Purchase Import")}
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'sales.create') && (
                            <li style={subSlot('invoice', 'invoice/sales')}>
                              <NavLink
                                to="/invoice/sales"
                                className={subMenuLinkClass}
                              >
                                {ml("Sales")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'sales.import') && (
                            <li style={subSlot('invoice', 'inv_sales_import')}>
                              <NavLink
                                to={routes.inv_sales_import}
                                className={subMenuLinkClass}
                              >
                                {ml("Sales Import")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'purchase.return.view') && (
                            <li style={subSlot('invoice', 'inv_purchase_return')}>
                              <NavLink
                                to={routes.inv_purchase_return}
                                className={subMenuLinkClass}
                              >
                                {ml("Purchase Return")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'sales.return') && (
                            <li style={subSlot('invoice', 'inv_sales_return')}>
                              <NavLink
                                to={routes.inv_sales_return}
                                className={subMenuLinkClass}
                              >
                                {ml("Sales Return")}
                              </NavLink>
                            </li>
                          )}
                          {deductStockOnDelivery && hasPermission(permissions, 'delivery.view') && (
                            <li style={subSlot('invoice', 'inv_delivery')}>
                              <NavLink
                                to={routes.inv_delivery}
                                className={subMenuLinkClass}
                              >
                                {ml("Delivery")}
                              </NavLink>
                            </li>
                          )}


                          {hasPermission(permissions, 'labour.invoice.create') && (
                            <li style={subSlot('invoice', 'invoice/labour-invoice')}>
                              <NavLink
                                to="/invoice/labour-invoice"
                                className={subMenuLinkClass}
                              >
                                {ml("Labour Invoice")}
                              </NavLink>
                            </li>
                          )}

                          {showTradingCombined && hasPermission(permissions, 'trading.combined.create') && (
                              <li style={subSlot('invoice', 'inv_trading_combined')}>
                                <NavLink
                                  to={routes.inv_trading_combined}
                                  className={subMenuLinkClass}
                                >
                                  {ml("Combined Invoice")}
                                </NavLink>
                              </li>
                            )}
                          {/* The same screen for a Tiles and Sanitary branch, whose
                              two money boxes replace Trading's single amount. By
                              the branch flag, not the system id: a tiles branch
                              runs Trading's inventory system row. */}
                          {showTilesCombined && hasPermission(permissions, 'tiles.combined.create') && (
                              <li style={subSlot('invoice', 'inv_tiles_combined')}>
                                <NavLink
                                  to={routes.inv_tiles_combined}
                                  className={subMenuLinkClass}
                                >
                                  {ml("Combined Invoice")}
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
                // Every screen in the group has a key of its own (2026-11-11),
                // and any one of them opens the group.
                hasPermission(permissions, 'branch.issue.list.view') ||
                hasPermission(permissions, 'branch.received.list.view') ||
                hasPermission(permissions, 'branch.transfer.create') ||
                hasPermission(permissions, 'branch.received.report.view') ||
                hasPermission(permissions, 'branch.stock.view') ||
                hasPermission(permissions, 'material.issue.create') ||
                // Product Out hangs off this group, so whoever is granted any
                // one of its screens and nothing else still has to be able to
                // open the group they live in.
                hasPermission(permissions, 'product.out.create') ||
                hasPermission(permissions, 'product.out.report.view') ||
                hasPermission(permissions, 'product.out.approve') ||
                hasPermission(permissions, 'product.out.reason.manage') ||
                // Product In hangs off the same group, so the same rule: any
                // one of its screens is enough to open the group they live in.
                hasPermission(permissions, 'product.in.create') ||
                hasPermission(permissions, 'product.in.report.view') ||
                hasPermission(permissions, 'product.in.approve') ||
                hasPermission(permissions, 'product.in.reason.manage')) && (
                <SidebarLinkGroup
                  activeCondition={isMenuActive('branch-transfer', pathname)}
                  menuId="branch-transfer"
                  style={menuSlot('branch-transfer')}
                  open={openMenu === 'branch-transfer'}
                  handleClick={() => handleMenuClick('branch-transfer')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${isMenuActive('branch-transfer', pathname) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded ? handleClick() : setSidebarExpanded(true);
                        }}
                      >
                        <BranchTransferMenuIcon />
                        {ml("Branch Transfer")}
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
                              data-divider={entry.dataKey}
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
                          {tabsFor(BT_TRANSFER_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('branch-transfer', 'branch_transfer')}>
                              <NavLink
                                to={tabsFor(sortTabs(BT_TRANSFER_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(BT_TRANSFER_TABS, pathname) })}
                              >
                                {ml("Transfer")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(BT_REPORT_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('branch-transfer', 'report_branch_transfer')}>
                              <NavLink
                                to={tabsFor(sortTabs(BT_REPORT_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(BT_REPORT_TABS, pathname) })}
                              >
                                {ml("Transfer Reports")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(BT_PRODUCT_OUT_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('branch-transfer', 'material_issue')}>
                              <NavLink
                                to={tabsFor(sortTabs(BT_PRODUCT_OUT_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(BT_PRODUCT_OUT_TABS, pathname) })}
                              >
                                {ml("Product Out")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(BT_PRODUCT_IN_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('branch-transfer', 'product_in')}>
                              <NavLink
                                to={tabsFor(sortTabs(BT_PRODUCT_IN_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(BT_PRODUCT_IN_TABS, pathname) })}
                              >
                                {ml("Product In")}
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
                  activeCondition={isMenuActive('reports', pathname)}
                  menuId="reports"
                  style={menuSlot('reports')}
                  open={openMenu === 'reports'}
                  handleClick={() => handleMenuClick('reports')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${isMenuActive('reports', pathname) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <ReportsMenuIcon />
                        {ml("Reports")}
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
                          {subDividers('reports').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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
                          {tabsFor(REPORT_CASH_BANK_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('reports', 'reports/cashbook')}>
                              <NavLink
                                to={tabsFor(sortTabs(REPORT_CASH_BANK_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(REPORT_CASH_BANK_TABS, pathname) })}
                              >
                                {ml("Cash & Bank")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(REPORT_INSTALLMENT_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('reports', 'reports/due-installments')}>
                              <NavLink
                                to={tabsFor(sortTabs(REPORT_INSTALLMENT_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(REPORT_INSTALLMENT_TABS, pathname) })}
                              >
                                {ml("Installment & Somity")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(REPORT_LEDGER_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('reports', 'reports/ledger')}>
                              <NavLink
                                to={tabsFor(sortTabs(REPORT_LEDGER_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(REPORT_LEDGER_TABS, pathname) })}
                              >
                                {ml("Ledger & Due")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(REPORT_STOCK_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('reports', 'reports/product/stock')}>
                              <NavLink
                                to={tabsFor(sortTabs(REPORT_STOCK_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(REPORT_STOCK_TABS, pathname) })}
                              >
                                {ml("Stock")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(REPORT_SALES_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('reports', 'reports/purchase-ledger')}>
                              <NavLink
                                to={tabsFor(sortTabs(REPORT_SALES_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(REPORT_SALES_TABS, pathname) })}
                              >
                                {ml("Purchase & Sales")}
                              </NavLink>
                            </li>
                          )}
                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}

              {/* Financial Statement. The statements that used to sit under a
                  heading at the foot of Reports. They are their own subject --
                  what the books earned, what they hold and what they owe -- and
                  a reader who may see one of them should not have to open the
                  transaction reports to find it. */}
              {hasMenuPermission(permissions, 'financial_statement') && (
                <SidebarLinkGroup
                  activeCondition={isMenuActive('financial_statement', pathname)}
                  menuId="financial_statement"
                  style={menuSlot('financial_statement')}
                  open={openMenu === 'financial_statement'}
                  handleClick={() => handleMenuClick('financial_statement')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${isMenuActive('financial_statement', pathname) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <FiPieChart />
                        {ml("Financial Statement")}
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
                          {subDividers('financial_statement').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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
                          {tabsFor(FIN_PROFIT_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('financial_statement', 'product_profit_loss')}>
                              <NavLink
                                to={tabsFor(sortTabs(FIN_PROFIT_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(FIN_PROFIT_TABS, pathname) })}
                              >
                                {ml("Profit Analysis")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(FIN_PERIODIC_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('financial_statement', 'profit_loss_date_wise')}>
                              <NavLink
                                to={tabsFor(sortTabs(FIN_PERIODIC_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(FIN_PERIODIC_TABS, pathname) })}
                              >
                                {ml("Periodic Statements")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(FIN_TRIAL_BALANCE_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('financial_statement', 'trial_balance_level4')}>
                              <NavLink
                                to={tabsFor(sortTabs(FIN_TRIAL_BALANCE_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(FIN_TRIAL_BALANCE_TABS, pathname) })}
                              >
                                {ml("Trial Balance")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(FIN_FINAL_ACCOUNTS_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('financial_statement', 'profit_loss')}>
                              <NavLink
                                to={tabsFor(sortTabs(FIN_FINAL_ACCOUNTS_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(FIN_FINAL_ACCOUNTS_TABS, pathname) })}
                              >
                                {ml("Final Accounts")}
                              </NavLink>
                            </li>
                          )}
                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}

              {/*
                Old Software.

                The archive of the Old ERP the client migrated off. A group
                of its own rather than a corner of Reports because it is not this
                software's own bookkeeping at all -- it is somebody else's
                records, kept so a customer asking "what did I take in 2022" can
                still be answered. Nothing on the screen edits, deletes or posts
                anything.

                Shows for whoever holds legacy.record.view, which is its own key
                rather than an accounts one: looking an old bill up at the
                counter should not require the rights to write vouchers.
              */}
              {hasMenuPermission(permissions, 'legacy') && (
                <SidebarLinkGroup
                  activeCondition={isMenuActive('legacy', pathname)}
                  menuId="legacy"
                  style={menuSlot('legacy')}
                  open={openMenu === 'legacy'}
                  handleClick={() => handleMenuClick('legacy')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${isMenuActive('legacy', pathname) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <FiArchive />
                        {ml("Old Software")}
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
                          {subDividers('legacy').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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

                          {/* Each old system on its own key. A shop that only
                              ever ran one of them holds only that permission
                              and sees only that line. */}
                          {hasPermission(permissions, 'legacy.record.view') && (
                            <li style={subSlot('legacy', 'legacy/records')}>
                              <NavLink to={routes.legacy_record} className={subMenuLinkClass}>
                                {ml("Old ERP Record 1")}
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'legacy.old.record.view') && (
                            <li style={subSlot('legacy', 'legacy/old-records')}>
                              <NavLink to={routes.legacy_old_record} className={subMenuLinkClass}>
                                {ml("Old ERP Record 2")}
                              </NavLink>
                            </li>
                          )}

                          {/* The old shop's own cash and bank accounts. Same
                              key as the record above -- same archive, same old
                              system -- and read-only like it. */}
                          {hasPermission(permissions, 'legacy.accounts.view') && (
                            <li style={subSlot('legacy', 'legacy/accounts')}>
                              <NavLink to={routes.legacy_accounts} className={subMenuLinkClass}>
                                {ml("Old ERP Account")}
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
                  activeCondition={isMenuActive('product_tracking', pathname)}
                  menuId="product_tracking"
                  style={menuSlot('product_tracking')}
                  open={openMenu === 'product_tracking'}
                  handleClick={() => handleMenuClick('product_tracking')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${isMenuActive('product_tracking', pathname) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <ProductTrackingMenuIcon />
                        {ml("Product Tracking")}
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
                          {subDividers('product_tracking').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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
                                className={subMenuLinkClass}
                              >
                                {ml("Tracking")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'product.tracking.report.view') && (
                            <li style={subSlot('product_tracking', 'product_financial_statement')}>
                              <NavLink
                                to={routes.product_financial_statement}
                                className={subMenuLinkClass}
                              >
                                {ml("Statement")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'product.tracking.summary.view') && (
                            <li style={subSlot('product_tracking', 'product_tracking_summary')}>
                              <NavLink
                                to={routes.product_tracking_summary}
                                className={subMenuLinkClass}
                              >
                                {ml("Receivable & Payable")}
                              </NavLink>
                            </li>
                          )}
                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}

              {/* Company Scheme: what each brand still owes, IMEI by IMEI,
                  and the brand's payments against it. */}
              {hasMenuPermission(permissions, 'company_scheme') && (
                <SidebarLinkGroup
                  activeCondition={isMenuActive('company_scheme', pathname)}
                  menuId="company_scheme"
                  style={menuSlot('company_scheme')}
                  open={openMenu === 'company_scheme'}
                  handleClick={() => handleMenuClick('company_scheme')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${isMenuActive('company_scheme', pathname) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <CompanySchemeMenuIcon />
                        {ml("Company Scheme")}
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
                          {subDividers('company_scheme').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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
                          {hasPermission(permissions, 'company.scheme.view') && (
                            <li style={subSlot('company_scheme', 'company_scheme_receivable')}>
                              <NavLink
                                to={routes.company_scheme_receivable}
                                className={subMenuLinkClass}
                              >
                                {ml("Receivable")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'company.scheme.receipts.view') && (
                            <li style={subSlot('company_scheme', 'company_scheme_receipts')}>
                              <NavLink
                                to={routes.company_scheme_receipts}
                                className={subMenuLinkClass}
                              >
                                {ml("Receipts")}
                              </NavLink>
                            </li>
                          )}
                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}

              {/* Production (Manufacturing). Two doors, both must be open: the
                  user holds one of the Production keys, AND the branch has its
                  Manufacture switch on. The switch is what keeps the whole
                  feature out of the way on every ordinary branch -- the
                  permission alone would put it in front of an owner who granted
                  it everywhere. */}
              {hasMenuPermission(permissions, 'production') &&
                Number(settings?.data?.branch?.manufactur_control) === 1 && (
                <SidebarLinkGroup
                  activeCondition={isMenuActive('production', pathname)}
                  menuId="production"
                  style={menuSlot('production')}
                  open={openMenu === 'production'}
                  handleClick={() => handleMenuClick('production')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${isMenuActive('production', pathname) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                          }`}

                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <FiTool />
                        {ml("Production")}
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
                          {hasPermission(permissions, 'production.create') && (
                            <li style={subSlot('production', 'production_entry')}>
                              <NavLink
                                to={routes.production_entry}
                                className={subMenuLinkClass}
                              >
                                {ml("Production Entry")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'production.create') && (
                            <li style={subSlot('production', 'production_sales')}>
                              <NavLink
                                to={routes.production_sales}
                                className={subMenuLinkClass}
                              >
                                {ml("Sales")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'production.create') && (
                            <li style={subSlot('production', 'production_purchase')}>
                              <NavLink
                                to={routes.production_purchase}
                                className={subMenuLinkClass}
                              >
                                {ml("Purchase")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'production.sales.return.create') && (
                            <li style={subSlot('production', 'production_sales_return')}>
                              <NavLink
                                to={routes.production_sales_return}
                                className={subMenuLinkClass}
                              >
                                {ml("Sales Return")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'production.create') && (
                            <li style={subSlot('production', 'production_scheme')}>
                              <NavLink
                                to={routes.production_scheme}
                                className={subMenuLinkClass}
                              >
                                {ml("Scheme")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'production.view') && (
                            <li style={subSlot('production', 'production_recipe')}>
                              <NavLink
                                to={routes.production_recipe}
                                className={subMenuLinkClass}
                              >
                                {ml("Recipe")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'production.report.view') && (
                            <li style={subSlot('production', 'production_register')}>
                              <NavLink
                                to={routes.production_register}
                                className={subMenuLinkClass}
                              >
                                {ml("Register")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'production.report.view') && (
                            <li style={subSlot('production', 'production_free_goods')}>
                              <NavLink
                                to={routes.production_free_goods}
                                className={subMenuLinkClass}
                              >
                                {ml("Free Goods")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'production.report.view') && (
                            <li style={subSlot('production', 'production_expiry')}>
                              <NavLink
                                to={routes.production_expiry}
                                className={subMenuLinkClass}
                              >
                                {ml("Near Expiry")}
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
                  activeCondition={isMenuActive('requisition', pathname)}
                  menuId="requisition"
                  style={menuSlot('requisition')}
                  open={openMenu === 'requisition'}
                  handleClick={() => handleMenuClick('requisition')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${isMenuActive('requisition', pathname) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                          }`}

                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <RequisitionMenuIcon />
                        {ml("Requisition")}
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
                          {subDividers('requisition').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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
                                className={subMenuLinkClass}
                              >
                                {ml("Requisitions")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'requisition.create') && (
                            <li style={subSlot('requisition', 'requisition_create')}>
                              <NavLink
                                to={routes.requisition_create}
                                className={subMenuLinkClass}
                              >
                                {ml("Create")}
                              </NavLink>
                            </li>
                          )}
                          {hasPermission(permissions, 'requisition.comparison') && (
                            <li style={subSlot('requisition', 'requisition_comparison')}>
                              <NavLink
                                to={routes.requisition_comparison}
                                className={subMenuLinkClass}
                              >
                                {ml("Comparison")}
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
                    activeCondition={isMenuActive('real-estate', pathname)}
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
                        ${isMenuActive('real-estate', pathname) &&
                            'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                            }`}
                          onClick={(e) => {
                            e.preventDefault();
                            sidebarExpanded
                              ? handleClick()
                              : setSidebarExpanded(true);
                          }}
                        >
                          <FiMapPin />
                          {ml("Real Estate")}
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
                          {subDividers('real-estate').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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

                            {tabsFor(RE_SETUP_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                              <li style={subSlot('real-estate', 'real-estate/area-list')}>
                                <NavLink
                                  to={tabsFor(sortTabs(RE_SETUP_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                  className={() => subMenuLinkClass({ isActive: inTabGroup(RE_SETUP_TABS, pathname) })}
                                >
                                  {ml("Setup")}
                                </NavLink>
                              </li>
                            )}
                            {tabsFor(RE_SALES_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                              <li style={subSlot('real-estate', 'real-estate/unit-sales')}>
                                <NavLink
                                  to={tabsFor(sortTabs(RE_SALES_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                  className={() => subMenuLinkClass({ isActive: inTabGroup(RE_SALES_TABS, pathname) })}
                                >
                                  {ml("Sales")}
                                </NavLink>
                              </li>
                            )}
                            {tabsFor(RE_PROJECT_ENTRY_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                              <li style={subSlot('real-estate', 'real_estate_project_expense')}>
                                <NavLink
                                  to={tabsFor(sortTabs(RE_PROJECT_ENTRY_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                  className={() => subMenuLinkClass({ isActive: inTabGroup(RE_PROJECT_ENTRY_TABS, pathname) })}
                                >
                                  {ml("Project Entry")}
                                </NavLink>
                              </li>
                            )}
                            {tabsFor(RE_PROJECT_REPORT_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                              <li style={subSlot('real-estate', 'real_estate_project_summary_report')}>
                                <NavLink
                                  to={tabsFor(sortTabs(RE_PROJECT_REPORT_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                  className={() => subMenuLinkClass({ isActive: inTabGroup(RE_PROJECT_REPORT_TABS, pathname) })}
                                >
                                  {ml("Project Reports")}
                                </NavLink>
                              </li>
                            )}

                          </ul>
                        </div>
                      </React.Fragment>
                    )}
                  </SidebarLinkGroup>
                )}


              {/*
                Fixed assets.

                Gated on permission alone, like Hotel below and for the same
                reason: a business type read from an auto-increment id is 9 in
                one tenant's database and 11 in another's. The three asset
                permissions are granted to nobody when the patch creates them,
                which draws the same line and cannot drift between installs.

                Two entries: the categories and the register, which share a
                screen, and the purchase form that fills the register. It is a
                group rather than a bare link because depreciation and the
                schedule join it here too.
              */}
              {hasMenuPermission(permissions, 'asset') && (
                <SidebarLinkGroup
                  activeCondition={isMenuActive('asset', pathname)}
                  menuId="asset"
                  style={menuSlot('asset')}
                  open={openMenu === 'asset'}
                  handleClick={() => handleMenuClick('asset')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4
                          ${isMenuActive('asset', pathname) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded ? handleClick() : setSidebarExpanded(true);
                        }}
                      >
                        <AssetsMenuIcon />
                        {ml("Assets")}
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
                          {subDividers('asset').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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

                          {(hasPermission(permissions, 'asset.category.view') || hasPermission(permissions, 'asset.register.view')) && (
                          <li style={subSlot('asset', 'asset_setup')}>
                            <NavLink to={routes.asset_setup} className={subMenuLinkClass}>
                              {ml("Categories & Register")}
                            </NavLink>
                          </li>
                          )}
                        </ul>
                      </div>
                    </React.Fragment>
                  )}
                </SidebarLinkGroup>
              )}


              {/*
                Hotel.

                Gated on permission alone, and not on a business type the way
                Real Estate above is. That check reads `business_type_id == 9`,
                and the id is auto-increment: "Hotel / Motel" is 9 in one
                tenant's database and 11 in another's, so a number written here
                would open the wrong menu somewhere. The four hotel permissions
                are granted to nobody when they are created, which draws the
                same line and cannot drift between installs.

                One entry today. The availability screen, the booking form and
                check-in join it here as the module is built, which is why it is
                a group rather than a bare link.
              */}
              {hasMenuPermission(permissions, 'hotel') && (
                <SidebarLinkGroup
                  activeCondition={isMenuActive('hotel', pathname)}
                  menuId="hotel"
                  style={menuSlot('hotel')}
                  open={openMenu === 'hotel'}
                  handleClick={() => handleMenuClick('hotel')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4
                          ${isMenuActive('hotel', pathname) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded ? handleClick() : setSidebarExpanded(true);
                        }}
                      >
                        <HotelMenuIcon />
                        {ml("Hotel")}
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
                          {subDividers('hotel').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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

                          {/* Bookings first. Setup is a sitting done once;
                              this is the screen somebody opens every day. */}
                          {hasPermission(permissions, 'hotel.booking.view') && (
                          <li style={subSlot('hotel', 'hotel_bookings')}>
                            <NavLink to={routes.hotel_bookings} className={subMenuLinkClass}>
                              {ml("Bookings")}
                            </NavLink>
                          </li>
                          )}

                          {/* Halls and community centres, which are sold by the
                              part of the day rather than by the night -- a
                              different question with a different answer, so a
                              screen of its own rather than a mode on the one
                              above. */}
                          {/* <li style={subSlot('hotel', 'hotel_hall_bookings')}>
                            <NavLink to={routes.hotel_hall_bookings} className={subMenuLinkClass}>
                              Hall Booking
                            </NavLink>
                          </li> */}

                          {/* The month at a glance, and the tape chart the desk
                              reads for gaps. Beside Bookings because it answers
                              the question that screen cannot: what does next
                              week look like? */}
                          {hasPermission(permissions, 'hotel.calendar.view') && (
                          <li style={subSlot('hotel', 'hotel_calendar')}>
                            <NavLink to={routes.hotel_calendar} className={subMenuLinkClass}>
                              {ml("Calendar")}
                            </NavLink>
                          </li>
                          )}

                          {/* Opened every morning by somebody who does nothing
                              else in the system. */}
                          {hasPermission(permissions, 'hotel.housekeeping.view') && (
                          <li style={subSlot('hotel', 'hotel_housekeeping')}>
                            <NavLink to={routes.hotel_housekeeping} className={subMenuLinkClass}>
                              {ml("Housekeeping")}
                            </NavLink>
                          </li>
                          )}

                          {/* What the housekeeper and the kitchen take out of the
                              store, and what is left -- the Stock Balance of the
                              expense items bought on Accounts Transaction. Its
                              issue quantities come from the amenity kits set up
                              on the setup screen below. */}
                          {hasPermission(permissions, 'hotel.amenity.issue.view') && (
                          <li style={subSlot('hotel', 'hotel_amenity_issue')}>
                            <NavLink to={routes.hotel_amenity_issue} className={subMenuLinkClass}>
                              {ml("Amenity Issue & Stock")}
                            </NavLink>
                          </li>
                          )}

                          {/* Who was in the building, and what came in. Above
                              setup for the same reason Bookings is: setup is a
                              sitting done once, and these are read daily. */}
                          {hasPermission(permissions, 'hotel.report.view') && (
                          <li style={subSlot('hotel', 'hotel_reports')}>
                            <NavLink to={routes.hotel_reports} className={subMenuLinkClass}>
                              {ml("Reports")}
                            </NavLink>
                          </li>
                          )}

                          {/* Ended stays that still owe -- the list to work down. */}
                          {hasPermission(permissions, 'hotel.booking.due.view') && (
                          <li style={subSlot('hotel', 'hotel_booking_due')}>
                            <NavLink to={routes.hotel_booking_due} className={subMenuLinkClass}>
                              {ml("Booking-wise Due")}
                            </NavLink>
                          </li>
                          )}

                          {(hasPermission(permissions, 'hotel.building.view') || hasPermission(permissions, 'hotel.floor.view') || hasPermission(permissions, 'hotel.room.type.view') || hasPermission(permissions, 'hotel.resource.view')) && (
                          <li style={subSlot('hotel', 'hotel_setup')}>
                            <NavLink to={routes.hotel_setup} className={subMenuLinkClass}>
                              {ml("Rooms & Seats Setup")}
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
                  activeCondition={isMenuActive('products', pathname)}
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
                          ${isMenuActive('products', pathname) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <ProductsMenuIcon />
                        {ml("Products")}
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
                          {subDividers('products').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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

                          {tabsFor(CLASSIFICATION_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('products', 'category/category-list')}>
                              <NavLink
                                to={tabsFor(sortTabs(CLASSIFICATION_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(CLASSIFICATION_TABS, pathname) })}
                              >
                                {ml("Classification")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(PRODUCT_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('products', 'product/product-list')}>
                              <NavLink
                                to={tabsFor(sortTabs(PRODUCT_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(PRODUCT_TABS, pathname) })}
                              >
                                {ml("Products")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(STOCK_ALERT_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('products', 'product_low_stock')}>
                              <NavLink
                                to={tabsFor(sortTabs(STOCK_ALERT_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(STOCK_ALERT_TABS, pathname) })}
                              >
                                {ml("Stock Alerts")}
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
                  activeCondition={isMenuActive('labour_items', pathname)}
                  menuId="labour_items"
                  style={menuSlot('labour_items')}
                  open={openMenu === 'labour_items'}
                  handleClick={() => handleMenuClick('labour_items')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${pathname.includes('/labour-items') && 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'}`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded ? handleClick() : setSidebarExpanded(true);
                        }}
                      >
                        <LabourItemsMenuIcon />
                        {ml("Labour Items")}
                        <FiChevronRight
                          className={`absolute right-4 top-1/2 -translate-y-1/2 transition-transform duration-200 ${open ? 'rotate-90' : ''
                            }`}
                        />
                      </NavLink>

                      <div
                        className={`translate transform overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-180' : 'max-h-0'}`}
                      >
                        <ul className="mt-2 mb-5.5 flex flex-col gap-2.5 pl-6">
                          {subDividers('labour_items').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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
                                className={subMenuLinkClass}
                              >
                                {ml("Category")}
                              </NavLink>
                            </li>
                          )}

                          {hasPermission(permissions, 'labour.item.view') && (
                            <li style={subSlot('labour_items', 'labour_item')}>
                              <NavLink
                                to={routes.labour_item}
                                className={subMenuLinkClass}
                              >
                                {ml("Item")}
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
                  activeCondition={isMenuActive('admin', pathname)}
                  menuId="admin"
                  style={menuSlot('admin')}
                  open={openMenu === 'admin'}
                  handleClick={() => handleMenuClick('admin')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${isMenuActive('admin', pathname) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <AdminMenuIcon />
                        {ml("Admin")}
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
                          {subDividers('admin').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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

                          {tabsFor(COMPANY_BRANCH_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('admin', 'company_list')}>
                              <NavLink
                                to={tabsFor(sortTabs(COMPANY_BRANCH_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(COMPANY_BRANCH_TABS, pathname) })}
                              >
                                {ml("Company & Branch")}
                              </NavLink>
                            </li>
                          )}

                          {tabsFor(ADMIN_SETTINGS_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('admin', 'menu_arrangement')}>
                              <NavLink
                                to={tabsFor(sortTabs(ADMIN_SETTINGS_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(ADMIN_SETTINGS_TABS, pathname) })}
                              >
                                {ml("Settings")}
                              </NavLink>
                            </li>
                          )}

                          {tabsFor(USER_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('admin', 'user_list')}>
                              <NavLink
                                to={tabsFor(sortTabs(USER_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(USER_TABS, pathname) })}
                              >
                                {ml("Users")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(PLATFORM_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('admin', 'reseller_admin')}>
                              <NavLink
                                to={tabsFor(sortTabs(PLATFORM_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(PLATFORM_TABS, pathname) })}
                              >
                                {ml("Platform")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(ROLE_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('admin', 'roles')}>
                              <NavLink
                                to={tabsFor(sortTabs(ROLE_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(ROLE_TABS, pathname) })}
                              >
                                {ml("Roles & Permissions")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(DAILY_CONTROL_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('admin', 'admin/dayclose')}>
                              <NavLink
                                to={tabsFor(sortTabs(DAILY_CONTROL_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(DAILY_CONTROL_TABS, pathname) })}
                              >
                                {ml("Daily Control")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(ORDER_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('admin', 'order/order-list')}>
                              <NavLink
                                to={tabsFor(sortTabs(ORDER_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(ORDER_TABS, pathname) })}
                              >
                                {ml("Orders")}
                              </NavLink>
                            </li>
                          )}
                          {/* order.avg.price */}
                          {/* voucher.approval */}
                          {/* remove.approval */}


                          {/* voucher.photo.upload */}
                          {tabsFor(UPLOAD_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('admin', 'admin/image-upload')}>
                              <NavLink
                                to={tabsFor(sortTabs(UPLOAD_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(UPLOAD_TABS, pathname) })}
                              >
                                {ml("Uploads")}
                              </NavLink>
                            </li>
                          )}
                          {/* bulk.photo.upload */}

                          {tabsFor(SMS_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('admin', 'sms_send')}>
                              <NavLink
                                to={tabsFor(sortTabs(SMS_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(SMS_TABS, pathname) })}
                              >
                                {ml("SMS")}
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
                  activeCondition={isMenuActive('vr_settings', pathname)}
                  menuId="vr_settings"
                  style={menuSlot('vr_settings')}
                  open={openMenu === 'vr_settings'}
                  handleClick={() => handleMenuClick('vr_settings')}
                >

                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${isMenuActive('vr_settings', pathname) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <VrSettingsMenuIcon />
                        {ml("VR Settings")}
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
                          {subDividers('vr_settings').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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

                          {tabsFor(VR_CORRECTION_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('vr_settings', 'admin_change_date')}>
                              <NavLink
                                to={tabsFor(sortTabs(VR_CORRECTION_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(VR_CORRECTION_TABS, pathname) })}
                              >
                                {ml("Corrections")}
                              </NavLink>
                            </li>
                          )}


                          {tabsFor(VR_AUDIT_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('vr_settings', 'voucher_history')}>
                              <NavLink
                                to={tabsFor(sortTabs(VR_AUDIT_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(VR_AUDIT_TABS, pathname) })}
                              >
                                {ml("Audit")}
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
                  activeCondition={isMenuActive('hrm', pathname)}
                  menuId="hrm"
                  style={menuSlot('hrm')}
                  open={openMenu === 'hrm'}
                  handleClick={() => handleMenuClick('hrm')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${isMenuActive('hrm', pathname) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded ? handleClick() : setSidebarExpanded(true);
                        }}
                      >
                        <HrmMenuIcon />
                        {ml("HRM")}
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
                          {subDividers('hrm').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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
                                className={subMenuLinkClass}
                              >
                                {ml("Employees")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(DESIGNATION_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('hrm', 'hrms_designation_list')}>
                              <NavLink
                                to={tabsFor(sortTabs(DESIGNATION_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(DESIGNATION_TABS, pathname) })}
                              >
                                {ml("Structure")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(ATTENDANCE_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('hrm', 'hrms_attendance_entries')}>
                              <NavLink
                                to={tabsFor(sortTabs(ATTENDANCE_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(ATTENDANCE_TABS, pathname) })}
                              >
                                {ml("Attendance")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(ATTENDANCE_REPORT_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('hrm', 'hrms_attendance_report')}>
                              <NavLink
                                to={tabsFor(sortTabs(ATTENDANCE_REPORT_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(ATTENDANCE_REPORT_TABS, pathname) })}
                              >
                                {ml("Attendance Reports")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(ATTENDANCE_SETTINGS_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('hrm', 'hrms_attendance_setup')}>
                              <NavLink
                                to={tabsFor(sortTabs(ATTENDANCE_SETTINGS_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(ATTENDANCE_SETTINGS_TABS, pathname) })}
                              >
                                {ml("Attendance Settings")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(SALARY_SETUP_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('hrm', 'hrms_salary_component_list')}>
                              <NavLink
                                to={tabsFor(sortTabs(SALARY_SETUP_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(SALARY_SETUP_TABS, pathname) })}
                              >
                                {ml("Salary Setup")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(SALARY_GENERATE_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('hrm', 'hrms/salary/salary-generate')}>
                              <NavLink
                                to={tabsFor(sortTabs(SALARY_GENERATE_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(SALARY_GENERATE_TABS, pathname) })}
                              >
                                {ml("Salary & Bonus Generate")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(LOAN_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('hrm', 'employee_loan_balance')}>
                              <NavLink
                                to={tabsFor(sortTabs(LOAN_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(LOAN_TABS, pathname) })}
                              >
                                {ml("Loan")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(SALARY_REPORT_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('hrm', 'hrms/salary-sheet')}>
                              <NavLink
                                to={tabsFor(sortTabs(SALARY_REPORT_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(SALARY_REPORT_TABS, pathname) })}
                              >
                                {ml("Salary Reports")}
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
                    activeCondition={isMenuActive('customer-supplier', pathname)}
                    menuId="customer-supplier"
                  style={menuSlot('customer-supplier')}
                    open={openMenu === 'customer-supplier'}
                    handleClick={() => handleMenuClick('customer-supplier')}
                  >
                    {(handleClick, open) => (
                      <React.Fragment>
                        <NavLink
                          to="#"
                          className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${isMenuActive('customer-supplier', pathname) &&
                            'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                            }`}
                          onClick={(e) => {
                            e.preventDefault();
                            sidebarExpanded
                              ? handleClick()
                              : setSidebarExpanded(true);
                          }}
                        >
                          <FiUsers />
                          {ml("Customers")}
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
                          {subDividers('customer-supplier').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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
                          {tabsFor(PARTY_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('customer-supplier', 'customer-supplier/list')}>
                              <NavLink
                                to={tabsFor(sortTabs(PARTY_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(PARTY_TABS, pathname) })}
                              >
                                {ml("Customers")}
                              </NavLink>
                            </li>
                          )}
                          {tabsFor(COA_TABS, permissions, isPlatformAdmin, currentBranch?.business_type_id).length > 0 && (
                            <li style={subSlot('customer-supplier', 'coal1/coal1-list')}>
                              <NavLink
                                to={tabsFor(sortTabs(COA_TABS), permissions, isPlatformAdmin, currentBranch?.business_type_id)[0].path}
                                className={() => subMenuLinkClass({ isActive: inTabGroup(COA_TABS, pathname) })}
                              >
                                {ml("Chart of Accounts")}
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
                  activeCondition={isMenuActive('al-charts', pathname)}
                  menuId="al-charts"
                  style={menuSlot('al-charts')}
                  open={openMenu === 'al-charts'}
                  handleClick={() => handleMenuClick('al-charts')}
                >
                  {(handleClick, open) => (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${isMenuActive('al-charts', pathname) &&
                          'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? handleClick()
                            : setSidebarExpanded(true);
                        }}
                      >
                        <FiBarChart2 />
                        {ml("Analytics")}
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
                          {subDividers('al-charts').map((entry) => (
                            <li
                              key={entry.id}
                              style={entry.style}
                              data-divider={entry.dataKey}
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
                                className={subMenuLinkClass}
                              >
                                {ml("Comparison")}
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
                      'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                      }`}
                  >
                    <FiUser />
                    {ml("Customer Dashboard")}
                  </NavLink>
                </li>
              )}

              {/* Help. Its own key, help.view (2026-11-11), seeded onto every
                  role by the patch so nobody lost it the day it shipped. */}
              {hasPermission(permissions, 'help.view') && (
              <li style={menuSlot('help')}>
                <NavLink
                  to={routes.help}
                  className={`group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium dark:text-bodydark1 duration-300 ease-in-out hover:bg-gray-300 dark:hover:bg-meta-4 ${pathname === routes.help &&
                    'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-[rgb(var(--c-text))] border-l-4 border-blue-500'
                    }`}
                >
                  <FiHelpCircle />
                  {ml("Help")}
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
