import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import BuildingDropdown from "../../../utils/utils-functions/BuildingDropdown";
import { flatLayout } from "./flatSlice";
import routes from "../../../services/appRoutes";
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

type LayoutType = any;

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

  const [buildingId, setBuildingId] = useState<number | null>(null);
  const [activeFloor, setActiveFloor] = useState<number | null>(null);
  const [viewLayout, setViewLayout] = useState<LayoutType | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<any | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleBuildingSelect = (option: any) => {
    if (!option?.value) return;

    const nextId = Number(option.value);
    if (nextId === buildingId) return;

    setBuildingId(nextId);
    setViewLayout(null);
    setActiveFloor(null);
    setSelectedUnit(null);
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
      (firstFloor: any, secondFloor: any) =>
        Number(firstFloor.floor_no) - Number(secondFloor.floor_no),
    );
  }, [viewLayout]);

  const floorsToShow = useMemo(() => {
    if (!sortedFloors.length) return [];
    if (activeFloor == null) return sortedFloors;
    return sortedFloors.filter((floor: any) => Number(floor.floor_no) === activeFloor);
  }, [activeFloor, sortedFloors]);

  const activeTabIndex = useMemo(() => {
    if (activeFloor == null) return 0;
    const floorIndex = sortedFloors.findIndex(
      (floor: any) => Number(floor.floor_no) === activeFloor,
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

    viewLayout?.floors?.forEach((floor: any) => {
      floor.flats?.forEach((flat: any) => {
        flat.units?.forEach((unit: any) => {
          summary.units += 1;
          if (unit.status === 1) summary.available += 1;
          if (unit.status === 2) summary.underDev += 1;
          if (unit.status === 3) summary.completed += 1;
          if (unit.status === 4) summary.sold += 1;
        });
      });
    });

    return summary;
  }, [viewLayout]);

  const handleUnitClick = (unit: any, e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedUnit(unit);
  };

  const closeUnitModal = () => setSelectedUnit(null);

  const formatNumber = (value: any) => {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return "-";
    return numberValue.toLocaleString("en-US");
  };

  const getUnitTotalPrice = (unit: any) => {
    const totalPrice = Number(unit?.total_price ?? unit?.price ?? unit?.amount);
    if (Number.isFinite(totalPrice) && totalPrice > 0) return totalPrice;

    const size = Number(unit?.size_sqft);
    const rate = Number(unit?.sale_price ?? unit?.rate ?? unit?.unit_price);
    if (Number.isFinite(size) && Number.isFinite(rate) && size > 0 && rate > 0) {
      return size * rate;
    }

    return null;
  };

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
        dueAmount: selectedUnit?.due_amount,
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
        {value || "-"}
      </div>
    </div>
  );

  const getFloorUnitCount = (floor: any) =>
    floor.flats?.reduce(
      (total: number, flat: any) => total + (flat.units?.length ?? 0),
      0,
    ) ?? 0;

  const getUnitTypeSummary = (units: any[] = []) => {
    if (!units.length) return "No units";

    const counts = units.reduce(
      (summary: Record<"unit" | "parking", number>, unit: any) => {
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

  const getFloorUnits = (floor: any) =>
    floor.flats?.flatMap((flat: any) => flat.units ?? []) ?? [];

  const getFloorStatusCounts = (floor: any) => {
    const counts: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
    };

    floor.flats?.forEach((flat: any) => {
      flat.units?.forEach((unit: any) => {
        if (counts[unit.status] !== undefined) counts[unit.status] += 1;
      });
    });

    return counts;
  };

  const isParkingUnit = (unit: any) =>
    String(unit?.unit_type ?? "").toLowerCase() === "parking";

  const getUnitButtonClass = (unit: any) => {
    const statusClass = STATUS_MAP[unit.status] ?? FALLBACK_STATUS_CLASS;
    const typeClass = isParkingUnit(unit)
      ? "before:absolute before:inset-0 before:bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.16)_0,rgba(255,255,255,0.16)_5px,transparent_5px,transparent_16px)] before:opacity-25 after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-white/35"
      : "before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/20 before:to-transparent";

    return `${statusClass} ${typeClass}`;
  };

  const renderUnitTooltip = (unit: any) => (
    <div
      className="pointer-events-none absolute z-[9999] hidden group-hover:block
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
            <span className="font-semibold">Mobile:</span> {unit.customer.mobile}
          </span>
        )}
        {STATUS_LABELS[unit.status] && (
          <span>
            <span className="font-semibold">Status:</span> {STATUS_LABELS[unit.status]}
          </span>
        )}
      </div>
    </div>
  );

  const renderFloorCard = (floor: any) => {
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
        className="relative rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/90"
      >
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/35">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
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
            {floor.flats.map((flat: any) => (
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
                    flat.units.map((unit: any) => (
                      <button
                        type="button"
                        key={unit.id}
                        onClick={(e) => handleUnitClick(unit, e)}
                        className={`relative group isolate min-h-[3.25rem] overflow-hidden rounded-md border px-3 py-2.5 text-center text-sm font-semibold text-white shadow-lg ring-1 transition-all hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 ${
                          getUnitButtonClass(unit)
                        }`}
                      >
                        <span className="relative z-10 block truncate drop-shadow-sm">
                          {unit.unit_no}
                        </span>
                        <span className="relative z-10 mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-wide opacity-85">
                          {STATUS_LABELS[unit.status] ?? "Unknown"}
                        </span>
                        {isParkingUnit(unit) && (
                          <span className="relative z-10 mt-1 inline-flex rounded bg-black/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/90 ring-1 ring-white/25">
                            Parking
                          </span>
                        )}
                        {renderUnitTooltip(unit)}
                      </button>
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

  return (
    <>
      <HelmetTitle title={viewLayout?.building ?? "Building Layout"} />

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">
              Real Estate Layout
            </p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
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
                      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
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
                <div className="inline-flex min-w-full gap-1 rounded-lg border border-gray-200 bg-white p-1.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={() => changeActiveTab("previous")}
                    disabled={activeTabIndex === 0}
                    className="shrink-0 rounded-md px-2.5 py-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                    title="Previous tab"
                  >
                    <FiChevronLeft />
                  </button>
                  <button
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
                  </button>
                  {sortedFloors.map((floor: any) => (
                    <button
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
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => changeActiveTab("next")}
                    disabled={activeTabIndex === sortedFloors.length}
                    className="shrink-0 rounded-md px-2.5 py-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                    title="Next tab"
                  >
                    <FiChevronRight />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 mb-6">
              No floors found for this building.
            </div>
          )}

          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {floorsToShow.length ? (
              floorsToShow.map((floor: any) => renderFloorCard(floor))
            ) : (
              <div className="col-span-full text-center text-gray-500">
                No floors found.
              </div>
            )}
          </div>
        </>
      )}

      {selectedUnit && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-700">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">
                  Unit Details
                </p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedUnit.unit_no ?? "Unit"}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeUnitModal}
                className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                title="Close"
              >
                <FiX />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {renderDetailValue("Status", STATUS_LABELS[selectedUnit.status] ?? "Unknown")}
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
                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
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
                        {selectedUnit?.customer?.mobile ?? "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
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
                        {formatNumber(selectedUnit?.paid_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Due</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatNumber(selectedUnit?.due_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-700">
                {Number(selectedUnit.status) === 1 && (
                  <button
                    type="button"
                    onClick={goToUnitSale}
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    <FiDollarSign />
                    Sale / Booking
                  </button>
                )}
                {Number(selectedUnit.status) === 4 && (
                  <button
                    type="button"
                    onClick={goToPaymentEntry}
                    className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                  >
                    <FiCreditCard />
                    Payment Entry
                  </button>
                )}
                <button
                  type="button"
                  onClick={goToUnitEdit}
                  className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                >
                  <FiEdit2 />
                  Edit Unit
                </button>
                <button
                  type="button"
                  onClick={() => navigate(routes.real_estate_floor_unit_list)}
                  className="inline-flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                >
                  <FiList />
                  Unit List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FlatLayout;
