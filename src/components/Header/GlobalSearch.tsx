import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { matchSorter } from 'match-sorter';
import { FiSearch, FiX } from 'react-icons/fi';
import { hasAnyPermission, Permission } from '../Sidebar/permissionUtils';
import { getVoucherEditTarget } from '../utils/utils-functions/voucherEditNavigation';
import { VoucherPrintRegistry } from '../modules/vouchers/VoucherPrintRegistry';
import routes from '../services/appRoutes';
import globalSearchItems, { GlobalSearchItem } from './globalSearchItems';
import { Button } from '../../pages/UiElements/CustomButtons';
import { Input } from '../utils/fields/FormControls';

const RESULT_LIMIT = 10;
const VOUCHER_NO_PATTERN = /^\d+-[\w-]+$/;
const MOBILE_NO_PATTERN = /^01\d{8,9}$/;
const QUICK_ACTION_TITLES = [
  'Sales Invoice',
  'Purchase Invoice',
  'Cash Received',
  'Cash Payment',
  'Add Customer & Supplier',
  'Add Product',
  'Ledger',
  'Cashbook',
  'Product Stock',
];
const QUICK_ACTION_LABELS: Record<string, string> = {
  'Sales Invoice': 'New Sale',
  'Purchase Invoice': 'New Purchase',
  'Cash Received': 'Cash Receive',
  'Cash Payment': 'Cash Payment',
  'Add Customer & Supplier': 'New Customer',
  'Add Product': 'New Product',
};

const canShowItem = (permissions: Permission[] | undefined, item: GlobalSearchItem) => {
  if (!item.permissions || item.permissions.length === 0) return true;
  return hasAnyPermission(permissions, item.permissions);
};

