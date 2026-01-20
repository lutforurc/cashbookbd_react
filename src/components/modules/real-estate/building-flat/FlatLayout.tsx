import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import BuildingFloorDropdown from "../../../utils/utils-functions/BuildingFloorDropdown";
import { flatLayout } from "./flatSlice";

/* ================= STATUS MAP ================= */

const STATUS_MAP: Record<number, string> = {
  1: "bg-green-600",   // Available
  2: "bg-yellow-400",  // Under Dev
  3: "bg-blue-500",    // Completed
  4: "bg-red-500",     // Sold
};

type LayoutType = any; // চাইলে এখানে আপনার proper type বসাতে পারেন

/* ================= COMPONENT ================= */

const FlatLayout = () => {
  const dispatch = useDispatch<any>();
 
  const storeLayout = useSelector((state: any) => state.flat?.flatLayout);

  const [buildingId, setBuildingId] = useState<number | null>(null);
  const [activeFloor, setActiveFloor] = useState<number | null>(null);
 
  const [viewLayout, setViewLayout] = useState<LayoutType | null>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ===== Dropdown handler ===== */
  const handleBuildingSelect = (option: any) => {
    if (!option?.value) return;

    const nextId = Number(option.value);
    if (nextId === buildingId) return;
 
    setBuildingId(nextId);
    setViewLayout(null);
    setActiveFloor(null);
    setErrorMsg(null);
  };

  /* ===== Load layout when building selected (only this shows loader) ===== */
  useEffect(() => {
    if (!buildingId) return;

    setPageLoading(true);

    dispatch(flatLayout(buildingId))
      .unwrap()
      .then((res: any) => { 
        const nextLayout = res?.data ?? res ?? null;

        // ✅ না পেলে ফাঁকা
        setViewLayout(nextLayout && nextLayout.floors ? nextLayout : nextLayout ?? null);
 
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

  /* ===== Set default floor when layout changes ===== */
  useEffect(() => {
    if (viewLayout?.floors?.length) {
      setActiveFloor(viewLayout.floors[0].floor_no);
    } else {
      setActiveFloor(null);
    }
  }, [viewLayout]);

  const currentFloor = useMemo(() => {
    if (!viewLayout?.floors?.length || activeFloor == null) return null;
    return viewLayout.floors.find((f: any) => f.floor_no === activeFloor) ?? null;
  }, [viewLayout, activeFloor]);

  return (
    <>
      <HelmetTitle title="Building Floor Layout" />

      {/* ===== Header ===== */}
      <div className="mb-4 text-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          <span className="italic text-3xl">
            {viewLayout?.building ?? "Building Layout"}
          </span>
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Building-wise floor & unit availability
        </p>
      </div>

      {/* ===== Building Selector ===== */}
      <div className="mb-6 max-w-md">
        <BuildingFloorDropdown onSelect={handleBuildingSelect} />
      </div>

      {/* ===== Loader (only layout fetch) ===== */}
      {pageLoading && <Loader />}

      {/* ===== No building selected ===== */}
      {!buildingId && !pageLoading && (
        <div className="text-center text-gray-500">
          Please select a building to view floors & units.
        </div>
      )}

      {/* ===== Not found / error ===== */}
      {!pageLoading && buildingId && !viewLayout && (
        <div className="text-center text-gray-500">
          {errorMsg ?? "No data found."}
        </div>
      )}

      {/* ===== Render layout only if exists ===== */}
      {!pageLoading && viewLayout && (
        <>
          {/* ===== Floor Selector ===== */}
          {viewLayout.floors?.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-6">
              {viewLayout.floors.map((floor: any) => (
                <button
                  type="button"
                  key={floor.floor_no}
                  onClick={() => setActiveFloor(floor.floor_no)}
                  className={`px-4 py-1 rounded text-sm font-medium border
                    ${
                      activeFloor === floor.floor_no
                        ? "bg-cyan-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                    }`}
                >
                  Floor {floor.floor_no}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 mb-6">
              No floors found for this building.
            </div>
          )}

          {/* ===== Legend ===== */}
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

          {/* ===== Flats Grid ===== */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentFloor?.flats?.length ? (
              currentFloor.flats.map((flat: any) => (
                <div
                  key={flat.id}
                  className="border rounded p-4 bg-white dark:bg-gray-800 shadow"
                >
                  {/* Flat Header */}
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {flat.flat_name}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-300">
                      {flat.units?.length === 0
                        ? "No units"
                        : `${flat.units.length} unit${
                            flat.units.length > 1 ? "s" : ""
                          }`}
                    </span>
                  </div>

                  {/* Units Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {flat.units?.length ? (
                      flat.units.map((unit: any) => (
                        <div
                          key={unit.id}
                          className={`text-white text-sm text-center py-2 rounded cursor-pointer ${
                            STATUS_MAP[unit.status] ?? "bg-gray-400"
                          }`}
                          title={`Size: ${unit.size_sqft} sqft`}
                        >
                          <span className="font-semibold">{unit.unit_no}</span>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-center text-gray-400 text-sm">
                        No units
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500">
                No flats found for this floor
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default FlatLayout;
