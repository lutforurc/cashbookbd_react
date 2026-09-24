import { useCallback, useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";
import { FiArrowLeft, FiExternalLink } from "react-icons/fi";

import Table from "../../utils/others/Table";
import Pagination from "../../utils/utils-functions/Pagination";
import SearchInput from "../../utils/fields/SearchInput";
import SelectOption from "../../utils/utils-functions/SelectOption";
import Loader from "../../../common/Loader";
import { PrintButton } from "../../../pages/UiElements/CustomButtons";

import httpService from "../../services/httpService";
import {
  API_LEGACY_OLD_INVOICE_URL,
  API_LEGACY_OLD_PARTIES_URL,
  API_LEGACY_OLD_PARTY_URL,
  API_LEGACY_OLD_SOURCES_URL,
} from "../../services/apiRoutes";
import DropdownCommon from "../../utils/utils-functions/DropdownCommon";
import { money } from "../hotel/setupHelpers";

import LegacyOldInvoicePrint, { LegacyOldInvoice } from "./LegacyOldInvoicePrint";
import { formatDate } from "../../utils/utils-functions/formatDate";
import thousandSeparator from "../../utils/utils-functions/thousandSeparator";

/**
 * The archive of the client's OLDER ERP install -- the one they ran before the
 * system behind "Old ERP Record".
 *
 * A twin of LegacyRecordSearch over its own endpoints and its own tables. The
 * owner asked for the two old systems to be kept wholly apart (2026-09-22),
 * and the other archive is already in their hands.
 *
 * ⚠️ NOTHING HERE IS EDITED OR POSTED. No form, no save, no delete, and not
 * one taka reaches the ledger.
 *
 * ⚠️ THE OLD SYSTEM'S DEBIT AND CREDIT COLUMNS CHANGE MEANING PART-WAY THROUGH
 * ITS OWN HISTORY -- its sign convention was reversed around mid-2022, so a
 * sale sits in debit before and credit after, and so does the money that paid
 * for it. That is why this screen shows the two columns as the old ledger
 * printed them and does NOT add them into "জমা" and "খরচ" totals: a total
 * across the flip would be a confident, wrong number. The caption on the card
 * says so, so nobody reads the columns as today's bookkeeping.
 */

/** How many rows one request may bring back. The page-size picker's "All" sends
 * the same number, so the server is known to honour it. */
const WHOLE_SET_PER_PAGE = 1000;

/**
 * The balance column added up over a set of parties: the negative half, the
 * positive half, and the two against each other.
 *
 * ⚠️ ONLY EVER CALLED WITH THE WHOLE MATCHING SET. Handed one page of a paged
 * list it returns a smaller number that still looks like a total, which is the
 * one thing this screen must not put on screen.
 */
const splitBalance = (list: any[]) => {
  let negative = 0;
  let positive = 0;

  for (const row of list) {
    const value = Number(row?.balance) || 0;
    if (value > 0) positive += value;
    else negative += value;
  }

  // `negative` keeps its own sign. The figures below take the magnitude and the
  // label carries the minus, so it reads the same either way the server sent it.
  return { negative, positive, net: positive + negative };
};

const LegacyOldRecordSearch = () => {
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  /**
   * How the balance column splits into its negative and positive halves, over
   * EVERY party the search matches -- not over the page on screen.
   *
   * ⚠️ THE LIST IS PAGED, so `rows` is one page and never the set. Two things
   * can answer this: `serverTotals`, which the API sends beside the page where
   * it is built to, and `computedTotals`, added up below from a second call
   * that asks for every match at once. Where the API answers, it wins and the
   * second call is never made.
   *
   * ⚠️ AND THE SECOND CALL IS ONLY BELIEVED WHEN IT PROVES ITSELF WHOLE. A
   * server that caps `per_page` hands back a prefix and calls it the answer --
   * a smaller total that still looks like a total, with nothing to show it is
   * short. One page back means every match came back; more than one, and the
   * figures are left off altogether rather than shown short.
   *
   * ⚠️ THE SIGN IS THE OLD SYSTEM'S OWN. Its convention was reversed around
   * mid-2022 (see the note at the head of this file), so for a party whose last
   * entry predates the flip, positive and negative may read the wrong way round.
   * The line under the figures says so.
   */
  const [serverTotals, setServerTotals] = useState<{
    negative: number;
    positive: number;
    net?: number;
  } | null>(null);

  const [computedTotals, setComputedTotals] = useState<{
    negative: number;
    positive: number;
    net?: number;
  } | null>(null);

  const totals = serverTotals ?? computedTotals;

  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);
  const [source, setSource] = useState("");

  useEffect(() => {
    httpService
      .get(API_LEGACY_OLD_SOURCES_URL)
      .then((res) => {
        const list = res?.data?.data?.data?.rows ?? res?.data?.data?.rows ?? [];
        const options = (Array.isArray(list) ? list : []).map((s: any) => ({
          id: String(s.source),
          name: String(s.label ?? s.source),
        }));
        setSources(options);
        if (options.length === 1) setSource(options[0].id);
      })
      .catch(() => setSources([]));
  }, []);

  const [card, setCard] = useState<any>(null);
  const [cardLoading, setCardLoading] = useState(false);

  const [bill, setBill] = useState<LegacyOldInvoice | null>(null);
  const [billLoading, setBillLoading] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Legacy Invoice ${(bill as any)?.legacy_no ?? ""}`.trim(),
  });

  const [perPage, setPerPage] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await httpService.get(API_LEGACY_OLD_PARTIES_URL, {
        params: { q: term.trim(), page, per_page: perPage, source: source || undefined },
      });

      const data = res?.data?.data?.data ?? res?.data?.data ?? {};
      const list = data.rows?.data ?? [];

      setRows(list);
      setTotalPages(data.rows?.last_page ?? 1);
      setServerTotals(data.totals ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not read the old record");
      setServerTotals(null);
    } finally {
      setLoading(false);
    }
  }, [term, page, perPage, source]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * The whole matching set, fetched once per search purely to add it up.
   *
   * ⚠️ DEBOUNCED, and apart from `load` on purpose. `load` runs on every
   * keystroke and again on every page turn; this answers only to the search
   * term and the source, so turning a page does not drag a thousand rows over
   * the wire to arrive at a number that had not changed.
   *
   * ⚠️ THE `last_page` CHECK IS THE WHOLE POINT of this call, not a detail: it
   * is how we know the server gave us the set rather than the first slice of
   * it. See the note on `computedTotals` above.
   */
  useEffect(() => {
    // The API already answered; do not ask for it twice.
    if (serverTotals) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const res = await httpService.get(API_LEGACY_OLD_PARTIES_URL, {
          params: {
            q: term.trim(),
            page: 1,
            per_page: WHOLE_SET_PER_PAGE,
            source: source || undefined,
          },
        });

        const data = res?.data?.data?.data ?? res?.data?.data ?? {};
        if (cancelled) return;

        if (data.totals) {
          setServerTotals(data.totals);
        } else if ((data.rows?.last_page ?? 1) > 1) {
          setComputedTotals(null);
        } else {
          setComputedTotals(splitBalance(data.rows?.data ?? []));
        }
      } catch {
        if (!cancelled) setComputedTotals(null);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, source, serverTotals]);

  const openCard = async (party: any) => {
    setCardLoading(true);
    setBill(null);

    try {
      const res = await httpService.get(
        `${API_LEGACY_OLD_PARTY_URL}/${encodeURIComponent(party.legacy_id)}`,
        { params: { party_type: party.party_type, source: party.source } }
      );

      setCard(res?.data?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not open that party's record");
    } finally {
      setCardLoading(false);
    }
  };

  // A sale or a purchase has a bill behind it. A cash row, an opening row or a
  // sales return is a line in a ledger and has nothing more to show.
  const hasBill = (row: any) =>
    !!row?.legacy_no && (row.doc_type === "sale" || row.doc_type === "purchase");

  const openBill = async (row: any) => {
    if (!hasBill(row)) return;

    setBillLoading(true);

    try {
      const res = await httpService.get(`${API_LEGACY_OLD_INVOICE_URL}/${row.id}`);
      setBill(res?.data?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not open that bill");
    } finally {
      setBillLoading(false);
    }
  };

  // ------------------------------------------------------------- one bill

  if (bill) {
    return (
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <button
              type="button"
              onClick={() => setBill(null)}
              className="mb-2 flex items-center gap-1 text-sm text-blue-700 hover:underline"
            >
              <FiArrowLeft /> Back to {card?.party?.name}
            </button>
            <h1 className="text-lg font-semibold">
              পুরনো ভার্সনের বিল #{(bill as any)?.bill_no_printed ?? (bill as any)?.legacy_no}
            </h1>
            <p className="text-sm text-gray-600">
              আগের ভার্সনের ERP থেকে নেওয়া রেকর্ড — এখানে কোনো হিসাব হয় না, খাতায়
              কিছু পোস্ট হয় না।
            </p>
          </div>

          <PrintButton onClick={handlePrint} label="Print" className="px-6" />
        </div>

        <div className="overflow-hidden rounded border border-gray-300">
          <LegacyOldInvoicePrint ref={printRef} invoice={bill} />
        </div>
      </div>
    );
  }

  // ------------------------------------------------------- one party's card

  if (card) {
    const rows = card.rows ?? [];

    return (
      <div className="p-4">
        <button
          type="button"
          onClick={() => setCard(null)}
          className="mb-3 flex items-center gap-1 text-sm dark:text-white text-gray-600 underline hover:underline"
        >
          <FiArrowLeft /> নতুন করে খুঁজুন
        </button>

        <div className="mb-4 rounded border border-gray-300 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">{card.party?.name}</h1>
              <div className="text-sm">
                {card.party?.address}
                {card.party?.phone ? ` — ${card.party.phone}` : ""}
              </div>
              <div className="mt-1 text-xs">
                পুরনো সিস্টেমের আইডি {card.party?.legacy_id}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs">সর্বশেষ ব্যালেন্স</div>
              <div className="text-xl font-semibold">
                {money(card.summary?.closing)}
              </div>
              <div className="text-xs">
                {card.summary?.bills ?? 0} টা বিল, {card.summary?.cash_rows ?? 0} টা
                জমা-খরচ
                {card.summary?.returns ? `, ${card.summary.returns} টা ফেরত` : ""}
              </div>
            </div>
          </div>

          {/* The flip, said plainly. Without this line somebody totals the two
              columns in their head and gets a number the old system never
              agreed with. */}
          <p className="mt-3 border-t pt-2 text-xs">
            পুরনো ভার্সনের রেকর্ড — এখানে কোনো হিসাব হয় না, খাতায় কিছু পোস্ট হয় না।
            বিলের লাইনে ক্লিক করলে বিলটা খুলবে।
            <br />
            ⚠️ পুরনো সফটওয়্যারটি ২০২২ সালের মাঝামাঝি ডেবিট-ক্রেডিট উল্টে দিয়েছিল —
            তাই আগের বিক্রি ডেবিট ঘরে, পরের বিক্রি ক্রেডিট ঘরে বসে আছে। ঘরদুটো
            পুরনো সিস্টেম যেমন ছাপিয়েছিল ঠিক তেমনই দেখানো হচ্ছে, যোগ করা হয়নি।
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
              {
                key: "particulars",
                header: "বিবরণ",
                render: (row: any) => (
                  <span className="flex items-center gap-1">
                    {row.particulars}
                    {hasBill(row) ? (
                      <FiExternalLink className="text-blue-600" title="বিল দেখুন" />
                    ) : null}
                  </span>
                ),
              },
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
            data={rows}
            onRowClick={openBill}
            rowClassName={(row: any) => (hasBill(row) ? "cursor-pointer" : "")}
            getRowKey={(row: any) => row.id}
            noDataMessage="এই পার্টির কোনো লেনদেন পাওয়া যায়নি"
          />
        </div>

        {billLoading ? (
          <div className="mt-3 text-sm text-gray-600">বিল আনা হচ্ছে…</div>
        ) : null}
      </div>
    );
  }

  // ------------------------------------------------------------------ search

  // The server may send the negative half as a signed sum or as a magnitude.
  // The label carries the minus either way, so take the magnitude and the
  // figure reads the same whichever it was sent as.
  const negativeTotal = Math.abs(Number(totals?.negative) || 0);
  const positiveTotal = Number(totals?.positive) || 0;
  const netTotal =
    totals?.net != null ? Number(totals.net) : positiveTotal - negativeTotal;

  // Nothing to stand on with no matches: with the search finding nobody the
  // three figures would all be a bare dash, which reads as a broken strip
  // rather than as an empty result. The table below already says it found none.
  const showTotals = !!totals && rows.length > 0;

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">পুরনো ভার্সনের ERP-র রেকর্ড</h1>
            <p className="text-sm dark:text-white text-gray-600">
              কাস্টমারের নাম বা মোবাইল নম্বর দিয়ে খুঁজুন।
            </p>
          </div>

          {/* The balance column's +/− split, over every party the search
              matched. Beside the heading rather than in a footer row: these
              three describe the whole set, which is what the heading announces,
              and a footer would sit under নাম/ঠিকানা/মোবাইল columns that have no
              heading for them.

              No red or green on the two halves. Which sign means owing is the
              old system's own convention, not ours, and the line underneath
              says as much -- colouring one side red would assert what we do
              not know. */}
          {showTotals ? (
            <div className="flex flex-wrap justify-end gap-x-6 gap-y-2 text-right">
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  (−) ব্যালেন্স — মোট
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {thousandSeparator(negativeTotal)}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  (+) ব্যালেন্স — মোট
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {thousandSeparator(positiveTotal)}
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  নিট ((+) − (−))
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {thousandSeparator(netTotal)}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* The same caveat the party card carries, for the same reason: the old
            system flipped its sign convention part-way through, and a party
            whose last entry predates that flip reads the other way. */}
        {showTotals ? (
          <p className="mt-2 text-xs text-gray-500">
            ⚠️ পুরনো সিস্টেমের নিজের চিহ্ন অনুযায়ী — ২০২২ সালের মাঝামাঝি চিহ্নের
            রীতি উল্টে যাওয়ায় যেসব পার্টির শেষ লেনদেন তার আগের, তাদের (+) ও (−)
            পাশ উল্টো পড়তে পারে। খাতার সাথে মিলিয়ে দেখে নিন।
          </p>
        ) : null}
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="w-full sm:w-28">
          <SelectOption
            id="legacy-old-per-page"
            className="w-full!"
            onChange={(e: any) => {
              const v = Number(e.target.value);
              setPerPage(v > 0 ? v : 1000);
              setPage(1);
            }}
          />
        </div>

        {/* Only where there is a choice. One old system, no picker. */}
        {sources.length > 1 ? (
          <div className="w-full sm:w-56">
            <DropdownCommon
              id="legacy-old-source"
              name="source"
              label="কোন সিস্টেম"
              className="w-full"
              data={[{ id: "", name: "সব সিস্টেম" }, ...sources]}
              value={source}
              onChange={(e: any) => {
                setSource(e.target.value);
                setPage(1);
              }}
            />
          </div>
        ) : null}

        <div className="w-full">
          <SearchInput
            search={term}
            setSearchValue={(value: string) => {
              setTerm(value);
              setPage(1);
            }}
            className="w-full"
            id="legacy-old-search"
            label="নাম বা মোবাইল"
          />
        </div>
      </div>

      <p className="-mt-2 mb-3 text-xs text-gray-500">
        দুটো ফরম্যাটেই কাজ করবে — 01712-437131 আর 01712437131
      </p>

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
                render: (_row: any, index: number) => (page - 1) * perPage + index + 1,
              },
              { key: "name", header: "নাম" },
              ...(sources.length > 1
                ? [
                    {
                      key: "source",
                      header: "সিস্টেম",
                      render: (row: any) =>
                        sources.find((s) => s.id === String(row.source))?.name ??
                        row.source,
                    },
                  ]
                : []),
              {
                key: "address",
                header: "ঠিকানা",
                render: (row: any) => row.address ?? "—",
              },
              {
                key: "phone",
                header: "মোবাইল",
                render: (row: any) => row.phone ?? "—",
              },
              {
                key: "documents",
                header: "লেনদেন",
                headerClass: "text-center",
                cellClass: "text-right",
                render: (row: any) => row.documents ?? 0,
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
            onRowClick={openCard}
            rowClassName={() => "cursor-pointer"}
            getRowKey={(row: any) => `${row.source}-${row.party_type}-${row.legacy_id}`}
            noDataMessage={
              loading
                ? "আনা হচ্ছে…"
                : term.trim() === ""
                  ? "পুরনো ভার্সনের কোনো কাস্টমার এখনো আনা হয়নি"
                  : "এই নামে বা নম্বরে কাউকে পাওয়া যায়নি"
            }
          />
        </div>
      </div>

      {cardLoading ? <Loader /> : null}

      {totalPages > 1 ? (
        <div className="mt-3">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            handlePageChange={(next: number) => setPage(next)}
          />
        </div>
      ) : null}
    </div>
  );
};

export default LegacyOldRecordSearch;
