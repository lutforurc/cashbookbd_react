import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import { flatLayout } from "./flatSlice";


/* ================= STATUS MAP ================= */

const STATUS_MAP: Record<number, string> = {
  1: "bg-green-900",   // Available
  2: "bg-yellow-400",  // Under Dev
  3: "bg-blue-500",    // Completed
  4: "bg-red-500",     // Sold
};

/* ================= COMPONENT ================= */

const FlatLayout = () => {
  const dispatch = useDispatch();

  const { flatLayout: layout, loading } = useSelector(
    (state: any) => state.flat
  );

  const [activeFloor, setActiveFloor] = useState<number | null>(null);

  /* ===== Load Layout ===== */
  useEffect(() => {
    dispatch(flatLayout(2)); // 🔴 building_id এখানে dynamic করবে
  }, []);

  /* ===== Set default floor ===== */
  useEffect(() => {
    if (layout?.floors?.length) {
      setActiveFloor(layout.floors[0].floor_no);
    }
  }, [layout]);

  if (loading || !layout) return <Loader />;

  const currentFloor = layout.floors.find(
    (f: any) => f.floor_no === activeFloor
  );

  return (
    <>
      <HelmetTitle title={layout.building} />

      {/* ===== Header ===== */}
      <div className="mb-4">
        {/* <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          {layout.building}
        </h2> */}
        <p className="text-sm text-gray-800 dark:text-gray-300 text-center">
          Floor-wise flat & unit availability
        </p>
      </div>

      {/* ===== Floor Selector ===== */}
      <div className="flex flex-wrap gap-2 mb-6">
        {layout.floors.map((floor: any) => (
          <button
            key={floor.floor_no}
            onClick={() => setActiveFloor(floor.floor_no)}
            className={`px-4 py-1 rounded border text-sm font-medium
              ${activeFloor === floor.floor_no
  ? "bg-gray-800 text-white"
  : "bg-white text-gray-600 border"
}`}
          >
            Floor {floor.floor_no}
          </button>
        ))}
      </div>

      {/* ===== Legend ===== */}
      <div className="flex gap-4 text-sm mb-6">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-500 rounded"></span> Available
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
        {currentFloor?.flats.map((flat: any) => (
          <div
            key={flat.flat_no}
            className="border rounded p-4 bg-white dark:bg-gray-800 shadow"
          >
            {/* Flat Header */}
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold dark:text-white">
                Floor {flat.flat_no}
              </h3>
              <span className="text-xs text-gray-500 dark:text-white">
                {flat.units.length} Units
              </span>
            </div>

            {/* Units Grid */}
            <div className="grid grid-cols-2 gap-2">
              {flat.units.length === 0 ? (
                <div className="col-span-2 text-center text-gray-400 text-sm dark:text-gray-300">
                  No units
                </div>
              ) : (
                flat.units.map((unit: any) => (
                  <div
                    key={unit.id}
                    className={`text-white text-sm text-center py-2 rounded cursor-pointer
                      ${STATUS_MAP[unit.status]}`}
                    title={`Size: ${unit.size_sqft} sqft`}
                  >
                    <span className="font-semibold text-gray-700 dark:text-gray-100">{unit.unit_no}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default FlatLayout;
