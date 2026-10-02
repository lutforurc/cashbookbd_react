import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FiArrowLeft } from "react-icons/fi";

import Table from "../../utils/others/Table";
import Loader from "../../../common/Loader";

import httpService from "../../services/httpService";
import {
  API_LEGACY_ACCOUNT_URL,
  API_LEGACY_ACCOUNTS_URL,
} from "../../services/apiRoutes";
import { money } from "../hotel/setupHelpers";
import { formatDate } from "../../utils/utils-functions/formatDate";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";
import HelmetTitle from "../../utils/others/HelmetTitle";

/**
 * The old shop's OWN cash and bank accounts, from `?p=ViewAccount`.
 *
 * This sits in Old Software beside the archived bills because that is what it
 * is: somebody else's records, kept so the old books can still be read. The
 * client walked in one day and asked for these 48 to be backed up.
 *
 * ⚠️ IT IS A BACKUP, NOT A LEDGER OF OURS. There is no form here, no save, no
 * delete, and not one taka of it reaches the new books. Their balance adds up
 * to -2,03,59,355.00 -- the other leg of the 422 customer and supplier
 * openings the new books already took -- so posting them would count every
 * taka twice. That is why they are read out of their own two tables rather
 * than folded in with the parties: see the API controller's accounts().
 *
 * The heading says as much, the way the record screen's does, because a page
 * of debits and credits invites somebody to treat it as a ledger.
 */

/**
 * thousandSeparator() prints a dash for a nought, which is right in a table
 * cell holding no balance but wrong for a total. A nought keeps its figure
 * here and every other value borrows the app's own format.
 */
const totalFigure = (value: number) =>
  Number(value) === 0 ? "0" : thousandSeparator(value);

