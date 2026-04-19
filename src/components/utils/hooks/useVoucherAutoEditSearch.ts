import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getVoucherAutoEditNoFromState } from '../utils-functions/voucherEditNavigation';

interface UseVoucherAutoEditSearchOptions {
  setSearch?: (value: string) => void;
  triggerSearch: (value: string) => void;
  enabled?: boolean;
  delayMs?: number;
}

const useVoucherAutoEditSearch = ({
  setSearch,
  triggerSearch,
  enabled = true,
  delayMs = 50,
}: UseVoucherAutoEditSearchOptions) => {
  const location = useLocation();
  const navigate = useNavigate();
  const handledRef = useRef('');
  const setSearchRef = useRef(setSearch);
  const triggerSearchRef = useRef(triggerSearch);

  useEffect(() => {
    setSearchRef.current = setSearch;
  }, [setSearch]);

  useEffect(() => {
    triggerSearchRef.current = triggerSearch;
  }, [triggerSearch]);

  useEffect(() => {
    const voucherNo = getVoucherAutoEditNoFromState(location.state);

    if (!enabled || !voucherNo) {
      return;
    }

    const handledKey = `${location.pathname}::${voucherNo}`;
    if (handledRef.current === handledKey) {
      return;
    }

    handledRef.current = handledKey;
    setSearchRef.current?.(voucherNo);

    const timer = window.setTimeout(() => {
      triggerSearchRef.current(voucherNo);
      navigate(location.pathname, { replace: true, state: null });
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [delayMs, enabled, location.pathname, location.state, navigate]);
};

export default useVoucherAutoEditSearch;
