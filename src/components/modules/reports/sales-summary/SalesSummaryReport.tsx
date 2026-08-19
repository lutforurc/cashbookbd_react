import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";
import { FiCheckSquare, FiClipboard, FiRotateCcw } from "react-icons/fi";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import { ButtonLoading, PrintButton } from "../../../../pages/UiElements/CustomButtons";
import routes from "../../../services/appRoutes";
import { fetchAreaDdl } from "../../real-estate/area/projectAreaSlice";
import { fetchProjectDdl } from "../../real-estate/project/projectSlice";
import { fetchBuildingDdl } from "../../real-estate/buildings/buildingsSlice";
// The house money format, shared on purpose: a figure here and the same figure
// on the allotment letter must be written the same way.
import { money } from "../../real-estate/sales/soldUnitReport";
import { formatMobile, useMobileFormat } from "../../../utils/utils-functions/mobileFormat";
import {
  fetchSalesSummary,
  SalesSummaryCustomer,
  SalesSummaryUnit,
} from "./salesSummarySlice";
import { Button } from '../../../../pages/UiElements/CustomButtons';

const cell = "border border-stroke px-3 py-2 dark:border-strokedark";

/** "Sherpur, Bogura â€º Baganbari â€º Shantipark Tower" */
const placeOf = (unit: SalesSummaryUnit) =>
  [unit.area_name, unit.project_name, unit.building_name].filter(Boolean).join(" â€º ");

/**
 * "4th Floor Â· Unit# 4/A"
 *
 * The unit and parking numbers are printed as they are stored -- they already
 * read "Unit# 4/A", and labelling them again gave "Unit# Unit# 4/A".
 */
const unitOf = (unit: SalesSummaryUnit) =>
  [unit.floor_name, unit.unit_no, unit.parking_no].filter(Boolean).join(" Â· ");

/**
 * The buyer, and under them what they bought â€” all in the one cell.
 *
 * Name, phone, then two lines per sale: where it is, and which one it is. A
 * buyer with two flats gets two pairs rather than a second row, so the amount
 * columns beside them stay one figure per customer.
 */
const CustomerCell: React.FC<{ customer: SalesSummaryCustomer }> = ({ customer }) => {
  const mobileFormat = useMobileFormat();

  return (
  <>
    <div className="font-medium">{customer.customer_name || "-"}</div>
    {customer.customer_mobile ? (
      <div className="text-xs text-gray-500 dark:text-gray-400">{formatMobile(customer.customer_mobile, mobileFormat)}</div>
    ) : null}
    {customer.units.map((unit) => (
      <div key={unit.sale_id} className="mt-1 text-xs text-gray-600 dark:text-gray-400">
        {placeOf(unit) ? <div>{placeOf(unit)}</div> : null}
        {unitOf(unit) ? <div>{unitOf(unit)}</div> : null}
      </div>
    ))}
  </>
  );
};

/**
 * Sales summary: one line per buyer, and what they still owe.
 *
 * Reads its own endpoint rather than the sold-units list's, because it answers
 * to its own permission -- real.estate.sales.summary, which is not what opens
 * the sales screen. The endpoint counts the money by the same rule the rest of
 * the module keeps (CONFIRMED payments only, a CONFIRMED refund taken off), so
 * a total here and a total on the sold-units list still agree.
 */
