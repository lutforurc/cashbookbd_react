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
const LegacyOldRecordSearch = () => {
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

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
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not read the old record");
    } finally {
      setLoading(false);
    }
  }, [term, page, perPage, source]);

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-lg font-semibold">পুরনো ভার্সনের ERP-র রেকর্ড</h1>
        <p className="text-sm dark:text-white text-gray-600">
          কাস্টমারের নাম বা মোবাইল নম্বর দিয়ে খুঁজুন।
        </p>
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
