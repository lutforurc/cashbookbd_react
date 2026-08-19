import { useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiEye, FiEyeOff, FiSettings, FiX } from 'react-icons/fi';
import { API_USER_DASHBOARD_PREFERENCES_URL } from '../../services/apiRoutes';
import httpService from '../../services/httpService';
import { Button } from '../../../pages/UiElements/CustomButtons';

export type DashboardDensity = 'comfortable' | 'compact';

export type DashboardWidget = {
  id: string;
  title: string;
  defaultVisible?: boolean;
};

type DashboardPreferences = {
  order: string[];
  hidden: string[];
  density: DashboardDensity;
};

type DashboardCustomizationSyncOptions = {
  dashboardKey?: string;
  branchId?: number | string | null;
  enabled?: boolean;
};

const defaultPreferences: DashboardPreferences = {
  order: [],
  hidden: [],
  density: 'comfortable',
};

const normalizePreferences = (preferences: any): DashboardPreferences => ({
  order: Array.isArray(preferences?.order)
    ? preferences.order.filter((id: any) => typeof id === 'string' && id)
    : [],
  hidden: Array.isArray(preferences?.hidden)
    ? preferences.hidden.filter((id: any) => typeof id === 'string' && id)
    : [],
  density: preferences?.density === 'compact' ? 'compact' : 'comfortable',
});

const samePreferences = (
  left: DashboardPreferences,
  right: DashboardPreferences,
) => JSON.stringify(left) === JSON.stringify(right);

const readPreferences = (storageKey: string): DashboardPreferences => {
  if (typeof window === 'undefined') return { ...defaultPreferences };

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return { ...defaultPreferences };

    return normalizePreferences(JSON.parse(raw));
  } catch {
    return { ...defaultPreferences };
  }
};