const GlobalSearch = () => {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voucherRegistryRef = useRef<any>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const permissions = useSelector((state: any) => state.settings?.data?.permissions ?? []);

  const availableItems = useMemo(
    () => globalSearchItems.filter((item) => canShowItem(permissions, item)),
    [permissions],
  );

  const quickActions = useMemo(() => {
    const itemMap = new Map(availableItems.map((item) => [item.title, item]));

    return QUICK_ACTION_TITLES.map((title) => itemMap.get(title)).filter(
      (item): item is GlobalSearchItem => Boolean(item),
    );
  }, [availableItems]);

  const results = useMemo(() => {
    const searchText = query.trim();
    if (!searchText) return quickActions.slice(0, RESULT_LIMIT);

    return matchSorter(availableItems, searchText, {
      keys: ['title', 'group', 'path', 'keywords'],
    }).slice(0, RESULT_LIMIT);
  }, [availableItems, query, quickActions]);

  const voucherTarget = useMemo(() => {
    const searchText = query.trim();
    if (!VOUCHER_NO_PATTERN.test(searchText)) return null;

    return getVoucherEditTarget(searchText);
  }, [query]);

  const isCustomerMobileSearch = useMemo(() => MOBILE_NO_PATTERN.test(query.trim()), [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      const isQuickActionShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';

      if (!isQuickActionShortcut) return;

      event.preventDefault();
      setOpen(true);
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, []);

  const resetSearch = () => {
    setQuery('');
    setOpen(false);
    setActiveIndex(0);
  };

  const goToItem = (item: GlobalSearchItem | undefined) => {
    if (!item) return;
    navigate(item.path);
    resetSearch();
    inputRef.current?.blur();
  };

  const printVoucher = () => {
    const voucherNo = query.trim();

    if (!voucherTarget || !voucherNo) return;

    voucherRegistryRef.current?.printVoucher({ vr_no: voucherNo });
    resetSearch();
    inputRef.current?.blur();
  };

  const goToCustomerSearch = () => {
    const mobileNo = query.trim();

    if (!isCustomerMobileSearch) return;

    navigate(routes.supplier_customer_list, {
      state: {
        customerGlobalSearch: true,
        customerSearch: mobileNo,
      },
    });
    resetSearch();
    inputRef.current?.blur();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (voucherTarget) {
      printVoucher();
      return;
    }

    if (isCustomerMobileSearch) {
      goToCustomerSearch();
      return;
    }

    goToItem(results[activeIndex] ?? results[0]);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Escape') {
      resetSearch();
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={wrapperRef} className="relative hidden w-full max-w-xl sm:block">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Button
            type="submit"
            className="absolute left-0 top-1/2 -translate-y-1/2 text-body hover:text-primary dark:text-bodydark dark:hover:text-primary"
            aria-label="Search"
          >
            <FiSearch size={20} />
          </Button>

          <Input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Search or quick action..."
            // Deliberately not FIELD_BASE. This is not a form field on a form
            // -- it floats in the header with the magnifier and the Ctrl K chip
            // positioned against its own edges, so a border and a solid fill
            // put both of those on top of the frame and boxed in what used to
            // read as part of the bar. Only the colours are shared.
            className="w-full bg-transparent pl-9 pr-16 text-black placeholder-gray-400 outline-none transition focus:outline-none dark:text-white dark:placeholder-gray-500 xl:w-125"
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            aria-label="Global search"
          />

          {query ? (
            <Button
              type="button"
              className="absolute right-0 top-1/2 -translate-y-1/2 text-body hover:text-danger dark:text-bodydark"
              onClick={resetSearch}
              aria-label="Clear search"
            >
              <FiX size={18} />
            </Button>
          ) : (
            <span className="pointer-events-none absolute right-0 top-1/2 hidden -translate-y-1/2 rounded border border-stroke px-1.5 py-0.5 text-[10px] font-semibold uppercase text-body dark:border-strokedark dark:text-bodydark md:inline-flex">
              Ctrl K
            </span>
          )}
        </div>
      </form>

      {open ? (
        <div className="absolute left-0 top-full z-999 mt-3 w-full overflow-hidden rounded border border-stroke bg-white shadow-5 dark:border-strokedark dark:bg-boxdark">
          {voucherTarget || isCustomerMobileSearch || results.length > 0 ? (
            <ul className="max-h-96 overflow-y-auto py-2">
              {!query.trim() && results.length > 0 ? (
                <li className="px-4 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-body dark:text-bodydark">
                  Quick Actions
                </li>
              ) : null}
              {voucherTarget ? (
                <li>
                  <Button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 border-b border-stroke px-4 py-2.5 text-left text-sm hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={printVoucher}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-black dark:text-white">
                        Print Preview {voucherTarget.label}
                      </span>
                      <span className="block truncate text-xs text-body dark:text-bodydark">{query.trim()}</span>
                    </span>
                    <span className="shrink-0 truncate text-xs text-body dark:text-bodydark">Voucher Print</span>
                  </Button>
                </li>
              ) : null}
              {isCustomerMobileSearch ? (
                <li>
                  <Button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 border-b border-stroke px-4 py-2.5 text-left text-sm hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={goToCustomerSearch}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-black dark:text-white">Search Customer</span>
                      <span className="block truncate text-xs text-body dark:text-bodydark">{query.trim()}</span>
                    </span>
                    <span className="shrink-0 truncate text-xs text-body dark:text-bodydark">List Customers</span>
                  </Button>
                </li>
              ) : null}
              {results.map((item, index) => (
                <li key={`${item.path}-${item.title}`}>
                  <Button
                    type="button"
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-2 dark:hover:bg-meta-4 ${
                      activeIndex === index ? 'bg-gray-2 dark:bg-meta-4' : ''
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => goToItem(item)}
                  >
                      <span className="min-w-0">
                      <span className="block truncate font-medium text-black dark:text-white">
                        {!query.trim() ? QUICK_ACTION_LABELS[item.title] ?? item.title : item.title}
                      </span>
                      <span className="block truncate text-xs text-body dark:text-bodydark">{item.group}</span>
                    </span>
                    <span className="shrink-0 truncate text-xs text-body dark:text-bodydark">{item.path}</span>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-body dark:text-bodydark">No matching pages found.</div>
          )}
        </div>
      ) : null}

      <VoucherPrintRegistry ref={voucherRegistryRef} rowsPerPage={12} fontSize={12} />
    </div>
  );
};

export default GlobalSearch;