const SalesSummaryReport: React.FC = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const { rows, loading } = useSelector((state: any) => state.salesSummary);
  const areaDdl = useSelector((state: any) => state.realEstateArea?.areaDdl);
  const projectDdl = useSelector((state: any) => state.realEstateProjects?.projectDdl);
  const buildingDdl = useSelector((state: any) => state.buildings?.buildingDdl);

  const [areaId, setAreaId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [buildingId, setBuildingId] = useState("");

  const customers: SalesSummaryCustomer[] = Array.isArray(rows?.data) ? rows.data : [];

  const toOptions = (items: any, allLabel: string) => [
    { id: "", name: allLabel },
    ...(Array.isArray(items) ? items.map((i: any) => ({ id: i.value, name: i.label })) : []),
  ];

  const areaOptions = useMemo(() => toOptions(areaDdl, "All Locations"), [areaDdl]);
  const projectOptions = useMemo(() => toOptions(projectDdl, "All Projects"), [projectDdl]);
  const buildingOptions = useMemo(() => toOptions(buildingDdl, "All Buildings"), [buildingDdl]);

  // Added up from the rows on screen rather than read off the payload, so the
  // foot of the report can never disagree with the column above it.
  const totals = useMemo(
    () =>
      customers.reduce(
        (sum, customer) => ({
          total: sum.total + Number(customer.total_amount || 0),
          received: sum.received + Number(customer.received_amount || 0),
          due: sum.due + Number(customer.due_amount || 0),
        }),
        { total: 0, received: 0, due: 0 }
      ),
    [customers]
  );

  const loadData = (override?: Record<string, any>) => {
    const params = {
      area_id: areaId ? Number(areaId) : undefined,
      project_id: projectId ? Number(projectId) : undefined,
      building_id: buildingId ? Number(buildingId) : undefined,
      ...(override ?? {}),
    };

    dispatch(fetchSalesSummary(params))
      .unwrap()
      .catch((message: string) => toast.info(message || "Failed to load sales summary"));
  };

  useEffect(() => {
    dispatch(fetchAreaDdl(""));
    dispatch(fetchProjectDdl(""));
    dispatch(fetchBuildingDdl(""));
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = () => {
    setAreaId("");
    setProjectId("");
    setBuildingId("");
    loadData({ area_id: undefined, project_id: undefined, building_id: undefined });
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Sales Summary Report",
  });

  /**
   * The buyer's money, receipt by receipt.
   *
   * Handed over as the account id, not as a name to search: it gathers every
   * payment against the buyer even where two flats put them on two bookings,
   * and it cannot drag in a second customer whose name reads the same. The name
   * goes along only so the register can say whose page it is showing.
   */
  const openLedger = (customer: SalesSummaryCustomer) =>
    navigate(
      `${routes.unit_payment_list}?customer_id=${customer.customer_id}` +
        `&customer_name=${encodeURIComponent(customer.customer_name || "")}`
    );

  const nameOf = (id: string, options: { id: any; name: string }[]) =>
    options.find((option) => String(option.id) === String(id))?.name || "";

  return (
    <>
      <HelmetTitle title="Sales Summary Report" />
      {loading ? <Loader /> : null}

      <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
        <DropdownCommon
          id="area_id"
          name="area_id"
          label="Location"
          value={areaId}
          onChange={(e: any) => setAreaId(e.target.value)}
          className="mt-1 h-[2.1rem] bg-transparent"
          data={areaOptions}
        />
        <DropdownCommon
          id="project_id"
          name="project_id"
          label="Project"
          value={projectId}
          onChange={(e: any) => setProjectId(e.target.value)}
          className="mt-1 h-[2.1rem] bg-transparent"
          data={projectOptions}
        />
        <DropdownCommon
          id="building_id"
          name="building_id"
          label="Building"
          value={buildingId}
          onChange={(e: any) => setBuildingId(e.target.value)}
          className="mt-1 h-[2.1rem] bg-transparent"
          data={buildingOptions}
        />

        <div className="mt-6 flex items-center gap-2">
          <ButtonLoading
            onClick={() => loadData()}
            buttonLoading={loading}
            label="Apply"
            icon={<FiCheckSquare />}
            className="h-9 px-6"
          />
          <ButtonLoading
            onClick={handleReset}
            buttonLoading={false}
            label="Reset"
            icon={<FiRotateCcw />}
            className="h-9 px-4"
          />
          <PrintButton
            onClick={handlePrint}
            label="Print"
            className="h-9 px-6"
            disabled={!customers.length}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm text-gray-700 dark:text-gray-300">
          <thead className="bg-gray-300 text-xs uppercase text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            <tr>
              <th className={`${cell} w-20 text-center`}>Sl. No</th>
              <th className={cell}>Customer Name</th>
              <th className={`${cell} w-40 text-right`}>Sales Amount</th>
              <th className={`${cell} w-40 text-right`}>Received Amt</th>
              <th className={`${cell} w-40 text-right`}>Due Amt</th>
              <th className={`${cell} w-32 text-center`}>Action</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800">
            {customers.length ? (
              customers.map((customer, index) => (
                <tr key={customer.customer_id} className="hover:bg-indigo-50 dark:hover:bg-gray-700">
                  <td className={`${cell} text-center align-middle`}>{index + 1}</td>
                  <td className={`${cell} align-middle`}>
                    <CustomerCell customer={customer} />
                  </td>
                  <td className={`${cell} text-right align-middle`}>{money(customer.total_amount)}</td>
                  <td className={`${cell} text-right align-middle`}>{money(customer.received_amount)}</td>
                  <td
                    className={`${cell} text-right align-middle font-semibold ${
                      Number(customer.due_amount) > 0 ? "text-red-600 dark:text-red-400" : ""
                    }`}
                  >
                    {money(customer.due_amount)}
                  </td>
                  <td className={`${cell} text-center align-middle`}>
                    <Button
                      type="button"
                      title="Payment ledger"
                      aria-label={`Payment ledger of ${customer.customer_name}`}
                      onClick={() => openLedger(customer)}
                      className="text-emerald-600 dark:text-emerald-400"
                    >
                      <FiClipboard />
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-4 text-center text-gray-500 dark:text-gray-400">
                  No data found
                </td>
              </tr>
            )}
          </tbody>
          {customers.length ? (
            <tfoot className="bg-slate-100 font-semibold text-slate-800 dark:bg-slate-900/60 dark:text-slate-100">
              <tr>
                <td className={`${cell} text-right`} colSpan={2}>
                  Grand Total
                </td>
                <td className={`${cell} text-right`}>{money(totals.total)}</td>
                <td className={`${cell} text-right`}>{money(totals.received)}</td>
                <td className={`${cell} text-right`}>{money(totals.due)}</td>
                <td className={cell}></td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {/* PRINT */}
      <div ref={printRef} className="hidden bg-white p-6 text-black">
        <h2 className="mb-1 text-center text-lg font-bold">Sales Summary Report</h2>
        <p className="mb-4 text-center text-xs">
          Location: {nameOf(areaId, areaOptions) || "All Locations"} Â· Project:{" "}
          {nameOf(projectId, projectOptions) || "All Projects"} Â· Building:{" "}
          {nameOf(buildingId, buildingOptions) || "All Buildings"}
        </p>

        <table className="min-w-full border-collapse border border-gray-400 text-left text-sm">
          <thead className="bg-gray-300">
            <tr>
              <th className="w-16 border border-gray-400 px-2 py-1 text-center">Sl. No</th>
              <th className="border border-gray-400 px-2 py-1">Customer Name</th>
              <th className="border border-gray-400 px-2 py-1 text-right">Sales Amount</th>
              <th className="border border-gray-400 px-2 py-1 text-right">Received Amt</th>
              <th className="border border-gray-400 px-2 py-1 text-right">Due Amt</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, index) => (
              <tr key={customer.customer_id}>
                <td className="border border-gray-400 px-2 py-1 text-center">{index + 1}</td>
                <td className="border border-gray-400 px-2 py-1 align-middle">
                  <CustomerCell customer={customer} />
                </td>
                <td className="border border-gray-400 px-2 py-1 text-right">
                  {money(customer.total_amount)}
                </td>
                <td className="border border-gray-400 px-2 py-1 text-right">
                  {money(customer.received_amount)}
                </td>
                <td className="border border-gray-400 px-2 py-1 text-right">
                  {money(customer.due_amount)}
                </td>
              </tr>
            ))}
          </tbody>
          {customers.length ? (
            <tfoot>
              <tr className="font-semibold">
                <td className="border border-gray-400 px-2 py-1 text-right" colSpan={2}>
                  Grand Total
                </td>
                <td className="border border-gray-400 px-2 py-1 text-right">{money(totals.total)}</td>
                <td className="border border-gray-400 px-2 py-1 text-right">{money(totals.received)}</td>
                <td className="border border-gray-400 px-2 py-1 text-right">{money(totals.due)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </>
  );
};

export default SalesSummaryReport;