export const useDashboardCustomization = (
  storageKey: string,
  widgets: DashboardWidget[],
  syncOptions: DashboardCustomizationSyncOptions = {},
) => {
  const [preferences, setPreferences] = useState<DashboardPreferences>(() =>
    readPreferences(storageKey),
  );
  const canSync =
    syncOptions.enabled !== false &&
    Boolean(syncOptions.dashboardKey) &&
    Boolean(syncOptions.branchId);
  const remoteLoadedRef = useRef(!canSync);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  }, [preferences, storageKey]);

  useEffect(() => {
    setPreferences(readPreferences(storageKey));
    remoteLoadedRef.current = !canSync;
  }, [canSync, storageKey]);

  useEffect(() => {
    if (!canSync) return;

    let active = true;

    const loadPreferences = async () => {
      try {
        const response = await httpService.get(API_USER_DASHBOARD_PREFERENCES_URL, {
          params: {
            dashboard: syncOptions.dashboardKey,
            branch_id: syncOptions.branchId,
          },
        });
        const remotePreferences = normalizePreferences(
          response?.data?.data?.data?.preferences,
        );

        if (!active) return;

        if (
          remotePreferences.order.length ||
          remotePreferences.hidden.length ||
          remotePreferences.density !== defaultPreferences.density
        ) {
          setPreferences((current) =>
            samePreferences(current, remotePreferences) ? current : remotePreferences,
          );
        }
      } catch {
        // Keep local preferences when the API is unavailable.
      } finally {
        if (active) {
          remoteLoadedRef.current = true;
        }
      }
    };

    loadPreferences();

    return () => {
      active = false;
    };
  }, [canSync, syncOptions.branchId, syncOptions.dashboardKey]);

  useEffect(() => {
    if (!canSync || !remoteLoadedRef.current) return;

    const timeoutId = window.setTimeout(() => {
      httpService
        .post(API_USER_DASHBOARD_PREFERENCES_URL, {
          dashboard: syncOptions.dashboardKey,
          branch_id: syncOptions.branchId,
          preferences,
        })
        .catch(() => {
          // Local storage still keeps the layout if the network request fails.
        });
    }, 500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [canSync, preferences, syncOptions.branchId, syncOptions.dashboardKey]);

  const orderedWidgets = useMemo(() => {
    const knownIds = new Set(widgets.map((widget) => widget.id));
    const orderedIds = [
      ...preferences.order.filter((id) => knownIds.has(id)),
      ...widgets
        .map((widget) => widget.id)
        .filter((id) => !preferences.order.includes(id)),
    ];

    return orderedIds
      .map((id) => widgets.find((widget) => widget.id === id))
      .filter((widget): widget is DashboardWidget => Boolean(widget));
  }, [preferences.order, widgets]);

  const visibleWidgets = useMemo(
    () =>
      orderedWidgets.filter(
        (widget) =>
          widget.defaultVisible !== false && !preferences.hidden.includes(widget.id),
      ),
    [orderedWidgets, preferences.hidden],
  );

  const toggleWidget = (id: string) => {
    setPreferences((current) => {
      const isHidden = current.hidden.includes(id);

      return {
        ...current,
        hidden: isHidden
          ? current.hidden.filter((hiddenId) => hiddenId !== id)
          : [...current.hidden, id],
      };
    });
  };

  const moveWidget = (id: string, direction: 'up' | 'down') => {
    setPreferences((current) => {
      const currentOrder = [
        ...current.order.filter((orderedId) =>
          widgets.some((widget) => widget.id === orderedId),
        ),
        ...widgets
          .map((widget) => widget.id)
          .filter((widgetId) => !current.order.includes(widgetId)),
      ];
      const index = currentOrder.indexOf(id);
      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (index < 0 || targetIndex < 0 || targetIndex >= currentOrder.length) {
        return current;
      }

      const nextOrder = [...currentOrder];
      [nextOrder[index], nextOrder[targetIndex]] = [
        nextOrder[targetIndex],
        nextOrder[index],
      ];

      return { ...current, order: nextOrder };
    });
  };

  const setDensity = (density: DashboardDensity) => {
    setPreferences((current) => ({ ...current, density }));
  };

  const reset = () => {
    setPreferences({ ...defaultPreferences });
  };

  const isWidgetVisible = (id: string) => !preferences.hidden.includes(id);

  return {
    density: preferences.density,
    orderedWidgets,
    visibleWidgets,
    isWidgetVisible,
    toggleWidget,
    moveWidget,
    setDensity,
    reset,
  };
};

type DashboardCustomizeButtonProps = {
  density: DashboardDensity;
  widgets: DashboardWidget[];
  isWidgetVisible: (id: string) => boolean;
  onToggleWidget: (id: string) => void;
  onMoveWidget: (id: string, direction: 'up' | 'down') => void;
  onDensityChange: (density: DashboardDensity) => void;
  onReset: () => void;
};

const DashboardCustomizeButton = ({
  density,
  widgets,
  isWidgetVisible,
  onToggleWidget,
  onMoveWidget,
  onDensityChange,
  onReset,
}: DashboardCustomizeButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex justify-end">
      <Button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-gray-800 dark:text-slate-100"
      >
        <FiSettings className="text-base" />
        Customize
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-sm border border-slate-200 bg-white shadow-5 dark:border-slate-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-800 dark:text-white">
              Dashboard Widgets
            </span>
            <Button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-400 transition hover:text-danger"
              aria-label="Close dashboard customization"
            >
              <FiX />
            </Button>
          </div>

          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="grid grid-cols-2 overflow-hidden rounded-sm border border-slate-200 text-xs font-semibold dark:border-slate-700">
              <Button
                type="button"
                onClick={() => onDensityChange('comfortable')}
                className={`px-3 py-2 transition ${
                  density === 'comfortable'
                    ? 'bg-primary text-white'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                Expanded
              </Button>
              <Button
                type="button"
                onClick={() => onDensityChange('compact')}
                className={`px-3 py-2 transition ${
                  density === 'compact'
                    ? 'bg-primary text-white'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                Compact
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto py-2">
            {widgets.map((widget, index) => {
              const visible = isWidgetVisible(widget.id);

              return (
                <div
                  key={widget.id}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <Button
                    type="button"
                    onClick={() => onToggleWidget(widget.id)}
                    className={`flex w-8 items-center justify-center rounded-sm border transition ${
 visible
 ?'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300':'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-900/30'}`}
                    aria-label={visible ? `Hide ${widget.title}` : `Show ${widget.title}`}
                  >
                    {visible ? <FiEye /> : <FiEyeOff />}
                  </Button>
                  <span className="min-w-0 flex-1 truncate font-semibold text-slate-700 dark:text-slate-100">
                    {widget.title}
                  </span>
                  <Button
                    type="button"
                    onClick={() => onMoveWidget(widget.id, 'up')}
                    disabled={index === 0}
                    className="flex w-8 items-center justify-center rounded-sm border border-slate-200 text-slate-500 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                    aria-label={`Move ${widget.title} up`}
                  >
                    <FiChevronUp />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => onMoveWidget(widget.id, 'down')}
                    disabled={index === widgets.length - 1}
                    className="flex w-8 items-center justify-center rounded-sm border border-slate-200 text-slate-500 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                    aria-label={`Move ${widget.title} down`}
                  >
                    <FiChevronDown />
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
            <Button
              type="button"
              onClick={onReset}
              className="w-full rounded-sm border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-danger hover:text-danger dark:border-slate-700 dark:text-slate-300"
            >
              Reset Layout
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DashboardCustomizeButton;
