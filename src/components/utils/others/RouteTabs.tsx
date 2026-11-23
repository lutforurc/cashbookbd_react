import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { hasPermission } from '../permissionChecker';

// One menu's screens as tabs on one page; the groups live in services/tabGroups.
// A tab the user may not open is not drawn.
// `forms`: the tab's New/Edit pages live under its path and light the menu too.
// `platformOnly`: shown only to the platform admin (server verdict), whatever the permission says.
// `businessType`: shown only when the current branch is of that business_type_id.
export type RouteTab = {
  label: string; path: string; permission: string; also?: string[]; forms?: boolean; platformOnly?: boolean; businessType?: number;
};

export const tabsFor = (tabs: RouteTab[], permissions: any, isPlatformAdmin = false, businessTypeId?: any) =>
  tabs.filter(
    (tab) =>
      hasPermission(permissions, tab.permission) &&
      (!tab.platformOnly || isPlatformAdmin) &&
      (tab.businessType === undefined || Number(businessTypeId) === tab.businessType),
  );

const onTab = (tab: RouteTab, pathname: string) =>
  [tab.path, ...(tab.also ?? [])].includes(pathname) || (!!tab.forms && pathname.startsWith(tab.path + '/'));

// For the sidebar: is the current page one of this group's (or a form under it)?
export const inTabGroup = (tabs: RouteTab[], pathname: string) => tabs.some((tab) => onTab(tab, pathname));

const RouteTabs = ({ tabs }: { tabs: RouteTab[] }) => {
  const { pathname } = useLocation();
  const permissions = useSelector((s: any) => s.settings?.data?.permissions ?? []);
  const isPlatformAdmin = useSelector((s: any) => Boolean(s.settings?.data?.is_platform_admin));
  const businessTypeId = useSelector((s: any) => s.branchList?.currentBranch?.business_type_id);

  return (
    <>
      {/* Active tab: a glowing pill with a short lit bar on the rule beneath. */}
      <nav className="mb-3 flex flex-wrap items-center gap-2 border-b border-[rgb(var(--c-border))] pb-1 pt-1 print:hidden">
        {tabsFor(tabs, permissions, isPlatformAdmin, businessTypeId).map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={`relative whitespace-nowrap rounded-full border px-5 py-1.5 text-[15px] font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/60 ${
              onTab(tab, pathname)
                ? // Soft gradient fill, a gentler glow by day, a fuller one at night, and a lit
                  // bar that fades out at both ends.
                  'border-blue-500/80 bg-linear-to-b from-blue-500/20 to-blue-500/5 font-semibold text-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.35)] dark:border-blue-400 dark:text-blue-300 dark:shadow-[0_0_18px_rgba(59,130,246,0.6),inset_0_1px_0_rgba(255,255,255,0.12)] after:absolute after:-bottom-[6px] after:left-1/2 after:h-[3px] after:w-[90%] after:-translate-x-1/2 after:rounded-full after:bg-linear-to-r after:from-transparent after:via-blue-500 after:to-transparent after:shadow-[0_0_10px_rgba(59,130,246,0.9)]'
                : 'border-transparent text-slate-600 hover:border-slate-400/30 hover:bg-slate-500/10 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-300'
            }`}
          >
            {/* An invisible bold copy holds every tab at its bold width, so turning
                bold on the active one never nudges its neighbours. */}
            <span className="grid">
              <span aria-hidden className="invisible col-start-1 row-start-1 font-semibold">{tab.label}</span>
              <span className="col-start-1 row-start-1 text-center">{tab.label}</span>
            </span>
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  );
};

export default RouteTabs;
