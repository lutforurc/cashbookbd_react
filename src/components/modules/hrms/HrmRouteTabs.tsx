import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import routes from '../../services/appRoutes';
import { hasPermission } from '../../utils/permissionChecker';

// HRM screens grouped into one menu, a tab per screen. Each tab is its own
// route, so bookmarks, Global Search, help and tutorial links keep working; a
// tab the user may not open is not drawn.
// `forms`: the tab's New/Edit pages live under its path and light the menu too.
type RouteTab = { label: string; path: string; permission: string; also?: string[]; forms?: boolean };

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

export const tabsFor = (tabs: RouteTab[], permissions: any) =>
  tabs.filter((tab) => hasPermission(permissions, tab.permission));

const onTab = (tab: RouteTab, pathname: string) =>
  [tab.path, ...(tab.also ?? [])].includes(pathname) || (!!tab.forms && pathname.startsWith(tab.path + '/'));

// For the sidebar: is the current page one of this group's (or a form under it)?
export const inTabGroup = (tabs: RouteTab[], pathname: string) => tabs.some((tab) => onTab(tab, pathname));

const HrmRouteTabs = ({ tabs }: { tabs: RouteTab[] }) => {
  const { pathname } = useLocation();
  const permissions = useSelector((s: any) => s.settings?.data?.permissions ?? []);

  return (
    <>
      <nav className="mb-3 flex flex-wrap gap-1 border-b border-[rgb(var(--c-border))] print:hidden">
        {tabsFor(tabs, permissions).map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              onTab(tab, pathname)
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400'
            }`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  );
};

export default HrmRouteTabs;
