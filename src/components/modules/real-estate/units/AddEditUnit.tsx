import React, { useEffect, useState } from "react";
import { FiSave, FiRefreshCcw, FiArrowLeft } from "react-icons/fi";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import InputElement from "../../../utils/fields/InputElement";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import Link from "../../../utils/others/Link";
import InputDatePicker from "../../../utils/fields/DatePicker";

import { status } from "../../../utils/fields/DataConstant";

import {
  unitEdit,
  unitStore,
  unitUpdate,
} from "./unitSlice";

import { UnitItem } from "./types";
import { getInitialUnit } from "./getInitialUnit";
import BuildingFloorDropdown from "../../../utils/utils-functions/BuildingFloorDropdown";

const AddEditUnit = () => {
  const dispatch = useDispatch();
  const { id, flatId } = useParams();

  const isEdit = Boolean(id);

  // ⚠️ IMPORTANT: reducer key must match store
  const unitState = useSelector((state: any) => state.unit);

  const [buttonLoading, setButtonLoading] = useState(false);
  const [saleDate, setSaleDate] = useState<Date | null>(null);

  const [formData, setFormData] = useState<UnitItem>(
    getInitialUnit(flatId ? Number(flatId) : 0)
  );

  /* ================= EDIT MODE ================= */

  useEffect(() => {
    if (isEdit) {
      dispatch(unitEdit(Number(id)) as any);
    }
  }, [id, isEdit, dispatch]);

  useEffect(() => {
    if (unitState?.editUnit) {
      const u = unitState.editUnit;
      setFormData(u);
      setSaleDate(u.sale_date ? new Date(u.sale_date) : null);
    }
  }, [unitState?.editUnit]);

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

    if (action.type.endsWith("/fulfilled")) {
      alert(isEdit ? "Unit updated successfully" : "Unit created successfully");
    } else {
      alert(action.payload || "Operation failed");
    }
  };

  const handleReset = () => {
    setFormData(getInitialUnit(flatId ? Number(flatId) : 0));
    setSaleDate(null);
  };

    const handleBuildingSelect = (option: any) => {
    setFormData((prev) => ({
      ...prev,
      building_id: option.value,
    }));
  };
  /* ================= RENDER ================= */

  return (
    <>
      <HelmetTitle title={isEdit ? "Edit Unit" : "Add Unit"} />

      {/* BASIC INFO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <div>
          <label>Select Building</label>
          
          <BuildingFloorDropdown onSelect={handleBuildingSelect}  />
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
      </div>

      {/* SALE INFO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <InputElement
          id="sale_price"
          name="sale_price"
          label="Sale Price"
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
        <DropdownCommon
          id="status"
          name="status"
          label="Select Status"
          data={status}
          className="h-8.5"
          defaultValue={formData.status.toString()}
          onChange={handleSelectChange}
        />

        <InputElement
          id="notes"
          name="notes"
          label="Notes"
          placeholder="Optional notes"
          value={formData.notes ?? ""}
          onChange={handleOnChange}
        />
      </div>

      {/* ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
        <ButtonLoading
          onClick={handleSave}
          buttonLoading={buttonLoading}
          label={isEdit ? "Update" : "Save"}
          icon={<FiSave className="ml-2 text-lg" />}
        />

        <ButtonLoading
          onClick={handleReset}
          buttonLoading={false}
          label="Reset"
          icon={<FiRefreshCcw className="ml-2 text-lg" />}
        />

        <Link
          to={`/real-estate/flats/${flatId}/units`}
          className="flex items-center justify-center"
        >
          <FiArrowLeft className="mr-2" /> Back
        </Link>
      </div>
    </>
  );
};

export default AddEditUnit;
