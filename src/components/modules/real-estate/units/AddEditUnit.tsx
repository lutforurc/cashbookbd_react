import React, { useEffect, useState } from "react";
import { FiSave, FiRefreshCcw, FiArrowLeft } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import InputElement from "../../../utils/fields/InputElement";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import Link from "../../../utils/others/Link";
import InputDatePicker from "../../../utils/fields/DatePicker";
import { toast } from "react-toastify";
import { status } from "../../../utils/fields/DataConstant";
import { clearUnitState, unitEdit, unitStore, unitUpdate } from "./unitSlice";
import { UnitItem } from "./types";
import { getInitialUnit } from "./getInitialUnit";
import BuildingFloorDropdown from "../../../utils/utils-functions/BuildingFloorDropdown";
import { set } from "react-datepicker/dist/date_utils";

const AddEditUnit = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id, flatId } = useParams();

  const isEdit = Boolean(id);

  const unitState = useSelector((state: any) => state.buildingUnits);

  const [buttonLoading, setButtonLoading] = useState(false);
  const [saleDate, setSaleDate] = useState<Date | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<any>(null);
  const [formData, setFormData] = useState<UnitItem>(
    getInitialUnit(flatId ? Number(flatId) : 0)
  );

  /* ================= EDIT MODE ================= */


  useEffect(() => {
    if (isEdit) {
      dispatch(unitEdit(Number(id)) as any);
    }
  }, [id, dispatch]);

  // editUnit এ data আসলে
  useEffect(() => {
    const u = unitState?.editUnit;
    if (!u) return;

    setFormData(u);
    setSaleDate(u.sale_date ? new Date(u.sale_date) : null);

    // ✅ react-select expects {value,label}
    setSelectedFloor({
      value: u.flat_id,
      label: u.flat?.flat_name || u.flat?.name || "Basement",
    });
  }, [unitState?.editUnit]);

  const resetFormKeepFloor = () => {
    // ✅ যেটা সিলেক্ট করা আছে সেটা রেখে দাও
    const keepFlatId =
      Number(formData.flat_id) || Number(selectedFloor?.value) || 0;

    // ✅ সব reset, কিন্তু flat_id same
    setFormData(getInitialUnit(keepFlatId));
    setSaleDate(null);

    // ✅ dropdown reset হবে না
    // setSelectedFloor(null); ❌ বাদ
  };


  /* ================= HANDLERS ================= */

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  const handleDate =
    (field: keyof UnitItem, setter: any) => (date: Date | null) => {
      setter(date);
      setFormData((prev) => ({
        ...prev,
        [field]: date ? date.toISOString().split("T")[0] : null,
      }));
    };

  const handleSave = async () => {
    setButtonLoading(true);

    const action = isEdit
      ? await dispatch(unitUpdate(formData) as any)
      : await dispatch(unitStore(formData) as any);

    setButtonLoading(false);

    if (action.meta.requestStatus === "fulfilled") {
      toast.success(isEdit ? "Unit updated successfully" : "Unit created successfully", {
        autoClose: 3000,
        onClose: () => dispatch(clearUnitState()),
      });

      if (isEdit) {
        navigate("/real-estate/unit/list", { replace: true });
        return;
      }

      // ✅ Save হলে ফর্ম reset হবে, কিন্তু Floor থাকবে
      resetFormKeepFloor();
      return;
    }

    console.log("SAVE FAILED ACTION:", action);
    toast.error(action.payload || "Failed to save unit");
  };

  const handleReset = () => {
    setFormData(getInitialUnit(flatId ? Number(flatId) : 0));
    setSaleDate(null);
  };

  const handleBuildingSelect = (option: any) => {
    setSelectedFloor(option);
    setFormData((prev) => ({
      ...prev,
      flat_id: option.value,
    }));
  };
  /* ================= RENDER ================= */
  const handleUnitTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const unitTypes = [
    { id: "unit", name: "Unit" },
    { id: "parking", name: "Parking" },
  ];

  return (
    <>
      <HelmetTitle title={isEdit ? "Edit Unit" : "Add Unit"} />

      {/* BASIC INFO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <div>
          <label>Select Floor</label>
          <BuildingFloorDropdown
            name="flat_id"
            value={selectedFloor}
            onSelect={handleBuildingSelect}
          />
        </div>
        <InputElement
          id="unit_no"
          name="unit_no"
          label="Unit No"
          placeholder="Unit A / 101"
          value={formData.unit_no}
          onChange={handleOnChange}
        />

        <InputElement
          id="size_sqft"
          name="size_sqft"
          label="Size (sqft)"
          placeholder="1200"
          value={formData.size_sqft}
          onChange={handleOnChange}
        />

        <InputElement
          id="allocated_cost"
          name="allocated_cost"
          label="Allocated Cost"
          placeholder="0.00"
          value={formData.allocated_cost}
          onChange={handleOnChange}
        />

        <InputElement
          id="sale_price"
          name="sale_price"
          label="Unite Rate"
          placeholder="0.00"
          value={formData.sale_price ?? ""}
          onChange={handleOnChange}
        />

        <div>
          <label>Sale Date</label>
          <InputDatePicker
            selectedDate={saleDate}
            setSelectedDate={setSaleDate}
            className="w-full h-8.5"
            setCurrentDate={handleDate("sale_date", setSaleDate)}
          />
        </div>
      </div>

      {/* STATUS & NOTES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">

        <div className="col-span-1">
          <InputElement
            id="notes"
            name="notes"
            label="Notes"
            placeholder="Optional notes"
            value={formData.notes ?? ""}
            onChange={handleOnChange}
          />
        </div>
        <div className="col-span-1">
          <DropdownCommon
            id="unit_type"
            name="unit_type"
            label="Select Unit Type"
            data={unitTypes}
            className="h-8.5"
            value={String(formData.unit_type ?? "unit")}   // ✅ controlled
            onChange={handleUnitTypeChange}
          />
        </div>
        <div className="col-span-1">
          <DropdownCommon
            id="status"
            name="status"
            label="Select Status"
            data={status}
            className="h-8.5"
            value={formData.status.toString()}
            onChange={handleSelectChange}
          />
        </div>
      </div>

      {/* ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
        <ButtonLoading
          onClick={handleSave}
          buttonLoading={buttonLoading}
          label={isEdit ? "Update" : "Save"}
          className="p-2"
          icon={<FiSave className="mr-2 text-lg" />}
        />

        <ButtonLoading
          onClick={handleReset}
          buttonLoading={false}
          label="Reset"
          className="p-2"
          icon={<FiRefreshCcw className="mr-2 text-lg" />}
        />

        <Link
          to={`/real-estate/unit/list`}
          className="flex items-center justify-center"
        >
          <FiArrowLeft className="mr-2" /> Back
        </Link>
      </div>
    </>
  );
};

export default AddEditUnit;