const LegacyAccounts = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [account, setAccount] = useState<any>(null);
  const [accountLoading, setAccountLoading] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const res = await httpService.get(API_LEGACY_ACCOUNTS_URL);
        const data = res?.data?.data?.data ?? res?.data?.data ?? {};

        if (!alive) return;
        setRows(data.rows ?? []);
        setTotals(data.totals ?? null);
      } catch (error: any) {
        if (!alive) return;
        toast.error(error?.response?.data?.message || "Could not read the old accounts");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const openAccount = async (row: any) => {
    setAccountLoading(true);

    try {
      const res = await httpService.get(
        `${API_LEGACY_ACCOUNT_URL}/${encodeURIComponent(row.legacy_id)}`,
      );

      // A missing account answers success:false with HTTP 201 (the app's own
      // refusal convention), so a status check would never see it -- and an
      // empty payload would draw a blank ledger card rather than say so.
      if (res?.data?.success === false) {
        toast.error(res?.data?.message || "Could not open that account");
        return;
      }

      setAccount(res?.data?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not open that account");
    } finally {
      setAccountLoading(false);
    }
  };

  // ------------------------------------------------------- one account's card

  if (account) {
    const ledger = account.rows ?? [];

    return (
      <div className="p-4">
        <HelmetTitle title="Old Record - Information" />

        <button
          type="button"
          onClick={() => setAccount(null)}
          className="mb-3 flex items-center gap-1 text-sm text-gray-600 underline dark:text-white hover:underline"
        >
          <FiArrowLeft /> সব অ্যাকাউন্ট
        </button>

        <div className="mb-4 rounded border border-gray-300 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">{account.account?.name}</h1>
              <div className="text-sm">
                {[
                  account.account?.type,
                  account.account?.account_number,
                  account.account?.mobile,
                  account.account?.details,
                ]
                  .filter(Boolean)
                  .join(" — ")}
              </div>
              <div className="mt-1 text-xs">
                পুরনো সিস্টেমের আইডি {account.account?.legacy_id}
                {/* formatDate() hands back a fragment, not a string, so it
                    belongs in JSX -- inside a template literal it prints
                    [object Object]. */}
                {account.account?.added ? (
                  <> — যোগ করা {formatDate(account.account.added)}</>
                ) : null}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs">পুরনো সিস্টেমের ব্যালেন্স</div>
              <div className="text-xl font-semibold">
                {money(account.summary?.closing)}
              </div>
              <div className="text-xs">
                {account.summary?.entries ?? 0} টা লেনদেন
              </div>
            </div>
          </div>

          <p className="mt-3 border-t pt-2 text-xs">
            পুরনো সিস্টেমের নিজের অ্যাকাউন্ট — এখানে কোনো হিসাব হয় না, নতুন
            খাতায় কিছু পোস্ট হয় না।
          </p>
        </div>

        <div className="rounded border border-gray-300">
          <Table
            columns={[
              {
                key: "sl_no",
                header: "ক্রমিক নং",
                headerClass: "text-center",
                cellClass: "text-center",
                render: (_row, index) => index + 1,
              },
              {
                key: "doc_date",
                header: "তারিখ",
                headerClass: "text-center",
                cellClass: "text-center",
                render: (row: any) => (row.doc_date ? formatDate(row.doc_date) : "—"),
              },
              { key: "particulars", header: "বিবরণ" },
              {
                key: "debit",
                header: "ডেবিট",
                cellClass: "text-right",
                render: (row: any) => thousandSeparator(row.debit),
              },
              {
                key: "credit",
                header: "ক্রেডিট",
                cellClass: "text-right",
                render: (row: any) => thousandSeparator(row.credit),
              },
              {
                key: "balance",
                header: "ব্যালেন্স",
                cellClass: "text-right",
                render: (row: any) => thousandSeparator(row.balance),
              },
            ]}
            data={ledger}
            getRowKey={(row: any) => row.sl}
            noDataMessage="এই অ্যাকাউন্টের কোনো লেনদেন পাওয়া যায়নি"
          />
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------- list

  // The label carries the minus, so the negative half is shown as a magnitude
  // whichever way the server sent it.
  const negativeTotal = Math.abs(Number(totals?.negative) || 0);
  const positiveTotal = Number(totals?.positive) || 0;
  const netTotal =
    totals?.net != null ? Number(totals.net) : positiveTotal - negativeTotal;

  return (
    <div className="p-4">
      <HelmetTitle title="Old Record - Information" />

      <div className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">পুরনো ERP-র নিজস্ব অ্যাকাউন্ট</h1>
            <p className="text-sm text-gray-600 dark:text-white">
              পুরনো সিস্টেমের নিজের ক্যাশ ও ব্যাংক অ্যাকাউন্ট — শুধু ব্যাকআপ,
              কোনো ওপেনিং নয়। সারিতে ক্লিক করলে লেজার খুলবে।
            </p>
          </div>

          {/* Over every account, not the page: 48 rows are all here, so the
              two are the same set -- and the API sums them either way. */}
          {totals ? (
            <div className="flex flex-wrap justify-end gap-x-6 gap-y-2 text-right">
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  (−) ব্যালেন্স — মোট
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {totalFigure(negativeTotal)}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  (+) ব্যালেন্স — মোট
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {totalFigure(positiveTotal)}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  নিট ((+) − (−))
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {totalFigure(netTotal)}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative rounded border border-gray-300 bg-gray-50 dark:bg-gray-800">
        {loading ? <Loader /> : null}
        <div className={loading ? "pointer-events-none opacity-60" : ""}>
          <Table
            columns={[
              {
                key: "sl",
                header: "ক্রমিক",
                headerClass: "text-center",
                cellClass: "text-center",
                render: (_row: any, index: number) => index + 1,
              },
              { key: "name", header: "নাম" },
              {
                key: "account_number",
                header: "নম্বর",
                render: (row: any) => row.account_number ?? "—",
              },
              {
                key: "type",
                header: "ধরন",
                render: (row: any) => row.type ?? "—",
              },
              {
                key: "mobile",
                header: "মোবাইল",
                render: (row: any) => row.mobile ?? "—",
              },
              {
                key: "details",
                header: "বিবরণ",
                render: (row: any) => row.details ?? "—",
              },
              {
                key: "entries",
                header: "লেনদেন",
                headerClass: "text-center",
                cellClass: "text-right",
                render: (row: any) => row.entries ?? 0,
              },
              {
                key: "balance",
                header: "ব্যালেন্স",
                headerClass: "text-center",
                cellClass: "text-right",
                render: (row: any) => thousandSeparator(row.balance),
              },
            ]}
            data={rows}
            onRowClick={openAccount}
            rowClassName={() => "cursor-pointer"}
            getRowKey={(row: any) => row.legacy_id}
            noDataMessage={
              loading
                ? "আনা হচ্ছে…"
                : "পুরনো সিস্টেমের কোনো অ্যাকাউন্ট আনা হয়নি"
            }
          />
        </div>
      </div>

      {accountLoading ? <Loader /> : null}
    </div>
  );
};

export default LegacyAccounts;
