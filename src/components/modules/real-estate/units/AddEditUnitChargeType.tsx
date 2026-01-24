import React, { useEffect, useState } from "react";
import { FiSave, FiRefreshCcw, FiArrowLeft } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import InputElement from "../../../utils/fields/InputElement";
import DropdownCommon from "../../../utils/utils-functions/DropdownCommon";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import Link from "../../../utils/others/Link";
import { toast } from "react-toastify";
import { fetchUnitChargeType, storeUnitChargeType, updateUnitChargeType } from "./unitSlice";

// import {
//   fetchUnitChargeType,
//   storeUnitChargeType,
//   updateUnitChargeType,
// } from "./unitChargeTypeSlice";

/* ================= TYPES ================= */

interface ChargeTypeForm {
  id?: number;
  name: string;
  effect: "+" | "-";
  sort_order: number;
  is_active: number;
  notes?: string;
}

/* ================= COMPONENT ================= */

const AddEditUnitChargeType = () => {
  const dispatch = useDispatch<any>();
  const { id } = useParams(); // charge type id
  const isEdit = Boolean(id);

  const { editChargeType, loading } = useSelector(
    (state: any) => state.buildingUnits
  );

  const [buttonLoading, setButtonLoading] = useState(false);

  const [form, setForm] = useState<ChargeTypeForm>({
    name: "",
    effect: "+",
    sort_order: 1,
    is_active: 1,
    notes: "",
  });

  /* ================= EDIT MODE ================= */

  useEffect(() => {
    if (isEdit) {
      dispatch(fetchUnitChargeType(Number(id)));
    }
  }, [id]);

  useEffect(() => {
    if (editChargeType) {
      setForm(editChargeType);
    }
  }, [editChargeType]);

  /* ================= HANDLERS ================= */

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "sort_order" ? Number(value) : value,
    }));
  };

  const handleSave = async () => {
    setButtonLoading(true);

    const action = isEdit ? await dispatch(updateUnitChargeType(form)) : await dispatch(storeUnitChargeType(form));

    setButtonLoading(false);

    if (action.type.endsWith("/fulfilled")) {
      toast.success(
        isEdit ? "Charge type updated" : "Charge type created"
      );
    } else {
      toast.error("Failed to save charge type");
    }
  };

  const handleReset = () => {
    setForm({
      name: "",
      effect: "+",
      sort_order: 1,
      is_active: 1,
      notes: "",
    });
  };

  /* ================= RENDER ================= */

  return (
    <>
      <HelmetTitle title={isEdit ? "Edit Charge Type" : "Add Charge Type"} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
        <InputElement
          label="Charge Name"
          name="name"
          className="h-8.5"
          value={form.name}
          onChange={handleChange}
        />

        <DropdownCommon
          label="Effect"
          name="effect"
          data={[
            { id: "+", name: "(+) Add" },
            { id: "-", name: "(-) Subtract" },
          ]}
          className="h-8.5"
          value={form.effect}
          onChange={handleChange}
        />


      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
        <InputElement
          label="Sort Order"
          name="sort_order"
          type="number"
          value={form.sort_order}
          onChange={handleChange}
          className="h-8.5"
        />
        <DropdownCommon
          label="Status"
          name="is_active"
          data={[
            { id: 1, name: "Active" },
            { id: 0, name: "Inactive" },
          ]}
          value={form.is_active}
          onChange={handleChange}
          className="h-8.5"
        />
      </div>
      <div className="grid grid-cols-1 gap-2 mb-3">

       <InputElement
          label="Notes"
          name="notes"
          value={form.notes ?? ""}
          onChange={handleChange}
          className="h-8.5"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
        <ButtonLoading
          onClick={handleSave}
          buttonLoading={buttonLoading}
          label="Save"
          className="p-2"
          icon={<FiSave className="!mr-2 text-lg" />}
        />

        <ButtonLoading
          onClick={handleReset}
          buttonLoading={false}
          label="Reset"
          icon={<FiRefreshCcw className="!mr-2 text-lg" />}
          className="p-2"
        />

        <Link
          to="/real-estate/unit-charge-types"
          className="flex items-center justify-center"
        >
          <FiArrowLeft className="!mr-2" /> Back
        </Link>
      </div>
    </>
  );
};

export default AddEditUnitChargeType;
