import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiFileText, FiPrinter, FiRefreshCcw, FiSearch } from "react-icons/fi";
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
import { API_UNIT_SALE_ALLOTMENT_LETTER_URL } from "../../../services/apiRoutes";
import { fetchSoldUnits } from "./unitSaleSlice";
import { fetchProjectDdl } from "../project/projectSlice";
import { fetchBuildingDdl } from "../buildings/buildingsSlice";
import { SoldUnitCustomer } from "./types";
import {
  customerColor,
  edgeStyle,
  money,
  reportTotals,
  saleLines,
} from "./soldUnitReport";
import SoldUnitListPrint from "./SoldUnitListPrint";

const cellBase = "border border-stroke px-2 py-1.5 dark:border-strokedark";

const SoldUnitList: React.FC = () => {
  const dispatch = useDispatch<any>();

  const { soldUnits, soldUnitsLoading } = useSelector(
    (state: any) => state.unitSale
  );
  const projectDdl = useSelector((state: any) => state.realEstateProjects?.projectDdl);
  const buildingDdl = useSelector((state: any) => state.buildings?.buildingDdl);

  const [projectId, setProjectId] = useState<string>("");
  const [buildingId, setBuildingId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [q, setQ] = useState("");
  const [dueOnly, setDueOnly] = useState(false);
  // The sale whose letter is being issued or printed — one at a time.
  const [busySaleId, setBusySaleId] = useState<number | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

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
    openLetterPdf(saleId, `${API_UNIT_SALE_ALLOTMENT_LETTER_URL}${saleId}`, `demo-${saleId}`);

  /** Prints an issued letter back from the copy stored on the sale. */
  const handlePrintLetter = (saleId: number, version: number) =>
    openLetterPdf(
      saleId,
      `${API_UNIT_SALE_ALLOTMENT_LETTER_URL}${saleId}/print/${version}`,
      `${saleId}-L${version}`,
    );

  /**
   * Issues a letter. The server renders it once and appends the copy, so the
   * list only has to learn that one more version now exists.
   */
  const handleGenerateLetter = async (saleId: number) => {
    if (busySaleId) return;
    setBusySaleId(saleId);

    try {
      const response = await httpService.post(
        `${API_UNIT_SALE_ALLOTMENT_LETTER_URL}generate/${saleId}`,
      );
      toast.success(response?.data?.message || "Allotment letter generated");
      loadData();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || "Could not generate the letter",
      );
    } finally {
      setBusySaleId(null);
    }
  };

  const openLetterPdf = async (saleId: number, url: string, fileTag: string) => {
    if (busySaleId) return;

    const letterTab = window.open("", "_blank");
    setBusySaleId(saleId);

    try {
      const response = await httpService.get(url, { responseType: "blob" });

      // A refusal comes back as JSON on a 2xx, so it never reaches the catch —
      // it has to be spotted by the blob's own type before it is shown as a PDF.
      if (response.data?.type?.includes("json")) {
        const message = JSON.parse(await response.data.text())?.message;
        throw new Error(message || "Allotment letter is not available");
      }

      const fileUrl = URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );

      if (letterTab) {
        letterTab.location.href = fileUrl;
      } else {
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = `allotment-letter-${fileTag}.pdf`;
        link.click();
      }

      // Give the viewer time to load before dropping the blob.
      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000);
    } catch (error: any) {
      letterTab?.close();
      toast.error(error?.message || "Failed to build the allotment letter");
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
                                  {unit.receipt_no ? ` | ${unit.receipt_no}` : ""}
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
                                {money(unit.received_amount)}
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
                                  <button
                                    type="button"
                                    title="Issue a new allotment letter and keep the copy"
                                    disabled={busySaleId === unit.sale_id}
                                    onClick={() => handleGenerateLetter(unit.sale_id)}
                                    className="w-full rounded bg-primary px-2 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                                  >
                                    Generate
                                  </button>

                                  {/* One button per issued letter. These print the
                                      stored copy, not a fresh calculation. */}
                                  <div className="flex flex-wrap justify-center gap-1">
                                    {Array.from(
                                      { length: Number(unit.letter_count) || 0 },
                                      (_, i) => i + 1,
                                    ).map((version) => (
                                      <button
                                        key={version}
                                        type="button"
                                        title={`Print letter L-${version} as it was issued`}
                                        disabled={busySaleId === unit.sale_id}
                                        onClick={() => handlePrintLetter(unit.sale_id, version)}
                                        className="rounded border border-stroke px-2 py-0.5 text-xs font-semibold text-primary hover:bg-gray-2 disabled:opacity-50 dark:border-strokedark dark:hover:bg-meta-4"
                                      >
                                        L-{version}
                                      </button>
                                    ))}
                                  </div>

                                  <button
                                    type="button"
                                    title="Preview only — built from today's data, not saved"
                                    disabled={busySaleId === unit.sale_id}
                                    onClick={() => handleAllotmentLetter(unit.sale_id)}
                                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary disabled:opacity-50 dark:text-gray-400"
                                  >
                                    <FiFileText /> DEMO
                                  </button>
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
    </>
  );
};

export default SoldUnitList;
