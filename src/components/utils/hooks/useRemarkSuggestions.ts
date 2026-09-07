import { useEffect, useState } from 'react';
import httpService from '../../services/httpService';
import { API_CASH_RECEIVED_SUGGESTIONS_URL } from '../../services/apiRoutes';

/**
 * The remarks already typed on this branch's vouchers, matched against what is
 * being typed now.
 *
 * The six cash screens -- General, Head Office and Trading, received and paid --
 * each carry their own copy of this: the same state, the same 250ms timer, the
 * same endpoint, the same unwrapping of `data.data.data`. The bank screens had
 * none, which is the whole of the difference the user saw: a remark typed a
 * hundred times on Cash Payment offered itself back, and the same remark on
 * Bank Payment did not.
 *
 * So the seventh and eighth copies are this instead. The endpoint was never
 * cash-only -- it reads acc_transaction_details.remarks for the signed-in
 * company and branch, whatever voucher wrote them -- so a bank screen asking it
 * needs nothing added behind it. The cash screens still have their own copies
 * and are left alone; they can move onto this when one of them is next opened.
 *
 * The query is the field's own text: an empty box asks for nothing rather than
 * pulling the first ten remarks on the branch, which is what the cash screens
 * do and is the right behaviour -- a datalist that opens on focus with ten
 * unrelated lines is noise.
 */
const normalizeSuggestionItems = (items: any): string[] =>
  Array.isArray(items)
    ? items
      .map((item: any) => String(item ?? '').trim())
      .filter((item: string, index: number, arr: string[]) => item && arr.indexOf(item) === index)
    : [];

const useRemarkSuggestions = (remarks: string, delayMs = 250): string[] => {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const query = (remarks ?? '').trim();

    if (!query) {
      setSuggestions([]);
      return;
    }

    // The box is typed in a character at a time and each keystroke would
    // otherwise be a request. The timer is cleared by the cleanup below, so
    // only the pause at the end of a word actually asks.
    const timer = window.setTimeout(() => {
      httpService
        .get(API_CASH_RECEIVED_SUGGESTIONS_URL, { params: { field: 'remarks', q: query } })
        .then((response: any) => {
          setSuggestions(normalizeSuggestionItems(response?.data?.data?.data));
        })
        .catch(() => {
          setSuggestions([]);
        });
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [remarks, delayMs]);

  return suggestions;
};

export default useRemarkSuggestions;
