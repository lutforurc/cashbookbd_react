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

const RESULT_LIMIT = 10;
const VOUCHER_NO_PATTERN = /^\d+-[\w-]+$/;
const MOBILE_NO_PATTERN = /^01\d{8,9}$/;

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

  const results = useMemo(() => {
    const searchText = query.trim();
    if (!searchText) return availableItems.slice(0, RESULT_LIMIT);

    return matchSorter(availableItems, searchText, {
      keys: ['title', 'group', 'path', 'keywords'],
    }).slice(0, RESULT_LIMIT);
  }, [availableItems, query]);

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
          <button
            type="submit"
            className="absolute left-0 top-1/2 -translate-y-1/2 text-body hover:text-primary dark:text-bodydark dark:hover:text-primary"
            aria-label="Search"
          >
            <FiSearch size={20} />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Search menus, reports, pages..."
            className="w-full bg-transparent pl-9 pr-9 text-black focus:outline-none dark:text-white xl:w-125"
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
            <button
              type="button"
              className="absolute right-0 top-1/2 -translate-y-1/2 text-body hover:text-danger dark:text-bodydark"
              onClick={resetSearch}
              aria-label="Clear search"
            >
              <FiX size={18} />
            </button>
          ) : null}
        </div>
      </form>

      {open && query.trim() ? (
        <div className="absolute left-0 top-full z-999 mt-3 w-full overflow-hidden rounded border border-stroke bg-white shadow-5 dark:border-strokedark dark:bg-boxdark">
          {voucherTarget || isCustomerMobileSearch || results.length > 0 ? (
            <ul className="max-h-96 overflow-y-auto py-2">
              {voucherTarget ? (
                <li>
                  <button
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
                  </button>
                </li>
              ) : null}
              {isCustomerMobileSearch ? (
                <li>
                  <button
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
                  </button>
                </li>
              ) : null}
              {results.map((item, index) => (
                <li key={`${item.path}-${item.title}`}>
                  <button
                    type="button"
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-2 dark:hover:bg-meta-4 ${
                      activeIndex === index ? 'bg-gray-2 dark:bg-meta-4' : ''
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => goToItem(item)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-black dark:text-white">{item.title}</span>
                      <span className="block truncate text-xs text-body dark:text-bodydark">{item.group}</span>
                    </span>
                    <span className="shrink-0 truncate text-xs text-body dark:text-bodydark">{item.path}</span>
                  </button>
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
