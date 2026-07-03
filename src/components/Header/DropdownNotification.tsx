import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiBell,
  FiCalendar,
  FiCheckSquare,
  FiCreditCard,
  FiRefreshCw,
} from 'react-icons/fi';
import ClickOutside from '../ClickOutside';
import httpService from '../services/httpService';
import { API_NOTIFICATION_SUMMARY_URL } from '../services/apiRoutes';
import routes from '../services/appRoutes';
import { useSelector } from 'react-redux';
import { hasPermission } from '../utils/permissionChecker';

type NotificationTone = 'danger' | 'warning' | 'info' | 'success';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  count?: number;
  tone: NotificationTone;
  to: string;
  icon: JSX.Element;
};

type NotificationCounts = {
  lowStock: number;
  negativeStock: number;
  dueInstallments: number;
  pendingVoucherApproval: number;
  pendingPayments: number;
  subscriptionExpiry: number;
};

type SubscriptionAlert = {
  needs_attention?: boolean;
  status?: string | null;
  access_status?: string | null;
  plan_name?: string | null;
  end_date?: string | null;
  trial_end_at?: string | null;
  days_left?: number | null;
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

const DropdownNotification = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<NotificationCounts>({
    lowStock: 0,
    negativeStock: 0,
    dueInstallments: 0,
    pendingVoucherApproval: 0,
    pendingPayments: 0,
    subscriptionExpiry: 0,
  });
  const [subscriptionAlert, setSubscriptionAlert] = useState<SubscriptionAlert | null>(null);
  const settings = useSelector((state: any) => state.settings);
  const user = useSelector((state: any) => state.auth?.me);
  const permissions = settings?.data?.permissions || [];
  const branchId = user?.branch_id || settings?.data?.branch?.id;
  const transactionDate = settings?.data?.trx_dt;
  const canViewLowStock = hasPermission(permissions, 'product.view');
  const canViewInstallments = hasPermission(permissions, 'installment.create');
  const canApproveVoucher = hasPermission(permissions, 'voucher.approval');
  const canViewSubscriptionAdmin =
    hasPermission(permissions, 'subscription.admin') ||
    hasPermission(permissions, 'subscription.payment.approve');

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
      const summaryCounts = summary?.counts || {};

      setCounts({
        lowStock: canViewLowStock ? Number(summaryCounts.low_stock || 0) : 0,
        negativeStock: canViewLowStock ? Number(summaryCounts.negative_stock || 0) : 0,
        dueInstallments: canViewInstallments ? Number(summaryCounts.due_installments || 0) : 0,
        pendingVoucherApproval: canApproveVoucher ? Number(summaryCounts.pending_voucher_approval || 0) : 0,
        pendingPayments: canViewSubscriptionAdmin ? Number(summaryCounts.pending_subscription_payments || 0) : 0,
        subscriptionExpiry: Number(summaryCounts.subscription_expiry || 0),
      });
      setSubscriptionAlert(summary?.subscription || null);
    } catch {
      setCounts({
        lowStock: 0,
        negativeStock: 0,
        dueInstallments: 0,
        pendingVoucherApproval: 0,
        pendingPayments: 0,
        subscriptionExpiry: 0,
      });
      setSubscriptionAlert(null);
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
    canViewLowStock,
    canViewInstallments,
    canApproveVoucher,
    canViewSubscriptionAdmin,
  ]);

  const items = useMemo<NotificationItem[]>(() => {
    const subscriptionDaysLeft = subscriptionAlert?.days_left;
    const subscriptionIsExpiring =
      counts.subscriptionExpiry > 0 && subscriptionAlert?.needs_attention;

    return [
      counts.negativeStock > 0 && {
        id: 'negative-stock',
        title: 'Negative Stock',
        message: `${counts.negativeStock} products need stock correction.`,
        count: counts.negativeStock,
        tone: 'danger' as const,
        to: routes.product_negative_stock,
        icon: <FiAlertTriangle />,
      },
      counts.lowStock > 0 && {
        id: 'low-stock',
        title: 'Low Stock',
        message: `${counts.lowStock} products reached reorder level.`,
        count: counts.lowStock,
        tone: 'warning' as const,
        to: routes.product_low_stock,
        icon: <FiAlertTriangle />,
      },
      counts.dueInstallments > 0 && {
        id: 'due-installment',
        title: 'Due Installment',
        message: `${counts.dueInstallments} installments are due or upcoming.`,
        count: counts.dueInstallments,
        tone: 'info' as const,
        to: routes.due_installment_list,
        icon: <FiCreditCard />,
      },
      subscriptionIsExpiring && {
        id: 'subscription-expiry',
        title: subscriptionAlert?.status === 'expired' ? 'Subscription Expired' : 'Subscription Reminder',
        message:
          subscriptionDaysLeft !== null && subscriptionDaysLeft >= 0
            ? `${subscriptionAlert?.plan_name || 'Current plan'} expires in ${subscriptionDaysLeft} day(s).`
            : `${subscriptionAlert?.plan_name || 'Current plan'} needs attention.`,
        tone: subscriptionAlert?.status === 'expired' ? 'danger' as const : 'warning' as const,
        to: routes.my_subscription,
        icon: <FiCalendar />,
      },
      counts.pendingVoucherApproval > 0 && {
        id: 'pending-voucher-approval',
        title: 'Voucher Approval',
        message: `${counts.pendingVoucherApproval} vouchers are waiting for approval.`,
        count: counts.pendingVoucherApproval,
        tone: 'success' as const,
        to: routes.admin_voucher_approval,
        icon: <FiCheckSquare />,
      },
      counts.pendingPayments > 0 && {
        id: 'pending-payment',
        title: 'Pending Approval',
        message: `${counts.pendingPayments} subscription payment requests need review.`,
        count: counts.pendingPayments,
        tone: 'warning' as const,
        to: routes.subscription_admin,
        icon: <FiCheckSquare />,
      },
    ].filter(Boolean) as NotificationItem[];
  }, [counts, subscriptionAlert]);

  const totalCount = items.reduce((sum, item) => sum + (item.count || 1), 0);

  return (
    <ClickOutside onClick={() => setDropdownOpen(false)} className="relative">
      <li>
        <button
          type="button"
          onClick={() => setDropdownOpen((current) => !current)}
          className="relative flex h-8.5 w-8.5 items-center justify-center rounded-full border border-stroke bg-gray text-slate-600 transition hover:border-primary hover:text-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
          aria-label="Notification center"
        >
          <FiBell className="text-lg" />
          {totalCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-[18px] text-white">
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          ) : null}
        </button>

        {dropdownOpen ? (
          <div className="absolute -right-20 mt-2.5 flex w-80 flex-col overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark sm:right-0 sm:w-96">
            <div className="flex items-center justify-between border-b border-stroke px-4 py-3 dark:border-strokedark">
              <div>
                <h5 className="text-sm font-bold text-black dark:text-white">
                  Notification Center
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {totalCount > 0 ? `${totalCount} item(s) need attention` : 'Everything looks clear'}
                </p>
              </div>
              <button
                type="button"
                onClick={loadNotifications}
                className="flex h-8 w-8 items-center justify-center rounded-sm border border-stroke text-slate-500 transition hover:border-primary hover:text-primary dark:border-strokedark dark:text-slate-300"
                aria-label="Refresh notifications"
              >
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            <ul className="max-h-96 overflow-y-auto">
              {loading && items.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  Loading notifications...
                </li>
              ) : items.length > 0 ? (
                items.map((item) => (
                  <li key={item.id}>
                    <Link
                      className="flex items-start gap-3 border-b border-stroke px-4 py-3 transition hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
                      to={item.to}
                      onClick={() => setDropdownOpen(false)}
                    >
                      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ring-1 ${toneClass[item.tone]}`}>
                        {item.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-bold text-black dark:text-white">
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
                      </span>
                    </Link>
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
