import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiRotateCcw } from 'react-icons/fi';
import { hasPermission } from '../permissionChecker';
import { API_USER_DASHBOARD_PREFERENCES_URL } from '../../services/apiRoutes';
import httpService from '../../services/httpService';
import { useTabLabel } from '../../../i18n/tabLabel';

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

/*
 * Each user's own tab order. One flat list of tab paths (paths are unique across
 * the app) for every group, kept on the server through the same preferences
 * endpoint Arrange Menu uses, so it follows the user between machines;
 * localStorage holds a copy so the first paint is already in their order.
 * A tab the list has never seen keeps its declared place after the ones that
 * were arranged, so a tab added in a later release lands at the end.
 */
const STORE = 'route-tabs-order';
const DASHBOARD = 'route-tabs';
const CHANGED = 'route-tabs-order-changed';
let fetched = false; // one GET per page load, however many tab bars mount

const readOrder = (): string[] => {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORE) || '[]');
    return Array.isArray(value) ? value.filter((v) => typeof v === 'string' && v) : [];
  } catch {
    return [];
  }
};
const writeOrder = (order: string[]) => {
  try {
    window.localStorage.setItem(STORE, JSON.stringify(order));
  } catch {
    /* private mode: the server copy still holds it */
  }
  window.dispatchEvent(new Event(CHANGED));
};

export const useTabOrder = () => {
  const [order, setOrder] = useState<string[]>(readOrder);

  useEffect(() => {
    const onChanged = () => setOrder(readOrder());
    window.addEventListener(CHANGED, onChanged);
    if (!fetched) {
      fetched = true;
      httpService
        .get(API_USER_DASHBOARD_PREFERENCES_URL, { params: { dashboard: DASHBOARD } })
        .then((response) => {
          // Body is { success, data: { data: { preferences } } } on the raw axios response.
          const remote = response?.data?.data?.data?.preferences?.order;
          if (Array.isArray(remote) && JSON.stringify(remote) !== JSON.stringify(readOrder())) writeOrder(remote);
        })
        .catch(() => {
          fetched = false;
        });
    }
    return () => window.removeEventListener(CHANGED, onChanged);
  }, []);

  // The group's tabs in the user's order.
  const sort = useCallback(
    (tabs: RouteTab[]) => {
      const rank = (tab: RouteTab, i: number) => {
        const at = order.indexOf(tab.path);
        return at < 0 ? 1e6 + i : at;
      };
      return tabs.map((tab, i) => ({ tab, r: rank(tab, i) })).sort((a, b) => a.r - b.r).map((x) => x.tab);
    },
    [order],
  );

  const save = (next: string[]) => {
    writeOrder(next);
    httpService
      .post(API_USER_DASHBOARD_PREFERENCES_URL, { dashboard: DASHBOARD, preferences: { order: next, hidden: [] } })
      .catch(() => {});
  };
  const others = (tabs: RouteTab[]) => order.filter((path) => !tabs.some((tab) => tab.path === path));

  // Put `from` where `to` is, within this group only.
  const move = (tabs: RouteTab[], from: string, to: string) => {
    const paths = sort(tabs).map((tab) => tab.path);
    const a = paths.indexOf(from);
    const b = paths.indexOf(to);
    if (a < 0 || b < 0 || a === b) return;
    paths.splice(b, 0, ...paths.splice(a, 1));
    save([...others(tabs), ...paths]);
  };
  const reset = (tabs: RouteTab[]) => save(others(tabs));
  const arranged = (tabs: RouteTab[]) => tabs.some((tab) => order.includes(tab.path));

  return { sort, move, reset, arranged };
};

const RouteTabs = ({ tabs }: { tabs: RouteTab[] }) => {
  const { pathname } = useLocation();
  const permissions = useSelector((s: any) => s.settings?.data?.permissions ?? []);
  const isPlatformAdmin = useSelector((s: any) => Boolean(s.settings?.data?.is_platform_admin));
  const businessTypeId = useSelector((s: any) => s.branchList?.currentBranch?.business_type_id);
  const { sort, move, reset, arranged } = useTabOrder();
  // Tab names follow the screen's language; English reads back unchanged.
  const tl = useTabLabel();
  const [dragging, setDragging] = useState('');
  const [over, setOver] = useState('');

  return (
    <>
      {/* Active tab: a glowing pill with a short lit bar on the rule beneath.
          Drag a tab onto another to reorder; the order is the user's own. */}
      <nav className="mb-3 flex flex-wrap items-center gap-2 border-b border-[rgb(var(--c-border))] pb-1 pt-1 print:hidden">
        {tabsFor(sort(tabs), permissions, isPlatformAdmin, businessTypeId).map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            draggable
            title="Drag to reorder"
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', tab.path);
              setDragging(tab.path);
            }}
            onDragOver={(e) => {
              if (!dragging) return;
              e.preventDefault();
              setOver(tab.path);
            }}
            onDragLeave={() => setOver((current) => (current === tab.path ? '' : current))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging) move(tabs, dragging, tab.path);
              setDragging('');
              setOver('');
            }}
            onDragEnd={() => {
              setDragging('');
              setOver('');
            }}
            className={`relative whitespace-nowrap rounded-full border px-5 py-1.5 text-[15px] font-medium outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500/60 ${
              dragging === tab.path ? 'opacity-40 ' : ''
            }${over === tab.path && dragging && dragging !== tab.path ? 'ring-2 ring-blue-400/70 ' : ''}${
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
              <span aria-hidden className="invisible col-start-1 row-start-1 font-semibold">{tl(tab.label)}</span>
              <span className="col-start-1 row-start-1 text-center">{tl(tab.label)}</span>
            </span>
          </NavLink>
        ))}
        {arranged(tabs) && (
          <button
            type="button"
            onClick={() => reset(tabs)}
            title="Put these tabs back in their original order"
            className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs text-slate-500 hover:bg-slate-500/10 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300"
          >
            <FiRotateCcw /> Reset order
          </button>
        )}
      </nav>
      <Outlet />
    </>
  );
};

export default RouteTabs;
