import React, { useEffect, useState } from "react";
import { FiSave, FiRefreshCcw, FiArrowLeft } from "react-icons/fi";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import Loader from "../../../../common/Loader";
import InputElement from "../../../utils/fields/InputElement";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import Link from "../../../utils/others/Link";
import InputDatePicker from "../../../utils/fields/DatePicker";
import DdlMultiline from "../../../utils/utils-functions/DdlMultiline";

import { status } from "../../../utils/fields/DataConstant";
import { BuildingItem } from "./types";
import { getInitialBuilding } from "./initial";
import { buildingEdit, buildingStore, buildingUpdate } from "./buildingsSlice";
import ProjectAreaDropdown from "../../../utils/utils-functions/ProjectAreaDropdown";
import ProjectDropdown from "../../../utils/utils-functions/ProjectDropdown";
import { toast } from "react-toastify";
// import {
//   buildingStore,
//   buildingUpdate,
//   buildingEdit,
// } from "./buildingSlice";  

const AddEditBuilding = () => {
  const dispatch = useDispatch();
  const { id, projectId } = useParams();

  const buildingState = useSelector((state: any) => state.building);

  const [buttonLoading, setButtonLoading] = useState(false);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [completionDate, setCompletionDate] = useState<Date | null>(null);
  const [saleDate, setSaleDate] = useState<Date | null>(null);

  const [formData, setFormData] = useState<BuildingItem>(
    getInitialBuilding(projectId)
  );

  /* ================= EDIT MODE ================= */
  useEffect(() => {
    if (id) {
      dispatch(buildingEdit(Number(id)));
    }
  }, [id]);

  useEffect(() => {
    if (buildingState?.editBuilding) {
      const b = buildingState.editBuilding;

      setFormData(b);

      setStartDate(b.start_date ? new Date(b.start_date) : null);
      setCompletionDate(
        b.completion_date ? new Date(b.completion_date) : null
      );
      setSaleDate(b.sale_date ? new Date(b.sale_date) : null);
    }
  }, [buildingState?.editBuilding]);

  /* ================= HANDLERS ================= */

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setButtonLoading(true);

    const action = id
      ? await dispatch(buildingUpdate(formData))
      : await dispatch(buildingStore(formData));

    setButtonLoading(false);

    if (
      buildingStore.fulfilled.match(action) ||
      buildingUpdate.fulfilled.match(action)
    ) {
      alert(id ? "Building updated successfully" : "Building created successfully");
      toast.success(id ? "Building updated successfully" : "Building created successfully");
    } else {
      toast.error("Failed to save building");
    }
  };

  const handleReset = () => {
    setFormData(getInitialBuilding(projectId));
    setStartDate(null);
    setCompletionDate(null);
    setSaleDate(null);
  };

  const handleLedgerSelect = (option: any) => {
    setFormData((prev) => ({
      ...prev,
      customer_id: option.value,
    }));
  };

  const handleDate =
    (field: string, setter: any) => (date: Date | null) => {
      setter(date);
      setFormData((prev) => ({
        ...prev,
        [field]: date ? date.toISOString().split("T")[0] : "",
      }));
    };

  /* ================= RENDER ================= */

  const handleProjectSelect = (option: any) => {
    setFormData((prev) => ({
      ...prev,
      project_id: option.value,
    }));
  };


  return (
    <>
      <HelmetTitle title={id ? "Edit Building" : "Add Building"} />

      {/* {buildingState.loading && <Loader />} */}

      {/* BASIC INFO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <div className="">
          <label htmlFor="">Select Project</label>
          <ProjectDropdown onSelect={handleProjectSelect} className="" />
        </div>
        <InputElement
          id="name"
          name="name"
          label="Building Name"
          placeholder="Enter Building Name"
          className="h-9.5"
          value={formData.name}
          onChange={handleOnChange}
        />

        <InputElement
          id="floors_count"
          name="floors_count"
          label="Total Floors"
          className="h-9.5"
          placeholder="0"
          value={formData.floors_count}
          onChange={handleOnChange}
        />


      </div>

      {/* COST INFO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <InputElement
          id="construction_cost"
          name="construction_cost"
          label="Construction Cost"
          placeholder="0.00"
          value={formData.construction_cost}
          onChange={handleOnChange}
        />

        <InputElement
          id="total_cost"
          name="total_cost"
          label="Total Cost"
          placeholder="0.00"
          value={formData.total_cost}
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

      {/* DATES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
        <div className="w-full">
          <label>Start Date</label>
          <InputDatePicker
            selectedDate={startDate}
            setSelectedDate={setStartDate}
            className="w-full h-8"
            setCurrentDate={handleDate("start_date", setStartDate)}
          />
        </div>

        <div>
          <label>Completion Date</label>
          <InputDatePicker
            selectedDate={completionDate}
            setSelectedDate={setCompletionDate}
            className="w-full h-8"
            setCurrentDate={handleDate(
              "completion_date",
              setCompletionDate
            )}
          />
        </div>

        <div>
          <label>Sale Date</label>
          <InputDatePicker
            selectedDate={saleDate}
            setSelectedDate={setSaleDate}
            className="w-full h-8"

            setCurrentDate={handleDate("sale_date", setSaleDate)}
          />
        </div>
      </div>

      {/* LAND OWNER */}
      {/* <div className="grid grid-cols-1 mb-2">
        <label>Land Owner</label>
        <DdlMultiline onSelect={handleLedgerSelect} acType="" />
      </div> */}

      {/* NOTES */}

      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="col-span-2">
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
            id="status"
            name="status"
            label="Select Status"
            data={status}
            className="h-8.5"
            defaultValue={formData.status?.toString()}
            onChange={handleSelectChange}
          />
        </div>
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
          to={`/real-estate/projects/${projectId}/buildings`}
          className="flex items-center justify-center"
        >
          <FiArrowLeft className="mr-2" /> Back
        </Link>
      </div>
    </>
  );
};

export default AddEditBuilding;
