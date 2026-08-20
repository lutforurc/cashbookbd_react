import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import BuildingDropdown from "../../../utils/utils-functions/BuildingDropdown";
import { flatLayout } from "./flatSlice";
import routes from "../../../services/appRoutes";
import httpService from "../../../services/httpService";
import { formatMobile, useMobileFormat } from "../../../utils/utils-functions/mobileFormat";
import {
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiCreditCard,
  FiDollarSign,
  FiEdit2,
  FiGrid,
  FiHome,
  FiLayers,
  FiList,
  FiTool,
  FiUser,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import { Button } from '../../../../pages/UiElements/CustomButtons';

const STATUS_MAP: Record<number, string> = {
  1: "border-teal-200/60 bg-[linear-gradient(135deg,#34d399_0%,#10b981_45%,#0f766e_100%)] shadow-teal-950/30 ring-teal-100/45 hover:bg-[linear-gradient(135deg,#6ee7b7_0%,#10b981_48%,#0d9488_100%)]",
  2: "border-amber-100/70 bg-[linear-gradient(135deg,#fbbf24_0%,#f59e0b_48%,#b45309_100%)] text-white shadow-amber-950/30 ring-amber-100/45 hover:bg-[linear-gradient(135deg,#fcd34d_0%,#f59e0b_48%,#d97706_100%)]",
  3: "border-cyan-100/60 bg-[linear-gradient(135deg,#38bdf8_0%,#0ea5e9_45%,#1d4ed8_100%)] shadow-blue-950/30 ring-cyan-100/45 hover:bg-[linear-gradient(135deg,#7dd3fc_0%,#0ea5e9_48%,#2563eb_100%)]",
  4: "border-violet-100/60 bg-[linear-gradient(135deg,#a78bfa_0%,#7c3aed_44%,#4c1d95_100%)] shadow-violet-950/30 ring-violet-100/45 hover:bg-[linear-gradient(135deg,#c4b5fd_0%,#8b5cf6_48%,#5b21b6_100%)]",
};

const FALLBACK_STATUS_CLASS =
  "border-slate-100/50 bg-[linear-gradient(135deg,#cbd5e1_0%,#64748b_46%,#334155_100%)] shadow-slate-950/30 ring-slate-100/35 hover:bg-[linear-gradient(135deg,#e2e8f0_0%,#718096_46%,#475569_100%)]";

const STATUS_DOT_MAP: Record<number, string> = {
  1: "bg-emerald-500",
  2: "bg-amber-400",
  3: "bg-sky-500",
  4: "bg-violet-500",
};

const STATUS_LABELS: Record<number, string> = {
  1: "Available",
  2: "Under Dev",
  3: "Completed",
  4: "Sold",
};

interface UnitCustomer {
  id?: number | string;
  name?: string;
  mobile?: string;
}

interface UnitItem {
  id?: number | string;
  unit_no?: string;
  unit_type?: string;
  size_sqft?: number | string;
  sale_price?: number | string;
  rate?: number | string;
  unit_price?: number | string;
  total_price?: number | string;
  price?: number | string;
  amount?: number | string;
  status?: number;
  booking_id?: number | string;
  unit_sale_id?: number | string;
  sale_id?: number | string;
  paid_amount?: number | string;
  due_amount?: number | string;
  customer?: UnitCustomer;
  booking?: any;
}

interface FlatLayoutFlat {
  id?: number | string;
  flat_name?: string;
  units?: UnitItem[];
}

interface FlatLayoutFloor {
  floor_no: number | string;
  flats?: FlatLayoutFlat[];
}

interface LayoutType {
  building?: string;
  floors?: FlatLayoutFloor[];
}

const summaryCards = [
  {
    key: "floors",
    label: "Floors",
    icon: FiLayers,
    className: "text-indigo-500",
  },
  {
    key: "units",
    label: "Total Units",
    icon: FiGrid,
    className: "text-cyan-500",
  },
  {
    key: "available",
    label: "Available",
    icon: FiCheckCircle,
    className: "text-emerald-500",
  },
  {
    key: "sold",
    label: "Sold",
    icon: FiXCircle,
    className: "text-rose-500",
  },
  {
    key: "underDev",
    label: "Under Dev",
    icon: FiTool,
    className: "text-amber-500",
  },
  {
    key: "completed",
    label: "Completed",
    icon: FiHome,
    className: "text-sky-500",
  },
] as const;

const statusLegend = [1, 4, 2, 3] as const;

const FlatLayout = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const storeLayout = useSelector((state: any) => state.flat?.flatLayout);
  const mobileFormat = useMobileFormat();

  const [buildingId, setBuildingId] = useState<number | null>(null);
  const [activeFloor, setActiveFloor] = useState<number | null>(null);
  const [viewLayout, setViewLayout] = useState<LayoutType | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<UnitItem | null>(null);
  const [unitPaymentSummary, setUnitPaymentSummary] = useState<any | null>(null);
  const [unitPaymentLoading, setUnitPaymentLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "building">("building");

  const handleBuildingSelect = (option: any) => {
    if (!option?.value) return;

    const nextId = Number(option.value);
    if (nextId === buildingId) return;

    setBuildingId(nextId);
    setViewLayout(null);
    setActiveFloor(null);
    setSelectedUnit(null);
    setUnitPaymentSummary(null);
    setErrorMsg(null);
  };

  useEffect(() => {
    if (!buildingId) return;

    setPageLoading(true);

    dispatch(flatLayout(buildingId))
      .unwrap()
      .then((res: any) => {
        const nextLayout = res?.data ?? res ?? null;
        setViewLayout(nextLayout?.floors ? nextLayout : nextLayout ?? null);
      })
      .catch(() => {
        setViewLayout(null);
        setErrorMsg("No data found for this selection.");
      })
      .finally(() => setPageLoading(false));
  }, [buildingId, dispatch]);

  useEffect(() => {
    if (!viewLayout && storeLayout && buildingId) {
      setViewLayout(storeLayout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeLayout]);

  useEffect(() => {
    setActiveFloor(null);
  }, [viewLayout]);

  const sortedFloors = useMemo(() => {
    if (!viewLayout?.floors?.length) return [];
    return [...viewLayout.floors].sort(
      (firstFloor: FlatLayoutFloor, secondFloor: FlatLayoutFloor) =>
        Number(firstFloor.floor_no) - Number(secondFloor.floor_no),
    );
  }, [viewLayout]);

  const floorsToShow = useMemo(() => {
    if (!sortedFloors.length) return [];
    if (activeFloor == null) return sortedFloors;
    return sortedFloors.filter((floor: FlatLayoutFloor) => Number(floor.floor_no) === activeFloor);
  }, [activeFloor, sortedFloors]);

  const activeTabIndex = useMemo(() => {
    if (activeFloor == null) return 0;
    const floorIndex = sortedFloors.findIndex(
      (floor: FlatLayoutFloor) => Number(floor.floor_no) === activeFloor,
    );
    return floorIndex >= 0 ? floorIndex + 1 : 0;
  }, [activeFloor, sortedFloors]);

  const changeActiveTab = (direction: "previous" | "next") => {
    const nextIndex =
      activeTabIndex + (direction === "next" ? 1 : -1);

    if (nextIndex < 0 || nextIndex > sortedFloors.length) return;
    setActiveFloor(
      nextIndex === 0 ? null : Number(sortedFloors[nextIndex - 1].floor_no),
    );
  };

  const layoutSummary = useMemo(() => {
    const summary = {
      floors: viewLayout?.floors?.length ?? 0,
      units: 0,
      available: 0,
      sold: 0,
      underDev: 0,
      completed: 0,
    };

    viewLayout?.floors?.forEach((floor: FlatLayoutFloor) => {
      floor.flats?.forEach((flat: FlatLayoutFlat) => {
        flat.units?.forEach((unit: UnitItem) => {
          const status = Number(unit.status);
          summary.units += 1;
          if (status === 1) summary.available += 1;
          if (status === 2) summary.underDev += 1;
          if (status === 3) summary.completed += 1;
          if (status === 4) summary.sold += 1;
        });
      });
    });

    return summary;
  }, [viewLayout]);

  const handleUnitClick = (unit: UnitItem, e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedUnit(unit);
    setUnitPaymentSummary(null);
  };

  const closeUnitModal = () => {
    setSelectedUnit(null);
    setUnitPaymentSummary(null);
    setUnitPaymentLoading(false);
  };

  const formatNumber = (value: any) => {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return "-";
    return numberValue.toLocaleString("en-US");
  };

  const getUnitTotalPrice = (unit: UnitItem) => {
    const totalPrice = Number(unit?.total_price ?? unit?.price ?? unit?.amount);
    if (Number.isFinite(totalPrice) && totalPrice > 0) return totalPrice;

    const size = Number(unit?.size_sqft);
    const rate = Number(unit?.sale_price ?? unit?.rate ?? unit?.unit_price);
    if (Number.isFinite(size) && Number.isFinite(rate) && size > 0 && rate > 0) {
      return size * rate;
    }

    return null;
  };

  const isParkingUnit = (unit: UnitItem) =>
    String(unit?.unit_type ?? "").toLowerCase() === "parking";

  const getKnownSaleId = (unit: UnitItem) =>
    unit?.booking_id ??
    unit?.unit_sale_id ??
    unit?.sale_id ??
    unit?.booking?.id ??
    unit?.booking?.booking_id ??
    null;

  const resolveSaleId = (row: any) =>
    String(
      row?.id ??
        row?.booking_id ??
        row?.unit_sale_id ??
        row?.sale_id ??
        row?.booking?.id ??
        row?.booking?.booking_id ??
        "",
    );

  const resolveUnitId = (row: any) =>
    String(
      row?.unit_id ??
        row?.booking?.unit_id ??
        row?.booking?.payload?.unit?.value ??
        row?.unit?.id ??
        row?.unit?.value ??
        "",
    );

  const resolveParkingId = (row: any) =>
    String(
      row?.parking_id ??
        row?.booking?.parking_id ??
        row?.booking?.payload?.parking?.value ??
        row?.parking?.id ??
        row?.parking?.value ??
        "",
    );

  const getSaleRowsFromResponse = (res: any) => {
    const payload = res?.data;
    const raw = payload?.data ?? payload;
    const rowsCandidate =
      raw?.data?.data ??
      payload?.data?.data?.data ??
      raw?.data ??
      raw?.rows ??
      raw?.list ??
      raw?.items ??
      raw?.results ??
      raw?.options ??
      raw?.paginator?.data ??
      payload?.rows ??
      payload?.list ??
      payload?.items ??
      payload?.results ??
      payload?.options ??
      payload?.paginator?.data ??
      raw;

    return Array.isArray(rowsCandidate) ? rowsCandidate : [];
  };

  const saleRowMatchesUnit = (row: any, unit: UnitItem) => {
    const targetUnitId = String(unit?.id ?? "");
    const targetUnitNo = String(unit?.unit_no ?? "").toLowerCase();
    const isParking = isParkingUnit(unit);
    const rowUnitId = isParking ? resolveParkingId(row) : resolveUnitId(row);
    const unitText = [
      row?.unit_label,
      row?.parking_label,
      row?.booking?.unit_label,
      row?.booking?.parking_label,
      row?.booking?.flat_label,
      row?.booking?.payload?.unit?.label,
      row?.booking?.payload?.parking?.label,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (targetUnitId && rowUnitId && rowUnitId === targetUnitId) return true;
    if (targetUnitNo && unitText.includes(targetUnitNo)) return true;

    return false;
  };

  const findSaleIdForUnit = async (unit: UnitItem) => {
    const knownSaleId = getKnownSaleId(unit);
    if (knownSaleId) return String(knownSaleId);

    const searchText =
      unit?.customer?.mobile ??
      unit?.customer?.name ??
      unit?.unit_no ??
      "";

    if (!searchText) return "";

    const res = await httpService.get("/real-estate/unit-sale/ddl", {
      params: {
        q: searchText,
        page: 1,
        perPage: 50,
        per_page: 50,
      },
    });
    const rows = getSaleRowsFromResponse(res);
    const matchedRow = rows.find((row: any) => saleRowMatchesUnit(row, unit));

    return matchedRow ? resolveSaleId(matchedRow) : "";
  };

  const loadUnitPaymentSummary = async (unit: UnitItem) => {
    if (!unit || Number(unit.status) !== 4) return;

    try {
      setUnitPaymentLoading(true);
      const saleId = await findSaleIdForUnit(unit);
      if (!saleId) return;

      let res: any;
      try {
        res = await httpService.get(`/real-estate/unit-sale/summary/${saleId}`);
      } catch {
        res = await httpService.get(`/unit-sale/summary/${saleId}`);
      }

      const summary = res?.data?.data ?? null;
      setUnitPaymentSummary(summary ? { ...summary, saleId } : null);
    } catch {
      setUnitPaymentSummary(null);
    } finally {
      setUnitPaymentLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedUnit) return;
    loadUnitPaymentSummary(selectedUnit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUnit]);

  const getAmountFromSummary = (keys: string[]) => {
    for (const key of keys) {
      const value = unitPaymentSummary?.amounts?.[key] ?? unitPaymentSummary?.[key];
      const numberValue = Number(value);
      if (Number.isFinite(numberValue)) return numberValue;
    }
    return null;
  };

  const getSelectedUnitPaidAmount = () => {
    const paidAmount = getAmountFromSummary([
      "paid_amount",
      "total_paid",
      "received_amount",
      "payment_amount",
      "paid",
    ]);
    if (paidAmount !== null) return paidAmount;

    const totalAmount = getAmountFromSummary(["total_amount", "grand_total", "sale_amount"]);
    const dueAmount = getAmountFromSummary(["due_amount", "balance_amount", "due"]);
    if (totalAmount !== null && dueAmount !== null) return Math.max(totalAmount - dueAmount, 0);

    return selectedUnit?.paid_amount;
  };

  const getSelectedUnitDueAmount = () => getAmountFromSummary(["due_amount", "balance_amount", "due"]) ?? selectedUnit?.due_amount;

  const goToUnitSale = () => {
    if (!selectedUnit) return;
    navigate(routes.real_estate_unit_sales, {
      state: { unitId: selectedUnit.id, unitNo: selectedUnit.unit_no },
    });
  };

  const goToPaymentEntry = () => {
    navigate(routes.unit_payment_entry, {
      state: {
        bookingId:
          unitPaymentSummary?.saleId ??
          selectedUnit?.booking_id ??
          selectedUnit?.unit_sale_id ??
          selectedUnit?.sale_id ??
          selectedUnit?.booking?.id ??
          selectedUnit?.booking?.booking_id,
        unitId: selectedUnit?.id,
        unitNo: selectedUnit?.unit_no,
        unitType: selectedUnit?.unit_type,
        customerId: selectedUnit?.customer?.id,
        customerName: selectedUnit?.customer?.name,
        customerMobile: selectedUnit?.customer?.mobile,
        dueAmount: getSelectedUnitDueAmount(),
      },
    });
  };

  const goToUnitEdit = () => {
    if (!selectedUnit?.id) return;
    navigate(routes.real_estate_add_floor_unit_edit.replace(":id", String(selectedUnit.id)));
  };

  const renderDetailValue = (label: string, value: React.ReactNode) => (
    <div className="rounded-md bg-gray-50 px-3 py-2 dark:bg-gray-900/40">
      <div className="text-[11px] font-medium uppercase text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
        {value ?? "-"}
      </div>
    </div>
  );

  const getFloorUnitCount = (floor: FlatLayoutFloor) =>
    floor.flats?.reduce(
      (total: number, flat: FlatLayoutFlat) => total + (flat.units?.length ?? 0),
      0,
    ) ?? 0;

  const getUnitTypeSummary = (units: UnitItem[] = []) => {
    if (!units.length) return "No units";

    const counts = units.reduce(
      (summary: Record<"unit" | "parking", number>, unit: UnitItem) => {
        const unitType = String(unit.unit_type ?? "unit").toLowerCase();
        const key = unitType === "parking" ? "parking" : "unit";
        summary[key] += 1;
        return summary;
      },
      { unit: 0, parking: 0 },
    );

    const labels: string[] = [];
    if (counts.unit > 0) {
      labels.push(`${counts.unit} Unit${counts.unit > 1 ? "s" : ""}`);
    }
    if (counts.parking > 0) {
      labels.push(`${counts.parking} Parking`);
    }

    return labels.join(", ");
  };

  const getFloorUnits = (floor: FlatLayoutFloor) =>
    floor.flats?.flatMap((flat: FlatLayoutFlat) => flat.units ?? []) ?? [];

  const getFloorStatusCounts = (floor: FlatLayoutFloor) => {
    const counts: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
    };

    floor.flats?.forEach((flat: FlatLayoutFlat) => {
      flat.units?.forEach((unit: UnitItem) => {
        const status = Number(unit.status);
        if (counts[status] !== undefined) counts[status] += 1;
      });
    });

    return counts;
  };

  const getUnitButtonClass = (unit: UnitItem) => {
    const statusClass = STATUS_MAP[Number(unit.status)] ?? FALLBACK_STATUS_CLASS;
    const typeClass = isParkingUnit(unit)
      ? "before:absolute before:inset-0 before:bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.16)_0,rgba(255,255,255,0.16)_5px,transparent_5px,transparent_16px)] before:opacity-25 after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-white/35"
      : "before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-linear-to-b before:from-white/20 before:to-transparent";

    return `${statusClass} ${typeClass}`;
  };

  const renderUnitTooltip = (unit: UnitItem) => (
    <div
      className="pointer-events-none absolute z-9999 hidden group-hover:block
      bottom-full left-1/2 -translate-x-1/2 mb-2
      bg-gray-950 text-gray-100 dark:bg-gray-100 dark:text-gray-900
      text-xs rounded-md px-3 py-2 shadow-xl ring-1 ring-black/10 min-w-max text-left"
    >
      <div className="flex flex-col gap-0.5">
        {unit.size_sqft && (
          <span>
            <span className="font-semibold">Size:</span> {unit.size_sqft} sqft
          </span>
        )}
        {unit?.customer?.name && (
          <span>
            <span className="font-semibold">Customer:</span> {unit.customer.name}
          </span>
        )}
        {unit?.customer?.mobile && (
          <span>
            <span className="font-semibold">Mobile:</span> {formatMobile(unit.customer.mobile, mobileFormat)}
          </span>
        )}
        {STATUS_LABELS[Number(unit.status)] && (
          <span>
            <span className="font-semibold">Status:</span> {STATUS_LABELS[Number(unit.status)]}
          </span>
        )}
      </div>
    </div>
  );

  const renderFloorCard = (floor: FlatLayoutFloor) => {
    const floorUnitSummary = getUnitTypeSummary(getFloorUnits(floor));
    const statusCounts = getFloorStatusCounts(floor);
    const hasMultipleFlats = (floor.flats?.length ?? 0) > 1;
    const floorTitle =
      !hasMultipleFlats && floor.flats?.[0]?.flat_name
        ? floor.flats[0].flat_name
        : `Floor ${floor.floor_no}`;

    return (
      <div
        key={floor.floor_no}
        className="relative rounded-lg border border-[rgb(var(--c-border))] bg-white shadow-sm dark:bg-gray-800/90"
      >
        <div className="border-b border-[rgb(var(--c-border))] bg-gray-50 px-4 py-3 dark:bg-gray-900/35">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
                {floorTitle}
              </h3>
              <p className="mt-1 inline-flex rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-300 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/30">
                {floorUnitSummary}
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-1.5">
              {statusLegend.map((status) => (
                <span
                  key={status}
                  className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    statusCounts[status] > 0
                      ? `${STATUS_DOT_MAP[status]} text-white`
                      : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                  }`}
                  title={STATUS_LABELS[status]}
                >
                  {statusCounts[status]}
                </span>
              ))}
            </div>
          </div>
        </div>

        {floor.flats?.length ? (
          <div className="space-y-4 p-4">
            {floor.flats.map((flat: FlatLayoutFlat) => (
              <div key={flat.id ?? `${floor.floor_no}-${flat.flat_name}`}>
                {hasMultipleFlats && (
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      {flat.flat_name}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-300">
                      {getUnitTypeSummary(flat.units)}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {flat.units?.length ? (
                    flat.units.map((unit: UnitItem) => (
                      <Button
                        type="button"
                        key={unit.id ?? `${floor.floor_no}-${flat.flat_name}-${unit.unit_no}`}
                        onClick={(e) => handleUnitClick(unit, e)}
                        className={`relative group isolate min-h-13 overflow-hidden rounded-md border px-3 py-2.5 text-center text-sm font-semibold text-white shadow-lg ring-1 transition-all hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 ${
                          getUnitButtonClass(unit)
                        }`}
                      >
                        <span className="relative z-10 block truncate drop-shadow-sm">
                          {unit.unit_no}
                        </span>
                        <span className="relative z-10 mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-wide opacity-85">
                          {STATUS_LABELS[Number(unit.status)] ?? "Unknown"}
                        </span>
                        {isParkingUnit(unit) && (
                          <span className="relative z-10 mt-1 inline-flex rounded bg-black/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/90 ring-1 ring-white/25">
                            Parking
                          </span>
                        )}
                        {renderUnitTooltip(unit)}
                      </Button>
                    ))
                  ) : (
                    <div className="col-span-2 text-center text-gray-400 text-sm">
                      No units
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-400 text-sm">No flats found</div>
        )}
      </div>
    );
  };

  const renderBuildingFloor = (floor: FlatLayoutFloor, isGround: boolean) => {
    const units = getFloorUnits(floor);
    const statusCounts = getFloorStatusCounts(floor);
    const hasMultipleFlats = (floor.flats?.length ?? 0) > 1;
    const floorTitle =
      !hasMultipleFlats && floor.flats?.[0]?.flat_name
        ? floor.flats[0].flat_name
        : `Floor ${floor.floor_no}`;

    return (
      <div
        key={floor.floor_no}
        className={`flex items-stretch ${
          isGround ? "" : "border-b-2 border-slate-400/70 dark:border-slate-700/70"
        }`}
      >
        <div
          title={floorTitle}
          className="flex w-24 shrink-0 flex-col items-center justify-center gap-1.5 border-r border-[rgb(var(--c-border))] bg-slate-700 px-2 py-3 text-center dark:bg-slate-800"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-base font-bold text-white ring-1 ring-white/25">
            {floor.floor_no}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
            {Number(floor.floor_no) === 1 ? "Ground" : "Floor"}
          </span>
          <div className="flex flex-wrap justify-center gap-1">
            {statusLegend.map((status) =>
              statusCounts[status] > 0 ? (
                <span
                  key={status}
                  className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white ${STATUS_DOT_MAP[status]}`}
                  title={STATUS_LABELS[status]}
                >
                  {statusCounts[status]}
                </span>
              ) : null,
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-wrap content-center gap-2.5 bg-linear-to-b from-slate-300 to-slate-200 px-4 py-4 shadow-inner dark:from-slate-800/50 dark:to-slate-800/10">
          {units.length ? (
            units.map((unit: UnitItem) => (
              <Button
                type="button"
                key={unit.id ?? `${floor.floor_no}-${unit.unit_no}`}
                onClick={(e) => handleUnitClick(unit, e)}
                title={unit.unit_no}
                className={`relative group isolate flex w-20 flex-col items-center justify-center overflow-hidden rounded-[4px] border-2 border-slate-900/25 px-1 text-center text-[11px] font-semibold leading-tight text-white shadow-[0_4px_10px_rgba(0,0,0,0.28)] ring-1 ring-inset ring-white/35 transition-all hover:-translate-y-1 hover:shadow-xl focus:outline-none ${getUnitButtonClass(
 unit,
 )}`}
              >
                {/* window panes */}
                <span className="pointer-events-none absolute left-1/2 top-1 bottom-1 z-5 w-px -translate-x-1/2 bg-white/30" />
                <span className="pointer-events-none absolute left-1.5 right-1.5 top-1/2 z-5 h-px -translate-y-1/2 bg-white/30" />
                <span className="relative z-10 block w-full truncate drop-shadow">
                  {unit.unit_no}
                </span>
                <span className="relative z-10 mt-0.5 block w-full truncate text-[8px] font-semibold uppercase tracking-wide opacity-90">
                  {isParkingUnit(unit) ? "Parking" : STATUS_LABELS[Number(unit.status)] ?? ""}
                </span>
                {renderUnitTooltip(unit)}
              </Button>
            ))
          ) : (
            <span className="self-center text-xs text-gray-400">No units</span>
          )}
        </div>
      </div>
    );
  };

  const renderBuildingView = () => {
    if (!floorsToShow.length) {
      return <div className="text-center text-gray-500">No floors found.</div>;
    }

    const stackedFloors = [...floorsToShow].reverse();

    return (
      <div className="overflow-x-auto rounded-xl bg-linear-to-b from-sky-300 via-sky-100 to-emerald-100/80 p-4 sm:p-8 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
        <div className="mx-auto w-full max-w-4xl">
          {/* Rooftop nameplate */}
          <div className="mx-auto mb-1 w-fit rounded-md bg-slate-800 px-4 py-1 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300 shadow-lg ring-1 ring-white/10">
            {viewLayout?.building ?? "Building"}
          </div>

          {/* Roof */}
          <div className="mx-auto h-4 w-[78%] rounded-t-2xl bg-linear-to-b from-slate-500 to-slate-700 shadow-md dark:from-slate-600 dark:to-slate-800" />
          <div className="mx-auto mb-px h-3 w-[92%] rounded-t-sm bg-slate-600 shadow dark:bg-slate-800" />

          {/* Tower body */}
          <div className="min-w-[20rem] overflow-hidden rounded-sm border border-x-[7px] border-slate-500 bg-slate-200 shadow-2xl dark:border-slate-800 dark:bg-slate-900/50">
            {stackedFloors.map((floor: FlatLayoutFloor, index: number) =>
              renderBuildingFloor(floor, index === stackedFloors.length - 1),
            )}
          </div>

          {/* Plinth + entrance */}
          <div className="mx-auto flex h-7 w-[101%] items-end justify-center rounded-b-md bg-slate-600 shadow-md dark:bg-slate-800">
            <span
              title="Entrance"
              className="h-5 w-10 rounded-t-md border border-white/15 bg-slate-900/40"
            />
          </div>

          {/* Ground + road */}
          <div className="mx-auto mt-1 h-2 w-[114%] rounded bg-emerald-700/40 dark:bg-slate-700/70" />
          <div className="mx-auto mt-1 h-0.5 w-[114%] bg-[repeating-linear-gradient(90deg,rgba(148,163,184,0.55)_0,rgba(148,163,184,0.55)_14px,transparent_14px,transparent_28px)]" />
        </div>
      </div>
    );
  };

  return (
    <>
      <HelmetTitle title={viewLayout?.building ?? "Building Layout"} />

      <div className="mb-6 rounded-lg border border-[rgb(var(--c-border))] bg-white p-4 shadow-sm dark:bg-gray-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
              Real Estate Layout
            </p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
              {viewLayout?.building ?? "Building Layout"}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Building-wise floor and unit availability overview
            </p>
          </div>

          <div className="w-full lg:max-w-md">
            <BuildingDropdown onSelect={handleBuildingSelect} className="mt-2" />
          </div>
        </div>
      </div>

      {pageLoading && <Loader />}

      {!buildingId && !pageLoading && (
        <div className="text-center text-gray-500">
          Please select a building to view floors & units.
        </div>
      )}

      {!pageLoading && buildingId && !viewLayout && (
        <div className="text-center text-gray-500">
          {errorMsg ?? "No data found."}
        </div>
      )}

      {!pageLoading && viewLayout && (
        <>
          {viewLayout.floors?.length > 0 ? (
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6 mb-5">
                {summaryCards.map((card) => {
                  const Icon = card.icon;
                  const value = layoutSummary[card.key];

                  return (
                    <div
                      key={card.key}
                      className="rounded-lg border border-[rgb(var(--c-border))] bg-white p-4 shadow-sm dark:bg-gray-800"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {card.label}
                          </div>
                          <div className={`mt-1 text-2xl font-bold ${card.className}`}>
                            {value}
                          </div>
                        </div>
                        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 text-lg dark:bg-gray-700">
                          <Icon className={card.className} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="overflow-x-auto">
                <div className="inline-flex min-w-full gap-1 rounded-lg border border-[rgb(var(--c-border))] bg-white p-1.5 shadow-sm dark:bg-gray-800">
                  <Button
                    type="button"
                    onClick={() => changeActiveTab("previous")}
                    disabled={activeTabIndex === 0}
                    className="shrink-0 rounded-md px-2.5 py-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                    title="Previous tab"
                  >
                    <FiChevronLeft />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveFloor(null)}
                    className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      activeFloor == null
                        ? "bg-cyan-600 text-white shadow-sm"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      All Floors
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          activeFloor == null
                            ? "bg-white/20 text-white"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {layoutSummary.units}
                      </span>
                    </span>
                  </Button>
                  {sortedFloors.map((floor: FlatLayoutFloor) => (
                    <Button
                      type="button"
                      key={floor.floor_no}
                      onClick={() => setActiveFloor(Number(floor.floor_no))}
                      className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                        activeFloor === Number(floor.floor_no)
                          ? "bg-cyan-600 text-white shadow-sm"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        Floor {floor.floor_no}
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs ${
                            activeFloor === Number(floor.floor_no)
                              ? "bg-white/20 text-white"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {getFloorUnitCount(floor)}
                        </span>
                      </span>
                    </Button>
                  ))}
                  <Button
                    type="button"
                    onClick={() => changeActiveTab("next")}
                    disabled={activeTabIndex === sortedFloors.length}
                    className="shrink-0 rounded-md px-2.5 py-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                    title="Next tab"
                  >
                    <FiChevronRight />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 mb-6">
              No floors found for this building.
            </div>
          )}

          <div className="mb-4 flex items-center justify-end">
            <div className="inline-flex rounded-lg border border-[rgb(var(--c-border))] bg-white p-1 shadow-sm dark:bg-gray-800">
              <Button
                type="button"
                onClick={() => setViewMode("building")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "building"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                }`}
              >
                <FiLayers />
                Building
              </Button>
              <Button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === "grid"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                }`}
              >
                <FiGrid />
                Grid
              </Button>
            </div>
          </div>

          {viewMode === "building" ? (
            renderBuildingView()
          ) : (
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
              {floorsToShow.length ? (
                floorsToShow.map((floor: FlatLayoutFloor) => renderFloorCard(floor))
              ) : (
                <div className="col-span-full text-center text-gray-500">
                  No floors found.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {selectedUnit && (
        <div
          className="fixed inset-0 z-9998 flex items-center justify-center bg-black/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-[rgb(var(--c-border))] bg-white shadow-2xl dark:bg-gray-800">
            <div className="flex items-start justify-between gap-4 border-b border-[rgb(var(--c-border))] px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">
                  Unit Details
                </p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
                  {selectedUnit.unit_no ?? "Unit"}
                </h3>
              </div>

              <Button
                type="button"
                onClick={closeUnitModal}
                className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                title="Close"
              >
                <FiX />
              </Button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {renderDetailValue("Status", STATUS_LABELS[Number(selectedUnit.status)] ?? "Unknown")}
                {renderDetailValue("Type", selectedUnit.unit_type ?? "Unit")}
                {renderDetailValue(
                  "Size",
                  selectedUnit.size_sqft ? `${formatNumber(selectedUnit.size_sqft)} sqft` : "-",
                )}
                {renderDetailValue(
                  "Total Price",
                  getUnitTotalPrice(selectedUnit)
                    ? formatNumber(getUnitTotalPrice(selectedUnit))
                    : "-",
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-[rgb(var(--c-border))] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
                    <FiUser className="text-cyan-500" />
                    Customer
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between gap-3">
                      <span>Name</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {selectedUnit?.customer?.name ?? "-"}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Mobile</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatMobile(selectedUnit?.customer?.mobile, mobileFormat) || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-[rgb(var(--c-border))] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-[rgb(var(--c-text))]">
                    <FiDollarSign className="text-emerald-500" />
                    Pricing
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between gap-3">
                      <span>Rate</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatNumber(
                          selectedUnit?.sale_price ??
                            selectedUnit?.rate ??
                            selectedUnit?.unit_price,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Paid</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {unitPaymentLoading
                          ? "Loading..."
                          : formatNumber(getSelectedUnitPaidAmount())}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Due</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {unitPaymentLoading
                          ? "Loading..."
                          : formatNumber(getSelectedUnitDueAmount())}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-[rgb(var(--c-border))] pt-4">
                {Number(selectedUnit.status) === 1 && (
                  <Button
                    type="button"
                    onClick={goToUnitSale}
                    variant="success"
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition"
                  >
                    <FiDollarSign />
                    Sale / Booking
                  </Button>
                )}
                {Number(selectedUnit.status) === 4 && (
                  <Button
                    type="button"
                    onClick={goToPaymentEntry}
                    className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                  >
                    <FiCreditCard />
                    Payment Entry
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={goToUnitEdit}
                  className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                >
                  <FiEdit2 />
                  Edit Unit
                </Button>
                <Button
                  type="button"
                  onClick={() => navigate(routes.real_estate_floor_unit_list)}
                  className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                >
                  <FiList />
                  Unit List
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FlatLayout;
