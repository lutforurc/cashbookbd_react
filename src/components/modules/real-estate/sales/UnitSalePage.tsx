import React, { useMemo, useState } from "react";
import {
  FiLock,
  FiEdit2,
  FiCheck,
  FiX,
  FiPlus,
  FiTrash2,
  FiSend,
  FiArrowLeft,
} from "react-icons/fi";

import DdlMultiline from "../../../utils/utils-functions/DdlMultiline";
import BuildingUnitDropdown from "../../../utils/utils-functions/BuildingUnitDropdown";
import BuildingParkingDropdown from "../../../utils/utils-functions/BuildingParkingDropdown";
import BuildingUnitChargesDropdown from "../../../utils/utils-functions/BuildingUnitChargesDropdown";
import InputElement from "../../../utils/fields/InputElement";
import HelmetTitle from "../../../utils/others/HelmetTitle";
import { ButtonLoading } from "../../../../pages/UiElements/CustomButtons";
import { useNavigate } from "react-router";
import { storeSalePricing } from "./unitSaleSlice";
import { useDispatch } from "react-redux";
import { toast } from 'react-toastify';

/* ================= TYPES ================= */

type ChargeType = "UNIT_PRICE" | "PARKING" | "CUSTOM";

type EditMode = "LOCKED" | "EDITABLE";

type LinkedTo =
  | { kind: "unit"; label: string; unitId: number }
  | { kind: "parking"; label: string; parkingId: number }
  | null;

type ChargeEffect = "+" | "-";

type PriceItem = {
  id: number;
  type: ChargeType;
  title: string;
  effect?: ChargeEffect;
  linkedTo: LinkedTo;
  amount: number;
  note?: string;
  editMode: EditMode;
};

/* ================= HELPERS ================= */

const formatAmount = (n: number) =>
  `${n < 0 ? "-" : ""}${Math.abs(n).toLocaleString("en-US")}`;

const calculateTotal = (items: PriceItem[]) =>
  items.reduce((sum, it) => {
    if (it.effect === "-") return sum - Math.abs(it.amount);
    return sum + Math.abs(it.amount);
  }, 0);

const linkedToText = (l: LinkedTo) =>
  !l ? "-" : l.kind === "unit" ? `Unit: ${l.label}` : `Parking: ${l.label}`;

/* ================= PAGE ================= */

export default function UnitSalePage() {
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [selectedParking, setSelectedParking] = useState<any>(null);

  const [items, setItems] = useState<PriceItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftValue, setDraftValue] = useState("");

  const [chargeType, setChargeType] = useState<any>(null);
  const [chargeAmount, setChargeAmount] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  /* ================= UNIT ================= */

  const onUnitSelect = (option: any | null) => {
    if (!option) {
      setSelectedUnit(null);
      setItems([]);
      return;
    }

    setSelectedUnit(option);

    const size = Number(option.label_0 || 0);
    const rate = Number(option.label_1 || 0);
    const amount = size * rate;

    setItems((prev) => {
      const exists = prev.find((x) => x.type === "UNIT_PRICE");

      if (exists) {
        return prev.map((x) =>
          x.type === "UNIT_PRICE"
            ? {
              ...x,
              linkedTo: {
                kind: "unit",
                label: option.label,
                unitId: option.value,
              },
              amount,
              note: `Size: ${size} × ${rate}`,
            }
            : x
        );
      }

      return [
        {
          id: Date.now(),
          type: "UNIT_PRICE",
          title: "Unit Price",
          effect: "+",
          linkedTo: {
            kind: "unit",
            label: option.label,
            unitId: option.value,
          },
          amount,
          note: `Auto: ${size} × ${rate}`,
          editMode: "LOCKED",
        },
      ];
    });
  };

  /* ================= PARKING ================= */

  const onParkingSelect = (option: any | null) => {
    if (!option) {
      setSelectedParking(null);
      setItems((p) => p.filter((x) => x.type !== "PARKING"));
      return;
    }

    setSelectedParking(option);

    const size = Number(option.label_0 || 0);
    const rate = Number(option.label_1 || 0);
    const amount = size * rate;

    setItems((prev) => {
      const exists = prev.find((x) => x.type === "PARKING");

      if (exists) {
        return prev.map((x) =>
          x.type === "PARKING"
            ? {
              ...x,
              linkedTo: {
                kind: "parking",
                label: option.label,
                parkingId: option.value,
              },
              amount,
              note: `Auto: ${size} × ${rate}`,
            }
            : x
        );
      }

      return [
        ...prev,
        {
          id: Date.now() + 1,
          type: "PARKING",
          title: "Parking",
          effect: "+",
          linkedTo: {
            kind: "parking",
            label: option.label,
            parkingId: option.value,
          },
          amount,
          note: `Auto: ${size} × ${rate}`,
          editMode: "LOCKED",
        },
      ];
    });
  };

  /* ================= CUSTOM CHARGE ================= */

  const addCustomCharge = () => {
    if (!chargeType || !chargeAmount) return;

    setItems((prev) => {
      const exists = prev.find(
        (x) =>
          x.type === "CUSTOM" &&
          x.title === chargeType.label // same charge type
      );

      // 🔁 If already exists → update amount
      if (exists) {
        return prev.map((x) =>
          x.id === exists.id
            ? {
              ...x,
              amount: Math.abs(Number(chargeAmount)),
              effect: chargeType.label_2 === "-" ? "-" : "+",
            }
            : x
        );
      }

      // ➕ Else add new
      return [
        ...prev,
        {
          id: Date.now(),
          type: "CUSTOM",
          title: chargeType.label,
          effect: chargeType.label_2 === "-" ? "-" : "+",
          linkedTo: null,
          amount: Math.abs(Number(chargeAmount)),
          editMode: "EDITABLE",
        },
      ];
    });

    setChargeType(null);
    setChargeAmount("");
  };


  /* ================= INLINE EDIT ================= */

  const startEdit = (it: PriceItem) => {
    if (it.editMode !== "EDITABLE") return;
    setEditingId(it.id);
    setDraftValue(String(it.amount));
  };

  const saveEdit = (it: PriceItem) => {
    const val = Number(draftValue);
    if (Number.isNaN(val)) return;

    setItems((p) =>
      p.map((x) =>
        x.id === it.id ? { ...x, amount: Math.abs(val) } : x // ✅ FIX
      )
    );
    setEditingId(null);
  };

  /* ================= TOTAL ================= */

  const total = useMemo(() => calculateTotal(items), [items]);

  /* ================= API ================= */

