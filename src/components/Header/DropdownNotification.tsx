import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiBell,
  FiCalendar,
  FiCheckSquare,
  FiCreditCard,
  FiRefreshCw,
  FiX,
} from 'react-icons/fi';
import ClickOutside from '../ClickOutside';
import httpService from '../services/httpService';
import {
  API_NOTIFICATION_DISMISS_URL,
  API_NOTIFICATION_SUMMARY_URL,
} from '../services/apiRoutes';
import { useSelector } from 'react-redux';
import { hasPermission } from '../utils/permissionChecker';
import { Button } from '../../pages/UiElements/CustomButtons';

type NotificationTone = 'danger' | 'warning' | 'info' | 'success';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  count?: number;
  tone: NotificationTone;
  to: string;
  notificationKey: string;
  dismissed?: boolean;
  preview?: Array<{
    label?: string;
    meta?: string;
    value?: string;
  }>;
  icon: JSX.Element;
};

const toneClass: Record<NotificationTone, string> = {
  danger: 'bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-900/40',
  warning: 'bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-900/40',
  info: 'bg-sky-50 text-sky-600 ring-sky-100 dark:bg-sky-900/20 dark:text-sky-300 dark:ring-sky-900/40',
  success: 'bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-900/40',
};

const toIsoDate = (value?: string): string => {
  if (!value) return new Date().toISOString().slice(0, 10);

  const parts = value.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  return new Date().toISOString().slice(0, 10);
};

const iconForNotification = (id: string) => {
  if (id === 'due_installments') return <FiCreditCard />;
  if (id === 'subscription_expiry') return <FiCalendar />;
  if (id === 'pending_voucher_approval' || id === 'pending_subscription_payments') {
    return <FiCheckSquare />;
  }
  return <FiAlertTriangle />;
};

const readDismissedNotifications = (storageKey: string): Record<string, true> => {
  if (typeof window === 'undefined') return {};

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeDismissedNotifications = (
  storageKey: string,
  dismissed: Record<string, true>,
) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(dismissed));
};

