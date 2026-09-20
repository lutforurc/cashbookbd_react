import { useCallback, useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";
import { FiArrowLeft, FiExternalLink } from "react-icons/fi";

import Table from "../../utils/others/Table";
import Pagination from "../../utils/utils-functions/Pagination";
import SearchInput from "../../utils/fields/SearchInput";
import Loader from "../../../common/Loader";
import { PrintButton } from "../../../pages/UiElements/CustomButtons";

import httpService from "../../services/httpService";
import {
  API_LEGACY_INVOICE_URL,
  API_LEGACY_PARTIES_URL,
  API_LEGACY_PARTY_URL,
} from "../../services/apiRoutes";
import { money } from "../hotel/setupHelpers";

import LegacyInvoicePrint, { LegacyInvoice } from "./LegacyInvoicePrint";

/**
 * The archive of an old RAAJRANI ERP the client migrated off.
 *
 * Somebody walks in and asks what they took in 2022. Type their name or their
 * mobile number, open their card, open the bill. Print it if they want it.
 *
 * ⚠️ NOTHING HERE IS EDITED OR POSTED. There is no form on this screen, no
 * save, no delete -- and not one taka of it reaches the ledger. The client
 * started their new books from an opening balance that already summarises
 * everything here, so posting it again would count every taka twice. The
 * heading says as much, because a screen that looks like a ledger invites
 * somebody to treat it as one.
 *
 * ⚠️ THE NAME FINDS THE PARTY; THE OLD SYSTEM'S ID DOES THE REST. Two bills
 * for one person read "Robiul Islam" and "Robiul Islam/Tolar Gate", so the
 * search is on the name -- and everything after that goes by `legacy_id`.
 * Picking the wrong Robiul Islam off the list still shows only that Robiul
 * Islam's own bills, which is the whole point of holding the id.
 *
 * The mobile is matched on digits, so 01712-437131 and 01712437131 both find
 * the same person: the old system keeps numbers in several shapes and nobody
 * at the counter knows which.
 */
const LegacyRecordSearch = () => {
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [card, setCard] = useState<any>(null);
  const [cardLoading, setCardLoading] = useState(false);

  const [bill, setBill] = useState<LegacyInvoice | null>(null);
  const [billLoading, setBillLoading] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Legacy Invoice ${(bill as any)?.legacy_no ?? ""}`.trim(),
  });

  const load = useCallback(async () => {
    if (term.trim().length < 2) {
      setRows([]);
      setTotalPages(1);
      return;
    }

    setLoading(true);

    try {
      const res = await httpService.get(API_LEGACY_PARTIES_URL, {
        params: { q: term.trim(), page, per_page: 20 },
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
  }, [term, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openCard = async (party: any) => {
    setCardLoading(true);
    setBill(null);

    try {
      const res = await httpService.get(`${API_LEGACY_PARTY_URL}/${party.legacy_id}`, {
        params: { party_type: party.party_type },
      });

      setCard(res?.data?.data?.data ?? null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not open that party's record");
    } finally {
      setCardLoading(false);
    }
  };

  const openBill = async (row: any) => {
    // Only a sale has a bill behind it. A payment or an opening row is a line
    // in a ledger and has nothing more to show.
    if (row.doc_type !== "sale" || !row.legacy_no) return;

    setBillLoading(true);

    try {
      const res = await httpService.get(`${API_LEGACY_INVOICE_URL}/${row.id}`);
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
              পুরনো সিস্টেমের বিল #{(bill as any)?.legacy_no}
            </h1>
            <p className="text-sm text-gray-600">
              RAAJRANI ERP থেকে নেওয়া রেকর্ড — এখানে কোনো হিসাব হয় না, খাতায় কিছু
              পোস্ট হয় না।
            </p>
          </div>

          <PrintButton onClick={handlePrint} label="Print" className="px-6" />
        </div>

        <div className="overflow-hidden rounded border border-gray-300 bg-white">
          <LegacyInvoicePrint ref={printRef} invoice={bill} />
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
          className="mb-3 flex items-center gap-1 text-sm text-blue-700 hover:underline"
        >
          <FiArrowLeft /> নতুন করে খুঁজুন
        </button>

        <div className="mb-4 rounded border border-gray-300 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">{card.party?.name}</h1>
              <div className="text-sm text-gray-600">
                {card.party?.address}
                {card.party?.phone ? ` — ${card.party.phone}` : ""}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                পুরনো সিস্টেমের আইডি {card.party?.legacy_id}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-500">সর্বশেষ ব্যালেন্স</div>
              <div className="text-xl font-semibold">
                {money(card.summary?.closing)}
              </div>
              <div className="text-xs text-gray-500">
                {card.summary?.bills ?? 0} টা বিল, {card.summary?.payments ?? 0} টা জমা
              </div>
            </div>
          </div>

          <p className="mt-3 border-t pt-2 text-xs text-gray-500">
            পুরনো সিস্টেমের রেকর্ড — এখানে কোনো হিসাব হয় না, খাতায় কিছু পোস্ট হয় না।
            বিলের লাইনে ক্লিক করলে বিলটা খুলবে।
          </p>
        </div>

        <div className="rounded border border-gray-300 bg-white">
          <Table
            columns={[
              {
                key: "doc_date",
                header: "তারিখ",
                render: (row: any) => row.doc_date ?? "—",
              },
              {
                key: "particulars",
                header: "বিবরণ",
                render: (row: any) => (
                  <span className="flex items-center gap-1">
                    {row.particulars}
                    {row.doc_type === "sale" && row.legacy_no ? (
                      <FiExternalLink className="text-blue-600" title="বিল দেখুন" />
                    ) : null}
                  </span>
                ),
              },
              {
                key: "debit",
                header: "ডেবিট",
                cellClass: "text-right",
                render: (row: any) => money(row.debit),
              },
              {
                key: "credit",
                header: "ক্রেডিট",
                cellClass: "text-right",
                render: (row: any) => money(row.credit),
              },
              {
                key: "balance",
                header: "ব্যালেন্স",
                cellClass: "text-right",
                render: (row: any) => money(row.balance),
              },
            ]}
            data={rows}
            onRowClick={openBill}
            rowClassName={(row: any) =>
              row.doc_type === "sale" && row.legacy_no ? "cursor-pointer" : ""
            }
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
        <h1 className="text-lg font-semibold">পুরনো ERP-র রেকর্ড</h1>
        <p className="text-sm text-gray-600">
          কাস্টমারের নাম বা মোবাইল নম্বর দিয়ে খুঁজুন। RAAJRANI ERP থেকে নেওয়া
          রেকর্ড — এখানে কোনো হিসাব হয় না, খাতায় কিছু পোস্ট হয় না।
        </p>
      </div>

      <div className="mb-3 max-w-xl">
        <SearchInput
          search={term}
          setSearchValue={(value: string) => {
            setTerm(value);
            setPage(1);
          }}
          className=""
          id="legacy-search"
          label="নাম বা মোবাইল"
        />
        <p className="mt-1 text-xs text-gray-500">
          দুটো ফরম্যাটেই কাজ করবে — 01712-437131 আর 01712437131।
        </p>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="rounded border border-gray-300 bg-white">
          <Table
            columns={[
              { key: "name", header: "নাম" },
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
                cellClass: "text-right",
                render: (row: any) => row.documents ?? 0,
              },
              {
                key: "balance",
                header: "ব্যালেন্স",
                cellClass: "text-right",
                render: (row: any) => money(row.balance),
              },
            ]}
            data={rows}
            onRowClick={openCard}
            rowClassName={() => "cursor-pointer"}
            getRowKey={(row: any) => `${row.party_type}-${row.legacy_id}`}
            noDataMessage={
              term.trim().length < 2
                ? "কমপক্ষে দুই অক্ষর লিখুন"
                : "এই নামে বা নম্বরে কাউকে পাওয়া যায়নি"
            }
          />
        </div>
      )}

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

export default LegacyRecordSearch;
