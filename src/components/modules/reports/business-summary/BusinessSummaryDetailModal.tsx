import { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";

import { Button } from "../../../../pages/UiElements/CustomButtons";
import httpService from "../../../services/httpService";
import { API_REPORT_BUSINESS_SUMMARY_DETAIL_URL } from "../../../services/apiRoutes";
import thousandSeparator from "../../../utils/utils-functions/thousandSeparator";
import type { BusinessGroupRow, BusinessMonthInfo } from "./BusinessSummaryGrid";

type DetailItem = {
  coa4_id: number | null;
  name: string;
  opening: number;
  movement: number;
  closing: number;
};

type Props = {
  branchId: number;
  year: number;
  months: BusinessMonthInfo[];
  group: BusinessGroupRow;
  onClose: () => void;
};

const EMPTY_TOTAL = { opening: 0, movement: 0, closing: 0 };

const BusinessSummaryDetailModal = ({ branchId, year, months, group, onClose }: Props) => {
  // Opens on the latest month the report shows.
  const [month, setMonth] = useState<number>(months[months.length - 1]?.month ?? 1);
  const [items, setItems] = useState<DetailItem[]>([]);
  const [total, setTotal] = useState(EMPTY_TOTAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await httpService.post(API_REPORT_BUSINESS_SUMMARY_DETAIL_URL, {
          branch_id: branchId,
          year,
          month,
          side: group.side,
          group: group.name,
        });
        const payload = response?.data;
        if (!payload?.success) throw new Error(payload?.message || "Details load failed");

        const body = payload?.data?.data ?? payload?.data ?? {};
        if (cancelled) return;
        setItems(Array.isArray(body.items) ? body.items : []);
        setTotal(body.total ?? EMPTY_TOTAL);
      } catch (err: any) {
        if (cancelled) return;
        setItems([]);
        setTotal(EMPTY_TOTAL);
        setError(err?.response?.data?.message || err?.message || "Details load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [branchId, year, month, group.side, group.name]);

  const th = "border border-[rgb(var(--c-border))] px-2 py-1.5";
  const td = "border border-[rgb(var(--c-border))] px-2 py-1";

  return (
    <div className="fixed inset-0 z-1001 flex items-center justify-center bg-black/50 px-3 py-6">
      <div className="flex max-h-full w-full max-w-3xl flex-col rounded-sm bg-white shadow-xl dark:bg-gray-800">
        <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--c-border))] px-4 py-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
              {group.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Accounts in this row, month by month. Opening is the previous month's closing.
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded border border-[rgb(var(--c-border))] bg-white px-2 py-1 text-sm dark:bg-gray-700"
              aria-label="Month"
            >
              {months.map((m) => (
                <option key={m.month} value={m.month}>
                  {m.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              onClick={onClose}
              className="rounded-sm p-1 text-gray-500 transition hover:bg-gray-100 hover:text-red-500 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <FiX className="text-lg" />
            </Button>
          </div>
        </div>

        <div className="overflow-auto p-4">
          {error ? (
            <div className="mb-3 border border-red-500/60 bg-red-950/40 px-3 py-2 text-sm text-red-100">{error}</div>
          ) : null}

          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-[rgb(var(--c-surface))]">
              <tr>
                <th className={`${th} w-12 text-center`}>SL</th>
                <th className={`${th} text-left`}>Account</th>
                <th className={`${th} text-right`}>Opening</th>
                <th className={`${th} text-right`}>Movement</th>
                <th className={`${th} text-right`}>Closing</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={`${td} py-6 text-center`}>Loading...</td>
                </tr>
              ) : items.length ? (
                items.map((item, idx) => (
                  <tr key={`${item.coa4_id ?? "n"}-${idx}`}>
                    <td className={`${td} text-center`}>{idx + 1}</td>
                    <td className={td}>{item.name}</td>
                    <td className={`${td} text-right`}>{thousandSeparator(item.opening)}</td>
                    <td className={`${td} text-right`}>{thousandSeparator(item.movement)}</td>
                    <td className={`${td} text-right`}>{thousandSeparator(item.closing)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={`${td} py-6 text-center`}>No accounts found</td>
                </tr>
              )}
            </tbody>
            {!loading && items.length ? (
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={2} className={`${td} text-left`}>Total</td>
                  <td className={`${td} text-right`}>{thousandSeparator(total.opening)}</td>
                  <td className={`${td} text-right`}>{thousandSeparator(total.movement)}</td>
                  <td className={`${td} text-right`}>{thousandSeparator(total.closing)}</td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
    </div>
  );
};

export default BusinessSummaryDetailModal;
