import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  FiClipboard,
  FiFilePlus,
  FiFileText,
  FiPaperclip,
  FiPrinter,
  FiRefreshCcw,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";
import dayjs from "dayjs";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import InputElement from "../../../utils/fields/InputElement";
import InputDatePicker from "../../../utils/fields/DatePicker";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import httpService from "../../../services/httpService";
import {
  API_UNIT_SALE_ALLOTMENT_LETTER_URL,
  API_UNIT_SALE_BOOKING_FORM_URL,
  API_UNIT_SALE_DOCUMENTS_URL,
} from "../../../services/apiRoutes";
import { fetchSoldUnits } from "./unitSaleSlice";
import { fetchProjectDdl } from "../project/projectSlice";
import { fetchBuildingDdl } from "../buildings/buildingsSlice";
import ConfirmModal from "../../../utils/components/ConfirmModalProps";
import { hasPermission } from "../../../utils/permissionChecker";
import { SoldUnitCustomer, SoldUnitRow } from "./types";
import {
  customerColor,
  edgeStyle,
  money,
  reportTotals,
  saleLines,
  saleReceipts,
} from "./soldUnitReport";
import SoldUnitListPrint from "./SoldUnitListPrint";
import SaleNomineeModal from "./SaleNomineeModal";

const cellBase = "border border-stroke px-2 py-1.5 dark:border-strokedark";

/** 1.5 MB, the same ceiling SaleDocumentController enforces. */
const MAX_DOCUMENT_BYTES = 1.5 * 1024 * 1024;

