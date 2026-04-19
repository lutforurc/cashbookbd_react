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
import { FlatItem } from "./types";


import {
  flatEdit,
  flatStore,
  flatUpdate,
} from "./flatSlice";

import BuildingDropdown from "../../../utils/utils-functions/BuildingDropdown";
import { getInitialFlat } from "./getInitialFloor";
import { toast } from "react-toastify";

const AddEditFlat = () => {
  const dispatch = useDispatch();
  const { id, buildingId } = useParams();

  const flatState = useSelector((state: any) => state.flat);

  const [buttonLoading, setButtonLoading] = useState(false);
  const [saleDate, setSaleDate] = useState<Date | null>(null);

  const [formData, setFormData] = useState<FlatItem>(
    getInitialFlat(buildingId)
  );

  /* ================= EDIT MODE ================= */
  useEffect(() => {
    if (id) {
      dispatch(flatEdit(Number(id)) as any);
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (flatState?.editFlat) {
      const f = flatState.editFlat;
      setFormData(f);
      setSaleDate(f.sale_date ? new Date(f.sale_date) : null);
    }
  }, [flatState?.editFlat]);

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
    (field: keyof FlatItem, setter: any) => (date: Date | null) => {
      setter(date);
      setFormData((prev) => ({
        ...prev,
        [field]: date ? date.toISOString().split("T")[0] : null,
      }));
    };

  const handleBuildingSelect = (option: any) => {
    setFormData((prev) => ({
      ...prev,
      building_id: option.value,
    }));
  };

  const handleSave = async () => {
    setButtonLoading(true);

    const action = id
      ? await dispatch(flatUpdate(formData) as any)
      : await dispatch(flatStore(formData) as any);

    setButtonLoading(false);

    if (
      flatStore.fulfilled.match(action) ||
      flatUpdate.fulfilled.match(action)
    ) {
      toast.success(id ? "Flat updated successfully" : "Flat created successfully");
    } else {
      toast.error("Failed to save flat");
    }
  };

  const handleReset = () => {
    setFormData(getInitialFlat(buildingId));
    setSaleDate(null);
  };

  /* ================= RENDER ================= */

  return (
    <>
      <HelmetTitle title={id ? "Edit Flat" : "Add Flat"} />

      {/* BASIC INFO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <div>
          <label>Select Building</label>
          <BuildingDropdown onSelect={handleBuildingSelect} />
        </div>

        <InputElement
          id="flat_name"
          name="flat_name"
          label="Flat Name"
          placeholder="Floor # 01 / First Floor"
          value={formData.flat_name}
          onChange={handleOnChange}
        />

        <InputElement
          id="floor_no"
          name="floor_no"
          label="Floor No"
          placeholder="0"
          value={formData.floor_no}
          onChange={handleOnChange}
        />
      </div>

      {/* COST & UNITS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <InputElement
          id="total_units"
          name="total_units"
          label="Total Units"
          placeholder="1"
          value={formData.total_units}
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
          label="Sale Price"
          placeholder="0.00"
          value={formData.sale_price ?? ""}
          onChange={handleOnChange}
        />
      </div>

      {/* SALE DATE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <div>
          <label>Sale Date</label>
          <InputDatePicker
            selectedDate={saleDate}
            setSelectedDate={setSaleDate}
            className="w-full h-8.5"
            setCurrentDate={handleDate("sale_date", setSaleDate)}
          />
        </div>


        <InputElement
          id="notes"
          name="notes"
          label="Notes"
          placeholder="Optional notes"
          value={formData.notes ?? ""}
          onChange={handleOnChange}
        />
        <DropdownCommon
          id="status"
          name="status"
          label="Select Status"
          data={status}
          className="h-8.5"
          defaultValue={formData.status.toString()}
          onChange={handleSelectChange}
        />

      </div>

      {/* ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
        <ButtonLoading
          onClick={handleSave}
          buttonLoading={buttonLoading}
          label={id ? "Update" : "Save"}
          icon={<FiSave className="ml-2 text-lg" />}
        />

        <ButtonLoading
          onClick={handleReset}
          buttonLoading={false}
          label="Reset"
          icon={<FiRefreshCcw className="ml-2 text-lg" />}
        />

        <Link
          to={`/real-estate/building/floor/list`}
          className="flex items-center justify-center"
        >
          <FiArrowLeft className="mr-2" /> Back
        </Link>
      </div>
    </>
  );
};

export default AddEditFlat;