const DropdownNotification = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const settings = useSelector((state: any) => state.settings);
  const user = useSelector((state: any) => state.auth?.me);
  const permissions = settings?.data?.permissions || [];
  const branchId = user?.branch_id || settings?.data?.branch?.id;
  const transactionDate = settings?.data?.trx_dt;
  const canViewStockAlerts =
    hasPermission(permissions, 'products.view') ||
    hasPermission(permissions, 'product.stock.view');
  const canViewInstallments = hasPermission(permissions, 'installment.create');
  const canApproveVoucher = hasPermission(permissions, 'voucher.approval');
  const canViewSubscriptionAdmin =
    hasPermission(permissions, 'subscription.admin') ||
    hasPermission(permissions, 'subscription.payment.approve');
  const dismissStorageKey = `cashbook-dismissed-notifications:${user?.id || 'user'}:${branchId || 'branch'}`;

  const loadNotifications = async () => {
    if (!user?.id || !branchId) return;

    setLoading(true);
    try {
      const response = await httpService.get(API_NOTIFICATION_SUMMARY_URL, {
        params: {
          branch_id: branchId,
          transaction_date: toIsoDate(transactionDate),
          upcoming_days: 7,
        },
      });
      const summary = response?.data?.data?.data || {};
      const incoming = Array.isArray(summary?.notifications)
        ? summary.notifications
        : [];
      const localDismissed = readDismissedNotifications(dismissStorageKey);

      setNotifications(
        incoming.map((item: any) => ({
          id: item.id,
          title: item.title,
          message: item.message,
          count: Number(item.count || 0),
          tone: item.tone || 'info',
          to: item.to || '#',
          notificationKey: item.notification_key,
          dismissed:
            Boolean(item.dismissed) ||
            Boolean(localDismissed[item.notification_key]) ||
            Boolean(localDismissed[`type:${item.id}`]),
          preview: Array.isArray(item.preview) ? item.preview : [],
          icon: iconForNotification(item.id),
        })),
      );
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [
    user?.id,
    branchId,
    transactionDate,
    canViewStockAlerts,
    canViewInstallments,
    canApproveVoucher,
    canViewSubscriptionAdmin,
  ]);

  const items = useMemo<NotificationItem[]>(() => {
    return notifications.filter((item) => {
      if (item.dismissed) return false;
      if ((item.id === 'negative_stock' || item.id === 'low_stock') && !canViewStockAlerts) return false;
      if (item.id === 'due_installments' && !canViewInstallments) return false;
      if (item.id === 'pending_voucher_approval' && !canApproveVoucher) return false;
      if (item.id === 'pending_subscription_payments' && !canViewSubscriptionAdmin) return false;
      return true;
    });
  }, [
    notifications,
    canApproveVoucher,
    canViewInstallments,
    canViewStockAlerts,
    canViewSubscriptionAdmin,
  ]);

  const totalCount = items.reduce((sum, item) => sum + (item.count || 1), 0);

  const dismissNotification = async (item: NotificationItem) => {
    const localDismissed = readDismissedNotifications(dismissStorageKey);
    const nextDismissed = {
      ...localDismissed,
      [item.notificationKey]: true as const,
      [`type:${item.id}`]: true as const,
    };

    writeDismissedNotifications(dismissStorageKey, nextDismissed);

    setNotifications((current) =>
      current.map((notification) =>
        notification.notificationKey === item.notificationKey
          ? { ...notification, dismissed: true }
          : notification,
      ),
    );

    try {
      await httpService.post(API_NOTIFICATION_DISMISS_URL, {
        notification_key: item.notificationKey,
        notification_id: item.id,
        branch_id: branchId,
      });
    } catch {
      // Keep the item hidden locally; it will reappear on a future refresh if the server did not save it.
    }
  };

  const handleDismissClick = (event: any, item: NotificationItem) => {
    event.preventDefault();
    event.stopPropagation();
    dismissNotification(item);
  };

  return (
    <ClickOutside onClick={() => setDropdownOpen(false)} className="relative">
      <li>
        <Button
          type="button"
          onClick={() => setDropdownOpen((current) => !current)}
          className="relative flex w-8.5 items-center justify-center rounded-full border border-[rgb(var(--c-border))] bg-gray text-slate-600 transition hover:border-primary hover:text-primary dark:bg-meta-4 dark:text-[rgb(var(--c-text))]"
          aria-label="Notification center"
        >
          <FiBell className="text-lg" />
          {totalCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-[18px] text-white">
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          ) : null}
        </Button>

        {dropdownOpen ? (
          <div className="absolute -right-20 mt-2.5 flex w-80 flex-col overflow-hidden rounded-sm border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] shadow-default sm:right-0 sm:w-96">
            <div className="flex items-center justify-between border-b border-[rgb(var(--c-border))] px-4 py-3">
              <div>
                <h5 className="text-sm font-bold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                  Notification Center
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {totalCount > 0 ? `${totalCount} item(s) need attention` : 'Everything looks clear'}
                </p>
              </div>
              <Button
                type="button"
                onClick={loadNotifications}
                className="flex w-8 items-center justify-center rounded-sm border border-[rgb(var(--c-border))] text-slate-500 transition hover:border-primary hover:text-primary dark:text-slate-300"
                aria-label="Refresh notifications"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              </Button>
            </div>

            <ul className="max-h-96 overflow-y-auto">
              {loading && items.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Loading notifications...
                </li>
              ) : items.length > 0 ? (
                items.map((item) => (
                  <li key={item.id}>
                    <div className="relative border-b border-[rgb(var(--c-border))] transition hover:bg-gray-2 dark:hover:bg-meta-4">
                      <Link
                        className="flex items-start gap-3 px-4 py-3 pr-11"
                        to={item.to}
                        onClick={() => setDropdownOpen(false)}
                      >
                        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ring-1 ${toneClass[item.tone]}`}>
                          {item.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-3">
                            <span className="truncate text-sm font-bold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
                              {item.title}
                            </span>
                            {item.count ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                                {item.count}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                            {item.message}
                          </span>
                          {item.preview?.length ? (
                            <span className="mt-2 block space-y-1">
                              {item.preview.map((row, index) => (
                                <span
                                  key={`${item.notificationKey}-${index}`}
                                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-sm bg-slate-50 px-2 py-1 text-[11px] dark:bg-slate-800/60"
                                >
                                  <span className="min-w-0">
                                    <span className="block truncate font-semibold text-slate-700 dark:text-slate-100">
                                      {row.label}
                                    </span>
                                    {row.meta ? (
                                      <span className="block truncate text-slate-400">
                                        {row.meta}
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="text-right font-bold text-slate-600 dark:text-slate-200">
                                    {row.value}
                                  </span>
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </span>
                      </Link>
                      <Button
                        type="button"
                        onClick={(event) => handleDismissClick(event, item)}
                        className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-sm text-slate-400 transition hover:bg-slate-100 hover:text-danger dark:hover:bg-slate-700"
                        aria-label={`Dismiss ${item.title}`}
                      >
                        <FiX />
                      </Button>
                    </div>
                  </li>
                ))
              ) : (
                <li className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  No important notification right now.
                </li>
              )}
            </ul>
          </div>
        ) : null}
      </li>
    </ClickOutside>
  );
};

export default DropdownNotification;