const SoldUnitList: React.FC = () => {
  const dispatch = useDispatch<any>();

  const { soldUnits, soldUnitsLoading } = useSelector(
    (state: any) => state.unitSale
  );
  const projectDdl = useSelector((state: any) => state.realEstateProjects?.projectDdl);
  const buildingDdl = useSelector((state: any) => state.buildings?.buildingDdl);
  // The branch's own numbering, e.g. 'BST/ALLOT'. Unset, this screen suggests
  // nothing and the server falls back to the project's initials.
  const letterRefPrefix = String(
    useSelector((state: any) => state.settings?.data?.branch?.letter_ref_prefix) ?? ""
  ).trim();
  // The date the branch dates its letters. Unset, a letter is offered the day it
  // is being issued.
  const letterRefDate = String(
    useSelector((state: any) => state.settings?.data?.branch?.letter_ref_date) ?? ""
  ).trim();
  // Withdrawing an issued paper is its own permission, granted separately from
  // issuing one. Without it the chips print and nothing more.
  const permissions = useSelector((state: any) => state.settings?.data?.permissions) ?? [];
  const canDeleteLetter = hasPermission(permissions, "allotment.letter.delete");
  const canDeleteBookingForm = hasPermission(permissions, "booking.form.delete");

  const [projectId, setProjectId] = useState<string>("");
  const [buildingId, setBuildingId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [q, setQ] = useState("");
  const [dueOnly, setDueOnly] = useState(false);
  // The sale whose letter is being issued or printed — one at a time.
  const [busySaleId, setBusySaleId] = useState<number | null>(null);
  // The sale waiting on the confirmation. Issuing a letter is not undoable —
  // every click adds a version that stays on the record for good.
  const [confirmUnit, setConfirmUnit] = useState<SoldUnitRow | null>(null);
  // Which paper that confirmation is about. The two are issued the same way and
  // headed the same way, so they share the dialog rather than duplicating it.
  const [confirmKind, setConfirmKind] = useState<"LETTER" | "BOOKING">("LETTER");
  // What the letter about to be issued will be headed with. Both are the
  // office's to write: the reference has to match whatever the paper register
  // already says, and a letter sent late carries the day it went out, not the
  // day of the sale.
  const [refNo, setRefNo] = useState("");
  const [refDate, setRefDate] = useState<Date | null>(null);
  // The sale whose deed is about to be removed. Asked first: there is no second
  // copy of a scanned deed anywhere in the system.
  const [confirmDeleteUnit, setConfirmDeleteUnit] = useState<SoldUnitRow | null>(null);
  // The sale whose nominees are being named. Done here as well as at booking:
  // most buyers settle on a nominee after the money has been taken.
  const [nomineeUnit, setNomineeUnit] = useState<SoldUnitRow | null>(null);
  // The issued paper waiting to be withdrawn. Asked first, and named in full in
  // the question: this removes a copy that may already have been handed over.
  const [confirmWithdraw, setConfirmWithdraw] = useState<{
    unit: SoldUnitRow;
    kind: "LETTER" | "BOOKING";
    version: number;
  } | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  // One picker, re-pointed at whichever row was clicked. A file input per row
  // would put hundreds of them on a page where one is used at a time.
  const filePickerRef = useRef<HTMLInputElement>(null);
  const pickingSaleId = useRef<number | null>(null);

  const customers: SoldUnitCustomer[] = soldUnits?.data ?? [];
  // Re-added from the whole taka on the page, so the cards and the grand total
  // agree with the column above them.
  const totals = useMemo(
    () => reportTotals(customers, soldUnits?.totals),
    [customers, soldUnits?.totals]
  );

  const projectOptions = useMemo(
    () => [
      { id: "", name: "All Projects" },
      ...(Array.isArray(projectDdl)
        ? projectDdl.map((p: any) => ({ id: p.value, name: p.label }))
        : []),
    ],
    [projectDdl]
  );

  const buildingOptions = useMemo(
    () => [
      { id: "", name: "All Buildings" },
      ...(Array.isArray(buildingDdl)
        ? buildingDdl.map((b: any) => ({ id: b.value, name: b.label }))
        : []),
    ],
    [buildingDdl]
  );

  const loadData = (override?: Record<string, any>) => {
    const params = {
      project_id: projectId ? Number(projectId) : undefined,
      building_id: buildingId ? Number(buildingId) : undefined,
      date_from: dateFrom ? dayjs(dateFrom).format("YYYY-MM-DD") : undefined,
      date_to: dateTo ? dayjs(dateTo).format("YYYY-MM-DD") : undefined,
      q: q.trim() || undefined,
      due_only: dueOnly || undefined,
      ...(override ?? {}),
    };

    dispatch(fetchSoldUnits(params))
      .unwrap()
      .catch((message: string) => toast.info(message || "Failed to load list"));
  };

  useEffect(() => {
    dispatch(fetchProjectDdl(""));
    dispatch(fetchBuildingDdl(""));
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    setProjectId("");
    setBuildingId("");
    setDateFrom(null);
    setDateTo(null);
    setQ("");
    setDueOnly(false);
    loadData({
      project_id: undefined,
      building_id: undefined,
      date_from: undefined,
      date_to: undefined,
      q: undefined,
      due_only: undefined,
    });
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: "Customer Wise Sold Unit List",
    removeAfterPrint: true,
  });

  /**
   * The allotment letter is built server side, so it is fetched with the auth
   * header rather than linked to and comes back as a blob. The tab is opened on
   * the click itself — opening it after the request returns gets caught by the
   * popup blocker — and falls back to a plain download when it is blocked anyway.
   */
  const handleAllotmentLetter = (saleId: number) =>
    openSalePdf(
      saleId,
      `${API_UNIT_SALE_ALLOTMENT_LETTER_URL}${saleId}`,
      `allotment-letter-demo-${saleId}`,
    );

  /** Prints an issued letter back from the copy stored on the sale. */
  const handlePrintLetter = (saleId: number, version: number) =>
    openSalePdf(
      saleId,
      `${API_UNIT_SALE_ALLOTMENT_LETTER_URL}${saleId}/print/${version}`,
      `allotment-letter-${saleId}-L${version}`,
    );

  /**
   * Opens the confirmation with the reference and date it will be headed with.
   *
   * The reference offered is the branch's own, exactly as it was written; the
   * clerk finishes it against the paper register. Blank when the branch has set
   * none — the server then derives one, and blank says so honestly rather than
   * guessing at the rule in a second place.
   *
   * The branch's date is used when it has set one, and today's when it has not.
   * Either is only an offer -- it is shown in the dialog so a date left behind in
   * the settings is seen and corrected rather than printed unnoticed.
   */
  const askToGenerate = (unit: SoldUnitRow, kind: "LETTER" | "BOOKING" = "LETTER") => {
    const parsed = letterRefDate ? dayjs(letterRefDate) : null;

    setConfirmUnit(unit);
    setConfirmKind(kind);
    setRefDate(parsed?.isValid() ? parsed.toDate() : new Date());
    // The letter's own prefix is not offered for a booking form: the two are
    // numbered in separate series, and BST/ALLOT on a booking form would be
    // wrong in a way nobody notices until the register is reconciled.
    setRefNo(kind === "LETTER" ? letterRefPrefix : "");
  };

  /**
   * Issues a letter. The server renders it once and appends the copy, so the
   * list only has to learn that one more version now exists.
   */
  const handleGenerateLetter = async () => {
    const saleId = confirmUnit?.sale_id;
    if (!saleId || busySaleId) return;

    setBusySaleId(saleId);

    try {
      const response = await httpService.post(
        `${API_UNIT_SALE_ALLOTMENT_LETTER_URL}generate/${saleId}`,
        {
          // Left out when empty, so the server keeps deriving what it always did.
          ref_no: refNo.trim() || undefined,
          ref_date: refDate ? dayjs(refDate).format("YYYY-MM-DD") : undefined,
        },
      );
      toast.success(response?.data?.message || "Allotment letter generated");
      setConfirmUnit(null);
      loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || "Could not generate the letter",
      );
    } finally {
      setBusySaleId(null);
    }
  };

  /**
   * The booking form: the buyer's own papers, the property, and the nominees
   * standing against it. Issued and reprinted exactly as the letter is, on its
   * own B-n series.
   */
  const handleBookingFormDemo = (saleId: number) =>
    openSalePdf(
      saleId,
      `${API_UNIT_SALE_BOOKING_FORM_URL}${saleId}`,
      `booking-form-demo-${saleId}`,
      "booking form",
    );

  const handlePrintBookingForm = (saleId: number, version: number) =>
    openSalePdf(
      saleId,
      `${API_UNIT_SALE_BOOKING_FORM_URL}${saleId}/print/${version}`,
      `booking-form-${saleId}-B${version}`,
      "booking form",
    );

  const handleGenerateBookingForm = async () => {
    const saleId = confirmUnit?.sale_id;
    if (!saleId || busySaleId) return;

    setBusySaleId(saleId);

    try {
      const response = await httpService.post(
        `${API_UNIT_SALE_BOOKING_FORM_URL}generate/${saleId}`,
        {
          ref_no: refNo.trim() || undefined,
          ref_date: refDate ? dayjs(refDate).format("YYYY-MM-DD") : undefined,
        },
      );
      toast.success(response?.data?.message || "Booking form generated");
      setConfirmUnit(null);
      loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || "Could not generate the booking form",
      );
    } finally {
      setBusySaleId(null);
    }
  };

  /**
   * Withdraws one issued letter or booking form.
   *
   * The number is not reused afterwards -- the server issues past the highest
   * ever used -- so the chips can go from L-1 L-2 L-3 to L-1 L-3, and never to
   * two different papers both called L-2.
   */
  const handleWithdraw = async () => {
    if (!confirmWithdraw || busySaleId) return;

    const { unit, kind, version } = confirmWithdraw;
    const stem =
      kind === "LETTER" ? API_UNIT_SALE_ALLOTMENT_LETTER_URL : API_UNIT_SALE_BOOKING_FORM_URL;

    setBusySaleId(unit.sale_id);

    try {
      const response = await httpService.delete(`${stem}${unit.sale_id}/${version}`);

      // The API answers a missing version with success:false on a 2xx, so the
      // catch below never sees it.
      if (response?.data?.success === false) {
        throw new Error(response?.data?.message || "Could not remove it");
      }

      toast.success(response?.data?.message || "Removed");
      setConfirmWithdraw(null);
      loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || "Could not remove it",
      );
    } finally {
      setBusySaleId(null);
    }
  };

  /**
   * The numbers to put on the chips.
   *
   * The report sends the versions that exist; a count is the fallback for a
   * server that has not been updated yet, where 1..n is still true.
   */
  const issuedVersions = (versions?: number[], count?: number) =>
    Array.isArray(versions) && versions.length
      ? versions
      : Array.from({ length: Number(count) || 0 }, (_, i) => i + 1);

  /**
   * Fetches a server-built PDF and shows it.
   *
   * @param label what to call the paper when something goes wrong -- this opens
   *              allotment letters and booking forms alike, and an error naming
   *              the wrong one sends the clerk looking in the wrong place.
   */
  const openSalePdf = async (
    saleId: number,
    url: string,
    fileTag: string,
    label = "allotment letter",
  ) => {
    if (busySaleId) return;

    const letterTab = window.open("", "_blank");
    setBusySaleId(saleId);

    try {
      const response = await httpService.get(url, { responseType: "blob" });

      // A refusal comes back as JSON on a 2xx, so it never reaches the catch —
      // it has to be spotted by the blob's own type before it is shown as a PDF.
      if (response.data?.type?.includes("json")) {
        const message = JSON.parse(await response.data.text())?.message;
        throw new Error(message || `The ${label} is not available`);
      }

      const fileUrl = URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );

      if (letterTab) {
        letterTab.location.href = fileUrl;
      } else {
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = `${fileTag}.pdf`;
        link.click();
      }

      // Give the viewer time to load before dropping the blob.
      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    } catch (error: any) {
      letterTab?.close();
      toast.error(error?.message || `Failed to build the ${label}`);
    } finally {
      setBusySaleId(null);
    }
  };

  const documentsUrl = (saleId: number) =>
    `${API_UNIT_SALE_DOCUMENTS_URL}${saleId}/documents`;

  const openFilePicker = (saleId: number) => {
    if (busySaleId) return;
    pickingSaleId.current = saleId;
    // Cleared first, so choosing the same file twice still fires onChange.
    if (filePickerRef.current) filePickerRef.current.value = "";
    filePickerRef.current?.click();
  };

  /**
   * Attaches the scanned deed, or replaces the one already there.
   *
   * The picker is opened from a ref rather than a visible file input: a bare
   * "Choose file" box in a report column is noise on every row, including the
   * hundreds nobody is filing today.
   */
  const handleDocumentPick = async (saleId: number, file?: File | null) => {
    if (!file || busySaleId) return;

    if (file.type !== "application/pdf") {
      toast.error("The deed must be a PDF.");
      return;
    }

    // Checked here as well as on the server: an oversized scan is refused
    // before it is uploaded, rather than after the wait.
    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error(
        `The document must be 1.5 MB or smaller — this one is ${(
          file.size /
          (1024 * 1024)
        ).toFixed(1)} MB.`,
      );
      return;
    }

    setBusySaleId(saleId);
    const body = new FormData();
    body.append("file", file);

    try {
      // httpService defaults POST to application/json, which would send the
      // form as an empty body and the server would answer "the file field is
      // required". Naming multipart lets axios set the boundary itself.
      const response = await httpService.post(documentsUrl(saleId), body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(response?.data?.message || "Document saved");
      loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || "Could not save the document",
      );
    } finally {
      setBusySaleId(null);
    }
  };

  /** Opens the stored deed. Fetched with the auth header, so it arrives as a blob. */
  const handleViewDocument = async (saleId: number) => {
    if (busySaleId) return;

    const docTab = window.open("", "_blank");
    setBusySaleId(saleId);

    try {
      const response = await httpService.get(documentsUrl(saleId), { responseType: "blob" });

      // A refusal comes back as JSON on a 2xx, so it never reaches the catch.
      if (response.data?.type?.includes("json")) {
        const message = JSON.parse(await response.data.text())?.message;
        throw new Error(message || "The document is not available");
      }

      const fileUrl = URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" }),
      );

      if (docTab) {
        docTab.location.href = fileUrl;
      } else {
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = `sale-${saleId}-documents.pdf`;
        link.click();
      }

      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    } catch (error: any) {
      docTab?.close();
      toast.error(error?.message || "Failed to open the document");
    } finally {
      setBusySaleId(null);
    }
  };

  /** Removes the stored deed. Asked first -- there is no copy to fall back on. */
  const handleDeleteDocument = async () => {
    const saleId = confirmDeleteUnit?.sale_id;
    if (!saleId || busySaleId) return;

    setBusySaleId(saleId);

    try {
      const response = await httpService.delete(documentsUrl(saleId));
      toast.success(response?.data?.message || "Document removed");
      setConfirmDeleteUnit(null);
      loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || "Could not remove the document",
      );
    } finally {
      setBusySaleId(null);
    }
  };

  const periodLabel = useMemo(() => {
    if (!dateFrom && !dateTo) return "All dates";
    const from = dateFrom ? dayjs(dateFrom).format("DD/MM/YYYY") : "Beginning";
    const to = dateTo ? dayjs(dateTo).format("DD/MM/YYYY") : "Till date";
    return `${from} to ${to}`;
  }, [dateFrom, dateTo]);


  return (
    <>
      <HelmetTitle title="Customer Wise Sold Units" />
      {soldUnitsLoading ? <Loader /> : null}

      {/* FILTERS */}
      <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-5">
        <DropdownCommon
          id="project_id"
          name="project_id"
          label="Project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="mt-1 h-[2.1rem] bg-transparent"
          data={projectOptions}
        />

        <DropdownCommon
          id="building_id"
          name="building_id"
          label="Building"
          value={buildingId}
          onChange={(e) => setBuildingId(e.target.value)}
          className="mt-1 h-[2.1rem] bg-transparent"
          data={buildingOptions}
        />

        <div className="mt-1">
          <InputElement
            id="q"
            name="q"
            label="Search (Customer, Mobile, Unit)"
            placeholder="Type customer name, mobile or unit no"
            className="h-8.5"
            value={q}
            onChange={(e: any) => setQ(e.target.value)}
          />
        </div>

        <div className="mt-0 w-full md:mt-2">
          <label className="block text-sm">Sale Date From</label>
          <InputDatePicker
            setCurrentDate={setDateFrom}
            className="h-8.5 w-full text-sm font-medium"
            selectedDate={dateFrom}
            setSelectedDate={setDateFrom}
          />
        </div>

        <div className="mt-0 w-full md:mt-2">
          <label className="block text-sm">Sale Date To</label>
          <InputDatePicker
            setCurrentDate={setDateTo}
            className="h-8.5 w-full text-sm font-medium"
            selectedDate={dateTo}
            setSelectedDate={setDateTo}
          />
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-5">
        <label className="flex h-8.5 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={dueOnly}
            onChange={(e) => setDueOnly(e.target.checked)}
          />
          Only units having due
        </label>

        <ButtonLoading
          onClick={() => loadData()}
          buttonLoading={false}
          label="Search"
          className="mr-0 h-8.5 whitespace-nowrap text-center"
          icon={<FiSearch className="ml-2 mr-2 text-lg text-white" />}
        />

        <ButtonLoading
          onClick={handleReset}
          buttonLoading={false}
          label="Reset"
          className="mr-0 h-8.5 whitespace-nowrap text-center"
          icon={<FiRefreshCcw className="ml-2 mr-2 text-lg text-white" />}
        />

        <ButtonLoading
          onClick={handlePrint}
          buttonLoading={false}
          label="Print"
          className="mr-0 h-8.5 whitespace-nowrap text-center"
          icon={<FiPrinter className="ml-2 mr-2 text-lg text-white" />}
        />
      </div>

      {/* SUMMARY */}
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        {[
          { label: "Customers", value: totals?.customer_count ?? 0, plain: true },
          { label: "Sold Units", value: totals?.unit_count ?? 0, plain: true },
          { label: "Sold Parking", value: totals?.parking_count ?? 0, plain: true },
          { label: "Parking Value", value: totals?.parking_amount ?? 0 },
          { label: "Sale Value", value: totals?.total_amount ?? 0 },
          { label: "Received", value: totals?.received_amount ?? 0 },
          { label: "Due", value: totals?.due_amount ?? 0 },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded border border-stroke bg-white px-3 py-2 dark:border-strokedark dark:bg-boxdark"
          >
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {card.label}
            </div>
            <div className="text-base font-semibold">
              {card.plain ? card.value : money(card.value)}
            </div>
          </div>
        ))}
      </div>

      {/* CUSTOMER WISE TABLE */}
      <div className="overflow-x-auto bg-white dark:bg-boxdark">
        <table className="w-full min-w-[960px] border-collapse">
          <thead>
            <tr className="bg-gray-2 text-left text-sm dark:bg-meta-4">
              <th className={`${cellBase} w-12 text-center`}>Sl</th>
              <th className={`${cellBase} w-64`}>Customer</th>
              <th className={cellBase}>Unit / Parking</th>
              <th className={`${cellBase} w-32 text-right`}>Amount</th>
              <th className={`${cellBase} w-32 text-right`}>Total</th>
              <th className={`${cellBase} w-32 text-right`}>Received</th>
              <th className={`${cellBase} w-32 text-right`}>Due</th>
              <th className={`${cellBase} w-20 text-center`}>Action</th>
            </tr>
          </thead>

          <tbody>
            {customers.length === 0 && !soldUnitsLoading && (
              <tr>
                <td
                  colSpan={8}
                  className={`${cellBase} py-6 text-center text-gray-500 dark:text-gray-400`}
                >
                  No sold unit found
                </td>
              </tr>
            )}

            {customers.map((customer, customerIndex) => {
              const color = customerColor(customerIndex).border;
              const tint = customerColor(customerIndex).tint;
              const sales = customer.units.map((unit) => ({
                unit,
                lines: saleLines(unit),
              }));
              const customerRowSpan = sales.reduce(
                (sum, sale) => sum + sale.lines.length,
                0
              );
              let rowCursor = 0;

              return (
                <React.Fragment key={customer.customer_id}>
                  {sales.map(({ unit, lines }) =>
                    lines.map((line, lineIndex) => {
                      const rowIndex = rowCursor++;
                      const isFirstRow = rowIndex === 0;
                      const isLastRow = rowIndex === customerRowSpan - 1;
                      // A merged sale cell closes the block only when its span
                      // reaches the customer's last line.
                      const saleEndsBlock =
                        rowIndex + lines.length === customerRowSpan;

                      return (
                        <tr key={`${unit.sale_id}-${lineIndex}`} className="text-sm">
                          {isFirstRow && (
                            <>
                              <td
                                rowSpan={customerRowSpan}
                                className={`${cellBase} text-center align-middle font-semibold`}
                                style={{
                                  ...edgeStyle(color, {
                                    top: true,
                                    bottom: true,
                                    left: true,
                                  }),
                                  backgroundColor: tint,
                                  color,
                                }}
                              >
                                {customerIndex + 1}
                              </td>
                              <td
                                rowSpan={customerRowSpan}
                                className={`${cellBase} align-middle`}
                                style={{
                                  ...edgeStyle(color, { top: true, bottom: true }),
                                  backgroundColor: tint,
                                }}
                              >
                                <div className="font-semibold">
                                  {customer.customer_name}
                                </div>
                                {customer.customer_address ? (
                                  <div>{customer.customer_address}</div>
                                ) : null}
                                {customer.customer_mobile ? (
                                  <div>Cell: {customer.customer_mobile}</div>
                                ) : null}
                              </td>
                            </>
                          )}

                          <td
                            className={cellBase}
                            style={edgeStyle(color, {
                              top: isFirstRow,
                              bottom: isLastRow,
                            })}
                          >
                            <div>{line.caption || "-"}</div>
                            {line.place ? (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {line.place}
                              </div>
                            ) : null}
                          </td>

                          <td
                            className={`${cellBase} text-right align-middle`}
                            style={edgeStyle(color, {
                              top: isFirstRow,
                              bottom: isLastRow,
                            })}
                          >
                            {money(line.amount)}
                          </td>

                          {lineIndex === 0 && (
                            <>
                              <td
                                rowSpan={lines.length}
                                className={`${cellBase} text-right align-middle`}
                                style={edgeStyle(color, {
                                  top: isFirstRow,
                                  bottom: saleEndsBlock,
                                })}
                              >
                                <div>{money(unit.total_amount)}</div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                  {unit.sale_date
                                    ? dayjs(unit.sale_date).format("DD/MM/YYYY")
                                    : ""}
                                </div>
                              </td>
                              <td
                                rowSpan={lines.length}
                                className={`${cellBase} text-right align-middle`}
                                style={edgeStyle(color, {
                                  top: isFirstRow,
                                  bottom: saleEndsBlock,
                                })}
                              >
                                <div>{money(unit.received_amount)}</div>
                                {/* One line per booking receipt, so a buyer who
                                    booked in more than one payment is read
                                    receipt by receipt rather than as one sum. */}
                                {saleReceipts(unit).map((receipt, index) => (
                                  <div
                                    key={`${receipt.receipt_no ?? "mr"}-${index}`}
                                    className="text-[10px] text-gray-500 dark:text-gray-400"
                                  >
                                    {receipt.payment_date
                                      ? dayjs(receipt.payment_date).format("DD/MM/YYYY")
                                      : ""}
                                    {receipt.receipt_no ? ` | ${receipt.receipt_no}` : ""}
                                  </div>
                                ))}
                              </td>
                              <td
                                rowSpan={lines.length}
                                className={`${cellBase} text-right align-middle font-semibold`}
                                style={edgeStyle(color, {
                                  top: isFirstRow,
                                  bottom: saleEndsBlock,
                                })}
                              >
                                {money(unit.due_amount)}
                              </td>
                              <td
                                rowSpan={lines.length}
                                className={`${cellBase} text-center align-middle`}
                                style={edgeStyle(color, {
                                  top: isFirstRow,
                                  bottom: saleEndsBlock,
                                  right: true,
                                })}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  {/* The page's own button, the same one the
                                      Search and Print controls above use. */}
                                  <ButtonLoading
                                    size="sm"
                                    label="Generate"
                                    title="Issue a new allotment letter and keep the copy"
                                    buttonLoading={busySaleId === unit.sale_id}
                                    disabled={busySaleId === unit.sale_id}
                                    onClick={() => askToGenerate(unit)}
                                    icon={<FiFilePlus className="text-sm" />}
                                    className="w-full whitespace-nowrap rounded disabled:opacity-50"
                                  />

                                  {/* One button per issued letter. These print the
                                      stored copy, not a fresh calculation. Each
                                      carries its own surface, so the chips read as
                                      buttons on the white card and on the dark one.
                                      The × beside it withdraws that copy, and
                                      only shows for whoever may do that. */}
                                  <div className="flex flex-wrap justify-center gap-1">
                                    {issuedVersions(unit.letter_versions, unit.letter_count).map(
                                      (version) => (
                                        <span
                                          key={version}
                                          className="inline-flex items-stretch overflow-hidden rounded border border-stroke bg-white dark:border-strokedark dark:bg-meta-4"
                                        >
                                          <button
                                            type="button"
                                            title={`Print letter L-${version} as it was issued`}
                                            disabled={busySaleId === unit.sale_id}
                                            onClick={() => handlePrintLetter(unit.sale_id, version)}
                                            className="px-2 py-0.5 text-xs font-semibold text-primary hover:bg-gray-2 disabled:opacity-50 dark:text-secondary dark:hover:bg-form-strokedark"
                                          >
                                            L-{version}
                                          </button>
                                          {canDeleteLetter && (
                                            <button
                                              type="button"
                                              title={`Withdraw letter L-${version}`}
                                              disabled={busySaleId === unit.sale_id}
                                              onClick={() =>
                                                setConfirmWithdraw({ unit, kind: "LETTER", version })
                                              }
                                              className="border-l border-stroke px-1 text-xs text-danger hover:bg-gray-2 disabled:opacity-50 dark:border-strokedark dark:hover:bg-form-strokedark"
                                            >
                                              <FiX />
                                            </button>
                                          )}
                                        </span>
                                      ),
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    title="Preview only — built from today's data, not saved"
                                    disabled={busySaleId === unit.sale_id}
                                    onClick={() => handleAllotmentLetter(unit.sale_id)}
                                    className="flex items-center gap-1 text-xs text-body hover:text-primary disabled:opacity-50 dark:text-bodydark dark:hover:text-secondary"
                                  >
                                    <FiFileText /> DEMO
                                  </button>

                                  {/* The booking form: the buyer's own papers,
                                      this property, and the nominees standing
                                      against it. Its own B-n series, because a
                                      sale can be on its third form and its
                                      first letter. */}
                                  <div className="flex flex-wrap items-center justify-center gap-1 border-t border-stroke pt-1 dark:border-strokedark">
                                    {/* Who this property is left to. Named at
                                        booking when the buyer has decided, and
                                        here when they decide later -- which is
                                        most of the time. */}
                                    <button
                                      type="button"
                                      title={
                                        unit.nominee_count
                                          ? `${unit.nominee_count} nominee${
                                              unit.nominee_count > 1 ? "s" : ""
                                            } named — change them`
                                          : "Name who this property is left to"
                                      }
                                      disabled={busySaleId === unit.sale_id}
                                      onClick={() => setNomineeUnit(unit)}
                                      className={`flex items-center gap-1 text-xs disabled:opacity-50 ${
                                        unit.nominee_count
                                          ? "text-meta-3 hover:opacity-80"
                                          : "text-body hover:text-primary dark:text-bodydark dark:hover:text-secondary"
                                      }`}
                                    >
                                      <FiUsers />
                                      {unit.nominee_count ? unit.nominee_count : "+"}
                                    </button>

                                    <button
                                      type="button"
                                      title={
                                        unit.nominee_count
                                          ? `Issue a booking form (${unit.nominee_count} nominee${
                                              unit.nominee_count > 1 ? "s" : ""
                                            })`
                                          : "Issue a booking form — no nominee named yet"
                                      }
                                      disabled={busySaleId === unit.sale_id}
                                      onClick={() => askToGenerate(unit, "BOOKING")}
                                      className="flex items-center gap-1 text-xs text-body hover:text-primary disabled:opacity-50 dark:text-bodydark dark:hover:text-secondary"
                                    >
                                      <FiClipboard /> BOOKING
                                    </button>

                                    {issuedVersions(
                                      unit.booking_form_versions,
                                      unit.booking_form_count,
                                    ).map((version) => (
                                      <span
                                        key={version}
                                        className="inline-flex items-stretch overflow-hidden rounded border border-stroke bg-white dark:border-strokedark dark:bg-meta-4"
                                      >
                                        <button
                                          type="button"
                                          title={`Print booking form B-${version} as it was issued`}
                                          disabled={busySaleId === unit.sale_id}
                                          onClick={() =>
                                            handlePrintBookingForm(unit.sale_id, version)
                                          }
                                          className="px-2 py-0.5 text-xs font-semibold text-primary hover:bg-gray-2 disabled:opacity-50 dark:text-secondary dark:hover:bg-form-strokedark"
                                        >
                                          B-{version}
                                        </button>
                                        {canDeleteBookingForm && (
                                          <button
                                            type="button"
                                            title={`Withdraw booking form B-${version}`}
                                            disabled={busySaleId === unit.sale_id}
                                            onClick={() =>
                                              setConfirmWithdraw({ unit, kind: "BOOKING", version })
                                            }
                                            className="border-l border-stroke px-1 text-xs text-danger hover:bg-gray-2 disabled:opacity-50 dark:border-strokedark dark:hover:bg-form-strokedark"
                                          >
                                            <FiX />
                                          </button>
                                        )}
                                      </span>
                                    ))}

                                    <button
                                      type="button"
                                      title="Preview the booking form — built from today's data, not saved"
                                      disabled={busySaleId === unit.sale_id}
                                      onClick={() => handleBookingFormDemo(unit.sale_id)}
                                      className="text-xs text-body hover:text-primary disabled:opacity-50 dark:text-bodydark dark:hover:text-secondary"
                                    >
                                      <FiFileText />
                                    </button>
                                  </div>

                                  {/* The scanned deed and nominee papers. One
                                      PDF per sale, and one action at a time:
                                      before there is a deed the row offers only
                                      attach, and once there is one only remove.
                                      Replacing is remove and attach again --
                                      an upload icon sitting next to the deed
                                      that is already there reads as "add
                                      another", which the sale cannot hold. */}
                                  <div className="flex items-center gap-2 border-t border-stroke pt-1 dark:border-strokedark">
                                    {unit.has_document ? (
                                      <>
                                        <button
                                          type="button"
                                          title="Open the scanned deed"
                                          disabled={busySaleId === unit.sale_id}
                                          onClick={() => handleViewDocument(unit.sale_id)}
                                          className="flex items-center gap-1 text-xs text-meta-3 hover:opacity-80 disabled:opacity-50"
                                        >
                                          <FiPaperclip /> DEED
                                        </button>
                                        <button
                                          type="button"
                                          title="Remove the scanned deed"
                                          disabled={busySaleId === unit.sale_id}
                                          onClick={() => setConfirmDeleteUnit(unit)}
                                          className="text-xs text-danger hover:opacity-80 disabled:opacity-50"
                                        >
                                          <FiTrash2 />
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        title="Attach the scanned deed and nominee papers (PDF, max 1.5 MB)"
                                        disabled={busySaleId === unit.sale_id}
                                        onClick={() => openFilePicker(unit.sale_id)}
                                        className="text-xs text-body hover:text-primary disabled:opacity-50 dark:text-bodydark dark:hover:text-secondary"
                                      >
                                        <FiUpload />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })
                  )}
                </React.Fragment>
              );
            })}
          </tbody>

          {customers.length > 0 && (
            <tfoot>
              <tr className="bg-gray-2 text-sm font-bold dark:bg-meta-4">
                <td colSpan={4} className={`${cellBase} text-right`}>
                  Grand Total ({totals?.customer_count ?? 0} customer,{" "}
                  {totals?.unit_count ?? 0} unit, {totals?.parking_count ?? 0}{" "}
                  parking)
                </td>
                <td className={`${cellBase} text-right`}>
                  {money(totals?.total_amount)}
                </td>
                <td className={`${cellBase} text-right`}>
                  {money(totals?.received_amount)}
                </td>
                <td className={`${cellBase} text-right`}>
                  {money(totals?.due_amount)}
                </td>
                <td className={cellBase}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* PRINT */}
      <div className="hidden">
        <SoldUnitListPrint
          ref={printRef}
          customers={customers}
          totals={totals}
          period={periodLabel}
        />
      </div>

      {/* Issuing a letter cannot be taken back — the version stays on the sale
          for good — so the unit and the version about to be created are named
          before it happens. */}
      <ConfirmModal
        show={Boolean(confirmUnit)}
        title={
          confirmKind === "BOOKING"
            ? "Confirm Booking Form Generation"
            : "Confirm Letter Generation"
        }
        message={
          <>
            Are you sure you want to generate{" "}
            {confirmKind === "BOOKING" ? "booking form" : "allotment letter"}
            <span className="mt-1 block font-bold">
              {confirmKind === "BOOKING"
                ? `B-${Number(confirmUnit?.booking_form_count ?? 0) + 1}`
                : `L-${Number(confirmUnit?.letter_count ?? 0) + 1}`}{" "}
              for {confirmUnit?.unit_no || confirmUnit?.parking_no || "this unit"} ?
            </span>
            {(confirmKind === "BOOKING"
              ? Number(confirmUnit?.booking_form_count ?? 0)
              : Number(confirmUnit?.letter_count ?? 0)) > 0 ? (
              <span className="mt-2 block text-xs text-body dark:text-bodydark">
                The earlier{" "}
                {confirmKind === "BOOKING" ? "form" : "letter"}
                {(confirmKind === "BOOKING"
                  ? Number(confirmUnit?.booking_form_count)
                  : Number(confirmUnit?.letter_count)) > 1
                  ? "s stay"
                  : " stays"}{" "}
                on record and can still be printed.
              </span>
            ) : null}

            {/* Said plainly rather than refused: a form is sometimes signed
                before the buyer has settled on a nominee, and the office knows
                whether this is one of those. */}
            {confirmKind === "BOOKING" && !confirmUnit?.nominee_count ? (
              <span className="mt-2 block text-xs font-medium text-danger">
                No nominee is named against this property yet — the form will
                print with the nominee section empty.
              </span>
            ) : null}

            {/* Both head the letter, and both are written here rather than
                derived, because only the office knows what its register says
                and which day the letter is going out on. */}
            <span className="mt-3 block">
              <label className="block text-sm" htmlFor="letter_ref_no">
                Reference No
              </label>
              <InputElement
                id="letter_ref_no"
                name="letter_ref_no"
                type="text"
                value={refNo}
                placeholder={
                  confirmKind === "BOOKING"
                    ? "Left blank, the form numbers itself"
                    : letterRefPrefix
                      ? ""
                      : "Left blank, the letter numbers itself"
                }
                className="h-8.5 w-full text-sm"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setRefNo(e.target.value)
                }
              />
            </span>

            <span className="mt-2 block">
              <label className="block text-sm">
                Reference Date
                {letterRefDate ? (
                  <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                    (from branch settings)
                  </span>
                ) : null}
              </label>
              <InputDatePicker
                setCurrentDate={setRefDate}
                className="h-8.5 w-full text-sm font-medium"
                selectedDate={refDate}
                setSelectedDate={setRefDate}
              />
            </span>
          </>
        }
        confirmLabel="Generate"
        // DeleteButton carries no colour of its own, so an unstyled confirm
        // renders white on white. Green because this creates, not destroys.
        className="bg-green-600 hover:bg-green-700"
        loading={busySaleId === confirmUnit?.sale_id}
        onCancel={() => setConfirmUnit(null)}
        onConfirm={
          confirmKind === "BOOKING" ? handleGenerateBookingForm : handleGenerateLetter
        }
      />

      {/* Withdrawing an issued paper. Named in full in the question, because
          the copy being removed may already be in the buyer's hands. */}
      <ConfirmModal
        show={Boolean(confirmWithdraw)}
        title={
          confirmWithdraw?.kind === "BOOKING"
            ? "Withdraw Booking Form"
            : "Withdraw Allotment Letter"
        }
        message={
          <>
            Remove
            <span className="mt-1 block font-bold">
              {confirmWithdraw?.kind === "BOOKING" ? "B-" : "L-"}
              {confirmWithdraw?.version} of{" "}
              {confirmWithdraw?.unit.unit_no ||
                confirmWithdraw?.unit.parking_no ||
                "this unit"}{" "}
              ?
            </span>
            <span className="mt-2 block text-xs text-body dark:text-bodydark">
              The stored copy goes with it and cannot be printed again. The
              number is not reused — the next one issued carries the next number
              up, so nothing else is renamed.
            </span>
          </>
        }
        confirmLabel="Withdraw"
        className="bg-red-600 hover:bg-red-700"
        loading={busySaleId === confirmWithdraw?.unit.sale_id}
        onCancel={() => setConfirmWithdraw(null)}
        onConfirm={handleWithdraw}
      />

      {/* Nothing else in the system holds a copy of a scanned deed, so removing
          one is the end of it. */}
      <ConfirmModal
        show={Boolean(confirmDeleteUnit)}
        title="Remove Document"
        message={
          <>
            Remove the scanned deed of
            <span className="mt-1 block font-bold">
              {confirmDeleteUnit?.unit_no || confirmDeleteUnit?.parking_no || "this unit"} ?
            </span>
            <span className="mt-2 block text-xs text-body dark:text-bodydark">
              No copy is kept anywhere else. It will have to be scanned again.
            </span>
          </>
        }
        confirmLabel="Remove"
        // Red, for the same reason the letter's confirm is green: the button
        // carries no colour of its own, and this one destroys.
        className="bg-red-600 hover:bg-red-700"
        loading={busySaleId === confirmDeleteUnit?.sale_id}
        onCancel={() => setConfirmDeleteUnit(null)}
        onConfirm={handleDeleteDocument}
      />

      {/* Naming who a sold property is left to. Reloads the report on save, so
          the nominee count and the booking form's warning stay true. */}
      <SaleNomineeModal
        unit={nomineeUnit}
        onClose={() => setNomineeUnit(null)}
        onSaved={() => loadData()}
      />

      {/* One picker for the whole page; openFilePicker points it at a row. */}
      <input
        ref={filePickerRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const saleId = pickingSaleId.current;
          const file = e.target.files?.[0];
          pickingSaleId.current = null;
          if (saleId) handleDocumentPick(saleId, file);
        }}
      />
    </>
  );
};

export default SoldUnitList;


