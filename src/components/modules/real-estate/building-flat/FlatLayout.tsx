import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import BuildingDropdown from "../../../utils/utils-functions/BuildingDropdown";
import { flatLayout } from "./flatSlice";

const STATUS_MAP: Record<number, string> = {
  1: "bg-green-600",
  2: "bg-yellow-400",
  3: "bg-blue-500",
  4: "bg-red-500",
};

const STATUS_LABELS: Record<number, string> = {
  1: "Available",
  2: "Under Dev",
  3: "Completed",
  4: "Sold",
};

type LayoutType = any;

const FlatLayout = () => {
  const dispatch = useDispatch<any>();
  const storeLayout = useSelector((state: any) => state.flat?.flatLayout);

  const [buildingId, setBuildingId] = useState<number | null>(null);
  const [activeFloor, setActiveFloor] = useState<number | null>(null);
  const [viewLayout, setViewLayout] = useState<LayoutType | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleBuildingSelect = (option: any) => {
    if (!option?.value) return;

    const nextId = Number(option.value);
    if (nextId === buildingId) return;

    setBuildingId(nextId);
    setViewLayout(null);
    setActiveFloor(null);
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

  const floorsToShow = useMemo(() => {
    if (!viewLayout?.floors?.length) return [];
    if (activeFloor == null) return viewLayout.floors;
    return viewLayout.floors.filter((floor: any) => floor.floor_no === activeFloor);
  }, [activeFloor, viewLayout]);

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

  const handleUnitClick = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const getFloorUnitCount = (floor: any) =>
    floor.flats?.reduce(
      (total: number, flat: any) => total + (flat.units?.length ?? 0),
      0,
    ) ?? 0;

  const renderUnitTooltip = (unit: any) => (
    <div
      className="pointer-events-none absolute z-50 hidden group-hover:block
      bottom-full left-1/2 -translate-x-1/2 mb-2
      bg-gray-900 text-gray-200 dark:bg-gray-200 dark:text-gray-900
      text-xs rounded px-3 py-2 shadow-lg min-w-max text-left"
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
    const floorUnits = getFloorUnitCount(floor);

    return (
      <div
        key={floor.floor_no}
        className="border border-gray-200 dark:border-gray-600 rounded p-4 bg-white dark:bg-gray-800 shadow"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Floor {floor.floor_no}
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-300">
            {floorUnits === 0
              ? "No units"
              : `${floorUnits} unit${floorUnits > 1 ? "s" : ""}`}
          </span>
        </div>

        {floor.flats?.length ? (
          <div className="space-y-4">
            {floor.flats.map((flat: any) => (
              <div key={flat.id ?? `${floor.floor_no}-${flat.flat_name}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {flat.flat_name}
                  </h4>
                  <span className="text-xs text-gray-500 dark:text-gray-300">
                    {flat.units?.length === 0
                      ? "No units"
                      : `${flat.units.length} unit${flat.units.length > 1 ? "s" : ""}`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {flat.units?.length ? (
                    flat.units.map((unit: any) => (
                      <button
                        type="button"
                        key={unit.id}
                        onClick={handleUnitClick}
                        className={`relative group text-white text-sm text-center py-2 rounded cursor-pointer ${
                          STATUS_MAP[unit.status] ?? "bg-gray-400"
                        }`}
                      >
                        <span className="font-semibold">{unit.unit_no}</span>
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
          <div className="text-center text-gray-400 text-sm">No flats found</div>
        )}
      </div>
    );
  };

  return (
    <>
      <HelmetTitle title={viewLayout?.building ?? "Building Layout"} />

      <div className="mb-4 text-center">
        {/* <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          <span className="italic text-xl">
            {viewLayout?.building ?? "Building Layout"}
          </span>
        </h2> */}
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Building-wise floor & unit availability
        </p>
      </div>

      <div className="mb-6 max-w-md">
        <BuildingDropdown onSelect={handleBuildingSelect} className="mt-2" />
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
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-5">
                <div className="border border-gray-200 dark:border-gray-600 rounded p-3 bg-white dark:bg-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-300">Floors</div>
                  <div className="text-xl font-semibold text-gray-900 dark:text-white">
                    {layoutSummary.floors}
                  </div>
                </div>
                <div className="border border-gray-200 dark:border-gray-600 rounded p-3 bg-white dark:bg-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-300">Total Units</div>
                  <div className="text-xl font-semibold text-gray-900 dark:text-white">
                    {layoutSummary.units}
                  </div>
                </div>
                <div className="border border-gray-200 dark:border-gray-600 rounded p-3 bg-white dark:bg-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-300">Available</div>
                  <div className="text-xl font-semibold text-green-600">
                    {layoutSummary.available}
                  </div>
                </div>
                <div className="border border-gray-200 dark:border-gray-600 rounded p-3 bg-white dark:bg-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-300">Sold</div>
                  <div className="text-xl font-semibold text-red-500">
                    {layoutSummary.sold}
                  </div>
                </div>
                <div className="border border-gray-200 dark:border-gray-600 rounded p-3 bg-white dark:bg-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-300">Under Dev</div>
                  <div className="text-xl font-semibold text-yellow-500">
                    {layoutSummary.underDev}
                  </div>
                </div>
                <div className="border border-gray-200 dark:border-gray-600 rounded p-3 bg-white dark:bg-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-300">Completed</div>
                  <div className="text-xl font-semibold text-blue-500">
                    {layoutSummary.completed}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="inline-flex min-w-full gap-1 rounded border border-gray-200 bg-gray-100 p-1 dark:border-gray-600 dark:bg-gray-900/40">
                  <button
                    type="button"
                    onClick={() => setActiveFloor(null)}
                    className={`shrink-0 rounded px-4 py-2 text-sm font-medium transition-colors ${
                      activeFloor == null
                        ? "bg-cyan-600 text-white shadow-sm"
                        : "text-gray-700 hover:bg-white hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      All Floors
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          activeFloor == null
                            ? "bg-white/20 text-white"
                            : "bg-white text-gray-600 dark:bg-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {layoutSummary.units}
                      </span>
                    </span>
                  </button>
                  {viewLayout.floors.map((floor: any) => (
                    <button
                      type="button"
                      key={floor.floor_no}
                      onClick={() => setActiveFloor(floor.floor_no)}
                      className={`shrink-0 rounded px-4 py-2 text-sm font-medium transition-colors ${
                        activeFloor === floor.floor_no
                          ? "bg-cyan-600 text-white shadow-sm"
                          : "text-gray-700 hover:bg-white hover:text-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-white"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        Floor {floor.floor_no}
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs ${
                            activeFloor === floor.floor_no
                              ? "bg-white/20 text-white"
                              : "bg-white text-gray-600 dark:bg-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {getFloorUnitCount(floor)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 mb-6">
              No floors found for this building.
            </div>
          )}

          <div className="flex gap-4 text-sm mb-6">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-600 rounded"></span> Available
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-500 rounded"></span> Sold
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-yellow-400 rounded"></span> Under Dev
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-500 rounded"></span> Completed
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    </>
  );
};

export default FlatLayout;