const apiPayload = {
  customer: selectedCustomer,      // FULL dropdown object
  unit: selectedUnit,              // FULL dropdown object
  parking: selectedParking,        // FULL dropdown object (or null)

  items: items.map((it) => ({
    id: it.id,
    type: it.type,                 // UNIT_PRICE | PARKING | CUSTOM
    title: it.title,
    effect: it.effect,             // "+" | "-"
    linkedTo: it.linkedTo,          // { kind, unitId | parkingId } | null
    amount: it.amount,
    note: it.note ?? null,
    editMode: it.editMode,          // LOCKED | EDITABLE
  })),

  total,                            // calculated total
};

  const submitToApi = async () => {
  console.log("API PAYLOAD =>", apiPayload);

  if (!selectedCustomer || !selectedUnit) {
    toast.info("Please select customer and unit before saving.");
    return;
  }

  const response = await dispatch(storeSalePricing(apiPayload));

  // optional: response handle
  if (storeSalePricing.fulfilled.match(response)) {
    console.log("Sale saved, ID:", response.payload?.sale_id);
  }
};

  /* ================= UI ================= */

  return (
    <div className="mx-auto max-w-7xl">
      <HelmetTitle title="Unit Sales" />

      <div className="mb-4 flex justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Sales Pricing Builder
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Unit + Parking + Discount calculation
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Grand Total
          </div>
          <div className="text-xl font-semibold text-gray-900 dark:text-white">
            {formatAmount(total)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded border bg-white dark:bg-gray-800 p-4">
            <label className="text-sm font-semibold">Select Customer</label>
            <DdlMultiline onSelect={setSelectedCustomer} acType="" />

            <label className="block mt-3 text-sm font-semibold">Select Unit</label>
            <BuildingUnitDropdown onSelect={onUnitSelect} />

            <label className="block mt-3 text-sm font-semibold">Select Parking</label>
            <BuildingParkingDropdown onSelect={onParkingSelect} />
          </div>

          <div className="rounded border bg-white dark:bg-gray-800 p-4">
            <label className="text-sm font-semibold">Charge Type</label>
            <BuildingUnitChargesDropdown onSelect={setChargeType} />

            <InputElement
              id="amount"
              name="amount"
              type="number"
              label="Amount (Tk.)"
              className="text-sm "
              value={chargeAmount}
              onChange={(e: any) => setChargeAmount(e.target.value)}
            />

            <button
              onClick={addCustomCharge}
              className="mt-2 flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200 "
            >
              <FiPlus className="text-gray-800 dark:text-gray-200" /> Add Charge
            </button>
          </div>

          <div className="flex gap-2">
            <ButtonLoading
              onClick={submitToApi}
              label="Save"
              icon={<FiSend className="mr-3" />}
              className="mt-2 p-2 flex-1"
            />
            <ButtonLoading
              onClick={() => navigate("../real-estate/unit/list")}
              label="Back"
              icon={<FiArrowLeft className="mr-3" />}
              className="mt-2 p-2 flex-1"
            />
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-8">
          <table className="w-full text-sm bg-white dark:bg-gray-800 border">
            <thead className="bg-gray-200 dark:bg-gray-700">
              <tr>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-left">Linked</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="p-2">{it.title}</td>
                  <td className="p-2">{linkedToText(it.linkedTo)}</td>
                  <td className="p-2 text-right">
                    {editingId === it.id ? (
                      <div className="flex justify-end gap-1 items-center">
                        <InputElement
                          className="w-24 text-right"
                          type="number"
                          value={draftValue}
                          onChange={(e: any) => setDraftValue(e.target.value)}
                        />
                        <FiCheck onClick={() => saveEdit(it)} />
                        <FiX onClick={() => setEditingId(null)} />
                      </div>
                    ) : (
                      <div className="flex justify-end items-center gap-1">
                        <span>
                          {it.effect === "-" ? "(-)" : "(+)"}
                        </span>
                        <span>
                          {formatAmount(it.amount)}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="p-2 flex">
                    {it.editMode === "LOCKED" ? (
                      <FiLock />
                    ) : (
                      <>
                        <FiEdit2
                          className="cursor-pointer text-blue-500"
                          onClick={() => startEdit(it)}
                        />
                        <FiTrash2
                          className="ml-2 cursor-pointer text-red-500"
                          onClick={() =>
                            setItems((p) =>
                              p.filter((x) => x.id !== it.id)
                            )
                          }
                        />
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
